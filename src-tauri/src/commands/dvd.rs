//! DVD structure analysis commands.

use crate::dvd::iso9660::IsoEntry;
use crate::error::{AppError, AppResult};
use crate::session::manager;
use crate::state::AppState;
use serde::Serialize;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct StructureSummary {
    pub volume_label: String,
    pub video_ts_files: Vec<IsoEntry>,
}

#[tauri::command]
pub async fn analyze_structure(
    state: State<'_, AppState>,
    session_id: String,
) -> AppResult<StructureSummary> {
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;
    let session = manager::get(&state.db, id).await?;

    let drive_path = session.drive_path.clone();
    let result = tokio::task::spawn_blocking(move || -> AppResult<StructureSummary> {
        #[cfg(windows)]
        {
            use crate::disc::scsi_windows::ScsiSectorReader;
            let reader = ScsiSectorReader::open(&drive_path)
                .map_err(|e| AppError::Drive(format!("open: {e}")))?;
            let vol = crate::dvd::iso9660::read_volume(&reader)
                .map_err(|e| AppError::DvdStructure(format!("read_volume: {e}")))?;
            let files = crate::dvd::iso9660::list_video_ts(&reader)
                .map_err(|e| AppError::DvdStructure(format!("list_video_ts: {e}")))?
                .unwrap_or_default();
            Ok(StructureSummary { volume_label: vol.label, video_ts_files: files })
        }
        #[cfg(not(windows))]
        {
            let _ = drive_path;
            Err(AppError::NotImplemented("analyze_structure (non-Windows)"))
        }
    })
    .await
    .map_err(|e| AppError::Internal(format!("join: {e}")))??;

    Ok(result)
}

/// Return the REAL total runtime of a DVD's titles, in seconds, read from the
/// DVD IFO files — or `None` if it can't be determined.
///
/// This replaces the wildly inaccurate sector-count → minutes estimate for the
/// "we saved N minutes of video" UI. That estimate assumed a fixed ~5 Mbps
/// bitrate, but DVD video is variable (3–9.8 Mbps), so a disc that's physically
/// near-full of ~9 Mbps video reads as roughly double its true runtime (e.g. a
/// 60-minute disc shown as ~116 minutes).
///
/// The IFO stores the exact playback time (BCD-encoded) per title PGC — the same
/// number a DVD player's counter shows. We extract just the small IFO files from
/// the disc (a few KB each), parse them, and sum the DISTINCT titles (deduped by
/// start sector + duration so multi-angle / duplicate title entries don't
/// double-count).
#[tauri::command]
pub async fn dvd_runtime_secs(
    state: State<'_, AppState>,
    session_id: String,
) -> AppResult<Option<u32>> {
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;
    let session = manager::get(&state.db, id).await?;
    let map = manager::load_sector_map(&state.db, id).await?;
    let drive_path = session.drive_path.clone();
    let video_ts_dir = std::path::PathBuf::from(&session.output_dir).join("VIDEO_TS");

    tokio::task::spawn_blocking(move || -> AppResult<Option<u32>> {
        #[cfg(windows)]
        {
            use crate::disc::scsi_windows::ScsiSectorReader;

            // If the IFOs were already extracted (e.g. after Save as MP4), parse
            // them directly. Otherwise pull just the .IFO/.BUP files off the disc.
            let have_ifos = std::fs::read_dir(&video_ts_dir)
                .map(|rd| {
                    rd.filter_map(|e| e.ok()).any(|e| {
                        e.file_name()
                            .to_string_lossy()
                            .to_ascii_uppercase()
                            .ends_with(".IFO")
                    })
                })
                .unwrap_or(false);

            if !have_ifos {
                let reader = ScsiSectorReader::open(&drive_path)
                    .map_err(|e| AppError::Drive(format!("open: {e}")))?;
                let all = crate::dvd::iso9660::list_video_ts(&reader)
                    .map_err(|e| AppError::DvdStructure(format!("list_video_ts: {e}")))?
                    .unwrap_or_default();
                // IFO + BUP only — tiny metadata files, not the multi-GB VOBs.
                let ifos: Vec<_> = all
                    .into_iter()
                    .filter(|e| {
                        let n = e.name.to_ascii_uppercase();
                        n.ends_with(".IFO") || n.ends_with(".BUP")
                    })
                    .collect();
                if ifos.is_empty() {
                    return Ok(None);
                }
                crate::media::vob::extract_files(&reader, map.as_ref(), &ifos, &video_ts_dir)
                    .map_err(|e| AppError::Media(format!("extract IFOs: {e}")))?;
            }

            let structure = match crate::dvd::ifo::parse_video_ts_dir(&video_ts_dir) {
                Ok(s) => s,
                Err(e) => {
                    tracing::warn!("dvd_runtime_secs: parse_video_ts_dir failed: {e}");
                    return Ok(None);
                }
            };

            // Dedupe titles that point at the same content (angles / duplicate
            // PGC references) before summing, so we don't overcount.
            let mut seen: std::collections::HashSet<(u64, u32)> = std::collections::HashSet::new();
            let mut total: u32 = 0;
            for t in &structure.titles {
                if t.duration_secs == 0 {
                    continue;
                }
                if seen.insert((t.start_sector, t.duration_secs)) {
                    total = total.saturating_add(t.duration_secs);
                }
            }
            if total == 0 {
                Ok(None)
            } else {
                tracing::info!(
                    "dvd_runtime_secs: {} distinct title(s), {} s total",
                    seen.len(),
                    total
                );
                Ok(Some(total))
            }
        }
        #[cfg(not(windows))]
        {
            let _ = (drive_path, video_ts_dir, map);
            Ok(None)
        }
    })
    .await
    .map_err(|e| AppError::Internal(format!("join: {e}")))?
}

