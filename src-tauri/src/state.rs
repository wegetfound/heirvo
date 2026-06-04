//! Global application state managed by Tauri.

use crate::disc::drive::DriveInfo;
use crate::error::AppResult;
use crate::recovery::engine::RecoveryEngine;
use crate::session::db::Db;
use parking_lot::RwLock;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

pub struct AppState {
    pub db: Db,
    /// Active recovery engines keyed by session id.
    pub engines: Arc<RwLock<HashMap<Uuid, Arc<RecoveryEngine>>>>,
}

impl AppState {
    pub async fn init(app: &AppHandle) -> AppResult<()> {
        let data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| crate::error::AppError::Internal(format!("app_data_dir: {e}")))?;
        std::fs::create_dir_all(&data_dir)?;

        let db_path = data_dir.join("dvd-recovery.db");
        tracing::info!("Opening database at {}", db_path.display());
        let db = Db::open(&db_path).await?;
        db.migrate().await?;

        // Clear any stale `heirvo_trans_*.wav` files left behind by a prior
        // crash. The worker now cleans these up per-job, but if the app was
        // killed mid-transcription nothing got the chance.
        sweep_stale_temp_wavs();

        // Reset any sessions that were left in an active state by a prior crash.
        // On a clean shutdown the engine marks sessions `paused` or `completed`;
        // if the process was killed mid-flight they stay as `scanning` or
        // `recovering` forever. Mark them `paused` so the user can resume or
        // discard them from the UI rather than having them appear stuck.
        let reset_result = sqlx::query(
            "UPDATE recovery_sessions SET status = 'paused'
             WHERE status IN ('scanning', 'recovering')",
        )
        .execute(&db.pool)
        .await;
        match reset_result {
            Ok(r) => {
                let n = r.rows_affected();
                if n > 0 {
                    tracing::warn!(
                        "Startup: reset {} in-flight session(s) from active → paused \
                         (app was likely killed mid-recovery)",
                        n
                    );
                } else {
                    tracing::debug!("Startup: no in-flight sessions to reset");
                }
            }
            Err(e) => {
                // Non-fatal: log and continue. The sessions will still be visible;
                // they'll just show stale status until the user interacts with them.
                tracing::error!("Startup: failed to reset in-flight sessions: {e}");
            }
        }

        // Reconcile any library_discs rows that ended up with status='recovered'
        // or 'partial' but have no video_path — these are video/audio discs whose
        // rescue was interrupted before any output was written (e.g. power brownout
        // mid-recovery, current_pass=0). Mark them 'incomplete' so the user sees
        // an honest, actionable message instead of a silent unplayable disc.
        let reconcile_result = sqlx::query(
            "UPDATE library_discs
             SET status = 'incomplete', updated_at = ?
             WHERE status IN ('recovered', 'partial')
               AND media_type IN ('video', 'audio')
               AND (video_path IS NULL OR video_path = '')",
        )
        .bind(chrono::Utc::now().timestamp())
        .execute(&db.pool)
        .await;
        match reconcile_result {
            Ok(r) => {
                let n = r.rows_affected();
                if n > 0 {
                    tracing::warn!(
                        "Startup: corrected {} disc(s) from 'recovered'/'partial' → 'incomplete' \
                         (video/audio disc with no output file — likely interrupted rescue)",
                        n
                    );
                } else {
                    tracing::debug!("Startup: no incomplete disc rows to reconcile");
                }
            }
            Err(e) => {
                tracing::error!("Startup: incomplete-disc reconciliation failed (non-fatal): {e}");
            }
        }

        let db_for_worker = db.clone();
        // Clone the pool for the deliverable backfill BEFORE spawn_worker
        // consumes db_for_worker.
        let pool_for_backfill = db_for_worker.pool.clone();
        let state = Self {
            db,
            engines: Arc::new(RwLock::new(HashMap::new())),
        };

        app.manage(state);
        tracing::info!("App state initialized");

        // Spawn the transcription queue worker (single concurrent job).
        crate::transcription::worker::spawn_worker(app.clone(), db_for_worker);

