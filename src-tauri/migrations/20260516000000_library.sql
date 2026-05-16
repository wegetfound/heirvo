-- Heirvo Library — persistent recovered-disc archive with FTS5 transcript search.
--
-- A "library disc" is a recovered+transcribed disc presented to the user as a
-- piece of family memory. Independent from recovery_sessions (which focus on
-- the read pipeline) — library_discs.session_id links back when the disc came
-- from a Heirvo recovery (vs imported video file).

CREATE TABLE IF NOT EXISTS library_discs (
    id                  TEXT PRIMARY KEY,           -- url-safe slug
    title               TEXT NOT NULL,
    year                INTEGER,
    date_display        TEXT,                       -- "July 22, 1995"
    filmed_by           TEXT,
    location            TEXT,
    source              TEXT NOT NULL,              -- "DVD-R", "VHS transfer", etc
    status              TEXT NOT NULL DEFAULT 'recovered',  -- recovered|partial|recovering
    duration_sec        INTEGER NOT NULL DEFAULT 0,
    duration_formatted  TEXT,                       -- "2:14:30"
    recovered_at        TEXT,                       -- "May 14"
    phrases_indexed     INTEGER NOT NULL DEFAULT 0,
    monogram_id         INTEGER NOT NULL DEFAULT 1, -- 1..8
    gradient            TEXT NOT NULL,              -- wedding|christmas|hawaii|...
    about               TEXT,
    session_id          TEXT REFERENCES recovery_sessions(id) ON DELETE SET NULL,
    video_path          TEXT,                       -- where the MP4 lives (for future viewer)
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lib_discs_session ON library_discs(session_id);
CREATE INDEX IF NOT EXISTS idx_lib_discs_year ON library_discs(year);

CREATE TABLE IF NOT EXISTS library_transcript_lines (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    disc_id      TEXT NOT NULL REFERENCES library_discs(id) ON DELETE CASCADE,
    line_order   INTEGER NOT NULL,                  -- preserves transcript order
    time_sec     INTEGER NOT NULL,                  -- start time in seconds
    time_display TEXT NOT NULL,                     -- "00:12:43"
    speaker      TEXT,
    text         TEXT NOT NULL,
    is_stage_direction INTEGER NOT NULL DEFAULT 0   -- 0|1
);

CREATE INDEX IF NOT EXISTS idx_lib_trans_disc ON library_transcript_lines(disc_id);
CREATE INDEX IF NOT EXISTS idx_lib_trans_time ON library_transcript_lines(disc_id, time_sec);

-- FTS5 virtual table mirrors the text column for full-text search.
-- content='library_transcript_lines' + content_rowid='id' makes it an external
-- content table — it reads from the base table at query time and stays in sync
-- via the triggers below.
CREATE VIRTUAL TABLE IF NOT EXISTS library_transcript_fts USING fts5(
    text,
    speaker UNINDEXED,
    content='library_transcript_lines',
    content_rowid='id',
    tokenize='porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS lib_trans_ai AFTER INSERT ON library_transcript_lines BEGIN
    INSERT INTO library_transcript_fts(rowid, text, speaker) VALUES (new.id, new.text, new.speaker);
END;
CREATE TRIGGER IF NOT EXISTS lib_trans_ad AFTER DELETE ON library_transcript_lines BEGIN
    INSERT INTO library_transcript_fts(library_transcript_fts, rowid, text, speaker) VALUES('delete', old.id, old.text, old.speaker);
END;
CREATE TRIGGER IF NOT EXISTS lib_trans_au AFTER UPDATE ON library_transcript_lines BEGIN
    INSERT INTO library_transcript_fts(library_transcript_fts, rowid, text, speaker) VALUES('delete', old.id, old.text, old.speaker);
    INSERT INTO library_transcript_fts(library_transcript_fts, rowid, text, speaker) VALUES (new.id, new.text, new.speaker);
END;

CREATE TABLE IF NOT EXISTS library_scenes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    disc_id      TEXT NOT NULL REFERENCES library_discs(id) ON DELETE CASCADE,
    scene_order  INTEGER NOT NULL,
    time_sec     INTEGER NOT NULL,
    time_display TEXT NOT NULL,
    title        TEXT NOT NULL,
    description  TEXT
);

CREATE INDEX IF NOT EXISTS idx_lib_scenes_disc ON library_scenes(disc_id);

CREATE TABLE IF NOT EXISTS library_topics (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    disc_id   TEXT NOT NULL REFERENCES library_discs(id) ON DELETE CASCADE,
    label     TEXT NOT NULL,
    count     INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_lib_topics_disc ON library_topics(disc_id);

CREATE TABLE IF NOT EXISTS library_people (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    disc_id   TEXT NOT NULL REFERENCES library_discs(id) ON DELETE CASCADE,
    initials  TEXT NOT NULL,
    name      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lib_people_disc ON library_people(disc_id);
