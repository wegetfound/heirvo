//! Recovery control commands.

use crate::error::{AppError, AppResult};
use crate::recovery::engine::RecoveryEngine;
use crate::recovery::passes::{pass_plan, RecoveryMode};
use crate::session::manager::{self, SessionStatus};
use crate::state::AppState;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::mpsc;
use uuid::Uuid;

#[tauri::command]
pub async fn start_recovery(
    app: AppHandle,
    state: State<'_, AppState>,
    session_id: String,
    mode: Option<RecoveryMode>,
) -> AppResult<()> {
    let mode = mode.unwrap_or_default();
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;

    if state.engines.read().contains_key(&id) {
        return Err(AppError::RecoveryInProgress(session_id));
    }

    let session = manager::get(&state.db, id).await?;
    tracing::info!("start_recovery: opening drive {}", session.drive_path);

    // Change 2: flip status to Recovering NOW, before the slow drive-open
    // window.  This prevents the "Clear empty attempts" prune (which only
    // selects status = 'created') from deleting the session row while we are
    // still opening the drive.
    manager::update_status(&state.db, id, SessionStatus::Recovering).await?;

    #[cfg(windows)]
    let reader: Arc<dyn crate::disc::sector::SectorReader> = {
        use crate::disc::scsi_windows::{CdSectorReader, ScsiSectorReader};
        use crate::disc::sector::SectorReader;

        // Probe the disc type so we can choose the right reader.
        // If the probe fails (e.g. no disc), fall back to ScsiSectorReader
        // (READ_10 path) — the engine will handle the resulting errors gracefully.
        let use_cd_reader = crate::disc::scsi_windows::probe_disc_profile(&session.drive_path)
            .ok()
            .map(|p| p.use_read_cd())
            .unwrap_or(false);

        let (reader, capacity) = if use_cd_reader {
            tracing::info!("start_recovery: CD profile detected, using CdSectorReader (READ CD 0xBE)");
            let r = match CdSectorReader::open(&session.drive_path) {
                Ok(r) => r,
                Err(e) => {
                    // Change 3: revert status before returning — no engine registered yet.
                    let _ = manager::update_status(&state.db, id, SessionStatus::Paused).await;
                    return Err(AppError::Drive(format!("open CD {}: {e}", session.drive_path)));
                }
            };
            let cap = r.capacity();
            (Arc::new(r) as Arc<dyn SectorReader>, cap)
        } else {
            tracing::info!("start_recovery: DVD/BD/unknown profile, using ScsiSectorReader (READ_10)");
            let r = match ScsiSectorReader::open(&session.drive_path) {
                Ok(r) => r,
                Err(e) => {
                    // Change 3: revert status before returning — no engine registered yet.
                    let _ = manager::update_status(&state.db, id, SessionStatus::Paused).await;
                    return Err(AppError::Drive(format!("open {}: {e}", session.drive_path)));
                }
            };
            let cap = r.capacity();
            (Arc::new(r) as Arc<dyn SectorReader>, cap)
        };
        tracing::info!("start_recovery: drive open ok, capacity {capacity} sectors");
        reader
    };

    #[cfg(not(windows))]
    let reader: Arc<dyn crate::disc::sector::SectorReader> = {
        let _ = session;
        // Change 3: revert status — no engine registered yet.
        let _ = manager::update_status(&state.db, id, SessionStatus::Paused).await;
        return Err(AppError::NotImplemented("non-Windows recovery"));
    };

    let (tx, mut rx) = mpsc::unbounded_channel();
    let (ckpt_tx, mut ckpt_rx) = mpsc::unbounded_channel();
    let (rcpt_tx, mut rcpt_rx) = mpsc::unbounded_channel();
    tracing::info!("start_recovery: mode={:?}", mode);

    // Capture geometry before `reader` is moved into the engine, then open the
    // disc-image sink. We write the image AS we read so the disc is read exactly
    // once and every output derives from the local image. Best-effort: if the
    // image can't be opened (e.g. no room on the destination), recovery still
    // runs and outputs fall back to re-reading the disc.
    let total_sectors = reader.capacity();
    let sector_size = reader.sector_size();
    let image_sink = {
        let path = crate::recovery::image_sink::disc_image_path(
            &session.output_dir,
            &session.disc_label,
        );
        match crate::recovery::image_sink::ImageSink::create(&path, total_sectors, sector_size) {
            Ok(s) => {
                tracing::info!("start_recovery: writing disc image to {}", path.display());
                Some(s)
            }
            Err(e) => {
                tracing::warn!(
                    "start_recovery: could not open disc image ({e}); outputs will re-read the disc"
                );
                None
            }
        }
    };

    let mut builder = RecoveryEngine::new(id, reader, pass_plan(mode))
        .with_mode(mode)
        .with_progress_channel(tx)
        .with_checkpoint_channel(ckpt_tx)
        .with_receipt_channel(rcpt_tx);
    if let Some(sink) = image_sink {
        builder = builder.with_image_sink(sink);
    }
    let engine = Arc::new(builder);

    // Wire the engine's cancellation flag into the reader so that the SCSI
    // disconnect/reopen retry sleep (3 s per attempt) becomes interruptible.
    // `set_cancel_flag` is a no-op on mock/ISO readers; only ScsiSectorReader
    // and CdSectorReader actually check it.
    // We access the reader through the engine (which holds Arc<dyn SectorReader>)
    // rather than the local `reader` variable (already moved into the engine).
    engine.reader().set_cancel_flag(engine.cancel_arc());

    // Restore prior sector map if present (resume).
    match manager::load_sector_map(&state.db, id).await {
        Ok(Some(map)) => {
            tracing::info!("start_recovery: restored sector map ({} sectors)", map.total());
            engine.restore_map(map);
        }
        Ok(None) => {
            tracing::info!("start_recovery: no prior sector map, starting fresh");
        }
        Err(e) => {
            // Change 3: revert status before returning — no engine registered yet.
            let _ = manager::update_status(&state.db, id, SessionStatus::Paused).await;
            return Err(e);
        }
    }

    state.engines.write().insert(id, engine.clone());
    tracing::info!("start_recovery: engine registered, spawning blocking task");
    manager::update_status(&state.db, id, SessionStatus::Recovering).await?;

    // Spawn the recovery task.
    let engine_for_task = engine.clone();
    let db = state.db.clone();
    let app_for_save = app.clone();
    let engines_for_task = state.engines.clone();
    tokio::task::spawn_blocking(move || {
        tracing::info!("recovery task: entering engine.run()");
        let final_state = engine_for_task.run();
        tracing::info!("recovery task: engine.run() returned {:?}", final_state);
        // Persist final sector map.
        let map = engine_for_task.snapshot_map();
        let id = engine_for_task.session_id;
        // Deregister the engine the moment the run loop exits. The engine owns
        // the Arc<dyn SectorReader> = the OPEN DRIVE HANDLE; leaving it in the
        // map after completion keeps the optical drive locked (it never spins
        // down / releases) and makes a later start_recovery for this same id
        // fail with RecoveryInProgress. Removing it here drops the last strong
        // ref to the reader once `engine_for_task` goes out of scope, freeing
        // the drive for the next recovery.
        engines_for_task.write().remove(&id);
        let final_status = match final_state {
            crate::recovery::engine::EngineState::Completed => SessionStatus::Completed,
            crate::recovery::engine::EngineState::Cancelled => SessionStatus::Cancelled,
            _ => SessionStatus::Failed,
        };
        tauri::async_runtime::block_on(async move {
            if let Err(e) = manager::save_sector_map(&db, id, &map).await {
                tracing::error!("save_sector_map failed: {e:?}");
            }
            if let Err(e) = manager::update_status(&db, id, final_status).await {
                tracing::error!("update_status failed: {e:?}");
            }
            // Non-fatally promote to library on successful completion.
            // A failure here must NOT block recovery:complete or fail the session.
            if final_status == SessionStatus::Completed {
                match crate::library::promote::promote_session_to_library(&app_for_save, &db, id).await {
                    Ok(disc_id) => {
                        tracing::info!("recovery: session {id} promoted to library disc {disc_id}");
                    }
                    Err(e) => {
                        tracing::warn!("recovery: promote_session_to_library failed for session {id} (non-fatal): {e}");
                    }
                }
            }
            let _ = app_for_save.emit("recovery:complete", id.to_string());
        });
    });

    // Forward progress events to the frontend.
    tokio::spawn(async move {
        while let Some(progress) = rx.recv().await {
            let _ = app.emit("recovery:progress", &progress);
        }
    });

    // Persist sector map on each checkpoint signal.
    let db_for_ckpt = state.db.clone();
    let engine_for_ckpt = engine.clone();
    tokio::spawn(async move {
        while ckpt_rx.recv().await.is_some() {
            let map = engine_for_ckpt.snapshot_map();
            if let Err(e) = manager::save_sector_map(&db_for_ckpt, id, &map).await {
                tracing::warn!("checkpoint save_sector_map failed: {e:?}");
            }
        }
    });

    // Write receipt batches to DB as they arrive from the engine.
    let db_for_rcpt = state.db.clone();
    tokio::spawn(async move {
        while let Some(batch) = rcpt_rx.recv().await {
            if let Err(e) = manager::record_receipts(&db_for_rcpt, id, &batch).await {
                tracing::warn!("receipt write failed: {e:?}");
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn pause_recovery(
    state: State<'_, AppState>,
    session_id: String,
) -> AppResult<()> {
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;
    let engine = state.engines.read().get(&id).cloned();
    if let Some(engine) = engine {
        engine.pause();
        manager::update_status(&state.db, id, SessionStatus::Paused).await?;
    }
    Ok(())
}

#[tauri::command]
pub async fn cancel_recovery(
    state: State<'_, AppState>,
    session_id: String,
) -> AppResult<()> {
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;
    if let Some(engine) = state.engines.write().remove(&id) {
        engine.cancel();
    }
    manager::update_status(&state.db, id, SessionStatus::Cancelled).await?;
    Ok(())
}

#[tauri::command]
pub async fn get_sector_map(
    state: State<'_, AppState>,
    session_id: String,
    buckets: usize,
) -> AppResult<Vec<u8>> {
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;

    // Prefer live engine snapshot; fall back to persisted map.
    if let Some(engine) = state.engines.read().get(&id).cloned() {
        return Ok(engine.snapshot_map().downsample(buckets));
    }
    let map = manager::load_sector_map(&state.db, id)
        .await?
        .ok_or_else(|| AppError::SessionNotFound(session_id))?;
    Ok(map.downsample(buckets))
}

#[derive(Debug, serde::Serialize)]
pub struct RmapExport {
    pub path: String,
    pub bytes_written: u64,
    pub run_count: u64,
}

/// Export the session's sector map to a ddrescue-format `.rmap` text file.
#[tauri::command]
pub async fn export_rmap(
    state: State<'_, AppState>,
    session_id: String,
    output_path: Option<String>,
) -> AppResult<RmapExport> {
    use std::path::PathBuf;
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;
    let session = manager::get(&state.db, id).await?;

    // Prefer live engine snapshot; fall back to persisted map.
    let live = state.engines.read().get(&id).cloned();
    let map = if let Some(engine) = live {
        engine.snapshot_map()
    } else {
        manager::load_sector_map(&state.db, id)
            .await?
            .ok_or_else(|| AppError::SessionNotFound(session_id.clone()))?
    };

    let header = crate::recovery::rmap::RmapHeader {
        disc_label: Some(session.disc_label.clone()),
        disc_fingerprint: Some(session.disc_fingerprint.clone()),
        current_pass: session.current_pass.max(1) as u32,
        app_version: env!("CARGO_PKG_VERSION"),
    };
    let text = crate::recovery::rmap::encode(&map, &header);

    let target = match output_path {
        Some(p) => {
            // Frontend-supplied path: validate as a write path before touching
            // the filesystem (blocks UNC, system dirs, wrong extensions).
            crate::util::path_safety::validate_write_path(&p, &["rmap", "map"])?
        }
        None => {
            let safe: String = session
                .disc_label
                .chars()
                .map(|c| if c.is_alphanumeric() || c == '_' || c == '-' { c } else { '_' })
                .collect();
            let stem = if safe.is_empty() { "recovered".into() } else { safe };
            PathBuf::from(&session.output_dir).join(format!("{stem}.rmap"))
        }
    };
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&target, text.as_bytes())?;

    let bytes_written = std::fs::metadata(&target).map(|m| m.len()).unwrap_or(0);
    let run_count = text
        .lines()
        .filter(|l| l.starts_with("0x") && !l.contains('?') && !l.starts_with("0x0  "))
        .count() as u64;
    // Subtract one for the current_pos header line that may slip through:
    let run_count = run_count.saturating_sub(0);

    Ok(RmapExport {
        path: target.to_string_lossy().to_string(),
        bytes_written,
        run_count,
    })
}

#[derive(Debug, serde::Serialize)]
pub struct RmapImport {
    pub good_sectors: u64,
    pub failed_sectors: u64,
    pub skipped_sectors: u64,
    pub unknown_sectors: u64,
}

/// Replace the session's sector map with one parsed from a `.rmap` file. Use
/// case: user ran a recovery on another machine with ddrescue, or restored
/// from a diagnostic bundle, and wants to continue from that state.
#[tauri::command]
pub async fn import_rmap(
    state: State<'_, AppState>,
    session_id: String,
    input_path: String,
) -> AppResult<RmapImport> {
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;
    let session = manager::get(&state.db, id).await?;

    if state.engines.read().contains_key(&id) {
        return Err(AppError::RecoveryInProgress(session_id));
    }

    // Defense in depth: validate the path the renderer handed us before
    // touching the filesystem. `.rmap` files are typically <1 MB; cap at 100 MB
    // to avoid OOM on a malicious or malformed input.
    let safe_input = crate::util::path_safety::validate_read_path(
        &input_path,
        &["rmap", "map"],
        100 * 1024 * 1024,
    )?;
    let text = std::fs::read_to_string(&safe_input)
        .map_err(|e| AppError::Internal(format!("read {}: {}", safe_input.display(), e)))?;
    let map = crate::recovery::rmap::decode(&text, session.total_sectors)
        .map_err(|e| AppError::Internal(format!("parse rmap: {e}")))?;

    use crate::recovery::map::SectorState;
    let summary = RmapImport {
        good_sectors: map.count(SectorState::Good),
        failed_sectors: map.count(SectorState::Failed),
        skipped_sectors: map.count(SectorState::Skipped),
        unknown_sectors: map.count(SectorState::Unknown),
    };
    manager::save_sector_map(&state.db, id, &map).await?;
    Ok(summary)
}

/// Export the SHA-256 sector receipt manifest for a session.
///
/// Returns the manifest text (suitable for writing to a file) and the sector
/// count. The manifest is a human-readable chain-of-custody record: one line
/// per recovered sector, formatted as `LBA(hex)  SHA-256`.
#[derive(Debug, serde::Serialize)]
pub struct ReceiptManifestResult {
    pub manifest: String,
    pub sector_count: u64,
}

#[tauri::command]
pub async fn export_receipt_manifest(
    state: State<'_, AppState>,
    session_id: String,
    output_path: Option<String>,
) -> AppResult<ReceiptManifestResult> {
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;

    // Archive-tier feature. The tamper-evident manifest is a professional /
    // legal / archival capability, not part of the basic Save flow — gate it in
    // the BACKEND so it can't be reached by a script even if the UI is bypassed.
    if !crate::licensing::current(&state.data_dir).plan.can_export_manifest() {
        return Err(AppError::Internal(
            "The tamper-evident recovery manifest is an Archive feature. \
             Upgrade to Archive to export a SHA-256 chain-of-custody record."
                .into(),
        ));
    }

    let manifest = manager::export_receipt_manifest(&state.db, id).await?;
    let sector_count = manager::count_receipts(&state.db, id).await?;

    if let Some(path) = output_path {
        // Frontend supplies the path — validate it. We do NOT create arbitrary
        // parent directories; the renderer's file picker is expected to point
        // at an existing folder.
        let safe = crate::util::path_safety::validate_write_path(&path, &["txt", "sha256", "manifest"])?;
        std::fs::write(&safe, manifest.as_bytes())?;
        tracing::info!("receipt manifest exported to {} ({sector_count} sectors)", safe.display());
    }

    Ok(ReceiptManifestResult { manifest, sector_count })
}

#[derive(Debug, serde::Serialize)]
pub struct SpaceCheck {
    /// Bytes the recovered disc image will need (~ the full disc size).
    pub needed_bytes: u64,
    /// Free bytes on the volume that holds the session's output directory.
    pub free_bytes: u64,
    /// True if there's comfortably enough room (free >= needed + 5% margin).
    pub fits: bool,
}

/// Check whether the session's destination drive has room for the disc image
/// that the rescue will write. Used to warn the user (and suggest a USB drive)
/// before a long recovery fills the disk.
#[tauri::command]
pub async fn recovery_space_check(
    state: State<'_, AppState>,
    session_id: String,
) -> AppResult<SpaceCheck> {
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;
    let session = manager::get(&state.db, id).await?;

    // The image is one byte per recovered sector; full disc = total_sectors * 2048.
    let needed_bytes = session.total_sectors.saturating_mul(2048);

    let free_bytes = free_bytes_for_path(&session.output_dir);

    // 5% headroom so we don't greenlight a destination that's right at the edge.
    let needed_with_margin = needed_bytes.saturating_add(needed_bytes / 20);
    let fits = free_bytes >= needed_with_margin;

    Ok(SpaceCheck { needed_bytes, free_bytes, fits })
}

/// Free bytes available on the volume that contains `path`. Returns 0 on any
/// failure (callers treat 0/!fits as "warn, but don't block").
#[cfg(windows)]
fn free_bytes_for_path(path: &str) -> u64 {
    use std::os::windows::ffi::OsStrExt;
    // GetDiskFreeSpaceExW accepts a directory path; it resolves to that volume.
    let wide: Vec<u16> = std::ffi::OsStr::new(path)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let mut free_bytes: u64 = 0;
    #[link(name = "kernel32")]
    extern "system" {
        fn GetDiskFreeSpaceExW(
            lpDirectoryName: *const u16,
            lpFreeBytesAvailableToCaller: *mut u64,
            lpTotalNumberOfBytes: *mut u64,
            lpTotalNumberOfFreeBytes: *mut u64,
        ) -> i32;
    }
    let ok = unsafe {
        GetDiskFreeSpaceExW(
            wide.as_ptr(),
            &mut free_bytes,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
        )
    };
    if ok != 0 { free_bytes } else { 0 }
}

#[cfg(not(windows))]
fn free_bytes_for_path(_path: &str) -> u64 {
    0
}
