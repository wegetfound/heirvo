//! Library — Tauri IPC commands for the recovered-disc archive.

use crate::error::AppResult;
use crate::library::queries;
use crate::library::seed;
use crate::library::types::{Disc, SearchHit};
use crate::state::AppState;
use chrono::{Datelike, Utc};
use sqlx::Row;
use tauri::State;

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

/// Create a new library disc from a user-imported media file (video OR
/// audio). Returns `{ id, isDuplicate }`. When `isDuplicate` is true the
/// disc was already in the library (same SHA-256 content hash) and `id`
/// points to the existing entry — the frontend should navigate there
/// without re-enqueuing transcription.
///
/// Audio inputs get a distinct (moodier) gradient palette so they're
/// visually distinguishable from video imports in the library grid.
#[tauri::command]
pub async fn import_media_disc(
    state: State<'_, AppState>,
    media_path: String,
    title: String,
) -> AppResult<ImportResult> {
    // Stream-hash the source file. For large video files (4 GB+) this takes
    // ~5–10 s on an SSD — acceptable once per import, negligible vs. transcription.
    let hash = sha256_path(&media_path).await;

    // If we already have a disc with this hash, return it immediately.
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

    let now = Utc::now();
    let id = format!(
        "{}-{}",
        slugify(&title),
        &uuid::Uuid::new_v4().to_string()[..8]
    );
    let year = now.year() as i64;
    let date_display = format!("{} {}, {}", month_name(now.month()), now.day(), year);
    let recovered_at = format!("{} {}", short_month(now.month()), now.day());

    let is_audio = is_audio_ext(&media_path);

    const VIDEO_GRADIENTS: [&str; 14] = [
        "wedding", "christmas", "hawaii", "birthday", "summer", "autumn",
        "winter", "spring", "graduation", "vacation", "family", "baby",
        "anniversary", "reunion",
    ];
    const AUDIO_GRADIENTS: [&str; 5] = [
        "eleanor", "christmas", "winter", "autumn", "anniversary",
    ];
    let palette: &[&str] = if is_audio { &AUDIO_GRADIENTS } else { &VIDEO_GRADIENTS };
    let gradient = palette[(now.timestamp_subsec_nanos() as usize) % palette.len()];
    let monogram_id = ((title_hash(&title) % 8) + 1) as i64;
    let source = if is_audio { "Imported audio" } else { "Imported video" };

    let now_ts = now.timestamp();
    sqlx::query(
        "INSERT INTO library_discs
         (id, title, year, date_display, filmed_by, location, source, status,
          duration_sec, duration_formatted, recovered_at, phrases_indexed,
          monogram_id, gradient, about, session_id, video_path, source_hash,
          created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, NULL, ?, 'recovered', 0, '--:--', ?, 0,
                 ?, ?, NULL, NULL, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&title)
    .bind(year)
    .bind(&date_display)
    .bind(source)
    .bind(&recovered_at)
    .bind(monogram_id)
    .bind(gradient)
    .bind(&media_path)
    .bind(&hash)
    .bind(now_ts)
    .bind(now_ts)
    .execute(&state.db.pool)
    .await?;

    Ok(ImportResult { id, is_duplicate: false })
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
    state: State<'_, AppState>,
    video_path: String,
    title: String,
) -> AppResult<ImportResult> {
    import_media_disc(state, video_path, title).await
}

fn is_audio_ext(path: &str) -> bool {
    let ext = path
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();
    matches!(
        ext.as_str(),
        "wav" | "mp3" | "flac" | "m4a" | "aac" | "ogg" | "opus"
    )
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
