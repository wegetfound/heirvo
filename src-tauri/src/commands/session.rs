//! Session lifecycle commands.

use crate::error::{AppError, AppResult};
use crate::session::manager::{self, Session, SessionStatus};
use crate::state::AppState;
use serde::Deserialize;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateSessionArgs {
    pub disc_label: String,
    pub disc_fingerprint: String,
    pub drive_path: String,
    pub total_sectors: u64,
    pub output_dir: String,
    /// Disc type as a stringified `DiscType` variant (e.g. "DvdVideo").
    /// Optional for backwards-compat with older callers.
    #[serde(default)]
    pub disc_type: Option<String>,
}

#[tauri::command]
pub async fn create_session(
    state: State<'_, AppState>,
    args: CreateSessionArgs,
) -> AppResult<Session> {
    // Hard guard: strip NUL/control chars from the label and output path before
    // they're stored. A Joliet (UCS-2) disc label carries invisible NUL bytes,
    // and any path containing a NUL makes every later filesystem call fail with
    // "strings passed to WinAPI cannot contain NULs" — which would silently
    // poison the whole session. This is the single choke point that guarantees a
    // session can always be saved, regardless of what the frontend sent.
    let disc_label = strip_control_chars(&args.disc_label);
    let output_dir = strip_control_chars(&args.output_dir);
    manager::create(
        &state.db,
        &disc_label,
        &args.disc_fingerprint,
        &args.drive_path,
        args.total_sectors,
        &output_dir,
        args.disc_type.as_deref(),
    )
    .await
}

/// Remove NUL and other ASCII control characters from a string (keeps the path
/// separators and printable text intact).
fn strip_control_chars(s: &str) -> String {
    s.chars().filter(|&c| c >= ' ' || c == '\t').collect()
}

#[tauri::command]
pub async fn list_sessions(state: State<'_, AppState>) -> AppResult<Vec<Session>> {
    manager::list_all(&state.db).await
}

#[tauri::command]
pub async fn resume_session(
    state: State<'_, AppState>,
    session_id: String,
) -> AppResult<Session> {
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;
    manager::get(&state.db, id).await
}

#[tauri::command]
pub async fn delete_session(
    state: State<'_, AppState>,
    session_id: String,
) -> AppResult<()> {
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;
    // Refuse to delete a session whose recovery engine is currently running.
    // This prevents the "prune empty attempts" path in SessionHistory from
    // deleting a session that was created but whose status hasn't flipped to
    // "recovering" yet (the drive-open phase of start_recovery takes time, and
    // the frontend snapshot used to compute prunableSessions may be stale).
    if state.engines.read().contains_key(&id) {
        return Err(AppError::RecoveryInProgress(session_id));
    }
    manager::delete(&state.db, id).await
}

/// Set a user-friendly label on a session (e.g. "Mom's Wedding 1998").
/// Pass an empty string to clear the label and revert to the disc_label.
#[tauri::command]
pub async fn rename_session(
    state: State<'_, AppState>,
    session_id: String,
    label: String,
) -> AppResult<()> {
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;
    manager::rename(&state.db, id, Some(&label)).await
}

