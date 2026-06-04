//! Global AutoPlay suppression guard for Heirvo.
//!
//! While Heirvo is running, this module keeps the Windows per-user AutoPlay
//! master switch disabled so that **no** disc-insert popup appears regardless
//! of which window is focused. It pairs with the focused-window
//! `QueryCancelAutoPlay` subclass in `autoplay.rs` as a belt-and-suspenders
//! approach.
//!
//! ## Registry key / value
//! ```text
//! HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\AutoplayHandlers
//!   DisableAutoplay  REG_DWORD  1 = disabled, 0 / absent = enabled
//! ```
//!
//! ## Self-heal across crashes
//! On startup we write a `autoplay_restore.json` file in the app-data dir that
//! records the original state of the value **before Heirvo touched it**. We
//! only write this file when it does NOT already exist — so if the app crashed
//! before it could restore, the file still holds the *true* pre-Heirvo value.
//! On the next clean exit we restore from that saved value and delete the file.
//! A crash therefore never permanently loses the user's AutoPlay setting.

use std::path::Path;

/// What the `DisableAutoplay` value looked like before Heirvo first set it.
#[derive(Debug, Clone, PartialEq)]
pub enum OriginalState {
    /// The value was absent from the registry key (AutoPlay was effectively enabled).
    Absent,
    /// The value existed with this specific DWORD (0 = enabled, 1 = disabled,
    /// any other value is preserved verbatim).
    Present(u32),
}

impl OriginalState {
    // Used by the Windows impl and the test module; on non-Windows the compiler
    // can't see the cfg(windows) caller so we suppress the dead-code lint.
    #[cfg_attr(not(windows), allow(dead_code))]
    fn from_tag_value(tag: &str, value: Option<u32>) -> Option<Self> {
        match tag {
            "absent" => Some(OriginalState::Absent),
            "present" => value.map(OriginalState::Present),
            _ => None,
        }
    }

    // Used by imp::write_restore_file (Windows) and the test module.
    // The lint fires because they are not called from non-cfg-gated production
    // code paths; suppress it rather than restructure.
    #[allow(dead_code)]
    fn tag(&self) -> &'static str {
        match self {
            OriginalState::Absent => "absent",
            OriginalState::Present(_) => "present",
        }
    }

    #[allow(dead_code)]
    fn value_u32(&self) -> Option<u32> {
        match self {
            OriginalState::Absent => None,
            OriginalState::Present(v) => Some(*v),
        }
    }
}

// ─── Windows implementation ───────────────────────────────────────────────────

#[cfg(windows)]
mod imp {
    use super::OriginalState;
    use std::path::{Path, PathBuf};
    use winreg::enums::*;
    use winreg::RegKey;

    const AUTOPLAY_KEY: &str =
        "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\AutoplayHandlers";
    const VALUE_NAME: &str = "DisableAutoplay";

    /// Read the current `DisableAutoplay` value (may be absent).
    fn read_current() -> OriginalState {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        match hkcu.open_subkey(AUTOPLAY_KEY) {
            Err(_) => OriginalState::Absent,
            Ok(key) => match key.get_value::<u32, _>(VALUE_NAME) {
                Ok(v) => OriginalState::Present(v),
                Err(_) => OriginalState::Absent,
            },
        }
    }

    /// Write `DisableAutoplay = 1`.
    fn set_disabled() -> Result<(), String> {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (key, _) = hkcu
            .create_subkey(AUTOPLAY_KEY)
            .map_err(|e| format!("create_subkey({AUTOPLAY_KEY}): {e}"))?;
        key.set_value(VALUE_NAME, &1u32)
            .map_err(|e| format!("set_value({VALUE_NAME}): {e}"))?;
        Ok(())
    }

    /// Restore the original state (delete value or write back the old DWORD).
    fn restore(original: &OriginalState) -> Result<(), String> {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        match original {
            OriginalState::Absent => {
                // Best-effort: open the key and delete the value. If the key
                // or value doesn't exist the goal is already met.
                match hkcu.open_subkey(AUTOPLAY_KEY) {
                    Err(_) => {} // key absent → nothing to do
                    Ok(key) => {
                        key.delete_value(VALUE_NAME).ok(); // ignore "not found"
                    }
                }
            }
            OriginalState::Present(v) => {
                let (key, _) = hkcu
                    .create_subkey(AUTOPLAY_KEY)
                    .map_err(|e| format!("create_subkey({AUTOPLAY_KEY}): {e}"))?;
                key.set_value(VALUE_NAME, v)
                    .map_err(|e| format!("set_value({VALUE_NAME}={v}): {e}"))?;
            }
        }
        Ok(())
    }

