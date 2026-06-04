//! Recovery → Library bridge.
//!
//! `promote_session_to_library` is the single entry-point called
//! **non-fatally** from `commands::recovery` (inside the `block_on`, only when
//! the session completed successfully). A failure here must NOT fail recovery
//! or block the `recovery:complete` event.

use crate::error::{AppError, AppResult};
use crate::library::types::{Disc, PhotoAsset};
use crate::media::image::{
    classify_image_extension, special_format_reason, ImageFormatClass, SpecialFormat,
};
use crate::session::db::Db;
use crate::session::manager;
use chrono::{Datelike, Utc};
use sqlx::Row;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

// ── Sentinel tint names for unconvertible photo tiles ───────────────────────
const UNCONVERTIBLE_TINT: &str = "autumn";

// ── Photo gradient palette ───────────────────────────────────────────────────
const PHOTO_GRADIENTS: [&str; 5] = ["summer", "autumn", "spring", "hawaii", "vacation"];
const VIDEO_GRADIENTS: [&str; 14] = [
    "wedding", "christmas", "hawaii", "birthday", "summer", "autumn",
    "winter", "spring", "graduation", "vacation", "family", "baby",
    "anniversary", "reunion",
];
const AUDIO_GRADIENTS: [&str; 5] = ["eleanor", "christmas", "winter", "autumn", "anniversary"];

// ── Event payload structs ────────────────────────────────────────────────────

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DiscAddedPayload {
    disc_id: String,
    needs_normalization: bool,
    video_path: Option<String>,
}

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PromoteProgressPayload {
    session_id: String,
    done: usize,
    total: usize,
}

// ── Entry point ──────────────────────────────────────────────────────────────

