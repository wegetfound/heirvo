//! ImageMagick auto-downloader.
//!
//! Fetches the latest portable Q16 x64 build from GitHub Releases and
//! extracts ALL files (magick.exe + DLLs + XML configs) into
//! `<app_data>/imagemagick/` so `imagemagick::locate()` can find them.
//!
//! Source: `https://api.github.com/repos/ImageMagick/ImageMagick/releases/latest`
//! Asset name must contain `portable-Q16-x64.7z` (NOT HDRI, NOT Q8, NOT x86).
//! Example: `ImageMagick-7.1.2-23-portable-Q16-x64.7z`

use crate::error::{AppError, AppResult};
use crate::media::ffmpeg_install::{InstallProgress, InstallStage};
use futures_util::StreamExt;
use std::path::Path;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};

/// GitHub Releases API — resolve the latest portable-Q16-x64.7z asset.
const IM_GH_API_LATEST: &str =
    "https://api.github.com/repos/ImageMagick/ImageMagick/releases/latest";

pub async fn install(app: AppHandle) -> AppResult<String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Internal(format!("app_data_dir: {e}")))?;
    let target_dir = data_dir.join("imagemagick");
    std::fs::create_dir_all(&target_dir)?;

    let emit = Arc::new({
        let app = app.clone();
        move |p: InstallProgress| {
            let _ = app.emit("imagemagick:install_progress", &p);
        }
    });

    emit(InstallProgress {
        stage: InstallStage::Starting,
        bytes_done: 0,
        bytes_total: 0,
        message: "Connecting to GitHub…".into(),
    });

    let client = reqwest::Client::builder()
        .user_agent("heirvo/0.1")
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| AppError::Internal(format!("reqwest builder: {e}")))?;

    // Resolve the download URL via GitHub Releases API.
    let api_resp = client
        .get(IM_GH_API_LATEST)
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| AppError::Media(format!("download: GitHub API: {e}")))?;

    let json: serde_json::Value = api_resp
        .json()
        .await
        .map_err(|e| AppError::Media(format!("download: parse GitHub API json: {e}")))?;

    // Find asset whose name contains "portable-Q16-x64.7z" but NOT "HDRI".
    let asset_url = json["assets"]
        .as_array()
        .and_then(|assets| {
            assets.iter().find_map(|a| {
                let name = a["name"].as_str()?;
                if name.contains("portable-Q16-x64.7z") && !name.contains("HDRI") {
                    a["browser_download_url"].as_str().map(String::from)
                } else {
                    None
                }
            })
        })
        .ok_or_else(|| {
            AppError::Media(
                "download: no portable-Q16-x64.7z (non-HDRI) asset in latest GitHub release"
                    .into(),
            )
        })?;

    emit(InstallProgress {
        stage: InstallStage::Starting,
        bytes_done: 0,
        bytes_total: 0,
        message: "Resolved asset URL, starting download…".into(),
    });

    let resp = client
        .get(&asset_url)
        .send()
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| AppError::Media(format!("download: ImageMagick asset: {e}")))?;

    let total = resp.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut buf: Vec<u8> = Vec::with_capacity(total as usize);
    let mut stream = resp.bytes_stream();

    let mut next_emit = std::time::Instant::now();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| AppError::Media(format!("download chunk: {e}")))?;
        downloaded += chunk.len() as u64;
        buf.extend_from_slice(&chunk);

        if next_emit.elapsed() >= std::time::Duration::from_millis(250) {
            emit(InstallProgress {
                stage: InstallStage::Downloading,
                bytes_done: downloaded,
                bytes_total: total,
                message: format!(
                    "Downloading ImageMagick ({:.1} / {:.1} MB)",
                    downloaded as f64 / 1024.0 / 1024.0,
                    total as f64 / 1024.0 / 1024.0,
                ),
            });
            next_emit = std::time::Instant::now();
        }
    }

    emit(InstallProgress {
        stage: InstallStage::Extracting,
        bytes_done: downloaded,
        bytes_total: total,
        message: "Extracting archive…".into(),
    });

    extract_imagemagick_portable(&buf, &target_dir).map_err(|e| {
        let msg = format!("extract: {e}");
        let app2 = app.clone();
        let _ = app2.emit(
            "imagemagick:install_progress",
            &InstallProgress {
                stage: InstallStage::Failed,
                bytes_done: downloaded,
                bytes_total: total,
                message: msg.clone(),
            },
        );
        AppError::Media(msg)
    })?;

    let final_path =
        target_dir.join(if cfg!(windows) { "magick.exe" } else { "magick" });

    emit(InstallProgress {
        stage: InstallStage::Installed,
        bytes_done: downloaded,
        bytes_total: total,
        message: format!("Installed at {}", final_path.display()),
    });

    Ok(final_path.to_string_lossy().to_string())
}

