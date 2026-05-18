//! Tauri IPC command handlers. Each submodule defines a related group of
//! commands; the top-level `lib.rs` registers them via `generate_handler!`.

pub mod ai;
pub mod albums;
pub mod audio;
pub mod diagnostic;
pub mod drive;
pub mod dvd;
pub mod library;
pub mod license;
pub mod media;
pub mod preflight;
pub mod recovery;
pub mod session;
pub mod storage;
pub mod transcription;
