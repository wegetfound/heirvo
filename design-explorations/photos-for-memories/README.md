# Photos for Memories — Design Rationale

## Why this direction

Older, non-technical users already have a mental model for "a beautiful grid of memories" — it's called Apple Photos, and they've used it for fifteen years. Heirvo's killer move (universal transcript search across hours of recovered home video) earns its credibility by hiding inside a chrome the user already trusts. The recovery engineering is invisible; the family is in the foreground.

The cream/paper palette (#FBF7F2, #FFF7EF) reads warmer than stock Apple white and signals "archive, keepsake, paper" rather than "software." Fraunces italic for display type adds a literary, almost letterpress feeling that a clinical SF-only stack would miss — but the body is pure system-font SF for legibility on actual macOS.

## What's distinctive

- **Universal search lives in the chrome.** Always one keystroke away (⌘K). Searching is the product, so it's never more than one click from any screen.
- **Cover frames, not file icons.** Every disc is rendered as a single beautiful still, the way Photos shows an album.
- **Transcript as first-class UI.** On the Watch screen the transcript takes 40% of the width with speaker labels, not a collapsed sidebar. Clicking a line seeks the playhead — the whole point of the product.
- **Recovery report is a sidebar, not a screen.** A quiet "99.98% recovered" card on the disc detail page reassures without dominating.

## Tradeoffs

Grid-first means low information density per screen — power users who want spreadsheets of sectors will hate it. That's fine: this UI is for the grandmother typing "Hawaii."