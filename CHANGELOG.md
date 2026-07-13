# Changelog

All notable changes to Heirvo are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] — 2026-05-18 — Family Memory Vault

Heirvo expanded from "disc recovery only" to a full family memory vault with disc recovery at the core. The Archive ($99) and Family ($149) tiers now have a real product behind them: a personal media library with albums, thumbnails, Whisper transcription, EXIF-aware organisation, and bulk-management tools. Tier expansion: Free / Recover ($59) / Archive ($99) / Family ($149) — the legacy Pro key remains valid and is treated as Archive.

### Added
- **Personal media vault** — import photos, videos, and audio from folders alongside recovered disc content. All media lives in a single managed vault under `<app_data>/vault/`; originals are never touched.
- **Bulk import + drag-and-drop** — drop a folder onto the app to import an entire photo collection in one step. SHA-256 duplicate detection prevents re-importing files already in the vault. Bulk-aware confirm dialog with itemized list (≤8 files) or summary count (larger batches).
- **Folder-recursive drop** — drop a folder of mixed media: backend walks it (capped at 5000 files / 8 levels deep), each dropped folder becomes its own auto-created album.
- **Albums** — full CRUD: auto-created from folder drops, renameable inline, delete-or-ungroup modal, 2×2 collage cover. Album cover picker — hover a member to set it as the cover (star button).
- **Photo thumbnails** — photos show real inline previews in library cards (image crate, 600px JPEG).
- **Video thumbnails** — keyframe extracted at ~1s via bundled ffmpeg.
- **Audio waveform thumbnails** — brand-blue showwavespic image, letterboxed into the card so the full oscillogram is visible.
- **EXIF date extraction** — imported photos use the real `DateTimeOriginal` (fallback `DateTimeDigitized`) from EXIF, not the import timestamp. A 1995 scanned wedding photo finally shows "1995" in the library year column.
- **Filter tabs** — Library view tabs: All · Albums · Videos · Photos · Audio · Recovered discs · All imports. Live count badges; empty tabs hide.
- **Title search** — search now matches disc/album titles in addition to transcript content. Photos (which have no transcript) finally surface in search results.
- **Bulk-delete in filtered grid** — multi-select mode on filter tabs with a floating bottom toolbar. Removes DB rows + vault files + thumbnails in one batch.
- **Vault storage panel** — Settings page now shows file count, bytes used, free space on the volume, vault path, and "Open vault folder" button.
- **Import flow paywall** — size preview + vault-copy confirm step before committing. Archive-tier gate enforced at the point of personal-media import.
- **Archive-tier gate** — personal media import is gated behind the Archive ($99) licence; paywall modal shown on attempt from lower tiers.
- **License-tier expansion** — backend `Plan` enum now Free / Recover / Archive / Family (legacy `Pro` alias retained → Archive). Tier-specific Lemon Squeezy product-id env vars supported at build time.
- **EXIF helper unit tests** + **Vitest harness** with 13 frontend tests (ImportPaywallModal, DiscCard, useLicense default state).
- **Albums migration** (`20260518100000_albums.sql`) — `library_albums` table + `album_id` column on `library_discs` with cascade rules.
- **Media-type migration** (`20260518000000_media_type.sql`) — `media_type` column on `library_discs`, defaults to "video" for backward compat.
- **New app icon** — disc-with-arrow mark; 7-size ICO (16/24/32/48/64/128/256) + matching PNGs.
- **Sidebar brand mark** — updated to new branded PNG (same asset as app icon).
- **Marketing JSON-LD** — `SoftwareApplication` schema updated with current pricing, vault feature list, v1.0.0 download URL; preps for Perplexity / Google AIO / ChatGPT citation surfaces.

### Changed
- **Vault stats** — thumbnail cache excluded from user-facing storage totals; no double-counting.
- **Marketing site** — tier positioning updated to "From discs to digital vault" narrative; pricing grid expanded from 3 to 4 cards, mail-in demoted from a card to a callout strip below.
- **Library Hero/rails** — "All" view keeps the curated rails (Recently / On this day / Birthdays / Trips); other filter tabs collapse into a flat auto-fill grid optimised for large vaults.

