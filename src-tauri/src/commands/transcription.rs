//! Transcription IPC commands: enqueue, list, query-by-disc, cancel, retry,
//! and model-preference management.

use crate::error::{AppError, AppResult};
use crate::state::AppState;
use crate::transcription::queue;
use crate::transcription::types::{JobStatus, TranscriptionJob};
use crate::transcription::whisper_cpp::{model_info, set_preferred_model, WhisperModelInfo};
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn enqueue_transcription(
    state: State<'_, AppState>,
    disc_id: String,
    video_path: String,
) -> AppResult<i64> {
    queue::enqueue(&state.db.pool, &disc_id, &video_path, "stub", None).await
}

#[tauri::command]
pub async fn list_transcription_jobs(
    state: State<'_, AppState>,
) -> AppResult<Vec<TranscriptionJob>> {
    queue::list_jobs(&state.db.pool).await
}

#[tauri::command]
pub async fn jobs_for_disc(
    state: State<'_, AppState>,
    disc_id: String,
) -> AppResult<Vec<TranscriptionJob>> {
    queue::jobs_for_disc(&state.db.pool, &disc_id).await
}

#[tauri::command]
pub async fn cancel_transcription(state: State<'_, AppState>, job_id: i64) -> AppResult<()> {
    queue::cancel(&state.db.pool, job_id).await
}

// ─── Model preference ─────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_whisper_model_info(app: AppHandle) -> AppResult<WhisperModelInfo> {
    Ok(model_info(&app))
}

#[tauri::command]
pub async fn set_whisper_model(app: AppHandle, model: String) -> AppResult<WhisperModelInfo> {
    set_preferred_model(&app, &model)
        .map_err(|e| AppError::Internal(format!("failed to save model preference: {e}")))?;
    Ok(model_info(&app))
}

// ─── Queue management ─────────────────────────────────────────────────────────

/// Re-enqueue a failed (or cancelled) job using the same disc + video.
/// Returns the new job id.
#[tauri::command]
pub async fn retry_transcription(state: State<'_, AppState>, job_id: i64) -> AppResult<i64> {
    let job = queue::get_job(&state.db.pool, job_id)
        .await?
        .ok_or_else(|| AppError::Internal(format!("transcription job not found: {job_id}")))?;
    // Only meaningful to retry if it isn't already queued/running.
    match job.status {
        JobStatus::Queued | JobStatus::Extracting | JobStatus::Transcribing => Ok(job.id),
        _ => {
            queue::enqueue(
                &state.db.pool,
                &job.disc_id,
                &job.video_path,
                &job.backend,
                job.model.as_deref(),
            )
            .await
        }
    }
}
