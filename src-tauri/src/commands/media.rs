//! Media output commands (ISO assembly, FFmpeg transcoding, ffmpeg detection).

use crate::error::{AppError, AppResult};
use crate::media::ffmpeg::{self, FfmpegProgress, ProbeResult};
use crate::media::stream_server::StreamBase;
use crate::media::transcode::TranscodeJob;
use crate::session::manager;
use crate::state::AppState;
use crate::util::proc::NoConsole;
use chrono::Utc;
use serde::Serialize;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::watch;
use uuid::Uuid;

/// Return the base URL of the in-process localhost streaming server.
/// The frontend uses this to build `<base>/stream?src=<encoded-path>` URLs
/// for in-app playback of recovered MPEG-2 discs.
/// Returns an empty string if the server failed to start.
#[tauri::command]
pub fn get_stream_base(base: State<'_, StreamBase>) -> String {
    base.0.clone()
}

#[derive(Debug, Serialize)]
pub struct IsoResult {
    pub path: String,
    pub bytes_written: u64,
    pub good_sectors: u64,
    pub zero_filled_sectors: u64,
    pub good_read_failed_sectors: u64,
}

/// Open the best sector reader for EXTRACTION (VOB/MP4/file copy): the local
/// disc image if the rescue already wrote one (disc not touched), otherwise the
/// live drive. Returned boxed so callers can pass `reader.as_ref()` to anything
/// taking `&dyn SectorReader`.
#[cfg(windows)]
pub(crate) fn open_extraction_reader(
    output_dir: &str,
    disc_label: &str,
    drive_path: &str,
) -> AppResult<Box<dyn crate::disc::sector::SectorReader>> {
    let image = crate::recovery::image_sink::disc_image_path(output_dir, disc_label);
    if image.exists() {
        tracing::info!(
            "extraction: reading from local disc image {} (disc not touched)",
            image.display()
        );
        let r = crate::disc::iso_file::IsoFileSectorReader::open(&image)
            .map_err(|e| AppError::Media(format!("open disc image: {e}")))?;
        Ok(Box::new(r))
    } else {
        let r = crate::disc::scsi_windows::ScsiSectorReader::open(drive_path)
            .map_err(|e| AppError::Drive(format!("open drive: {e}")))?;
        Ok(Box::new(r))
    }
}

/// Burn the recovered disc image to a blank disc using Windows' built-in Disc
/// Image Burner (`isoburn.exe`) — the same IMAPI2 engine Windows ships and
/// maintains, so there's no third-party burner and no risk of a half-baked
/// custom write path corrupting a disc. We hand it the recovered image and the
/// optical drive; the user inserts a blank disc and confirms the burn.
#[cfg(windows)]
#[tauri::command]
pub async fn burn_image_to_disc(
    state: State<'_, AppState>,
    session_id: String,
) -> AppResult<()> {
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;
    if !crate::licensing::export_allowed(&state.data_dir) {
        return Err(AppError::Internal(
            "Your free export has been used — upgrade Heirvo to save more.".into(),
        ));
    }
    let session = manager::get(&state.db, id).await?;

    let image =
        crate::recovery::image_sink::disc_image_path(&session.output_dir, &session.disc_label);
    if !image.exists() {
        return Err(AppError::Media(
            "No disc image to burn yet — save an exact copy of the disc first.".into(),
        ));
    }

    // Validate the ISO file is readable and not empty (helps catch corrupted/partial ISO)
    match std::fs::metadata(&image) {
        Ok(metadata) => {
            if metadata.len() == 0 {
                return Err(AppError::Media(
                    "The disc image file is empty or corrupted. Try saving the exact copy again.".into(),
                ));
            }
            tracing::info!("burn_image_to_disc: ISO file size {} bytes", metadata.len());
        }
        Err(e) => {
            return Err(AppError::Media(format!(
                "Couldn't access the disc image file: {}. It may have been moved or deleted.",
                e
            )));
        }
    }

    // Device path "\\.\E:" -> drive letter "E:".
    let letter = session
        .drive_path
        .trim_start_matches("\\\\.\\")
        .trim_end_matches('\\')
        .to_string();
    if letter.len() < 2 || !letter.ends_with(':') {
        return Err(AppError::Drive(format!(
            "Couldn't determine the optical drive letter from '{}'. The drive may be disconnected or unavailable.",
            session.drive_path
        )));
    }

    // Basic sanity check: drive letter should be a single letter followed by ":"
    let drive_char = letter.chars().next().unwrap_or(' ');
    if letter.len() != 2 || !drive_char.is_alphabetic() {
        return Err(AppError::Drive(format!(
            "Invalid drive letter '{}' — expected format like 'E:'. The optical drive may not be available.",
            letter
        )));
    }

    let isoburn = {
        let root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".into());
        PathBuf::from(root).join("System32").join("isoburn.exe")
    };
    if !isoburn.exists() {
        return Err(AppError::Media(
            "Windows Disc Image Burner (isoburn.exe) isn't available on this system.".into(),
        ));
    }

    let image_str = image.to_string_lossy().to_string();
    tracing::info!(
        "burn_image_to_disc: launching isoburn: /S \"{}\" /D {}",
        image_str,
        letter
    );

    // isoburn.exe expects: /S source.iso /D target_drive
    // Without these flags it doesn't recognize the positional arguments and fails silently.
    // Command::arg() handles quoting and escaping automatically for the OS.
    let status = std::process::Command::new(&isoburn)
        .no_console()
        .arg("/S")
        .arg(&image_str)
        .arg("/D")
        .arg(&letter)
        .spawn()
        .map_err(|e| {
            let err_msg = format!("Couldn't launch Windows Disc Image Burner: {e}");
            tracing::error!("{}", err_msg);
            AppError::Media(err_msg)
        })?;

    tracing::info!("burn_image_to_disc: isoburn launched successfully (PID: {:?})", status.id());
    crate::licensing::record_export(&state.data_dir);
    Ok(())
}

