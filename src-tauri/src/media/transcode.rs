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
///
/// `input_arg` is the raw FFmpeg `-i` value — a plain path, or a `concat:a|b|…`
/// pseudo-input for multi-VOB DVD titles.
fn remux_args(input_arg: &str, output: &std::path::Path) -> Vec<String> {
    vec![
        "-y".into(),
        "-hide_banner".into(),
        // Tolerate damaged/partial streams (same flags as stream_copy.rs)
        "-err_detect".into(),
        "ignore_err".into(),
        "-fflags".into(),
        "+discardcorrupt+genpts".into(),
        "-i".into(),
        input_arg.to_string(),
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
    input_arg: &str,
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
        input_arg.to_string(),
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

/// Resolve a DVD VOB input into the FFmpeg input that actually contains the
/// movie — the concatenation of the TITLE VOBs.
///
/// DVD content is split across `VTS_nn_1.VOB, VTS_nn_2.VOB, …`. The menus — the
/// VMG-level `VIDEO_TS.VOB` and each title set's `VTS_nn_0.VOB` — usually carry
/// no audio (often just a still frame). Promotion's disk-scan fallback picks
/// whatever VOB `read_dir` returns first, which is frequently the audio-less
/// `VIDEO_TS.VOB` menu. Re-encoding that one file in isolation yields a silent,
/// partial clip — the "video plays but there's no sound" bug on recovered DVDs.
///
/// Given any `.VOB` path, return `(ffmpeg_input, probe_path)` where
/// `ffmpeg_input` is a `concat:` source spanning every title VOB in the same
/// folder and `probe_path` is one representative title VOB to read codec /
/// interlace info from. Non-VOB inputs (already-muxed MP4s, ISOs) pass through
/// unchanged.
fn resolve_dvd_title_input(input: &std::path::Path) -> (String, PathBuf) {
    let passthrough = || (input.to_string_lossy().to_string(), input.to_path_buf());

    let is_vob = input
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case("vob"))
        .unwrap_or(false);
    if !is_vob {
        return passthrough();
    }
    let Some(dir) = input.parent() else {
        return passthrough();
    };

    let mut titles: Vec<PathBuf> = match std::fs::read_dir(dir) {
        Ok(rd) => rd
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| {
                let name = p
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_ascii_uppercase();
                // Title VOBs only: VTS_<set>_<part>.VOB with part >= 1.
                // Excludes the VMG menu (VIDEO_TS.VOB — doesn't start with VTS_)
                // and every title-set menu (VTS_nn_0.VOB).
                name.ends_with(".VOB") && name.starts_with("VTS_") && !name.ends_with("_0.VOB")
            })
            .collect(),
        Err(_) => Vec::new(),
    };
    titles.sort();

    if titles.is_empty() {
        // No recognizable title VOBs (unusual layout) — encode the file we were
        // given rather than nothing.
        return passthrough();
    }

    let probe = titles[0].clone();
    let parts: Vec<String> = titles
        .iter()
        .map(|p| p.to_string_lossy().replace('|', "_"))
        .collect();
    tracing::info!(
        "resolve_dvd_title_input: {} → concat of {} title VOB(s)",
        input.display(),
        titles.len()
    );
    (format!("concat:{}", parts.join("|")), probe)
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

    // A raw `.iso` can't be fed to ffmpeg directly: recovered DVD images usually
    // have a destroyed filesystem (the descriptor sectors were unreadable), so
    // `-i image.iso` fails with "Invalid data found" and there's no directory to
    // locate VIDEO_TS/*.VOB. Carve the MPEG-2 program stream out by offset and
    // read it via the `subfile:` protocol. This is the durable fix for the discs
    // that previously only survived as ISO because "Save as MP4" gave up here.
    let is_iso = input
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case("iso"))
        .unwrap_or(false);
    if is_iso {
        return normalize_iso(
            &ffmpeg_bin,
            &ffprobe_bin,
            &input,
            &output,
            on_progress,
            cancel,
        )
        .await;
    }

    // For DVD VOBs, the real movie is the concatenation of the title VOBs — a
    // single VOB (often the audio-less VIDEO_TS.VOB menu) would re-encode to a
    // silent, partial clip. `ffmpeg_input` is what we feed ffmpeg's `-i`;
    // `probe_path` is a representative title VOB to read codec info from.
    let (ffmpeg_input, probe_path) = resolve_dvd_title_input(&input);

    let probe = ffmpeg::probe(&ffprobe_bin, &probe_path).await?;
    tracing::info!(
        "normalize_for_playback: {:?} (input={}) → video={} audio={} interlaced={} size={}x{}",
        probe_path.file_name().unwrap_or_default(),
        ffmpeg_input,
        probe.video_codec,
        probe.audio_codec,
        probe.interlaced,
        probe.width,
        probe.height,
    );

    // Fast path: input is already safe for the webview. Only applies to a real
    // single-file input — a multi-VOB concat must always be muxed/encoded.
    let is_concat = ffmpeg_input.starts_with("concat:");
    if !is_concat && is_already_webview_safe(&probe, &input) {
        tracing::info!("normalize_for_playback: already webview-safe, skipping encode");
        return Ok(NormalizeMode::AlreadySafe);
    }

    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::Media(format!("create output dir: {e}")))?;
    }

    // If codec is already H.264/AAC, just remux into MP4. (Not for DVD concats —
    // those are always MPEG-2/AC3 and need a real re-encode.)
    let h264 = probe.video_codec.eq_ignore_ascii_case("h264");
    let safe_audio = probe.audio_codec.eq_ignore_ascii_case("aac")
        || probe.audio_codec.eq_ignore_ascii_case("mp4a")
        || probe.audio_codec.is_empty();

    if !is_concat && h264 && safe_audio {
        tracing::info!("normalize_for_playback: remux only (H.264/AAC → MP4)");
        let args = remux_args(&ffmpeg_input, &output);
        ffmpeg::run_with_progress(&ffmpeg_bin, &args, on_progress, cancel).await?;
        return Ok(NormalizeMode::Remux);
    }

    // Full re-encode → H.264 video + AAC audio (fixes AC3-in-MP4 that won't play
    // in WebView2/Chromium or Windows Media Player).
    tracing::info!(
        "normalize_for_playback: re-encoding (deinterlace={}, concat={})",
        probe.interlaced,
        is_concat,
    );
    let args = reencode_args(&ffmpeg_input, &output, probe.interlaced);
    ffmpeg::run_with_progress(&ffmpeg_bin, &args, on_progress, cancel).await?;
    Ok(NormalizeMode::Reencode)
}

