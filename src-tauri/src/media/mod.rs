//! Media pipeline — FFmpeg integration, ISO assembly, transcoding.
//!
//! Phase 1 stub. Implementation will use the `ffmpeg-next` crate or shell out
//! to a bundled ffmpeg binary depending on licensing constraints.

pub mod ffmpeg;
pub mod ffmpeg_install;
pub mod image;
pub mod imagemagick;
pub mod imagemagick_install;
pub mod iso;
pub mod stream_copy;
pub mod stream_server;
pub mod transcode;
pub mod vob;
