//! Library — Tauri IPC commands for the recovered-disc archive.

use crate::error::{AppError, AppResult};
use crate::library::queries;
use crate::library::seed;
use crate::library::types::{Disc, SearchHit};
use crate::state::AppState;
use chrono::{Datelike, Utc};
use sqlx::Row;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub async fn list_library_discs(state: State<'_, AppState>) -> AppResult<Vec<Disc>> {
    queries::list_discs(&state.db).await
}

/// Paginated variant — preferred for the Library screen on libraries with
/// thousands of discs. `cursor = 0` for the first page; subsequent calls pass
/// the `next_cursor` returned by the previous page. `limit` clamped to 200.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryDiscPage {
    pub discs: Vec<Disc>,
    pub next_cursor: Option<i64>,
}

#[tauri::command]
pub async fn list_library_discs_page(
    state: State<'_, AppState>,
    cursor: i64,
    limit: i64,
) -> AppResult<LibraryDiscPage> {
    let (discs, next_cursor) = queries::list_discs_page(&state.db, cursor, limit).await?;
    Ok(LibraryDiscPage {
        discs,
        next_cursor,
    })
}

#[tauri::command]
pub async fn get_library_disc(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<Option<Disc>> {
    queries::get_disc(&state.db, &id).await
}

#[tauri::command]
pub async fn search_library_transcripts(
    state: State<'_, AppState>,
    query: String,
) -> AppResult<Vec<SearchHit>> {
    queries::search(&state.db, &query).await
}

/// Idempotent — returns the number of discs inserted (0 if already seeded).
#[tauri::command]
pub async fn seed_library_demo(state: State<'_, AppState>) -> AppResult<u32> {
    seed::seed_demo_data(&state.db).await
}

/// Write a single self-contained HTML archive of a disc to `output_path`.
/// Returns the number of bytes written.
#[tauri::command]
pub async fn export_disc_html(
    state: State<'_, AppState>,
    disc_id: String,
    output_path: String,
) -> AppResult<u64> {
    let Some(disc) = queries::get_disc(&state.db, &disc_id).await? else {
        return Err(crate::error::AppError::Internal(format!(
            "disc not found: {disc_id}"
        )));
    };
    crate::library::html_export::write_disc_html(&disc, std::path::Path::new(&output_path))
        .await
        .map_err(|e| crate::error::AppError::Internal(format!("write failed: {e}")))
}

/// Return value for `import_media_disc`.
/// `is_duplicate = true` means a disc with the same SHA-256 hash already
/// exists; `id` is that existing disc's id. The frontend should skip
/// enqueueing transcription in this case.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub id: String,
    pub is_duplicate: bool,
}

/// Pre-flight info for a prospective media import — lets the UI show a clear
/// "this will copy 4.2 GB into your vault" confirmation before the user commits.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPreview {
    pub file_size: u64,
    pub file_size_display: String,
    pub vault_free_space: Option<u64>,
    pub will_fit: bool,
    pub media_kind: &'static str, // "video" | "audio" | "photo" (future: "document")
    pub gate: ImportGate,
}

/// What the user is allowed to do, given their current license.
/// `kind` tells the frontend which paywall variant to show.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportGate {
    pub allowed: bool,
    pub required_plan: &'static str, // "archive" — UI uses this for upgrade copy
    pub reason: Option<String>,
}