/// Change the drive path on a session so the rescue can continue on a
/// different (more capable, or simply alive) drive.
///
/// Two field-driven behaviours beyond the naive "update the DB row":
///
/// 1. **Live engines are handed off, not refused.** The UI offers "Try a
///    different drive" precisely when the engine is STALLED waiting for a
///    dead drive — and this command used to return RecoveryInProgress in
///    that state, making the button silently do nothing. Now: cancel the
///    live engine, wait (bounded) for its run loop to exit and checkpoint
///    the map, then switch. The caller resumes afterwards and the engine
///    picks up from the persisted map.
///
/// 2. **The new drive must hold the SAME disc.** The fingerprint check only
///    ran at session creation; switching drives with a different disc
///    inserted would resume writing the new disc's sectors into the old
///    session's ISO — silent cross-disc corruption. We re-read the PVD on
///    the new drive and verify identity before switching. Damaged discs
///    whose PVD can't be read are allowed through (blocking would forbid
///    drive-switching for exactly the discs that need it most) — but a
///    *definite* mismatch is a hard error.
#[tauri::command]
pub async fn change_drive(
    state: State<'_, AppState>,
    session_id: String,
    new_drive_path: String,
) -> AppResult<Session> {
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;
    // Validate the drive path. Accepted forms (Windows):
    //   \\.\X:      (device path, standard optical/HDD)
    //   \\.\PhysicalDriveN
    //   X:\         or   X:   (drive-root form, also used for optical drives)
    // Anything else (including arbitrary UNC paths like \\attacker\share) is rejected.
    validate_drive_path(&new_drive_path)?;
    let session = manager::get(&state.db, id).await?;

    // ── 1. Hand off a live engine ─────────────────────────────────────────
    let live = state.engines.write().remove(&id);
    if let Some(engine) = live {
        tracing::info!("change_drive: cancelling live engine for session {id} before drive switch");
        engine.cancel();
        // The run loop observes the cancel flag within ~2 s even inside the
        // wait-for-device hold. Its finalizer persists the sector map and
        // flips the session status off `Recovering` — poll that as the
        // "safe to proceed" signal so the resume that follows can't race a
        // half-dead engine. Bounded at 10 s; on timeout we proceed anyway
        // (the old engine holds the OLD drive's handle, not the new one).
        for _ in 0..50 {
            let s = manager::get(&state.db, id).await?;
            if s.status != SessionStatus::Recovering {
                break;
            }
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        }
    }

    // ── 2. Verify the new drive holds the same disc ───────────────────────
    // The probe does blocking SCSI I/O with spin-up sleeps — keep it off the
    // async executor.
    {
        let session_for_probe = session.clone();
        let path_for_probe = new_drive_path.clone();
        tokio::task::spawn_blocking(move || verify_same_disc(&session_for_probe, &path_for_probe))
            .await
            .map_err(|e| AppError::Internal(format!("disc verification task failed: {e}")))??;
    }

    manager::update_drive_path(&state.db, id, &new_drive_path).await?;
    manager::get(&state.db, id).await
}

/// Best-effort disc-identity check for `change_drive`. Hard-errors ONLY on a
/// definite mismatch (both fingerprints readable and different). Unreadable
/// PVDs, missing session fingerprints, and probe failures all pass — with a
/// warning log — because damaged discs are the product's core use case.
#[cfg(windows)]
fn verify_same_disc(session: &Session, new_drive_path: &str) -> AppResult<()> {
    use crate::disc::sector::{ReadOptions, SectorReader};

    let expected = session.disc_fingerprint.as_str();
    if expected.is_empty() {
        tracing::warn!(
            "change_drive: session has no disc fingerprint — cannot verify disc identity, allowing switch"
        );
        return Ok(());
    }

    // Audio CDs use a TOC-shaped fingerprint; verify via TOC.
    if expected.starts_with("audio-cd:") {
        match crate::disc::audio_cd::read_toc(new_drive_path) {
            Ok(toc) if !toc.tracks.is_empty() => {
                let last_end = toc
                    .tracks
                    .last()
                    .map(|t| t.end_lba as u64)
                    .unwrap_or(toc.lead_out_lba as u64);
                let candidate = format!("audio-cd:{}-{}", toc.tracks.len(), last_end);
                if candidate != expected {
                    return Err(AppError::Internal(
                        "The disc in that drive isn't the same disc this rescue was working on. Insert the original disc, or start a new rescue for this one.".into(),
                    ));
                }
                Ok(())
            }
            _ => {
                tracing::warn!("change_drive: TOC unreadable on new drive — allowing switch unverified");
                Ok(())
            }
        }
    } else {
        // Data disc: re-read the PVD (sector 16) on the new drive and recompute
        // the fingerprint. Crucially we hash with the SESSION's recorded
        // total_sectors, not the new reader's capacity — different drives can
        // report slightly different capacities for the same disc, and using the
        // new capacity would false-flag a legitimate switch.
        let reader = match crate::disc::scsi_windows::ScsiSectorReader::open(new_drive_path) {
            Ok(r) => r,
            Err(e) => {
                tracing::warn!("change_drive: cannot open {new_drive_path} for verification ({e}) — allowing switch unverified");
                return Ok(());
            }
        };
        let opts = ReadOptions { retries: 2, slow_mode: false, timeout_ms: 10_000 };
        let mut result = reader.read_sector(16, opts);
        // Spin-up grace: slim drives routinely fail the first PVD read.
        let mut attempts = 0;
        while !result.is_ok() && attempts < 5 {
            std::thread::sleep(std::time::Duration::from_millis(800));
            result = reader.read_sector(16, opts);
            attempts += 1;
        }
        match result.data {
            Some(pvd) => {
                let candidate =
                    crate::session::manager::fingerprint_disc(&pvd, session.total_sectors);
                if candidate != expected {
                    return Err(AppError::Internal(
                        "The disc in that drive isn't the same disc this rescue was working on. Insert the original disc, or start a new rescue for this one.".into(),
                    ));
                }
                Ok(())
            }
            None => {
                tracing::warn!(
                    "change_drive: PVD unreadable on new drive (damaged disc?) — allowing switch unverified"
                );
                Ok(())
            }
        }
    }
}

