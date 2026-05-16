//! Transcription IPC commands: enqueue, list, query-by-disc, cancel, retry.

use crate::error::{AppError, AppResult};
use crate::state::AppState;
use crate::transcription::queue;
use crate::transcription::types::{JobStatus, TranscriptionJob};
use tauri::State;

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
