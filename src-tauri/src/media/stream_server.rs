//! Localhost HTTP streaming server — transcodes MPEG-2 / VOB sources to
//! H.264 fragmented MP4 on the fly so WebView2 can play recovered DVDs.
//!
//! # Endpoint
//! `GET /stream?src=<url-encoded absolute file path>`
//!
//! Returns a `video/mp4` response with ffmpeg piped stdout as the body.
//! ffmpeg emits a fragmented MP4 (`frag_keyframe+empty_moov`) so the browser
//! can start playback before the stream ends.
//!
//! # Security
//! Only paths under the Heirvo vault, the app-data dir, or the OS Documents /
//! Videos folder are served. Everything else gets 403.
//!
//! # Stage-1 lifecycle note
//! ffmpeg is best-effort killed when the HTTP connection drops (via a
//! `KillOnDrop` guard wrapped around the child). If the Tokio task finishes
//! reaping the child before the connection drops, the guard becomes a no-op.
//! Full lifecycle management (restart, progress, seek) is Stage 2.
//!
//! Stage-1 known leak: if the client disconnects abruptly before the
//! `ReaderStream` future is polled again, the `KillOnDrop` guard destructor
//! runs on the next poll/drop boundary — typically within one Tokio tick.
//! Concurrent requests each spawn their own ffmpeg child; no limiting is done.

use crate::media::ffmpeg;
use crate::util::proc::NoConsole;
use tauri::Manager as _;
use axum::{
    body::Body,
    extract::Query,
    http::{header, StatusCode},
    response::Response,
    routing::get,
    Router,
};
use std::path::PathBuf;
use tauri::AppHandle;
use tokio::net::TcpListener;
use tokio_util::io::ReaderStream;

/// The base URL this server is listening on, e.g. `http://127.0.0.1:51234`.
/// Stored in Tauri app state and returned by the `get_stream_base` command.
#[derive(Clone, Debug)]
pub struct StreamBase(pub String);

/// Query parameters for `GET /stream`.
#[derive(serde::Deserialize)]
pub struct StreamQuery {
    src: String,
}

/// RAII guard that kills an ffmpeg child process when dropped.
/// Best-effort — errors during kill are logged and swallowed.
struct KillOnDrop(tokio::process::Child);

impl Drop for KillOnDrop {
    fn drop(&mut self) {
        // `start_kill` sends SIGKILL / TerminateProcess without waiting.
        if let Err(e) = self.0.start_kill() {
            tracing::debug!("stream_server: KillOnDrop: {e}");
        }
    }
}

/// Bind to `127.0.0.1:0` (ephemeral port), start the server on the Tokio
/// runtime, and return the chosen base URL.
///
/// Call this once from `lib.rs` setup.
pub fn start(app: AppHandle) -> anyhow::Result<String> {
    // Bind first (sync) so we know the port before returning.
    let listener = std::net::TcpListener::bind("127.0.0.1:0")?;
    // REQUIRED: tokio's `TcpListener::from_std` assumes a non-blocking socket.
    // Without this the async accept loop blocks the runtime and no connection is
    // ever served — the server logs "listening" but every request hangs.
    listener.set_nonblocking(true)?;
    let port = listener.local_addr()?.port();
    let base = format!("http://127.0.0.1:{port}");
    tracing::info!("stream_server: listening on {base}");

    let router = Router::new()
        .route("/stream", get(handle_stream))
        .with_state(app);

    tauri::async_runtime::spawn(async move {
        let listener =
            TcpListener::from_std(listener).expect("stream_server: TcpListener::from_std");
        if let Err(e) = axum::serve(listener, router).await {
            tracing::error!("stream_server exited with error: {e}");
        }
    });

    Ok(base)
}

/// Compute the list of allowed root prefixes for the current user / machine.
///
/// Paths allowed:
///   1. `%APPDATA%\com.heirvo.app\` — the vault (primary)
///   2. OS Documents dir (`~/Documents`)
///   3. OS Video dir (`~/Videos`)
fn allowed_roots(app: &AppHandle) -> Vec<PathBuf> {
    let mut roots = Vec::new();

    // 1. App-data dir (vault).
    if let Ok(p) = app.path().app_data_dir() {
        roots.push(p);
    }

    // 2. User documents.
    if let Some(p) = dirs::document_dir() {
        roots.push(p);
    }

    // 3. User videos.
    if let Some(p) = dirs::video_dir() {
        roots.push(p);
    }

    roots
}