    /// Path to the JSON file that records the pre-Heirvo original state.
    fn restore_file_path(data_dir: &Path) -> PathBuf {
        data_dir.join("autoplay_restore.json")
    }

    /// Serialise the original state to JSON and write it to the restore file.
    fn write_restore_file(path: &Path, original: &OriginalState) -> Result<(), String> {
        let obj = match original {
            OriginalState::Absent => serde_json::json!({"state": "absent"}),
            OriginalState::Present(v) => serde_json::json!({"state": "present", "value": v}),
        };
        let text = serde_json::to_string(&obj).map_err(|e| e.to_string())?;
        std::fs::write(path, text).map_err(|e| format!("write {}: {e}", path.display()))?;
        Ok(())
    }

    /// Read and parse the restore file. Returns `None` on any error.
    fn read_restore_file(path: &Path) -> Option<OriginalState> {
        let text = std::fs::read_to_string(path).ok()?;
        let v: serde_json::Value = serde_json::from_str(&text).ok()?;
        let tag = v.get("state")?.as_str()?;
        let value = v.get("value").and_then(|x| x.as_u64()).map(|x| x as u32);
        OriginalState::from_tag_value(tag, value)
    }

    /// Called on app startup. Saves the original `DisableAutoplay` state (only
    /// if the restore file is absent) and then sets `DisableAutoplay = 1`.
    /// This function is intentionally non-fatal: any error is logged and the
    /// app continues.
    pub fn suppress_on_startup(data_dir: &Path) {
        let restore_path = restore_file_path(data_dir);

        // Determine the "true original" — either from an existing restore file
        // (crash recovery path) or from the live registry (fresh run).
        let original = if restore_path.exists() {
            // A previous run crashed before restoring. The file still contains
            // the genuine pre-Heirvo state — do NOT overwrite it.
            match read_restore_file(&restore_path) {
                Some(o) => {
                    tracing::warn!(
                        "AutoPlay guard: restore file found from a previous crashed run \
                         (original state={:?}); will restore on this run's clean exit",
                        o
                    );
                    o
                }
                None => {
                    // Corrupt restore file — fall back to live registry.
                    tracing::warn!(
                        "AutoPlay guard: restore file is corrupt; reading current state \
                         from registry as fallback"
                    );
                    let o = read_current();
                    // Try to rewrite a valid restore file so the next clean exit works.
                    if let Err(e) = write_restore_file(&restore_path, &o) {
                        tracing::warn!("AutoPlay guard: could not rewrite restore file: {e}");
                    }
                    o
                }
            }
        } else {
            // Normal (first-run or post-clean-exit) path: read live registry and
            // save it so we can restore on exit.
            let o = read_current();
            if let Err(e) = write_restore_file(&restore_path, &o) {
                tracing::warn!("AutoPlay guard: could not write restore file: {e}");
                // Continue anyway — we still suppress AutoPlay; the risk is
                // that we can't guarantee exact restore on crash, but the belt-
                // and-suspenders strategy recovers on the next clean run.
            }
            o
        };

        let was = match &original {
            OriginalState::Absent => "enabled (value absent)",
            OriginalState::Present(0) => "enabled (value=0)",
            OriginalState::Present(1) => "disabled (value=1)",
            OriginalState::Present(v) => {
                // Unusual value — log it so we restore exactly.
                tracing::info!("AutoPlay guard: unusual original DisableAutoplay value={v}");
                "non-standard value"
            }
        };

        match set_disabled() {
            Ok(()) => tracing::info!(
                "AutoPlay globally suppressed while Heirvo runs (was: {was}); will restore on exit"
            ),
            Err(e) => tracing::warn!(
                "AutoPlay guard: could not set DisableAutoplay=1: {e} \
                 (focused-window suppression still active)"
            ),
        }
    }

    /// Called on clean exit. Restores the original `DisableAutoplay` state from
    /// the restore file and deletes the file. Non-fatal.
    pub fn restore_on_exit(data_dir: &Path) {
        let restore_path = restore_file_path(data_dir);

        let original = match read_restore_file(&restore_path) {
            Some(o) => o,
            None => {
                // File absent or corrupt — nothing we can safely restore to.
                tracing::warn!(
                    "AutoPlay guard: no valid restore file found on exit; \
                     leaving registry as-is to avoid data loss"
                );
                return;
            }
        };

        let label = match &original {
            OriginalState::Absent => "enabled (remove value)".to_string(),
            OriginalState::Present(v) => format!("DisableAutoplay={v}"),
        };

        match restore(&original) {
            Ok(()) => tracing::info!("AutoPlay setting restored to {label}"),
            Err(e) => {
                tracing::warn!("AutoPlay guard: restore failed: {e}; retaining restore file for next run");
                // Don't delete the restore file — next startup will retry.
                return;
            }
        }

        // Registry restore succeeded — clean up the sentinel file.
        if let Err(e) = std::fs::remove_file(&restore_path) {
            // Non-fatal: the file will simply be found again on the next startup
            // and treated as a crash-recovery case, which is harmless.
            tracing::warn!(
                "AutoPlay guard: could not delete restore file {}: {e}",
                restore_path.display()
            );
        }
    }
}

