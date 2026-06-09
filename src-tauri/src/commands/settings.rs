//! Small persisted app settings (a tiny JSON file in the app data dir).
//!
//! Mirrors the `preflight.json` pattern. Currently holds the storage-hygiene
//! `auto_tidy` toggle; new simple prefs can be added as fields here.

use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    /// Auto-remove the VOB working-files after a video is saved. Default ON.
    #[serde(default = "default_true")]
    auto_tidy: bool,
}

fn default_true() -> bool {
    true
}

impl Default for AppSettings {
    fn default() -> Self {
        Self { auto_tidy: true }
    }
}

fn config_path(app: &AppHandle) -> AppResult<PathBuf> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Internal(format!("app_data_dir: {e}")))?;
    std::fs::create_dir_all(&dir)?;
    Ok(dir.join("settings.json"))
}

fn load(app: &AppHandle) -> AppSettings {
    let Ok(path) = config_path(app) else {
        return AppSettings::default();
    };
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save(app: &AppHandle, cfg: &AppSettings) -> AppResult<()> {
    let path = config_path(app)?;
    let s = serde_json::to_string_pretty(cfg)
        .map_err(|e| AppError::Internal(format!("serialize settings: {e}")))?;
    std::fs::write(&path, s)?;
    Ok(())
}

/// Backend-side read of the auto-tidy preference (default true when unset).
/// Used by `save_as_mp4` to decide whether to clean up its VOB scratch.
pub fn auto_tidy_enabled(app: &AppHandle) -> bool {
    load(app).auto_tidy
}

#[tauri::command]
pub async fn get_auto_tidy(app: AppHandle) -> bool {
    load(&app).auto_tidy
}

#[tauri::command]
pub async fn set_auto_tidy(app: AppHandle, enabled: bool) -> AppResult<()> {
    let mut cfg = load(&app);
    cfg.auto_tidy = enabled;
    save(&app, &cfg)
}
