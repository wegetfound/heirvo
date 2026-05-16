-- Content-addressed dedup: SHA-256 fingerprint of the source media file.
-- Populated on import so re-importing the same file redirects to the existing
-- disc rather than creating a duplicate row.

ALTER TABLE library_discs ADD COLUMN source_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_library_discs_source_hash ON library_discs(source_hash)
    WHERE source_hash IS NOT NULL;
