# Heirvo 1.1.0 — Family Memory Vault

**Paste this into the GitHub release body for v1.1.0.**

---

Heirvo started life as a tool to rescue dying optical discs. With 1.1.0 it grows into the **family memory vault** those discs were always trying to become — somewhere your home videos, audio, and photos can live forever, side by side with the discs you've recovered, every spoken word searchable.

This is a free upgrade for everyone, including all existing customers. The new vault features unlock at the new **Archive ($99)** tier; everything you bought before keeps working.

## What's new

### A vault for everything you've ever filmed

- **Import home videos, audio, and photos** — drop them into Heirvo alongside your recovered discs. Originals are never touched; Heirvo keeps a safe copy in a managed vault under `%APPDATA%\com.heirvo.app\vault\`.
- **Drag a folder of 200 wedding photos onto the Library** → Heirvo creates one album with a 2×2 collage cover instead of 200 separate cards.
- **Real thumbnails for everything**: photos as resized JPEGs, videos as keyframe stills, audio as brand-blue waveforms.
- **EXIF dates** — your 1995 scanned wedding photo finally shows "1995" in the library year column, not "2026."

### Find anything

- **Title search** — type to find any item by name across the whole library, including photos that have no transcript.
- **Filter tabs** — collapse a growing vault by media type: All · Albums · Videos · Photos · Audio · Recovered discs · All imports.
- **Whisper transcription** runs automatically on every imported video so spoken words become searchable just like on recovered discs.

### Albums you actually control

- Folder drops become auto-named albums.
- Rename inline, delete with "ungroup vs delete files" choice.
- Pick any photo as the album cover — hover any member, tap the star.

### Tools for cleaning up

- **Bulk delete** in the filter tabs — multi-select cards, delete in one batch.
- **Vault storage panel** in Settings — see file count, bytes used, free space on the volume. Thumbnails no longer double-count.
- **Remove from library** confirms what gets deleted (DB row + vault file) and what doesn't (original source files outside the vault).

## Pricing

Four tiers now, all one-time purchases — no subscriptions:

| Tier | Price | What's in it |
|---|---|---|
| **Free** | $0 | Full disc recovery, sector map, preview |
| **Recover** | **$59** | + Save (MP4 / ISO / all-files / chapter extract) |
| **Archive** | **$99** | + Personal media vault, unlimited imports, albums, Whisper transcription on imports |
| **Family** | **$149** | + Multi-user library sync (coming soon), priority support |

If you already bought "Pro" before this release, your key keeps working and is treated as **Archive** — no action needed.

## Critical bug fixes

- **Transcription jobs were enqueued with the original file path**, so moving or deleting an imported file after import would silently break transcription mid-job. Now correctly uses the safe vault-copy path.
- **Folder drops used to create empty albums** if the user closed the paywall — albums are now created only after the user has committed.
- **Bulk-select mode** used to silently navigate away when you clicked a card to select it — fixed to capture the click correctly.

## For developers

- New backend commands: `delete_library_disc`, `delete_library_discs_bulk`, `get_vault_stats`, `get_import_size_preview`, `ensure_disc_thumbnail`, `list_importable_media_in_dir`, `create_album` / `list_albums` / `get_album_with_discs` / `rename_album` / `delete_album` / `set_album_cover` / `add_disc_to_album` / `remove_disc_from_album`.
- Plan enum extended: `Free | Recover | Archive | Family` (legacy `Pro` alias retained).
- Two additive migrations (`20260518000000_media_type.sql`, `20260518100000_albums.sql`) apply cleanly on top of v1.0.0 databases.
- Frontend now has Vitest + React Testing Library — 13 baseline tests covering paywall, disc card render, license default state.
- New dependencies: `kamadak-exif 0.6` (EXIF date extraction), `image` crate features expanded to jpeg/gif/webp/bmp/tiff.

## Install

**Windows 10 / 11:**
[`Heirvo_1.1.0_x64-setup.exe`](https://github.com/JungleLivingPai/heirvo/releases/download/v1.1.0/Heirvo_1.1.0_x64-setup.exe) — same one-click installer, works over an existing v1.0.0 install (no uninstall needed; your recovered discs are preserved).

SmartScreen will warn on first run because the binary isn't EV-signed yet. Click **More info → Run anyway**. EV signing is on the v1.2.0 roadmap.

## Rollback

If something breaks, the previous release is still available at [v1.0.0](https://github.com/JungleLivingPai/heirvo/releases/tag/v1.0.0).

---

*Full developer-facing changelog: [`CHANGELOG.md`](../CHANGELOG.md#110--2026-05-18--family-memory-vault).*
