//! Drive enumeration and disc identification commands.

use crate::disc::drive::{DiscInfo, DiscProfile, DiscType, DriveAssessment, DriveInfo};
use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};

/// Combined Recovery Plan briefing returned by `probe_disc_profile`.
/// The frontend renders this as the "what we're about to do" panel before
/// the user clicks Start Scan.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryPlanBriefing {
    pub disc: DiscProfile,
    pub drive_assessment: DriveAssessment,
}

#[tauri::command]
pub async fn probe_disc_profile(drive_path: String) -> AppResult<Option<RecoveryPlanBriefing>> {
    tokio::task::spawn_blocking(move || -> AppResult<Option<RecoveryPlanBriefing>> {
        #[cfg(windows)]
        {
            let disc = match crate::disc::scsi_windows::probe_disc_profile(&drive_path) {
                Ok(p) => p,
                Err(e) => {
                    tracing::warn!("probe_disc_profile failed for {drive_path}: {e}");
                    return Ok(None);
                }
            };
            let drive_assessment =
                crate::disc::drive_quality::assess_drive(&disc.vendor, &disc.model);
            tracing::info!(
                "Recovery briefing — drive: {} {} ({:?}), disc: {} status={:?} sessions={}",
                disc.vendor, disc.model, drive_assessment.quality,
                disc.profile_name, disc.disc_status, disc.num_sessions,
            );
            Ok(Some(RecoveryPlanBriefing { disc, drive_assessment }))
        }
        #[cfg(not(windows))]
        {
            let _ = drive_path;
            Ok(None)
        }
    })
    .await
    .map_err(|e| AppError::Internal(format!("join: {e}")))?
}

#[tauri::command]
pub async fn list_drives() -> AppResult<Vec<DriveInfo>> {
    tokio::task::spawn_blocking(crate::disc::drive::list_drives)
        .await
        .map_err(|e| AppError::Internal(format!("join: {e}")))?
        .map_err(AppError::from)
}