/// Promote a completed recovery session to a library disc.
///
/// Returns the new disc's `id` on success, or an error (which the caller logs
/// and discards — this is non-fatal with respect to the `recovery:complete`
/// event).
pub async fn promote_session_to_library(
    app: &AppHandle,
    db: &Db,
    session_id: Uuid,
) -> AppResult<String> {
    // ── 1. Re-promotion guard ────────────────────────────────────────────
    // The unique index on library_discs(session_id) prevents races, but we
    // check first so we can return the existing disc id cleanly.
    let existing = sqlx::query(
        "SELECT id FROM library_discs WHERE session_id = ? LIMIT 1",
    )
    .bind(session_id.to_string())
    .fetch_optional(&db.pool)
    .await?;

    if let Some(row) = existing {
        let id: String = row.try_get("id")?;
        tracing::info!(
            "promote_session_to_library: session {} already promoted → disc {id}",
            session_id
        );
        return Ok(id);
    }

    // ── 2. Load session ──────────────────────────────────────────────────
    let session = manager::get(db, session_id).await?;

    // ── 3. Query output_files for produced files ─────────────────────────
    let output_rows = sqlx::query(
        "SELECT file_type, path FROM output_files WHERE session_id = ? ORDER BY id ASC",
    )
    .bind(session_id.to_string())
    .fetch_all(&db.pool)
    .await?;

    let mut mp4_path: Option<String> = None;
    let mut iso_path: Option<String> = None;
    let mut wav_path: Option<String> = None;

    for row in &output_rows {
        let file_type: String = row.try_get("file_type")?;
        let path: String = row.try_get("path")?;
        match file_type.as_str() {
            "mp4" => {
                if mp4_path.is_none() {
                    mp4_path = Some(path);
                }
            }
            "iso" => {
                if iso_path.is_none() {
                    iso_path = Some(path);
                }
            }
            "wav" => {
                if wav_path.is_none() {
                    wav_path = Some(path);
                }
            }
            _ => {}
        }
    }

    // ── 4. Disk-scan fallback ────────────────────────────────────────────
    // `extract_all_files` and `extract_audio_tracks` currently do not write
    // to output_files — scan the output dir as a fallback.
    // TODO: fix those commands to write output_files rows.
    let output_dir = PathBuf::from(&session.output_dir);
    if mp4_path.is_none() && iso_path.is_none() && wav_path.is_none() {
        scan_output_dir(&output_dir, &mut mp4_path, &mut iso_path, &mut wav_path);
    }

    // ── 5. Classify media_type ───────────────────────────────────────────
    let disc_type = session.disc_type.as_deref().unwrap_or("Unknown");
    let is_cd = disc_type == "Cd";

    // Gather images from the output dir for photo detection.
    let image_files = if is_cd {
        collect_images(&output_dir)
    } else {
        Vec::new()
    };

    let media_type = if mp4_path.is_some() || iso_path.is_some() {
        "video"
    } else if wav_path.is_some() {
        "audio"
    } else if is_cd && !image_files.is_empty() {
        "photo"
    } else {
        "video" // default
    };

    // ── 6. Set video_path ────────────────────────────────────────────────
    let video_path: Option<String> = match media_type {
        "video" => mp4_path.clone().or_else(|| iso_path.clone()),
        "audio" => wav_path.clone(),
        "photo" => {
            // Single photo → video_path points to the image; gallery (N>1) → None
            if image_files.len() == 1 {
                Some(image_files[0].to_string_lossy().to_string())
            } else {
                None
            }
        }
        _ => None,
    };

    // ── 7. Build disc id + metadata ──────────────────────────────────────
    let now = Utc::now();
    let now_ts = now.timestamp();

    // Title: prefer user_label → disc_label.
    let title = session
        .user_label
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| session.disc_label.as_str())
        .to_string();

    let year = now.year() as i64;
    let date_display = format!("{} {}, {}", month_name(now.month()), now.day(), year);
    let recovered_at = format!("{} {}", short_month(now.month()), now.day());

    let palette: &[&str] = match media_type {
        "audio" => &AUDIO_GRADIENTS,
        "photo" => &PHOTO_GRADIENTS,
        _ => &VIDEO_GRADIENTS,
    };
    let gradient = palette[(now_ts.unsigned_abs() as usize) % palette.len()];
    let monogram_id = ((title_hash(&title) % 8) + 1) as i64;

    let source = match disc_type {
        "DvdVideo" => "Recovered DVD Video",
        "DvdAudio" => "Recovered DVD Audio",
        "Cd" => "Recovered CD",
        "DvdRom" => "Recovered DVD-ROM",
        "Bluray" => "Recovered Blu-ray",
        _ => "Recovered disc",
    };

    // A recovered video whose file isn't a webview-playable MP4 yet still needs
    // normalization (re-encode to H.264). Mark it "recovering" so the UI shows a
    // "getting your video ready" state; the frontend flips it to its final status
    // once normalize_for_playback completes. Otherwise use the recovered/partial
    // result from the sector map.
    //
    // If this is a video or audio disc but NO playable file was produced (e.g.
    // the recovery process was interrupted before any output was written), we
    // mark it "incomplete" so the user sees an honest, actionable message rather
    // than a false "recovered" badge with nothing to play.
    let needs_normalization = media_type == "video" && video_path.is_some();
    let has_video_path = video_path.is_some();
    let status = if needs_normalization {
        "recovering".to_string()
    } else {
        let sector_status = check_partial_status(db, session_id).await;
        let is_partial = sector_status == "partial";
        resolve_status(media_type, has_video_path, is_partial).to_string()
    };

    let disc_id = format!("{}-{}", slugify(&title), &Uuid::new_v4().to_string()[..8]);

    // ── 8. Convert photo set and build disc_photos rows ──────────────────
    let photo_assets: Option<Vec<_>> = if media_type == "photo" && image_files.len() > 1 {
        let vault = vault_dir(app)?;
        let safe_prefix = &disc_id[..disc_id.len().min(16)];
        let photos_dir = vault.join("vault").join(safe_prefix).join("photos");
        std::fs::create_dir_all(&photos_dir)
            .map_err(|e| AppError::Internal(format!("photos dir create failed: {e}")))?;

        let total = image_files.len();
        let mut assets: Vec<PhotoAsset> = Vec::with_capacity(total);

        // Concurrency: ≤4 blocking tasks at a time.
        let semaphore = std::sync::Arc::new(tokio::sync::Semaphore::new(4));

        // Locate ImageMagick once (used only for .pcd photos) rather than
        // re-scanning resource dirs + PATH on every loop iteration.
        let magick_bin = crate::media::imagemagick::locate(app);

        for (i, src_path) in image_files.iter().enumerate() {
            let ext = src_path
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_ascii_lowercase();

            match classify_image_extension(&ext) {
                ImageFormatClass::SpecialFormat(SpecialFormat::Pcd) => {
                    // Attempt conversion via ImageMagick if available.
                    let dst = photos_dir.join(format!("{:04}.jpg", i));
                    if let Some(magick_bin) = magick_bin.as_ref() {
                        match crate::media::imagemagick::pcd_to_jpeg(
                            magick_bin,
                            src_path,
                            &dst,
                            2, // 768×512 gallery resolution
                        )
                        .await
                        {
                            Ok(()) => {
                                assets.push(PhotoAsset {
                                    path: Some(dst.to_string_lossy().to_string()),
                                    caption: None,
                                    tint: None,
                                });
                            }
                            Err(e) => {
                                tracing::warn!(
                                    "promote: ImageMagick failed for {}: {e}",
                                    src_path.display()
                                );
                                assets.push(PhotoAsset {
                                    path: None,
                                    caption: None,
                                    tint: Some(UNCONVERTIBLE_TINT.to_string()),
                                });
                            }
                        }
                    } else {
                        tracing::warn!(
                            "promote: ImageMagick not found — skipping PCD {}",
                            src_path.display()
                        );
                        assets.push(PhotoAsset {
                            path: None,
                            caption: None,
                            tint: Some(UNCONVERTIBLE_TINT.to_string()),
                        });
                    }
                }
                ImageFormatClass::SpecialFormat(sf) => {
                    let (reason, _) = special_format_reason(sf, &ext);
                    assets.push(PhotoAsset {
                        path: None,
                        caption: None,
                        tint: Some(UNCONVERTIBLE_TINT.to_string()),
                    });
                    tracing::warn!(
                        "promote: photo {} is unconvertible ({sf:?}): {reason}",
                        src_path.display()
                    );
                }
                ImageFormatClass::Supported => {
                    let dst = photos_dir.join(format!("{:04}.jpg", i));
                    let src_clone = src_path.clone();
                    let dst_clone = dst.clone();
                    let permit = semaphore.clone().acquire_owned().await;

                    let result = tokio::task::spawn_blocking(move || {
                        let _permit = permit; // hold until done
                        crate::media::image::convert_image_to_jpeg_path(
                            &src_clone,
                            &dst_clone,
                            Some(1920),
                        )
                    })
                    .await
                    .unwrap_or_else(|e| Err(format!("task panicked: {e}")));

                    match result {
                        Ok(()) => {
                            assets.push(PhotoAsset {
                                path: Some(dst.to_string_lossy().to_string()),
                                caption: None,
                                tint: None,
                            });
                        }
                        Err(e) => {
                            tracing::warn!(
                                "promote: failed to convert photo {}: {e}",
                                src_path.display()
                            );
                            assets.push(PhotoAsset {
                                path: None,
                                caption: None,
                                tint: Some(UNCONVERTIBLE_TINT.to_string()),
                            });
                        }
                    }
                }
            }

            // Emit progress.
            let _ = app.emit(
                "library:promote_progress",
                PromoteProgressPayload {
                    session_id: session_id.to_string(),
                    done: i + 1,
                    total,
                },
            );
        }

        Some(assets)
    } else {
        None
    };

    // ── 9. INSERT library_discs + disc_photos in a transaction ───────────
    let disc = Disc {
        id: disc_id.clone(),
        title: title.clone(),
        year,
        date: date_display,
        filmed_by: None,
        location: None,
        source: source.to_string(),
        status,
        duration_formatted: "--:--".to_string(),
        duration_sec: 0,
        recovered_at,
        phrases_indexed: 0,
        scenes: Vec::new(),
        topics: Vec::new(),
        people: Vec::new(),
        transcript: Vec::new(),
        monogram_id,
        gradient: gradient.to_string(),
        about: None,
        video_path: video_path.clone(),
        media_type: media_type.to_string(),
        photos: photo_assets,
        deliverable_path: None,
    };

    // Use INSERT OR IGNORE so a race on the unique index is silently won by
    // the first writer rather than returning an error.
    let mut tx = db.pool.begin().await?;

    let insert_result = sqlx::query(
        "INSERT OR IGNORE INTO library_discs
         (id, title, year, date_display, filmed_by, location, source, status,
          duration_sec, duration_formatted, recovered_at, phrases_indexed,
          monogram_id, gradient, about, session_id, video_path, media_type,
          created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, 0, '--:--', ?, 0, ?, ?, NULL, ?, ?, ?,
                 ?, ?)",
    )
    .bind(&disc.id)
    .bind(&disc.title)
    .bind(disc.year)
    .bind(&disc.date)
    .bind(&disc.source)
    .bind(&disc.status)
    .bind(&disc.recovered_at)
    .bind(disc.monogram_id)
    .bind(&disc.gradient)
    .bind(session_id.to_string())
    .bind(&disc.video_path)
    .bind(&disc.media_type)
    .bind(now_ts)
    .bind(now_ts)
    .execute(&mut *tx)
    .await?;

    // If zero rows affected, the unique index blocked us — another task
    // already promoted this session. Return the existing disc id.
    if insert_result.rows_affected() == 0 {
        tx.rollback().await.ok();
        let row = sqlx::query("SELECT id FROM library_discs WHERE session_id = ? LIMIT 1")
            .bind(session_id.to_string())
            .fetch_optional(&db.pool)
            .await?;
        let id = row
            .and_then(|r| r.try_get::<String, _>("id").ok())
            .unwrap_or(disc_id);
        tracing::info!(
            "promote_session_to_library: INSERT OR IGNORE skipped (race) → disc {id}"
        );
        return Ok(id);
    }

    // Insert disc_photos rows.
    if let Some(photos) = &disc.photos {
        for (i, photo) in photos.iter().enumerate() {
            sqlx::query(
                "INSERT INTO disc_photos
                 (disc_id, photo_order, path, source_path, needs_external_converter,
                  converter_reason, caption, tint, created_at)
                 VALUES (?, ?, ?, NULL, ?, NULL, ?, ?, ?)",
            )
            .bind(&disc.id)
            .bind(i as i64)
            .bind(&photo.path)
            .bind(if photo.path.is_none() { 1i64 } else { 0i64 })
            .bind(&photo.caption)
            .bind(&photo.tint)
            .bind(now_ts)
            .execute(&mut *tx)
            .await?;
        }
    }

    tx.commit().await?;

    // ── 10. Enqueue transcription for video/audio only ───────────────────
    if media_type != "photo" {
        if let Some(path) = &video_path {
            if let Err(e) = crate::transcription::queue::enqueue(
                &db.pool,
                &disc_id,
                path,
                "stub",
                None,
            )
            .await
            {
                tracing::warn!(
                    "promote_session_to_library: disc {disc_id} inserted but transcription enqueue failed: {e}"
                );
            }
        }
    }

    // ── 11. Emit library:disc_added ──────────────────────────────────────
    // `needsNormalization` (computed above) is true for video/ISO files — the
    // frontend calls `normalizeForPlayback` then `update_disc_video_path`.
    let _ = app.emit(
        "library:disc_added",
        DiscAddedPayload {
            disc_id: disc_id.clone(),
            needs_normalization,
            video_path: video_path.clone(),
        },
    );

    tracing::info!(
        "promote_session_to_library: session {} promoted to disc {} (media_type={media_type}, needs_normalization={needs_normalization})",
        session_id,
        disc_id
    );

    Ok(disc_id)
}