#[cfg(not(windows))]
#[tauri::command]
pub async fn burn_image_to_disc(
    _state: State<'_, AppState>,
    _session_id: String,
) -> AppResult<()> {
    Err(AppError::NotImplemented("burn_image_to_disc (non-Windows)"))
}

#[tauri::command]
pub async fn create_iso(
    state: State<'_, AppState>,
    session_id: String,
    output_path: Option<String>,
) -> AppResult<IsoResult> {
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;
    if !crate::licensing::export_allowed(&state.data_dir) {
        return Err(AppError::Internal(
            "Your free export has been used — upgrade Heirvo to save more.".into(),
        ));
    }
    let session = manager::get(&state.db, id).await?;
    let map = manager::load_sector_map(&state.db, id)
        .await?
        .ok_or_else(|| AppError::SessionNotFound(session_id.clone()))?;

    // The recovery pass writes the disc image as it reads (read-once). If that
    // image is present, we produce the ISO INSTANTLY from it instead of
    // re-reading the (often dying) disc.
    let image_path = crate::recovery::image_sink::disc_image_path(
        &session.output_dir,
        &session.disc_label,
    );
    let target = match output_path {
        Some(p) => PathBuf::from(p),
        None => image_path.clone(),
    };

    let image_exists = tokio::fs::metadata(&image_path).await.is_ok();

    let stats = if image_exists {
        // ── Fast path: the image already exists on disk. ───────────────────
        // Stats come from the sector map (no re-read). good_read_failed is 0
        // because we never re-read — the bytes were captured during the rescue.
        let good = map.count(crate::recovery::SectorState::Good);
        let total = map.total();
        let zero_filled = total.saturating_sub(good);

        // If the caller wants the ISO somewhere else (e.g. a USB drive), copy
        // the local image there — a fast local file copy, still no disc access.
        if target != image_path {
            let src = image_path.clone();
            let dst = target.clone();
            tokio::task::spawn_blocking(move || std::fs::copy(&src, &dst))
                .await
                .map_err(|e| AppError::Internal(format!("join: {e}")))?
                .map_err(|e| AppError::Media(format!("copy disc image: {e}")))?;
        }
        let bytes_written = tokio::fs::metadata(&target)
            .await
            .map(|m| m.len())
            .unwrap_or(0);
        tracing::info!(
            "create_iso: served from pre-written disc image ({} good sectors, no disc re-read)",
            good
        );
        crate::media::iso::AssembleStats {
            bytes_written,
            good_sectors: good,
            zero_filled_sectors: zero_filled,
            good_read_failed_sectors: 0,
        }
    } else {
        // ── Fallback: no image (e.g. resumed from an .rmap on another PC) — ─
        // assemble by re-reading the disc, as before.
        let drive_path = session.drive_path.clone();
        let target_for_task = target.clone();
        tokio::task::spawn_blocking(move || -> AppResult<crate::media::iso::AssembleStats> {
            #[cfg(windows)]
            {
                use crate::disc::scsi_windows::ScsiSectorReader;
                let reader = ScsiSectorReader::open(&drive_path)
                    .map_err(|e| AppError::Drive(format!("open: {e}")))?;
                crate::media::iso::assemble_iso(&reader, &map, &target_for_task, None, None)
                    .map_err(|e| AppError::Media(format!("assemble_iso: {e}")))
            }
            #[cfg(not(windows))]
            {
                let _ = (drive_path, target_for_task, map);
                Err(AppError::NotImplemented("create_iso (non-Windows)"))
            }
        })
        .await
        .map_err(|e| AppError::Internal(format!("join: {e}")))??
    };

    let now = Utc::now().timestamp();
    let path_str = target.to_string_lossy().to_string();
    sqlx::query(
        "INSERT INTO output_files (session_id, file_type, path, size_bytes, status, created_at)
         VALUES (?, 'iso', ?, ?, 'complete', ?)",
    )
    .bind(id.to_string())
    .bind(&path_str)
    .bind(stats.bytes_written as i64)
    .bind(now)
    .execute(&state.db.pool)
    .await?;

    crate::licensing::record_export(&state.data_dir);
    Ok(IsoResult {
        path: path_str,
        bytes_written: stats.bytes_written,
        good_sectors: stats.good_sectors,
        zero_filled_sectors: stats.zero_filled_sectors,
        good_read_failed_sectors: stats.good_read_failed_sectors,
    })
}

