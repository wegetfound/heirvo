# Session Handoff — Heirvo (Memories screen + Phase 2 pipeline)

_Last updated: 2026-05-21. Read this first, then `docs/phase2-recovery-library-bridge.md`._

## TL;DR
A long session shipped: a redesigned immersive **Memories** screen (`/library`), the **Quiet Rail** global nav, a **photo gallery**, **humane media states**, and the full **Phase 2 backend** (video→H.264 normalize, image→JPEG, recovery→library bridge + `disc_photos` migration, "Open files", frontend bridge-wiring). All on `main`, pushed (`HEAD = 95f92fe`). Working tree clean.

## ✅ Validated on a real build (Tauri dev, real DB)
- `disc_photos` **migration applied cleanly on the populated DB** (the scariest risk — passed).
- App boots; **Quiet Rail nav** + warmer labels (Home · Memories · My Discs · Export · Browse ISO · Settings) render.
- Immersive Memories screen renders; **memory switch cross-fade + room-glow color shift work**; **theater mode works**.
- `/watch` transcript screen renders correctly (transcript, search box, poster "transcript-only preview" state).

## 🔴 OPEN QUESTION (resolve this FIRST)
**Does real video PAINT in the player, or is it black?**
- Symptom: the existing **"Heirvo Test Video"** disc (file `C:\Temp\heirvo_test_video.mp4`) plays **audio but shows a black frame**. Console confirmed it's a clean **H.264 1280×720, dur 27.92s, no error** — so it *decodes* but doesn't *paint*.
- Two possibilities, not yet distinguished:
  1. **No bug** — "Heirvo Test Video" is likely an AI/TTS clip with a **black/blank video track** (just narration). The player is faithfully showing black.
  2. **Real WebView2 paint bug** — decodable video won't composite.
- **The decisive test (NOT yet run):** a known-good sample was downloaded to **`C:\Temp\heirvo-sample-bunny.mp4`** (Big Buck Bunny, H.264 320×176 + AAC, verified). In the app: **"+ Import a memory"** (new button on Memories, top-left) → pick that file → Play.
  - 🐰 **Colorful cartoon plays** → no bug; revert nothing; the test clip was just black. Player fully validated.
  - ⬛ **Bunny also black** → real WebView2 compositing bug. Fixes already *attempted* (uncommitted? no — committed in `95f92fe`): grain no longer over video + `translateZ` on the `<video>`. If still black after those, next moves: remove ALL overlays (vignette + bottom-gradient) from over the video (render them poster-only), and/or drop the rounded `overflow:hidden` clip on the player frame; last resort, load video via a streaming approach. Config is NOT the cause (CSP `media-src` + `assetProtocol scope:["**"]` both allow it — that's why audio plays).

## ⚙️ Compile-checked only (cargo + tsc clean) — needs real-build runtime test
The whole Phase 2 backend is wired but only the migration + nav/render/switch/theater have been exercised live. Still to verify on a real disc:
- **Recovery → library bridge**: recover a real disc → watch terminal for `recovery: session … promoted to library disc …` → it should appear in Memories on its own (event-driven), show "Getting your video ready…" while normalizing, then play. (`promote_session_to_library` in `src-tauri/src/library/promote.rs`, hooked non-fatally in `commands/recovery.rs:~119`.)
- **Photo gallery from a real photo disc / CD of JPEGs** → `disc_photos` rows + vault JPEGs + grid/lightbox.
- **Kodak Photo CD (.pcd)** → should hit the humane "saved to files" path (PCD decode itself is NOT built — `convert_special_image` returns `NeedsExternalConverter`; bundling ImageMagick is the documented next feature).
- **`normalizeForPlayback` → `updateDiscVideoPath` round-trip** (the `useRecoveryPromotion` hook drives it).

## 📋 Remaining work (priority order)
1. **Resolve the black-video question** (bunny test above).
2. **True fullscreen for theater mode** — user explicitly wants the expand button to take over the WHOLE monitor (OS fullscreen via Tauri window API + video edge-to-edge, controls auto-hide), not the current in-app overlay. Not yet built.
3. **Kodak PCD decode** — bundle ImageMagick (`magick convert`) so `.pcd`→JPEG; wire into `convert_special_image` + the bridge. Real-build feature.
4. **Finish real-build validation** of the recovery loop + photo gallery (checklist in `docs/phase2-recovery-library-bridge.md`).
5. Separate track, untouched: **Lab Network** — operator-agreement red-team, 4 HQ backend decisions, real `/labs/apply` intake form.

## Key files
- Memories screen: `src/screens/library/Memories.tsx` (immersive player = `ImmersivePlayer`, hoisted to module scope; cover-flow = `CoverFlow`; new Import button + `handleImport`).
- Watch/transcript: `src/screens/library/Watch.tsx` (humane states: `RescuedFilesCard`, `CantPreviewCard`; photo set → `PhotoGalleryView`).
- Gallery: `src/screens/library/components/PhotoGallery.tsx`.
- Bridge + media: `src-tauri/src/library/promote.rs`, `src-tauri/src/media/{transcode,image}.rs`, `src-tauri/src/commands/{media,library,recovery}.rs`.
- Frontend loop: `src/lib/useRecoveryPromotion.ts`, `src/lib/ipc.ts` (events: onDiscAdded, onNormalizeComplete/Error, onPromoteProgress).
- Nav: `src/app/App.tsx` (the `Sidebar`; old browse Library still at `/library/browse`, unlinked).

## Working style for next session
Lead architect + delegate buildable chunks to **sonnet** subagents, each `cargo check`/`tsc`-gated, reviewed before commit. Note: **the headless dev preview throttles requestAnimationFrame, so gsap-driven interactions can't be runtime-verified there** — they must be checked on the real Tauri build (this caused a phantom "regression" chase earlier).
