-- Add media_type column so library_discs can hold not just recovered DVDs and
-- imported video, but also imported audio, photos, and (future) documents.
-- Default 'video' so the column is backfilled for every existing row without
-- requiring per-row migration. Backend re-populates the right value on every
-- new import.
--
-- Allowed values (enforced in app code, not the DB):
--   'video'    — recovered DVD or imported video file
--   'audio'    — recovered audio CD or imported audio file
--   'photo'    — imported still image (jpg/png/heic/tiff/webp/gif/bmp)
--   'document' — reserved for future use (PDFs, docs)

ALTER TABLE library_discs
ADD COLUMN media_type TEXT NOT NULL DEFAULT 'video';
