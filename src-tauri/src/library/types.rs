//! Serde types for the Library API. JSON shapes match the frontend types in
//! `src/screens/library/data/types.ts` — all camelCase on the wire.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptLine {
    /// "HH:MM:SS"
    pub time: String,
    /// seconds — pre-computed from `time` for ease
    pub time_sec: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub speaker: Option<String>,
    pub text: String,
    /// Stage direction like "[laughter]" — italicized, no speaker.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_stage_direction: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Scene {
    pub time: String,
    pub time_sec: i64,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopicTag {
    pub label: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Person {
    pub initials: String,
    pub name: String,
}

/// A single photo in a photo-set disc.  Fields are optional because some
/// images cannot be converted by the bundled `image` crate (Kodak PCD, HEIC,
/// RAW) and are represented with a `tint` sentinel instead.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhotoAsset {
    /// Vault JPEG path, loadable via `convertFileSrc`. `None` when
    /// `needs_external_converter` is true (unconvertible format).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub caption: Option<String>,
    /// Sentinel gradient name used to render a humane placeholder tile when
    /// the image could not be converted. `None` for convertible images.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Disc {
    pub id: String,
    pub title: String,
    pub year: i64,
    /// Display date — e.g. "July 22, 1995".
    pub date: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filmed_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,
    pub source: String,
    /// "recovered" | "partial" | "recovering".
    pub status: String,
    pub duration_formatted: String,
    pub duration_sec: i64,
    pub recovered_at: String,
    pub phrases_indexed: i64,
    pub scenes: Vec<Scene>,
    pub topics: Vec<TopicTag>,
    pub people: Vec<Person>,
    pub transcript: Vec<TranscriptLine>,
    /// 1..8.
    pub monogram_id: i64,
    /// One of the `GradientId` literals.
    pub gradient: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub about: Option<String>,
    /// Local filesystem path to the recovered media file (MP4/WAV/etc.).
    /// Surfaced so the Watch screen can load it via Tauri's asset protocol.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub video_path: Option<String>,
    /// "video" | "audio" | "photo" | "document". Drives conditional render in
    /// Watch / DiscDetail. Defaults to "video" for back-compat with existing
    /// recovered DVD rows (the media_type DB column also defaults to "video").
    #[serde(default = "default_media_type")]
    pub media_type: String,
    /// Photo assets for photo-type discs. `None` (omitted from JSON) for
    /// video/audio discs so existing callers are unaffected.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub photos: Option<Vec<PhotoAsset>>,
}

fn default_media_type() -> String {
    "video".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub disc_id: String,
    pub disc_title: String,
    pub disc_date: String,
    pub time: String,
    pub time_sec: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub speaker: Option<String>,
    pub snippet: String,
    pub matched_terms: Vec<String>,
}

/// "HH:MM:SS" or "MM:SS" → seconds.
pub fn ts_to_sec(t: &str) -> i64 {
    let parts: Vec<i64> = t
        .split(':')
        .map(|n| n.parse::<i64>().unwrap_or(0))
        .collect();
    match parts.len() {
        3 => parts[0] * 3600 + parts[1] * 60 + parts[2],
        2 => parts[0] * 60 + parts[1],
        _ => 0,
    }
}