#[derive(Debug, Serialize)]
pub struct FfmpegStatus {
    pub available: bool,
    pub path: Option<String>,
    pub version: Option<String>,
}

#[tauri::command]
pub async fn ffmpeg_status(app: AppHandle) -> AppResult<FfmpegStatus> {
    match ffmpeg::locate(&app, if cfg!(windows) { "ffmpeg.exe" } else { "ffmpeg" }) {
        Some(path) => {
            // Capture `ffmpeg -version` first line.
            let output = tokio::process::Command::new(&path)
                .no_console()
                .arg("-version")
                .output()
                .await
                .ok();
            let version = output.and_then(|o| {
                String::from_utf8_lossy(&o.stdout)
                    .lines()
                    .next()
                    .map(|l| l.to_string())
            });
            Ok(FfmpegStatus {
                available: true,
                path: Some(path.to_string_lossy().to_string()),
                version,
            })
        }
        None => Ok(FfmpegStatus { available: false, path: None, version: None }),
    }
}

#[tauri::command]
pub async fn ffprobe_file(app: AppHandle, path: String) -> AppResult<ProbeResult> {
    // Validate before passing the renderer-supplied path to a child process.
    let safe = crate::util::path_safety::validate_read_path(
        &path,
        &[
            "mp4", "mov", "avi", "mkv", "mts", "m2ts", "ts", "wmv", "webm",
            "vob", "dat", "mpg", "mpeg", "m2v", "m4v",
            "wav", "mp3", "flac", "m4a", "aac", "ogg", "opus",
            "jpg", "jpeg", "png", "heic", "tiff", "tif", "webp",
        ],
        50 * 1024 * 1024 * 1024, // 50 GB — largest legit DVD rip
    )?;
    let bin = ffmpeg::locate_ffprobe(&app)?;
    ffmpeg::probe(&bin, &safe).await
}

#[tauri::command]
pub async fn install_ffmpeg(app: AppHandle) -> AppResult<String> {
    crate::media::ffmpeg_install::install(app).await
}

#[derive(Debug, Serialize)]
pub struct ImagemagickStatus {
    pub available: bool,
    pub path: Option<String>,
    pub version: Option<String>,
}

