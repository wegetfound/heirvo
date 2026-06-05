//! Path validation for paths supplied by the frontend.
//!
//! Even though the frontend uses native file pickers, a compromised renderer
//! (e.g. supply-chain attack on a JS dependency) could invoke `#[tauri::command]`
//! handlers directly with arbitrary paths. These helpers enforce a small set
//! of invariants that the picker would normally guarantee.

use crate::error::{AppError, AppResult};
use std::path::{Path, PathBuf};

/// Windows system directories that the frontend must never be allowed to read
/// from or write to. Checked as canonical lowercase prefix.
const SYSTEM_DIR_PREFIXES: &[&str] = &[
    "c:\\windows",
    "c:\\program files",
    "c:\\program files (x86)",
    "c:\\programdata",
    "c:\\system volume information",
];

/// Reject UNC paths (`\\server\share` or `//server/share`) which on Windows
/// cause NTLM credential capture when the server is attacker-controlled.
fn reject_unc(path: &str) -> AppResult<()> {
    let starts_unc = path.starts_with("\\\\") || path.starts_with("//");
    if starts_unc {
        return Err(AppError::Internal(
            "UNC and network paths are not permitted".into(),
        ));
    }
    Ok(())
}

/// Reject paths whose canonical form falls under a Windows system directory.
fn reject_system_dir(canon: &Path) -> AppResult<()> {
    let lower = canon.to_string_lossy().to_ascii_lowercase();
    for prefix in SYSTEM_DIR_PREFIXES {
        if lower.starts_with(prefix) {
            return Err(AppError::Internal(
                "Access to system directories is not permitted".into(),
            ));
        }
    }
    Ok(())
}

/// Validate a renderer-supplied directory path (not a file) before listing or
/// writing into it.
///
/// - Rejects UNC/network paths.
/// - Requires an absolute path.
/// - Requires the path to exist and be a directory.
/// - Rejects paths under Windows system directories.
pub fn validate_dir_path(path: &str) -> AppResult<PathBuf> {
    reject_unc(path)?;
    let raw = Path::new(path);
    if !raw.is_absolute() {
        return Err(AppError::Internal(format!(
            "must be an absolute path: '{path}'"
        )));
    }
    let canon = std::fs::canonicalize(raw)
        .map_err(|e| AppError::Internal(format!("invalid path '{path}': {e}")))?;
    if !canon.is_dir() {
        return Err(AppError::Internal(format!(
            "not a directory: {}",
            canon.display()
        )));
    }
    reject_system_dir(&canon)?;
    Ok(canon)
}

/// Validate a renderer-supplied DESTINATION directory that may not exist yet —
/// it is created lazily on first write (e.g. picking a fresh "DVD Rescue" folder
/// on a freshly-plugged USB drive). Unlike `validate_dir_path`, this does NOT
/// require the leaf to exist; it validates the nearest existing ancestor.
///
/// - Rejects UNC/network paths and any `..` component (a lexical traversal guard,
///   needed because a non-existent leaf cannot be canonicalized).
/// - Requires an absolute path.
/// - Resolves the nearest existing ancestor and rejects Windows system dirs.
/// Returns the requested absolute path (to be created on write).
pub fn validate_output_dir(path: &str) -> AppResult<PathBuf> {
    reject_unc(path)?;
    let raw = Path::new(path);
    if !raw.is_absolute() {
        return Err(AppError::Internal(format!(
            "must be an absolute path: '{path}'"
        )));
    }
    if raw
        .components()
        .any(|c| matches!(c, std::path::Component::ParentDir))
    {
        return Err(AppError::Internal(
            "path must not contain '..' components".into(),
        ));
    }
    // Walk up to the nearest existing ancestor, canonicalize it, and ensure it is
    // a real directory outside the system tree.
    let mut probe = raw;
    let existing = loop {
        if probe.exists() {
            break probe;
        }
        match probe.parent() {
            Some(p) => probe = p,
            None => {
                return Err(AppError::Internal(format!(
                    "no valid drive/root for path: '{path}'"
                )))
            }
        }
    };
    let canon_ancestor = std::fs::canonicalize(existing)
        .map_err(|e| AppError::Internal(format!("invalid path '{path}': {e}")))?;
    if !canon_ancestor.is_dir() {
        return Err(AppError::Internal(format!(
            "destination is not under a directory: {}",
            canon_ancestor.display()
        )));
    }
    reject_system_dir(&canon_ancestor)?;
    Ok(raw.to_path_buf())
}

/// Validate a path supplied by the frontend before reading it.
///
/// - Canonicalize to resolve `..` segments and symlinks.
/// - Require the canonical path exists and is a regular file.
/// - Require the extension is in `allowed_extensions` (case-insensitive).
/// - Reject files larger than `max_bytes`.
pub fn validate_read_path(
    path: &str,
    allowed_extensions: &[&str],
    max_bytes: u64,
) -> AppResult<PathBuf> {
    reject_unc(path)?;
    let raw = Path::new(path);
    let canon = std::fs::canonicalize(raw)
        .map_err(|e| AppError::Internal(format!("invalid path '{path}': {e}")))?;
    if !canon.is_file() {
        return Err(AppError::Internal(format!(
            "not a regular file: {}",
            canon.display()
        )));
    }
    let ext = canon
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    if !allowed_extensions
        .iter()
        .any(|a| a.eq_ignore_ascii_case(ext))
    {
        return Err(AppError::Internal(format!(
            "rejected file extension '.{ext}' (allowed: {})",
            allowed_extensions.join(", ")
        )));
    }
    let meta = std::fs::metadata(&canon)?;
    if meta.len() > max_bytes {
        return Err(AppError::Internal(format!(
            "file too large: {} bytes (max {})",
            meta.len(),
            max_bytes
        )));
    }
    Ok(canon)
}

/// Validate a path supplied by the frontend before writing to it.
///
/// - Require an absolute path (no relative paths from the frontend).
/// - Require the extension matches `allowed_extensions` (case-insensitive).
/// - Require the parent directory already exists; we never create arbitrary
///   directory trees on behalf of the renderer.
pub fn validate_write_path(
    path: &str,
    allowed_extensions: &[&str],
) -> AppResult<PathBuf> {
    reject_unc(path)?;
    let target = PathBuf::from(path);
    if !target.is_absolute() {
        return Err(AppError::Internal(format!(
            "must be an absolute path: '{path}'"
        )));
    }
    let ext = target
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    if !allowed_extensions
        .iter()
        .any(|a| a.eq_ignore_ascii_case(ext))
    {
        return Err(AppError::Internal(format!(
            "rejected file extension '.{ext}' (allowed: {})",
            allowed_extensions.join(", ")
        )));
    }
    let parent = target.parent().ok_or_else(|| {
        AppError::Internal(format!("path has no parent: {}", target.display()))
    })?;
    if !parent.exists() {
        return Err(AppError::Internal(format!(
            "parent directory does not exist: {}",
            parent.display()
        )));
    }
    if !parent.is_dir() {
        return Err(AppError::Internal(format!(
            "parent is not a directory: {}",
            parent.display()
        )));
    }
    Ok(target)
}