/// Return a cached thumbnail for a disc's media file, generating it on first
/// request. Currently supports photo discs only (video thumbnails will require
/// ffmpeg orchestration). Returns the absolute path to the cached JPEG which
/// the frontend can load via `convertFileSrc`.
///
/// Returns `Ok(None)` when:
///   - the disc has no video_path (recovered DVD without a recovered file)
///   - the disc is not a photo (video/audio thumbnails not implemented yet)
///   - the source format isn't decodable (e.g. HEIC — falls back to direct serve)
///
/// Cache: `<vault>/thumbs/<sha-prefix>.jpg` — deterministic, regeneration is
/// idempotent, deletion of the source disc frees the thumb on next vault GC.
#[tauri::command]
pub async fn ensure_disc_thumbnail(
    app: AppHandle,
    state: State<'_, AppState>,
    disc_id: String,
) -> AppResult<Option<String>> {
    // Look up disc media path + type
    let row = sqlx::query(
        "SELECT video_path, media_type, source_hash FROM library_discs WHERE id = ?",
    )
    .bind(&disc_id)
    .fetch_optional(&state.db.pool)
    .await?;
    let Some(row) = row else { return Ok(None) };
    let media_path: Option<String> = row.try_get("video_path").ok().flatten();
    let media_type: String = row.try_get::<String, _>("media_type").unwrap_or_else(|_| "video".into());
    let hash: Option<String> = row.try_get::<Option<String>, _>("source_hash").ok().flatten();

    let Some(media_path) = media_path else { return Ok(None) };
    // Audio has no visual representation — frontend keeps the gradient.
    // (A future enhancement could render a waveform image here.)
    if media_type == "audio" {
        return Ok(None);
    }

    let vault = vault_dir(&app)?;
    let thumbs_dir = vault.join("thumbs");
    std::fs::create_dir_all(&thumbs_dir)
        .map_err(|e| AppError::Internal(format!("thumbs mkdir failed: {e}")))?;

    // Cache key: source_hash if available, else a hash of the disc id.
    let cache_key = hash.unwrap_or_else(|| {
        use sha2::{Digest, Sha256};
        format!("{:x}", Sha256::digest(disc_id.as_bytes()))
    });
    let prefix = &cache_key[..cache_key.len().min(16)];
    let thumb_path = thumbs_dir.join(format!("{prefix}.jpg"));

    // Cached?
    if thumb_path.exists() {
        return Ok(Some(thumb_path.to_string_lossy().to_string()));
    }

    if media_type == "photo" {
        let result = generate_photo_thumbnail(media_path.clone(), thumb_path.clone()).await;
        return match result {
            Ok(()) => Ok(Some(thumb_path.to_string_lossy().to_string())),
            Err(()) => Ok(None),
        };
    }

    // Video path — extract a keyframe via bundled ffmpeg.
    let ffmpeg = match crate::media::ffmpeg::locate_ffmpeg(&app) {
        Ok(p) => p,
        Err(_) => return Ok(None), // ffmpeg missing → graceful fallback to gradient
    };
    let result = generate_video_thumbnail(ffmpeg, media_path.clone(), thumb_path.clone()).await;
    match result {
        Ok(()) => Ok(Some(thumb_path.to_string_lossy().to_string())),
        Err(()) => Ok(None),
    }
}

/// Decode the photo with the `image` crate and write a max-600px JPEG thumb.
async fn generate_photo_thumbnail(src: String, dst: PathBuf) -> Result<(), ()> {
    tokio::task::spawn_blocking(move || {
        let img = match image::open(&src) {
            Ok(im) => im,
            Err(e) => {
                tracing::warn!("photo thumbnail decode failed for {src}: {e}");
                return Err(());
            }
        };
        // `thumbnail` is fast nearest-style; quality fine at this size.
        let small = img.thumbnail(600, 600);
        let mut out = std::fs::File::create(&dst).map_err(|_| ())?;
        let mut enc = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, 80);
        let rgb = small.to_rgb8();
        enc.encode(&rgb, rgb.width(), rgb.height(), image::ExtendedColorType::Rgb8)
            .map_err(|e| {
                tracing::warn!("photo thumbnail encode failed: {e}");
            })?;
        Ok(())
    })
    .await
    .unwrap_or(Err(()))
}

/// Spawn ffmpeg to grab a single frame at ~1s and scale to 600px wide.
/// Uses fast pre-input seeking (`-ss` before `-i`) — accuracy isn't important
/// for a thumbnail and this is dramatically faster on long videos.
/// For videos shorter than the seek target, ffmpeg falls back to the last
/// frame automatically.
async fn generate_video_thumbnail(
    ffmpeg: PathBuf,
    src: String,
    dst: PathBuf,
) -> Result<(), ()> {
    use tokio::process::Command;

    // Attempt 1: seek to 1s. Good for typical home video / camcorder content
    // where the very first frame is often a black/sync frame.
    let attempt = |seek: &'static str| {
        let ffmpeg = ffmpeg.clone();
        let src = src.clone();
        let dst = dst.clone();
        async move {
            let status = Command::new(&ffmpeg)
                .args([
                    "-hide_banner",
                    "-loglevel", "error",
                    "-ss", seek,
                    "-i", &src,
                    "-vframes", "1",
                    "-vf", "scale='min(600,iw)':-2",
                    "-q:v", "5", // JPEG quality (2=best, 31=worst); 5 ≈ visually lossless thumb
                    "-y",
                    dst.to_str().unwrap_or(""),
                ])
                .stdin(std::process::Stdio::null())
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .status()
                .await;
            matches!(status, Ok(s) if s.success() && dst.exists() && dst.metadata().map(|m| m.len() > 0).unwrap_or(false))
        }
    };

    if attempt("00:00:01").await {
        return Ok(());
    }
    // Very short video — try seeking to 0.
    if attempt("00:00:00").await {
        return Ok(());
    }
    tracing::warn!("video thumbnail: ffmpeg failed to extract a frame from {src}");
    Err(())
}

