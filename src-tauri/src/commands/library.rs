//! Library — Tauri IPC commands for the recovered-disc archive.

use crate::error::AppResult;
use crate::library::queries;
use crate::library::seed;
use crate::library::types::{Disc, SearchHit};
use crate::state::AppState;
use chrono::{Datelike, Utc};
use tauri::State;

#[tauri::command]
pub async fn list_library_discs(state: State<'_, AppState>) -> AppResult<Vec<Disc>> {
    queries::list_discs(&state.db).await
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

/// Create a new library disc from a user-imported video file. Returns the
/// new disc id. The frontend follows up with `enqueue_transcription` to kick
/// off audio extraction + transcription against the same `video_path`.
#[tauri::command]
pub async fn import_video_disc(
    state: State<'_, AppState>,
    video_path: String,
    title: String,
) -> AppResult<String> {
    let now = Utc::now();
    let id = format!(
        "{}-{}",
        slugify(&title),
        &uuid::Uuid::new_v4().to_string()[..8]
    );
    let year = now.year() as i64;
    let date_display = format!("{} {}, {}", month_name(now.month()), now.day(), year);
    let recovered_at = format!("{} {}", short_month(now.month()), now.day());

    const GRADIENTS: [&str; 14] = [
        "wedding", "christmas", "hawaii", "birthday", "summer", "autumn",
        "winter", "spring", "graduation", "vacation", "family", "baby",
        "anniversary", "reunion",
    ];
    let gradient = GRADIENTS[(now.timestamp_subsec_nanos() as usize) % GRADIENTS.len()];
    let monogram_id = ((title_hash(&title) % 8) + 1) as i64;

    let now_ts = now.timestamp();
    sqlx::query(
        "INSERT INTO library_discs
         (id, title, year, date_display, filmed_by, location, source, status,
          duration_sec, duration_formatted, recovered_at, phrases_indexed,
          monogram_id, gradient, about, session_id, video_path,
          created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, NULL, ?, 'recovered', 0, '--:--', ?, 0,
                 ?, ?, NULL, NULL, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&title)
    .bind(year)
    .bind(&date_display)
    .bind("Imported video")
    .bind(&recovered_at)
    .bind(monogram_id)
    .bind(gradient)
    .bind(&video_path)
    .bind(now_ts)
    .bind(now_ts)
    .execute(&state.db.pool)
    .await?;

    Ok(id)
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
