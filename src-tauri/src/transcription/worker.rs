//! Background worker that drains the transcription queue serially.
//! Spawned once at app startup via `spawn_worker(app_handle, db)`.
//!
//! Long audio is split into CHUNK_SEC-second windows. Each window is
//! transcribed independently and its segments are appended to the library
//! immediately, so a crash loses at most one window worth of work.
//! `chunks_done` on the job row acts as a durable checkpoint: on restart the
//! worker picks up from that window rather than re-transcribing from scratch.

use super::audio;
use super::backend::{ProgressCb, StubTranscriber, Transcriber};
use super::queue;
use super::types::{JobStatus, TranscriptionJob};
use super::whisper_cpp::{whisper_available, WhisperCppTranscriber};
use crate::error::AppResult;
use crate::library::queries as lib_q;
use crate::library::types::TranscriptLine;
use crate::session::db::Db;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

/// Audio is split into windows of this size before being sent to the
/// transcriber. 10 minutes balances checkpoint granularity (crash at worst
/// loses ~10 min) against subprocess-start overhead (~50 ms per invocation).
const CHUNK_SEC: f64 = 600.0;

pub fn spawn_worker(app: AppHandle, db: Db) {
    tauri::async_runtime::spawn(async move {
        // Sweep stuck jobs from prior crashes — must run before drain so the
        // worker doesn't sit on `Ok(None)` while half-finished jobs hold
        // `extracting`/`transcribing` status.
        match queue::reset_in_flight_jobs(&db.pool).await {
            Ok(0) => {}
            Ok(n) => tracing::info!(
                "Transcription: resumed {n} in-flight job(s) from prior session"
            ),
            Err(e) => tracing::warn!("Transcription startup sweep failed: {e:?}"),
        }
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
    let audio_path = wav_path_for(&job);
    let result = run_job_inner(app, db, &job, &audio_path).await;
    // Cleanup the temp WAV regardless of outcome — terabytes of media * a
    // 16 kHz mono WAV per video adds up to gigabytes of temp on a long run.
    if let Err(e) = tokio::fs::remove_file(&audio_path).await {
        if e.kind() != std::io::ErrorKind::NotFound {
            tracing::warn!(
                "Failed to clean up temp WAV {}: {e:?}",
                audio_path.display()
            );
        }
    }
    result
}

async fn run_job_inner(
    app: &AppHandle,
    db: &Db,
    job: &TranscriptionJob,
    audio_path: &Path,
) -> AppResult<()> {
    let started = chrono::Utc::now().timestamp();

    // ── Phase 1: extract full audio ──────────────────────────────────────────
    // Skip if chunks_done > 0 — the audio was already prepared on a prior run
    // and the full WAV is still present (run_job only cleans it on job exit).
    let duration: f64 = if job.chunks_done > 0 {
        // Re-derive duration from the existing WAV rather than re-running FFmpeg.
        audio::wav_duration(audio_path)
    } else {
        queue::update_status(&db.pool, job.id, JobStatus::Extracting, 0.0, None).await?;
        let _ = app.emit(
            "transcription:progress",
            &serde_json::json!({
                "jobId": job.id, "discId": job.disc_id,
                "status": "extracting", "progress": 0.0,
            }),
        );

        match audio::prepare_audio(app, std::path::Path::new(&job.video_path), audio_path).await {
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
        }
    };

    // Record audio_path + duration on the job row (idempotent update).
    let _ = sqlx::query(
        "UPDATE transcription_jobs SET audio_path = ?, duration_sec = ? WHERE id = ?",
    )
    .bind(audio_path.to_string_lossy().to_string())
    .bind(duration as i64)
    .bind(job.id)
    .execute(&db.pool)
    .await;

    // ── Phase 2: pick backend ────────────────────────────────────────────────
    let backend: Arc<dyn Transcriber> = if whisper_available(app) {
        match WhisperCppTranscriber::new(app) {
            Ok(w) => {
                tracing::info!("Transcription job {}: using whisper.cpp/base.en", job.id);
                Arc::new(w)
            }
            Err(e) => {
                tracing::warn!("whisper.cpp unavailable ({e:?}), falling back to stub");
                Arc::new(StubTranscriber { disc_duration_sec: duration })
            }
        }
    } else {
        tracing::info!(
            "Transcription job {}: whisper.cpp not installed, using stub",
            job.id
        );
        Arc::new(StubTranscriber { disc_duration_sec: duration })
    };

    let _ = sqlx::query("UPDATE transcription_jobs SET backend = ? WHERE id = ?")
        .bind(backend.name())
        .bind(job.id)
        .execute(&db.pool)
        .await;

    // ── Phase 3: chunked transcription ───────────────────────────────────────
    let total_chunks = ((duration / CHUNK_SEC).ceil() as i64).max(1);
    let chunks_done_start = job.chunks_done;

    // On a fresh (non-resumed) job, clear any stale transcript lines so we
    // don't mix output from a previous stub run with real whisper output.
    if chunks_done_start == 0 {
        lib_q::clear_transcript_lines(db, &job.disc_id).await?;
    }

    // Cursor into line_order — needed so appended chunks don't collide.
    let mut lines_written = lib_q::count_transcript_lines(db, &job.disc_id).await?;

    queue::update_status(&db.pool, job.id, JobStatus::Transcribing, 0.0, None).await?;
    let _ = app.emit(
        "transcription:progress",
        &serde_json::json!({
            "jobId": job.id, "discId": job.disc_id,
            "status": "transcribing",
            "progress": chunks_done_start as f64 / total_chunks as f64,
        }),
    );

    for chunk_idx in chunks_done_start..total_chunks {
        let chunk_start = chunk_idx as f64 * CHUNK_SEC;
        let chunk_dur = (duration - chunk_start).min(CHUNK_SEC);
        let chunk_wav = chunk_wav_path(job.id, chunk_idx);

        // Extract this 10-minute slice from the full WAV (PCM copy — fast).
        if let Err(e) =
            audio::extract_chunk(app, audio_path, &chunk_wav, chunk_start, chunk_dur).await
        {
            tracing::warn!(
                "chunk {}/{} extraction failed: {e:?}; skipping window",
                chunk_idx + 1,
                total_chunks
            );
            continue;
        }

        // Build a progress callback that maps within-chunk [0,1] to overall.
        let base_progress = chunk_idx as f64 / total_chunks as f64;
        let chunk_weight = 1.0 / total_chunks as f64;
        let app_clone = app.clone();
        let disc_id_clone = job.disc_id.clone();
        let job_id = job.id;
        let progress_cb: ProgressCb = Arc::new(move |p: f64| {
            let overall = (base_progress + p * chunk_weight).min(1.0);
            let _ = app_clone.emit(
                "transcription:progress",
                &serde_json::json!({
                    "jobId": job_id, "discId": disc_id_clone,
                    "status": "transcribing", "progress": overall,
                }),
            );
        });

        let transcribe_result = backend.transcribe(&chunk_wav, chunk_dur, progress_cb).await;

        // Clean up chunk WAV immediately — don't wait for job completion.
        let _ = tokio::fs::remove_file(&chunk_wav).await;

        match transcribe_result {
            Ok(segments) => {
                let lines: Vec<TranscriptLine> = segments
                    .into_iter()
                    .map(|s| TranscriptLine {
                        // Shift timestamps by chunk start so they're relative
                        // to the original full recording, not the 10-min slice.
                        time: format_hms(s.start_sec + chunk_start),
                        time_sec: (s.start_sec + chunk_start) as i64,
                        speaker: s.speaker,
                        text: s.text,
                        is_stage_direction: None,
                    })
                    .collect();
                let n = lines.len() as i64;
                lib_q::append_transcript_lines(db, &job.disc_id, &lines, lines_written).await?;
                lines_written += n;

                // Persist checkpoint — crash recovery starts from here.
                queue::update_chunks_done(&db.pool, job.id, chunk_idx + 1, total_chunks).await?;

                tracing::debug!(
                    "job {} chunk {}/{}: {} segments, {} total lines",
                    job.id,
                    chunk_idx + 1,
                    total_chunks,
                    n,
                    lines_written
                );
            }
            Err(e) => {
                // Log but don't abort — a gap in the transcript is better than
                // losing everything. Future chunks' timestamps are still correct
                // because chunk_start is derived independently from chunk_idx.
                tracing::warn!(
                    "job {} chunk {}/{} transcription failed: {e:?}; gap in transcript",
                    job.id,
                    chunk_idx + 1,
                    total_chunks
                );
            }
        }
    }

    // ── Phase 4: complete ────────────────────────────────────────────────────
    queue::update_status(&db.pool, job.id, JobStatus::Complete, 1.0, None).await?;
    let _ = app.emit(
        "transcription:complete",
        &serde_json::json!({ "jobId": job.id, "discId": job.disc_id }),
    );
    tracing::info!(
        "Transcription complete: job {} disc {} ({} lines, {} chunks in {} sec)",
        job.id,
        job.disc_id,
        lines_written,
        total_chunks,
        chrono::Utc::now().timestamp() - started
    );
    Ok(())
}

fn wav_path_for(job: &TranscriptionJob) -> PathBuf {
    std::env::temp_dir().join(format!("heirvo_trans_{}.wav", job.id))
}

fn chunk_wav_path(job_id: i64, chunk_idx: i64) -> PathBuf {
    std::env::temp_dir().join(format!("heirvo_chunk_{}_{}.wav", job_id, chunk_idx))
}

fn format_hms(sec: f64) -> String {
    let total = sec as i64;
    let h = total / 3600;
    let m = (total % 3600) / 60;
    let s = total % 60;
    format!("{:02}:{:02}:{:02}", h, m, s)
}