        // Spawn the drive watcher: polls every 2s, emits `drives:changed` when
        // the set of optical drives or their `has_media` flag changes.
        let app_handle = app.clone();
        tauri::async_runtime::spawn(async move {
            run_drive_watcher(app_handle).await;
        });

        // Backfill friendly Documents copies for any pre-existing discs that predate
        // the deliverable feature. Best-effort, runs in the background after startup.
        let app_for_backfill = app.clone();
        tauri::async_runtime::spawn(async move {
            crate::library::deliverable::backfill_missing(&app_for_backfill, &pool_for_backfill).await;
        });

        Ok(())
    }
}

/// Remove stale `heirvo_trans_*.wav` files from the temp dir on startup.
/// These are left behind when transcription crashes mid-flight (or the user
/// kills the app). At ~115 MB per hour of audio they pile up fast on a
/// commercial workload.
fn sweep_stale_temp_wavs() {
    let temp = std::env::temp_dir();
    let entries = match std::fs::read_dir(&temp) {
        Ok(e) => e,
        Err(_) => return,
    };
    let mut count = 0;
    let mut bytes = 0u64;
    for entry in entries.flatten() {
        let name = entry.file_name();
        let name_str = name.to_string_lossy();
        let is_stale = (name_str.starts_with("heirvo_trans_")
            || name_str.starts_with("heirvo_chunk_"))
            && name_str.ends_with(".wav");
        if is_stale {
            if let Ok(meta) = entry.metadata() {
                bytes += meta.len();
            }
            if std::fs::remove_file(entry.path()).is_ok() {
                count += 1;
            }
        }
    }
    if count > 0 {
        tracing::info!(
            "Swept {} stale transcription temp file(s), reclaimed {:.1} MB",
            count,
            bytes as f64 / 1_048_576.0
        );
    }
}

