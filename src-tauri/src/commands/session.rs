//! Session lifecycle commands.

use crate::error::{AppError, AppResult};
use crate::session::manager::{self, Session};
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

/// Change the drive path on a paused / completed session. Useful when the
/// user wants to retry failed sectors with a different (more capable) drive.
/// Refuses if a recovery is currently running on this session.
#[tauri::command]
pub async fn change_drive(
    state: State<'_, AppState>,
    session_id: String,
    new_drive_path: String,
) -> AppResult<Session> {
    let id = Uuid::parse_str(&session_id)
        .map_err(|_| AppError::SessionNotFound(session_id.clone()))?;
    if state.engines.read().contains_key(&id) {
        return Err(AppError::RecoveryInProgress(session_id));
    }
    // Validate the drive path. Accepted forms (Windows):
    //   \\.\X:      (device path, standard optical/HDD)
    //   \\.\PhysicalDriveN
    //   X:\         or   X:   (drive-root form, also used for optical drives)
    // Anything else (including arbitrary UNC paths like \\attacker\share) is rejected.
    validate_drive_path(&new_drive_path)?;
    manager::update_drive_path(&state.db, id, &new_drive_path).await?;
    manager::get(&state.db, id).await
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
