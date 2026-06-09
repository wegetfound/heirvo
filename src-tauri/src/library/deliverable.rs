//! Deliverable helper — copies recovered/imported media to
//! `Documents\Heirvo\<Friendly Title>\<Friendly Title>.<ext>` so
//! non-technical users can find their files in the normal file system.
//!
//! INVARIANT: this module ONLY writes the `deliverable_path` column.
//! It NEVER modifies `video_path`, transcription jobs, or any other
//! internal state.  A failed deliverable must never fail an import.

use crate::error::AppResult;
use chrono::Utc;
use sqlx::{Row, SqlitePool};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Return `<Documents>/Heirvo`, creating it if necessary.
///
/// Falls back in order:
/// 1. `tauri::PathResolver::document_dir()`
/// 2. `home_dir()/Documents`
/// 3. `app_data_dir()` (last resort — logs a warning)
pub fn documents_heirvo_dir(app: &AppHandle) -> AppResult<PathBuf> {
    let base = if let Ok(d) = app.path().document_dir() {
        d
    } else if let Ok(h) = app.path().home_dir() {
        let d = h.join("Documents");
        d
    } else {
        tracing::warn!(
            "deliverable: could not resolve Documents dir; falling back to app_data_dir"
        );
        app.path()
            .app_data_dir()
            .map_err(|e| crate::error::AppError::Internal(format!("path resolver failed: {e}")))?
    };

    let dir = base.join("Heirvo");
    std::fs::create_dir_all(&dir).map_err(|e| {
        crate::error::AppError::Internal(format!(
            "deliverable: failed to create {}: {e}",
            dir.display()
        ))
    })?;
    Ok(dir)
}

/// Sanitize a disc title into a human-friendly filename base (NOT a URL slug —
/// spaces and mixed-case are kept so grandma can read it).
///
/// - Strips Windows-illegal chars: `< > : " / \ | ? *`
/// - Strips ASCII control chars (0x00–0x1F, 0x7F)
/// - Collapses runs of whitespace to a single space
/// - Trims leading/trailing whitespace
/// - Caps at 80 chars
/// - Falls back to "Recovered video" if the result is empty
/// - Appends `_` if the base (ignoring extension) is a Windows reserved device name
pub fn friendly_filename(title: &str) -> String {
    // Windows-illegal filename characters.
    const ILLEGAL: &[char] = &['<', '>', ':', '"', '/', '\\', '|', '?', '*'];

    let cleaned: String = title
        .chars()
        .filter(|c| {
            let code = *c as u32;
            // Drop control chars (including DEL 0x7F).
            if code < 0x20 || code == 0x7F {
                return false;
            }
            // Drop Windows-illegal chars.
            if ILLEGAL.contains(c) {
                return false;
            }
            true
        })
        .collect();

    // Collapse runs of whitespace to a single space and trim.
    let collapsed = cleaned.split_whitespace().collect::<Vec<_>>().join(" ");

    if collapsed.is_empty() {
        return "Recovered video".to_string();
    }

    // Cap at 80 chars on a char boundary.
    let capped: String = if collapsed.chars().count() <= 80 {
        collapsed
    } else {
        collapsed.chars().take(80).collect()
    };

    // Guard against Windows reserved device names (M2/L4).
    if is_windows_reserved_name(&capped) {
        format!("{}_", capped)
    } else {
        capped
    }
}

/// Returns true if `name` (ignoring any extension, case-insensitively) is a
/// Windows reserved device name: CON, PRN, AUX, NUL, COM1–COM9, LPT1–LPT9.
///
/// Per Microsoft docs, these names are device paths regardless of extension —
/// e.g. `NUL.mp4` and `NUL` both refer to the null device.
fn is_windows_reserved_name(name: &str) -> bool {
    // Strip extension: take the part before the first '.'.
    let stem = name.split('.').next().unwrap_or(name);
    let upper = stem.to_ascii_uppercase();
    matches!(
        upper.as_str(),
        "CON" | "PRN" | "AUX" | "NUL"
            | "COM1" | "COM2" | "COM3" | "COM4" | "COM5"
            | "COM6" | "COM7" | "COM8" | "COM9"
            | "LPT1" | "LPT2" | "LPT3" | "LPT4" | "LPT5"
            | "LPT6" | "LPT7" | "LPT8" | "LPT9"
    )
}