#[tauri::command]
pub async fn imagemagick_status(app: AppHandle) -> AppResult<ImagemagickStatus> {
    match crate::media::imagemagick::locate(&app) {
        Some(path) => {
            // Capture `magick -version` first line.
            let output = tokio::process::Command::new(&path)
                .no_console()
                .arg("-version")
                .output()
                .await
                .ok();
            let version = output.and_then(|o| {
                String::from_utf8_lossy(&o.stdout)
                    .lines()
                    .next()
                    .map(|l| l.to_string())
            });
            Ok(ImagemagickStatus {
                available: true,
                path: Some(path.to_string_lossy().to_string()),
                version,
            })
        }
        None => Ok(ImagemagickStatus { available: false, path: None, version: None }),
    }
}

#[tauri::command]
pub async fn install_imagemagick(app: AppHandle) -> AppResult<String> {
    crate::media::imagemagick_install::install(app).await
}

/// Stage 1: instant lossless MP4 from a session's extracted VOBs.
/// Auto-extracts VOBs first if they're not on disk yet.
#[tauri::command]
pub async fn save_as_mp4(
    app: AppHandle,
    state: State<'_, AppState>,
    session_id: String,
) -> AppResult<crate::media::stream_copy::StreamCopyResult> {
    use std::path::PathBuf;
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;
    if !crate::licensing::export_allowed(&state.data_dir) {
        return Err(AppError::Internal(
            "Your free export has been used — upgrade Heirvo to save more.".into(),
        ));
    }
    let session = manager::get(&state.db, id).await?;

    // Make sure the *title* VOBs have been extracted to disk.
    //
    // We deliberately check for real title VOBs — not merely "the VIDEO_TS
    // folder is non-empty". An earlier or interrupted extraction (e.g. from a
    // prior build, or a cancelled save) can leave a VIDEO_TS folder holding only
    // IFO/BUP stubs and no .VOB. The old guard treated that non-empty folder as
    // "already extracted", skipped re-extraction, and then failed downstream with
    // "no playable VOBs found" even though the recovered image has the video.
    // Using the SAME predicate as the playable-VOB collector below means: if no
    // file that would actually be fed to the muxer is present, we re-extract.
    let vob_dir = PathBuf::from(&session.output_dir).join("VIDEO_TS");
    let has_title_vob = std::fs::read_dir(&vob_dir)
        .map(|d| {
            d.filter_map(|e| e.ok()).any(|e| {
                let n = e.file_name().to_string_lossy().to_ascii_uppercase();
                n.ends_with(".VOB") && n != "VIDEO_TS.VOB" && !n.ends_with("_0.VOB")
            })
        })
        .unwrap_or(false);
    let need_extract = !has_title_vob;

    if need_extract {
        tracing::info!("save_as_mp4: VOBs not present, extracting");
        let drive_path = session.drive_path.clone();
        let output_dir = session.output_dir.clone();
        let disc_label = session.disc_label.clone();
        let map = manager::load_sector_map(&state.db, id).await?;
        let vob_dir_clone = vob_dir.clone();
        tokio::task::spawn_blocking(move || -> AppResult<()> {
            #[cfg(windows)]
            {
                // Prefer the local disc image (written during the rescue) so we
                // never re-read the disc.
                let reader = open_extraction_reader(&output_dir, &disc_label, &drive_path)?;
                let all = crate::dvd::iso9660::list_video_ts(reader.as_ref())
                    .map_err(|e| AppError::DvdStructure(format!("list_video_ts: {e}")))?
                    .ok_or_else(|| AppError::DvdStructure("no VIDEO_TS folder".into()))?;
                crate::media::vob::extract_files(reader.as_ref(), map.as_ref(), &all, &vob_dir_clone, true)
                    .map_err(|e| AppError::Media(format!("extract_files: {e}")))?;
                Ok(())
            }
            #[cfg(not(windows))]
            {
                let _ = (drive_path, output_dir, disc_label, vob_dir_clone, map);
                Err(AppError::NotImplemented("save_as_mp4 (non-Windows)"))
            }
        })
        .await
        .map_err(|e| AppError::Internal(format!("join: {e}")))??;
    }

    // Collect VOB files in title order: VTS_01_1.VOB, VTS_01_2.VOB, …
    let mut vobs: Vec<PathBuf> = std::fs::read_dir(&vob_dir)
        .map_err(|e| AppError::Media(format!("read VIDEO_TS dir: {e}")))?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| {
            p.extension()
                .and_then(|x| x.to_str())
                .map(|s| s.eq_ignore_ascii_case("VOB"))
                .unwrap_or(false)
        })
        // Skip menu VOBs — we want title content only. Both the VMG menu
        // (VIDEO_TS.VOB) and each title set's menu (VTS_NN_0.VOB) are menus; the
        // VMG one is often 0 bytes and has no audio, which can confuse the muxer.
        .filter(|p| {
            let name = p
                .file_name()
                .and_then(|n| n.to_str())
                .map(|s| s.to_ascii_uppercase())
                .unwrap_or_default();
            name != "VIDEO_TS.VOB" && !name.ends_with("_0.VOB")
        })
        .collect();
    vobs.sort();

    if vobs.is_empty() {
        return Err(AppError::Media("no playable VOBs found".into()));
    }

    // Output path: <output_dir>/<safe_label>.mp4
    let safe_label: String = session
        .disc_label
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '_' || c == '-' { c } else { '_' })
        .collect();
    let stem = if safe_label.is_empty() { "recovered".into() } else { safe_label };
    let output = PathBuf::from(&session.output_dir).join(format!("{stem}.mp4"));

    let result = crate::media::stream_copy::stream_copy_vobs(&app, &vobs, &output).await?;

    // Storage hygiene: if WE extracted the VOB working-files this run (they
    // weren't already on disk) and the MP4 was written, remove the VIDEO_TS
    // scratch. Only touches VOB/IFO/BUP inside VIDEO_TS — the .mp4 and the
    // recovery .iso live in the parent dir and are never touched. Off when the
    // user has disabled auto-tidy in Settings.
    if need_extract
        && result.bytes_written > 0
        && crate::commands::settings::auto_tidy_enabled(&app)
    {
        let reclaimed = crate::media::vob::tidy_video_ts_scratch(&vob_dir);
        if reclaimed > 0 {
            tracing::info!(
                "save_as_mp4: tidied VIDEO_TS scratch — reclaimed {reclaimed} bytes"
            );
        }
    }

    // Record output file in DB.
    let now = chrono::Utc::now().timestamp();
    sqlx::query(
        "INSERT INTO output_files (session_id, file_type, path, size_bytes, status, created_at)
         VALUES (?, 'mp4', ?, ?, 'complete', ?)",
    )
    .bind(id.to_string())
    .bind(&result.output_path)
    .bind(result.bytes_written as i64)
    .bind(now)
    .execute(&state.db.pool)
    .await?;

    // Bump the free-tier export counter (invalidates license cache).
    let data_dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."));
    crate::licensing::record_export(&data_dir);

    Ok(result)
}

