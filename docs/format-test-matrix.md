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

---

## Running the kit

### Step 1 — Generate test content (one-time setup)

```powershell
cd D:\WeGetFound\brands\heirvo
powershell -ExecutionPolicy Bypass -File testkit\generate-test-content.ps1
```

This runs for ~60 seconds and produces `testkit\content\` with 20 files:
- `data-disc\` — MP4 + 6 image formats + PDF + readme (~5 MB total)
- `photos\` — same 6 image formats at 1600x1200 (~23 MB)
- `spoken-word\` — SAPI-synthesised speech.wav + spoken.mp4 + script.txt (~1.5 MB)
- `video-ts-source\` — source-clip.mp4 + HOW-TO-AUTHOR.txt
- `manifest.json` — SHA-256 of every file + 7 spoken target words

A fresh `manifest.json` is the ground truth for all verification runs.

### Step 2 — Burn one disc per matrix row

| Matrix row | Folder to burn | ImgBurn settings |
|---|---|---|
| A3 — Data DVD ISO9660 | `testkit\content\data-disc\` | Mode > Write Files/Folders; File System: ISO9660 |
| A4 — Data DVD Joliet | same folder | File System: Joliet |
| A5 — Data DVD UDF | same folder | File System: UDF |
| C — Photo disc | `testkit\content\photos\` | Mode > Write Files/Folders; ISO9660 or Joliet |
| D — Spoken-word | `testkit\content\spoken-word\` | Mode > Write Files/Folders; ISO9660 |
| A1 — DVD-Video | see `testkit\content\video-ts-source\HOW-TO-AUTHOR.txt` | needs DVDStyler first |
| A7 — Audio CD | `testkit\content\spoken-word\speech.wav` | Mode > Write Audio CD |

**HEIC note:** ImageMagick on this machine cannot write HEIC. Supply a real iPhone photo
(any .heic file) in `testkit\content\photos\` and burn it alongside the generated images.
Heirvo should fall back to JPEG conversion gracefully.

### Step 3 — Run Heirvo rescue

Insert the burned disc, launch Heirvo, run Quick Recovery.
For the spoken-word disc: after recovery, open Memories and let Whisper transcribe.

### Step 4 — Verify

```powershell
# Full check (data/photo discs)
powershell -ExecutionPolicy Bypass -File testkit\verify-extraction.ps1

# Spoken-word transcript check only
powershell -ExecutionPolicy Bypass -File testkit\verify-extraction.ps1 -TestMode spoken

# Target a specific disc by its library ID
powershell -ExecutionPolicy Bypass -File testkit\verify-extraction.ps1 -DiscId "your-disc-id"
```

### Objective pass criteria

| Check | PASS condition |
|---|---|
| File integrity | Each recovered file is found in the output directory (hash match = byte-perfect; hash mismatch = re-encoded, still acceptable if playable) |
| MP4 validity | `ffprobe` reports a video stream + duration > 0 on every .mp4 in the output |
| DB row — status | `library_discs.status` is `recovered` or `partial` (not `incomplete`) |
| DB row — video_path | `video_path` is non-null and the file exists on disk |
| DB row — deliverable_path | `deliverable_path` is non-null and the file exists under `Documents\Heirvo\` |
| DB row — bug class | `status=recovered` with `video_path=NULL` is a FAIL (the bug we fixed) |
| Transcript coverage | At least 60% of the 7 target words appear in `library_transcript_lines` |
| Target words | birthday, Hawaii, grandmother, nineteen, summer, photograph, memory |

### Results log

Fill in after each run:

| Date | Disc / format | Outcome | Notes / first log line on failure |
|---|---|---|---|
| | A3 — Data DVD ISO9660 | | |
| | A4 — Data DVD Joliet | | |
| | A5 — Data DVD UDF | | |
| | C — Photo disc (6 formats) | | |
| | C — HEIC (manual supply) | | |
| | D — Spoken-word video | | |
| | A1 — DVD-Video (VIDEO_TS) | | |
| | A7 — Audio CD | | |
| | B — Light scratch | | |
| | B — Heavy scratch + Overnight | | |