/// Copy the disc's source file to `Documents\Heirvo\<base>\<base>.<ext>` and
/// update the `deliverable_path` column.
///
/// Fully non-fatal: any error is logged as a warning and the function returns
/// `Ok(())`.  A failed deliverable must never fail an import or recovery.
pub async fn materialize_deliverable(
    app: &AppHandle,
    pool: &SqlitePool,
    disc_id: &str,
) -> AppResult<()> {
    // ── 1. Fetch disc row ────────────────────────────────────────────────────
    let row = match sqlx::query(
        "SELECT video_path, title, media_type, deliverable_path FROM library_discs WHERE id = ?",
    )
    .bind(disc_id)
    .fetch_optional(pool)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            tracing::warn!("deliverable: disc {} not found", disc_id);
            return Ok(());
        }
        Err(e) => {
            tracing::warn!("deliverable: DB error fetching disc {}: {}", disc_id, e);
            return Ok(());
        }
    };

    let video_path: Option<String> = row.try_get::<Option<String>, _>("video_path").ok().flatten();
    let title: String = row.try_get("title").unwrap_or_else(|_| "Recovered video".to_string());
    let media_type: String = row
        .try_get::<String, _>("media_type")
        .unwrap_or_else(|_| "video".to_string());
    let existing_deliverable: Option<String> = row
        .try_get::<Option<String>, _>("deliverable_path")
        .ok()
        .flatten();

    // ── 2. Guard: nothing to do if no source path ────────────────────────────
    let source_path = match video_path {
        Some(ref p) if !p.is_empty() => p.clone(),
        _ => {
            // Photo galleries (multi-photo) have no single video_path — skip.
            return Ok(());
        }
    };

    // ── 3. Guard: source file must exist ────────────────────────────────────
    let src_meta = match tokio::fs::metadata(&source_path).await {
        Ok(m) => m,
        Err(e) => {
            tracing::warn!(
                "deliverable: source file not found for disc {} ({}): {}",
                disc_id,
                source_path,
                e
            );
            return Ok(());
        }
    };
    let src_size = src_meta.len();

    // ── 4. Idempotency: skip if deliverable already exists with matching size ─
    if let Some(ref existing) = existing_deliverable {
        if !existing.is_empty() {
            if let Ok(m) = tokio::fs::metadata(existing).await {
                if m.len() == src_size {
                    tracing::info!(
                        "deliverable: disc {} already materialized at {}",
                        disc_id,
                        existing
                    );
                    return Ok(());
                }
            }
        }
    }

    // ── 5. Compute target path ───────────────────────────────────────────────
    let docs_heirvo = match documents_heirvo_dir(app) {
        Ok(d) => d,
        Err(e) => {
            tracing::warn!("deliverable: cannot resolve Documents/Heirvo: {}", e);
            return Ok(());
        }
    };

    let ext = std::path::Path::new(&source_path)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("mp4")
        .to_lowercase();

    // Skip photo galleries that hit here with an unconvertible extension — the
    // media_type guard above catches missing video_path, but a single-photo
    // disc still has a video_path.  We allow those through.
    let _ = media_type; // used above; silence unused warning

    let base = friendly_filename(&title);
    let target_dir = docs_heirvo.join(&base);

    // Collision handling: reuse same-size file, bump suffix for different size.
    let target_path = find_target_path(&target_dir, &base, &ext, src_size).await;

    // ── 6. Create parent dir and copy ───────────────────────────────────────
    if let Err(e) = tokio::fs::create_dir_all(&target_dir).await {
        tracing::warn!(
            "deliverable: failed to create dir {}: {}",
            target_dir.display(),
            e
        );
        return Ok(());
    }

    // Guard: if the source already lives at the target location, there is
    // nothing to copy. Copying a file onto itself fails with a sharing
    // violation (os error 32) AND leaves the file locked — which previously
    // broke playback of recovered ISOs that were saved straight into
    // Documents\Heirvo. Detect it (canonical paths, falling back to a direct
    // compare when the target doesn't exist yet) and just record the path.
    let src_pb = std::path::Path::new(&source_path);
    let same_file = match (
        tokio::fs::canonicalize(src_pb).await,
        tokio::fs::canonicalize(&target_path).await,
    ) {
        (Ok(a), Ok(b)) => a == b,
        _ => src_pb == target_path,
    };

    if same_file {
        tracing::info!(
            "deliverable: disc {} source is already at the deliverable location ({}) — recording without copy",
            disc_id,
            target_path.display()
        );
    } else if let Err(e) = tokio::fs::copy(&source_path, &target_path).await {
        tracing::warn!(
            "deliverable: copy failed ({} → {}): {}",
            source_path,
            target_path.display(),
            e
        );
        return Ok(());
    }

    // ── 7. Update DB ─────────────────────────────────────────────────────────
    let target_str = target_path.to_string_lossy().to_string();
    let now = Utc::now().timestamp();

    if let Err(e) = sqlx::query(
        "UPDATE library_discs SET deliverable_path = ?, updated_at = ? WHERE id = ?",
    )
    .bind(&target_str)
    .bind(now)
    .bind(disc_id)
    .execute(pool)
    .await
    {
        tracing::warn!(
            "deliverable: DB update failed for disc {}: {}",
            disc_id,
            e
        );
        return Ok(());
    }

    tracing::info!(
        "deliverable: disc {} materialized → {}",
        disc_id,
        target_str
    );
    Ok(())
}

