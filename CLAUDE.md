# Heirvo — Agent Brief

**One sentence:** Heirvo is a Windows Tauri desktop app that rescues memories from damaged optical discs (DVDs, Kodak Photo CDs, audio CDs) and stores them in a permanent personal media vault — built for people who are scared, not technical.

**Lead architect rule:** Never optimize for clever. Optimize for the 65-year-old who just found their wedding disc in a box.

---

## Project layout

```
D:\WeGetFound\brands\heirvo\
├── src/                  ← React + TypeScript frontend (Vite, Tailwind, GSAP)
├── src-tauri/            ← Rust backend (Tauri 2, SQLite via sqlx, ffmpeg, whisper)
├── marketing/            ← heirvo.com marketing site (separate Vite + React app)
├── docs/                 ← Product specs and architecture docs
├── branding/             ← Logos, color tokens, brand assets
├── assets/               ← App assets
├── public/               ← Static files
├── scripts/              ← Build helpers (fetch-ffmpeg.ps1, fetch-whisper.ps1)
└── CLAUDE.md             ← This file
```

### NOT in this repo
- `D:\WeGetFound\_infra\marketing-os\video-pipeline\` — Remotion + n8n marketing video factory (We Get Found tool, not Heirvo app code)
- `D:\WeGetFound\_agency\legal\` — Operator agreement and screening docs for Heirvo Labs

---

## Core product

### The app (`src/` + `src-tauri/`)
Tauri v2 desktop app. Vite + React 18 frontend, Rust backend.

**Key Rust modules:**
- `src-tauri/src/recovery/` — multi-pass sector recovery engine
- `src-tauri/src/library/` — personal media vault (SQLite, file management)
- `src-tauri/src/media/` — ffmpeg pipeline, imagemagick PCD decode, thumbnails
- `src-tauri/src/transcription/` — local Whisper TTS indexing
- `src-tauri/src/licensing/` — Lemon Squeezy license validation

**Key frontend screens (`src/screens/`):**
- Recovery flow → Library → Memories / Theater / Search

**Database:** SQLite at `<app_data>/heirvo.db`. Migrations in `src-tauri/migrations/`.

**Bundled binaries (must be present for build):**
- `src-tauri/resources/ffmpeg/` — ffmpeg.exe, ffprobe.exe
- `src-tauri/resources/whisper/` — whisper-cli.exe + ggml-base.en.bin + DLLs

### The marketing site (`marketing/`)
Separate React/Vite app deployed to heirvo.com via Cloudflare Pages.
- **Deploy:** `cd marketing && npx wrangler pages deploy dist` (build output is `dist/`)
- Entry route: `marketing/src/pages/Landing.tsx` (the live homepage)
- Other pages: Download, Activate, Gift, Guides, Labs, Support, legal pages

---

## Tiers & pricing

| Tier | Price | Core unlock |
|---|---|---|
| Free | $0 | Scan + preview in-app (no save) |
| Recover | $59 one-time | Save recovered disc files |
| Archive | $99 one-time | Personal media vault + folder import + transcription |
| Family | $149 one-time | Archive + family features |

Payment via Lemon Squeezy. License key validated locally, no server calls after activation.

---

## Development

```bash
# App dev (starts Vite + Tauri window)
npx tauri dev                    # from D:\WeGetFound\brands\heirvo\

# Marketing site dev
cd marketing && npm run dev      # localhost:5174

# Build release installer (~10 min Rust compile)
npx tauri build                  # produces src-tauri/target/release/bundle/nsis/*.exe

# Run tests
npm test
```

**Do NOT double-click `src-tauri/target/debug/heirvo.exe` directly** — it connects to `localhost:1420` (no dev server = blank window). Always launch via `npx tauri dev`.

---

## Three rules that override everything else

1. **Never fail the whole job because of one bad sector.** Partial recovery > no recovery.
2. **Always be resumable.** Crash, reboot, re-insert — pick up exactly where it left off.
3. **Speak human.** No UDF, ISO9660, VOB, LBA in the UI. Translate everything.

---

## Current version & state

- **App:** v1.1.0 (Family Memory Vault release — disc recovery + personal media vault)
- **Marketing site:** Landing.tsx is live at heirvo.com
- **Hardware-blocked:** Recovery loop integration test requires an optical-capable USB enclosure (ATAPI passthrough, not generic USB-SATA adapter). Generic adapters cannot read optical discs.
- **Phase 2 spec:** `docs/phase2-recovery-library-bridge.md` — recovery → library promotion flow, hardware-blocked for end-to-end test.

---

## Key files quick-reference

| What | Where |
|---|---|
| Recovery engine | `src-tauri/src/recovery/` |
| Library / vault | `src-tauri/src/library/` |
| PCD (Kodak Photo CD) decode | `src-tauri/src/media/imagemagick.rs` |
| DB migrations | `src-tauri/migrations/` |
| Landing page | `marketing/src/pages/Landing.tsx` |
| Labs apply form | `marketing/src/pages/LabsApply.tsx` |
| Licensing | `src-tauri/src/licensing/` |
| App icon | `src-tauri/icons/` |
| Product vision | `docs/product-vision.md` |
| Pricing doc | `docs/monetization.md` |
| Phase 2 spec | `docs/phase2-recovery-library-bridge.md` |
| Changelog | `CHANGELOG.md` |
