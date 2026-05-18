-- Albums: group related imported media (most commonly a dropped folder of
-- photos) under a single library card so a user importing 200 wedding shots
-- doesn't end up with 200 individual library entries.
--
-- Design notes:
-- - album_id is nullable on library_discs — recovered DVDs and ad-hoc single
--   file imports stay loose. Only folder drops auto-create an album.
-- - cover_disc_id points at one of the album's members; nullable so deleting
--   the cover doesn't break the album.
-- - ON DELETE SET NULL for member.album_id: removing an album doesn't delete
--   its discs (user intent: "ungroup", not "destroy"). Use delete_album_with_discs
--   in app code for the cascading variant.

CREATE TABLE library_albums (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    cover_disc_id TEXT REFERENCES library_discs(id) ON DELETE SET NULL,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
);

ALTER TABLE library_discs
ADD COLUMN album_id TEXT REFERENCES library_albums(id) ON DELETE SET NULL;

CREATE INDEX idx_library_discs_album ON library_discs(album_id);