#[cfg(not(windows))]
fn verify_same_disc(_session: &Session, _new_drive_path: &str) -> AppResult<()> {
    Ok(())
}

/// Accept only well-formed Windows drive/device paths. Rejects anything
/// that looks like a UNC share (\\server\anything other than .\...) or an
/// arbitrary filesystem path.
fn validate_drive_path(path: &str) -> AppResult<()> {
    // \\.\X: or \\.\PhysicalDriveN  (device-path prefix is allowed)
    if path.starts_with("\\\\.\\") {
        let tail = &path[4..]; // after "\\.\\"
        // Must be either a drive letter (e.g. "C:" or "C:\") or "PhysicalDriveN"
        let ok = is_drive_letter_tail(tail)
            || tail.to_ascii_uppercase().starts_with("PHYSICALDRIVE");
        if ok {
            return Ok(());
        }
        return Err(AppError::Internal(
            "Invalid drive path: only drive-letter and PhysicalDrive device paths are permitted".into(),
        ));
    }
    // X: or X:\
    if is_drive_letter_tail(path) {
        return Ok(());
    }
    Err(AppError::Internal(
        "Invalid drive path: must be a drive letter (e.g. E:) or device path (e.g. \\\\.\\E:)".into(),
    ))
}

/// Returns true for strings of the form "X:" or "X:\" where X is a letter.
fn is_drive_letter_tail(s: &str) -> bool {
    let bytes = s.as_bytes();
    if bytes.len() < 2 {
        return false;
    }
    let letter = bytes[0];
    if !letter.is_ascii_alphabetic() {
        return false;
    }
    if bytes[1] != b':' {
        return false;
    }
    // Accept exactly "X:" or "X:\" (optional trailing backslash).
    matches!(bytes.len(), 2 | 3) && (bytes.len() == 2 || bytes[2] == b'\\')
}

/// Change the output directory of an existing session. Useful when the
/// user plugs in an external/USB drive after starting recovery and wants
/// to save the recovered files there instead of the original location.
#[tauri::command]
pub async fn change_output_dir(
    state: State<'_, AppState>,
    session_id: String,
    new_output_dir: String,
) -> AppResult<Session> {
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;
    // Validate the renderer-supplied directory path. Use validate_output_dir
    // (NOT validate_dir_path) because the destination folder is created lazily on
    // first write — e.g. a fresh "DVD Rescue\<label>" folder on a just-plugged USB
    // drive does not exist yet. It still rejects UNC, relative paths, '..', and
    // Windows system dirs while allowing Documents, Desktop, or any external root.
    crate::util::path_safety::validate_output_dir(&new_output_dir)?;
    manager::update_output_dir(&state.db, id, &new_output_dir).await?;
    manager::get(&state.db, id).await
}
