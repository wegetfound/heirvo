//! Background worker that drains the transcription queue serially.
//! Spawned once at app startup via `spawn_worker(app_handle, db)`.

use super::audio;
use super::backend::{ProgressCb, StubTranscriber, Transcriber};
use super::queue;
use super::types::{JobStatus, TranscriptionJob};
use super::whisper_cpp::{whisper_available, WhisperCppTranscriber};
use crate::error::AppResult;
use crate::library::queries as lib_q;
use crate::library::types::TranscriptLine;
use crate::session::db::Db;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub fn spawn_worker(app: AppHandle, db: Db) {
    tauri::async_runtime::spawn(async move {
        loop {
            match queue::next_queued(&db.pool).await {
                Ok(Some(job)) => {
                    if let Err(e) = run_job(&app, &db, job).await {
                        tracing::error!("Transcription worker error: {e:?}");
                    }
                }
                Ok(None) => {
                    tokio::time::sleep(Duration::from_secs(2)).await;
                }
                Err(e) => {
                    tracing::warn!("Transcription queue poll failed: {e:?}");
                    tokio::time::sleep(Duration::from_secs(5)).await;
                }
            }
        }
    });
}

async fn run_job(app: &AppHandle, db: &Db, job: TranscriptionJob) -> AppResult<()> {
    let started = chrono::Utc::now().timestamp();

    // Mark extracting
    queue::update_status(&db.pool, job.id, JobStatus::Extracting, 0.0, None).await?;
    let _ = app.emit(
        "transcription:progress",
        &serde_json::json!({
            "jobId": job.id, "discId": job.disc_id,
            "status": "extracting", "progress": 0.0,
        }),
    );

    // Prepare audio (video OR audio input → 16kHz mono 16-bit WAV).
    let audio_path = wav_path_for(&job);
    let duration = match audio::prepare_audio(
        app,
        std::path::Path::new(&job.video_path),
        &audio_path,
    )
    .await
    {
        Ok(d) => d,
        Err(e) => {
            let msg = format!("audio extraction failed: {e}");
            queue::update_status(&db.pool, job.id, JobStatus::Error, 0.0, Some(&msg)).await?;
            let _ = app.emit(
                "transcription:error",
                &serde_json::json!({ "jobId": job.id, "discId": job.disc_id, "error": msg }),
            );
            return Ok(());
        }
    };

    // Record audio_path + duration on the job row.
    let _ = sqlx::query(
        "UPDATE transcription_jobs SET audio_path = ?, duration_sec = ? WHERE id = ?",
    )
    .bind(audio_path.to_string_lossy().to_string())
    .bind(duration as i64)
    .bind(job.id)
    .execute(&db.pool)
    .await;

    // Mark transcribing
    queue::update_status(&db.pool, job.id, JobStatus::Transcribing, 0.0, None).await?;
    let _ = app.emit(
        "transcription:progress",
        &serde_json::json!({
            "jobId": job.id, "discId": job.disc_id,
            "status": "transcribing", "progress": 0.0,
        }),
    );

    // Pick backend: real whisper.cpp when bundled, stub otherwise.
    let backend: Arc<dyn Transcriber> = if whisper_available(app) {
        match WhisperCppTranscriber::new(app) {
            Ok(w) => {
                tracing::info!(
                    "Transcription job {}: using whisper.cpp/base.en",
                    job.id
                );
                Arc::new(w)
            }
            Err(e) => {
                tracing::warn!(
                    "whisper.cpp unavailable ({e:?}), falling back to stub"
                );
                Arc::new(StubTranscriber {
                    disc_duration_sec: duration,
                })
            }
        }
    } else {
        tracing::info!(
            "Transcription job {}: whisper.cpp not installed, using stub backend",
            job.id
        );
        Arc::new(StubTranscriber {
            disc_duration_sec: duration,
        })
    };

    // Persist the real backend name on the job row so the UI can label it.
    let backend_name = backend.name();
    let _ = sqlx::query("UPDATE transcription_jobs SET backend = ? WHERE id = ?")
        .bind(backend_name)
        .bind(job.id)
        .execute(&db.pool)
        .await;

    let app_clone = app.clone();
    let disc_id_clone = job.disc_id.clone();
    let job_id = job.id;
    let progress_cb: ProgressCb = Arc::new(move |p: f64| {
        let _ = app_clone.emit(
            "transcription:progress",
            &serde_json::json!({
                "jobId": job_id, "discId": disc_id_clone,
                "status": "transcribing", "progress": p,
            }),
        );
    });

    match backend.transcribe(&audio_path, progress_cb).await {
        Ok(segments) => {
            let lines: Vec<TranscriptLine> = segments
                .into_iter()
                .map(|s| TranscriptLine {
                    time: format_hms(s.start_sec),
                    time_sec: s.start_sec as i64,
                    speaker: s.speaker,
                    text: s.text,
                    is_stage_direction: None,
                })
                .collect();
            let n_lines = lines.len();
            lib_q::replace_transcript_lines(db, &job.disc_id, &lines).await?;
            queue::update_status(&db.pool, job.id, JobStatus::Complete, 1.0, None).await?;
            let _ = app.emit(
                "transcription:complete",
                &serde_json::json!({ "jobId": job.id, "discId": job.disc_id }),
            );
            tracing::info!(
                "Transcription complete: job {} disc {} ({} segments in {} sec)",
                job.id,
                job.disc_id,
                n_lines,
                chrono::Utc::now().timestamp() - started
            );
        }
        Err(e) => {
            let msg = format!("{e:?}");
            queue::update_status(&db.pool, job.id, JobStatus::Error, 0.0, Some(&msg)).await?;
            let _ = app.emit(
                "transcription:error",
                &serde_json::json!({ "jobId": job.id, "discId": job.disc_id, "error": msg }),
            );
        }
    }
    Ok(())
}

fn wav_path_for(job: &TranscriptionJob) -> PathBuf {
    std::env::temp_dir().join(format!("heirvo_trans_{}.wav", job.id))
}

fn format_hms(sec: f64) -> String {
    let total = sec as i64;
    let h = total / 3600;
    let m = (total % 3600) / 60;
    let s = total % 60;
    format!("{:02}:{:02}:{:02}", h, m, s)
}
