-- Add deliverable_path: the human-findable Documents\Heirvo copy of the media file.
-- Nothing internal reads this for playback/transcription/search — it is a passive,
-- user-facing copy only.  NULL means not yet materialized (or not applicable).
ALTER TABLE library_discs ADD COLUMN deliverable_path TEXT;
