//! FFmpeg auto-downloader.
//!
//! Fetches the Gyan D "essentials" build (LGPL, no GPL components) and extracts
//! `ffmpeg.exe` + `ffprobe.exe` into `<app_data>/ffmpeg/`.
//!
//! Source: a PINNED, immutable GyanD GitHub release asset (see
//! `FFMPEG_DOWNLOAD_URL`), NOT the rolling `ffmpeg-release-essentials.zip`. The
//! archive's SHA-256 is verified before extraction — a mismatch is a hard
//! failure. See `imagemagick_install.rs` for the rationale on pinning.

use crate::error::{AppError, AppResult};
use futures_util::StreamExt;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::io::{Cursor, Read, Write};
use std::path::Path;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};

/// Pinned FFmpeg release (GyanD "essentials", LGPL).
///
/// SECURITY: we pin an IMMUTABLE versioned asset and verify its SHA-256 rather
/// than tracking the rolling `ffmpeg-release-essentials.zip`. The rolling file
/// changes every few weeks, which is incompatible with a pinned hash and means
/// the exact bytes we execute could change without review. Bumping is a
/// deliberate, reviewed action:
///   1. pick the new GyanD `*-essentials_build.zip` asset,
///   2. download it over TLS and `sha256sum` it (or read GitHub's asset
///      `digest`),
///   3. update `FFMPEG_PINNED_VERSION`, `FFMPEG_DOWNLOAD_URL`, and
///      `FFMPEG_EXPECTED_SHA256` together in the same commit.
///
/// Pinned hash verified 2026-06-05 against THREE independent sources: the GitHub
/// API asset `digest`, a local download + `Get-FileHash`, and the matching
/// 109 282 242-byte asset size.
const FFMPEG_PINNED_VERSION: &str = "8.1.1";
const FFMPEG_DOWNLOAD_URL: &str =
    "https://github.com/GyanD/codexffmpeg/releases/download/8.1.1/ffmpeg-8.1.1-essentials_build.zip";
const FFMPEG_EXPECTED_SHA256: &str =
    "6f58ce889f59c311410f7d2b18895b33c03456463486f3b1ebc93d97a0f54541";

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum InstallStage {
    Starting,
    Downloading,
    Extracting,
    Installed,
    Failed,
}

#[derive(Debug, Serialize, Clone)]
pub struct InstallProgress {
    pub stage: InstallStage,
    pub bytes_done: u64,
    pub bytes_total: u64,
    pub message: String,
}

