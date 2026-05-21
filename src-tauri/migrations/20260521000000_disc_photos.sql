-- disc_photos child table — one row per photo on a photo-type disc.
-- Mirrors the library_scenes/library_people child-table pattern.
--
-- `path`                   vault JPEG path; NULL if unconvertible
-- `source_path`            original extracted path
-- `needs_external_converter` 0|1 — if 1, path is NULL and converter_reason explains why
-- `tint`                   sentinel gradient for placeholder tiles (set on unconvertible rows)

CREATE TABLE IF NOT EXISTS disc_photos (
    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
    disc_id                   TEXT NOT NULL REFERENCES library_discs(id) ON DELETE CASCADE,
    photo_order               INTEGER NOT NULL,
    path                      TEXT,          -- vault JPEG path; NULL if unconvertible
    source_path               TEXT,          -- original extracted path
    needs_external_converter  INTEGER NOT NULL DEFAULT 0,
    converter_reason          TEXT,
    caption                   TEXT,
    tint                      TEXT,
    created_at                INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_disc_photos_disc ON disc_photos(disc_id, photo_order);

-- Idempotency guard: prevent double-promotion of the same recovery session.
-- Uses a partial index so existing rows with session_id IS NULL are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS idx_lib_discs_session_unique
  ON library_discs(session_id) WHERE session_id IS NOT NULL;
