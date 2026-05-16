//! SQLite-backed queue for transcription jobs. Mirrors the runtime-builder
//! pattern used by `library::queries` so we don't depend on the sqlx
//! macro-prepare cache.

use super::types::{JobStatus, TranscriptionJob};
use crate::error::AppResult;
use chrono::Utc;
use sqlx::{Row, SqlitePool};

fn row_to_job(row: sqlx::sqlite::SqliteRow) -> AppResult<TranscriptionJob> {
    let status_str: String = row.try_get("status")?;
    Ok(TranscriptionJob {
        id: row.try_get("id")?,
        disc_id: row.try_get("disc_id")?,
        video_path: row.try_get("video_path")?,
        audio_path: row.try_get::<Option<String>, _>("audio_path").ok().flatten(),
        backend: row.try_get("backend")?,
        model: row.try_get::<Option<String>, _>("model").ok().flatten(),
        status: JobStatus::from_str(&status_str),
        progress: row.try_get("progress")?,
        error_message: row
            .try_get::<Option<String>, _>("error_message")
            .ok()
            .flatten(),
        queued_at: row.try_get("queued_at")?,
        started_at: row.try_get::<Option<i64>, _>("started_at").ok().flatten(),
        completed_at: row
            .try_get::<Option<i64>, _>("completed_at")
            .ok()
            .flatten(),
        duration_sec: row.try_get::<Option<i64>, _>("duration_sec").ok().flatten(),
        total_chunks: row.try_get::<i64, _>("total_chunks").unwrap_or(0),
        chunks_done: row.try_get::<i64, _>("chunks_done").unwrap_or(0),
    })
}

pub async fn enqueue(
    pool: &SqlitePool,
    disc_id: &str,
    video_path: &str,
    backend: &str,
    model: Option<&str>,
) -> AppResult<i64> {
    let now = Utc::now().timestamp();
    let res = sqlx::query(
        "INSERT INTO transcription_jobs (disc_id, video_path, backend, model, status, progress, queued_at)
         VALUES (?, ?, ?, ?, 'queued', 0.0, ?)",
    )
    .bind(disc_id)
    .bind(video_path)
    .bind(backend)
    .bind(model)
    .bind(now)
    .execute(pool)
    .await?;
    Ok(res.last_insert_rowid())
}

pub async fn list_jobs(pool: &SqlitePool) -> AppResult<Vec<TranscriptionJob>> {
    let rows = sqlx::query("SELECT * FROM transcription_jobs ORDER BY queued_at DESC")
        .fetch_all(pool)
        .await?;
    rows.into_iter().map(row_to_job).collect()
}

pub async fn jobs_for_disc(
    pool: &SqlitePool,
    disc_id: &str,
) -> AppResult<Vec<TranscriptionJob>> {
    let rows = sqlx::query(
        "SELECT * FROM transcription_jobs WHERE disc_id = ? ORDER BY queued_at DESC",
    )
    .bind(disc_id)
    .fetch_all(pool)
    .await?;
    rows.into_iter().map(row_to_job).collect()
}

pub async fn get_job(pool: &SqlitePool, id: i64) -> AppResult<Option<TranscriptionJob>> {
    let row = sqlx::query("SELECT * FROM transcription_jobs WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await?;
    match row {
        Some(r) => Ok(Some(row_to_job(r)?)),
        None => Ok(None),
    }
}

/// Oldest queued job, or None.
pub async fn next_queued(pool: &SqlitePool) -> AppResult<Option<TranscriptionJob>> {
    let row = sqlx::query(
        "SELECT * FROM transcription_jobs WHERE status = 'queued' ORDER BY queued_at ASC LIMIT 1",
    )
    .fetch_optional(pool)
    .await?;
    match row {
        Some(r) => Ok(Some(row_to_job(r)?)),
        None => Ok(None),
    }
}

pub async fn update_status(
    pool: &SqlitePool,
    id: i64,
    status: JobStatus,
    progress: f64,
    error: Option<&str>,
) -> AppResult<()> {
    let now = Utc::now().timestamp();
    match status {
        JobStatus::Extracting => {
            // First time we touch a queued job — record started_at.
            sqlx::query(
                "UPDATE transcription_jobs
                 SET status = ?, progress = ?, error_message = NULL,
                     started_at = COALESCE(started_at, ?)
                 WHERE id = ?",
            )
            .bind(status.as_str())
            .bind(progress)
            .bind(now)
            .bind(id)
            .execute(pool)
            .await?;
        }
        JobStatus::Complete | JobStatus::Error | JobStatus::Cancelled => {
            sqlx::query(
                "UPDATE transcription_jobs
                 SET status = ?, progress = ?, error_message = ?, completed_at = ?
                 WHERE id = ?",
            )
            .bind(status.as_str())
            .bind(progress)
            .bind(error)
            .bind(now)
            .bind(id)
            .execute(pool)
            .await?;
        }
        _ => {
            sqlx::query(
                "UPDATE transcription_jobs
                 SET status = ?, progress = ?, error_message = ?
                 WHERE id = ?",
            )
            .bind(status.as_str())
            .bind(progress)
            .bind(error)
            .bind(id)
            .execute(pool)
            .await?;
        }
    }
    Ok(())
}

/// Reset any jobs that were mid-flight when the app last shut down.
/// Called once on startup before the worker begins polling — without this,
/// a crash mid-extraction (or a hard kill) leaves the job stuck in
/// `extracting`/`transcribing` forever and the queue stops draining.
///
/// `chunks_done` and `total_chunks` are deliberately preserved so the worker
/// can skip already-checkpointed chunks on resume. Progress is recalculated
/// from chunks_done/total_chunks (or 0.0 for extraction-phase crashes).
/// Returns the count of jobs reset.
pub async fn reset_in_flight_jobs(pool: &SqlitePool) -> AppResult<u32> {
    let now = chrono::Utc::now().timestamp();
    let rows = sqlx::query(
        "UPDATE transcription_jobs
         SET status = 'queued',
             progress = CASE
                 WHEN total_chunks > 0
                 THEN CAST(chunks_done AS REAL) / CAST(total_chunks AS REAL)
                 ELSE 0.0
             END,
             error_message = COALESCE(error_message, '') || '[resumed after app restart at ' || ? || ']'
         WHERE status IN ('extracting', 'transcribing')",
    )
    .bind(now)
    .execute(pool)
    .await?;
    Ok(rows.rows_affected() as u32)
}

/// Persist the chunk checkpoint after each 10-minute window completes.
/// Also updates progress so the UI reflects how far along we are.
pub async fn update_chunks_done(
    pool: &SqlitePool,
    id: i64,
    done: i64,
    total: i64,
) -> AppResult<()> {
    let progress = if total > 0 {
        done as f64 / total as f64
    } else {
        0.0
    };
    sqlx::query(
        "UPDATE transcription_jobs
         SET chunks_done = ?, total_chunks = ?, progress = ?
         WHERE id = ?",
    )
    .bind(done)
    .bind(total)
    .bind(progress)
    .bind(id)
    .execute(pool)
    .await?;
    Ok(())
}

/// Mark a queued job cancelled. No-op if it's already running/done — we'd
/// need a cancel token plumbed through the worker for mid-flight cancel.
pub async fn cancel(pool: &SqlitePool, id: i64) -> AppResult<()> {
    let now = Utc::now().timestamp();
    sqlx::query(
        "UPDATE transcription_jobs
         SET status = 'cancelled', completed_at = ?
         WHERE id = ? AND status = 'queued'",
    )
    .bind(now)
    .bind(id)
    .execute(pool)
    .await?;
    Ok(())
}