/// Find a non-conflicting target path inside `target_dir` for a file named
/// `<base>.<ext>`.
///
/// - If no file exists at the natural path → use it.
/// - If a file exists with the **same byte size** as `src_size` → reuse it
///   (idempotent retry after a crash mid-DB-update).
/// - If a file exists with a **different size** → try `<base> (2).<ext>`,
///   `<base> (3).<ext>`, etc.
async fn find_target_path(
    target_dir: &std::path::Path,
    base: &str,
    ext: &str,
    src_size: u64,
) -> PathBuf {
    let natural = target_dir.join(format!("{}.{}", base, ext));

    match tokio::fs::metadata(&natural).await {
        Err(_) => return natural, // doesn't exist → free slot
        Ok(m) if m.len() == src_size => return natural, // same size → reuse
        Ok(_) => {} // different size → find a free suffix
    }

    for n in 2u32.. {
        let candidate = target_dir.join(format!("{} ({}).{}", base, n, ext));
        match tokio::fs::metadata(&candidate).await {
            Err(_) => return candidate,
            Ok(m) if m.len() == src_size => return candidate,
            Ok(_) => continue,
        }
    }

    // Unreachable in practice, but satisfy the compiler.
    natural
}

/// Best-effort startup backfill: materialize the friendly Documents copy for
/// every disc that doesn't have one yet. Idempotent (materialize_deliverable
/// self-skips when already done) and fully non-fatal. Runs sequentially to
/// avoid thrashing the disk with parallel multi-GB copies.
pub async fn backfill_missing(app: &AppHandle, pool: &SqlitePool) {
    // Discs with no deliverable yet but a real source file path.
    let rows = match sqlx::query(
        "SELECT id FROM library_discs \
         WHERE deliverable_path IS NULL AND video_path IS NOT NULL AND video_path != '' \
         ORDER BY created_at ASC",
    )
    .fetch_all(pool)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::warn!("deliverable backfill: query failed: {e}");
            return;
        }
    };

    if rows.is_empty() {
        tracing::debug!("deliverable backfill: nothing to do");
        return;
    }

    let total = rows.len();
    tracing::info!("deliverable backfill: {} disc(s) missing a friendly copy — starting", total);

    let mut done = 0usize;
    for row in rows {
        let id: String = match row.try_get("id") { Ok(v) => v, Err(_) => continue };
        // materialize_deliverable is idempotent + non-fatal; ignore the Result.
        let _ = materialize_deliverable(app, pool, &id).await;
        done += 1;
    }

    tracing::info!("deliverable backfill: finished ({}/{} processed)", done, total);
}

