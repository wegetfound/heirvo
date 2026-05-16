//! Transcription pipeline: video → audio extraction → speech-to-text → library indexing.
//!
//! Architecture:
//! - `audio`: FFmpeg-driven extraction of 16kHz mono PCM WAV.
//! - `backend`: trait `Transcriber` + a default `StubTranscriber` for E2E testing
//!   without a real model. A WhisperCpp backend will live here too (TBD).
//! - `queue`: SQLite-backed job table + a single background worker task.
//! - `worker`: drains the queue serially (Whisper is CPU-bound, no benefit to parallel).

pub mod audio;
pub mod backend;
pub mod queue;
pub mod types;
pub mod worker;
