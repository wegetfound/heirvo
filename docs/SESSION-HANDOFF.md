# Session Handoff — Heirvo

_Last updated: 2026-05-21. Read this first, then jump to whichever track is active._

## TL;DR

This session closed the entire **Lab Network track**: `/labs/apply` 5-step intake form
(Airtable-backed, live on Vercel), operator agreement attorney-ready with all blanks filled,
4 HQ backend decisions resolved, CA/NJ/MA geographic exclusion wired through all surfaces.
Working tree clean, `HEAD = 33e68b0` (after final agreement blanks commit). **Recovery loop +
PCD real-disc validation still blocked on the optical enclosure (~2026-05-24).**

---

## ✅ Confirmed in prior sessions (still valid)

- **Memories screen, theater fullscreen, Quiet Rail nav** — landed at `95f92fe`, live on dev build.
- **Black-video resolved** — Big Buck Bunny renders correctly. "Heirvo Test Video" has a
  genuinely black video track (AI/TTS narration); not a bug.
- **Kodak PCD decode** — merged `fa31659`. `magick "<src>[2]" "<dst>"` (IM7 syntax). Proven on
  synthetic `.pcd`; real Kodak disc multi-res `[2]` still needs hardware validation.
- **ImageMagick runtime installer** — live and end-to-end validated. `magick.exe` 7.1.2-23 Q16
  lands in `<app_data>/imagemagick/`. Settings row flips to **Active**.

---

## ✅ This session — Lab Network track (DONE)

### `/labs/apply` — deployed to Vercel
5-step operator application (identity → workspace → experience → temperament → availability +
consents). Posts directly to Airtable.

**One-time setup required before the form stores anything:**
```
AIRTABLE_PAT=patXXX AIRTABLE_WORKSPACE_ID=wspXXX node scripts/setup-airtable.mjs
```
Copy the printed Base ID to:
- Vercel dashboard → Environment Variables → `VITE_AIRTABLE_BASE_ID`
- `marketing/.env` (local dev)

Then create a **second PAT** scoped to `data.records:write` on that base only — that's
`VITE_AIRTABLE_PAT`. (Write-only keeps it safe in the browser bundle.)

Key files: `marketing/src/pages/LabsApply.tsx`, `scripts/setup-airtable.mjs`.

### Operator agreement — attorney-ready
All operational blanks filled. Remaining `[BRACKETS]` are entity/operator name, date, and §10
(indemnification, governing law, arbitration — for counsel). See the Counsel checklist and
Red-team notes sections in the doc.

| Blank | Value |
|---|---|
| Data retention (§5) | 14 days post confirmed delivery |
| Strike rolling window (§7) | 90 days |
| Termination notice (§7) | 14 days |
| Rate-change notice (§8) | 30 days |
| Payment method (§8) | Stripe Connect |
| Payment schedule (§8) | net-15 from close of calendar month |

**Geographic restriction — CA/NJ/MA excluded (ABC test prong B).**
- LA removed from Phase 1 metros on `/labs` page and apply form dropdown.
- Phase 2: Boston (MA) replaced with Denver/Portland/Tampa in public copy; NJ-domiciled
  applicants screened at Airtable review stage.
- Counsel to add explicit geographic-restriction clause to §1 of the agreement.

### HQ backend — 4 decisions resolved
See `docs/lab-hq-backend-spec.md §12` for rationale. Summary:
1. **Rust/axum + shared crate** — shared crate for canonical-JSON + ed25519 (byte-identical
   between desktop producer and server verifier).
2. **Fly.io + SQLite → Neon Postgres at Phase 2** — single instance, no over-engineering for
   Phase 1 scale.
3. **Stripe Connect Express** — already on Stripe; handles 1099-NEC.
4. **Run alongside Formspree+Stripe until Phase 2** — don't touch working intake until the
   routing engine exists.

---

## 🟡 Blocked on hardware (~2026-05-24)

### Recovery loop + photo gallery
**What's blocked:** verifying `promote_session_to_library` → `disc_added` event → "Getting
your video ready…" → playback. Also: `disc_photos` rows + vault JPEGs + grid/lightbox.
**Why blocked:** optical-capable USB enclosure arriving ~2026-05-24. Generic SATA→USB adapters
confirmed incompatible (no ATAPI passthrough — `MediaLoaded` stays False).

**When it arrives:**
1. `Get-CimInstance Win32_CDROMDrive` — confirm `MediaLoaded: True`
2. Insert the 2004 VOB disc, drive the recovery in-app
3. Watch terminal for `recovery: session … promoted to library disc …`
4. Confirm player renders the recovered disc (Big Buck Bunny proved the paint path)

Code is compile-clean. `npx tauri dev` to restart the dev build.

### PCD decode — real disc
`pcd_to_jpeg` command proven on synthetic `.pcd` (generated via `magick rose: test.pcd`). Need
a genuine Kodak Photo CD to confirm the `[2]` resolution index and multi-res behavior
(768×512 on real discs; synthetic gave 384×256 single-layer). No code changes needed — just
hardware validation.

---

## Key files

| Area | File |
|---|---|
| Memories / fullscreen | `src/screens/library/Memories.tsx` (~line 1104 useEffect, ~1113 F shortcut) |
| Tauri capabilities | `src-tauri/capabilities/default.json` |
| PCD decode | `src-tauri/src/media/imagemagick.rs` |
| Library commands | `src-tauri/src/commands/library.rs` (`convert_special_image`) |
| Recovery bridge | `src-tauri/src/library/promote.rs` |
| Frontend loop | `src/lib/useRecoveryPromotion.ts`, `src/lib/ipc.ts` |
| Lab intake form | `marketing/src/pages/LabsApply.tsx` |
| Airtable setup | `scripts/setup-airtable.mjs` |
| Operator agreement | `docs/operator-agreement.md` |
| HQ backend spec | `docs/lab-hq-backend-spec.md` |
| Screening spec | `docs/screening-application.md` |
| Lab handbook | `marketing/src/pages/LabsHandbook.tsx` (password: `heirvo-labs-2026`) |

---

## Notes for next session

- **Tauri window launches off-screen** at approx `(-25600,-25600)`. Find the "Tauri Window"
  class window and `MoveWindow` it on-screen (PowerShell + user32). Headless Vite preview
  throttles rAF — GSAP + OS-level APIs must be tested on the real build.
- **Worktree subagents** building backend chunks will create empty placeholder binaries for
  `resources/{ffmpeg,whisper,imagemagick}/*.exe` to pass the build-script existence check.
  **Do not merge those placeholders into main** — main has the real binaries.
- `npx tauri dev` to restart the dev build (was shut down at end of prior session).