#[cfg(test)]
mod tests {
    use super::*;

    // ─── friendly_filename ────────────────────────────────────────────────────

    #[test]
    fn ff_keeps_spaces_and_mixed_case() {
        assert_eq!(friendly_filename("Christmas 2003"), "Christmas 2003");
    }

    #[test]
    fn ff_strips_windows_illegal_chars() {
        // 'Mom: Trip <2001>' — ':' and '<' and '>' are illegal.
        // After stripping: "Mom Trip 2001" (whitespace collapse removes the
        // space that was between ':' and 'T' because ':' is stripped and
        // the adjacent space becomes part of a whitespace run).
        let result = friendly_filename("Mom: Trip <2001>");
        // No illegal chars must remain.
        for c in &['<', '>', ':', '"', '/', '\\', '|', '?', '*'] {
            assert!(
                !result.contains(*c),
                "illegal char {:?} found in {:?}",
                c,
                result
            );
        }
        // Spaces between words are preserved.
        assert!(result.contains(' '));
        assert_eq!(result, "Mom Trip 2001");
    }

    #[test]
    fn ff_collapses_internal_whitespace_runs() {
        assert_eq!(friendly_filename("a    b\t c"), "a b c");
    }

    #[test]
    fn ff_trims_leading_trailing_whitespace() {
        assert_eq!(friendly_filename("  hello  "), "hello");
    }

    #[test]
    fn ff_empty_input_falls_back() {
        assert_eq!(friendly_filename(""), "Recovered video");
    }

    #[test]
    fn ff_all_illegal_input_falls_back() {
        assert_eq!(friendly_filename("////"), "Recovered video");
    }

    #[test]
    fn ff_only_whitespace_falls_back() {
        assert_eq!(friendly_filename("   "), "Recovered video");
    }

    #[test]
    fn ff_control_chars_fall_back() {
        // Only control chars — result after stripping is empty → fallback.
        assert_eq!(friendly_filename("\u{0}\u{1}"), "Recovered video");
    }

    #[test]
    fn ff_strips_del_control_char() {
        // DEL (0x7F) is a control char and must be stripped.
        let input = format!("Hello\u{7F}World");
        let result = friendly_filename(&input);
        assert!(!result.contains('\u{7F}'));
        assert_eq!(result, "HelloWorld");
    }

    #[test]
    fn ff_caps_at_80_ascii() {
        let long: String = "a".repeat(200);
        let result = friendly_filename(&long);
        assert_eq!(result.chars().count(), 80);
    }

    #[test]
    fn ff_caps_at_80_multibyte_no_panic() {
        // 'é' is a 2-byte char. Feed 100 of them → should cap at 80, no panic.
        let long: String = "é".repeat(100);
        let result = friendly_filename(&long);
        assert_eq!(result.chars().count(), 80);
        // The result must be valid UTF-8 (would panic on invalid boundary).
        assert!(std::str::from_utf8(result.as_bytes()).is_ok());
    }

    // ─── Windows reserved device name guard (M2/L4) ──────────────────────────

    #[test]
    fn ff_reserved_nul_gets_underscore() {
        assert_eq!(friendly_filename("NUL"), "NUL_");
    }

    #[test]
    fn ff_reserved_con_gets_underscore() {
        assert_eq!(friendly_filename("CON"), "CON_");
    }

    #[test]
    fn ff_reserved_com1_gets_underscore() {
        assert_eq!(friendly_filename("COM1"), "COM1_");
    }

    #[test]
    fn ff_reserved_lpt9_gets_underscore() {
        assert_eq!(friendly_filename("LPT9"), "LPT9_");
    }

    #[test]
    fn ff_reserved_name_case_insensitive() {
        // Lower-case variant must also be protected.
        assert_eq!(friendly_filename("nul"), "nul_");
        assert_eq!(friendly_filename("con"), "con_");
    }

