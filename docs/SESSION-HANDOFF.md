# Session Handoff — Heirvo

_Last updated: 2026-05-22. Read this first, then jump to whichever track is active._

## TL;DR

This session completed the **marketing redesign track**: fixed fake testimonials on the
landing page, ran a 3-agent design competition, and produced three fully-wired preview
routes (`/comp-a`, `/comp-b`, `/comp-c`) on the local dev server. **The merge has not been
built yet — that is the next task.** Working tree has uncommitted comp files.
`HEAD = ad35ea0` (honest social proof commit).

---

## ✅ Confirmed in prior sessions (still valid)

- **Memories screen, theater fullscreen, Quiet Rail nav** — landed at `95f92fe`, live on dev build.
- **Black-video resolved** — Big Buck Bunny renders correctly. "Heirvo Test Video" has a
  genuinely black video track (AI/TTS narration); not a bug.
- **Kodak PCD decode** — merged `fa31659`. `magick "<src>[2]" "<dst>"` (IM7 syntax). Proven on
  synthetic `.pcd`; real Kodak disc multi-res `[2]` still needs hardware validation.
- **ImageMagick runtime installer** — live and end-to-end validated.
- **Lab Network track** — fully complete. `/labs/apply` live on Vercel, operator agreement
  attorney-ready, 4 HQ backend decisions resolved, CA/NJ/MA geographic exclusion wired.
  See prior handoff sections for details.

---

## ✅ This session — Landing page + Design Competition

### LandingMin1.tsx — deployed to heirvo.com (`ad35ea0`)

Four targeted fixes deployed:
1. **Fake testimonials removed** → replaced with honest pre-launch proof panel:
   - "11 / 11 failure scenarios passing"
   - "9× retries per damaged sector"
   - "0 bytes sent to cloud"
   - Honest framing: "No user reviews yet — we're upfront about that."
2. **SmartScreen callout** → amber shield callout box inline with download button
3. **Gift pitch** → wrapped in amber card with urgency badge ("Time-sensitive · disc dye degrades")
4. **Section padding** tightened: 96px → 72px (How/Pricing/FAQ), 80px → 64px (Paths/Gift)

### Design Competition — 3 entries, LOCAL ONLY (not deployed)

Routes wired in `marketing/src/main.tsx`. Preview at `localhost:5174` (run `npm run dev`
from `marketing/`).

| Route | File | Direction |
|---|---|---|
| `/comp-a` | `marketing/src/pages/LandingCompA.tsx` | Cinematic Archive |
| `/comp-b` | `marketing/src/pages/LandingCompB.tsx` | Precision Interface |
| `/comp-c` | `marketing/src/pages/LandingCompC.tsx` | Memory Lane |

**Research brief:** `docs/design-competition-brief.md`

#### What each entry built

**Comp A — Cinematic Archive** (1787 lines)
- Identity opener: "You're someone who doesn't let things slip away." (amber, above headline)
- Massive hero headline: "Before these photos disappear forever." (amber = forever)
- 4-panel horizontal pinned scroll narrative (Your disc · The shoebox · Still recoverable · Act now)
- Multi-layer parallax depth stack (3 z-layers at different scrub speeds)
- Asymmetric bento grid for proof section
- Clip-path photo wipe tiles ("printing up" on scroll — recovery metaphor made visual)
- Film archive aesthetic: numbered sections (01—, 02—), thin dividers, amber-sepia spotlight
- "Become the Archivist" tier at $99 — identity-based naming
- "Gift this to Mum" amber CTA + seasonal occasion pills

**Comp B — Precision Interface** (1339 lines)
- Identity pill: "You're someone who doesn't let things slip away." (above headline)
- Animated product UI mockup in hero right-column:
  - File counter counts 0 → 3,842 on load
  - Sector counter counts in parallel
  - 10 terminal log lines appear one-by-one (amber retries → green "ok ✓")
  - After scan completes (7.3s): "3,842 files recovered — save for $59" CTA slides up