/// Walk a directory (recursively, capped depth) and return all paths whose
/// extension is in the importable-media list. Used by the drag-drop handler
/// when the user drops a folder of home videos.
///
/// Cap: 5000 files / 8 dir levels. Beyond that we stop and return what we
/// have so a misclick on `C:\` doesn't freeze the UI.
#[tauri::command]
pub async fn list_importable_media_in_dir(dir: String) -> AppResult<Vec<String>> {
    const MAX_FILES: usize = 5000;
    const MAX_DEPTH: usize = 8;
    const EXTS: &[&str] = &[
        // video
        "mp4","mov","avi","mkv","mts","m2ts","ts","wmv","webm",
        // audio
        "wav","mp3","flac","m4a","aac","ogg","opus",
        // photo (v1 import support)
        "jpg","jpeg","png","heic","tiff","tif","webp","gif","bmp",
    ];

    fn walk(
        dir: &Path,
        depth: usize,
        max_depth: usize,
        max_files: usize,
        out: &mut Vec<String>,
    ) {
        if depth > max_depth || out.len() >= max_files {
            return;
        }
        let Ok(rd) = std::fs::read_dir(dir) else { return };
        for entry in rd.flatten() {
            if out.len() >= max_files {
                return;
            }
            let path = entry.path();
            let ft = match entry.file_type() {
                Ok(ft) => ft,
                Err(_) => continue,
            };
            // Skip hidden / system dirs to avoid recursing into Windows
            // `$RECYCLE.BIN`, `System Volume Information`, etc.
            if let Some(name) = path.file_name().and_then(|s| s.to_str()) {
                if name.starts_with('.') || name.starts_with('$') {
                    continue;
                }
            }
            if ft.is_dir() {
                walk(&path, depth + 1, max_depth, max_files, out);
            } else if ft.is_file() {
                let ext = path
                    .extension()
                    .and_then(|s| s.to_str())
                    .unwrap_or("")
                    .to_ascii_lowercase();
                if EXTS.iter().any(|e| *e == ext) {
                    out.push(path.to_string_lossy().to_string());
                }
            }
        }
    }

    let dir_path = PathBuf::from(&dir);
    let meta = tokio::fs::metadata(&dir_path).await.map_err(|e| {
        AppError::Internal(format!("Cannot read directory {}: {}", dir_path.display(), e))
    })?;
    if !meta.is_dir() {
        return Err(AppError::Internal(format!("Not a directory: {}", dir_path.display())));
    }

    let mut out = Vec::with_capacity(64);
    // CPU walk on a blocking task so we don't stall the async runtime.
    tokio::task::spawn_blocking(move || {
        walk(&dir_path, 0, MAX_DEPTH, MAX_FILES, &mut out);
        out
    })
    .await
    .map(Ok)
    .map_err(|e| AppError::Internal(format!("walk failed: {e}")))?
}

/// Inspect a file the user is about to import. Cheap — does not hash or copy.
/// Returns size, free-space check, and whether the current license permits the
/// import. The frontend calls this BEFORE `import_media_disc` so it can show
/// a "this will use ~X GB of disk space" confirmation and/or a paywall.
#[tauri::command]
pub async fn get_import_size_preview(
    app: AppHandle,
    media_path: String,
) -> AppResult<ImportPreview> {
    let path = PathBuf::from(&media_path);
    let meta = tokio::fs::metadata(&path).await.map_err(|e| {
        AppError::Internal(format!("Cannot read {}: {}", path.display(), e))
    })?;
    let size = meta.len();

    let vault = vault_dir(&app)?;
    // best-effort free-space check; ignore on platforms where it fails.
    let free = free_space_for(&vault).ok();
    let will_fit = free.map(|f| f >= size.saturating_add(64 * 1024 * 1024)).unwrap_or(true);

    let kind = classify_media(&media_path);

    let status = crate::licensing::current(&app_data_dir(&app));
    let gate = if status.can_import_media {
        ImportGate { allowed: true, required_plan: "archive", reason: None }
    } else {
        ImportGate {
            allowed: false,
            required_plan: "archive",
            reason: Some(format!(
                "Personal media import requires the Archive tier — your current plan is {}.",
                status.plan.display_name()
            )),
        }
    };

    Ok(ImportPreview {
        file_size: size,
        file_size_display: format_bytes(size),
        vault_free_space: free,
        will_fit,
        media_kind: kind,
        gate,
    })
}

