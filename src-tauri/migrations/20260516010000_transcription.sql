-- Transcription jobs: persisted queue of work to convert recovered videos
-- into searchable transcripts. Status moves queued → running → complete
-- or queued → running → error (with optional retry → queued).

CREATE TABLE IF NOT EXISTS transcription_jobs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    disc_id         TEXT NOT NULL REFERENCES library_discs(id) ON DELETE CASCADE,
    video_path      TEXT NOT NULL,
    audio_path      TEXT,                       -- populated after extraction
    backend         TEXT NOT NULL DEFAULT 'stub', -- 'stub' | 'whisper-cpp' (future)
    model           TEXT,                       -- e.g. 'base.en' (future)
    status          TEXT NOT NULL DEFAULT 'queued',  -- queued|extracting|transcribing|complete|error|cancelled
    progress        REAL NOT NULL DEFAULT 0.0,  -- 0.0..1.0
    error_message   TEXT,
    queued_at       INTEGER NOT NULL,
    started_at      INTEGER,
    completed_at    INTEGER,
    duration_sec    INTEGER                     -- detected from ffprobe; populated when known
);

CREATE INDEX IF NOT EXISTS idx_trans_jobs_status ON transcription_jobs(status);
CREATE INDEX IF NOT EXISTS idx_trans_jobs_disc ON transcription_jobs(disc_id);
CREATE INDEX IF NOT EXISTS idx_trans_jobs_queued ON transcription_jobs(queued_at);
