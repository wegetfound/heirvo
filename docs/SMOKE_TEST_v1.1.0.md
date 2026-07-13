# Heirvo v1.1.0 — Smoke-Test Checklist

Walk through this in order. Items are ranked by **likelihood of breaking**, not by importance — the fragile stuff is first so you fail fast if a foundational piece is broken.

Pre-flight (do once before starting):
```bash
cd C:\projects\Heirvo
npm run tauri build
```
The installer will land at `src-tauri/target/release/bundle/nsis/Heirvo_1.1.0_x64-setup.exe`.

---

## Tier 1 — foundational risks (FAIL HERE = STOP, FIX, REBUILD)

### 1. Fresh-install migration ⚠️ HIGHEST RISK
On a machine with NO existing Heirvo data:
- [ ] Install `Heirvo_1.1.0_x64-setup.exe`
- [ ] Launch the app — should reach the Home screen without an error toast
- [ ] Open `%APPDATA%\com.heirvo.app\` → confirm `heirvo.db` exists
- [ ] Inspect the DB (e.g., DB Browser for SQLite) → `library_discs` table has a `media_type` column AND an `album_id` column, AND `library_albums` table exists

If any of this fails: the new migrations (`20260518000000_media_type.sql`, `20260518100000_albums.sql`) didn't apply. Check the app log at `%APPDATA%\com.heirvo.app\recovery.log` for `sqlx::migrate` errors.

### 2. Upgrade migration (existing v1.0.0 install → v1.1.0)
On a machine that has v1.0.0 installed with at least one recovered disc:
- [ ] Install v1.1.0 over the top (do NOT uninstall first)
- [ ] Launch — all previously recovered discs are still visible in the Library
- [ ] Open one of them — transcript still loads, can play
- [ ] Check DB — `library_discs` has new columns AND existing rows have `media_type = 'video'` (the default)

If this fails: the additive migrations didn't apply cleanly on top of the existing schema. This is a CRITICAL bug — file it and pull v1.1.0.

### 3. Title-bar icon + sidebar logo
- [ ] Windows title bar shows the new disc-with-arrow icon (not the generic Tauri default)
- [ ] Taskbar shows the new icon
- [ ] Left sidebar inside the app shows the branded disc-arrow PNG (not the hand-drawn SVG)

If wrong: the icon.ico or `public/brand/mark.png` didn't bundle. Rebuild.

### 4. NSIS installer wizard art (cosmetic but visible)
- [ ] During install, the welcome/finish pages show the branded BMP in the **left sidebar** (164×314)
- [ ] The header bar shows the branded BMP at top-right (150×57)

If a Heirvo-default placeholder shows: the BMP wiring in `tauri.conf.json` didn't take.

---

## Tier 2 — feature-end-to-end (likely to find UX bugs)

### 5. Free-user import paywall
- [ ] As a free user (no license key activated), click "Import media" in Library
- [ ] Pick any video file → should see the **ImportPaywallModal** with "Build a vault for your memories." and "Unlock Heirvo Archive — $99" CTA
- [ ] Close the modal (X button) — should return to library; no album should appear in the Library
- [ ] **Drop a folder of photos** → same paywall appears AND no empty album is created (CRITICAL — this was a bug we fixed)

### 6. Dev key activation
- [ ] Settings → enter `HEIRVO-TEST-1234` → activates as Archive tier
- [ ] Sidebar header should show some indicator that you're on a paid tier (existing pill from v1.0.0)
- [ ] Click "Import media" → file picker opens directly (no paywall)

### 7. Single photo import
- [ ] Pick a single .jpg with EXIF data from a known date (e.g. an old scanned photo)
- [ ] Import completes, navigates to /disc/<id>
- [ ] The **year column** in the library card now shows the EXIF date year (not today's year)
- [ ] DiscDetail page shows the photo (no chapters, no transcript, "Photo" badge)
- [ ] Library card shows the actual photo thumbnail (not a gradient)

### 8. Folder drop → album auto-create
- [ ] Drag a folder containing 5+ photos onto the Library
- [ ] Hover overlay appears
- [ ] Drop → toast: "Found N files in 1 folder(s) — will import as album(s)"
- [ ] Size-confirm dialog: lists files (if ≤8) or shows count, summary size
- [ ] Confirm → import progress visible on button: "Importing 3/7…"
- [ ] After completion, navigates to /album/<id>
- [ ] Album page shows: folder name as title, all 5 photos as a grid, 2×2 collage cover when you go back

### 9. Album cover picker
- [ ] On the album detail page, hover any non-cover photo → a circular star button appears top-right of the card
- [ ] Click it → that disc becomes the cover (star fills amber, persists across refresh)
- [ ] Navigate back to Library → Albums tab → that album's collage cover updates to show the new pick

### 10. Filter tabs + counts
- [ ] Library has tabs: All · Albums · Videos · Photos · Audio · Recovered discs · All imports
- [ ] Each tab shows a live count badge matching the actual content
- [ ] Empty tabs (e.g. Audio if you haven't imported any) auto-hide
- [ ] Clicking a non-All tab shows a flat grid (no curated rails)

### 11. Title search across photos
- [ ] Import a photo titled (filename) something like `Wedding_2024.jpg`
- [ ] Search bar → type "wedding"
- [ ] Photo appears in results (title hit — would not have surfaced in v1.0.0 since photos have no transcript)

### 12. Bulk delete in filter tab
- [ ] On the Photos tab (or any non-All non-Albums tab), click "Select"
- [ ] Click a card — it should toggle a checkmark and outline; **the page should NOT navigate to /disc/<id>** (CRITICAL — this was a bug we fixed)
- [ ] Select 2-3 cards, bottom floating toolbar shows "3 selected"
- [ ] Click "Delete N selected" → confirm modal → confirm
- [ ] Cards disappear, library refreshes, vault files actually gone from `%APPDATA%\com.heirvo.app\vault\`

### 13. Vault storage panel
- [ ] Settings → scroll to Vault storage panel
- [ ] File count matches what you've imported (NOT counting thumbnails — CRITICAL, was a bug we fixed)
- [ ] Bytes used roughly matches the size of your imports
- [ ] Free space shows a plausible number
- [ ] "Open vault folder" button opens File Explorer at the vault dir

---

## Tier 3 — polish (cosmetic, doesn't block ship)

### 14. Video thumbnails
- [ ] Import a video file → library card eventually shows a real keyframe (may take a few seconds first time as ffmpeg runs)

### 15. Audio waveform
- [ ] Import an audio file (mp3, flac, wav) → library card shows a brand-blue waveform, letterboxed

### 16. Album rename
- [ ] Album detail → click "Rename" → input becomes editable inline → type new name → Enter saves
- [ ] Escape cancels without saving

### 17. Album delete options
- [ ] Album detail → "Delete album" → modal with TWO options:
  - "Ungroup — keep items in library" → album row goes, member discs survive as loose entries
  - "Delete album AND all items" → everything goes, vault files removed, bytes freed shown in toast

### 18. Drag-drop visual feedback
- [ ] Drag any file over the Library → blue tinted overlay appears with "Drop files to import"
- [ ] Drag away (don't drop) → overlay disappears cleanly

### 19. Duplicate detection
- [ ] Import a file you already imported once
- [ ] Toast: "Imported 0 · 1 already in library" (or similar)
- [ ] Single-file duplicate import navigates to the existing disc

### 20. Marketing site (if you've deployed)
- [ ] heirvo.com pricing section shows 4 cards: Free / Recover $59 / Archive $99 / Family $149
- [ ] Archive card mentions "import home videos, photos & audio"
- [ ] Mail-in is a compact callout band below the grid, not a pricing card
- [ ] View source on the homepage → `<script type="application/ld+json">` block contains the updated SoftwareApplication with three Offers ($59/$99/$149)

---

## If something breaks

1. **Open the log:** `%APPDATA%\com.heirvo.app\recovery.log`
2. **Report the failing item number** + log excerpt + screenshot if visual
3. **DO NOT** push v1.1.0 to GitHub releases until Tier 1 + Tier 2 are clean

## When everything passes

1. `git push origin main`
2. `git push origin v1.0.0 v1.1.0`
3. Create the GitHub release using the text in `docs/RELEASE_v1.1.0.md`
4. Update `VITE_DOWNLOAD_URL` in Cloudflare Pages → v1.1.0 installer asset URL
5. `cd marketing && npm run build && npx wrangler pages deploy dist`
