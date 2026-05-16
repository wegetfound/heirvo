//! Audio extraction for transcription. Uses the bundled/system FFmpeg via the
//! existing `media::ffmpeg` discovery — no parallel binary lookup.

use crate::error::{AppError, AppResult};
use crate::media::ffmpeg;
use std::path::Path;
use tauri::AppHandle;
use tokio::process::Command;

/// Extract video → 16 kHz mono 16-bit PCM WAV at `output_wav`.
///
/// Returns the detected audio duration in seconds. If ffprobe fails we fall
/// back to estimating from the file size (bytes / (16000 * 2)).
pub async fn extract_audio(
    app: &AppHandle,
    video_path: &Path,
    output_wav: &Path,
) -> AppResult<f64> {
    let bin = ffmpeg::locate(app, if cfg!(windows) { "ffmpeg.exe" } else { "ffmpeg" })
        .ok_or_else(|| {
            AppError::Internal("FFmpeg not installed — please install via Settings".into())
        })?;

    // Make sure the output directory exists.
    if let Some(parent) = output_wav.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let video_str = video_path.to_string_lossy().to_string();
    let out_str = output_wav.to_string_lossy().to_string();

    tracing::info!("transcription audio extract: {} -> {}", video_str, out_str);
    let output = Command::new(&bin)
        .args([
            "-y",
            "-i",
            &video_str,
            "-vn",
            "-acodec",
            "pcm_s16le",
            "-ar",
            "16000",
            "-ac",
            "1",
            &out_str,
        ])
        .output()
        .await
        .map_err(|e| AppError::Internal(format!("spawn ffmpeg: {e}")))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Internal(format!(
            "ffmpeg audio extraction failed: {}",
            stderr.lines().rev().take(4).collect::<Vec<_>>().join(" | ")
        )));
    }

    // Probe for duration. Fall back to file-size estimate on any error.
    let duration = match ffmpeg::locate_ffprobe(app) {
        Ok(probe_bin) => match ffmpeg::probe(&probe_bin, output_wav).await {
            Ok(p) if p.duration_secs > 0.0 => p.duration_secs,
            _ => estimate_wav_duration(output_wav),
        },
        Err(_) => estimate_wav_duration(output_wav),
    };

    Ok(duration)
}

/// 16 kHz mono 16-bit PCM ⇒ 32000 bytes/sec; the WAV header is negligible.
fn estimate_wav_duration(wav: &Path) -> f64 {
    match std::fs::metadata(wav) {
        Ok(m) => (m.len() as f64) / (16000.0 * 2.0),
        Err(_) => 0.0,
    }
}
