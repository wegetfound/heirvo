//! Album CRUD — group related imports under one library card.
//!
//! Albums are the answer to "I dropped a folder of 200 wedding photos and now
//! my library is unscrollable." The frontend's folder-drop handler creates an
//! album from the source folder's name and tags each imported disc with the
//! resulting album id.
//!
//! Lifecycle:
//! - `create_album(title)` → returns the new id (slug + 8 random chars)
//! - `list_albums()` → all albums with cover thumb + member count, newest first
//! - `get_album_with_discs(id)` → album + ordered list of member discs
//! - `rename_album(id, title)` → just updates the title + updated_at
//! - `delete_album(id, also_delete_members)` →
//!     false (default): un-groups (album_id=NULL on members); CASCADE drops album row
//!     true: walks members → delete_library_disc each → drops album row

use crate::error::{AppError, AppResult};
use crate::library::queries;
use crate::library::types::Disc;
use crate::state::AppState;
use chrono::Utc;
use serde::Serialize;
use sqlx::Row;
use tauri::{AppHandle, State};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Album {
    pub id: String,
    pub title: String,
    pub cover_disc_id: Option<String>,
    pub disc_count: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AlbumWithDiscs {
    #[serde(flatten)]
    pub album: Album,
    pub discs: Vec<Disc>,
}

#[tauri::command]
pub async fn create_album(
    state: State<'_, AppState>,
    title: String,
) -> AppResult<Album> {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        return Err(AppError::Internal("album title cannot be empty".into()));
    }
    let now = Utc::now().timestamp();
    let id = format!(
        "{}-{}",
        slugify(trimmed),
        &uuid::Uuid::new_v4().to_string()[..8]
    );
    sqlx::query(
        "INSERT INTO library_albums (id, title, cover_disc_id, created_at, updated_at)
         VALUES (?, ?, NULL, ?, ?)",
    )
    .bind(&id)
    .bind(trimmed)
    .bind(now)
    .bind(now)
    .execute(&state.db.pool)
    .await?;
    Ok(Album {
        id,
        title: trimmed.to_string(),
        cover_disc_id: None,
        disc_count: 0,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
pub async fn list_albums(state: State<'_, AppState>) -> AppResult<Vec<Album>> {
    // Join in a count of members so the UI can render "47 photos" without a
    // second round-trip per album. cover_disc_id is whatever the album row
    // stores; if NULL the frontend falls back to the first member's thumb.
    let rows = sqlx::query(
        "SELECT a.id, a.title, a.cover_disc_id, a.created_at, a.updated_at,
                COUNT(d.id) AS disc_count
         FROM library_albums a
         LEFT JOIN library_discs d ON d.album_id = a.id
         GROUP BY a.id
         ORDER BY a.updated_at DESC, a.created_at DESC",
    )
    .fetch_all(&state.db.pool)
    .await?;

    let mut out = Vec::with_capacity(rows.len());
    for row in rows {
        out.push(Album {
            id: row.try_get("id")?,
            title: row.try_get("title")?,
            cover_disc_id: row
                .try_get::<Option<String>, _>("cover_disc_id")
                .ok()
                .flatten(),
            disc_count: row.try_get("disc_count")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        });
    }
    Ok(out)
}

#[tauri::command]
pub async fn get_album_with_discs(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<Option<AlbumWithDiscs>> {
    let Some(row) = sqlx::query(
        "SELECT id, title, cover_disc_id, created_at, updated_at FROM library_albums WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(&state.db.pool)
    .await?
    else {
        return Ok(None);
    };

    // Member disc IDs in stable order (oldest first → preserves import order).
    let disc_rows = sqlx::query(
        "SELECT id FROM library_discs WHERE album_id = ? ORDER BY created_at ASC, id ASC",
    )
    .bind(&id)
    .fetch_all(&state.db.pool)
    .await?;

    let mut discs = Vec::with_capacity(disc_rows.len());
    for r in &disc_rows {
        let did: String = r.try_get("id")?;
        if let Some(d) = queries::get_disc(&state.db, &did).await? {
            discs.push(d);
        }
    }

    let album = Album {
        id: row.try_get("id")?,
        title: row.try_get("title")?,
        cover_disc_id: row
            .try_get::<Option<String>, _>("cover_disc_id")
            .ok()
            .flatten(),
        disc_count: discs.len() as i64,
        created_at: row.try_get("created_at")?,
        updated_at: row.try_get("updated_at")?,
    };

    Ok(Some(AlbumWithDiscs { album, discs }))
}

/// Set the cover disc for an album. The disc must already be a member of
/// the album — silently rejects mismatched disc/album pairs rather than
/// allowing arbitrary disc references (defense against UI bugs that could
/// "borrow" another album's photo as a cover).
#[tauri::command]
pub async fn set_album_cover(
    state: State<'_, AppState>,
    album_id: String,
    disc_id: String,
) -> AppResult<()> {
    // Verify membership before updating.
    let row = sqlx::query("SELECT album_id FROM library_discs WHERE id = ?")
        .bind(&disc_id)
        .fetch_optional(&state.db.pool)
        .await?;
    let Some(row) = row else {
        return Err(AppError::Internal(format!("disc not found: {disc_id}")));
    };
    let member_album: Option<String> = row.try_get("album_id").ok().flatten();
    if member_album.as_deref() != Some(album_id.as_str()) {
        return Err(AppError::Internal(
            "disc is not a member of this album".into(),
        ));
    }
    let now = Utc::now().timestamp();
    sqlx::query(
        "UPDATE library_albums SET cover_disc_id = ?, updated_at = ? WHERE id = ?",
    )
    .bind(&disc_id)
    .bind(now)
    .bind(&album_id)
    .execute(&state.db.pool)
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn rename_album(
    state: State<'_, AppState>,
    id: String,
    title: String,
) -> AppResult<()> {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        return Err(AppError::Internal("album title cannot be empty".into()));
    }
    let now = Utc::now().timestamp();
    let res = sqlx::query(
        "UPDATE library_albums SET title = ?, updated_at = ? WHERE id = ?",
    )
    .bind(trimmed)
    .bind(now)
    .bind(&id)
    .execute(&state.db.pool)
    .await?;
    if res.rows_affected() == 0 {
        return Err(AppError::Internal(format!("album not found: {id}")));
    }
    Ok(())
}

/// Delete an album. By default this is non-destructive: member discs survive
/// (their album_id is set NULL by the FK rule). Pass `delete_members: true`
/// to also delete each member disc — used when the user wants to fully purge.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteAlbumResult {
    pub id: String,
    pub members_removed: u32,
    pub bytes_freed: u64,
}

#[tauri::command]
pub async fn delete_album(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
    delete_members: bool,
) -> AppResult<DeleteAlbumResult> {
    let mut members_removed = 0u32;
    let mut bytes_freed: u64 = 0;

    if delete_members {
        // Snapshot member ids first; deleting each will null its album_id.
        let rows = sqlx::query("SELECT id FROM library_discs WHERE album_id = ?")
            .bind(&id)
            .fetch_all(&state.db.pool)
            .await?;
        for r in rows {
            let did: String = r.try_get("id")?;
            // Reuse the disc deletion path so vault cleanup runs.
            // `permanent = true` because the user explicitly chose "delete
            // album and members" — remove the Documents\Heirvo copy too.
            match crate::commands::library::delete_library_disc(
                app.clone(),
                state.clone(),
                did,
                true,
            )
            .await
            {
                Ok(r) => {
                    members_removed += 1;
                    bytes_freed += r.bytes_freed;
                }
                Err(e) => tracing::warn!("delete_album: member delete failed: {e}"),
            }
        }
    }

    let res = sqlx::query("DELETE FROM library_albums WHERE id = ?")
        .bind(&id)
        .execute(&state.db.pool)
        .await?;
    if res.rows_affected() == 0 {
        return Err(AppError::Internal(format!("album not found: {id}")));
    }

    Ok(DeleteAlbumResult {
        id,
        members_removed,
        bytes_freed,
    })
}

/// Manually add a disc to an album (drag-and-drop reorganization).
#[tauri::command]
pub async fn add_disc_to_album(
    state: State<'_, AppState>,
    disc_id: String,
    album_id: String,
) -> AppResult<()> {
    let res = sqlx::query("UPDATE library_discs SET album_id = ? WHERE id = ?")
        .bind(&album_id)
        .bind(&disc_id)
        .execute(&state.db.pool)
        .await?;
    if res.rows_affected() == 0 {
        return Err(AppError::Internal(format!("disc not found: {disc_id}")));
    }
    Ok(())
}

/// Remove a disc from its album (sets album_id = NULL). The disc itself stays.
#[tauri::command]
pub async fn remove_disc_from_album(
    state: State<'_, AppState>,
    disc_id: String,
) -> AppResult<()> {
    sqlx::query("UPDATE library_discs SET album_id = NULL WHERE id = ?")
        .bind(&disc_id)
        .execute(&state.db.pool)
        .await?;
    Ok(())
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
    if trimmed.is_empty() { "album".into() } else { trimmed }
}
