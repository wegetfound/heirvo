//! FFmpeg-based transcoding to modern container formats.
//!
//! Builds a complete `ffmpeg` argument list from a `TranscodeJob` and runs it
//! with progress event streaming.

use crate::error::{AppError, AppResult};
use crate::media::ffmpeg::{self, FfmpegProgress};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::AppHandle;

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OutputCodec {
    H264,
    H265,
    Av1,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QualityPreset {
    Archive,
    HighQuality,
    Streaming,
    Mobile,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscodeJob {
    pub input: PathBuf,
    pub output: PathBuf,
    pub codec: OutputCodec,
    pub quality: QualityPreset,
    pub deinterlace: bool,
    pub denoise: bool,
    /// Optional resolution override (width, height). Defaults to source.
    pub resolution: Option<(u32, u32)>,
}

impl TranscodeJob {
    /// Build the full argument list for ffmpeg.
    pub fn to_args(&self) -> Vec<String> {
        let mut args: Vec<String> = vec![
            "-y".into(),
            "-hide_banner".into(),
            "-i".into(),
            self.input.to_string_lossy().to_string(),
        ];

        // Build a video filter chain.
        let mut filters: Vec<String> = Vec::new();
        if self.deinterlace {
            // bwdif = bilateral motion-adaptive deinterlacer; better quality than yadif.
            filters.push("bwdif=mode=send_frame:parity=auto".into());
        }
        if self.denoise {
            filters.push("hqdn3d=4:3:6:4.5".into());
        }
        if let Some((w, h)) = self.resolution {
            filters.push(format!("scale={w}:{h}:flags=lanczos"));
        }
        if !filters.is_empty() {
            args.push("-vf".into());
            args.push(filters.join(","));
        }

        // Codec + quality.
        let (vcodec, crf) = match (self.codec, self.quality) {
            (OutputCodec::H264, QualityPreset::Archive) => ("libx264", 14),
            (OutputCodec::H264, QualityPreset::HighQuality) => ("libx264", 18),
            (OutputCodec::H264, QualityPreset::Streaming) => ("libx264", 23),
            (OutputCodec::H264, QualityPreset::Mobile) => ("libx264", 26),
            (OutputCodec::H265, QualityPreset::Archive) => ("libx265", 16),
            (OutputCodec::H265, QualityPreset::HighQuality) => ("libx265", 20),
            (OutputCodec::H265, QualityPreset::Streaming) => ("libx265", 24),
            (OutputCodec::H265, QualityPreset::Mobile) => ("libx265", 28),
            (OutputCodec::Av1, QualityPreset::Archive) => ("libsvtav1", 22),
            (OutputCodec::Av1, QualityPreset::HighQuality) => ("libsvtav1", 28),
            (OutputCodec::Av1, QualityPreset::Streaming) => ("libsvtav1", 34),
            (OutputCodec::Av1, QualityPreset::Mobile) => ("libsvtav1", 38),
        };

        args.extend([
            "-c:v".into(),
            vcodec.into(),
            "-crf".into(),
            crf.to_string(),
            "-preset".into(),
            "medium".into(),
            "-pix_fmt".into(),
            "yuv420p".into(),
        ]);

        // Audio: default re-encode to AAC 192kbps for broad compatibility.
        args.extend([
            "-c:a".into(),
            "aac".into(),
            "-b:a".into(),
            "192k".into(),
            "-ac".into(),
            "2".into(),
        ]);

        // Container: pick from output extension. Default mp4.
        args.extend(["-movflags".into(), "+faststart".into()]);

        args.push(self.output.to_string_lossy().to_string());
        args
    }
}

pub async fn run(
    app: &AppHandle,
    job: TranscodeJob,
    on_progress: Arc<dyn Fn(FfmpegProgress) + Send + Sync>,
    cancel: Option<tokio::sync::watch::Receiver<bool>>,
) -> AppResult<()> {
    let bin = ffmpeg::locate_ffmpeg(app)?;
    if let Some(parent) = job.output.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::Media(format!("create output dir: {e}")))?;
    }
    ffmpeg::run_with_progress(&bin, &job.to_args(), on_progress, cancel).await
}

/// Decide whether the input is already webview-safe (H.264 video + AAC audio in
/// an MP4/MOV container) so we can skip a needless re-encode.
fn is_already_webview_safe(probe: &ffmpeg::ProbeResult, input: &std::path::Path) -> bool {
    let ext = input
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    let mp4_container = ext == "mp4" || ext == "m4v" || ext == "mov";
    let h264_video = probe.video_codec.eq_ignore_ascii_case("h264");
    let safe_audio = probe.audio_codec.eq_ignore_ascii_case("aac")
        || probe.audio_codec.eq_ignore_ascii_case("mp4a")
        || probe.audio_codec.is_empty(); // video-only is fine
    mp4_container && h264_video && safe_audio
}

/// Build the argument list for a remux (stream-copy) when the source is already
/// H.264/AAC but is in a non-MP4 container (rare but handle it anyway).
fn remux_args(input: &std::path::Path, output: &std::path::Path) -> Vec<String> {
    vec![
        "-y".into(),
        "-hide_banner".into(),
        // Tolerate damaged/partial streams (same flags as stream_copy.rs)
        "-err_detect".into(),
        "ignore_err".into(),
        "-fflags".into(),
        "+discardcorrupt+genpts".into(),
        "-i".into(),
        input.to_string_lossy().to_string(),
        "-c".into(),
        "copy".into(),
        "-map".into(),
        "0:v?".into(),
        "-map".into(),
        "0:a?".into(),
        "-movflags".into(),
        "+faststart".into(),
        output.to_string_lossy().to_string(),
    ]
}

