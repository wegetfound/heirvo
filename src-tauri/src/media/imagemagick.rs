//! ImageMagick integration for formats the `image` crate cannot decode.
//!
//! We shell out to `magick convert` rather than linking against ImageMagick's
//! C API — same rationale as FFmpeg: clean license boundary, no native build
//! toolchain requirement, easy binary swaps.
//!
//! Binary lookup order:
//!   1. `<resource_dir>/imagemagick/magick.exe`         (bundled with installer)
//!   2. `<resource_dir>/resources/imagemagick/magick.exe` (alternate bundle layout)
//!   3. `<exe_dir>/resources/imagemagick/magick.exe`    (portable / dev)
//!   4. `<exe_dir>/imagemagick/magick.exe`
//!   5. `<app_data>/imagemagick/magick.exe`             (future: downloaded on first use)
//!   6. `magick[.exe]` on system PATH                   (developer / user install)

use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri::Manager;

#[cfg(windows)]
const MAGICK_BIN: &str = "magick.exe";
#[cfg(not(windows))]
const MAGICK_BIN: &str = "magick";

/// Locate the ImageMagick `magick` binary in priority order.
///
/// Returns `None` if not found anywhere — callers should fall back gracefully
/// (e.g. return `NeedsExternalConverter`) rather than hard-failing.
pub fn locate(app: &AppHandle) -> Option<PathBuf> {
    // 1. Bundled resource — check known layouts. Tauri 2's `resource_dir()`
    //    returns the install root on Windows NSIS, so we check both layouts.
    if let Ok(resource_dir) = app.path().resource_dir() {
        // Layout A: <resource_dir>/imagemagick/<binary>
        let p = resource_dir.join("imagemagick").join(MAGICK_BIN);
        if p.exists() {
            tracing::debug!("imagemagick: found at {}", p.display());
            return Some(p);
        }
        // Layout B: <resource_dir>/resources/imagemagick/<binary>
        let p = resource_dir
            .join("resources")
            .join("imagemagick")
            .join(MAGICK_BIN);
        if p.exists() {
            tracing::debug!("imagemagick: found at {}", p.display());
            return Some(p);
        }
    }

    // 1b. Walk up from the running exe — handles edge cases where
    //     resource_dir() points to a portable AppData layout.
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            let p = parent.join("resources").join("imagemagick").join(MAGICK_BIN);
            if p.exists() {
                tracing::debug!("imagemagick: found at {}", p.display());
                return Some(p);
            }
            let p = parent.join("imagemagick").join(MAGICK_BIN);
            if p.exists() {
                tracing::debug!("imagemagick: found at {}", p.display());
                return Some(p);
            }
        }
    }

    // 2. App data dir (reserved for future: downloaded on first use).
    if let Ok(data_dir) = app.path().app_data_dir() {
        let p = data_dir.join("imagemagick").join(MAGICK_BIN);
        if p.exists() {
            tracing::debug!("imagemagick: found in app_data at {}", p.display());
            return Some(p);
        }
    }

    // 3. System PATH — acceptable last resort for developer machines and users
    //    who have installed ImageMagick system-wide.
    if let Ok(path_var) = std::env::var("PATH") {
        let sep = if cfg!(windows) { ';' } else { ':' };
        for entry in path_var.split(sep) {
            let p = Path::new(entry).join(MAGICK_BIN);
            if p.exists() {
                tracing::debug!("imagemagick: found on PATH at {}", p.display());
                return Some(p);
            }
        }
    }

    tracing::debug!("imagemagick: not found");
    None
}

/// Decode a Kodak Photo CD (`.pcd`) file to a JPEG at `dst`.
///
/// Uses `magick convert "<src>[2]" "<dst>"` — resolution index `[2]` gives
/// 768×512 pixels, suitable for gallery display. Pass `resolution_index = 4`
/// for full-resolution 3072×2048 output.
///
/// Returns `Ok(())` on success; `Err(message)` on spawn failure or non-zero
/// exit code.
pub async fn pcd_to_jpeg(
    magick_bin: &Path,
    src: &Path,
    dst: &Path,
    resolution_index: u8,
) -> Result<(), String> {
    // Build the PCD input specifier: `path/to/file.pcd[N]`
    let pcd_arg = format!("{}[{resolution_index}]", src.to_string_lossy());
    let dst_str = dst.to_string_lossy().to_string();

    tracing::info!("imagemagick: magick \"{}\" \"{}\"", pcd_arg, dst_str);

    // ImageMagick 7 syntax: `magick <input> <output>`. The legacy `convert`
    // subcommand is rejected by current IM7 portable builds (it gets treated
    // as an input filename → "no decode delegate for `convert'").
    let mut cmd = tokio::process::Command::new(magick_bin);
    cmd.arg(&pcd_arg)
        .arg(&dst_str)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    // Suppress the console window flash on Windows.
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("failed to spawn magick: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let code = output.status.code().unwrap_or(-1);
        tracing::warn!("imagemagick: magick failed (exit {code}): {stderr}");
        return Err(format!("magick exited with status {code}: {stderr}"));
    }

    Ok(())
}