- Ambient CSS disc spin loop behind the mockup
- Gradient border cards with conic-gradient glow on hover
- Counter animations on stats section via ScrollTrigger
- RetryVisual component: bar chart showing 7 passes, amber fails on 3-5, blue "recovered ✓" on 7
- "Archivist" tier — "For the one who does this properly"
- Clip-path wipe reveals on pricing cards

**Comp C — Memory Lane** (1720 lines) ← MOST COMPLETE AFTER LATE UPGRADE
- Identity-first hero eyebrow: "YOU'RE THE ONE IN THIS FAMILY WHO DOESN'T LET THINGS SLIP AWAY."
- "The photos are still there. You just need to go get them."
- Memory lines section: 5 lines surface one-by-one ("Her voice at the birthday party." etc.)
- 19 CSS polaroid elements (white border, rotation, drop shadow) with clip-path bottom-up reveals
- Warm/cold palette shift: background tweens from #0B1220 → #1A1208 in emotional sections
- "Clock Is Ticking" urgency: 5 disc rings, outer 2 fade on scroll — "This isn't marketing. It's physics."
- Live Father's Day countdown banner with dismiss button (real date)
- "Archivist" tier — identity-based: "for the one who does this properly"
- Gift section: "The most personal gift isn't bought — it's rescued."
- Closes: "You'll never regret checking. You might regret not checking."
- Slow CustomEase("album") durations 1.4-1.6s — feels like turning pages

#### User's verdict (expressed, not yet acted on)
- Likes **Comp B's data/technical style**
- Likes **Comp C as the overall foundation**
- Wants **some elements from Comp A**

#### Agreed merge plan (NOT YET BUILT)
The next session's primary task. Merge into a single new `LandingMerge.tsx`:

1. **C's identity opener** — "YOU'RE THE ONE IN THIS FAMILY..." as the first line
2. **C's warm/cold palette shift** throughout
3. **B's animated scan demo** in hero right-column (file counter, terminal log, "$59 save" CTA)
4. **C's memory lines + polaroid section** (emotional narrative)
5. **A's asymmetric bento grid** for the proof/stats section
6. **A's clip-path photo wipe tiles** ("printing up")
7. **C's "Clock Is Ticking"** disc degradation urgency section
8. **"Archivist" tier naming** (all three agreed — $99, "for the one who does this properly")
9. **C's closing line** — "You'll never regret checking. You might regret not checking."
10. Father's Day countdown banner (C) — keep if date still relevant
11. Drop: Comp A's horizontal pinned narrative (too complex for 45-55yo target user)

When merge is ready:
- Preview at a new route (e.g. `/comp-merge` or replace `/`)
- User approves, then deploy: `vercel --prod --cwd "D:/projects/Heirvo/marketing"`

### Key design insights from research (for merge brief)
- **Psychological hook**: Lead with IDENTITY before product. Buyer acts from anticipated regret, not FOMO.
- **SplitText**: `y: 30, rotateX: -40, stagger: 0.025` with `perspective: 600px` — Awwwards 2024-25 technique
- **ScrollTrigger pinning**: always add `anticipatePin: 1`
- **Clip-path wipe**: `inset(100% 0 0 0) → inset(0%)` bottom-up = "photo printing up" metaphor
- **Bento grid**: asymmetric 2×2 hero tile + 1×1 supporting tiles wins CSS Design Awards 2024
- **"Archivist" naming**: identity purchase converts better than feature list (Ancestry.com pattern)
- **Gift flow**: "Buy for a parent" as distinct CTA path — high-intent segment
- Full brief: `docs/design-competition-brief.md`

---

## 🔧 Tauri desktop app — launch fix

**Problem:** Clicking the desktop icon runs `src-tauri/target/debug/heirvo.exe` directly,
which connects to `localhost:1420` (Vite dev server) — blank window because server isn't running.