#[tauri::command]
pub async fn extract_vobs(
    state: State<'_, AppState>,
    session_id: String,
    file_names: Vec<String>,
) -> AppResult<Vec<crate::media::vob::ExtractedFile>> {
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;
    let session = manager::get(&state.db, id).await?;
    let map = manager::load_sector_map(&state.db, id).await?;

    let drive_path = session.drive_path.clone();
    let session_output_dir = session.output_dir.clone();
    let disc_label = session.disc_label.clone();
    let output_dir = std::path::PathBuf::from(&session.output_dir).join("VIDEO_TS");

    let extracted = tokio::task::spawn_blocking(move || -> AppResult<_> {
        #[cfg(windows)]
        {
            // Prefer the local disc image written during the rescue (no disc re-read).
            let reader = crate::commands::media::open_extraction_reader(
                &session_output_dir,
                &disc_label,
                &drive_path,
            )?;
            let all = crate::dvd::iso9660::list_video_ts(reader.as_ref())
                .map_err(|e| AppError::DvdStructure(format!("list_video_ts: {e}")))?
                .ok_or_else(|| AppError::DvdStructure("no VIDEO_TS folder".into()))?;
            let selected: Vec<_> = if file_names.is_empty() {
                all
            } else {
                all.into_iter().filter(|e| file_names.iter().any(|n| n.eq_ignore_ascii_case(&e.name))).collect()
            };
            crate::media::vob::extract_files(reader.as_ref(), map.as_ref(), &selected, &output_dir)
                .map_err(|e| AppError::Media(format!("extract_files: {e}")))
        }
        #[cfg(not(windows))]
        {
            let _ = (drive_path, session_output_dir, disc_label, output_dir, file_names, map);
            Err(AppError::NotImplemented("extract_vobs (non-Windows)"))
        }
    })
    .await
    .map_err(|e| AppError::Internal(format!("join: {e}")))??;

    Ok(extracted)
}

