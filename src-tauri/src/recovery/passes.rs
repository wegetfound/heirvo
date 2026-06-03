//! Multi-pass recovery strategies.
//!
//! Each pass walks the sector map and acts on sectors in specific states:
//! - Triage: read every Unknown sector once, fast.
//! - SlowRead: revisit Failed sectors at reduced speed with more retries.
//! - Reverse: read Failed sectors in reverse order (some drives handle this better).
//! - ThermalPause: long pause + retry the worst remaining sectors.
//! - ZeroFill: mark remaining Failed sectors as Skipped, fill with zeros at output time.
//!
//! # Recovery modes
//!
//! **Quick** (default): ddrescue-style — grab all healthy media fast (Triage with
//! skip-ahead), then one cheap SlowRead to catch marginal sectors, then stop.
//! No thermal grinding. Designed to complete in minutes to a few hours.
//!
//! **Overnight**: patient retry phase for the remaining holes. The engine loops
//! `pass_plan(Overnight)` until a full cycle recovers 0 new Good sectors, or
//! [`OVERNIGHT_MAX_CYCLES`] is hit. One cycle = Reverse → ThermalPause → SlowRead
//! → ThermalPause. Works ONLY on marginal sectors — it cannot recover physically
//! destroyed data.

use crate::disc::sector::ReadOptions;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum PassStrategy {
    Triage,
    SlowRead,
    Reverse,
    ThermalPause,
    ZeroFill,
}

impl PassStrategy {
    pub fn name(&self) -> &'static str {
        match self {
            PassStrategy::Triage => "Fast Triage",
            PassStrategy::SlowRead => "Slow Read",
            PassStrategy::Reverse => "Reverse Read",
            PassStrategy::ThermalPause => "Thermal Pause",
            PassStrategy::ZeroFill => "Zero Fill",
        }
    }

    pub fn read_options(&self) -> ReadOptions {
        match self {
            // Triage races through healthy media. Tight timeout: if a 128KB block
            // can't be read in 5s, skip the region and let SlowRead deal with it.
            PassStrategy::Triage => ReadOptions { retries: 0, slow_mode: false, timeout_ms: 5_000 },
            // SlowRead/Reverse cycle through the failed-sector queue at a brisk
            // pace — short retry budget so the user sees the queue *moving*. The
            // exhaustive retry happens in ThermalPause after the disc has cooled.
            // (Old defaults of 4 retries × 60s = 4 minutes per failed sector
            // meant a 50k-sector failed queue took ~140 hours to grind through.)
            PassStrategy::SlowRead => ReadOptions { retries: 1, slow_mode: true, timeout_ms: 12_000 },
            PassStrategy::Reverse => ReadOptions { retries: 1, slow_mode: true, timeout_ms: 12_000 },
            // ThermalPause is the patient final pass — bigger retry budget here.
            PassStrategy::ThermalPause => {
                ReadOptions { retries: 4, slow_mode: true, timeout_ms: 60_000 }
            }
            PassStrategy::ZeroFill => ReadOptions::default(),
        }
    }

    /// Pause between sector reads (helps drive cool, lets head settle).
    pub fn inter_sector_delay_ms(&self) -> u64 {
        match self {
            PassStrategy::Triage => 0,
            PassStrategy::SlowRead => 100,
            PassStrategy::Reverse => 100,
            PassStrategy::ThermalPause => 500,
            PassStrategy::ZeroFill => 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryPass {
    pub number: u8,
    pub strategy: PassStrategy,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub sectors_recovered: u64,
    pub sectors_failed: u64,
}

/// Hard backstop on Overnight cycles. The engine loops `pass_plan(Overnight)`
/// until a full cycle recovers 0 new Good sectors OR this limit is hit,
/// whichever comes first. Prevents infinite grinding on a disc that will never
/// yield more data.
pub const OVERNIGHT_MAX_CYCLES: u32 = 12;

/// User-facing recovery mode. Controls pass plan and per-sector pacing.
///
/// **Quick** (default): ddrescue-style — fast block triage grabs all readable
/// data, then one SlowRead pass catches marginal sectors, then stops.
/// Best for most discs; completes in minutes to a few hours.
///
/// **Overnight**: patient retry phase for the remaining holes. Intended to run
/// unattended for many hours. The engine loops the plan returned by
/// `pass_plan(Overnight)` until convergence or [`OVERNIGHT_MAX_CYCLES`] is hit.
/// Uses Reverse approach + ThermalPause cool-downs + a 2 s inter-sector floor
/// to keep bus-powered USB drives alive. Note: recovers MARGINAL sectors only —
/// it cannot recover physically destroyed data.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum RecoveryMode {
    /// Fast "get the easy data" pass. Completes quickly; use first.
    #[default]
    Quick,
    /// Patient retry phase for remaining holes. Engine loops this plan until
    /// convergence or [`OVERNIGHT_MAX_CYCLES`] is reached.
    Overnight,
}

impl RecoveryMode {
    /// Minimum pause between sector reads in this mode. The effective delay is
    /// `max(mode.delay_floor_ms(), strategy.inter_sector_delay_ms())`.
    pub fn delay_floor_ms(&self) -> u64 {
        match self {
            RecoveryMode::Quick => 0,
            // 2 seconds between reads — gives a bus-powered USB drive time
            // to recover power before the next IOCTL. Empirically this is
            // the threshold below which cheap drives keep browning out on
            // home-burned DVDs during multi-hour unattended runs.
            RecoveryMode::Overnight => 2_000,
        }
    }
}

/// Pass plan keyed to recovery mode.
///
/// For `Overnight`, call this once per cycle. The engine is responsible for
/// looping until 0 new Good sectors are recovered or [`OVERNIGHT_MAX_CYCLES`]
/// is hit.
pub fn pass_plan(mode: RecoveryMode) -> Vec<PassStrategy> {
    match mode {
        // Quick: block triage sweeps healthy media fast, then one SlowRead
        // pass catches marginal sectors. Stop there — no thermal grinding.
        RecoveryMode::Quick => vec![PassStrategy::Triage, PassStrategy::SlowRead],
        // Overnight one cycle: reverse approach (some drives handle this
        // better), thermal cool-down, slow retry, another cool-down before
        // the engine decides whether to loop again.
        RecoveryMode::Overnight => vec![
            PassStrategy::Reverse,
            PassStrategy::ThermalPause,
            PassStrategy::SlowRead,
            PassStrategy::ThermalPause,
        ],
    }
}

/// Default pass plan for a fresh recovery. Delegates to `Quick` mode.
///
/// Kept for backwards compatibility with engine tests that call this directly.
pub fn default_pass_plan() -> Vec<PassStrategy> {
    pass_plan(RecoveryMode::Quick)
}
