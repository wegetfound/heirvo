//! In-memory `SectorReader` for tests.
//!
//! Backs every read against a pre-built sector table. Lets us exercise the
//! recovery engine end-to-end without real hardware. Pair with
//! `recovery::engine::RecoveryEngine` to write integration tests for the
//! multi-pass scheduler, skip-ahead, and checkpoint logic.

use crate::disc::sector::{ReadOptions, SectorError, SectorReadResult, SectorReader, DVD_SECTOR_SIZE};

/// Per-sector behavior knob for the mock.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MockSectorBehavior {
    /// Reads succeed and return the canned bytes.
    Good,
    /// Reads always return a SectorError::MediumError (permanent physical damage).
    BadAlways,
    /// First N attempts fail with MediumError, then the sector starts succeeding.
    /// Simulates a borderline sector that recovers on a later retry pass.
    /// Attempt counting starts at 1 on the first read call.
    BadUntilAttempt(u32),
    /// Every read returns SectorError::Timeout regardless of attempt count.
    /// Simulates the hung-IOCTL case: the drive acknowledges the command but
    /// never responds (watchdog must kill it externally; the mock just returns
    /// the error immediately so tests stay fast — no real sleeping).
    AlwaysTimeout,
    /// Every read returns SectorError::Uncorrectable.
    /// Models a sector whose ECC is too corrupt to recover even with retries.
    AlwaysUncorrectable,
    /// First N attempts return SectorError::HardwareError (transient drive fault),
    /// after which reads succeed. Lets tests exercise the HardwareError branch
    /// of the engine without conflating it with MediumError.
    HardwareErrorUntilAttempt(u32),
}

#[derive(Debug)]
pub struct MockSectorReader {
    capacity: u64,
    behaviors: Vec<MockSectorBehavior>,
    /// Per-sector retry counter; bumped each time we touch the sector. Wrapped
    /// in `parking_lot::Mutex` so the trait's `&self` stays honest.
    attempts: parking_lot::Mutex<Vec<u32>>,
}

impl MockSectorReader {
    pub fn new(capacity: u64, default_behavior: MockSectorBehavior) -> Self {
        let cap = capacity as usize;
        Self {
            capacity,
            behaviors: vec![default_behavior; cap],
            attempts: parking_lot::Mutex::new(vec![0; cap]),
        }
    }

    /// Mark a single LBA with a specific behavior.
    pub fn set(&mut self, lba: u64, behavior: MockSectorBehavior) {
        self.behaviors[lba as usize] = behavior;
    }

    /// Mark a contiguous run of LBAs as bad (handy for simulating a scratch).
    pub fn set_range_bad(&mut self, start: u64, len: u64) {
        for lba in start..(start + len) {
            self.behaviors[lba as usize] = MockSectorBehavior::BadAlways;
        }
    }

    /// Mark a contiguous run of LBAs with the same behavior.
    pub fn set_range(&mut self, start: u64, len: u64, behavior: MockSectorBehavior) {
        for lba in start..(start + len) {
            self.behaviors[lba as usize] = behavior;
        }
    }

    pub fn attempts_for(&self, lba: u64) -> u32 {
        self.attempts.lock()[lba as usize]
    }
}

impl SectorReader for MockSectorReader {
    fn read_sector(&self, lba: u64, _opts: ReadOptions) -> SectorReadResult {
        if lba >= self.capacity {
            return SectorReadResult::err(lba, SectorError::IllegalRequest, 0, 0);
        }
        let idx = lba as usize;
        let attempt = {
            let mut a = self.attempts.lock();
            a[idx] += 1;
            a[idx]
        };
        match self.behaviors[idx] {
            MockSectorBehavior::Good => {
                let bytes = vec![lba as u8; DVD_SECTOR_SIZE];
                SectorReadResult::ok(lba, bytes, 1)
            }
            MockSectorBehavior::BadAlways => {
                SectorReadResult::err(lba, SectorError::MediumError, 1, 1)
            }
            MockSectorBehavior::BadUntilAttempt(n) => {
                if attempt > n {
                    let bytes = vec![lba as u8; DVD_SECTOR_SIZE];
                    SectorReadResult::ok(lba, bytes, 1)
                } else {
                    SectorReadResult::err(lba, SectorError::MediumError, 1, 1)
                }
            }
            MockSectorBehavior::AlwaysTimeout => {
                // Returns immediately — no actual sleeping. The engine's
                // watchdog is expected to handle a real Timeout; here we just
                // exercise the error-recording and map-update paths.
                SectorReadResult::err(lba, SectorError::Timeout, 0, 30_000)
            }
            MockSectorBehavior::AlwaysUncorrectable => {
                SectorReadResult::err(lba, SectorError::Uncorrectable, 0, 1)
            }
            MockSectorBehavior::HardwareErrorUntilAttempt(n) => {
                if attempt > n {
                    let bytes = vec![lba as u8; DVD_SECTOR_SIZE];
                    SectorReadResult::ok(lba, bytes, 1)
                } else {
                    SectorReadResult::err(lba, SectorError::HardwareError, 1, 1)
                }
            }
        }
    }

    fn capacity(&self) -> u64 {
        self.capacity
    }
}
