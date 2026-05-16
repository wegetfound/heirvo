//! Library — Tauri IPC commands for the recovered-disc archive.

use crate::error::AppResult;
use crate::library::queries;
use crate::library::seed;
use crate::library::types::{Disc, SearchHit};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_library_discs(state: State<'_, AppState>) -> AppResult<Vec<Disc>> {
    queries::list_discs(&state.db).await
}

#[tauri::command]
pub async fn get_library_disc(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<Option<Disc>> {
    queries::get_disc(&state.db, &id).await
}

#[tauri::command]
pub async fn search_library_transcripts(
    state: State<'_, AppState>,
    query: String,
) -> AppResult<Vec<SearchHit>> {
    queries::search(&state.db, &query).await
}

/// Idempotent — returns the number of discs inserted (0 if already seeded).
#[tauri::command]
pub async fn seed_library_demo(state: State<'_, AppState>) -> AppResult<u32> {
    seed::seed_demo_data(&state.db).await
}