/// Re-encode a recovered DVD `.iso` to a webview-playable H.264/AAC MP4 by
/// carving its MPEG-2 program stream — the path for images whose filesystem is
/// unreadable (the common case for discs that only survived recovery as ISO).
///
/// Finds the first pack-start code, reads from there via the `subfile:`
/// protocol, probes for interlacing, then runs the standard error-tolerant
/// re-encode. Returns a clear error if no program stream is present (a truly
/// empty/garbage image) rather than emitting a broken file.
async fn normalize_iso(
    ffmpeg_bin: &std::path::Path,
    ffprobe_bin: &std::path::Path,
    input: &std::path::Path,
    output: &std::path::Path,
    on_progress: Arc<dyn Fn(FfmpegProgress) + Send + Sync>,
    cancel: Option<tokio::sync::watch::Receiver<bool>>,
) -> AppResult<NormalizeMode> {
    let offset = crate::media::iso::find_mpeg_ps_offset(input)
        .map_err(|e| AppError::Media(format!("scan ISO for program stream: {e}")))?
        .ok_or_else(|| {
            AppError::Media(format!(
                "no MPEG program stream found in {} — the image has no recoverable video payload",
                input.display()
            ))
        })?;

    // Subfile input is used ONLY for the short interlace probe below (a small
    // read, where seeking is cheap). The full transcode reads via a pipe — see
    // `run_with_progress_feeding` — because the MPEG-PS demuxer back-seeks
    // pathologically on a seekable multi-GB image.
    let probe_input = crate::media::iso::iso_program_stream_input(input, offset)
        .map_err(|e| AppError::Media(format!("build subfile input: {e}")))?;

    tracing::info!(
        "normalize_iso: {} → program stream at byte {offset}, piping to ffmpeg",
        input.display()
    );

    // Probe the carved stream for interlacing (DVD content is almost always
    // interlaced NTSC/PAL and needs deinterlacing for clean playback).
    let interlaced = match ffmpeg::probe_input(ffprobe_bin, &probe_input).await {
        Ok(p) => {
            tracing::info!(
                "normalize_iso: video={} audio={} interlaced={} {}x{}",
                p.video_codec,
                p.audio_codec,
                p.interlaced,
                p.width,
                p.height
            );
            p.interlaced
        }
        // If the probe fails we still attempt the encode — DVD sources are
        // interlaced by default, so assume true.
        Err(e) => {
            tracing::warn!("normalize_iso: probe failed ({e}); assuming interlaced");
            true
        }
    };

    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::Media(format!("create output dir: {e}")))?;
    }

    // Transcode by piping the program stream into ffmpeg's stdin (`-i pipe:0`).
    let args = reencode_args("pipe:0", output, interlaced);
    ffmpeg::run_with_progress_feeding(
        ffmpeg_bin,
        &args,
        (input.to_path_buf(), offset),
        on_progress,
        cancel,
    )
    .await?;
    Ok(NormalizeMode::Reencode)
}