/// Build the argument list for a full re-encode to H.264/AAC MP4 with webview-
/// safe settings, error-tolerant input handling, and optional deinterlacing.
fn reencode_args(
    input: &std::path::Path,
    output: &std::path::Path,
    deinterlace: bool,
) -> Vec<String> {
    let mut args: Vec<String> = vec![
        "-y".into(),
        "-hide_banner".into(),
        // Tolerate bad packets common in recovered DVD/VCD/AVI files.
        "-err_detect".into(),
        "ignore_err".into(),
        "-fflags".into(),
        "+discardcorrupt+genpts".into(),
        "-i".into(),
        input.to_string_lossy().to_string(),
    ];

    // Video filter chain: deinterlace first if needed, then force even
    // dimensions (required by yuv420p / libx264).
    let mut filters: Vec<String> = Vec::new();
    if deinterlace {
        // bwdif: bilateral, motion-adaptive — better quality than yadif for DVD.
        filters.push("bwdif=mode=send_frame:parity=auto".into());
    }
    // pad to even dimensions — libx264 rejects odd width/height
    filters.push("scale=trunc(iw/2)*2:trunc(ih/2)*2".into());

    args.push("-vf".into());
    args.push(filters.join(","));

    args.extend([
        "-c:v".into(),
        "libx264".into(),
        "-crf".into(),
        "20".into(),
        "-preset".into(),
        "medium".into(),
        "-pix_fmt".into(),
        "yuv420p".into(),
    ]);

    args.extend([
        "-c:a".into(),
        "aac".into(),
        "-b:a".into(),
        "192k".into(),
        "-ac".into(),
        "2".into(),
    ]);

    args.extend([
        "-map".into(),
        "0:v?".into(),
        "-map".into(),
        "0:a?".into(),
        "-movflags".into(),
        "+faststart".into(),
    ]);

    args.push(output.to_string_lossy().to_string());
    args
}

/// How `normalize_for_playback` processed the input.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum NormalizeMode {
    /// Input was already H.264/AAC in MP4 — nothing to do, output == input.
    AlreadySafe,
    /// Container swap only (stream-copy, no re-encode).
    Remux,
    /// Full re-encode to libx264/AAC.
    Reencode,
}

/// Convert an arbitrary recovered video into a webview-playable H.264/AAC MP4.
///
/// The function probes the input first:
/// - Already H.264/AAC in `.mp4`/`.m4v`/`.mov` → returns immediately (no copy).
/// - Already H.264/AAC in a different container → fast stream-copy remux.
/// - Otherwise → full libx264/AAC re-encode with deinterlacing if the probe
///   reports interlaced content (common for DVD/VCD sources).
///
/// Error-tolerant input flags from `stream_copy.rs` are applied in both the
/// remux and re-encode paths so a handful of bad sectors won't abort the job.
pub async fn normalize_for_playback(
    app: &AppHandle,
    input: PathBuf,
    output: PathBuf,
    on_progress: Arc<dyn Fn(FfmpegProgress) + Send + Sync>,
    cancel: Option<tokio::sync::watch::Receiver<bool>>,
) -> AppResult<NormalizeMode> {
    let ffmpeg_bin = ffmpeg::locate_ffmpeg(app)?;
    let ffprobe_bin = ffmpeg::locate_ffprobe(app)?;

    let probe = ffmpeg::probe(&ffprobe_bin, &input).await?;
    tracing::info!(
        "normalize_for_playback: {:?} → video={} audio={} interlaced={} size={}x{}",
        input.file_name().unwrap_or_default(),
        probe.video_codec,
        probe.audio_codec,
        probe.interlaced,
        probe.width,
        probe.height,
    );

    // Fast path: input is already safe for the webview.
    if is_already_webview_safe(&probe, &input) {
        tracing::info!("normalize_for_playback: already webview-safe, skipping encode");
        return Ok(NormalizeMode::AlreadySafe);
    }

    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::Media(format!("create output dir: {e}")))?;
    }

    // If codec is already H.264/AAC, just remux into MP4.
    let h264 = probe.video_codec.eq_ignore_ascii_case("h264");
    let safe_audio = probe.audio_codec.eq_ignore_ascii_case("aac")
        || probe.audio_codec.eq_ignore_ascii_case("mp4a")
        || probe.audio_codec.is_empty();

    if h264 && safe_audio {
        tracing::info!("normalize_for_playback: remux only (H.264/AAC → MP4)");
        let args = remux_args(&input, &output);
        ffmpeg::run_with_progress(&ffmpeg_bin, &args, on_progress, cancel).await?;
        return Ok(NormalizeMode::Remux);
    }

    // Full re-encode.
    tracing::info!(
        "normalize_for_playback: re-encoding (deinterlace={})",
        probe.interlaced
    );
    let args = reencode_args(&input, &output, probe.interlaced);
    ffmpeg::run_with_progress(&ffmpeg_bin, &args, on_progress, cancel).await?;
    Ok(NormalizeMode::Reencode)
}