#[derive(Debug, Serialize, Clone)]
pub struct TranscodeStarted {
    pub job_id: String,
}

/// Result returned by `normalize_for_playback`.
#[derive(Debug, Serialize, Clone)]
pub struct NormalizeStarted {
    pub job_id: String,
}

/// Ensure a recovered video is playable in the Chromium WebView2 / webview.
///
/// Recovered footage (MPEG-2 VOB/DAT, Xvid AVI, etc.) cannot be decoded by
/// the browser webview. This command:
///   1. Probes the input with ffprobe.
///   2. If already H.264/AAC in MP4/MOV → returns immediately (`already_safe`).
///   3. If H.264/AAC but wrong container → fast stream-copy remux (`remux`).
///   4. Otherwise → full libx264/AAC re-encode with bwdif deinterlacing for
///      interlaced sources (DVD/VCD) and error-tolerant input flags for damaged
///      streams (`reencode`).
///
/// Progress events: `normalize:progress` `{ job_id, frame, fps, … }`
/// Completion:      `normalize:complete`  `{ job_id, mode }` where `mode` is
///                  one of `"already_safe"`, `"remux"`, `"reencode"`.
/// Error:           `normalize:error`     `{ job_id, error }`
#[tauri::command]
pub async fn normalize_for_playback(
    app: AppHandle,
    input_path: String,
    output_path: String,
) -> AppResult<NormalizeStarted> {
    use crate::media::transcode;
    use std::path::PathBuf;

    // Validate input (must exist, media extension) and output (write path,
    // mp4/mov allowed) before spawning the ffmpeg task.
    let safe_input = crate::util::path_safety::validate_read_path(
        &input_path,
        &[
            "mp4", "mov", "avi", "mkv", "mts", "m2ts", "ts", "wmv", "webm",
            "vob", "dat", "mpg", "mpeg", "m2v", "m4v",
            "wav", "mp3", "flac", "m4a", "aac", "ogg", "opus",
        ],
        50 * 1024 * 1024 * 1024,
    )?;
    let safe_output = crate::util::path_safety::validate_write_path(
        &output_path,
        &["mp4", "mov", "mkv"],
    )?;
    let input_path = safe_input.to_string_lossy().to_string();
    let output_path = safe_output.to_string_lossy().to_string();

    let job_id = Uuid::new_v4().to_string();
    let job_id_clone = job_id.clone();
    let app_for_task = app.clone();

    let on_progress: Arc<dyn Fn(FfmpegProgress) + Send + Sync> = {
        let app = app.clone();
        let job_id = job_id.clone();
        Arc::new(move |p| {
            #[derive(Serialize, Clone)]
            struct Payload {
                job_id: String,
                #[serde(flatten)]
                progress: FfmpegProgress,
            }
            let _ = app.emit(
                "normalize:progress",
                Payload { job_id: job_id.clone(), progress: p },
            );
        })
    };

    let (_cancel_tx, cancel_rx) = watch::channel(false);

    tokio::spawn(async move {
        let result = transcode::normalize_for_playback(
            &app_for_task,
            PathBuf::from(&input_path),
            PathBuf::from(&output_path),
            on_progress,
            Some(cancel_rx),
        )
        .await;
        match result {
            Ok(mode) => {
                let _ = app_for_task.emit(
                    "normalize:complete",
                    &serde_json::json!({ "job_id": job_id_clone, "mode": mode }),
                );
            }
            Err(e) => {
                let _ = app_for_task.emit(
                    "normalize:error",
                    &serde_json::json!({ "job_id": job_id_clone, "error": e.to_string() }),
                );
            }
        }
    });

    Ok(NormalizeStarted { job_id })
}

