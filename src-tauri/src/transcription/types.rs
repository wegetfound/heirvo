//! Wire types for the transcription pipeline. JSON shapes are camelCase to
//! match the rest of the frontend IPC surface.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptSegment {
    pub start_sec: f64,
    pub end_sec: f64,
    pub text: String,
    pub speaker: Option<String>, // None today; reserved for future diarization
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum JobStatus {
    Queued,
    Extracting,
    Transcribing,
    Complete,
    Error,
    Cancelled,
}

impl JobStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Queued => "queued",
            Self::Extracting => "extracting",
            Self::Transcribing => "transcribing",
            Self::Complete => "complete",
            Self::Error => "error",
            Self::Cancelled => "cancelled",
        }
    }
    pub fn from_str(s: &str) -> Self {
        match s {
            "extracting" => Self::Extracting,
            "transcribing" => Self::Transcribing,
            "complete" => Self::Complete,
            "error" => Self::Error,
            "cancelled" => Self::Cancelled,
            _ => Self::Queued,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionJob {
    pub id: i64,
    pub disc_id: String,
    pub video_path: String,
    pub audio_path: Option<String>,
    pub backend: String,
    pub model: Option<String>,
    pub status: JobStatus,
    pub progress: f64,
    pub error_message: Option<String>,
    pub queued_at: i64,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub duration_sec: Option<i64>,
}