/// Drive watcher.
///
/// Polls every second and emits `drives:changed` when the set of optical
/// drives or any `has_media` flag changes. Uses `IOCTL_STORAGE_CHECK_VERIFY`
/// (which doesn't spin the drive) so 1Hz polling is fine even on bus-powered
/// USB drives.
///
/// ## SCSI INQUIRY caching
///
/// INQUIRY data (vendor / model / firmware) is static for the lifetime of a
/// drive connection. Re-issuing it every tick wastes the SCSI bus and competes
/// with an active recovery scan. This watcher maintains a `HashMap<String,
/// DriveInfo>` keyed by drive path:
///
/// - **Steady-state tick**: calls `enumerate_optical_drive_states()` (cheap —
///   only `GetDriveTypeW` + `IOCTL_STORAGE_CHECK_VERIFY`, zero SCSI bus
///   traffic), then patches each cached entry's `has_media` flag in place.
/// - **New drive**: runs `inquiry_single_drive()` once and inserts into cache.
/// - **Disconnected drive**: removed from cache immediately. If the same letter
///   reappears later it is treated as new and re-INQUIRY'd (safe: reconnected
///   drives may have different media or even be a different physical unit).
///
/// Net result: steady-state ticks issue **zero** SCSI INQUIRY commands.
///
/// **Future optimization:** register for `WM_DEVICECHANGE` messages via a
/// hidden message-only window on a dedicated thread. That'd give us
/// near-instant detection instead of 1s lag. Skipped for v1 because polling
/// is robust, simple, and adds no Win32 attack surface — the latency
/// difference is imperceptible during the few drive-plug events per session.
async fn run_drive_watcher(app: AppHandle) {
    use crate::disc::drive::DriveCapabilities;
    use crate::disc::scsi_windows::{enumerate_optical_drive_states, inquiry_single_drive};

    // Cache: drive path → fully-probed DriveInfo (vendor/model/firmware filled in).
    let mut cache: HashMap<String, DriveInfo> = HashMap::new();
    // Hysteresis for the media-present flag. Optical drives spin DOWN when idle,
    // and on this transition IOCTL_STORAGE_CHECK_VERIFY momentarily reports
    // "not ready" — which looks identical to an ejected disc. Without debounce
    // this makes `has_media` flap true→false every idle cycle (~60-90s), which
    // tears down and re-identifies the disc in the UI on a loop. We only believe
    // the disc is GONE after it's reported absent for this many consecutive
    // ticks; a brief spin-down blip never crosses the threshold, a real ejection
    // does (within a few seconds).
    const MEDIA_ABSENT_TICKS: u8 = 6;
    let mut media_absent_ticks: HashMap<String, u8> = HashMap::new();
    // Last emitted snapshot, for change detection.
    let mut last: Vec<DriveInfo> = Vec::new();

    let mut interval = tokio::time::interval(Duration::from_secs(1));
    interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
    // First tick fires immediately, so consume it.
    interval.tick().await;

    loop {
        interval.tick().await;

        // ── Cheap tick: list drive letters + media-present flags, no INQUIRY. ──
        let states =
            match tokio::task::spawn_blocking(enumerate_optical_drive_states).await {
                Ok(Ok(s)) => s,
                _ => continue,
            };

        // Build the set of paths seen this tick.
        let seen_paths: std::collections::HashSet<String> =
            states.iter().map(|s| s.path.clone()).collect();

        // ── Evict drives that disappeared. ──────────────────────────────────
        // Done *before* insertion so a rapid disconnect-reconnect on the same
        // letter triggers a fresh INQUIRY (the new physical unit may differ).
        cache.retain(|path, _| seen_paths.contains(path));
        media_absent_ticks.retain(|path, _| seen_paths.contains(path));

        // ── For each currently-present drive: insert new or update media flag. ─
        for state in &states {
            if let Some(entry) = cache.get_mut(&state.path) {
                // Known drive — refresh the media flag with spin-down hysteresis.
                if state.has_media {
                    // Present (and ready) — clear any pending absence.
                    entry.has_media = true;
                    media_absent_ticks.remove(&state.path);
                } else if entry.has_media {
                    // Was present, now reporting absent. Could be a transient
                    // spin-down rather than a real ejection — count consecutive
                    // misses and only flip to "gone" once we're confident.
                    let n = media_absent_ticks.entry(state.path.clone()).or_insert(0);
                    *n = n.saturating_add(1);
                    if *n >= MEDIA_ABSENT_TICKS {
                        entry.has_media = false;
                        media_absent_ticks.remove(&state.path);
                    }
                    // else: keep has_media = true (debounced).
                }
                // (already absent & still absent → nothing to do)
            } else {
                // New drive — run INQUIRY once, then cache.
                tracing::debug!(
                    "New optical drive detected at {} — running INQUIRY",
                    state.path
                );
                let path_clone = state.path.clone();
                let (vendor, model, firmware) =
                    tokio::task::spawn_blocking(move || inquiry_single_drive(&path_clone))
                        .await
                        .unwrap_or_else(|_| {
                            ("Unknown".into(), "Unknown".into(), "Unknown".into())
                        });
                tracing::info!(
                    "Drive {} identified: vendor={:?} model={:?} firmware={:?}",
                    state.path, vendor, model, firmware
                );
                cache.insert(
                    state.path.clone(),
                    DriveInfo {
                        path: state.path.clone(),
                        letter: state.letter.clone(),
                        vendor,
                        model,
                        firmware,
                        capabilities: DriveCapabilities {
                            reads_dvd: true,
                            reads_cd: true,
                            reads_bluray: false,
                            supports_speed_control: true,
                        },
                        has_media: state.has_media,
                    },
                );
            }
        }

        // ── Build the current snapshot in a stable order. ───────────────────
        // Sort by path so the Vec ordering is deterministic; the frontend
        // relies on stable order for list rendering.
        let mut drives: Vec<DriveInfo> = cache.values().cloned().collect();
        drives.sort_by(|a, b| a.path.cmp(&b.path));

        // ── Emit only when something actually changed. ───────────────────────
        if drives != last {
            tracing::debug!(
                "drives:changed: {} drive(s), {} with media",
                drives.len(),
                drives.iter().filter(|d| d.has_media).count()
            );
            let _ = app.emit("drives:changed", &drives);
            last = drives;
        }
    }
}
