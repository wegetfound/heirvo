# Session Handoff — Heirvo (Memories screen + Phase 2 pipeline)

_Last updated: 2026-05-21. Read this first, then `docs/phase2-recovery-library-bridge.md`._

## TL;DR
Two sessions shipped. Phase 2 backend, Memories screen, Quiet Rail nav, photo gallery, humane media states all landed in `95f92fe`. Then (`c72f0b9`) resolved the open black-video question and implemented true OS-level theater fullscreen. Working tree clean, `HEAD = c72f0b9`.

## ✅ Validated on a real build (Tauri dev, real DB)

### Previous session (`95f92fe`)
- `disc_photos` **migration applied cleanly on the populated DB**.
- App boots; **Quiet Rail nav** + warmer labels render.
- Immersive Memories screen renders; **memory switch cross-fade + room-glow work**; **in-app theater mode works**.
- `/watch` transcript screen renders correctly.

### This session (`c72f0b9`)
- **Black-video RESOLVED** — injected Big Buck Bunny (`C:\Temp\heirvo-sample-bunny.mp4`) directly via DevTools: colorful cartoon plays, `PLAYING OK`. **No WebView2 compositing bug**. The existing "Heirvo Test Video" was AI/TTS narration with a genuinely black video track.
- **Theater mode fullscreen** coded and TSC-clean (see below). Needs Rust rebuild to activate the new capability.

## 🔴 OPEN: Theater mode needs a `cargo tauri dev` rebuild to activate

**What was shipped (`c72f0b9`):**
- `getCurrentWindow().setFullscreen(fullscreen)` syncs React theater state → OS-level fullscreen (the expand button ⤢ now takes over the whole monitor, not just the app viewport).
- `"core:window:allow-set-fullscreen"` added to `src-tauri/capabilities/default.json`.
- "F" key shortcut wired (toggle theater on/off — was in button title but never implemented).

**Why it needs a rebuild:** Tauri 2 compiles capabilities into the Rust binary. The running debug binary (`D:\projects\Heirvo\src-tauri\target\debug\heirvo.exe`) was built before the capability was added, so `setFullscreen()` silently no-ops. Run `cargo tauri dev` (or `npx tauri dev`) to rebuild and test. The in-app overlay already works as a fallback in the interim.

## ⚙️ Compile-checked only (cargo + tsc clean) — needs real-build runtime test
- **Recovery → library bridge**: recover a real disc → watch terminal for `recovery: session … promoted to library disc …` → appears in Memories on its own, shows "Getting your video ready…" while normalizing, then plays.
- **Photo gallery from a real photo disc / CD of JPEGs** → `disc_photos` rows + vault JPEGs + grid/lightbox.
- **Kodak Photo CD (.pcd)** → should hit the humane "saved to files" path.
- **`normalizeForPlayback` → `updateDiscVideoPath` round-trip** (the `useRecoveryPromotion` hook).

## 📋 Remaining work (priority order)
1. **Rebuild + verify theater OS fullscreen** — run `cargo tauri dev`, click ⤢ or press F, confirm the window covers the whole monitor. Also verify Escape and F-key exit work. If the `setFullscreen` call still fails, check DevTools console for the error (the `.catch()` was silencing it).
2. **Kodak PCD decode** — bundle ImageMagick (`magick convert`) so `.pcd`→JPEG; wire into `convert_special_image` + the bridge. Real-build feature.
3. **Finish real-build validation** of the recovery loop + photo gallery (checklist in `docs/phase2-recovery-library-bridge.md`).
4. Separate track, untouched: **Lab Network** — operator-agreement red-team, 4 HQ backend decisions, real `/labs/apply` intake form.

## Key files
- Memories screen: `src/screens/library/Memories.tsx` — theater fullscreen uses `getCurrentWindow().setFullscreen()` (line ~1104); "F" key shortcut (line ~1113).
- Capabilities: `src-tauri/capabilities/default.json` — `core:window:allow-set-fullscreen` added.
- Watch/transcript: `src/screens/library/Watch.tsx`.
- Gallery: `src/screens/library/components/PhotoGallery.tsx`.
- Bridge + media: `src-tauri/src/library/promote.rs`, `src-tauri/src/media/{transcode,image}.rs`.
- Frontend loop: `src/lib/useRecoveryPromotion.ts`, `src/lib/ipc.ts`.

## Working style for next session
Lead architect + delegate buildable chunks to **sonnet** subagents, each `cargo check`/`tsc`-gated, reviewed before commit. **The headless dev preview throttles requestAnimationFrame** — GSAP interactions + OS-level APIs (fullscreen) must be verified on the real Tauri build. The running debug binary at `D:\projects\Heirvo\src-tauri\target\debug\heirvo.exe` was off-screen at session start (coords −25600, −25600) — use `Win32::MoveWindow` via PowerShell to restore it if needed.