// ─── Public surface (Windows) ─────────────────────────────────────────────────

/// Suppress AutoPlay globally while Heirvo is running. Call once at startup.
/// Non-fatal on all errors.
#[cfg(windows)]
pub fn suppress_on_startup(data_dir: &Path) {
    imp::suppress_on_startup(data_dir);
}

/// Restore the original AutoPlay state and clean up the sentinel file.
/// Call on clean exit. Non-fatal on all errors.
#[cfg(windows)]
pub fn restore_on_exit(data_dir: &Path) {
    imp::restore_on_exit(data_dir);
}

// ─── Non-Windows stubs ────────────────────────────────────────────────────────

/// No-op on non-Windows platforms.
#[cfg(not(windows))]
pub fn suppress_on_startup(_data_dir: &Path) {}

/// No-op on non-Windows platforms.
#[cfg(not(windows))]
pub fn restore_on_exit(_data_dir: &Path) {}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::OriginalState;

    /// Helper: what would we do in the registry for each original state?
    fn restore_label(original: &OriginalState) -> String {
        match original {
            OriginalState::Absent => "delete DisableAutoplay value".to_string(),
            OriginalState::Present(v) => format!("write DisableAutoplay={v}"),
        }
    }

    #[test]
    fn restore_label_absent() {
        let s = OriginalState::Absent;
        assert_eq!(restore_label(&s), "delete DisableAutoplay value");
    }

    #[test]
    fn restore_label_present_zero() {
        let s = OriginalState::Present(0);
        assert_eq!(restore_label(&s), "write DisableAutoplay=0");
    }

    #[test]
    fn restore_label_present_one() {
        let s = OriginalState::Present(1);
        assert_eq!(restore_label(&s), "write DisableAutoplay=1");
    }

    #[test]
    fn original_state_round_trips_absent() {
        let o = OriginalState::Absent;
        let tag = o.tag();
        let val = o.value_u32();
        let restored = OriginalState::from_tag_value(tag, val).unwrap();
        assert_eq!(restored, OriginalState::Absent);
    }

    #[test]
    fn original_state_round_trips_present() {
        for &v in &[0u32, 1, 42] {
            let o = OriginalState::Present(v);
            let tag = o.tag();
            let val = o.value_u32();
            let restored = OriginalState::from_tag_value(tag, val).unwrap();
            assert_eq!(restored, OriginalState::Present(v));
        }
    }

    #[test]
    fn from_tag_value_unknown_tag_returns_none() {
        assert!(OriginalState::from_tag_value("garbage", None).is_none());
    }

    #[test]
    fn from_tag_value_present_without_value_returns_none() {
        // "present" tag requires a value — absent value → None
        assert!(OriginalState::from_tag_value("present", None).is_none());
    }

    #[test]
    fn json_round_trip_absent() {
        // Simulate what write_restore_file produces and read_restore_file parses.
        let obj = serde_json::json!({"state": "absent"});
        let text = serde_json::to_string(&obj).unwrap();
        let v: serde_json::Value = serde_json::from_str(&text).unwrap();
        let tag = v.get("state").unwrap().as_str().unwrap();
        let value = v.get("value").and_then(|x| x.as_u64()).map(|x| x as u32);
        let result = OriginalState::from_tag_value(tag, value).unwrap();
        assert_eq!(result, OriginalState::Absent);
    }

    #[test]
    fn json_round_trip_present() {
        let obj = serde_json::json!({"state": "present", "value": 0u32});
        let text = serde_json::to_string(&obj).unwrap();
        let v: serde_json::Value = serde_json::from_str(&text).unwrap();
        let tag = v.get("state").unwrap().as_str().unwrap();
        let value = v.get("value").and_then(|x| x.as_u64()).map(|x| x as u32);
        let result = OriginalState::from_tag_value(tag, value).unwrap();
        assert_eq!(result, OriginalState::Present(0));
    }
}