/// Extract every file from a data disc (CD-R photo backup, document
/// archive, etc.) — recurses the full ISO 9660 tree, not just VIDEO_TS.
/// Damaged sectors are zero-filled so callers always get the file at its
/// real on-disc length, even from a wrecked disc.
#[tauri::command]
pub async fn extract_all_files(
    state: State<'_, AppState>,
    session_id: String,
) -> AppResult<Vec<crate::media::vob::ExtractedFile>> {
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;
    let session = manager::get(&state.db, id).await?;
    let map = manager::load_sector_map(&state.db, id).await?;

    let drive_path = session.drive_path.clone();
    let session_output_dir = session.output_dir.clone();
    let disc_label = session.disc_label.clone();
    let output_dir = std::path::PathBuf::from(&session.output_dir).join("Recovered Files");

    let extracted = tokio::task::spawn_blocking(move || -> AppResult<_> {
        #[cfg(windows)]
        {
            // Prefer the local disc image written during the rescue (no disc re-read).
            let reader = crate::commands::media::open_extraction_reader(
                &session_output_dir,
                &disc_label,
                &drive_path,
            )?;
            let all = crate::dvd::iso9660::walk_all_files(reader.as_ref())
                .map_err(|e| AppError::DvdStructure(format!("walk_all_files: {e}")))?;
            crate::media::vob::extract_files(reader.as_ref(), map.as_ref(), &all, &output_dir)
                .map_err(|e| AppError::Media(format!("extract_files: {e}")))
        }
        #[cfg(not(windows))]
        {
            let _ = (drive_path, session_output_dir, disc_label, output_dir, map);
            Err(AppError::NotImplemented("extract_all_files (non-Windows)"))
        }
    })
    .await
    .map_err(|e| AppError::Internal(format!("join: {e}")))??;

    Ok(extracted)
}

