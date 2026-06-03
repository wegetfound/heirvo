//! Heirvo — Rust core library
//!
//! Modules:
//! - `disc`     — low-level optical drive I/O (SCSI pass-through on Windows)
//! - `recovery` — sector map, multi-pass recovery engine
//! - `dvd`      — DVD structure parsing (IFO/BUP, VIDEO_TS layout)
//! - `media`    — FFmpeg pipeline (transcode, repair, ISO assembly)
//! - `ai`       — ONNX-based enhancement (upscale, interpolate, denoise)
//! - `session`  — SQLite-backed session persistence + resume logic
//! - `commands` — Tauri IPC command handlers

pub mod ai;
pub mod autoplay;
pub mod autoplay_handler;
pub mod commands;
pub mod disc;
pub mod dvd;
pub mod error;
pub mod library;
pub mod licensing;
pub mod media;
pub mod recovery;
pub mod session;
pub mod state;
pub mod transcription;
pub mod util;

use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

/// Pull a disc drive path (e.g. `E:\`) out of a process argument list. AutoPlay
/// launches us as `heirvo.exe "E:\"`, so we look for a `X:`-shaped argument.
fn extract_disc_path(args: Vec<String>) -> Option<String> {
    args.into_iter().find(|a| {
        let b = a.as_bytes();
        b.len() >= 2 && b[0].is_ascii_alphabetic() && b[1] == b':'
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Log to BOTH stderr (line-buffered, visible in dev terminal) and a file
    // alongside the database (always available even when stdout pipe stalls).
    let log_path = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("com.heirvo.app")
        .join("recovery.log");
    if let Some(parent) = log_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let log_file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .ok();

    let stderr_layer = tracing_subscriber::fmt::layer()
        .with_writer(std::io::stderr)
        .with_ansi(false);

    let registry = tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info,sqlx=warn".into()))
        .with(stderr_layer);

    if let Some(file) = log_file {
        let file_layer = tracing_subscriber::fmt::layer()
            .with_writer(std::sync::Mutex::new(file))
            .with_ansi(false);
        registry.with(file_layer).init();
    } else {
        registry.init();
    }

    tracing::info!("Heirvo starting up — log file at {}", log_path.display());

    // Cold launch via AutoPlay runs `heirvo.exe "E:\"` — stash that disc path so
    // the UI can route straight into the rescue flow once it mounts.
    autoplay_handler::set_pending_disc(extract_disc_path(std::env::args().skip(1).collect()));

    let builder = tauri::Builder::default()
        // Single-instance MUST be registered first. When AutoPlay launches a
        // second instance (disc inserted while Heirvo is already open), focus the
        // existing window and forward the disc path instead of opening a duplicate.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(win) = tauri::Manager::get_webview_window(app, "main") {
                let _ = win.unminimize();
                let _ = win.set_focus();
            }
            let path = extract_disc_path(argv.into_iter().skip(1).collect());
            autoplay_handler::set_pending_disc(path.clone());
            let _ = tauri::Emitter::emit(app, "autoplay:open-disc", serde_json::json!({ "path": path }));
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init());
    // NOTE: tauri-plugin-updater + tauri-plugin-process are temporarily
    // disabled. They require a generated ed25519 keypair (signing key) to
    // function. Re-enable BOTH together once `npx @tauri-apps/cli signer
    // generate` has been run and the public key pasted into tauri.conf.json
    // under bundle.windows.signingIdentity / plugins.updater.pubkey.

    builder
        .setup(|app| {
            let handle = app.handle().clone();
            // Block setup until DB is ready so commands always see initialized state.
            tauri::async_runtime::block_on(async move {
                if let Err(e) = state::AppState::init(&handle).await {
                    tracing::error!("Failed to initialize app state: {e:?}");
                    return Err::<(), _>(e);
                }
                Ok(())
            })?;

            // Stop Windows AutoPlay from popping a disc-player prompt over Heirvo
            // when the user inserts a disc to recover. No-op if the window or the
            // platform hook is unavailable.
            if let Some(win) = tauri::Manager::get_webview_window(app, "main") {
                autoplay::install(&win);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::drive::list_drives,
            commands::drive::check_disc,
            commands::drive::probe_disc_profile,
            commands::session::create_session,
            commands::session::list_sessions,
            commands::session::resume_session,
            commands::session::delete_session,
            commands::session::change_drive,
            commands::session::change_output_dir,
            commands::recovery::start_recovery,
            commands::recovery::pause_recovery,
            commands::recovery::cancel_recovery,
            commands::recovery::get_sector_map,
            commands::recovery::export_rmap,
            commands::recovery::import_rmap,
            commands::recovery::export_receipt_manifest,
            commands::dvd::analyze_structure,
            commands::dvd::extract_vobs,
            commands::dvd::extract_all_files,
            commands::dvd::health_score,
            commands::dvd::list_files_in_iso,
            commands::dvd::scan_iso_signatures,
            commands::media::create_iso,
            commands::media::transcode,
            commands::media::ffmpeg_status,
            commands::media::ffprobe_file,
            commands::media::install_ffmpeg,
            commands::media::imagemagick_status,
            commands::media::install_imagemagick,
            commands::media::save_as_mp4,
            commands::media::normalize_for_playback,
            commands::ai::list_models,
            commands::ai::download_model,
            commands::ai::ai_backend_info,
            commands::ai::queue_enhancement,
            commands::ai::get_job_status,
            commands::ai::list_enhancement_jobs,
            commands::ai::enhance_preview,
            commands::diagnostic::export_diagnostic_bundle,
            commands::diagnostic::get_log_path,
            commands::diagnostic::open_log_folder,
            commands::storage::list_storage_drives,
            commands::storage::open_folder,
            commands::session::rename_session,
            commands::license::get_license_status,
            commands::license::activate_license,
            commands::license::deactivate_license,
            commands::audio::read_audio_toc,
            commands::audio::extract_audio_tracks,
            commands::preflight::get_preflight_status,
            commands::preflight::mark_preflight_seen,
            commands::library::list_library_discs,
            commands::library::list_library_discs_page,
            commands::library::get_library_disc,
            commands::library::search_library_transcripts,
            commands::library::seed_library_demo,
            commands::library::export_disc_html,
            commands::library::import_video_disc,
            commands::library::import_media_disc,
            commands::library::get_import_size_preview,
            commands::library::delete_library_disc,
            commands::library::get_vault_stats,
            commands::library::list_importable_media_in_dir,
            commands::library::ensure_disc_thumbnail,
            commands::library::delete_library_discs_bulk,
            commands::library::convert_image_to_jpeg,
            commands::library::convert_special_image,
            commands::library::update_disc_video_path,
            commands::albums::create_album,
            commands::albums::list_albums,
            commands::albums::get_album_with_discs,
            commands::albums::rename_album,
            commands::albums::set_album_cover,
            commands::albums::delete_album,
            commands::albums::add_disc_to_album,
            commands::albums::remove_disc_from_album,
            commands::transcription::enqueue_transcription,
            commands::transcription::list_transcription_jobs,
            commands::transcription::jobs_for_disc,
            commands::transcription::cancel_transcription,
            commands::transcription::retry_transcription,
            commands::transcription::get_whisper_model_info,
            commands::transcription::set_whisper_model,
            commands::autoplay::autoplay_get_enabled,
            commands::autoplay::autoplay_set_enabled,
            commands::autoplay::get_pending_disc,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
