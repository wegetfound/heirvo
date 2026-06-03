//! AutoPlay handler registration for Heirvo DVD-recovery app.
//!
//! Registers Heirvo as a user-scoped AutoPlay handler so Windows offers
//! "Rescue with Heirvo" when the user inserts an optical disc.
//!
//! All registry writes are under HKEY_CURRENT_USER — no admin required,
//! fully reversible by calling `set_enabled(false)`.

use once_cell::sync::Lazy;
use std::sync::Mutex;

/// Module-level stash for the disc path AutoPlay launched us with (e.g. "E:\\").
static PENDING_DISC: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));

/// Store the drive path AutoPlay launched us with.
pub fn set_pending_disc(path: Option<String>) {
    if let Ok(mut guard) = PENDING_DISC.lock() {
        *guard = path;
    }
}

/// Take and clear the pending disc path (consumed by the get_pending_disc command).
pub fn take_pending_disc() -> Option<String> {
    PENDING_DISC.lock().ok()?.take()
}

// ─── Windows-only registry implementation ────────────────────────────────────

#[cfg(windows)]
mod registry {
    use winreg::enums::*;
    use winreg::RegKey;

    const HANDLER_KEY: &str =
        "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\AutoplayHandlers\\Handlers\\HeirvoRescueDisc";

    const CLASSES_KEY: &str = "Software\\Classes\\Heirvo.RescueDisc";

    const EVENTS: &[&str] = &[
        "PlayDVDMovieOnArrival",
        "PlayCDAudioOnArrival",
        "PlayBluRayOnArrival",
        "MixedContentOnArrival",
    ];

    fn event_key(event: &str) -> String {
        format!(
            "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\AutoplayHandlers\\EventHandlers\\{}",
            event
        )
    }

    fn current_exe_str() -> Result<String, String> {
        std::env::current_exe()
            .map_err(|e| e.to_string())?
            .to_str()
            .ok_or_else(|| "Executable path contains non-UTF-8 characters".to_string())
            .map(|s| s.to_string())
    }

    /// True if the AutoPlay handler is currently registered.
    pub fn is_enabled() -> bool {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        hkcu.open_subkey(HANDLER_KEY).is_ok()
    }

    /// Register (enabled=true) or unregister (enabled=false) the handler.
    pub fn set_enabled(enabled: bool) -> Result<(), String> {
        if enabled {
            register()
        } else {
            unregister()
        }
    }

    fn register() -> Result<(), String> {
        let exe = current_exe_str()?;
        let command = format!("\"{}\" \"%L\"", exe);
        let icon = format!("{},0", exe);

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);

        // 1. ProgID — Software\Classes\Heirvo.RescueDisc
        {
            let (progid, _) = hkcu
                .create_subkey(CLASSES_KEY)
                .map_err(|e| e.to_string())?;
            progid
                .set_value("", &"Rescue with Heirvo")
                .map_err(|e| e.to_string())?;
        }
        {
            let (icon_key, _) = hkcu
                .create_subkey(format!("{}\\DefaultIcon", CLASSES_KEY))
                .map_err(|e| e.to_string())?;
            icon_key
                .set_value("", &icon.as_str())
                .map_err(|e| e.to_string())?;
        }
        {
            let (cmd_key, _) = hkcu
                .create_subkey(format!("{}\\shell\\open\\command", CLASSES_KEY))
                .map_err(|e| e.to_string())?;
            cmd_key
                .set_value("", &command.as_str())
                .map_err(|e| e.to_string())?;
        }

        // 2. Handler definition
        {
            let (handler, _) = hkcu
                .create_subkey(HANDLER_KEY)
                .map_err(|e| e.to_string())?;
            handler
                .set_value("Action", &"Rescue this disc with Heirvo")
                .map_err(|e| e.to_string())?;
            handler
                .set_value("Provider", &"Heirvo")
                .map_err(|e| e.to_string())?;
            handler
                .set_value("InvokeProgID", &"Heirvo.RescueDisc")
                .map_err(|e| e.to_string())?;
            handler
                .set_value("InvokeVerb", &"open")
                .map_err(|e| e.to_string())?;
            handler
                .set_value("DefaultIcon", &icon.as_str())
                .map_err(|e| e.to_string())?;
        }

        // 3. Associate with optical-only AutoPlay events
        for event in EVENTS {
            let (ev_key, _) = hkcu
                .create_subkey(event_key(event))
                .map_err(|e| e.to_string())?;
            ev_key
                .set_value("HeirvoRescueDisc", &"")
                .map_err(|e| e.to_string())?;
        }

        tracing::info!("Heirvo AutoPlay handler registered (HKCU, exe={})", exe);
        Ok(())
    }

    fn unregister() -> Result<(), String> {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);

        // Delete handler definition
        hkcu.delete_subkey_all(HANDLER_KEY)
            .map_err(|e| e.to_string())?;

        // Delete ProgID tree
        hkcu.delete_subkey_all(CLASSES_KEY)
            .map_err(|e| e.to_string())?;

        // Remove our value from each event handler key; ignore "not found"
        for event in EVENTS {
            match hkcu.open_subkey(event_key(event)) {
                Ok(ev_key) => {
                    ev_key.delete_value("HeirvoRescueDisc").ok();
                }
                Err(_) => {} // key doesn't exist — nothing to clean up
            }
        }

        tracing::info!("Heirvo AutoPlay handler unregistered (HKCU)");
        Ok(())
    }
}

// ─── Public surface (Windows) ─────────────────────────────────────────────────

/// True if the AutoPlay handler is currently registered.
#[cfg(windows)]
pub fn is_enabled() -> bool {
    registry::is_enabled()
}

/// Register (enabled=true) or unregister (enabled=false) the handler.
/// Uses the current executable path. Returns Err(String) on failure.
#[cfg(windows)]
pub fn set_enabled(enabled: bool) -> Result<(), String> {
    registry::set_enabled(enabled)
}

// ─── Non-Windows stubs ────────────────────────────────────────────────────────

/// Always returns false on non-Windows platforms.
#[cfg(not(windows))]
pub fn is_enabled() -> bool {
    false
}

/// No-op on non-Windows platforms.
#[cfg(not(windows))]
pub fn set_enabled(_enabled: bool) -> Result<(), String> {
    Ok(())
}
