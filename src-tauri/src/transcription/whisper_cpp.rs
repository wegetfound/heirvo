//! Real whisper.cpp backend — wraps the bundled `whisper-cli.exe` subprocess.
//!
//! Why subprocess and not FFI?
//! - Matches the existing FFmpeg pattern (one mental model in the codebase).
//! - Easy to upgrade whisper independently of the Rust build.
//! - No C++ toolchain required on dev/CI machines.
//! - Per-job overhead is ~50ms, transcription itself takes minutes — irrelevant.
//!
//! Output parsing: `whisper-cli.exe` emits JSON to a sidecar file when `-oj`
//! is passed. Progress lines appear on stderr in the form
//! `whisper_print_progress_callback: progress = NN%`. We parse stderr live for
//! progress and read the JSON file once the process exits for segments.

use async_trait::async_trait;
use serde::Deserialize;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tauri::{AppHandle, Manager};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

use super::backend::{ProgressCb, Transcriber};
use super::types::TranscriptSegment;
use crate::error::{AppError, AppResult};

#[cfg(windows)]
const WHISPER_BIN: &str = "whisper-cli.exe";
#[cfg(not(windows))]
const WHISPER_BIN: &str = "whisper-cli";

const MODEL_BASE_EN: &str = "ggml-base.en.bin";
const MODEL_TINY_EN: &str = "ggml-tiny.en.bin";
const MODEL_PREF_FILE: &str = "model.pref";

// ─── Model preference ─────────────────────────────────────────────────────────

/// Read the user's preferred model filename from app data.
/// Defaults to "ggml-base.en.bin" if no preference is saved.
pub fn preferred_model(app: &AppHandle) -> &'static str {
    let pref = app
        .path()
        .app_data_dir()
        .ok()
        .and_then(|d| std::fs::read_to_string(d.join(MODEL_PREF_FILE)).ok());
    match pref.as_deref().map(str::trim) {
        Some("tiny.en") => MODEL_TINY_EN,
        _ => MODEL_BASE_EN,
    }
}

pub fn set_preferred_model(app: &AppHandle, model: &str) -> std::io::Result<()> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;
    std::fs::create_dir_all(&dir)?;
    let label = if model == "tiny.en" { "tiny.en" } else { "base.en" };
    std::fs::write(dir.join(MODEL_PREF_FILE), label)
}

/// Mirror of `media::ffmpeg::locate`, scoped to whisper.
pub fn locate(app: &AppHandle, filename: &str) -> Option<PathBuf> {
    // 1. Bundled resource (Tauri resource_dir).
    if let Ok(resource_dir) = app.path().resource_dir() {
        // Layout A: <resource_dir>/whisper/<filename>
        let p = resource_dir.join("whisper").join(filename);
        if p.exists() {
            return Some(p);
        }
        // Layout B: <resource_dir>/resources/whisper/<filename>
        let p = resource_dir
            .join("resources")
            .join("whisper")
            .join(filename);
        if p.exists() {
            return Some(p);
        }
    }
    // 1b. Walk up from current exe (portable / dev layouts).
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            let p = parent.join("resources").join("whisper").join(filename);
            if p.exists() {
                return Some(p);
            }
            let p = parent.join("whisper").join(filename);
            if p.exists() {
                return Some(p);
            }
        }
    }
    // 2. App data dir (future: downloaded model).
    if let Ok(data_dir) = app.path().app_data_dir() {
        let p = data_dir.join("whisper").join(filename);
        if p.exists() {
            return Some(p);
        }
    }
    None
}

pub fn whisper_available(app: &AppHandle) -> bool {
    // Both files must be present AND substantially-sized. We keep small
    // placeholder files (~1 KB of zeros) in resources/whisper/ so Tauri's
    // bundler — which validates that every resource path exists at build
    // time — is happy on dev machines that haven't run `npm run fetch-whisper`
    // yet. Real whisper-cli.exe is several MB and models are tens of MB,
    // so a 100 KB threshold cleanly separates real binaries from placeholders.
    const MIN_REAL_SIZE: u64 = 100_000;
    fn ok_with_min(p: Option<PathBuf>, min: u64) -> bool {
        match p {
            Some(path) => std::fs::metadata(&path)
                .map(|m| m.len() >= min)
                .unwrap_or(false),
            None => false,
        }
    }
    let model = preferred_model(app);
    ok_with_min(locate(app, WHISPER_BIN), MIN_REAL_SIZE)
        && ok_with_min(locate(app, model), MIN_REAL_SIZE)
}

