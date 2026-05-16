-- Per-sector SHA-256 chain of custody for recovered data.
--
-- Each row records the SHA-256 digest of the 2048-byte user data returned for
-- a specific sector. Rows are inserted after every successful sector read
-- during recovery. The manifest can be exported for forensic verification.
--
-- Design notes:
--   - session_id + lba is unique (one receipt per sector per session).
--   - We store hex-encoded SHA-256 (64 chars) to keep queries human-readable.
--   - The table is insert-only during recovery; no updates.
CREATE TABLE IF NOT EXISTS sector_receipts (
    id          INTEGER PRIMARY KEY,
    session_id  TEXT NOT NULL,
    lba         INTEGER NOT NULL,
    sha256_hex  TEXT NOT NULL,
    recorded_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(session_id, lba)
);

CREATE INDEX IF NOT EXISTS idx_sector_receipts_session
    ON sector_receipts(session_id, lba);