    #[test]
    fn ff_reserved_name_with_extension_gets_underscore() {
        // "NUL.mp4" — stem is "NUL", which is reserved; the whole base gets _.
        assert_eq!(friendly_filename("NUL.mp4"), "NUL.mp4_");
    }

    #[test]
    fn ff_non_reserved_not_affected() {
        // "NULL" is NOT a reserved name (one extra char).
        assert_eq!(friendly_filename("NULL"), "NULL");
        // "NULX" is also not reserved.
        assert_eq!(friendly_filename("NULX"), "NULX");
    }

    #[test]
    fn ff_unicode_non_illegal_preserved() {
        // Thai title — no illegal ASCII chars, no control chars.
        let thai = "วันคริสต์มาส 2003";
        let result = friendly_filename(thai);
        assert_eq!(result, thai);
    }

    #[test]
    fn ff_exactly_80_chars_not_truncated() {
        // An 80-char string must pass through unchanged.
        let exact: String = "b".repeat(80);
        let result = friendly_filename(&exact);
        assert_eq!(result.chars().count(), 80);
        assert_eq!(result, exact);
    }

    #[test]
    fn ff_81_char_string_truncated_to_80() {
        let s: String = "c".repeat(81);
        let result = friendly_filename(&s);
        assert_eq!(result.chars().count(), 80);
    }

    // ─── find_target_path ─────────────────────────────────────────────────────

    /// Create a unique temp dir for each test and clean up after.
    fn make_test_dir(suffix: &str) -> std::path::PathBuf {
        let pid = std::process::id();
        let dir = std::env::temp_dir().join(format!("heirvo_test_findtarget_{}_{}", pid, suffix));
        std::fs::create_dir_all(&dir).expect("create test dir");
        dir
    }

    fn cleanup(dir: &std::path::Path) {
        let _ = std::fs::remove_dir_all(dir);
    }

    #[tokio::test]
    async fn ftp_empty_dir_returns_natural_path() {
        let dir = make_test_dir("empty");
        let result = find_target_path(&dir, "myvideo", "mp4", 100).await;
        cleanup(&dir);

        assert_eq!(
            result.file_name().unwrap().to_str().unwrap(),
            "myvideo.mp4"
        );
    }

    #[tokio::test]
    async fn ftp_same_size_existing_file_reuses_path() {
        let dir = make_test_dir("same_size");
        let natural = dir.join("myvideo.mp4");
        // Write exactly 50 bytes.
        std::fs::write(&natural, vec![0u8; 50]).expect("write test file");

        let result = find_target_path(&dir, "myvideo", "mp4", 50).await;
        cleanup(&dir);

        assert_eq!(
            result.file_name().unwrap().to_str().unwrap(),
            "myvideo.mp4"
        );
    }

    #[tokio::test]
    async fn ftp_different_size_existing_file_returns_collision_suffix() {
        let dir = make_test_dir("diff_size");
        let natural = dir.join("myvideo.mp4");
        // Write 30 bytes but claim src_size is 50.
        std::fs::write(&natural, vec![0u8; 30]).expect("write test file");

        let result = find_target_path(&dir, "myvideo", "mp4", 50).await;
        cleanup(&dir);

        assert_eq!(
            result.file_name().unwrap().to_str().unwrap(),
            "myvideo (2).mp4"
        );
    }

    #[tokio::test]
    async fn ftp_natural_and_2_both_different_size_returns_3() {
        let dir = make_test_dir("both_conflict");
        // Natural path — different size.
        std::fs::write(dir.join("myvideo.mp4"), vec![0u8; 10]).expect("write natural");
        // (2) path — also different size.
        std::fs::write(dir.join("myvideo (2).mp4"), vec![0u8; 20]).expect("write (2)");

        let result = find_target_path(&dir, "myvideo", "mp4", 50).await;
        cleanup(&dir);

        assert_eq!(
            result.file_name().unwrap().to_str().unwrap(),
            "myvideo (3).mp4"
        );
    }
}