#[tauri::command]
pub async fn health_score(
    state: State<'_, AppState>,
    session_id: String,
) -> AppResult<crate::recovery::health::HealthReport> {
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;
    let map = manager::load_sector_map(&state.db, id)
        .await?
        .ok_or_else(|| AppError::SessionNotFound(session_id.clone()))?;
    let session = manager::get(&state.db, id).await?;

    let drive_path = session.drive_path.clone();
    let video_ts = tokio::task::spawn_blocking(move || -> Option<Vec<IsoEntry>> {
        #[cfg(windows)]
        {
            use crate::disc::scsi_windows::ScsiSectorReader;
            ScsiSectorReader::open(&drive_path)
                .ok()
                .and_then(|r| crate::dvd::iso9660::list_video_ts(&r).ok().flatten())
        }
        #[cfg(not(windows))]
        {
            let _ = drive_path;
            None
        }
    })
    .await
    .ok()
    .flatten();

    Ok(crate::recovery::health::compute(&map, video_ts.as_deref()))
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IsoBrowseResult {
    pub path: String,
    pub total_sectors: u64,
    pub file_count: usize,
    pub used_udf: bool,
    pub entries: Vec<IsoBrowseEntry>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IsoBrowseEntry {
    pub path: String,
    pub size_bytes: u64,
    pub start_lba: u64,
    pub is_damaged: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SigScanResult {
    pub hits: Vec<crate::dvd::sig_scan::SignatureHit>,
    pub damaged_sectors: u64,
    pub total_sectors: u64,
}

/// Scan a local `.iso` file for raw file-format signatures (JPEG, PNG, MP4,
/// PDF, ZIP, etc.) without relying on the filesystem directory tree.
///
/// This is the "Find Missing Files" fallback: when a disc's filesystem
/// descriptors are destroyed, raw file content sectors often survive intact.
/// Returns one hit per magic-byte occurrence — the UI groups them by type.
#[tauri::command]
pub async fn scan_iso_signatures(iso_path: String) -> AppResult<SigScanResult> {
    // Validate the renderer-supplied path before opening it.
    // 50 GB cap covers Blu-ray images; iso/img/bin are the only disc image formats.
    let safe_path = crate::util::path_safety::validate_read_path(
        &iso_path,
        &["iso", "img", "bin"],
        50 * 1024 * 1024 * 1024,
    )?;
    let iso_path = safe_path.to_string_lossy().to_string();

    tokio::task::spawn_blocking(move || -> AppResult<SigScanResult> {
        use crate::disc::iso_file::IsoFileSectorReader;
        use crate::disc::sector::SectorReader;
        use std::path::Path;

        let path = Path::new(&iso_path);
        if !path.exists() {
            return Err(AppError::Internal("Disc image not found".into()));
        }
        let reader = IsoFileSectorReader::open(path)
            .map_err(|e| AppError::Internal(format!("open {iso_path}: {e}")))?;
        let total_sectors = reader.capacity();
        tracing::info!("scan_iso_signatures: scanning {iso_path} ({total_sectors} sectors)");

        let (hits, damaged_sectors) =
            crate::dvd::sig_scan::signature_scan(&reader, |_, _| {});

        tracing::info!(
            "scan_iso_signatures: {} hits, {} damaged sectors",
            hits.len(),
            damaged_sectors
        );
        Ok(SigScanResult { hits, damaged_sectors, total_sectors })
    })
    .await
    .map_err(|e| AppError::Internal(format!("join: {e}")))?
}

/// Open a local `.iso` file and list every file inside via the UDF parser
/// (with ISO 9660 fallback). Use case: a user already has a disc image
/// (their own ddrescue dump, a friend's rip, an archive download) and wants
/// to browse / save individual files without involving a physical drive.
///
/// Returns whether the UDF parser succeeded so the UI can flag ISO-9660-only
/// images differently from full UDF volumes.
#[tauri::command]
pub async fn list_files_in_iso(iso_path: String) -> AppResult<IsoBrowseResult> {
    // Validate before opening: must exist, iso/img/bin only, no UNC.
    let safe_path = crate::util::path_safety::validate_read_path(
        &iso_path,
        &["iso", "img", "bin"],
        50 * 1024 * 1024 * 1024,
    )?;
    let iso_path = safe_path.to_string_lossy().to_string();

    tokio::task::spawn_blocking(move || -> AppResult<IsoBrowseResult> {
        use crate::disc::iso_file::IsoFileSectorReader;
        use crate::disc::sector::SectorReader;
        use std::path::Path;

        let path = Path::new(&iso_path);
        if !path.exists() {
            return Err(AppError::Internal("Disc image not found".into()));
        }
        let reader = IsoFileSectorReader::open(path)
            .map_err(|e| AppError::Internal(format!("open {iso_path}: {e}")))?;
        let total_sectors = reader.capacity();
        tracing::info!("list_files_in_iso: opened {iso_path} ({total_sectors} sectors)");

        // Try UDF first — modern (post-2005) burned discs use UDF. Fall back
        // to ISO 9660 if no UDF anchor is found.
        let (entries, used_udf) = match crate::dvd::udf::walk_udf(&reader) {
            Ok(vol) => {
                let mapped: Vec<IsoBrowseEntry> = vol.entries.into_iter()
                    .filter(|e| !e.is_dir)
                    .map(|e| IsoBrowseEntry {
                        path: e.path,
                        size_bytes: e.size_bytes,
                        start_lba: e.start_lba,
                        is_damaged: e.is_damaged,
                    })
                    .collect();
                tracing::info!(
                    "list_files_in_iso: UDF ok, label={:?}, files={}, damaged_sectors={}",
                    vol.label, mapped.len(), vol.unreadable_sectors.len()
                );
                (mapped, true)
            }
            Err(udf_err) => {
                tracing::info!("list_files_in_iso: UDF failed ({udf_err}); trying ISO 9660");
                let iso_entries = crate::dvd::iso9660::walk_all_files(&reader)
                    .map_err(|e| AppError::DvdStructure(
                        format!("neither UDF ({udf_err}) nor ISO 9660 ({e}) parsed")
                    ))?;
                let mapped: Vec<IsoBrowseEntry> = iso_entries.into_iter()
                    .filter(|e| !e.is_dir)
                    .map(|e| IsoBrowseEntry {
                        path: e.name,
                        size_bytes: e.size_bytes,
                        start_lba: e.start_lba,
                        is_damaged: false,
                    })
                    .collect();
                tracing::info!("list_files_in_iso: ISO 9660 ok, files={}", mapped.len());
                (mapped, false)
            }
        };

        let file_count = entries.len();
        Ok(IsoBrowseResult { path: iso_path, total_sectors, file_count, used_udf, entries })
    })
    .await
    .map_err(|e| AppError::Internal(format!("join: {e}")))?
}
