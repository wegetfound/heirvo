# Quick & Overnight Recovery Modes — Spec

**Status:** building (2026-06-03)
**Author:** architecture pass, validated against a real damaged DVD_VIDEO_RECORDER disc on an ASUS DRW-24D5MT.

## Goal
Get someone's memories back without making them think. Default to a fast pass that grabs everything easily readable (ddrescue philosophy). When damage remains, offer a patient **Overnight** pass that hammers *only the unrecovered spots* while they sleep — informed by the results of the quick pass, not chosen blind upfront.

## Why this is the right model (and safe now)
- It's literally ddrescue's two-phase design: a fast pass that never gets stuck, then a retry phase on the holes only.
- Overnight is unattended for hours — **only viable because of the `CancelIoEx` fix** (a hung USB bridge no longer deadlocks the pool / wedges the process). That fix is landed and validated.
- The exponential skip-ahead already exists and is correct (it does NOT skip over good sectors interleaved with damage).

## The two modes

### Quick (default) — "Get your memories back fast."
- **Pass plan:** `[Triage, SlowRead]`
  - `Triage`: read all Unknown once, 5s timeout, skip-ahead. Grabs all healthy media fast.
  - `SlowRead`: one slow pass (1 retry, slow speed, 12s) over what Triage left Failed. Catches cheap marginal sectors.
- **Stops** after SlowRead and reports remaining holes. Does not grind.
- `delay_floor_ms = 0`.
- Finish: minutes on a mostly-good disc; bounded even on a bad one (skip-ahead + short retries).

### Overnight — "Try much harder while you sleep."
- **Resumes from Quick's sector map** — targets ONLY remaining `Failed`/`Unknown` holes. Never re-reads `Good` sectors.
- **Pass plan (loops the holes hard):** repeat `[Reverse, ThermalPause, SlowRead, ThermalPause]` until a full cycle recovers **0 new sectors** (loop-until-dry convergence), or the user stops.
  - Slow speed, big retry budget (4+), long inter-read delays, thermal cool-downs between passes.
- `delay_floor_ms = 2000` — kind to weak bus-powered USB drives over a long run (prevents brownout disconnects).
- Stop conditions: convergence (0 new this cycle), user cancel, or a hard pass cap (e.g. 12 cycles) as a backstop.
- Cancelling keeps everything recovered so far.

## The flow (the heart of the feature)
1. User starts rescue → **Quick** runs automatically (no upfront mode picker — matches the existing one-button Wizard philosophy).
2. On `recovery:complete`:
   - **0 holes** → "Done — we saved everything." → save options.
   - **holes remain** → show **Overnight offer card**: *"We rescued X minutes. Z spots (~Y min) are damaged and need more time. [Try Overnight ▸] — best left running overnight. You can stop anytime and keep what's recovered."*
3. Click Try Overnight → `startRecovery(sessionId, "overnight")` on the **same session** → engine resumes from the map and works the holes.
4. Overnight screen: holes-remaining shrinking (not a fake ETA — time is genuinely uncertain), gentle copy: *"Recovering the last few spots. Leave it running — stop anytime."*
5. On overnight finish/convergence: *"Recovered N more spots. K remain (physical damage we can't read)."* Remaining bad sectors → zero-filled with the existing amber "degraded" badge. → save options.

## Honest expectations (UI copy must not over-promise)
Patience recovers **marginal** sectors (slow re-read, thermal settling, reverse approach) — typically the last 1–5%. It cannot recover physically destroyed data (deep scratch / delamination / rot). Copy says so plainly.

## Naming
Rename `RecoveryMode { Standard, Patient }` → `RecoveryMode { Quick, Overnight }`, serde lowercase `"quick"`/`"overnight"`. Default = `Quick`. Update all backend + frontend references.

## Build breakdown (disjoint files; central compile/test)
- **passes.rs** — new enum + Quick/Overnight plans + delay floors + convergence constants.
- **engine.rs** — Overnight loop-until-dry convergence; surface `holes_remaining` in progress; confirm resume targets holes only.
- **commands/recovery.rs** + stray refs — rename plumbing; ensure mode flows; resume from persisted map on the same session.
- **frontend** (ipc.ts, types.ts, Wizard.tsx, OutputPanel.tsx) — `"quick"|"overnight"`, default quick; Overnight offer card on complete-with-holes; overnight progress copy.

## Out of scope (later)
Migration-ledger fail-fast (separate bug); multi-drive recovery; precise Overnight ETA.
