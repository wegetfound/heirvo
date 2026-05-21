//! Library — persistent recovered-disc archive with FTS5 transcript search.
//!
//! See `migrations/20260516000000_library.sql` for the schema.

pub mod html_export;
pub mod promote;
pub mod queries;
pub mod seed;
pub mod types;

pub use types::{Disc, Person, PhotoAsset, Scene, SearchHit, TopicTag, TranscriptLine};
