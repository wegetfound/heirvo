//! Transcriber backends. `StubTranscriber` lets the entire pipeline work
//! end-to-end today; `WhisperCppTranscriber` (in `whisper_cpp.rs`) is the
//! real speech-to-text backend, selected at runtime when the bundled
//! `whisper-cli.exe` + `ggml-base.en.bin` are present.

use super::types::TranscriptSegment;
use crate::error::AppResult;
use async_trait::async_trait;
use std::path::Path;
use std::sync::Arc;

/// Callback the worker passes to backends to report progress in [0.0, 1.0].
/// Arc-wrapped so it can be cheaply cloned into spawned tasks (e.g. the
/// stderr-tailing task in the whisper backend) without lifetime gymnastics.
pub type ProgressCb = Arc<dyn Fn(f64) + Send + Sync>;

#[async_trait]
pub trait Transcriber: Send + Sync {
    /// Transcribe an audio file (16kHz mono PCM WAV) into ordered segments.
    /// `audio_duration_sec` is the measured input duration — backends use it
    /// to size a host-side watchdog timeout (so a wedged whisper-cli on a
    /// damaged WAV doesn't pin the worker forever).
    /// `progress_cb` is called with values in [0.0, 1.0] as work proceeds.
    async fn transcribe(
        &self,
        wav_path: &Path,
        audio_duration_sec: f64,
        progress_cb: ProgressCb,
    ) -> AppResult<Vec<TranscriptSegment>>;

    fn name(&self) -> &'static str;
}

/// Validate and clean segments returned by a transcriber for a single chunk.
///
/// Two passes:
/// 1. **Timestamp filter** — drops segments whose start ≥ `chunk_dur * 1.1`
///    (clear timestamp overflow / garbage from a corrupted WAV). Clamps
///    `end_sec` to `chunk_dur` so segments don't bleed into the next chunk.
/// 2. **Repetition filter** — collapses runs of 3+ consecutive identical texts
///    into a single segment (whisper's most common hallucination on silent
///    audio: dozens of "[Music]" or "Thank you for watching." in a loop).
///
/// Returns `(cleaned_segments, Option<warning_string>)`. Non-empty warning
/// means something was cleaned; callers should log it at WARN level.
/// The function is intentionally lenient: a partially corrupted chunk that
/// yields some usable segments is better than rejecting everything.
pub fn validate_chunk_output(
    segments: Vec<TranscriptSegment>,
    chunk_dur: f64,
) -> (Vec<TranscriptSegment>, Option<String>) {
    let original_count = segments.len();
    let time_ceiling = (chunk_dur * 1.1).max(1.0);
    let mut warnings: Vec<String> = Vec::new();

    // Pass 1: timestamp filter.
    let mut ts_ok: Vec<TranscriptSegment> = segments
        .into_iter()
        .filter(|s| {
            // Drop zero-duration or impossible timestamps.
            s.start_sec >= 0.0 && s.start_sec < time_ceiling
        })
        .map(|mut s| {
            // Clamp end to the chunk boundary so offsets don't drift.
            if s.end_sec > chunk_dur {
                s.end_sec = chunk_dur;
            }
            s
        })
        .collect();

    let dropped_ts = original_count.saturating_sub(ts_ok.len());
    if dropped_ts > 0 {
        warnings.push(format!("{dropped_ts} segment(s) had out-of-range timestamps"));
    }

    // Pass 2: repetition run collapse.
    // Walk through segments; when a text appears in 3+ consecutive positions,
    // keep only the first and skip the rest.
    let mut deduped: Vec<TranscriptSegment> = Vec::with_capacity(ts_ok.len());
    let mut run_text: Option<String> = None;
    let mut run_count: usize = 0;
    let mut total_collapsed: usize = 0;

    for seg in ts_ok.drain(..) {
        let same_as_run = run_text.as_deref() == Some(seg.text.as_str());
        if same_as_run {
            run_count += 1;
            if run_count >= 3 {
                // Third+ repetition — this is a hallucination loop; skip.
                total_collapsed += 1;
                continue;
            }
        } else {
            run_text = Some(seg.text.clone());
            run_count = 1;
        }
        deduped.push(seg);
    }

    if total_collapsed > 0 {
        warnings.push(format!("{total_collapsed} repeated segment(s) collapsed (hallucination loop)"));
    }

    let warn = if warnings.is_empty() {
        None
    } else {
        Some(warnings.join("; "))
    };

    (deduped, warn)
}

/// Stub transcriber that emits plausible family-video segments without
/// actually running speech recognition. Used for end-to-end pipeline
/// testing and as a graceful fallback when whisper.cpp isn't installed.
pub struct StubTranscriber {
    pub disc_duration_sec: f64,
}

#[async_trait]
impl Transcriber for StubTranscriber {
    async fn transcribe(
        &self,
        _wav: &Path,
        _audio_duration_sec: f64,
        progress_cb: ProgressCb,
    ) -> AppResult<Vec<TranscriptSegment>> {
        let segments_text: [(&str, &str); 12] = [
            ("Mom", "Okay, okay — is the camera on? Is it recording?"),
            ("Dad", "The red light's on, that means it's working."),
            (
                "Mom",
                "Alright everyone, gather around the cake — Sarah, scoot in honey, you're hiding behind Michael.",
            ),
            ("Sarah", "I am not, I'm right here Mom!"),
            (
                "Dad",
                "On three. One, two, three — happy birthday to you, happy birthday to you...",
            ),
            ("Family", "[singing together, candles flickering]"),
            (
                "Grandma",
                "Oh my goodness, you didn't have to — eighty candles, are you trying to start a fire?",
            ),
            ("Dad", "Make a wish, Mom. Take your time."),
            ("Grandma", "[pause] Okay. I made it."),
            ("Sarah", "What did you wish for, Grandma?"),
            (
                "Grandma",
                "If I told you, dear, it wouldn't come true. But it's a good one.",
            ),
            ("Family", "[applause, laughter, someone says 'aw mom']"),
        ];
        let total = segments_text.len();
        let duration = if self.disc_duration_sec > 0.0 {
            self.disc_duration_sec
        } else {
            720.0
        };
        let mut out = Vec::with_capacity(total);
        for (i, (speaker, text)) in segments_text.iter().enumerate() {
            // Simulate ~10s of work spread across all segments.
            tokio::time::sleep(std::time::Duration::from_millis(800)).await;
            let progress = (i + 1) as f64 / total as f64;
            progress_cb(progress);
            let start = (i as f64 / total as f64) * duration;
            let end = ((i + 1) as f64 / total as f64) * duration;
            out.push(TranscriptSegment {
                start_sec: start,
                end_sec: end,
                text: (*text).to_string(),
                speaker: Some((*speaker).to_string()),
            });
        }
        Ok(out)
    }
    fn name(&self) -> &'static str {
        "stub"
    }
}
