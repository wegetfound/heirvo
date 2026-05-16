//! Cross-platform drive enumeration and disc identification.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DriveInfo {
    /// Win32 device path (e.g. "\\\\.\\D:") or POSIX path.
    pub path: String,
    /// Drive letter on Windows ("D:") or empty elsewhere.
    pub letter: String,
    pub vendor: String,
    pub model: String,
    pub firmware: String,
    pub capabilities: DriveCapabilities,
    /// True if the drive currently has readable media inserted. Detected via
    /// `IOCTL_STORAGE_CHECK_VERIFY` (does not spin up the drive).
    #[serde(default)]
    pub has_media: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct DriveCapabilities {
    pub reads_dvd: bool,
    pub reads_cd: bool,
    pub reads_bluray: bool,
    pub supports_speed_control: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscInfo {
    pub disc_type: DiscType,
    pub label: String,
    pub total_sectors: u64,
    pub sector_size: u32,
    /// SHA-256 of the volume descriptor (sector 16) — used as resume fingerprint.
    pub fingerprint: String,
    pub has_video_ts: bool,
    pub has_audio_ts: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum DiscType {
    DvdVideo,
    DvdRom,
    DvdAudio,
    Cd,
    AudioCd,
    Bluray,
    Unknown,
}

/// Disc finalization state, as reported by MMC READ DISC INFORMATION.
///
/// Critical for unfinalized DVD-R recovery — cameras that died mid-burn leave
/// the disc in `Incomplete` state, and standard CDFS mounts often refuse to
/// read it even though the data sectors are intact.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DiscStatus {
    /// No data written yet — recovery won't help.
    Empty,
    /// Recorded but not finalized; sessions remain appendable. Common failure
    /// mode for camera-burned DVD-Rs where the burn was interrupted.
    Incomplete,
    /// Disc finalized; lead-out written. Normal case.
    Finalized,
    /// Reported by the drive as "other" — typically pressed/read-only media
    /// where the concept doesn't apply.
    Other,
}

/// Quality assessment of an optical drive for damaged-media recovery work.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DriveQuality {
    /// Top-tier recovery drives (Pioneer BDR-2xx, Plextor Premium, LG WH16NS40).
    Pro,
    /// Reliable desktop drives — handle moderate damage well.
    Good,
    /// Works on healthy discs, struggles on heavy damage.
    Acceptable,
    /// Slim/bus-powered USB drives — prone to disconnects under load.
    Marginal,
    /// Known-broken USB-ATAPI bridges that silently drop MMC commands.
    Avoid,
    /// Drive not in our quality database.
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriveAssessment {
    pub quality: DriveQuality,
    pub category: String,
    pub notes: String,
}

/// Complete pre-scan briefing returned by `probe_disc_profile`. Combines
/// drive identity (INQUIRY), disc identity (GET CONFIGURATION), and disc
/// state (READ DISC INFORMATION). Consumed by the UI's Recovery Plan card.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscProfile {
    pub vendor: String,
    pub model: String,
    pub firmware: String,
    pub media_present: bool,
    /// Raw MMC profile code (0x0010 = DVD-ROM, 0x0040 = BD-ROM, etc).
    pub profile_code: u16,
    pub profile_name: String,
    pub disc_status: DiscStatus,
    pub num_sessions: u16,
    pub erasable: bool,
}

#[cfg(windows)]
pub fn list_drives() -> std::io::Result<Vec<DriveInfo>> {
    crate::disc::scsi_windows::enumerate_optical_drives()
}

#[cfg(not(windows))]
pub fn list_drives() -> std::io::Result<Vec<DriveInfo>> {
    Ok(Vec::new())
}
