# Rigorous Format Test Matrix — Heirvo

Burn blank DVDs/CDs with each format below and run the full flow:
**identify → Quick recovery → Save (MP4 / ISO / files) → Memories (player + transcript search)**.
Note what works, what breaks, and the exact error/log line for anything that fails.

## A. Disc structures (burn one disc each)
| # | Format | How to make it | What it exercises | Pass? |
|---|--------|----------------|-------------------|-------|
| 1 | **DVD-Video (VIDEO_TS)** | Author a VIDEO_TS folder, burn as DVD-Video | IFO/VOB path, Save as MP4, transcode | |
| 2 | **DVD-VR (DVD_RTAV/VRO)** | Record on a set-top DVD recorder (or copy a VRO) | DVD-VR vs VIDEO_TS handling (our test disc was this) | |
| 3 | **Data DVD — ISO9660** | Burn mixed files (mp4, jpg, pdf) as ISO9660 | iso9660 walk, extract_all_files | |
| 4 | **Data DVD — Joliet (UCS-2 names)** | Burn with Joliet/long names | The NUL/Joliet fix (names + label) | |
| 5 | **Data DVD — UDF** | Burn as UDF | udf.rs path (VAT still unsupported — expect gaps) | |
| 6 | **Kodak Photo CD** | Use a real old Kodak PCD disc | .PCD image decode / photo import | |
| 7 | **Audio CD (CD-DA)** | Burn audio tracks | audio_cd TOC (the 357-min phantom fix), WAV extract | |
| 8 | **Mixed-mode (data + audio)** | Burn mixed | TOC + ISO coexistence | |

## B. Damage / drive stress (re-use disc #1 or #3)
- Light surface scratch → Quick should skip-ahead and still finish.
- Heavier scratch → confirm the **Overnight offer** appears with a real hole count, then Overnight resumes on holes only.
- Confirm the drive has **stable power** the whole run (the dead-green-light brownout was the killer — external 12V / rear USB).

## C. Photo / image formats (data disc with a folder of each)
JPEG, PNG, GIF, BMP, TIFF, WebP, HEIC (expect fallback), plus a "special image" → convert_image_to_jpeg / thumbnails.

## D. Video player + transcript search (Memories) — the headline feature
- Recover/import a disc with **spoken-word** video → confirm Whisper transcription runs (Settings shows the whisper model), then **search every spoken word** finds it and seeks the player.
- Test MP4 playback, scrubbing, fullscreen.
- Test a non-MP4 source (AVI/MKV/VOB) → `normalize_for_playback` path.

## E. Save outputs
MP4 (instant mux), Disc image (ISO), Individual chapters/files, Audio→WAV. Verify each opens/plays externally.

## Known release TODOs to keep in mind while testing
- Migration-ledger **hang** on corrupt DB (needs fail-fast) — if the app hangs on launch, that's it; delete `%APPDATA%\com.heirvo.app\dvd-recovery.db`.
- IFO parser implemented but **not wired** into analyze_structure (no title/chapter metadata yet).
- AI enhancement models **not hosted** (download button errors honestly).
- UDF **VAT** unsupported (packet-written discs read garbage).
- Pin installer SHA-256 before release.

## Reminder: build process
Frontend changes need `npm run build` → `cargo build` → relaunch. Backend-only → `cargo build`.