/// Return info about installed models (used by the Settings panel).
pub fn model_info(app: &AppHandle) -> WhisperModelInfo {
    const MIN: u64 = 100_000;
    fn present(p: Option<PathBuf>) -> bool {
        p.map(|path| std::fs::metadata(path).map(|m| m.len() >= MIN).unwrap_or(false))
            .unwrap_or(false)
    }
    WhisperModelInfo {
        current: preferred_model(app).to_string(),
        base_en_present: present(locate(app, MODEL_BASE_EN)),
        tiny_en_present: present(locate(app, MODEL_TINY_EN)),
    }
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct WhisperModelInfo {
    pub current: String,
    pub base_en_present: bool,
    pub tiny_en_present: bool,
}

pub struct WhisperCppTranscriber {
    pub bin: PathBuf,
    pub model: PathBuf,
}

impl WhisperCppTranscriber {
    pub fn new(app: &AppHandle) -> AppResult<Self> {
        let bin = locate(app, WHISPER_BIN).ok_or_else(|| {
            AppError::Internal(format!(
                "{WHISPER_BIN} not found in resources/whisper/"
            ))
        })?;
        let model_file = preferred_model(app);
        let model = locate(app, model_file).ok_or_else(|| {
            AppError::Internal(format!(
                "{model_file} not found in resources/whisper/ or app data"
            ))
        })?;
        Ok(Self { bin, model })
    }
}

#[async_trait]
impl Transcriber for WhisperCppTranscriber {
    fn name(&self) -> &'static str {
        if self.model.to_string_lossy().contains("tiny") {
            "whisper.cpp/tiny.en"
        } else {
            "whisper.cpp/base.en"
        }
    }

    async fn transcribe(
        &self,
        wav_path: &Path,
        audio_duration_sec: f64,
        progress_cb: ProgressCb,
    ) -> AppResult<Vec<TranscriptSegment>> {
        // whisper-cli appends `.json` to whatever `-of <stem>` we pass.
        let stem = wav_path.with_extension("");
        let stem_str = stem.to_string_lossy().to_string();
        let json_path = wav_path.with_extension("json");

        let mut cmd = Command::new(&self.bin);
        cmd.args([
            "-m",
            self.model.to_string_lossy().as_ref(),
            "-f",
            wav_path.to_string_lossy().as_ref(),
            "-oj",                    // output JSON
            "-of",
            stem_str.as_str(),        // output basename (no extension)
            "-pp",                    // print progress to stderr
            "-l",
            "en",                     // English model — fixed for base.en
            "--no-prints",            // suppress banner / model-loading chatter
        ]);
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        // Hide the console window on Windows so we don't flash a black box
        // at the user when each transcription starts.
        #[cfg(windows)]
        {
            // tokio::process::Command exposes `creation_flags` natively; the
            // CommandExt import is unnecessary here.
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        tracing::info!(
            "Spawning whisper: {} -m {} -f {}",
            self.bin.display(),
            self.model.display(),
            wav_path.display()
        );

        let mut child = cmd
            .spawn()
            .map_err(|e| AppError::Internal(format!("failed to spawn whisper-cli: {e}")))?;

        // Tee stderr → progress callback. Whisper prints lines like
        //   "whisper_print_progress_callback: progress = 35%"
        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| AppError::Internal("no stderr handle".into()))?;
        let cb_for_task = progress_cb.clone();
        let progress_task = tokio::spawn(async move {
            let mut lines = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if let Some(pct) = parse_progress_line(&line) {
                    cb_for_task((pct as f64) / 100.0);
                }
            }
        });

        // Watchdog. base.en runs roughly 1× realtime on a typical CPU; 6× is
        // a very generous safety margin. Floor at 10 min so a 30-second clip
        // still gets a reasonable budget.
        let timeout_secs = (audio_duration_sec * 6.0).max(600.0);
        let timeout = std::time::Duration::from_secs(timeout_secs as u64);
        let timeout_min = (timeout_secs / 60.0).round() as u64;

        // Segments come from the JSON sidecar, so we don't need to read stdout
        // (whisper writes nothing useful to it when `-oj` is set anyway).
        let status = match tokio::time::timeout(timeout, child.wait()).await {
            Ok(Ok(s)) => s,
            Ok(Err(e)) => {
                let _ = progress_task.await;
                return Err(AppError::Internal(format!(
                    "waiting on whisper failed: {e}"
                )));
            }
            Err(_) => {
                tracing::warn!(
                    "whisper-cli watchdog tripped after {} min (audio_duration={:.1}s); killing child",
                    timeout_min,
                    audio_duration_sec
                );
                let _ = child.kill().await;
                let _ = child.wait().await;
                let _ = progress_task.await;
                return Err(AppError::Internal(format!(
                    "transcription timed out after {} min — file may be too long for this hardware",
                    timeout_min
                )));
            }
        };
        let _ = progress_task.await;

        if !status.success() {
            return Err(AppError::Internal(format!(
                "whisper-cli exited with status {:?}",
                status.code()
            )));
        }

        // Read + parse the JSON output.
        let json_bytes = tokio::fs::read(&json_path).await.map_err(|e| {
            AppError::Internal(format!(
                "reading whisper json {}: {e}",
                json_path.display()
            ))
        })?;
        let parsed: WhisperJsonOutput = serde_json::from_slice(&json_bytes)
            .map_err(|e| AppError::Internal(format!("parsing whisper json: {e}")))?;

        // Best-effort cleanup of the sidecar file.
        let _ = tokio::fs::remove_file(&json_path).await;

        // whisper-cli JSON format:
        //   { "transcription": [
        //       { "offsets": { "from": ms, "to": ms }, "text": "..." },
        //       ...
        //     ] }
        let segments = parsed
            .transcription
            .into_iter()
            .map(|s| {
                let start_ms = s.offsets.from as f64;
                let end_ms = s.offsets.to as f64;
                TranscriptSegment {
                    start_sec: start_ms / 1000.0,
                    end_sec: end_ms / 1000.0,
                    text: s.text.trim().to_string(),
                    speaker: None, // diarization is a future feature
                }
            })
            .filter(|s| !s.text.is_empty())
            .collect();

        progress_cb(1.0);
        Ok(segments)
    }
}

fn parse_progress_line(line: &str) -> Option<u32> {
    // e.g. "whisper_print_progress_callback: progress =  35%"
    let prefix = "progress =";
    let idx = line.find(prefix)?;
    let rest = &line[idx + prefix.len()..];
    let trimmed = rest.trim();
    let pct_str = trimmed.trim_end_matches('%').trim();
    pct_str.parse::<u32>().ok()
}

#[derive(Deserialize)]
struct WhisperJsonOutput {
    transcription: Vec<WhisperSegment>,
}
#[derive(Deserialize)]
struct WhisperSegment {
    offsets: WhisperOffsets,
    text: String,
}
#[derive(Deserialize)]
struct WhisperOffsets {
    from: i64, // ms
    to: i64,   // ms
}
