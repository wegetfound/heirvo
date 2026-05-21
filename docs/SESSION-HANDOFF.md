# Session Handoff — Heirvo (Memories screen + Phase 2 pipeline)

_Last updated: 2026-05-21. Read this first, then `docs/phase2-recovery-library-bridge.md`._

## TL;DR
Phase 2 backend + Memories screen landed earlier (`95f92fe`). This session: resolved the black-video question (no bug), shipped **true OS-level theater fullscreen**, merged **Kodak PCD decode**, and shipped + **live-validated an ImageMagick runtime installer** (download→extract→active). All verified on the real Tauri build. Working tree clean, `HEAD = 3b1a430` (+ this doc).

## ✅ Validated on a real build (Tauri dev, real DB)

### Earlier (`95f92fe`)
- `disc_photos` migration applied cleanly on the populated DB.
- Quiet Rail nav, immersive Memories screen, memory cross-fade + room-glow, in-app theater, `/watch` transcript screen.

### This session
- **Black-video RESOLVED — no bug.** Big Buck Bunny was imported as a real library disc (`heirvo-sample-bunny`) and **paints correctly in the actual Memories player** (white rabbit, green grass, purple butterfly — verified on the real build, not just DevTools injection). The old "Heirvo Test Video" was AI/TTS narration with a genuinely black video track. The player + import + `convertFileSrc`→`<video>` paint path is fully validated.
- **Theater OS fullscreen — DONE and verified (`c72f0b9`, `c849164`).** Clicking ⤢ (or pressing F) now makes the window cover the **entire monitor** (rect `0,0→1536×864`, taskbar covered) with **no title bar** — a true edge-to-edge takeover. X-button exit restores windowed chrome. Required two capabilities: `core:window:allow-set-fullscreen` + `core:window:allow-set-decorations` (setFullscreen alone left the caption bar on Windows/WebView2).
- **Kodak PCD decode — merged (`fa31659`), compiles + relaunches clean.** `media::imagemagick::locate()` mirrors ffmpeg (bundled→app_data→PATH); `pcd_to_jpeg()` runs `magick convert "<src>[2]" "<dst>"`. Both `convert_special_image` and the recovery bridge (`promote.rs`) route `.pcd` through it, with graceful fallback to the existing stub when `magick` isn't found.
- **ImageMagick runtime installer — DONE and validated end-to-end (`3b1a430`).** Mirrors ffmpeg's runtime-download model (chosen over bundling: keeps the installer lean; only users with a 1990s Photo CD pay the ~20MB cost). `imagemagick_install.rs` resolves the latest `portable-Q16-x64.7z` from the official ImageMagick GitHub releases API, streams it with `imagemagick:install_progress` events, 7z-extracts (via `sevenz-rust2`) the full portable folder to `<app_data>/imagemagick/` (versioned root dir flattened). New `install_imagemagick`/`imagemagick_status` commands + a Settings "Photo CD decoder" status row with install button. **Live-tested on the real build:** clicked Install → download → extract → `magick.exe` 7.1.2-23 Q16 landed in app_data and runs; `magick -list format` confirms `PCD rw-` (native coder); Settings row flipped to **Active** with the version string.

## 🟡 Remaining work

1. **Decode a REAL `.pcd` end-to-end.** Everything up to the decode is proven (magick installs, runs, lists PCD as a supported rw coder; the `magick convert "x.pcd[2]" out.jpg` syntax is standard). The one untested link is running that convert on a genuine Kodak Photo CD file — needs a real `.pcd` sample (none on hand; avoid sketchy random downloads — use a real Photo CD or a trusted sample). Should "just work" given PCD is a built-in coder.
2. **Recovery loop + photo gallery — BLOCKED on hardware (~2026-05-24).** Verifying the recovery→library bridge (`promote_session_to_library` → `disc_added` event → "Getting your video ready…" → playback) and the photo gallery (`disc_photos` rows + vault JPEGs + grid/lightbox) requires recovering a **real disc**. Test rig: a Samsung/TSSTcorp **SH-224DB** DVD burner on a Lenovo laptop. **The generic USB-SATA adapter does NOT work for optical drives** — confirmed via two discs (a 2004 VOB DVD + a known-good self-burned disc): drive enumerates as E: but `Win32_CDROMDrive.MediaLoaded` stays **False** with zero cdrom/disk error events, i.e. the bridge never relays ATAPI media status. Generic SATA→USB bridges are HDD/SSD-only; they drop the ATAPI/MMC command set optical drives need. **Fix:** a self-contained external USB DVD drive, or an enclosure explicitly rated for optical/ATAPI (internal SATA isn't an option on the laptop). User has an optical-capable enclosure arriving from China ~2026-05-24. **When it lands:** insert the 2004 VOB disc, confirm `MediaLoaded: True` (PowerShell `Get-CimInstance Win32_CDROMDrive`), then drive the rescue in-app and watch the terminal for `recovery: session … promoted to library disc …`. Code is compile-clean; the player half is proven via the bunny.
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
