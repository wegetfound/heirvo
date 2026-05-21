# Session Handoff — Heirvo (Memories screen + Phase 2 pipeline)

_Last updated: 2026-05-21. Read this first, then `docs/phase2-recovery-library-bridge.md`._

## TL;DR
Phase 2 backend + Memories screen landed earlier (`95f92fe`). This session resolved the black-video question, shipped **true OS-level theater fullscreen** (verified end-to-end on the real build), and merged **Kodak PCD decode** via ImageMagick. Working tree clean, `HEAD = fa31659`.

## ✅ Validated on a real build (Tauri dev, real DB)

### Earlier (`95f92fe`)
- `disc_photos` migration applied cleanly on the populated DB.
- Quiet Rail nav, immersive Memories screen, memory cross-fade + room-glow, in-app theater, `/watch` transcript screen.

### This session
- **Black-video RESOLVED — no bug.** Big Buck Bunny was imported as a real library disc (`heirvo-sample-bunny`) and **paints correctly in the actual Memories player** (white rabbit, green grass, purple butterfly — verified on the real build, not just DevTools injection). The old "Heirvo Test Video" was AI/TTS narration with a genuinely black video track. The player + import + `convertFileSrc`→`<video>` paint path is fully validated.
- **Theater OS fullscreen — DONE and verified (`c72f0b9`, `c849164`).** Clicking ⤢ (or pressing F) now makes the window cover the **entire monitor** (rect `0,0→1536×864`, taskbar covered) with **no title bar** — a true edge-to-edge takeover. X-button exit restores windowed chrome. Required two capabilities: `core:window:allow-set-fullscreen` + `core:window:allow-set-decorations` (setFullscreen alone left the caption bar on Windows/WebView2).
- **Kodak PCD decode — merged (`fa31659`), compiles + relaunches clean.** `media::imagemagick::locate()` mirrors ffmpeg (bundled→app_data→PATH); `pcd_to_jpeg()` runs `magick convert "<src>[2]" "<dst>"`. Both `convert_special_image` and the recovery bridge (`promote.rs`) route `.pcd` through it, with graceful fallback to the existing stub when `magick` isn't found. (magick is NOT on this machine, so only the fallback path was exercised at runtime.)

## 🟡 Remaining work

1. **Bundle a real ImageMagick binary** to make PCD decode work for end users without `magick` on PATH. Place `magick.exe` at `src-tauri/resources/imagemagick/` (it's gitignored like ffmpeg) AND add `"resources/imagemagick/magick.exe"` to `bundle.resources` in `tauri.conf.json`. **Both must happen together** — the conf entry alone breaks the build-script resource-existence check (this is why the conf line was intentionally omitted from `fa31659`). Mirror how ffmpeg is acquired (`media/ffmpeg_install.rs` downloads at runtime — consider the same for ImageMagick to avoid a 100MB+ bundle). Downloading a binary needs explicit user sign-off.
2. **Recovery loop + photo gallery — blocked on physical media.** Verifying the recovery→library bridge (`promote_session_to_library` → `disc_added` event → "Getting your video ready…" → playback) and the photo gallery (`disc_photos` rows + vault JPEGs + grid/lightbox) requires recovering a **real disc** in a drive. No drive/disc was available this session ("No drive" in the log). Validate when a damaged DVD / photo CD is on hand. The code is compile-clean and the player half is proven via the bunny.
3. Separate track, untouched: **Lab Network** — operator-agreement red-team, 4 HQ backend decisions, real `/labs/apply` intake form.

## Key files
- Memories / theater fullscreen: `src/screens/library/Memories.tsx` — `setFullscreen`+`setDecorations` sync (useEffect ~line 1104), "F" shortcut (~1113).
- Capabilities: `src-tauri/capabilities/default.json` — `allow-set-fullscreen` + `allow-set-decorations`.
- PCD: `src-tauri/src/media/imagemagick.rs` (locate + pcd_to_jpeg), wired in `commands/library.rs` (`convert_special_image`) + `library/promote.rs` (`SpecialFormat::Pcd` arm).
- Bridge + media: `src-tauri/src/library/promote.rs`, `src-tauri/src/media/{transcode,ffmpeg,image}.rs`.
- Frontend loop: `src/lib/useRecoveryPromotion.ts`, `src/lib/ipc.ts`.

## Notes for next session
- Lead architect + delegate buildable backend chunks to **sonnet** subagents in **worktrees** (isolated `target/` → no cargo-lock contention with a running `cargo tauri dev`). Worktree subagents on this repo will create empty placeholder binaries for the gitignored `resources/{ffmpeg,whisper,imagemagick}/*.exe` to pass the build-script existence check — **do not merge those placeholders into main** (main has the real binaries; merge code only).
- **The real Tauri window launches OFF-SCREEN** at approx `(-25600,-25600)` and `Process.MainWindowHandle` returns a "Tao Thread Event Target" helper, NOT the visible window. Find the window whose class is **"Tauri Window"** and `MoveWindow` it on-screen (PowerShell + user32). The headless Vite preview throttles rAF, so GSAP + OS-level APIs (fullscreen/decorations) must be checked on the real build.
- A `cargo tauri dev` is currently running (background); the bunny disc + "Heirvo Test Video" live in the dev DB at `%APPDATA%\com.heirvo.app\`.