/// Create a new library disc from a user-imported media file (video OR
/// audio). Returns `{ id, isDuplicate }`. When `isDuplicate` is true the
/// disc was already in the library (same SHA-256 content hash) and `id`
/// points to the existing entry — the frontend should navigate there
/// without re-enqueuing transcription.
///
/// Tier gate: requires Archive / Family / (legacy) Pro. Returns an error
/// otherwise so the frontend can show the paywall modal.
///
/// Vault semantics (2026-05-18): the source file is COPIED into the per-user
/// vault under `<app_data>/vault/<sha256-prefix>/<filename>` and the stored
/// `video_path` points to the vault copy. The user's original file is never
/// touched and may be moved or deleted afterward without breaking the library.
///
/// Audio inputs get a distinct (moodier) gradient palette so they're
/// visually distinguishable from video imports in the library grid.
#[tauri::command]
pub async fn import_media_disc(
    app: AppHandle,
    state: State<'_, AppState>,
    media_path: String,
    title: String,
    album_id: Option<String>,
) -> AppResult<ImportResult> {
    // ── 1. Tier gate ─────────────────────────────────────────────────────
    let license = crate::licensing::current(&app_data_dir(&app));
    if !license.can_import_media {
        return Err(AppError::Internal(format!(
            "import_blocked: Personal media import requires the Archive tier (current: {}).",
            license.plan.display_name()
        )));
    }

    // ── 2. Hash the source ───────────────────────────────────────────────
    // Stream-hash the source file. For large video files (4 GB+) this takes
    // ~5–10 s on an SSD — acceptable once per import, negligible vs. transcription.
    let hash = sha256_path(&media_path).await;

    // ── 3. Dedup short-circuit ───────────────────────────────────────────
    if let Some(ref h) = hash {
        if let Ok(Some(row)) = sqlx::query("SELECT id FROM library_discs WHERE source_hash = ? LIMIT 1")
            .bind(h)
            .fetch_optional(&state.db.pool)
            .await
        {
            if let Ok(existing_id) = row.try_get::<String, _>("id") {
                tracing::info!(
                    "import_media_disc: duplicate detected (hash {}) → existing disc {}",
                    &h[..16],
                    existing_id
                );
                return Ok(ImportResult { id: existing_id, is_duplicate: true });
            }
        }
    }

    // ── 4. Vault copy ─────────────────────────────────────────────────────
    // Stable: hash-derived path. Means a re-import after delete lands in the
    // same vault slot and doesn't grow the disk twice.
    let vault_root = vault_dir(&app)?;
    let prefix = hash.as_deref().unwrap_or("nohash");
    let prefix_short = &prefix[..prefix.len().min(16)];
    let filename = Path::new(&media_path)
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "imported".to_string());
    let vault_slot = vault_root.join(prefix_short);
    tokio::fs::create_dir_all(&vault_slot)
        .await
        .map_err(|e| AppError::Internal(format!("vault mkdir failed: {e}")))?;
    let vault_path = vault_slot.join(&filename);

    // If the exact target already exists with the same size, skip the copy
    // (idempotent — same hash means same bytes; saves a multi-GB recopy on retry).
    let need_copy = match tokio::fs::metadata(&vault_path).await {
        Ok(m) => {
            let src_len = tokio::fs::metadata(&media_path)
                .await
                .map(|s| s.len())
                .unwrap_or(0);
            m.len() != src_len
        }
        Err(_) => true,
    };
    if need_copy {
        tokio::fs::copy(&media_path, &vault_path).await.map_err(|e| {
            AppError::Internal(format!(
                "vault copy failed ({} → {}): {}",
                Path::new(&media_path).display(),
                vault_path.display(),
                e
            ))
        })?;
    }

    let vault_path_str = vault_path.to_string_lossy().to_string();

    // ── 5. Insert row pointing at the VAULT copy ─────────────────────────
    let now = Utc::now();
    let id = format!(
        "{}-{}",
        slugify(&title),
        &uuid::Uuid::new_v4().to_string()[..8]
    );

    let media_kind = classify_media(&media_path);

    // For photos, try to use the EXIF DateTimeOriginal so the year column
    // reflects when the photo was taken rather than when it was imported.
    // `now_ts` (used for created_at / updated_at) stays as wall-clock for
    // sort stability.
    let photo_date = if media_kind == "photo" {
        read_photo_taken_date(&media_path)
    } else {
        None
    };
    let date_ref = photo_date.as_ref().unwrap_or(&now);

    let year = date_ref.year() as i64;
    let date_display = format!("{} {}, {}", month_name(date_ref.month()), date_ref.day(), year);
    let recovered_at = format!("{} {}", short_month(date_ref.month()), date_ref.day());

    const VIDEO_GRADIENTS: [&str; 14] = [
        "wedding", "christmas", "hawaii", "birthday", "summer", "autumn",
        "winter", "spring", "graduation", "vacation", "family", "baby",
        "anniversary", "reunion",
    ];
    const AUDIO_GRADIENTS: [&str; 5] = [
        "eleanor", "christmas", "winter", "autumn", "anniversary",
    ];
    const PHOTO_GRADIENTS: [&str; 5] = [
        "summer", "autumn", "spring", "hawaii", "vacation",
    ];
    let palette: &[&str] = match media_kind {
        "audio" => &AUDIO_GRADIENTS,
        "photo" => &PHOTO_GRADIENTS,
        _ => &VIDEO_GRADIENTS,
    };
    let gradient = palette[(now.timestamp_subsec_nanos() as usize) % palette.len()];
    let monogram_id = ((title_hash(&title) % 8) + 1) as i64;
    let source = match media_kind {
        "audio" => "Imported audio",
        "photo" => "Imported photo",
        _ => "Imported video",
    };

    let now_ts = now.timestamp();
    sqlx::query(
        "INSERT INTO library_discs
         (id, title, year, date_display, filmed_by, location, source, status,
          duration_sec, duration_formatted, recovered_at, phrases_indexed,
          monogram_id, gradient, about, session_id, video_path, source_hash,
          media_type, album_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, NULL, ?, 'recovered', 0, '--:--', ?, 0,
                 ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&title)
    .bind(year)
    .bind(&date_display)
    .bind(source)
    .bind(&recovered_at)
    .bind(monogram_id)
    .bind(gradient)
    .bind(&vault_path_str)
    .bind(&hash)
    .bind(media_kind)
    .bind(&album_id)
    .bind(now_ts)
    .bind(now_ts)
    .execute(&state.db.pool)
    .await?;

    // If we just dropped a disc into an album and that album has no cover yet,
    // promote this disc to be the cover (deferred-init pattern — keeps the
    // album row simple at creation time).
    if let Some(album_id_ref) = album_id.as_deref() {
        let _ = sqlx::query(
            "UPDATE library_albums
             SET cover_disc_id = COALESCE(cover_disc_id, ?), updated_at = ?
             WHERE id = ?",
        )
        .bind(&id)
        .bind(now_ts)
        .bind(album_id_ref)
        .execute(&state.db.pool)
        .await;
    }

    // ── 6. Auto-enqueue transcription (video + audio only) ──────────────
    // CRITICAL: enqueue using the VAULT path, not the source path. If the
    // user deletes/moves the original after the import returns, the worker
    // would otherwise hit a "no such file" error mid-job. The vault copy
    // is stable for the lifetime of the disc row.
    //
    // Skipped for photos — no audio to transcribe. Failure on supported
    // types is non-fatal: the disc is already in the library and the user
    // can retry transcription from the disc page.
    if media_kind != "photo" {
        if let Err(e) = crate::transcription::queue::enqueue(
            &state.db.pool,
            &id,
            &vault_path_str,
            "stub",
            None,
        )
        .await
        {
            tracing::warn!(
                "import_media_disc: disc {} inserted but transcription enqueue failed: {}",
                id,
                e
            );
        }
    }

    Ok(ImportResult { id, is_duplicate: false })
}

