-- Chunked/checkpointed transcription: split long audio into 10-minute windows so
-- a crash mid-job doesn't lose all work. chunks_done tracks how many windows have
-- been fully transcribed and persisted; on resume the worker skips those windows.

ALTER TABLE transcription_jobs ADD COLUMN total_chunks INTEGER NOT NULL DEFAULT 0;
ALTER TABLE transcription_jobs ADD COLUMN chunks_done  INTEGER NOT NULL DEFAULT 0;
