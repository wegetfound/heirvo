//! Tauri commands for the "open Heirvo when a disc is inserted" feature.

use crate::autoplay_handler;

/// Whether Heirvo is registered as a Windows AutoPlay handler for discs.
#[tauri::command]
pub async fn autoplay_get_enabled() -> bool {
    autoplay_handler::is_enabled()
}

/// Enable/disable the AutoPlay handler (registers/unregisters HKCU keys).
#[tauri::command]
pub async fn autoplay_set_enabled(enabled: bool) -> Result<(), String> {
    autoplay_handler::set_enabled(enabled)
}

/// Returns (and clears) the drive path AutoPlay launched Heirvo with, if any.
/// The frontend calls this on mount to route straight into the rescue flow.
#[tauri::command]
pub async fn get_pending_disc() -> Option<String> {
    autoplay_handler::take_pending_disc()
}