/// Start a transcode job. Progress events are emitted as `transcode:progress`
/// with payload `{ jobId, frame, fps, bitrate_kbps, out_time_us, speed }`.
/// Completion fires `transcode:complete` or `transcode:error`.
#[tauri::command]
pub async fn transcode(app: AppHandle, mut job: TranscodeJob) -> AppResult<TranscodeStarted> {
    // Validate input and output paths before any filesystem or process work.
    let safe_input = crate::util::path_safety::validate_read_path(
        &job.input.to_string_lossy(),
        &[
            "mp4", "mov", "avi", "mkv", "mts", "m2ts", "ts", "wmv", "webm",
            "vob", "dat", "mpg", "mpeg", "m2v", "m4v",
            "wav", "mp3", "flac", "m4a", "aac", "ogg", "opus",
        ],
        50 * 1024 * 1024 * 1024,
    )?;
    let safe_output = crate::util::path_safety::validate_write_path(
        &job.output.to_string_lossy(),
        &["mp4", "mov", "mkv", "avi", "webm"],
    )?;
    job.input = safe_input;
    job.output = safe_output;

    let job_id = Uuid::new_v4().to_string();
    let job_id_clone = job_id.clone();
    let app_for_task = app.clone();

    let on_progress: Arc<dyn Fn(FfmpegProgress) + Send + Sync> = {
        let app = app.clone();
        let job_id = job_id.clone();
        Arc::new(move |p| {
            #[derive(Serialize, Clone)]
            struct Payload {
                job_id: String,
                #[serde(flatten)]
                progress: FfmpegProgress,
            }
            let _ = app.emit(
                "transcode:progress",
                Payload { job_id: job_id.clone(), progress: p },
            );
        })
    };

    // We don't currently expose cancel via this command — could plumb a watch
    // channel into a registry if/when we add a cancel button.
    let (_cancel_tx, cancel_rx) = watch::channel(false);

    tokio::spawn(async move {
        let result = crate::media::transcode::run(&app_for_task, job, on_progress, Some(cancel_rx)).await;
        match result {
            Ok(()) => {
                let _ = app_for_task.emit("transcode:complete", &job_id_clone);
            }
            Err(e) => {
                let _ = app_for_task.emit(
                    "transcode:error",
                    &serde_json::json!({ "job_id": job_id_clone, "error": e.to_string() }),
                );
            }
        }
    });

    Ok(TranscodeStarted { job_id })
}
