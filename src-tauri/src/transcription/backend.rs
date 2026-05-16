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