// ── Private helpers ──────────────────────────────────────────────────────────

/// Scan the output dir for produced media files and fill in the path variables.
pub(crate) fn scan_output_dir(
    output_dir: &Path,
    mp4_path: &mut Option<String>,
    iso_path: &mut Option<String>,
    wav_path: &mut Option<String>,
) {
    // Check "Recovered Files" subdir first, then root.
    let candidates = [
        output_dir.join("Recovered Files"),
        output_dir.to_path_buf(),
        output_dir.join("VIDEO_TS"),
    ];
    for dir in &candidates {
        let Ok(rd) = std::fs::read_dir(dir) else {
            continue;
        };
        for entry in rd.flatten() {
            let p = entry.path();
            let ext = p
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_ascii_lowercase();
            match ext.as_str() {
                "mp4" | "mov" | "m4v" | "vob" => {
                    // Never seed video_path from a DVD MENU VOB — the VMG menu
                    // (VIDEO_TS.VOB) and title-set menus (VTS_nn_0.VOB) usually
                    // have no audio. Picking one made the disc preview silent and
                    // fed the wrong file to normalization. Title VOBs and real
                    // MP4s are fine.
                    let name = p
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("")
                        .to_ascii_uppercase();
                    let is_menu_vob = ext == "vob"
                        && (name == "VIDEO_TS.VOB" || name.ends_with("_0.VOB"));
                    if mp4_path.is_none() && !is_menu_vob {
                        *mp4_path = Some(p.to_string_lossy().to_string());
                    }
                }
                "iso" => {
                    if iso_path.is_none() {
                        *iso_path = Some(p.to_string_lossy().to_string());
                    }
                }
                "wav" => {
                    if wav_path.is_none() {
                        *wav_path = Some(p.to_string_lossy().to_string());
                    }
                }
                _ => {}
            }
        }
    }
}

