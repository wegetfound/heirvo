//! Output-destination drive enumeration.
//!
//! Lists local fixed and removable drives (NOT optical drives — those are
//! sources, not destinations) so the user can pick a USB stick / external
//! HDD as the recovery output target. Critical when the system drive is
//! too full to hold a 10–15 GB rescued ISO + VOBs + MP4.

use crate::error::{AppError, AppResult};
use serde::Serialize;
use tauri_plugin_opener::OpenerExt;

#[derive(Debug, Clone, Serialize)]
pub struct StorageDrive {
    /// Drive letter with backslash, e.g. "D:\\".
    pub path: String,
    /// Volume label, or empty string if none. e.g. "Backup", "USB Stick".
    pub label: String,
    /// "fixed" | "removable" | "network" — surfaced so the UI can flag externals.
    pub kind: String,
    /// Total capacity, bytes. 0 if unknown / no media.
    pub total_bytes: u64,
    /// Free space, bytes. 0 if unknown / no media.
    pub free_bytes: u64,
}

#[tauri::command]
pub async fn list_storage_drives() -> AppResult<Vec<StorageDrive>> {
    #[cfg(windows)]
    {
        Ok(windows_impl::enumerate())
    }
    #[cfg(not(windows))]
    {
        Ok(Vec::new())
    }
}

/// Open a folder (or the parent of a file) in the OS file manager, selecting
/// the item. Uses `tauri-plugin-opener` (ShellExecuteW / xdg-open etc.) —
/// no shell interpreter, no string concatenation into a command line.
#[tauri::command]
pub async fn open_folder(app: tauri::AppHandle, path: String) -> AppResult<()> {
    app.opener()
        .reveal_item_in_dir(&path)
        .map_err(|e| AppError::Internal(format!("opener reveal_item_in_dir: {e}")))?;
    Ok(())
}

/// Open a file (or folder) with the OS default handler — the user's normal
/// video player, photo viewer, etc.  Unlike `open_folder` (which selects the
/// file in Explorer), this OPENS it.
///
/// Uses `tauri-plugin-opener` (ShellExecuteW / xdg-open etc.) — no shell
/// interpreter, eliminating command-injection via attacker-controlled paths.
#[tauri::command]
pub async fn open_file(app: tauri::AppHandle, path: String) -> AppResult<()> {
    app.opener()
        .open_path(&path, None::<&str>)
        .map_err(|e| AppError::Internal(format!("opener open_path: {e}")))?;
    Ok(())
}

#[cfg(windows)]
mod windows_impl {
    use super::StorageDrive;
    use windows::core::PCWSTR;
    use windows::Win32::Storage::FileSystem::{
        GetDiskFreeSpaceExW, GetDriveTypeW, GetLogicalDriveStringsW, GetVolumeInformationW,
    };

    // GetDriveTypeW return values per WinAPI docs.
    const DRIVE_REMOVABLE: u32 = 2;
    const DRIVE_FIXED: u32 = 3;
    const DRIVE_REMOTE: u32 = 4;

    pub fn enumerate() -> Vec<StorageDrive> {
        let mut buf = vec![0u16; 512];
        let n = unsafe { GetLogicalDriveStringsW(Some(&mut buf)) };
        if n == 0 {
            return Vec::new();
        }
        buf.truncate(n as usize);

        let mut out = Vec::new();
        // Each drive string is null-terminated; collection is double-null-terminated.
        for chunk in buf.split(|c| *c == 0) {
            if chunk.is_empty() {
                continue;
            }
            let mut path_w: Vec<u16> = chunk.to_vec();
            path_w.push(0); // ensure null-terminated for the win32 calls

            let drive_type = unsafe { GetDriveTypeW(PCWSTR(path_w.as_ptr())) };
            let kind = match drive_type {
                DRIVE_FIXED => "fixed",
                DRIVE_REMOVABLE => "removable",
                DRIVE_REMOTE => "network",
                _ => continue, // skip CD-ROM, RAMDISK, NO_ROOT_DIR, UNKNOWN
            };

            // Volume label (best-effort; may fail on no-media or permission-denied).
            let mut label_buf = [0u16; 256];
            let label = unsafe {
                match GetVolumeInformationW(
                    PCWSTR(path_w.as_ptr()),
                    Some(&mut label_buf),
                    None,
                    None,
                    None,
                    None,
                ) {
                    Ok(_) => String::from_utf16_lossy(
                        &label_buf[..label_buf.iter().position(|c| *c == 0).unwrap_or(0)],
                    ),
                    Err(_) => String::new(),
                }
            };

            // Free / total space (best-effort).
            let (mut total_bytes, mut free_bytes) = (0u64, 0u64);
            let mut free_to_caller = 0u64;
            unsafe {
                let _ = GetDiskFreeSpaceExW(
                    PCWSTR(path_w.as_ptr()),
                    Some(&mut free_to_caller),
                    Some(&mut total_bytes),
                    Some(&mut free_bytes),
                );
            }

            // Path back as String, dropping the final null.
            let path: String = String::from_utf16_lossy(
                &chunk.iter().copied().take_while(|c| *c != 0).collect::<Vec<u16>>(),
            );

            out.push(StorageDrive {
                path,
                label,
                kind: kind.to_string(),
                total_bytes,
                free_bytes: free_to_caller,
            });
        }
        out
    }
}
