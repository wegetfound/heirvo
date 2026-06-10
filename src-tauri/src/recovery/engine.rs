//! Core recovery engine.
//!
//! Orchestrates multi-pass reads of a `SectorReader`, updating a `SectorMap`,
//! emitting progress events, and persisting state to SQLite for resume.

use crate::disc::sector::SectorReader;
use crate::recovery::map::{SectorMap, SectorState};
use crate::recovery::passes::{PassStrategy, RecoveryMode, OVERNIGHT_MAX_CYCLES};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::mpsc;
use uuid::Uuid;

/// Batch of (lba, sha256_hex) pairs sent from the engine to the receipt writer.
pub type ReceiptBatch = Vec<(u64, String)>;

/// Heuristic about whether the drive itself looks healthy. Helps users tell
/// "this disc is damaged" apart from "my drive is broken/disconnecting" —
/// otherwise both look like stalled progress.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DriveHealthHint {
    /// Not enough samples yet to judge.
    Unknown,
    /// Reads are succeeding at a normal rate.
    Good,
    /// Reads are succeeding but slowly / with many failures. Disc may be
    /// heavily damaged, OR the drive may be struggling.
    Marginal,
    /// No successful reads in a long time. The drive is probably broken or
    /// the disc is unreadable in this drive.
    Suspect,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryStats {
    pub good: u64,
    pub failed: u64,
    pub skipped: u64,
    pub unknown: u64,
    /// Convenience: `failed + unknown`. Surfaces the number of sectors that
    /// still need recovery without requiring the frontend to add two fields.
    pub holes_remaining: u64,
    pub total: u64,
    pub current_lba: u64,
    pub current_pass: u8,
    pub pass_strategy: String,
    /// Sectors per second (rolling).
    pub speed_sps: f64,
    pub elapsed_secs: u64,
    pub eta_secs: Option<u64>,
    /// Heuristic about whether the drive itself appears healthy. Surfaced
    /// in the UI so a user can tell broken hardware apart from a broken disc.
    #[serde(default = "default_health")]
    pub drive_health: DriveHealthHint,
    /// Total successful sector reads since recovery started.
    #[serde(default)]
    pub reads_ok: u64,
    /// Total failed read attempts since recovery started.
    #[serde(default)]
    pub reads_err: u64,
    /// Seconds since the last successful read; `None` if we never had one.
    #[serde(default)]
    pub idle_secs: Option<u64>,
    /// True when the drive has produced no successful read for ≥60s past grace.
    #[serde(default)]
    pub stalled: bool,
    /// How many distinct stall episodes have occurred this run.
    #[serde(default)]
    pub stall_count: u64,
    /// True while the wall detector's binary probe is scanning ahead past a
    /// damage zone. UI should show a calm "scanning for more data" message.
    #[serde(default)]
    pub wall_probe_active: bool,
}

fn default_health() -> DriveHealthHint {
    DriveHealthHint::Unknown
}

#[derive(Debug, Clone, Serialize)]
pub struct RecoveryProgress {
    pub session_id: Uuid,
    pub stats: RecoveryStats,
}

/// Lifecycle states for the engine.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EngineState {
    Idle,
    Running,
    Paused,
    Cancelled,
    Completed,
    Failed,
}

pub struct RecoveryEngine {
    pub session_id: Uuid,
    map: Mutex<SectorMap>,
    reader: Arc<dyn SectorReader>,
    plan: Vec<PassStrategy>,
    mode: RecoveryMode,
    state: Mutex<EngineState>,
    pause_flag: AtomicBool,
    /// Shared cancel signal. Stored as `Arc` so it can be handed to the
    /// `SectorReader` backend (e.g. `ScsiSectorReader`) which then checks it
    /// inside disconnect/reopen retry sleeps, making Cancel responsive even
    /// when the SCSI layer is blocked in a 3-second reconnect pause.
    cancel_flag: Arc<AtomicBool>,
    current_pass: AtomicU64,
    current_lba: AtomicU64,
    started_at: Mutex<Option<Instant>>,
    /// Cumulative successful sector reads (for drive-health hint).
    reads_ok: AtomicU64,
    /// Cumulative failed read attempts (for drive-health hint).
    reads_err: AtomicU64,
    /// Wall-clock millis-since-epoch of the last successful read; 0 if none.
    last_success_ms: AtomicU64,
    /// Number of distinct stall episodes (idle crossed threshold then recovered).
    stall_episodes: AtomicU64,
    /// True while currently inside a stall episode (used to count once per episode).
    in_stall: AtomicBool,
    /// True while the wall detector's binary probe is scanning ahead past a
    /// damage zone. Surfaced in `RecoveryStats` so the UI can show a calm
    /// "Damaged section detected — scanning ahead" message.
    wall_probe_active: AtomicBool,
    progress_tx: Option<mpsc::UnboundedSender<RecoveryProgress>>,
    checkpoint_tx: Option<mpsc::UnboundedSender<()>>,
    /// Receipts are batched here (up to RECEIPT_BATCH_SIZE) then flushed to the
    /// async DB writer via `receipt_tx`. Using a local Vec avoids per-sector
    /// channel sends and keeps the hot read loop allocation-free.
    receipt_batch: Mutex<Vec<(u64, String)>>,
    receipt_tx: Option<mpsc::UnboundedSender<ReceiptBatch>>,
    /// When present, every good sector's bytes are written to a local disc image
    /// as they're read, so the disc is read exactly once and all outputs derive
    /// from the image. `None` in tests / if the image couldn't be opened.
    image_sink: Option<crate::recovery::image_sink::ImageSink>,
}

const RECEIPT_BATCH_SIZE: usize = 256;
/// No successful read for this long ⇒ stalled. 60s per spec.
const STALL_THRESHOLD_SECS: u64 = 60;
/// Don't arm stall detection until the engine has run this long — covers drive
/// spin-up so a slow first read never trips the alarm. Spec: 30s.
const STALL_GRACE_SECS: u64 = 30;

// ── Wall detector constants ──────────────────────────────────────────────────
// Catches damage zones where scattered readable sectors reset the streak
// counter, preventing the exponential skip-ahead from escaping. When
// progress flatlines for WALL_CHECK_INTERVAL seconds, a binary probe scans
// forward to find the next readable region without crawling through the
// entire damage zone.
/// How often to check whether Triage is making progress.
const WALL_CHECK_INTERVAL: Duration = Duration::from_secs(45);
/// Fewer than this many new good sectors in one interval ⇒ stuck in a wall.
const WALL_MIN_PROGRESS: u64 = 10;
/// Don't arm the wall detector until at least this many blocks have been
/// processed — prevents false triggers during slow drive spin-up.
const WALL_MIN_BLOCKS: usize = 50;

impl RecoveryEngine {
    pub fn new(
        session_id: Uuid,
        reader: Arc<dyn SectorReader>,
        plan: Vec<PassStrategy>,
    ) -> Self {
        let total = reader.capacity();
        Self {
            session_id,
            map: Mutex::new(SectorMap::new(total)),
            reader,
            plan,
            mode: RecoveryMode::Quick,
            state: Mutex::new(EngineState::Idle),
            pause_flag: AtomicBool::new(false),
            cancel_flag: Arc::new(AtomicBool::new(false)),
            current_pass: AtomicU64::new(0),
            current_lba: AtomicU64::new(0),
            started_at: Mutex::new(None),
            reads_ok: AtomicU64::new(0),
            reads_err: AtomicU64::new(0),
            last_success_ms: AtomicU64::new(0),
            stall_episodes: AtomicU64::new(0),
            in_stall: AtomicBool::new(false),
            wall_probe_active: AtomicBool::new(false),
            progress_tx: None,
            checkpoint_tx: None,
            receipt_batch: Mutex::new(Vec::new()),
            receipt_tx: None,
            image_sink: None,
        }
    }

    pub fn with_receipt_channel(mut self, tx: mpsc::UnboundedSender<ReceiptBatch>) -> Self {
        self.receipt_tx = Some(tx);
        self
    }

    /// Attach a disc-image sink. Every good sector read is also written to the
    /// image at its offset, so downstream outputs never re-read the disc.
    pub fn with_image_sink(mut self, sink: crate::recovery::image_sink::ImageSink) -> Self {
        self.image_sink = Some(sink);
        self
    }

