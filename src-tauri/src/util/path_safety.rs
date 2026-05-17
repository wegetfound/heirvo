//! Path validation for paths supplied by the frontend.
//!
//! Even though the frontend uses native file pickers, a compromised renderer
//! (e.g. supply-chain attack on a JS dependency) could invoke `#[tauri::command]`
//! handlers directly with arbitrary paths. These helpers enforce a small set
//! of invariants that the picker would normally guarantee.

use crate::error::{AppError, AppResult};
use std::path::{Path, PathBuf};

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