pub async fn install(app: AppHandle) -> AppResult<String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Internal(format!("app_data_dir: {e}")))?;
    let target_dir = data_dir.join("ffmpeg");
    std::fs::create_dir_all(&target_dir)?;

    let emit = Arc::new({
        let app = app.clone();
        move |p: InstallProgress| {
            let _ = app.emit("ffmpeg:install_progress", &p);
        }
    });

    emit(InstallProgress {
        stage: InstallStage::Starting,
        bytes_done: 0,
        bytes_total: 0,
        message: format!("Downloading FFmpeg {FFMPEG_PINNED_VERSION}…"),
    });

    let client = reqwest::Client::builder()
        .user_agent("heirvo/0.1")
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| AppError::Internal(format!("reqwest builder: {e}")))?;

    // Download the PINNED, immutable asset directly. No "latest" resolution, no
    // GitHub API call — the bytes are gated by the compiled-in SHA-256 below.
    let resp = client
        .get(FFMPEG_DOWNLOAD_URL)
        .send()
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| AppError::Media(format!("download: FFmpeg asset: {e}")))?;

    let total = resp.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut hasher = Sha256::new();

    // Stream to a `.partial` temp file — avoids holding ~100 MB in RAM.
    let partial_path = target_dir.join("ffmpeg-essentials.zip.partial");
    let mut partial_file = std::fs::File::create(&partial_path)
        .map_err(|e| AppError::Media(format!("create partial: {e}")))?;

    let mut stream = resp.bytes_stream();
    let mut next_emit = std::time::Instant::now();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| AppError::Media(format!("download chunk: {e}")))?;
        downloaded += chunk.len() as u64;
        partial_file
            .write_all(&chunk)
            .map_err(|e| AppError::Media(format!("write partial: {e}")))?;
        hasher.update(&chunk);

        if next_emit.elapsed() >= std::time::Duration::from_millis(250) {
            emit(InstallProgress {
                stage: InstallStage::Downloading,
                bytes_done: downloaded,
                bytes_total: total,
                message: format!(
                    "Downloading FFmpeg ({:.1} / {:.1} MB)",
                    downloaded as f64 / 1024.0 / 1024.0,
                    total as f64 / 1024.0 / 1024.0,
                ),
            });
            next_emit = std::time::Instant::now();
        }
    }
    partial_file
        .sync_all()
        .map_err(|e| AppError::Media(format!("sync partial: {e}")))?;
    drop(partial_file);

    // --- SHA-256 integrity check (BEFORE extraction) — MANDATORY ---
    // The pinned hash is the supply-chain gate: we never extract or execute
    // bytes we haven't verified. A mismatch fails closed (partial deleted).
    emit(InstallProgress {
        stage: InstallStage::Extracting,
        bytes_done: downloaded,
        bytes_total: total,
        message: "Verifying SHA-256…".into(),
    });
    let actual = format!("{:x}", hasher.finalize());
    if !actual.eq_ignore_ascii_case(FFMPEG_EXPECTED_SHA256) {
        let _ = std::fs::remove_file(&partial_path);
        tracing::error!(
            "FFmpeg archive hash mismatch: expected {FFMPEG_EXPECTED_SHA256}, got {actual}"
        );
        let msg = "Downloaded FFmpeg failed its security check and was \
                   discarded. Please try again — if it keeps happening, your \
                   connection may be tampering with downloads."
            .to_string();
        let _ = app.emit(
            "ffmpeg:install_progress",
            &InstallProgress {
                stage: InstallStage::Failed,
                bytes_done: downloaded,
                bytes_total: total,
                message: msg.clone(),
            },
        );
        return Err(AppError::Media(msg));
    }

    emit(InstallProgress {
        stage: InstallStage::Extracting,
        bytes_done: downloaded,
        bytes_total: total,
        message: "Extracting archive…".into(),
    });

    // Read the verified archive from disk for extraction.
    let zip_bytes = std::fs::read(&partial_path)
        .map_err(|e| AppError::Media(format!("read partial for extract: {e}")))?;
    let _ = std::fs::remove_file(&partial_path);

    extract_ffmpeg_binaries(&zip_bytes, &target_dir).map_err(|e| {
        let msg = format!("extract: {e}");
        let app2 = app.clone();
        let _ = app2.emit(
            "ffmpeg:install_progress",
            &InstallProgress {
                stage: InstallStage::Failed,
                bytes_done: downloaded,
                bytes_total: total,
                message: msg.clone(),
            },
        );
        AppError::Media(msg)
    })?;

    let final_path = target_dir.join(if cfg!(windows) { "ffmpeg.exe" } else { "ffmpeg" });
    emit(InstallProgress {
        stage: InstallStage::Installed,
        bytes_done: downloaded,
        bytes_total: total,
        message: format!("Installed at {}", final_path.display()),
    });

    Ok(final_path.to_string_lossy().to_string())
}

/// Walk a zip archive in memory, find `ffmpeg.exe` and `ffprobe.exe` (anywhere
/// in the tree — gyan.dev nests them under `ffmpeg-N.N-essentials_build/bin/`)
/// and write them to `target_dir`.
fn extract_ffmpeg_binaries(zip_bytes: &[u8], target_dir: &Path) -> std::io::Result<()> {
    let cursor = Cursor::new(zip_bytes);
    let mut archive = zip::ZipArchive::new(cursor).map_err(std::io::Error::other)?;

    let wanted = [
        if cfg!(windows) { "ffmpeg.exe" } else { "ffmpeg" },
        if cfg!(windows) { "ffprobe.exe" } else { "ffprobe" },
    ];
    let mut found: u32 = 0;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(std::io::Error::other)?;
        let name = file.name().to_string();
        let basename = std::path::Path::new(&name)
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("");
        if !wanted.contains(&basename) {
            continue;
        }
        let out_path = target_dir.join(basename);
        let mut out_file = std::fs::File::create(&out_path)?;
        let mut data = Vec::with_capacity(file.size() as usize);
        file.read_to_end(&mut data)?;
        out_file.write_all(&data)?;
        found += 1;
        if found == wanted.len() as u32 {
            break;
        }
    }

    if found < wanted.len() as u32 {
        return Err(std::io::Error::other(format!(
            "archive missing one of {:?}; found {found}",
            wanted
        )));
    }
    Ok(())
}