    /// Bump the read-attempt counters used for drive-health classification.
    fn record_read_outcome(&self, ok: bool) {
        if ok {
            self.reads_ok.fetch_add(1, Ordering::Relaxed);
            let now_ms = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0);
            self.last_success_ms.store(now_ms, Ordering::Relaxed);
            // A single good read clears the stall. Episode already counted on entry.
            self.in_stall.store(false, Ordering::Relaxed);
        } else {
            self.reads_err.fetch_add(1, Ordering::Relaxed);
        }
    }

    /// Record a SHA-256 receipt for a successfully read sector.
    ///
    /// Receipts are accumulated in `receipt_batch` and flushed to the DB writer
    /// channel every `RECEIPT_BATCH_SIZE` entries to keep channel traffic low.
    fn record_receipt(&self, lba: u64, data: &[u8]) {
        if self.receipt_tx.is_none() {
            return;
        }
        let mut hasher = Sha256::new();
        hasher.update(data);
        let hex = format!("{:x}", hasher.finalize());

        let mut batch = self.receipt_batch.lock();
        batch.push((lba, hex));
        if batch.len() >= RECEIPT_BATCH_SIZE {
            let flush: Vec<_> = batch.drain(..).collect();
            drop(batch);
            if let Some(tx) = &self.receipt_tx {
                let _ = tx.send(flush);
            }
        }
    }

    /// Flush any remaining receipts from the local batch buffer.
    fn flush_receipts(&self) {
        if self.receipt_tx.is_none() {
            return;
        }
        let mut batch = self.receipt_batch.lock();
        if !batch.is_empty() {
            let flush: Vec<_> = batch.drain(..).collect();
            drop(batch);
            if let Some(tx) = &self.receipt_tx {
                let _ = tx.send(flush);
            }
        }
    }

    pub fn with_mode(mut self, mode: RecoveryMode) -> Self {
        self.mode = mode;
        self
    }

    pub fn with_progress_channel(
        mut self,
        tx: mpsc::UnboundedSender<RecoveryProgress>,
    ) -> Self {
        self.progress_tx = Some(tx);
        self
    }

    pub fn with_checkpoint_channel(mut self, tx: mpsc::UnboundedSender<()>) -> Self {
        self.checkpoint_tx = Some(tx);
        self
    }

    pub fn restore_map(&self, map: SectorMap) {
        *self.map.lock() = map;
    }

    pub fn snapshot_map(&self) -> SectorMap {
        self.map.lock().clone()
    }

    pub fn pause(&self) {
        self.pause_flag.store(true, Ordering::SeqCst);
    }

    pub fn resume(&self) {
        self.pause_flag.store(false, Ordering::SeqCst);
    }

    pub fn cancel(&self) {
        self.cancel_flag.store(true, Ordering::SeqCst);
    }

    /// Return a clone of the shared cancellation Arc so the `SectorReader`
    /// backend can check it inside blocking reconnect loops.
    pub fn cancel_arc(&self) -> Arc<AtomicBool> {
        Arc::clone(&self.cancel_flag)
    }

    /// Return a clone of the reader Arc so callers can call `set_cancel_flag`
    /// after engine construction (the reader is moved into the engine, so it
    /// can't be accessed via the original variable).
    pub fn reader(&self) -> Arc<dyn SectorReader> {
        Arc::clone(&self.reader)
    }

    pub fn is_running(&self) -> bool {
        *self.state.lock() == EngineState::Running
    }

    /// Drive the recovery to completion. Blocking — call from a tokio task.
    pub fn run(&self) -> EngineState {
        *self.state.lock() = EngineState::Running;
        *self.started_at.lock() = Some(Instant::now());

        // Emit an immediate snapshot so the UI reflects any sectors already
        // recovered from a prior run. Without this, resuming an already-complete
        // session shows 0% because no pass has work to do and thus never emits.
        self.emit_progress(self.plan.first().copied().unwrap_or(PassStrategy::Triage));

        match self.mode {
            RecoveryMode::Quick => {
                // Quick mode: run the plan exactly once.
                if let Some(state) = self.run_plan_cycle(0) {
                    return state;
                }
            }
            RecoveryMode::Overnight => {
                // Overnight mode: repeat the plan cycle until convergence,
                // the hard cycle cap, or cancellation.
                for cycle in 0..OVERNIGHT_MAX_CYCLES {
                    // Count Good sectors before this cycle to detect convergence.
                    let good_before = self.map.lock().count(SectorState::Good);

                    if let Some(state) = self.run_plan_cycle(cycle) {
                        return state;
                    }

                    // Check cancel between cycles.
                    if self.cancel_flag.load(Ordering::SeqCst) {
                        *self.state.lock() = EngineState::Cancelled;
                        return EngineState::Cancelled;
                    }

                    let map = self.map.lock();
                    let good_after = map.count(SectorState::Good);
                    let holes = map.count(SectorState::Failed) + map.count(SectorState::Unknown);
                    drop(map);
                    let newly_recovered = good_after.saturating_sub(good_before);

                    tracing::info!(
                        "Overnight cycle {}: recovered {} new sectors, {} holes remain",
                        cycle + 1,
                        newly_recovered,
                        holes,
                    );

                    if holes == 0 {
                        tracing::info!(
                            "Overnight: no holes remain after cycle {} — fully recovered, stopping",
                            cycle + 1,
                        );
                        break;
                    }
                    if newly_recovered == 0 {
                        tracing::info!(
                            "Overnight: cycle {} recovered 0 new sectors — dry, stopping",
                            cycle + 1,
                        );
                        break;
                    }
                }
            }
        }

        self.flush_receipts();
        // Final snapshot so the frontend's `stats` reflects the true cumulative
        // result before the `recovery:complete` event fires. Guards against the
        // "All done! 0 minutes saved" bug on re-runs where no pass had work.
        self.emit_progress(self.plan.last().copied().unwrap_or(PassStrategy::Triage));
        *self.state.lock() = EngineState::Completed;
        EngineState::Completed
    }

    /// Execute every pass in `self.plan` once (one full cycle).
    ///
    /// Returns `Some(EngineState::Cancelled)` if cancel was requested during
    /// the cycle, `None` if the cycle completed normally.
    ///
    /// `cycle_index` is 0-based and used only for logging.
    fn run_plan_cycle(&self, cycle_index: u32) -> Option<EngineState> {
        for (idx, &strategy) in self.plan.iter().enumerate() {
            // For Overnight mode the absolute pass number is less meaningful;
            // we reuse `current_pass` to track position within the current cycle.
            self.current_pass.store(idx as u64 + 1, Ordering::SeqCst);
            tracing::info!(
                "Session {}: cycle {} pass {} ({})",
                self.session_id,
                cycle_index + 1,
                idx + 1,
                strategy.name()
            );

            // Pre-pause for ThermalPause: cool the drive ONLY if there's
            // actually something for the pass to retry. Skipping the 5-minute
            // sleep when the failed-sector queue is empty saves the user
            // five minutes of "drive sitting idle, app looks frozen".
            if matches!(strategy, PassStrategy::ThermalPause) {
                let has_work = {
                    let map = self.map.lock();
                    !self.targets_for(strategy, &map).is_empty()
                };
                if has_work {
                    tracing::info!("Thermal pause: 5-minute cool-down before final retry pass");
                    let total = Duration::from_secs(300);
                    let step = Duration::from_millis(200);
                    let mut waited = Duration::ZERO;
                    let mut last_emit = Instant::now();
                    while waited < total {
                        if self.cancel_flag.load(Ordering::SeqCst) {
                            *self.state.lock() = EngineState::Cancelled;
                            return Some(EngineState::Cancelled);
                        }
                        std::thread::sleep(step);
                        waited += step;
                        // Heartbeat every second so the UI knows we're alive
                        // and not frozen. Also keeps `current_lba` fresh.
                        if last_emit.elapsed() >= Duration::from_secs(1) {
                            self.emit_progress(strategy);
                            last_emit = Instant::now();
                        }
                    }
                } else {
                    tracing::info!("Thermal pause: no failed sectors to retry, skipping cool-down");
                }
            }

            self.run_pass(strategy);

            if self.cancel_flag.load(Ordering::SeqCst) {
                *self.state.lock() = EngineState::Cancelled;
                return Some(EngineState::Cancelled);
            }
        }
        None
    }

    fn run_pass(&self, strategy: PassStrategy) {
        let opts = strategy.read_options();
        // Patient mode imposes a minimum inter-read delay (e.g. 2s) so a
        // bus-powered USB drive has time to recover. Standard mode uses the
        // strategy's native delay only.
        let delay_ms = strategy
            .inter_sector_delay_ms()
            .max(self.mode.delay_floor_ms());
        let delay = Duration::from_millis(delay_ms);

        // Hard ceiling on how long any one pass can run. Without this, a
        // disc with tens of thousands of failed sectors would have SlowRead
        // grinding for days per pass — the user gives up and assumes the app
        // is broken. Better to stop the pass cleanly so the next pass (and
        // ZeroFill at the end) gets a chance to finish the recovery.
        let pass_started = Instant::now();
        let max_pass_duration = match strategy {
            PassStrategy::Triage => Duration::from_secs(60 * 60 * 6),    // 6 hours
            PassStrategy::SlowRead => Duration::from_secs(60 * 30),       // 30 minutes
            PassStrategy::Reverse => Duration::from_secs(60 * 30),        // 30 minutes
            PassStrategy::ThermalPause => Duration::from_secs(60 * 60 * 2), // 2 hours
            PassStrategy::ZeroFill => Duration::from_secs(60 * 5),        // 5 minutes
        };

        let targets: Vec<u64> = {
            let map = self.map.lock();
            self.targets_for(strategy, &map)
        };
        if targets.is_empty() {
            tracing::info!(
                "Pass {} ({}): no targets, skipping",
                self.current_pass.load(Ordering::SeqCst),
                strategy.name()
            );
            return;
        }

        // Block size depends on pass strategy:
        // - Triage reads 64-sector (128KB) blocks for healthy regions; on block
        //   error the SCSI layer transparently falls back to per-sector reads
        //   to pinpoint exact bad LBAs.
        // - Retry passes (SlowRead/Reverse/ThermalPause/ZeroFill) read one sector
        //   at a time since they target only known-failed sectors.
        let max_block: u32 = match strategy {
            PassStrategy::Triage => crate::disc::MAX_BLOCK_SECTORS,
            _ => 1,
        };

        // Reverse pass keeps the original semantics: walk known-failed sectors
        // backward, one at a time. No block grouping makes sense here.
        if matches!(strategy, PassStrategy::Reverse) {
            for lba in targets.into_iter().rev() {
                if pass_started.elapsed() > max_pass_duration {
                    tracing::info!(
                        "Pass {} ({}): hit max duration {:?}, moving on",
                        self.current_pass.load(Ordering::SeqCst),
                        strategy.name(),
                        max_pass_duration,
                    );
                    break;
                }
                if !self.tick(strategy, lba, opts, delay) {
                    return;
                }
            }
            self.emit_progress(strategy);
            self.checkpoint();
            return;
        }

        // Group contiguous LBAs into blocks of up to `max_block` sectors.
        let blocks = group_contiguous(&targets, max_block);
        let total_blocks = blocks.len();
        // Report ~every 1s of work or every 50 blocks, whichever first.
        // Keeps the UI live even when blocks read fast.
        let report_every = (total_blocks / 1000).clamp(1, 50);
        tracing::info!(
            "Pass {} ({}): {} targets, {} blocks (max {} sectors/block), reporting every {}",
            self.current_pass.load(Ordering::SeqCst),
            strategy.name(),
            targets.len(),
            total_blocks,
            max_block,
            report_every,
        );
        let mut emitted = 0usize;
        // Heartbeat sentinel — flipped to true when run_pass returns. The
        // scoped heartbeat thread (spawned below) polls this and exits.
        let pass_done = AtomicBool::new(false);

        // Skip-ahead state (ddrescue-style forward scout): if too many consecutive
        // blocks come back fully bad, jump past a *growing* chunk of disc to find
        // the next clean region. Skipped blocks stay marked Failed so retry passes
        // will revisit them.
        //
        // Skip distance grows exponentially with the failure streak so a large
        // damaged region (the common case on a scratched DVD) gets jumped past
        // in seconds instead of hours. With 32-sector blocks, a 2048-block skip
        // covers ~128 MB of disc per attempt — even a multi-GB damaged region
        // is cleared in a handful of 5-second triage attempts.
        const FAIL_STREAK_TO_SKIP: u32 = 2;
        const MAX_SKIP_BLOCKS: usize = 2048;
        // Drive-stress protection: after this many consecutive *read* failures the
        // drive is grinding a dead region, and consumer drives respond by resetting
        // their firmware — which drops the drive off the Windows bus entirely
        // ("No drive"). Every Nth failed block we pause briefly and re-open the
        // drive handle, giving it mechanical/thermal recovery time instead of
        // hammering it into a reset.
        const FAIL_STREAK_COOLDOWN: u32 = 24;
        // Fast dead-zone escape. On a physically destroyed region a hosed USB drive
        // can take many seconds per read (the SCSI watchdog has to abort each one),
        // so crawling the gentle one-step-at-a-time exponential ramp above means
        // minutes-per-sector — the app looks frozen. When several reads *in a row*
        // are SLOW failures (drive hosed, not a quick bad-data error), leap a large
        // growing stride to clear the region in a handful of probes. Skipped sectors
        // stay Unknown and are revisited by the careful Overnight/retry passes —
        // nothing is discarded.
        const SLOW_FAIL_THRESHOLD: Duration = Duration::from_secs(4);
        const SLOW_FAILS_TO_ESCAPE: u32 = 2;
        const ESCAPE_BASE_BLOCKS: usize = 64; // ~4 MB first jump, doubling thereafter
        // After this many bridge-drops (DeviceGone) on the SAME block, Triage stops
        // re-reading it and leaps past the region. Otherwise a flaky USB-SATA bridge
        // that keeps power-cycling at one hard spot re-reads the same block forever
        // and strands the rest of the disc. The skipped band stays Unknown (a
        // retryable hole), never Failed — so it's honest and recoverable later.
        const DEVICE_GONE_DROPS_TO_LEAP: u32 = 3;
        let mut consec_fail_blocks: u32 = 0;
        let mut consec_slow_fails: u32 = 0;
        // Bridge-drop escape tracking (see DEVICE_GONE_DROPS_TO_LEAP).
        let mut device_gone_streak: u32 = 0;       // drops on the current block
        let mut device_gone_block: usize = usize::MAX;
        let mut device_leap_run: u32 = 0;          // consecutive escape-leaps w/o a good read
        let mut consec_good_after_leap: u32 = 0;   // good blocks since last leap (need 5 to reset escalation)
        // Wall detector: track progress over time to catch damage zones where
        // scattered readable sectors reset the streak counter.
        let mut wall_check_good: u64 = self.map.lock().count(SectorState::Good);
        let mut wall_check_at: Instant = Instant::now();

        // Scoped heartbeat: emits progress every 2 seconds from a parallel
        // thread, INDEPENDENT of the block-read loop. This is what fixes the
        // "UI freezes while engine grinds bad sectors" bug — on a damaged
        // region a single block iteration can take 60+ seconds (per-sector
        // fallback × 32 sectors), and the inline emit-after-block can't fire
        // during that time. With this thread, the UI shows live LBA / stats
        // every 2 s even when the main loop is stuck deep inside a read.
        std::thread::scope(|s| {
            s.spawn(|| {
                while !pass_done.load(Ordering::Relaxed) {
                    std::thread::sleep(Duration::from_millis(2000));
                    if pass_done.load(Ordering::Relaxed) { break; }
                    if self.cancel_flag.load(Ordering::SeqCst) { break; }
                    self.emit_progress(strategy);
                }
            });

            let mut i = 0;
            while i < blocks.len() {
            if self.cancel_flag.load(Ordering::SeqCst) {
                pass_done.store(true, Ordering::Relaxed);
                return;
            }
            if pass_started.elapsed() > max_pass_duration {
                tracing::info!(
                    "Pass {} ({}): hit max duration {:?}, moving on",
                    self.current_pass.load(Ordering::SeqCst),
                    strategy.name(),
                    max_pass_duration,
                );
                break;
            }
            while self.pause_flag.load(Ordering::SeqCst) {
                std::thread::sleep(Duration::from_millis(200));
                if self.cancel_flag.load(Ordering::SeqCst) {
                    pass_done.store(true, Ordering::Relaxed);
                    return;
                }
            }

            let (start, count) = blocks[i];
            self.current_lba.store(start, Ordering::SeqCst);

            let read_started = Instant::now();
            let block_failed_entirely = if matches!(strategy, PassStrategy::ZeroFill) {
                let mut map = self.map.lock();
                for j in 0..count as u64 {
                    let lba = start + j;
                    if matches!(map.get(lba), SectorState::Failed | SectorState::Unknown) {
                        map.set(lba, SectorState::Skipped);
                    }
                }
                false
            } else {
                let results = if count == 1 {
                    vec![self.reader.read_sector(start, opts)]
                } else {
                    self.reader.read_block(start, count, opts)
                };

                // Device-gone (USB-SATA bridge dropped off the bus, enclosure
                // power-cycled, media ejected) is NOT a disc defect. Marking
                // these sectors Failed — or letting skip-ahead leap past them —
                // would record damage that never happened, which is exactly how
                // a flaky bridge corrupts the map. Instead: leave them Unknown,
                // wait (patiently, Cancel-aware) for the drive to return, then
                // re-read this SAME block. No map write, no skip-ahead, no
                // failure accounting.
                if results
                    .iter()
                    .any(|r| matches!(r.error, Some(crate::disc::sector::SectorError::DeviceGone)))
                {
                    if self.wait_for_device() {
                        // Track repeated drops on the SAME block. A flaky bridge that
                        // keeps power-cycling at one hard region would otherwise
                        // re-read this block forever and never advance, stranding the
                        // rest of the disc. After a few drops at the same spot, leap
                        // past it so the readable remainder is recovered now. For
                        // Triage the skipped band stays Unknown (retryable with better
                        // hardware); for retry passes (SlowRead etc.) skipped sectors
                        // are marked Failed since the bridge demonstrably can't sustain
                        // reads here. A block the bridge can actually read recovers
                        // before the streak builds (the success path below resets it).
                        if i == device_gone_block {
                            device_gone_streak = device_gone_streak.saturating_add(1);
                        } else {
                            device_gone_block = i;
                            device_gone_streak = 1;
                        }
                        if device_gone_streak >= DEVICE_GONE_DROPS_TO_LEAP {
                            let remaining = blocks.len().saturating_sub(i + 1);
                            let safe_max = (remaining / 4).max(1);
                            // Grow the jump across back-to-back leaps (no good read
                            // between) so a large dead/unpowered region clears in a few
                            // probes, then reset once we read clean again.
                            let pow = device_leap_run.min(20);
                            let escape = ESCAPE_BASE_BLOCKS
                                .checked_shl(pow)
                                .unwrap_or(MAX_SKIP_BLOCKS)
                                .min(MAX_SKIP_BLOCKS);
                            let extra = escape.min(safe_max);

                            let is_triage = matches!(strategy, PassStrategy::Triage);
                            if is_triage {
                                tracing::warn!(
                                    "Triage: bridge dropped {device_gone_streak}× at LBA {start} — leaping {extra} blocks past it to keep recovering the rest (region deferred, left Unknown for retry)"
                                );
                            } else {
                                // Retry passes: mark the skipped sectors Failed so
                                // they don't circle back as Unknown targets forever.
                                tracing::warn!(
                                    "{}: bridge dropped {device_gone_streak}× at LBA {start} — leaping {extra} blocks, marking Failed (bridge can't sustain reads here)",
                                    strategy.name()
                                );
                                let mut map = self.map.lock();
                                // Mark the current block + all skipped blocks Failed.
                                for j in 0..count as u64 {
                                    map.set(start + j, SectorState::Failed);
                                }
                                for skip_idx in (i + 1)..=(i + extra).min(blocks.len() - 1) {
                                    let (skip_lba, skip_count) = blocks[skip_idx];
                                    for j in 0..skip_count as u64 {
                                        map.set(skip_lba + j, SectorState::Failed);
                                    }
                                }
                            }

                            i += extra + 1;
                            device_gone_streak = 0;
                            device_gone_block = usize::MAX;
                            device_leap_run = device_leap_run.saturating_add(1);
                            consec_good_after_leap = 0;
                            continue;
                        }
                        continue; // drive back → re-read same block (i not advanced)
                    }
                    // Cancelled while waiting → stop the pass cleanly.
                    pass_done.store(true, Ordering::Relaxed);
                    return;
                }

                let mut all_failed = !results.is_empty();
                let mut map = self.map.lock();
                for r in &results {
                    if r.is_ok() {
                        map.set(r.lba, SectorState::Good);
                        all_failed = false;
                        self.record_read_outcome(true);
                        if let Some(data) = &r.data {
                            self.record_receipt(r.lba, data);
                            if let Some(sink) = &self.image_sink {
                                sink.write_sector(r.lba, data);
                            }
                        }
                    } else {
                        map.set(r.lba, SectorState::Failed);
                        self.record_read_outcome(false);
                    }
                }
                all_failed
            };

            let read_elapsed = read_started.elapsed();

            // Skip-ahead heuristic for forward passes only. Exponential growth:
            // streak 2  → skip 1   block
            // streak 3  → skip 2
            // streak 4  → skip 4
            // streak 5  → skip 8
            // streak 6  → skip 16
            // streak 7  → skip 32
            // streak 8  → skip 64
            // streak 9  → skip 128
            // streak 10 → skip 256
            // streak 11 → skip 512
            // streak 12 → skip 1024
            // streak 13+→ skip 2048 (capped, ~128 MB of disc per jump)
            //
            // Also capped to 1/4 of remaining blocks so we never overshoot the
            // tail of the disc — even a heavily damaged region near the end
            // still gets a chance to find clean sectors past it.
            if matches!(strategy, PassStrategy::Triage) {
                if block_failed_entirely {
                    consec_fail_blocks = consec_fail_blocks.saturating_add(1);
                    // A failed block that took several seconds means the drive is
                    // hosed in this region (the SCSI watchdog had to abort the read),
                    // not a quick bad-data error. Track these slow failures in a row
                    // so we can escape destroyed zones fast instead of crawling.
                    if read_elapsed >= SLOW_FAIL_THRESHOLD {
                        consec_slow_fails = consec_slow_fails.saturating_add(1);
                    } else {
                        consec_slow_fails = 0;
                    }
                    // Drive-stress cool-down: on a sustained failure run, give the
                    // drive a breather and re-open the handle so it can recover
                    // rather than reset itself off the bus.
                    if consec_fail_blocks % FAIL_STREAK_COOLDOWN == 0 {
                        tracing::info!(
                            "Drive-stress cool-down after {consec_fail_blocks} consecutive failed blocks (LBA {start}): pausing 2s + re-opening drive"
                        );
                        std::thread::sleep(Duration::from_secs(2));
                        if let Err(e) = self.reader.reset() {
                            tracing::warn!("drive reset during cool-down failed: {e}");
                        }
                    }
                    // Don't skip more than a quarter of what's left — keeps the
                    // tail reachable on small/short scans.
                    let remaining = blocks.len().saturating_sub(i + 1);
                    let safe_max = (remaining / 4).max(1);
                    if consec_slow_fails >= SLOW_FAILS_TO_ESCAPE {
                        // Fast dead-zone escape: the drive has been unresponsive for
                        // several blocks running (multi-second timeouts). Stop probing
                        // block-by-block — leap a large, growing stride to clear the
                        // destroyed region in a handful of probes instead of minutes
                        // per sector. Deferred sectors stay Unknown for Overnight/retry.
                        let pow = (consec_slow_fails - SLOW_FAILS_TO_ESCAPE).min(20);
                        let escape = ESCAPE_BASE_BLOCKS
                            .checked_shl(pow)
                            .unwrap_or(MAX_SKIP_BLOCKS)
                            .min(MAX_SKIP_BLOCKS);
                        let extra = escape.min(safe_max);
                        tracing::info!(
                            "Triage: fast-escape — leaping {extra} blocks past hosed region after {consec_slow_fails} slow failures (LBA {start}, last read {read_elapsed:?})"
                        );
                        i += extra;
                    } else if consec_fail_blocks >= FAIL_STREAK_TO_SKIP {
                        let over = consec_fail_blocks - FAIL_STREAK_TO_SKIP;
                        // 2^over blocks, capped. Use checked shift to avoid overflow.
                        let exp_extra: usize = 1usize
                            .checked_shl(over.min(20))
                            .unwrap_or(MAX_SKIP_BLOCKS)
                            .min(MAX_SKIP_BLOCKS);
                        let extra = exp_extra.min(safe_max);
                        tracing::info!(
                            "Triage: skipping {extra} blocks ahead after {consec_fail_blocks} consecutive failures (LBA {start})"
                        );
                        i += extra;
                    }
                } else {
                    consec_fail_blocks = 0;
                    consec_slow_fails = 0;
                    // Read clean again → clear per-block bridge-drop tracking.
                    device_gone_streak = 0;
                    device_gone_block = usize::MAX;
                    // Don't reset device_leap_run on a single good read — a
                    // flaky bridge that drops every other block would reset the
                    // escalation and crawl at 64-block leaps forever. Require
                    // several consecutive good blocks before we believe we've
                    // truly escaped the troubled region.
                    if device_leap_run > 0 {
                        consec_good_after_leap = consec_good_after_leap.saturating_add(1);
                        if consec_good_after_leap >= 5 {
                            device_leap_run = 0;
                            consec_good_after_leap = 0;
                        }
                    }
                }

                // ── Wall detector ─────────────────────────────────────────
                // The exponential skip-ahead resets on ANY partially-readable
                // block. A messy damage zone (most sectors fail, occasional
                // ones read OK) keeps resetting the streak, so skip-ahead
                // never reaches the big jump sizes and the engine crawls.
                //
                // Fix: measure *overall progress* over time. If good-sector
                // count barely moves for WALL_CHECK_INTERVAL seconds, we're
                // stuck. Probe forward in 8 evenly-spaced steps to find the
                // next readable region, then binary-search between the last
                // failed probe and the first good probe to pinpoint the edge
                // of the damage zone. All skipped sectors stay Unknown —
                // nothing is discarded, everything is retryable later.
                if emitted >= WALL_MIN_BLOCKS
                    && wall_check_at.elapsed() >= WALL_CHECK_INTERVAL
                {
                    let current_good = self.map.lock().count(SectorState::Good);
                    let progress = current_good.saturating_sub(wall_check_good);

                    if progress < WALL_MIN_PROGRESS && current_good > 0 {
                        tracing::warn!(
                            "Wall detector: only {progress} new good sectors in {:.0}s — \
                             probing ahead to escape damage zone (LBA {start})",
                            wall_check_at.elapsed().as_secs_f64(),
                        );
                        self.wall_probe_active.store(true, Ordering::Relaxed);
                        self.emit_progress(strategy);

                        let remaining = blocks.len().saturating_sub(i + 1);
                        let stride = (remaining / 8).max(1);
                        let mut last_bad: usize = i;
                        let mut found_good: Option<usize> = None;

                        // Forward probe: test 8 evenly-spaced points ahead.
                        'probe: for step in 1..=8u32 {
                            let probe_i = i + stride * step as usize;
                            if probe_i >= blocks.len() { break; }
                            let (probe_lba, _) = blocks[probe_i];

                            // Read one sector at the probe point. Handle
                            // DeviceGone by waiting for the drive and retrying
                            // (same resilience as the main read loop).
                            let result = loop {
                                let r = self.reader.read_sector(probe_lba, opts);
                                if matches!(
                                    r.error,
                                    Some(crate::disc::sector::SectorError::DeviceGone)
                                ) {
                                    if self.wait_for_device() {
                                        continue;
                                    }
                                    break r; // cancelled
                                }
                                break r;
                            };
                            if self.cancel_flag.load(Ordering::SeqCst) {
                                break 'probe;
                            }

                            if result.is_ok() {
                                // Record the good sector.
                                let mut map = self.map.lock();
                                map.set(probe_lba, SectorState::Good);
                                drop(map);
                                self.record_read_outcome(true);
                                if let Some(data) = &result.data {
                                    self.record_receipt(probe_lba, data);
                                    if let Some(sink) = &self.image_sink {
                                        sink.write_sector(probe_lba, data);
                                    }
                                }
                                found_good = Some(probe_i);
                                tracing::info!(
                                    "Wall probe: found readable data at LBA {probe_lba} \
                                     (step {step}/8, ~{pct}% of remaining disc)",
                                    pct = step * 100 / 8,
                                );
                                break;
                            } else {
                                last_bad = probe_i;
                            }
                        }

                        // Binary search between last_bad and found_good to
                        // find the exact edge of the damage zone. At most 16
                        // iterations (~16 single-sector reads) to pinpoint the
                        // boundary within a handful of blocks.
                        if let Some(good_i) = found_good {
                            let mut lo = last_bad;
                            let mut hi = good_i;
                            for _ in 0..16 {
                                if hi - lo <= 1 { break; }
                                let mid = (lo + hi) / 2;
                                let (mid_lba, _) = blocks[mid];
                                let result = loop {
                                    let r = self.reader.read_sector(mid_lba, opts);
                                    if matches!(
                                        r.error,
                                        Some(crate::disc::sector::SectorError::DeviceGone)
                                    ) {
                                        if self.wait_for_device() {
                                            continue;
                                        }
                                        break r;
                                    }
                                    break r;
                                };
                                if self.cancel_flag.load(Ordering::SeqCst) {
                                    break;
                                }
                                if result.is_ok() {
                                    let mut map = self.map.lock();
                                    map.set(mid_lba, SectorState::Good);
                                    drop(map);
                                    self.record_read_outcome(true);
                                    if let Some(data) = &result.data {
                                        self.record_receipt(mid_lba, data);
                                        if let Some(sink) = &self.image_sink {
                                            sink.write_sector(mid_lba, data);
                                        }
                                    }
                                    hi = mid; // edge is closer to the damage
                                } else {
                                    lo = mid; // edge is further ahead
                                }
                            }

                            tracing::info!(
                                "Wall probe: damage edge at block {hi} (LBA {}), \
                                 jumping {skipped} blocks ahead to resume recovery",
                                blocks[hi].0,
                                skipped = hi - i,
                            );

                            // Reset all skip/streak counters.
                            consec_fail_blocks = 0;
                            consec_slow_fails = 0;
                            device_gone_streak = 0;
                            device_gone_block = usize::MAX;
                            device_leap_run = 0;

                            self.wall_probe_active.store(false, Ordering::Relaxed);

                            wall_check_good =
                                self.map.lock().count(SectorState::Good);
                            wall_check_at = Instant::now();

                            self.emit_progress(strategy);
                            self.checkpoint();

                            // Jump to the edge; `continue` skips the `i += 1`
                            // so this block is read on the next iteration.
                            i = hi;
                            continue;
                        } else {
                            tracing::info!(
                                "Wall probe: no readable data found ahead — \
                                 disc may be damaged to the end"
                            );
                            self.wall_probe_active.store(false, Ordering::Relaxed);
                            self.emit_progress(strategy);
                        }
                    }

                    // Reset the check window regardless of outcome.
                    wall_check_good =
                        self.map.lock().count(SectorState::Good);
                    wall_check_at = Instant::now();
                }
            }

            emitted += 1;
            // Inline burst emit on block-count boundaries — the scoped
            // heartbeat thread above handles time-based emission.
            if emitted % report_every == 0 {
                self.emit_progress(strategy);
            }
            // Checkpoint roughly every ~6400 sectors of work for Triage, every
            // ~100 sectors for retry passes. Both well under 1 minute of progress.
            if emitted % 100 == 0 {
                self.checkpoint();
            }

            if !delay.is_zero() {
                std::thread::sleep(delay);
            }
            i += 1;
            }

            // Tell the scoped heartbeat thread to exit. The scope's implicit
            // join() then waits for it to finish before run_pass returns.
            pass_done.store(true, Ordering::Relaxed);
        });

        self.emit_progress(strategy);
        self.checkpoint();
    }

    /// Process a single sector for retry passes (SlowRead / ThermalPause / Reverse).
    /// Returns false if the run should bail (cancelled).
    fn tick(
        &self,
        strategy: PassStrategy,
        lba: u64,
        opts: crate::disc::sector::ReadOptions,
        delay: Duration,
    ) -> bool {
        if self.cancel_flag.load(Ordering::SeqCst) {
            return false;
        }
        while self.pause_flag.load(Ordering::SeqCst) {
            std::thread::sleep(Duration::from_millis(200));
            if self.cancel_flag.load(Ordering::SeqCst) {
                return false;
            }
        }
        self.current_lba.store(lba, Ordering::SeqCst);

        if matches!(strategy, PassStrategy::ZeroFill) {
            let mut map = self.map.lock();
            if matches!(map.get(lba), SectorState::Failed | SectorState::Unknown) {
                map.set(lba, SectorState::Skipped);
            }
        } else {
            // Re-read through device disconnects: a vanished bridge means the
            // sector was never tested, so we wait for the drive and try the
            // SAME sector again rather than recording a false failure.
            let result = loop {
                let r = self.reader.read_sector(lba, opts);
                if matches!(r.error, Some(crate::disc::sector::SectorError::DeviceGone)) {
                    if self.wait_for_device() {
                        continue; // drive back → re-read this sector
                    }
                    return false; // cancelled while waiting
                }
                break r;
            };
            let ok = result.is_ok();
            let mut map = self.map.lock();
            if ok {
                map.set(lba, SectorState::Good);
            } else {
                map.set(lba, SectorState::Failed);
            }
            drop(map);
            self.record_read_outcome(ok);
            if ok {
                if let Some(data) = &result.data {
                    self.record_receipt(lba, data);
                    if let Some(sink) = &self.image_sink {
                        sink.write_sector(lba, data);
                    }
                }
            }
        }

        if !delay.is_zero() {
            std::thread::sleep(delay);
        }
        true
    }

    fn checkpoint(&self) {
        if let Some(tx) = &self.checkpoint_tx {
            let _ = tx.send(());
        }
    }

    /// Hold recovery while the drive is GONE (disconnected bridge, power-cycled
    /// enclosure, ejected media) and wait for it to come back, re-opening the
    /// handle. Returns `true` once the drive is readable again so the caller can
    /// re-read the same region, or `false` if recovery was Cancelled while
    /// waiting.
    ///
    /// Patient by design: a cheap USB-SATA bridge that fell off the bus usually
    /// needs the user to power-cycle the enclosure, which can take many seconds.
    /// We never give up on our own — only Cancel ends the wait, and Pause is
    /// honored. The map is left untouched (no false failures), and progress keeps
    /// emitting so the UI shows the hold instead of a frozen screen. `reset()`
    /// re-opens the handle AND re-applies the drive's recovery-mode IOCTLs, so a
    /// successful reset is a real signal the device is back, not just present.
    fn wait_for_device(&self) -> bool {
        tracing::warn!(
            "device disconnected — holding recovery and waiting for the drive to return (Cancel to stop)"
        );
        // Surface the hold in stats so the UI shows a reconnect affordance
        // rather than a dead 0%/frozen screen.
        if !self.in_stall.swap(true, Ordering::Relaxed) {
            self.stall_episodes.fetch_add(1, Ordering::Relaxed);
        }
        let mut attempt: u32 = 0;
        loop {
            if self.cancel_flag.load(Ordering::SeqCst) {
                tracing::info!("wait_for_device: cancelled by user");
                return false;
            }
            while self.pause_flag.load(Ordering::SeqCst) {
                std::thread::sleep(Duration::from_millis(200));
                if self.cancel_flag.load(Ordering::SeqCst) {
                    return false;
                }
            }
            attempt += 1;
            match self.reader.reset() {
                Ok(()) => {
                    // Let a just-reconnected bridge spin up / become ready before
                    // we re-read, so we don't bounce straight back into a
                    // NOT-READY disconnect.
                    std::thread::sleep(Duration::from_millis(1500));
                    tracing::info!(
                        "wait_for_device: drive re-opened after {attempt} attempt(s) — resuming recovery"
                    );
                    self.in_stall.store(false, Ordering::Relaxed);
                    return true;
                }
                Err(e) => {
                    if attempt == 1 || attempt % 10 == 0 {
                        tracing::warn!("wait_for_device: drive still gone (attempt {attempt}): {e}");
                    }
                }
            }
            // Heartbeat so the UI keeps moving while we hold.
            self.emit_progress(self.plan.first().copied().unwrap_or(PassStrategy::Triage));
            std::thread::sleep(Duration::from_secs(2));
        }
    }

    fn targets_for(&self, strategy: PassStrategy, map: &SectorMap) -> Vec<u64> {
        let mut v = Vec::new();
        for lba in 0..map.total() {
            let s = map.get(lba);
            let want = match strategy {
                PassStrategy::Triage => matches!(s, SectorState::Unknown),
                // SlowRead processes both never-attempted (Unknown) sectors and
                // previously-failed ones. This makes Patient mode work on fresh
                // sessions (no prior Triage), and also picks up the Unknown
                // sectors that Triage's skip-ahead intentionally leaves behind
                // — matching the long-standing intent in the code comments.
                PassStrategy::SlowRead => {
                    matches!(s, SectorState::Failed | SectorState::Unknown)
                }
                PassStrategy::Reverse | PassStrategy::ThermalPause => {
                    matches!(s, SectorState::Failed)
                }
                PassStrategy::ZeroFill => matches!(s, SectorState::Failed | SectorState::Unknown),
            };
            if want {
                v.push(lba);
            }
        }
        v
    }

    fn emit_progress(&self, strategy: PassStrategy) {
        let stats = self.compute_stats(strategy);
        if let Some(tx) = &self.progress_tx {
            let _ = tx.send(RecoveryProgress { session_id: self.session_id, stats });
        }
    }

    pub fn compute_stats(&self, strategy: PassStrategy) -> RecoveryStats {
        let map = self.map.lock();
        let total = map.total();
        let good = map.count(SectorState::Good);
        let failed = map.count(SectorState::Failed);
        let skipped = map.count(SectorState::Skipped);
        let unknown = total - good - failed - skipped;
        let current_lba = self.current_lba.load(Ordering::SeqCst);
        let elapsed = self
            .started_at
            .lock()
            .as_ref()
            .map(|t| t.elapsed().as_secs())
            .unwrap_or(0);
        let processed = good + failed + skipped;
        let speed_sps = if elapsed > 0 { processed as f64 / elapsed as f64 } else { 0.0 };
        let eta_secs = if speed_sps > 0.0 {
            Some(((total - processed) as f64 / speed_sps) as u64)
        } else {
            None
        };
        let reads_ok = self.reads_ok.load(Ordering::Relaxed);
        let reads_err = self.reads_err.load(Ordering::Relaxed);

        // Derive idle_secs from last_success timestamp.
        let last_ok_ms = self.last_success_ms.load(Ordering::Relaxed);
        let idle_secs = if last_ok_ms == 0 {
            // Never had a success — report idle as the engine elapsed time so the
            // UI can decide the drive is suspect.
            if elapsed > 0 { Some(elapsed) } else { None }
        } else {
            let now_ms = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0);
            Some((now_ms.saturating_sub(last_ok_ms)) / 1000)
        };

        // Stall detection. Armed only after the grace period so drive spin-up
        // never trips it; paused engines don't accrue idle because the heartbeat
        // keeps last_success fresh only via reads, but we also gate on running
        // state so a Paused engine reports stalled=false.
        let running = matches!(*self.state.lock(), EngineState::Running)
            && !self.pause_flag.load(Ordering::SeqCst);
        let stalled = running
            && elapsed >= STALL_GRACE_SECS
            && idle_secs.map(|s| s >= STALL_THRESHOLD_SECS).unwrap_or(false);

        // Count each episode once, on the rising edge.
        if stalled && !self.in_stall.swap(true, Ordering::Relaxed) {
            self.stall_episodes.fetch_add(1, Ordering::Relaxed);
        }
        let stall_count = self.stall_episodes.load(Ordering::Relaxed);

        // Drive-health heuristic. We classify based on:
        //   - sample size (need ≥ 100 attempts to call it)
        //   - success ratio
        //   - time since last successful read
        // A heavily damaged disc reads SOMETHING in the first hundred attempts,
        // so 0% success after 100 attempts strongly implies a drive problem.
        let attempts = reads_ok + reads_err;
        let drive_health = if attempts < 100 {
            DriveHealthHint::Unknown
        } else if reads_ok == 0 {
            DriveHealthHint::Suspect
        } else if let Some(idle) = idle_secs {
            // No good reads for >2 minutes after we've already had some — drive
            // may have stopped responding even though we're still attempting.
            if idle > 120 && reads_err > 50 {
                DriveHealthHint::Suspect
            } else {
                let ratio = reads_ok as f64 / attempts as f64;
                if ratio >= 0.50 {
                    DriveHealthHint::Good
                } else if ratio >= 0.05 {
                    DriveHealthHint::Marginal
                } else {
                    DriveHealthHint::Suspect
                }
            }
        } else {
            DriveHealthHint::Unknown
        };

        RecoveryStats {
            good,
            failed,
            skipped,
            unknown,
            holes_remaining: failed + unknown,
            total,
            current_lba,
            current_pass: self.current_pass.load(Ordering::SeqCst) as u8,
            pass_strategy: strategy.name().to_string(),
            speed_sps,
            elapsed_secs: elapsed,
            eta_secs,
            drive_health,
            reads_ok,
            reads_err,
            idle_secs,
            stalled,
            stall_count,
            wall_probe_active: self.wall_probe_active.load(Ordering::Relaxed),
        }
    }

    /// Read-only snapshot of the engine's current stats for an on-demand status
    /// query — e.g. the UI re-syncing after a remount, instead of waiting for the
    /// next `recovery:progress` event. Mirrors the `emit_progress` payload but
    /// sends nothing. Picks the strategy for the pass currently in flight
    /// (`current_pass` is 1-based) so `pass_strategy` matches the live stream.
    pub fn current_stats(&self) -> RecoveryStats {
        let pass_num = self.current_pass.load(Ordering::SeqCst);
        let idx = pass_num.saturating_sub(1) as usize;
        let strategy = self
            .plan
            .get(idx)
            .copied()
            .or_else(|| self.plan.first().copied())
            .unwrap_or(PassStrategy::Triage);
        self.compute_stats(strategy)
    }
}

