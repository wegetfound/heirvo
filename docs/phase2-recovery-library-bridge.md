# Phase 2 Spec — Recovery → Library Bridge + Multi-Photo Sets

> Build-ready implementation spec. **Migration-touching → implement and
> runtime-test on a real build (real disc + Tauri shell), not blind.** The
> other Phase 2 backend pieces (video normalize, image→JPEG, open-files) are
> already implemented + compile-checked + committed; this is the integrative
> piece that ties them together so a recovered disc actually becomes a
> watchable/viewable library item.

## Ground truth
- **Migration runner:** `src-tauri/src/session/db.rs:47` → `sqlx::migrate!("./migrations")`. Plain `.sql` files named `YYYYMMDDHHMMSS_desc.sql`, applied in lexicographic order, recorded in `_sqlx_migrations` (idempotent). A new file is all that's needed.
- **`library_discs`** (`migrations/20260516000000_library.sql`): single-file model — `video_path TEXT`, `media_type TEXT DEFAULT 'video'`, `album_id TEXT`. No photos column/child table today.
- **Rust `Disc`**: `src-tauri/src/library/types.rs:47` (camelCase serialize). **Frontend `Disc`** already has `photos?: PhotoAsset[]` (`src/screens/library/data/types.ts`), `PhotoAsset = { path?; caption?; tint? }`.
- **Recovery completion:** `src-tauri/src/commands/recovery.rs:~110`, inside the `block_on` after `update_status`, emits `recovery:complete`. Nothing calls library code here yet.
- **`output_files`** (`migrations/20250101000000_initial.sql:56`): `session_id, file_type, path, size_bytes, status`. Written by `create_iso`/`save_as_mp4`. NOTE: `extract_all_files` (`dvd.rs`) and `extract_audio_tracks` (`audio.rs`) currently do **not** write here — bridge needs a disk-scan fallback (+ TODO to fix those).
- **Conversion commands (already built):** `convert_image_to_jpeg` / `convert_special_image` (`commands/library.rs`), `normalize_for_playback` (`commands/media.rs`), `open_folder` (`commands/storage.rs`).

## 1. Data model — new `disc_photos` child table (chosen)
Rejected: albums (one Photo CD = 100 disc rows → pollutes list/pagination); JSON column (unqueryable, whole-array rewrites). Chosen mirrors existing `library_transcript_lines/scenes/topics/people` child-table pattern.

Migration `src-tauri/migrations/20260521000000_disc_photos.sql`:
```sql
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
-- guard the recovery→library re-promotion race:
CREATE UNIQUE INDEX IF NOT EXISTS idx_lib_discs_session_unique
  ON library_discs(session_id) WHERE session_id IS NOT NULL;
```
Reads: in `queries.rs::get_disc` (after the people block ~line 263) query `disc_photos ORDER BY photo_order`, map to a new `PhotoAsset` Rust struct, set `Disc.photos: Option<Vec<PhotoAsset>>` (`None` when empty → existing video/audio discs unaffected, maps 1:1 to the TS optional field — no TS change). Only set `path` when `needs_external_converter=0 && path NOT NULL`; else `path=None` + a sentinel `tint` for the humane placeholder.

## 2. The bridge — `src-tauri/src/library/promote.rs` (new)
`pub async fn promote_session_to_library(app, db, session_id) -> AppResult<String>`, called **non-fatally** from `recovery.rs` `block_on` only when `final_status == Completed` (a failure here must NOT fail recovery or block the `recovery:complete` event).

Steps: (1) guard re-promotion (`SELECT id FROM library_discs WHERE session_id=?` → return existing; rely on the unique index for races, use INSERT OR IGNORE). (2) load session via `manager::get`. (3) query `output_files` for produced files. (4) disk-scan `<output_dir>/Recovered Files/` + root as fallback. (5) classify `media_type`: video if mp4/video present, else audio if wav, else photo if `disc_type=="Cd"` + images, else video default. (6) set `video_path` (prefer MP4 over ISO; first WAV for audio; single image → photo `video_path`). (7) for photo sets (N>1): convert each image (`spawn_blocking`, ≤4 concurrent, emit `library:promote_progress`), insert `disc_photos` rows — supported → vault JPEG `path`; SpecialFormat (PCD/HEIC/RAW) → `path=NULL, needs_external_converter=1, converter_reason=…`. Vault slot `<app_data>/vault/<disc_id[..16]>/photos/<NNNN>.jpg`. (8) build metadata (title from user_label/disc_label; source per disc_type; `status="partial"` if any conversion failed or sectors Failed; gradient/monogram per type). (9) INSERT `library_discs` + `disc_photos` in a tx. (10) enqueue transcription for video/audio only. (11) emit `library:disc_added {discId, needsNormalization, videoPath}` (frontend lazily calls `ensureDiscThumbnail`). (12) do NOT block on normalization — emit `needsNormalization:true`; frontend runs `normalizeForPlayback` then calls a new `update_disc_video_path(disc_id, newPath, status)` command; disc shows `status="recovering"` until done.

Extract `classify_image_extension` + a `convert_image_to_jpeg_path(src,dst,max_dim)` helper from `commands/library.rs` into `src-tauri/src/media/image.rs` so `promote.rs` can call them directly (not via IPC).

## 3. Edge cases
Partial recovery → `status="partial"` (check sector map `Failed` count via `manager::load_sector_map`). Mixed video+photos → classify by dominant type (video wins; images reachable via Open files); future `media_type="mixed"` TODO. Some images convert / some don't → per-row in `disc_photos`, `status="partial"`, frontend shows "saved to files" tiles. Large sets (500+) → no cap, progress events, accept minutes on the blocking pool. `output_files` gap → disk-scan fallback + TODO to make `extract_all_files`/`extract_audio_tracks` write to `output_files`.

## 4. Build order
1. Migration file (cargo-check: `sqlx::migrate!` validates at compile). 2. `types.rs` + `queries.rs` photos read/insert (cargo-check). 3. `update_disc_video_path` command + register + ipc.ts (cargo-check). 4. `promote.rs` + `media/image.rs` helpers (cargo-check). 5. wire `recovery.rs` hook (cargo-check). 6. frontend `ipc.ts` `events.onDiscAdded` + `library.updateDiscVideoPath`. 7. **Runtime test on a real build:** `cargo build`; complete a recovery; verify `library_discs` row + `session_id` FK + `media_type`; test a CD-R of JPEGs → `disc_photos` rows + vault JPEGs + frontend gallery; test a `.pcd`/renamed file → `needs_external_converter=1` + humane state.

## 5. Risks
Migration is `CREATE TABLE IF NOT EXISTS` + index → safe on existing DBs, no row migration. Existing discs → `photos:None` (backward compatible). Re-promotion race → unique index + INSERT OR IGNORE. Normalization must NOT block the bridge (emit event, frontend drives). Photo conversion time on the blocking pool → progress events; consider rayon later. Real Photo CD `.pcd` → all `needs_external_converter`, humane state, Open files works (correct per existing design).

### Files
New: `migrations/20260521000000_disc_photos.sql`, `src/library/promote.rs`, `src/media/image.rs` (optional helper extract).
Modified: `src/library/mod.rs` (+`pub mod promote;`), `src/library/types.rs` (PhotoAsset + photos), `src/library/queries.rs`, `src/commands/library.rs` (update_disc_video_path + extract helpers), `src/commands/recovery.rs` (hook), `src/lib.rs` (register), `src/lib/ipc.ts` (updateDiscVideoPath + onDiscAdded).