#[tauri::command]
pub async fn check_disc(drive_path: String) -> AppResult<Option<DiscInfo>> {
    tokio::task::spawn_blocking(move || -> AppResult<Option<DiscInfo>> {
        #[cfg(windows)]
        {
            use crate::disc::scsi_windows::ScsiSectorReader;
            use crate::disc::sector::{ReadOptions, SectorReader};

            // Identification must be FAST-FAIL. A marginal/scratched older disc
            // makes every SCSI read grind through retries (the green drive light
            // is the firmware re-reading bad sectors), and the default read
            // options (retries:1, 30 s timeout) let a single read block ~60 s.
            // Chained across the PVD spin-up loop + the directory walk that was
            // enough to wedge the "Found a disc. Taking a look…" screen forever.
            //
            // The probe only needs CLEAN structural sectors (PVD + root dir),
            // which on a readable disc come back in milliseconds. If they don't,
            // we degrade to a capacity-based classification and let the recovery
            // engine — which owns the real retry budget — do the heavy lifting.
            let probe_opts = ReadOptions { retries: 0, slow_mode: false, timeout_ms: 4_000 };
            // Hard wall-clock budget for the whole identification. Past this we
            // return our best-effort guess rather than keep the user staring at
            // a spinner. Frontend has its own longer timeout as a final net.
            let probe_started = std::time::Instant::now();
            let probe_budget = std::time::Duration::from_secs(20);

            let reader = match ScsiSectorReader::open(&drive_path) {
                Ok(r) => r,
                Err(e) => {
                    tracing::warn!("check_disc: failed to OPEN drive {drive_path}: {e}");
                    return Ok(None);
                }
            };
            tracing::info!("check_disc: drive opened, reading PVD (sector 16)…");

            // Read sector 16 = ISO 9660 primary volume descriptor.
            // An optical drive that has been idle spins DOWN, and the first read
            // after that returns nothing while it spins back up ("becoming
            // ready"). Identifying the disc the instant media is detected can
            // therefore land in that spin-up window and wrongly look "unreadable".
            // Retry the PVD read a few times with a short delay so a perfectly
            // good disc gets the second or two it needs to come ready.
            let mut result = reader.read_sector(16, probe_opts);
            let mut spinups = 0;
            while result.data.is_none()
                && spinups < 6
                && probe_started.elapsed() < probe_budget
            {
                tracing::info!(
                    "check_disc: PVD read attempt {} returned no data (error: {:?}); retrying after spin-up delay",
                    spinups + 1,
                    result.error
                );
                std::thread::sleep(std::time::Duration::from_millis(800));
                result = reader.read_sector(16, probe_opts);
                spinups += 1;
            }
            tracing::info!(
                "check_disc: PVD read done after {} retr{} — data: {} bytes, error: {:?}",
                spinups,
                if spinups == 1 { "y" } else { "ies" },
                result.data.as_ref().map(|d| d.len()).unwrap_or(0),
                result.error
            );
            let total_capacity = reader.capacity();
            let has_iso_pvd = result
                .data
                .as_ref()
                .map(|d| d.len() >= 6 && &d[1..6] == b"CD001")
                .unwrap_or(false);

            // Audio CD detection: no ISO 9660 filesystem AND CD-sized capacity.
            // We attempt a READ TOC; if it succeeds with at least one track,
            // we treat the disc as a CD-DA. (READ TOC is also valid on data
            // CDs, but those are caught by the ISO PVD check above.)
            if !has_iso_pvd && total_capacity > 0 && total_capacity < 600_000 {
                if let Ok(toc) = crate::disc::audio_cd::read_toc(&drive_path) {
                    if !toc.tracks.is_empty() {
                        let last_end = toc.tracks.last().map(|t| t.end_lba as u64)
                            .unwrap_or(toc.lead_out_lba as u64);
                        return Ok(Some(DiscInfo {
                            disc_type: DiscType::AudioCd,
                            label: "Audio CD".into(),
                            total_sectors: last_end,
                            sector_size: crate::disc::audio_cd::CDDA_SECTOR_BYTES as u32,
                            fingerprint: format!(
                                "audio-cd:{}-{}",
                                toc.tracks.len(),
                                last_end
                            ),
                            has_video_ts: false,
                            has_audio_ts: false,
                        }));
                    }
                }
            }

            let Some(data) = result.data else {
                return Ok(Some(DiscInfo {
                    disc_type: DiscType::Unknown,
                    label: "(unreadable)".into(),
                    total_sectors: reader.capacity(),
                    sector_size: reader.sector_size(),
                    fingerprint: String::new(),
                    has_video_ts: false,
                    has_audio_ts: false,
                }));
            };

            // ISO 9660 PVD: bytes [40..72] = volume identifier, padded with spaces.
            let label = if data.len() >= 72 && data[1..6] == *b"CD001" {
                String::from_utf8_lossy(&data[40..72]).trim().to_string()
            } else {
                "(unknown filesystem)".into()
            };

            let fingerprint = crate::session::manager::fingerprint_disc(&data, reader.capacity());
            let total = reader.capacity();

            // Walk the root directory to detect VIDEO_TS / AUDIO_TS folders.
            // Skip entirely if we've already burned the probe budget on a slow
            // disc — classification by capacity (below) is a fine fallback, and
            // the recovery engine's VOB/VIDEO_TS scan repairs the type later.
            let (has_video_ts, has_audio_ts) = if probe_started.elapsed() >= probe_budget {
                tracing::warn!(
                    "check_disc: probe budget exhausted before directory walk; classifying by capacity"
                );
                (false, false)
            } else {
                match crate::dvd::iso9660::read_volume_with(&reader, probe_opts) {
                    Ok(vol) => match crate::dvd::iso9660::read_directory_with(
                        &reader, vol.root_lba, vol.root_size, "/", probe_opts,
                    ) {
                        Ok(root) => {
                            let video = root.entries.iter().any(|e| {
                                e.is_dir && e.name.eq_ignore_ascii_case("VIDEO_TS")
                            });
                            let audio = root.entries.iter().any(|e| {
                                e.is_dir && e.name.eq_ignore_ascii_case("AUDIO_TS")
                            });
                            (video, audio)
                        }
                        Err(_) => (false, false),
                    },
                    Err(_) => (false, false),
                }
            };

            let disc_type = if has_video_ts {
                DiscType::DvdVideo
            } else if has_audio_ts {
                DiscType::DvdAudio
            } else if total > 600_000 {
                DiscType::DvdRom
            } else {
                DiscType::Cd
            };

            tracing::info!(
                "check_disc: identification complete in {}ms — type={:?} label={:?} video_ts={} audio_ts={}; returning to UI",
                probe_started.elapsed().as_millis(),
                disc_type,
                label,
                has_video_ts,
                has_audio_ts
            );

            Ok(Some(DiscInfo {
                disc_type,
                label,
                total_sectors: total,
                sector_size: reader.sector_size(),
                fingerprint,
                has_video_ts,
                has_audio_ts,
            }))
        }
        #[cfg(not(windows))]
        {
            let _ = drive_path;
            Ok(None)
        }
    })
    .await
    .map_err(|e| AppError::Internal(format!("join: {e}")))?
}