/// Group sorted LBAs into runs of contiguous sectors, capped at `max_size`.
/// Returns `(start_lba, count)` pairs.
fn group_contiguous(targets: &[u64], max_size: u32) -> Vec<(u64, u32)> {
    let mut out = Vec::new();
    if targets.is_empty() {
        return out;
    }
    let mut start = targets[0];
    let mut len: u32 = 1;
    for &t in &targets[1..] {
        if t == start + len as u64 && len < max_size {
            len += 1;
        } else {
            out.push((start, len));
            start = t;
            len = 1;
        }
    }
    out.push((start, len));
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::disc::mock::{MockSectorBehavior, MockSectorReader};
    use crate::recovery::passes::{default_pass_plan, PassStrategy};
    use std::sync::Arc;

    #[test]
    fn groups_contiguous_runs() {
        let g = group_contiguous(&[0, 1, 2, 3, 5, 6, 100], 64);
        assert_eq!(g, vec![(0, 4), (5, 2), (100, 1)]);
    }

    #[test]
    fn caps_at_max_size() {
        let v: Vec<u64> = (0..200).collect();
        let g = group_contiguous(&v, 64);
        assert_eq!(g, vec![(0, 64), (64, 64), (128, 64), (192, 8)]);
    }

    #[test]
    fn empty_input() {
        let g = group_contiguous(&[], 64);
        assert!(g.is_empty());
    }

    /// End-to-end engine test: a fully clean disc must produce 100% Good.
    #[test]
    fn pristine_disc_full_recovery() {
        let reader = Arc::new(MockSectorReader::new(2048, MockSectorBehavior::Good));
        let engine = RecoveryEngine::new(Uuid::new_v4(), reader, vec![PassStrategy::Triage]);
        engine.run();
        let map = engine.snapshot_map();
        assert_eq!(map.count(SectorState::Good), 2048);
        assert_eq!(map.count(SectorState::Failed), 0);
    }

    /// Mixed disc: a contiguous bad range gets marked Failed during Triage,
    /// then a SlowRead pass succeeds against a `BadUntilAttempt(1)` sector.
    #[test]
    fn slowread_recovers_borderline_sectors() {
        let mut reader = MockSectorReader::new(512, MockSectorBehavior::Good);
        // Sector 100 fails on attempt 1 only — succeeds on attempt 2 (Triage's
        // single read fails, SlowRead's retry succeeds).
        reader.set(100, MockSectorBehavior::BadUntilAttempt(1));
        let reader = Arc::new(reader);
        let engine = RecoveryEngine::new(
            Uuid::new_v4(),
            reader,
            vec![PassStrategy::Triage, PassStrategy::SlowRead],
        );
        engine.run();
        let map = engine.snapshot_map();
        // After SlowRead, sector 100 should now be Good.
        assert_eq!(map.get(100), SectorState::Good);
        assert_eq!(map.count(SectorState::Failed), 0);
        assert_eq!(map.count(SectorState::Good), 512);
    }

    /// A permanently bad contiguous run stays Failed even after retry passes,
    /// confirming we mark damage cleanly without false positives.
    #[test]
    fn permanently_bad_range_stays_failed() {
        let mut reader = MockSectorReader::new(512, MockSectorBehavior::Good);
        reader.set_range_bad(200, 50); // 50-sector scratch
        let reader = Arc::new(reader);
        let _engine = RecoveryEngine::new(Uuid::new_v4(), reader, default_pass_plan());
        // ThermalPause sleeps 5 minutes — strip it for tests.
        let plan = vec![
            PassStrategy::Triage,
            PassStrategy::SlowRead,
            PassStrategy::Reverse,
        ];
        let engine = RecoveryEngine::new(
            Uuid::new_v4(),
            Arc::new({
                let mut r = MockSectorReader::new(512, MockSectorBehavior::Good);
                r.set_range_bad(200, 50);
                r
            }),
            plan,
        );
        engine.run();
        let map = engine.snapshot_map();
        assert_eq!(map.count(SectorState::Good), 462);
        assert_eq!(map.count(SectorState::Failed), 50);
        // Verify the failed run is exactly where we put it.
        let runs: Vec<_> = map.runs(SectorState::Failed).collect();
        assert_eq!(runs, vec![(200, 250)]);
    }

    /// Skip-ahead activates when many consecutive blocks fail. Validates the
    /// engine reaches the clean tail past a dead region instead of grinding
    /// forever. Note: skipped blocks intentionally stay Unknown — they're
    /// targeted by the retry passes (SlowRead/Reverse), not by Triage. So we
    /// assert "we touched the tail" not "we read every tail sector".
    #[test]
    fn skip_ahead_activates_in_dead_region() {
        let mut reader = MockSectorReader::new(10_000, MockSectorBehavior::Good);
        reader.set_range_bad(2000, 6000);
        let reader = Arc::new(reader);
        let engine = RecoveryEngine::new(Uuid::new_v4(), reader, vec![PassStrategy::Triage]);
        engine.run();
        let map = engine.snapshot_map();

        // The pre-dead head should be entirely Good.
        for lba in 0..2000 {
            assert_eq!(map.get(lba), SectorState::Good, "head sector {lba}");
        }
        // Skip-ahead must have reached past the dead region — there should be
        // *some* Good sectors after LBA 8000, even if not all of them.
        let tail_good = (8000..10_000)
            .filter(|&lba| map.get(lba) == SectorState::Good)
            .count();
        assert!(
            tail_good > 0,
            "skip-ahead failed to reach the clean tail: 0 of 2000 sectors marked Good"
        );
        // And we must NOT have marked every dead-region sector as Failed —
        // skip-ahead should leave most as Unknown for the retry passes to
        // revisit.
        let dead_failed = (2000..8000)
            .filter(|&lba| map.get(lba) == SectorState::Failed)
            .count();
        assert!(
            dead_failed < 3000,
            "skip-ahead didn't activate: {dead_failed} of 6000 sectors marked Failed"
        );
    }

    // -------------------------------------------------------------------------
    // New tests: thorough multi-pass / damage simulation coverage
    // -------------------------------------------------------------------------

    /// A contiguous bad-sector run (scratch simulation): Triage skip-ahead
    /// jumps the dead zone, later SlowRead+Reverse retry passes visit those
    /// sectors, and the final map has exactly the right counts.
    #[test]
    fn scratch_region_exact_state_after_full_plan() {
        const TOTAL: u64 = 512;
        const BAD_START: u64 = 100;
        const BAD_LEN: u64 = 30;

        let mut reader = MockSectorReader::new(TOTAL, MockSectorBehavior::Good);
        reader.set_range_bad(BAD_START, BAD_LEN);
        let plan = vec![
            PassStrategy::Triage,
            PassStrategy::SlowRead,
            PassStrategy::Reverse,
        ];
        let engine = RecoveryEngine::new(Uuid::new_v4(), Arc::new(reader), plan);
        engine.run();
        let map = engine.snapshot_map();

        // Exact counts: good sectors = total minus the permanent bad run.
        assert_eq!(
            map.count(SectorState::Good),
            TOTAL - BAD_LEN,
            "good count wrong"
        );
        assert_eq!(
            map.count(SectorState::Failed),
            BAD_LEN,
            "failed count wrong"
        );
        assert_eq!(map.count(SectorState::Unknown), 0, "no sector should be Unknown after all passes");
        assert_eq!(map.count(SectorState::Skipped), 0, "no ZeroFill pass, nothing Skipped");

        // Counter integrity: all state counts sum to total.
        let sum = map.count(SectorState::Good)
            + map.count(SectorState::Failed)
            + map.count(SectorState::Unknown)
            + map.count(SectorState::Skipped);
        assert_eq!(sum, TOTAL, "counts must sum to total");

        // The failed run is exactly where we placed it.
        let runs: Vec<_> = map.runs(SectorState::Failed).collect();
        assert_eq!(
            runs,
            vec![(BAD_START, BAD_START + BAD_LEN)],
            "failed run mismatch"
        );

        // Neighbors of the scratch are Good.
        assert_eq!(map.get(BAD_START - 1), SectorState::Good, "sector before scratch must be Good");
        assert_eq!(map.get(BAD_START + BAD_LEN), SectorState::Good, "sector after scratch must be Good");
    }

    /// Transient sectors: fail on the first pass but succeed on a retry pass.
    /// After the full plan, every transient sector must end up Good.
    #[test]
    fn transient_bad_sectors_recover_on_retry_pass() {
        const TOTAL: u64 = 256;
        // These sectors fail on attempt 1 (Triage) but succeed on attempt 2+.
        const TRANSIENT: &[u64] = &[10, 50, 127, 200, 255];

        let mut reader = MockSectorReader::new(TOTAL, MockSectorBehavior::Good);
        for &lba in TRANSIENT {
            reader.set(lba, MockSectorBehavior::BadUntilAttempt(1));
        }
        let plan = vec![PassStrategy::Triage, PassStrategy::SlowRead];
        let engine = RecoveryEngine::new(Uuid::new_v4(), Arc::new(reader), plan);
        engine.run();
        let map = engine.snapshot_map();

        for &lba in TRANSIENT {
            assert_eq!(
                map.get(lba),
                SectorState::Good,
                "transient sector {lba} should be Good after SlowRead"
            );
        }
        // No sector should remain Failed or Unknown.
        assert_eq!(map.count(SectorState::Failed), 0, "no permanent failures expected");
        assert_eq!(map.count(SectorState::Unknown), 0, "no untouched sectors expected");
        assert_eq!(map.count(SectorState::Good), TOTAL);
    }

    /// Permanent bad sectors stay Failed; their immediate neighbors are Good.
    /// Validates the engine doesn't silently mark them Good or Unknown.
    #[test]
    fn permanent_bad_sectors_stay_failed_neighbors_good() {
        const TOTAL: u64 = 200;
        const BAD: &[u64] = &[0, 1, 99, 100, 101, 199];

        let mut reader = MockSectorReader::new(TOTAL, MockSectorBehavior::Good);
        for &lba in BAD {
            reader.set(lba, MockSectorBehavior::BadAlways);
        }
        let plan = vec![
            PassStrategy::Triage,
            PassStrategy::SlowRead,
            PassStrategy::Reverse,
        ];
        let engine = RecoveryEngine::new(Uuid::new_v4(), Arc::new(reader), plan);
        engine.run();
        let map = engine.snapshot_map();

        for &lba in BAD {
            assert_eq!(
                map.get(lba),
                SectorState::Failed,
                "permanent bad sector {lba} must be Failed"
            );
        }
        // Interior neighbors of the isolated bad sectors must be Good.
        assert_eq!(map.get(2), SectorState::Good);
        assert_eq!(map.get(98), SectorState::Good);
        assert_eq!(map.get(102), SectorState::Good);
        assert_eq!(map.get(198), SectorState::Good);

        assert_eq!(map.count(SectorState::Failed), BAD.len() as u64);
        assert_eq!(map.count(SectorState::Good), TOTAL - BAD.len() as u64);
        assert_eq!(map.count(SectorState::Unknown), 0);

        // Counter integrity.
        let sum = map.count(SectorState::Good)
            + map.count(SectorState::Failed)
            + map.count(SectorState::Unknown)
            + map.count(SectorState::Skipped);
        assert_eq!(sum, TOTAL);
    }

    /// Timeout sectors: the engine records them as Failed and moves on without
    /// hanging. Surrounding sectors must be recovered as Good.
    #[test]
    fn timeout_sectors_recorded_failed_no_hang() {
        use crate::disc::mock::MockSectorBehavior;

        const TOTAL: u64 = 100;
        // LBAs 40-44 simulate a hung-IOCTL (AlwaysTimeout). The mock returns
        // immediately, so the test is fast; we just verify the state machine
        // records them correctly.
        let mut reader = MockSectorReader::new(TOTAL, MockSectorBehavior::Good);
        reader.set_range(40, 5, MockSectorBehavior::AlwaysTimeout);

        let plan = vec![
            PassStrategy::Triage,
            PassStrategy::SlowRead,
            PassStrategy::Reverse,
        ];
        let engine = RecoveryEngine::new(Uuid::new_v4(), Arc::new(reader), plan);
        engine.run();
        let map = engine.snapshot_map();

        // Timeout sectors must end up Failed (not silently Good or Unknown).
        for lba in 40..45 {
            assert_eq!(
                map.get(lba),
                SectorState::Failed,
                "timeout sector {lba} should be Failed"
            );
        }
        // Surrounding sectors must be Good.
        assert_eq!(map.get(39), SectorState::Good, "sector before timeout window");
        assert_eq!(map.get(45), SectorState::Good, "sector after timeout window");

        // No sector left Unknown.
        assert_eq!(map.count(SectorState::Unknown), 0);

        // Counter integrity.
        let sum = map.count(SectorState::Good)
            + map.count(SectorState::Failed)
            + map.count(SectorState::Unknown)
            + map.count(SectorState::Skipped);
        assert_eq!(sum, TOTAL);
    }

    /// Uncorrectable ECC sectors stay Failed through all passes.
    #[test]
    fn uncorrectable_sectors_stay_failed() {
        use crate::disc::mock::MockSectorBehavior;

        const TOTAL: u64 = 64;
        let mut reader = MockSectorReader::new(TOTAL, MockSectorBehavior::Good);
        reader.set(32, MockSectorBehavior::AlwaysUncorrectable);
        reader.set(33, MockSectorBehavior::AlwaysUncorrectable);

        let plan = vec![PassStrategy::Triage, PassStrategy::SlowRead];
        let engine = RecoveryEngine::new(Uuid::new_v4(), Arc::new(reader), plan);
        engine.run();
        let map = engine.snapshot_map();

        assert_eq!(map.get(32), SectorState::Failed);
        assert_eq!(map.get(33), SectorState::Failed);
        assert_eq!(map.count(SectorState::Failed), 2);
        assert_eq!(map.count(SectorState::Good), TOTAL - 2);
        assert_eq!(map.count(SectorState::Unknown), 0);
    }

    /// HardwareError-then-good sectors: the engine retries on a later pass and
    /// eventually marks them Good, just like transient MediumErrors.
    #[test]
    fn hardware_error_then_good_recovers() {
        use crate::disc::mock::MockSectorBehavior;

        const TOTAL: u64 = 128;
        let mut reader = MockSectorReader::new(TOTAL, MockSectorBehavior::Good);
        // Sector 60 fails with HardwareError on the first read, succeeds after.
        reader.set(60, MockSectorBehavior::HardwareErrorUntilAttempt(1));

        let plan = vec![PassStrategy::Triage, PassStrategy::SlowRead];
        let engine = RecoveryEngine::new(Uuid::new_v4(), Arc::new(reader), plan);
        engine.run();
        let map = engine.snapshot_map();

        assert_eq!(
            map.get(60),
            SectorState::Good,
            "hardware-error-then-good sector must end Good"
        );
        assert_eq!(map.count(SectorState::Failed), 0);
        assert_eq!(map.count(SectorState::Good), TOTAL);
    }

    /// ZeroFill pass: remaining Failed/Unknown sectors become Skipped.
    /// Good sectors are untouched.
    #[test]
    fn zerofill_promotes_failed_to_skipped() {
        const TOTAL: u64 = 64;
        let mut reader = MockSectorReader::new(TOTAL, MockSectorBehavior::Good);
        reader.set_range_bad(20, 10);

        // Full plan including ZeroFill.
        let plan = vec![
            PassStrategy::Triage,
            PassStrategy::SlowRead,
            PassStrategy::Reverse,
            PassStrategy::ZeroFill,
        ];
        let engine = RecoveryEngine::new(Uuid::new_v4(), Arc::new(reader), plan);
        engine.run();
        let map = engine.snapshot_map();

        // After ZeroFill, no sector should be Failed or Unknown.
        assert_eq!(
            map.count(SectorState::Failed),
            0,
            "ZeroFill must clear all Failed sectors"
        );
        assert_eq!(
            map.count(SectorState::Unknown),
            0,
            "ZeroFill must clear all Unknown sectors"
        );
        // The permanently bad run is now Skipped.
        for lba in 20..30 {
            assert_eq!(
                map.get(lba),
                SectorState::Skipped,
                "permanently bad sector {lba} should be Skipped after ZeroFill"
            );
        }
        // Good sectors unchanged.
        assert_eq!(map.get(19), SectorState::Good);
        assert_eq!(map.get(30), SectorState::Good);

        // Counter integrity.
        let sum = map.count(SectorState::Good)
            + map.count(SectorState::Failed)
            + map.count(SectorState::Unknown)
            + map.count(SectorState::Skipped);
        assert_eq!(sum, TOTAL);
    }

    /// RESUME test: run a partial recovery on a disc with a mixed-damage profile,
    /// snapshot the map, build a NEW engine from that snapshot (simulating an
    /// app restart / resume), run the remaining passes, and verify:
    ///   1. The final map is fully resolved (no Unknown sectors).
    ///   2. Sectors that were already Good in the snapshot are still Good.
    ///   3. The total counts are self-consistent.
    ///
    /// Uses `snapshot_map` + `restore_map` — the real public API for persistence.
    /// (In the full app this snapshot is persisted to SQLite; here we pass it
    /// through memory to keep the test free of DB dependencies.)
    #[test]
    fn resume_from_partial_map_does_not_re_read_good_sectors() {
        use crate::disc::mock::MockSectorBehavior;
        use crate::recovery::map::SectorState;

        const TOTAL: u64 = 256;
        const BAD_START: u64 = 128;
        const BAD_LEN: u64 = 20;

        // Shared reader: sectors 128-147 always fail, rest are good.
        let make_reader = || {
            let mut r = MockSectorReader::new(TOTAL, MockSectorBehavior::Good);
            r.set_range_bad(BAD_START, BAD_LEN);
            Arc::new(r)
        };

        // --- Session 1: Triage only (partial run) ---
        let reader1 = make_reader();
        let engine1 = RecoveryEngine::new(
            Uuid::new_v4(),
            reader1.clone(),
            vec![PassStrategy::Triage],
        );
        engine1.run();
        let snapshot = engine1.snapshot_map();

        // Sanity: after Triage the good sectors should be Good.
        // (Bad sectors may be Failed or Unknown depending on skip-ahead.)
        assert!(
            snapshot.count(SectorState::Good) > 0,
            "Triage should have read some good sectors"
        );
        // Record which sectors were Good so we can verify they stay Good after resume.
        let good_after_triage: Vec<u64> = (0..TOTAL)
            .filter(|&lba| snapshot.get(lba) == SectorState::Good)
            .collect();

        // --- Session 2: resume with SlowRead + Reverse ---
        let reader2 = make_reader();
        let engine2 = RecoveryEngine::new(
            Uuid::new_v4(),
            reader2,
            vec![PassStrategy::SlowRead, PassStrategy::Reverse],
        );
        engine2.restore_map(snapshot);
        engine2.run();
        let final_map = engine2.snapshot_map();

        // All sectors previously Good are still Good — resume must not overwrite them.
        for lba in &good_after_triage {
            assert_eq!(
                final_map.get(*lba),
                SectorState::Good,
                "sector {lba} was Good after Triage, must still be Good after resume"
            );
        }

        // The permanent bad sectors must be Failed (SlowRead + Reverse exhausted retries).
        for lba in BAD_START..(BAD_START + BAD_LEN) {
            assert_eq!(
                final_map.get(lba),
                SectorState::Failed,
                "permanent bad sector {lba} must be Failed after resume"
            );
        }

        // No Unknown sectors remain after SlowRead (it targets Unknown too).
        assert_eq!(
            final_map.count(SectorState::Unknown),
            0,
            "no Unknown sectors should remain after SlowRead pass"
        );

        // Counter integrity.
        let sum = final_map.count(SectorState::Good)
            + final_map.count(SectorState::Failed)
            + final_map.count(SectorState::Unknown)
            + final_map.count(SectorState::Skipped);
        assert_eq!(sum, TOTAL, "all state counts must sum to total");
    }

    /// RESUME via rmap round-trip: encode the partial map to a ddrescue mapfile,
    /// decode it back into a fresh SectorMap, restore into a new engine, and
    /// finish. This exercises the full persistence path used when the app saves
    /// to disk and the user relaunches.
    #[test]
    fn resume_via_rmap_round_trip() {
        use crate::disc::mock::MockSectorBehavior;
        use crate::recovery::rmap::{decode as rmap_decode, encode as rmap_encode, RmapHeader};

        const TOTAL: u64 = 128;
        const BAD_START: u64 = 60;
        const BAD_LEN: u64 = 10;

        let make_reader = || {
            let mut r = MockSectorReader::new(TOTAL, MockSectorBehavior::Good);
            r.set_range_bad(BAD_START, BAD_LEN);
            Arc::new(r)
        };

        // Session 1: Triage only.
        let engine1 = RecoveryEngine::new(
            Uuid::new_v4(),
            make_reader(),
            vec![PassStrategy::Triage],
        );
        engine1.run();
        let map1 = engine1.snapshot_map();

        // Persist to rmap text (as the app would write to disk).
        let rmap_text = rmap_encode(&map1, &RmapHeader::default());

        // Session 2: decode rmap, restore into fresh engine, finish with retries.
        let restored_map = rmap_decode(&rmap_text, TOTAL).expect("rmap decode must succeed");
        let engine2 = RecoveryEngine::new(
            Uuid::new_v4(),
            make_reader(),
            vec![PassStrategy::SlowRead, PassStrategy::Reverse],
        );
        engine2.restore_map(restored_map);
        engine2.run();
        let final_map = engine2.snapshot_map();

        // Permanent bad sectors stay Failed.
        for lba in BAD_START..(BAD_START + BAD_LEN) {
            assert_eq!(final_map.get(lba), SectorState::Failed, "bad sector {lba}");
        }
        // All other sectors are Good.
        assert_eq!(final_map.count(SectorState::Failed), BAD_LEN);
        assert_eq!(final_map.count(SectorState::Good), TOTAL - BAD_LEN);
        assert_eq!(final_map.count(SectorState::Unknown), 0);

        // Counter integrity.
        let sum = final_map.count(SectorState::Good)
            + final_map.count(SectorState::Failed)
            + final_map.count(SectorState::Unknown)
            + final_map.count(SectorState::Skipped);
        assert_eq!(sum, TOTAL);
    }

    /// Counter integrity invariant: after ANY run, the four state counts must
    /// always sum to exactly the disc capacity, regardless of damage profile.
    /// Tests a pathological disc: alternating good/bad sectors.
    #[test]
    fn counter_integrity_alternating_damage() {
        const TOTAL: u64 = 200;

        let mut reader = MockSectorReader::new(TOTAL, MockSectorBehavior::Good);
        for lba in (0..TOTAL).step_by(2) {
            reader.set(lba, MockSectorBehavior::BadAlways);
        }
        let plan = vec![
            PassStrategy::Triage,
            PassStrategy::SlowRead,
            PassStrategy::Reverse,
        ];
        let engine = RecoveryEngine::new(Uuid::new_v4(), Arc::new(reader), plan);
        engine.run();
        let map = engine.snapshot_map();

        let sum = map.count(SectorState::Good)
            + map.count(SectorState::Failed)
            + map.count(SectorState::Unknown)
            + map.count(SectorState::Skipped);
        assert_eq!(sum, TOTAL, "counts must sum to total");
        // Half failed, half good.
        assert_eq!(map.count(SectorState::Failed), TOTAL / 2);
        assert_eq!(map.count(SectorState::Good), TOTAL / 2);
        assert_eq!(map.count(SectorState::Unknown), 0);
    }

    /// Edge case: a disc where every sector fails permanently. The final map
    /// must have 0 Good and total == Failed. No panic, no hang.
    #[test]
    fn all_sectors_failed_no_panic() {
        const TOTAL: u64 = 64;
        let reader = Arc::new(MockSectorReader::new(TOTAL, MockSectorBehavior::BadAlways));
        let plan = vec![
            PassStrategy::Triage,
            PassStrategy::SlowRead,
            PassStrategy::Reverse,
        ];
        let engine = RecoveryEngine::new(Uuid::new_v4(), reader, plan);
        let final_state = engine.run();
        assert_eq!(final_state, EngineState::Completed);

        let map = engine.snapshot_map();
        assert_eq!(map.count(SectorState::Good), 0);
        assert_eq!(map.count(SectorState::Failed), TOTAL);
        assert_eq!(map.count(SectorState::Unknown), 0);

        let sum = map.count(SectorState::Good)
            + map.count(SectorState::Failed)
            + map.count(SectorState::Unknown)
            + map.count(SectorState::Skipped);
        assert_eq!(sum, TOTAL);
    }

    /// Edge case: a single-sector disc — exercises boundary conditions in the
    /// block-grouping and skip-ahead logic.
    #[test]
    fn single_sector_disc_good() {
        let reader = Arc::new(MockSectorReader::new(1, MockSectorBehavior::Good));
        let engine = RecoveryEngine::new(Uuid::new_v4(), reader, vec![PassStrategy::Triage]);
        engine.run();
        let map = engine.snapshot_map();
        assert_eq!(map.count(SectorState::Good), 1);
        assert_eq!(map.total(), 1);

        let sum = map.count(SectorState::Good)
            + map.count(SectorState::Failed)
            + map.count(SectorState::Unknown)
            + map.count(SectorState::Skipped);
        assert_eq!(sum, 1);
    }

    /// Edge case: single-sector disc that permanently fails — same boundary
    /// check for the failed path.
    #[test]
    fn single_sector_disc_bad() {
        let reader = Arc::new(MockSectorReader::new(1, MockSectorBehavior::BadAlways));
        let plan = vec![PassStrategy::Triage, PassStrategy::SlowRead];
        let engine = RecoveryEngine::new(Uuid::new_v4(), reader, plan);
        engine.run();
        let map = engine.snapshot_map();
        assert_eq!(map.count(SectorState::Failed), 1);
        assert_eq!(map.count(SectorState::Good), 0);

        let sum = map.count(SectorState::Good)
            + map.count(SectorState::Failed)
            + map.count(SectorState::Unknown)
            + map.count(SectorState::Skipped);
        assert_eq!(sum, 1);
    }
}