/// Extract all entries from the .7z archive into `target_dir`.
///
/// The portable ImageMagick build nests everything under a top-level versioned
/// folder, e.g. `ImageMagick-7.1.2-23-portable-Q16-x64/magick.exe`.
/// We detect such a single-component archive root and strip it, so the result
/// is `<target_dir>/magick.exe`, not `<target_dir>/ImageMagick-.../magick.exe`.
fn extract_imagemagick_portable(
    sevenz_bytes: &[u8],
    target_dir: &Path,
) -> std::io::Result<()> {
    use sevenz_rust2::SevenZReader;
    use std::io::Cursor;

    // First pass: collect all entry names to detect a shared top-level prefix.
    let cursor = Cursor::new(sevenz_bytes);
    let mut archive = SevenZReader::new(cursor, sevenz_rust2::Password::empty())
        .map_err(|e| std::io::Error::other(format!("7z open: {e}")))?;

    let mut entry_names: Vec<String> = Vec::new();
    archive
        .for_each_entries(|entry, _reader| {
            entry_names.push(entry.name().to_string());
            Ok(true)
        })
        .map_err(|e| std::io::Error::other(format!("7z list entries: {e}")))?;

    // Detect archive-root prefix: if ALL non-empty names share the same first
    // component, we strip it. Example: "ImageMagick-7.1.2-23-portable-Q16-x64/"
    let strip_prefix = detect_archive_root_prefix(&entry_names);

    // Second pass: re-open and extract.
    let cursor2 = Cursor::new(sevenz_bytes);
    let mut archive2 = SevenZReader::new(cursor2, sevenz_rust2::Password::empty())
        .map_err(|e| std::io::Error::other(format!("7z reopen: {e}")))?;

    // Capture any IO error from inside the closure.
    let mut extract_err: Option<std::io::Error> = None;

    archive2
        .for_each_entries(|entry, reader| {
            let name = entry.name().to_string();
            // Determine destination path (strip prefix if applicable).
            let rel = if let Some(pfx) = &strip_prefix {
                if name == pfx.trim_end_matches('/') || name == *pfx {
                    // The root directory entry itself — skip.
                    return Ok(true);
                }
                name.strip_prefix(pfx.as_str())
                    .unwrap_or(&name)
                    .to_string()
            } else {
                name.clone()
            };

            if rel.is_empty() {
                return Ok(true);
            }

            // Zip-slip guard: reject entries that would escape target_dir
            // (absolute paths, drive prefixes, or `..` traversal). Only normal
            // path components (and `.`) are allowed.
            if Path::new(&rel).components().any(|c| {
                !matches!(
                    c,
                    std::path::Component::Normal(_) | std::path::Component::CurDir
                )
            }) {
                extract_err = Some(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    format!("unsafe archive entry path: {rel}"),
                ));
                return Ok(false);
            }

            let dest = target_dir.join(&rel);

            if entry.is_directory() {
                if let Err(e) = std::fs::create_dir_all(&dest) {
                    extract_err = Some(e);
                    return Ok(false); // stop iteration
                }
            } else {
                if let Some(parent) = dest.parent() {
                    if let Err(e) = std::fs::create_dir_all(parent) {
                        extract_err = Some(e);
                        return Ok(false);
                    }
                }
                let mut file = match std::fs::File::create(&dest) {
                    Ok(f) => f,
                    Err(e) => { extract_err = Some(e); return Ok(false); }
                };
                if let Err(e) = std::io::copy(reader, &mut file) {
                    extract_err = Some(e);
                    return Ok(false);
                }
            }

            Ok(true)
        })
        .map_err(|e| std::io::Error::other(format!("7z extract: {e}")))?;

    if let Some(e) = extract_err {
        return Err(e);
    }

    Ok(())
}

/// Return the archive-root prefix to strip (with trailing `/`), or `None`.
///
/// A prefix is detected when every non-empty entry name starts with the same
/// first path component. For example if all entries begin with
/// `ImageMagick-7.1.2-23-portable-Q16-x64/` we return that string.
fn detect_archive_root_prefix(names: &[String]) -> Option<String> {
    let non_empty: Vec<&str> = names
        .iter()
        .map(|s| s.as_str())
        .filter(|s| !s.is_empty())
        .collect();
    if non_empty.is_empty() {
        return None;
    }
    // Extract the first component of the first entry.
    let first = non_empty[0];
    let candidate = first.split('/').next()?;
    if candidate.is_empty() {
        return None;
    }
    let prefix = format!("{candidate}/");
    // Verify ALL entries start with this prefix OR equal the prefix dir entry.
    for name in &non_empty {
        if *name != candidate && !name.starts_with(prefix.as_str()) {
            return None;
        }
    }
    Some(prefix)
}