/// `GET /stream?src=<encoded-path>`
async fn handle_stream(
    axum::extract::State(app): axum::extract::State<AppHandle>,
    Query(q): Query<StreamQuery>,
) -> Result<Response<Body>, StatusCode> {
    let src_raw = q.src;

    // ── Security: canonicalize + allowlist check ─────────────────────────────
    let src_path = std::path::Path::new(&src_raw);
    let canon = std::fs::canonicalize(src_path).map_err(|e| {
        tracing::warn!(
            "stream_server: cannot canonicalize '{}': {e}",
            src_raw
        );
        StatusCode::FORBIDDEN
    })?;

    let roots = allowed_roots(&app);
    let allowed = roots.iter().any(|root| {
        // Canonicalize roots too so drive-letter case differences don't matter.
        let canon_root = std::fs::canonicalize(root).unwrap_or_else(|_| root.clone());
        canon.starts_with(&canon_root)
    });

    if !allowed {
        tracing::warn!(
            "stream_server: rejected path '{}' — not under an allowed root",
            canon.display()
        );
        return Err(StatusCode::FORBIDDEN);
    }

    // ── Locate bundled ffmpeg ─────────────────────────────────────────────────
    let ffmpeg_bin = ffmpeg::locate_ffmpeg(&app).map_err(|e| {
        tracing::error!("stream_server: ffmpeg not found: {e}");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // ── Resolve the ffmpeg input ──────────────────────────────────────────────
    // A recovered `.iso` usually has a dead filesystem, so `-i image.iso` fails.
    // Carve the MPEG-2 program stream by offset and FEED IT VIA A PIPE
    // (`-i pipe:0`) rather than ffmpeg's `subfile:` protocol: the MPEG-PS
    // demuxer back-seeks pathologically on a seekable multi-GB image (~0.2x
    // realtime — the player buffer-starves), whereas a non-seekable pipe forces
    // linear reads and full speed. The pipe is fed by `spawn_image_feeder`.
    let is_iso = canon
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case("iso"))
        .unwrap_or(false);
    let iso_offset: Option<u64> = if is_iso {
        match crate::media::iso::find_mpeg_ps_offset(&canon) {
            Ok(Some(off)) => Some(off),
            _ => {
                tracing::warn!(
                    "stream_server: no program stream found in ISO '{}'",
                    canon.display()
                );
                None
            }
        }
    } else {
        None
    };

    let canon_str = canon.to_string_lossy().into_owned();
    let input_arg = if iso_offset.is_some() { "pipe:0" } else { canon_str.as_str() };

    // ── Spawn ffmpeg, piping stdout ───────────────────────────────────────────
    let mut cmd = tokio::process::Command::new(&ffmpeg_bin);
    cmd.no_console();
    cmd.args([
        "-hide_banner",
        "-loglevel",
        "error",
        "-err_detect",
        "ignore_err",
        "-fflags",
        "+discardcorrupt+genpts",
        "-i",
        input_arg,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-ac",
        "2",
        "-movflags",
        "frag_keyframe+empty_moov+default_base_moof",
        "-f",
        "mp4",
        "pipe:1",
    ]);
    cmd.stdin(if iso_offset.is_some() {
        std::process::Stdio::piped()
    } else {
        std::process::Stdio::null()
    })
    .stdout(std::process::Stdio::piped())
    // Capture stderr so it doesn't bleed into the HTTP body.
    .stderr(std::process::Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| {
        tracing::error!("stream_server: spawn ffmpeg: {e}");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // For an ISO source, stream the carved program stream into ffmpeg's stdin.
    if let Some(offset) = iso_offset {
        if let Some(stdin) = child.stdin.take() {
            crate::media::iso::spawn_image_feeder(canon.clone(), offset, stdin);
        }
    }

    let stdout = child.stdout.take().ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;
    let stderr = child.stderr.take();

    // Log ffmpeg stderr in the background.
    if let Some(stderr) = stderr {
        tokio::spawn(async move {
            use tokio::io::AsyncBufReadExt;
            let mut lines = tokio::io::BufReader::new(stderr).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                tracing::debug!(target: "ffmpeg::stream", "{}", line);
            }
        });
    }

    // Wrap the child in a kill-on-drop guard. The guard is moved into the
    // stream so ffmpeg is terminated when the response body is dropped
    // (connection closed, stream exhausted, or request cancelled).
    let guard = KillOnDrop(child);

    // Chain the guard drop onto the byte stream. When the stream yields `None`
    // (ffmpeg exited naturally) or is dropped (connection closed), `guard` is
    // dropped, which fires `start_kill`.
    let raw_stream = ReaderStream::new(stdout);
    // Attach the guard by moving it into an async_stream that drops it when done.
    let body_stream = async_stream::stream! {
        // Hold the guard alive for the lifetime of the stream.
        let _guard = guard;
        let mut pinned = std::pin::pin!(raw_stream);
        loop {
            use futures_util::StreamExt;
            match pinned.next().await {
                Some(item) => yield item,
                None => break,
            }
        }
    };

    let body = Body::from_stream(body_stream);

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "video/mp4")
        .header(header::CACHE_CONTROL, "no-store")
        .body(body)
        .expect("stream_server: response builder"))
}
