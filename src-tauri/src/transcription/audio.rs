//! Audio preparation for transcription. Uses the bundled/system FFmpeg via the
//! existing `media::ffmpeg` discovery — no parallel binary lookup.
//!
//! Accepts BOTH video and pure-audio inputs. We always re-encode to 16 kHz
//! mono 16-bit PCM WAV (whisper.cpp's native input format). We could short-
//! circuit when the input is already that exact format, but FFmpeg's
//! re-encode is fast and the simpler one-path code is easier to reason about.

use crate::error::{AppError, AppResult};
use crate::media::ffmpeg;
use std::path::Path;
use tauri::AppHandle;
use tokio::process::Command;

/// Prepare an audio or video file → 16 kHz mono 16-bit PCM WAV at
/// `output_wav`. Returns the detected duration in seconds.
///
/// For pure-audio inputs (wav/mp3/flac/m4a/aac/ogg/opus) FFmpeg simply skips
/// the missing video stream; the same command works for both cases. If
/// ffprobe is unavailable or fails we fall back to estimating the duration
/// from the file size.
pub async fn prepare_audio(
    app: &AppHandle,
    input_path: &Path,
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

    let input_str = input_path.to_string_lossy().to_string();
    let out_str = output_wav.to_string_lossy().to_string();

    tracing::info!("transcription audio prepare: {} -> {}", input_str, out_str);
    let output = Command::new(&bin)
        .args([
            "-y",
            "-i",
            &input_str,
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

/// Backwards-compat alias. New callers should use `prepare_audio`.
#[deprecated(note = "use prepare_audio — accepts video AND audio inputs")]
pub async fn extract_audio(
    app: &AppHandle,
    video_path: &Path,
    output_wav: &Path,
) -> AppResult<f64> {
    prepare_audio(app, video_path, output_wav).await
}

/// 16 kHz mono 16-bit PCM ⇒ 32000 bytes/sec; the WAV header is negligible.
fn estimate_wav_duration(wav: &Path) -> f64 {
    match std::fs::metadata(wav) {
        Ok(m) => (m.len() as f64) / (16000.0 * 2.0),
        Err(_) => 0.0,
    }
}