### Fixed
- **Transcription enqueue path bug (critical)** — transcription jobs were enqueued with the source path instead of the vault copy path. Jobs would silently fail mid-job if the user moved or deleted the original after import. Now correctly uses the vault path; backend auto-enqueues on import.
- **Thumbnail GC on disc delete** — orphaned thumbnails are now removed when a disc is deleted, preventing unbounded cache growth.
- **Empty-album-on-cancel bug** — folder drops used to create an album row eagerly, before the paywall / size-confirm. A free user closing the paywall left an empty album in the library. Albums are now created at commit time inside `runImport`, so cancelled flows leave zero side effects.
- **Bulk-select overlay pointer-events bug** — the click-catching overlay above each card in select mode had `pointer-events: none`, so clicks fell through to the inner `<Link>` and the page navigated instead of toggling selection. Now correctly captures clicks.

---

## [1.0.0] — 2026-05-17

Public 1.0 launch. Three-tier pricing live, full payment flow active, professional branding refreshed.

### Added
- **Three-tier pricing live** — Heirvo Recover ($59), Heirvo Archive ($99), Heirvo Family ($149). All three SKUs created in Lemon Squeezy with live checkout URLs.
- **Searchable Archive cluster** — 9 new guides centered on local Whisper transcription (`searchable-family-video-archive-windows` hub + 8 spokes). 8 existing high-emotion guides retrofitted with "make-it-searchable" sections.
- **Bundled whisper.cpp** — `whisper-cli.exe` + `ggml-base.en.bin` shipped with the installer for fully-offline transcription.
- **AI-restoration cluster** — 5 new guides for the Archive tier (restore-old-dvd-quality, fix-pixelated-dvd, etc.).
- **High-emotion guides** — deceased-parent-videos, memorial-video, videographer-out-of-business (3 guides).
- **Hardware/troubleshooting guides** — 9 guides (dvd-drive-disconnects, vlc-plays-dvd, powered-usb-hub, slim-vs-desktop, dvd-drive-freezing, mode-select-page-01h, mini-dvd, dvd-ram, ps2-game).
- **`/gift` page** — gift-buyer landing page for Heirvo as a present.
- **Organization JSON-LD** on homepage — entity trust signals for AIO citation rate.
- **IndexNow integration** — Bing/Yandex instant-indexing key at `/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4.txt`.
- **CSP headers** — `wrangler.toml` (marketing, via Cloudflare Pages) and Tauri webview both lock down content sources. Marketing form has invisible honeypot + 1.5s min-fill-time anti-spam.

### Changed
- **New professional app icon** — replaces the old kintsugi-disc placeholder. Multi-size ICO (16/32/48/128/256). Built via Pillow for proper RC-compatible format.
- **New installer header BMP** — branded 150×57 wordmark replaces the squashed sidebar-image-as-header.
- **`icons/` folder cleaned** — purged ~50 unused assets (iOS, Android, Windows Store Square*Logo). Down to 5 files that `tauri.conf.json` actually references.
- **Pricing extracted to `src/lib/pricing.ts`** in both desktop app and marketing — single source of truth.
- **Homepage hero second line** — "Then find every moment inside it." (Whisper-feature hook).

### Fixed
- **NSIS installer header** — was using the sidebar BMP (164×314) in the 150×57 header slot, rendering distorted. Now uses dedicated `installer-header.bmp`.
- **Tauri webview CSP** — was `null` (allow-all). Now enforces explicit allowlist (Google Fonts, Lemon Squeezy API).
- **Path traversal** — `import_rmap` and `export_diagnostic_bundle` hardened via `src-tauri/src/util/path_safety.rs` helpers.
- **`EnhancementOffer.tsx` typing** — was reading non-existent payload fields (`jobId`, `percent`, `outputPath`). Now uses real `AiJobProgress` / `AiJobError` / `AiJobRecord` types from `ipc.getJobStatus`.

