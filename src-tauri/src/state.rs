//! Global application state managed by Tauri.

use crate::disc::drive::DriveInfo;
use crate::error::AppResult;
use crate::recovery::engine::RecoveryEngine;
use crate::session::db::Db;
use parking_lot::RwLock;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

pub struct AppState {
    pub db: Db,
    /// Active recovery engines keyed by session id.
    pub engines: Arc<RwLock<HashMap<Uuid, Arc<RecoveryEngine>>>>,
}

impl AppState {
    pub async fn init(app: &AppHandle) -> AppResult<()> {
        let data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| crate::error::AppError::Internal(format!("app_data_dir: {e}")))?;
        std::fs::create_dir_all(&data_dir)?;

        let db_path = data_dir.join("dvd-recovery.db");
        tracing::info!("Opening database at {}", db_path.display());
        let db = Db::open(&db_path).await?;
        db.migrate().await?;

        // Clear any stale `heirvo_trans_*.wav` files left behind by a prior
        // crash. The worker now cleans these up per-job, but if the app was
        // killed mid-transcription nothing got the chance.
        sweep_stale_temp_wavs();

        let db_for_worker = db.clone();
        let state = Self {
            db,
            engines: Arc::new(RwLock::new(HashMap::new())),
        };

        app.manage(state);
        tracing::info!("App state initialized");

        // Spawn the transcription queue worker (single concurrent job).
        crate::transcription::worker::spawn_worker(app.clone(), db_for_worker);

        // Spawn the drive watcher: polls every 2s, emits `drives:changed` when
        // the set of optical drives or their `has_media` flag changes.
        let app_handle = app.clone();
        tauri::async_runtime::spawn(async move {
            run_drive_watcher(app_handle).await;
        });

        Ok(())
    }
}

/// Remove stale `heirvo_trans_*.wav` files from the temp dir on startup.
/// These are left behind when transcription crashes mid-flight (or the user
/// kills the app). At ~115 MB per hour of audio they pile up fast on a
/// commercial workload.
fn sweep_stale_temp_wavs() {
    let temp = std::env::temp_dir();
    let entries = match std::fs::read_dir(&temp) {
        Ok(e) => e,
        Err(_) => return,
    };
    let mut count = 0;
    let mut bytes = 0u64;
    for entry in entries.flatten() {
        let name = entry.file_name();
        let name_str = name.to_string_lossy();
        if name_str.starts_with("heirvo_trans_") && name_str.ends_with(".wav") {
            if let Ok(meta) = entry.metadata() {
                bytes += meta.len();
            }
            if std::fs::remove_file(entry.path()).is_ok() {
                count += 1;
            }
        }
    }
    if count > 0 {
        tracing::info!(
            "Swept {} stale transcription temp file(s), reclaimed {:.1} MB",
            count,
            bytes as f64 / 1_048_576.0
        );
    }
}

/// Drive watcher.
///
/// Polls every second and emits `drives:changed` when the set of optical
/// drives or any `has_media` flag changes. Uses `IOCTL_STORAGE_CHECK_VERIFY`
/// (which doesn't spin the drive) so 1Hz polling is fine even on bus-powered
/// USB drives.
///
/// **Future optimization:** register for `WM_DEVICECHANGE` messages via a
/// hidden message-only window on a dedicated thread. That'd give us
/// near-instant detection instead of 1s lag. Skipped for v1 because polling
/// is robust, simple, and adds no Win32 attack surface — the latency
/// difference is imperceptible during the few drive-plug events per session.
async fn run_drive_watcher(app: AppHandle) {
    let mut last: Vec<DriveInfo> = Vec::new();
    let mut interval = tokio::time::interval(Duration::from_secs(1));
    interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
    // First tick fires immediately, so consume it.
    interval.tick().await;
    loop {
        interval.tick().await;
        let drives = match tokio::task::spawn_blocking(crate::disc::drive::list_drives).await {
            Ok(Ok(d)) => d,
            _ => continue,
        };
        if drives != last {
            tracing::debug!(
                "drives:changed: {} drive(s), {} with media",
                drives.len(),
                drives.iter().filter(|d| d.has_media).count()
            );
            let _ = app.emit("drives:changed", &drives);
            last = drives;
        }
    }
}