/// Walk the output dir and return paths to image files.
fn collect_images(output_dir: &Path) -> Vec<PathBuf> {
    const IMAGE_EXTS: &[&str] = &[
        "jpg", "jpeg", "png", "bmp", "gif", "tiff", "tif", "webp",
        "pcd", "heic", "heif",
        "cr2", "cr3", "nef", "arw", "dng", "raw",
    ];
    let candidates = [
        output_dir.join("Recovered Files"),
        output_dir.to_path_buf(),
    ];
    let mut images = Vec::new();
    for dir in &candidates {
        let Ok(rd) = std::fs::read_dir(dir) else {
            continue;
        };
        for entry in rd.flatten() {
            let p = entry.path();
            let ext = p
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_ascii_lowercase();
            if IMAGE_EXTS.iter().any(|e| *e == ext.as_str()) {
                images.push(p);
            }
        }
    }
    images.sort();
    images
}

// ── Status resolution ────────────────────────────────────────────────────────

/// Decide the final disc status from three observable facts, with no I/O
/// dependencies. This is the single source of truth for promote status logic
/// and is unit-tested directly.
///
/// Rules:
/// - `"video"` or `"audio"` with no playable file → `"incomplete"` (the rescue
///   didn't finish; no output was saved — being honest is better than a silent
///   unplayable disc).
/// - Photos are unaffected: a gallery disc legitimately has `video_path = None`
///   (all photos live in `disc_photos`).
/// - Otherwise: `"partial"` if the sector map had failures, else `"recovered"`.
pub(crate) fn resolve_status(media_type: &str, has_video_path: bool, is_partial: bool) -> &'static str {
    if (media_type == "video" || media_type == "audio") && !has_video_path {
        return "incomplete";
    }
    if is_partial { "partial" } else { "recovered" }
}