### Project hygiene
- **GitHub release v1.0.0** with refreshed installer (new icon + header BMP).
- **Cleaned `src-tauri/icons/`** — 56 file deletions across `ios/`, `android/`, `Square*Logo.png`, `StoreLogo.png`, `icon.icns`, `README.txt`.
- All three `VITE_LS_*` env vars now live in Cloudflare Pages; "Coming soon" placeholders gone from `/download`.

---

## [0.1.0] — 2026-05-12

First public release. Recovery engine, transcode pipeline, marketing site, and mail-in service all live.

### Added
- **Recovery engine** — multi-pass sector recovery (Triage → SlowRead → Reverse → ThermalPause), modeled on GNU ddrescue.
- **Sector map** — packed bitmap with zstd persistence (~573 KB per DVD), restored on session resume.
- **SQLite session store** with sqlx migrations; sessions resume from any prior state.
- **Windows SCSI pass-through** sector reader (READ(10), READ CAPACITY, INQUIRY) — page-aligned buffers, MAX_BLOCK_SECTORS=32.
- **Transcode pipeline** — FFmpeg subprocess with H.264/H.265/AV1 codecs and quality presets (Archive / High / Streaming / Mobile). Deinterlace (bwdif) + denoise (hqdn3d) toggles.
- **AI enhancement pipeline** — `MockAiBackend` end-to-end; real Real-ESRGAN backend behind optional `onnx` Cargo feature (DirectML).
- **Tauri 2 IPC** — typed TypeScript bindings for all backend commands.
- **React UI** — 5-step Recovery Wizard, live Dashboard, sector heatmap, Transcode panel, Enhancement panel.
- **Bundled FFmpeg** (`ffmpeg.exe` + `ffprobe.exe`, ~193 MB raw, LGPL essentials build) — no first-run download required.
- **Branded NSIS installer** — kintsugi disc icon, branded sidebar/header, silent install support.
- **Marketing site** at heirvo.com — landing page, mail-in order form (Formspree → Stripe intake fee), Pro checkout via Lemon Squeezy.
- **Legal pages** — Privacy, Terms, Refund, Acceptable Use.

### Fixed
- **FFmpeg auto-download fallback** — switched primary URL to gyan.dev (stable filename); secondary fallback now resolves real GitHub asset name via Releases API and triggers on HTTP 4xx/5xx (not just transport errors).
- **Transcode form styling** — inputs and dropdowns no longer render unreadable dark-on-dark on the light theme.
- **iOS Safari marketing site freeze** — `sessionStorage` calls wrapped in try/catch (Private Mode throws `SecurityError`); `LoadSequence` overlay has 3s safety timeout to release `body.overflow` on stalled clip-path animations.
- **Marketing build** — replaced `useRef<HTMLBlockquoteElement>` with `useRef<HTMLQuoteElement>` (TypeScript build error blocking production deploys).
- **Bundle resources** — explicit file paths for `ffmpeg.exe` + `ffprobe.exe` in `tauri.conf.json` (the `resources/ffmpeg/*` glob wasn't picking up `.exe` files in NSIS bundles).

### Project hygiene
- Migrated repo from `C:\projects\DVD-Recovery\` to `C:\projects\Heirvo\` — single consolidated home for desktop app + marketing site.
- Removed 22 deprecated landing/recover variant pages from marketing site.
- Removed 21 orphaned image files (42 MB) from `assets/` and `marketing/public/assets/` after grep verification of every reference.
- Lazy-loaded all non-canonical marketing routes — main JS bundle reduced from ~1 MB to 433 KB gzipped.
- Renamed app identifier `com.dvdrecovery.app` → `com.heirvo.app`.

### Known limitations
- Not yet code-signed — Windows SmartScreen will warn on install. Workaround: click **More info → Run anyway**.
- DVD-Video CSS-encrypted commercial discs are intentionally unsupported (not a DRM-circumvention tool).
- Mail-in service requires manual address routing per customer pending physical drop-point setup.