**Fix:** Always launch via:
```
npx tauri dev
```
from `D:\projects\Heirvo\`. This starts Vite dev server + Tauri window together.

**Launcher created:** `D:\projects\Heirvo\launch-heirvo.bat` — double-click or pin to taskbar.
Desktop shortcut target should be: `cmd.exe /k "cd /d D:\projects\Heirvo && npx tauri dev"`

**No release build exists** — only `src-tauri/target/debug/heirvo.exe`. If a proper standalone
installer is wanted, run `npx tauri build` (~10 min Rust release compile).

---

## 🟡 Blocked on hardware (~2026-05-24)

### Recovery loop + photo gallery
**What's blocked:** verifying `promote_session_to_library` → `disc_added` event → "Getting
your video ready…" → playback. Also: `disc_photos` rows + vault JPEGs + grid/lightbox.
**Why blocked:** optical-capable USB enclosure arriving ~2026-05-24.

**When it arrives:**
1. `Get-CimInstance Win32_CDROMDrive` — confirm `MediaLoaded: True`
2. Insert the 2004 VOB disc, drive the recovery in-app
3. Watch terminal for `recovery: session … promoted to library disc …`
4. Confirm player renders the recovered disc

### PCD decode — real disc
Proven on synthetic `.pcd`. Need genuine Kodak Photo CD to confirm `[2]` resolution index.
No code changes needed — just hardware validation.

---

## Key files

| Area | File |
|---|---|
| **NEXT TASK** | Build `marketing/src/pages/LandingMerge.tsx` (see merge plan above) |
| Current landing page | `marketing/src/pages/LandingMin1.tsx` (live on heirvo.com) |
| Comp A | `marketing/src/pages/LandingCompA.tsx` (preview `/comp-a`) |
| Comp B | `marketing/src/pages/LandingCompB.tsx` (preview `/comp-b`) |
| Comp C | `marketing/src/pages/LandingCompC.tsx` (preview `/comp-c`) |
| Design research brief | `docs/design-competition-brief.md` |
| Router | `marketing/src/main.tsx` (comp routes already wired) |
| Memories / fullscreen | `src/screens/library/Memories.tsx` |
| Tauri capabilities | `src-tauri/capabilities/default.json` |
| PCD decode | `src-tauri/src/media/imagemagick.rs` |
| Library commands | `src-tauri/src/commands/library.rs` |
| Recovery bridge | `src-tauri/src/library/promote.rs` |
| Lab intake form | `marketing/src/pages/LabsApply.tsx` |
| Operator agreement | `docs/operator-agreement.md` |
| Lab handbook | `marketing/src/pages/LabsHandbook.tsx` (password: `heirvo-labs-2026`) |

---

## Notes for next session

- **PRIMARY TASK: Build the merge page** — see "Agreed merge plan" section above.
  Read all three comp files before writing. Create `LandingMerge.tsx`, add route `/comp-merge`,
  preview locally, then replace `/` route when approved.
- **Tauri dev launch**: `npx tauri dev` from `D:\projects\Heirvo\` — or double-click
  `launch-heirvo.bat`. Do NOT double-click the `.exe` directly.
- **Deploy command** (Vercel, NOT git push):
  `vercel --prod --cwd "D:/projects/Heirvo/marketing"`
- **Comp files are LOCAL ONLY** — not deployed, not committed. Don't commit them until
  after the merge is approved and the comp files are no longer needed.
- **Off-screen window bug** — if Tauri window appears invisible after launch, use PowerShell
  user32 `MoveWindow` to bring it on-screen. The process will be running even if nothing visible.
- **GSAP design tokens** (use these in the merge):
  - `C.page = "#0B1220"`, `C.text = "#F0EDE8"`, `C.blue = "#0A84FF"`, `C.amber = "#F59E0B"`
  - Font: `'"Sora", ui-sans-serif, system-ui, sans-serif'`
  - GSAP: `useEffect + gsap.context()` (no @gsap/react installed)
  - SplitText char stagger: `{ y: 30, rotateX: -40, stagger: 0.025 }` + `perspective: 600px` on wrapper
  - ScrollTrigger pinning: always add `anticipatePin: 1`
