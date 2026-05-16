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
    let output_dir = std::path::PathBuf::from(&session.output_dir).join("VIDEO_TS");

    let extracted = tokio::task::spawn_blocking(move || -> AppResult<_> {
        #[cfg(windows)]
        {
            use crate::disc::scsi_windows::ScsiSectorReader;
            let reader = ScsiSectorReader::open(&drive_path)
                .map_err(|e| AppError::Drive(format!("open: {e}")))?;
            let all = crate::dvd::iso9660::list_video_ts(&reader)
                .map_err(|e| AppError::DvdStructure(format!("list_video_ts: {e}")))?
                .ok_or_else(|| AppError::DvdStructure("no VIDEO_TS folder".into()))?;
            let selected: Vec<_> = if file_names.is_empty() {
                all
            } else {
                all.into_iter().filter(|e| file_names.iter().any(|n| n.eq_ignore_ascii_case(&e.name))).collect()
            };
            crate::media::vob::extract_files(&reader, map.as_ref(), &selected, &output_dir)
                .map_err(|e| AppError::Media(format!("extract_files: {e}")))
        }
        #[cfg(not(windows))]
        {
            let _ = (drive_path, output_dir, file_names, map);
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
    let output_dir = std::path::PathBuf::from(&session.output_dir).join("Recovered Files");

    let extracted = tokio::task::spawn_blocking(move || -> AppResult<_> {
        #[cfg(windows)]
        {
            use crate::disc::scsi_windows::ScsiSectorReader;
            let reader = ScsiSectorReader::open(&drive_path)
                .map_err(|e| AppError::Drive(format!("open: {e}")))?;
            let all = crate::dvd::iso9660::walk_all_files(&reader)
                .map_err(|e| AppError::DvdStructure(format!("walk_all_files: {e}")))?;
            crate::media::vob::extract_files(&reader, map.as_ref(), &all, &output_dir)
                .map_err(|e| AppError::Media(format!("extract_files: {e}")))
        }
        #[cfg(not(windows))]
        {
            let _ = (drive_path, output_dir, map);
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

/// Open a local `.iso` file and list every file inside via the UDF parser
/// (with ISO 9660 fallback). Use case: a user already has a disc image
/// (their own ddrescue dump, a friend's rip, an archive download) and wants
/// to browse / save individual files without involving a physical drive.
///
/// Returns whether the UDF parser succeeded so the UI can flag ISO-9660-only
/// images differently from full UDF volumes.
#[tauri::command]
pub async fn list_files_in_iso(iso_path: String) -> AppResult<IsoBrowseResult> {
    tokio::task::spawn_blocking(move || -> AppResult<IsoBrowseResult> {
        use crate::disc::iso_file::IsoFileSectorReader;
        use crate::disc::sector::SectorReader;
        use std::path::Path;

        let path = Path::new(&iso_path);
        if !path.exists() {
            return Err(AppError::Internal(format!("ISO not found: {iso_path}")));
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