/// Check whether the sector map has any Failed sectors (→ "partial").
async fn check_partial_status(db: &Db, session_id: Uuid) -> String {
    use crate::recovery::map::SectorState;
    match manager::load_sector_map(db, session_id).await {
        Ok(Some(map)) => {
            if map.count(SectorState::Failed) > 0 || map.count(SectorState::Skipped) > 0 {
                "partial".to_string()
            } else {
                "recovered".to_string()
            }
        }
        _ => "recovered".to_string(),
    }
}

fn vault_dir(app: &AppHandle) -> AppResult<PathBuf> {
    let dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    std::fs::create_dir_all(&dir)
        .map_err(|e| AppError::Internal(format!("app_data_dir create failed: {e}")))?;
    Ok(dir)
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
        "recovered".into()
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

// ── Unit tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::resolve_status;

    // ── video disc, no output file → must be "incomplete" ─────────────────
    #[test]
    fn video_no_file_is_incomplete() {
        assert_eq!(resolve_status("video", false, false), "incomplete");
        assert_eq!(resolve_status("video", false, true),  "incomplete");
    }

    // ── audio disc, no output file → must be "incomplete" ─────────────────
    #[test]
    fn audio_no_file_is_incomplete() {
        assert_eq!(resolve_status("audio", false, false), "incomplete");
        assert_eq!(resolve_status("audio", false, true),  "incomplete");
    }

    // ── video disc with a file → recovered or partial ──────────────────────
    #[test]
    fn video_with_file_uses_sector_status() {
        assert_eq!(resolve_status("video", true, false), "recovered");
        assert_eq!(resolve_status("video", true, true),  "partial");
    }

    // ── audio disc with a file → recovered or partial ──────────────────────
    #[test]
    fn audio_with_file_uses_sector_status() {
        assert_eq!(resolve_status("audio", true, false), "recovered");
        assert_eq!(resolve_status("audio", true, true),  "partial");
    }

    // ── photo gallery (video_path = None) must NOT be incomplete ──────────
    #[test]
    fn photo_gallery_no_file_is_recovered() {
        assert_eq!(resolve_status("photo", false, false), "recovered");
        assert_eq!(resolve_status("photo", false, true),  "partial");
    }
}