/// Delete a disc from the library. If the disc's video_path lives inside the
/// vault dir (i.e. it was an imported file, not a recovered DVD), the vault
/// copy is removed too — and its parent hash-prefix dir is removed if empty.
///
/// Safety: vault-path check is strict — only files under `<app_data>/vault/`
/// are eligible for deletion. A recovered DVD whose video_path points at an
/// ISO output dir will leave that file alone; only the DB row goes.
///
/// CASCADE handles transcript lines / scenes / topics / people / transcription
/// jobs (all FK with ON DELETE CASCADE on library_discs.id).
#[tauri::command]
pub async fn delete_library_disc(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> AppResult<DeleteResult> {
    // 1. Look up the video_path before deleting so we know what to free on disk.
    let row = sqlx::query(
        "SELECT video_path, source_hash FROM library_discs WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(&state.db.pool)
    .await?;

    let Some(row) = row else {
        return Err(AppError::Internal(format!("disc not found: {id}")));
    };
    let video_path: Option<String> = row.try_get("video_path").ok().flatten();
    let source_hash: Option<String> = row.try_get("source_hash").ok().flatten();

    // 2. Delete the DB row — CASCADE clears the rest.
    let res = sqlx::query("DELETE FROM library_discs WHERE id = ?")
        .bind(&id)
        .execute(&state.db.pool)
        .await?;
    if res.rows_affected() == 0 {
        return Err(AppError::Internal(format!("disc not found: {id}")));
    }

    // 3. If the video_path is inside the vault dir, delete the file and try to
    //    prune the (now likely empty) hash-prefix directory.
    let mut bytes_freed: u64 = 0;
    let mut vault_file_removed = false;
    if let Some(path_str) = video_path.as_deref() {
        let vault = vault_dir(&app)?;
        let p = Path::new(path_str);
        // Canonicalize both sides where possible so we compare resolved paths
        // and aren't fooled by ../ or symlinks.
        let inside_vault = match (p.canonicalize(), vault.canonicalize()) {
            (Ok(p), Ok(v)) => p.starts_with(&v),
            _ => p.starts_with(&vault), // fallback if canonicalize fails
        };
        if inside_vault {
            if let Ok(meta) = std::fs::metadata(p) {
                bytes_freed = meta.len();
            }
            if std::fs::remove_file(p).is_ok() {
                vault_file_removed = true;
                // Try to prune the parent (the hash-prefix dir). Ignore errors;
                // remove_dir only succeeds if empty, which is the safe case.
                if let Some(parent) = p.parent() {
                    let _ = std::fs::remove_dir(parent);
                }
            }
        }
    }

    // Also GC the cached thumbnail (if any). Thumb path is deterministic
    // from source_hash, so we can compute it without another DB lookup.
    // Failure is silent — orphan thumbs are cosmetic, not correctness.
    if let Some(h) = source_hash.as_deref() {
        let prefix = &h[..h.len().min(16)];
        let thumb = vault_dir(&app).ok().map(|v| v.join("thumbs").join(format!("{prefix}.jpg")));
        if let Some(t) = thumb {
            if t.exists() {
                if let Ok(meta) = std::fs::metadata(&t) {
                    bytes_freed = bytes_freed.saturating_add(meta.len());
                }
                let _ = std::fs::remove_file(&t);
            }
        }
    }

    Ok(DeleteResult {
        id,
        vault_file_removed,
        bytes_freed,
    })
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteResult {
    pub id: String,
    pub vault_file_removed: bool,
    pub bytes_freed: u64,
}

/// Aggregate vault stats — file count, bytes used, bytes free on the volume.
/// Powers a "Storage" panel in Settings and informs the user how much space
/// their imported memories are taking.
#[tauri::command]
pub async fn get_vault_stats(app: AppHandle) -> AppResult<VaultStats> {
    let vault = vault_dir(&app)?;
    let (file_count, bytes_used) = walk_vault_size(&vault);
    let bytes_free = free_space_for(&vault).ok();

    Ok(VaultStats {
        vault_path: vault.to_string_lossy().to_string(),
        file_count,
        bytes_used,
        bytes_used_display: format_bytes(bytes_used),
        bytes_free,
        bytes_free_display: bytes_free.map(format_bytes),
    })
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultStats {
    pub vault_path: String,
    pub file_count: u64,
    pub bytes_used: u64,
    pub bytes_used_display: String,
    pub bytes_free: Option<u64>,
    pub bytes_free_display: Option<String>,
}

/// Walk the vault dir recursively and sum file sizes. Bounded by the depth
/// of the hash-prefix dirs (always exactly 1 level deep) so this is cheap
/// even on a vault with tens of thousands of entries.
///
/// Skips the `thumbs/` subdir — those are a transparent cache the user
/// shouldn't think about, and including them double-counts photos.
fn walk_vault_size(root: &Path) -> (u64, u64) {
    let mut count: u64 = 0;
    let mut bytes: u64 = 0;
    let read_dir = match std::fs::read_dir(root) {
        Ok(rd) => rd,
        Err(_) => return (0, 0),
    };
    for entry in read_dir.flatten() {
        let path = entry.path();
        // Skip the thumbnail cache from user-facing stats.
        if path.file_name().and_then(|s| s.to_str()) == Some("thumbs") {
            continue;
        }
        if let Ok(ft) = entry.file_type() {
            if ft.is_dir() {
                // One level deeper — the hash-prefix subfolder.
                if let Ok(inner) = std::fs::read_dir(&path) {
                    for sub in inner.flatten() {
                        if let Ok(meta) = sub.metadata() {
                            if meta.is_file() {
                                count += 1;
                                bytes += meta.len();
                            }
                        }
                    }
                }
            } else if ft.is_file() {
                // Loose file directly under vault root (shouldn't happen, but tolerate).
                if let Ok(meta) = entry.metadata() {
                    count += 1;
                    bytes += meta.len();
                }
            }
        }
    }
    (count, bytes)
}

// ─── Vault helpers ──────────────────────────────────────────────────────────

fn app_data_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
}

fn vault_dir(app: &AppHandle) -> AppResult<PathBuf> {
    let dir = app_data_dir(app).join("vault");
    std::fs::create_dir_all(&dir)
        .map_err(|e| AppError::Internal(format!("vault dir create failed: {e}")))?;
    Ok(dir)
}

/// Best-effort free-space query. Returns None on platforms where the syscall
/// fails; callers should treat None as "unknown — proceed but warn".
fn free_space_for(path: &Path) -> std::io::Result<u64> {
    // Walk up to the first existing ancestor (vault dir may not yet exist).
    let mut cur = path.to_path_buf();
    while !cur.exists() {
        if !cur.pop() {
            break;
        }
    }
    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;
        use std::ptr::null_mut;
        let mut wide: Vec<u16> = cur.as_os_str().encode_wide().collect();
        wide.push(0);
        let mut free_bytes: u64 = 0;
        // SAFETY: passing valid wide-null-terminated path and out-pointer.
        let ok = unsafe {
            #[link(name = "kernel32")]
            extern "system" {
                fn GetDiskFreeSpaceExW(
                    lpDirectoryName: *const u16,
                    lpFreeBytesAvailable: *mut u64,
                    lpTotalNumberOfBytes: *mut u64,
                    lpTotalNumberOfFreeBytes: *mut u64,
                ) -> i32;
            }
            GetDiskFreeSpaceExW(wide.as_ptr(), &mut free_bytes, null_mut(), null_mut())
        };
        if ok != 0 {
            Ok(free_bytes)
        } else {
            Err(std::io::Error::last_os_error())
        }
    }
    #[cfg(not(windows))]
    {
        // Not implemented on non-Windows in this slice — Heirvo ships Windows-only today.
        let _ = cur;
        Err(std::io::Error::new(std::io::ErrorKind::Other, "unsupported"))
    }
}

fn format_bytes(n: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    if n >= GB {
        format!("{:.2} GB", n as f64 / GB as f64)
    } else if n >= MB {
        format!("{:.1} MB", n as f64 / MB as f64)
    } else if n >= KB {
        format!("{:.1} KB", n as f64 / KB as f64)
    } else {
        format!("{} B", n)
    }
}

/// SHA-256 of a file, streamed in 64 KB blocks. Returns None on any I/O error
/// (missing file, permissions, etc.) — callers treat None as "unknown hash"
/// and skip the dedup check rather than failing the import.
async fn sha256_path(path: &str) -> Option<String> {
    use sha2::{Digest, Sha256};
    use tokio::io::AsyncReadExt;

    let mut f = tokio::fs::File::open(path).await.ok()?;
    let mut hasher = Sha256::new();
    let mut buf = vec![0u8; 65536];
    loop {
        let n = f.read(&mut buf).await.ok()?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Some(format!("{:x}", hasher.finalize()))
}

/// Backwards-compat: legacy IPC name still used by older builds of the UI.
/// Thin wrapper around `import_media_disc`.
#[tauri::command]
pub async fn import_video_disc(
    app: AppHandle,
    state: State<'_, AppState>,
    video_path: String,
    title: String,
) -> AppResult<ImportResult> {
    import_media_disc(app, state, video_path, title, None).await
}

/// Read the photo's EXIF DateTimeOriginal (or DateTimeDigitized as fallback).
/// Returns None when the file is not a photo, has no EXIF, or the date
/// can't be parsed. Failure is benign — the caller falls back to wall-clock.
fn read_photo_taken_date(path: &str) -> Option<chrono::DateTime<chrono::Utc>> {
    use exif::{In, Reader, Tag};

    let file = std::fs::File::open(path).ok()?;
    let mut bufreader = std::io::BufReader::new(file);
    let exif = Reader::new().read_from_container(&mut bufreader).ok()?;

    // Prefer DateTimeOriginal (when the shutter fired); fall back to
    // DateTimeDigitized (when it was scanned/digitised).
    let tags = [Tag::DateTimeOriginal, Tag::DateTimeDigitized];
    for tag in &tags {
        if let Some(field) = exif.get_field(*tag, In::PRIMARY) {
            let raw = field.display_value().to_string();
            // EXIF date format: "YYYY:MM:DD HH:MM:SS"
            if let Ok(ndt) = chrono::NaiveDateTime::parse_from_str(&raw, "%Y:%m:%d %H:%M:%S") {
                return Some(ndt.and_utc());
            }
        }
    }
    None
}

/// Classify an import path into a media_type kind. Unknown extensions fall
/// back to "video" so the picker filter is the real gate; this only
/// distinguishes within already-accepted files.
fn classify_media(path: &str) -> &'static str {
    let ext = path
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();
    match ext.as_str() {
        // photo
        "jpg" | "jpeg" | "png" | "heic" | "tiff" | "tif" | "webp" | "gif" | "bmp" => "photo",
        // audio
        "wav" | "mp3" | "flac" | "m4a" | "aac" | "ogg" | "opus" => "audio",
        // video (default)
        _ => "video",
    }
}

fn slugify(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut last_dash = true;
    for c in s.chars() {
        if c.is_ascii_alphanumeric() {
            out.push(c.to_ascii_lowercase());
            last_dash = false;
        } else if !last_dash {
            out.push('-');
            last_dash = true;
        }
    }
    let trimmed = out.trim_matches('-').to_string();
    if trimmed.is_empty() {
        "imported".into()
    } else {
        trimmed
    }
}

fn title_hash(s: &str) -> u64 {
    let mut h: u64 = 5381;
    for b in s.bytes() {
        h = h.wrapping_mul(33).wrapping_add(b as u64);
    }
    h
}

fn month_name(m: u32) -> &'static str {
    match m {
        1 => "January", 2 => "February", 3 => "March", 4 => "April",
        5 => "May", 6 => "June", 7 => "July", 8 => "August",
        9 => "September", 10 => "October", 11 => "November", _ => "December",
    }
}

fn short_month(m: u32) -> &'static str {
    match m {
        1 => "Jan", 2 => "Feb", 3 => "Mar", 4 => "Apr",
        5 => "May", 6 => "Jun", 7 => "Jul", 8 => "Aug",
        9 => "Sep", 10 => "Oct", 11 => "Nov", _ => "Dec",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A missing file path must return None — not panic or propagate an error.
    #[test]
    fn read_photo_taken_date_missing_file_returns_none() {
        assert!(
            read_photo_taken_date("/nonexistent/path/photo.jpg").is_none(),
            "Expected None for a missing file"
        );
    }

    /// An empty string path must return None gracefully.
    #[test]
    fn read_photo_taken_date_empty_path_returns_none() {
        assert!(
            read_photo_taken_date("").is_none(),
            "Expected None for an empty path"
        );
    }

    /// Verify the EXIF date format string parses correctly.
    /// "YYYY:MM:DD HH:MM:SS" is the standard EXIF ASCII date format.
    #[test]
    fn exif_date_format_parses_correctly() {
        use chrono::NaiveDateTime;
        let raw = "1995:06:15 14:30:00";
        let ndt = NaiveDateTime::parse_from_str(raw, "%Y:%m:%d %H:%M:%S")
            .expect("EXIF date format should parse");
        let utc = ndt.and_utc();
        assert_eq!(utc.year(), 1995);
        assert_eq!(utc.month(), 6);
        assert_eq!(utc.day(), 15);
    }

    /// Malformed EXIF date strings must produce None, not a panic.
    #[test]
    fn exif_date_format_rejects_malformed() {
        use chrono::NaiveDateTime;
        let bad = "not-a-date";
        assert!(
            NaiveDateTime::parse_from_str(bad, "%Y:%m:%d %H:%M:%S").is_err(),
            "Malformed string should fail to parse"
        );
    }
}
