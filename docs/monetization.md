# Monetization

## Pricing (current, v1.1.0)

| Tier | Price | What's included |
|---|---|---|
| **Free** | $0 | Full recovery scan, watch result in-app. Save to disk locked. Removes the IsoBuster trap of "pay to find out if it works." User sees their recovered content before paying. |
| **Recover** | $59 one-time | Save all recovered files from discs. Lifetime updates. |
| **Archive** | $99 one-time | Recover + personal media vault. Import photos/videos/audio from folders. Whisper transcription. The "Archivist" tier for the one who does this properly. |
| **Family** | $149 one-time | Everything in Archive + family-sharing features. |

Legacy note: The `Pro` key from pre-v1.1.0 is valid and maps to `Archive`.

## Why this pricing wins

- IsoBuster $69 → we match on credibility at $59 (cheaper, better UX).
- Topaz $299/yr → undercut massively with one-time Archive tier.
- The free trial showing actual recovered video addresses the #1 complaint in forum threads.
- "Archivist" identity naming at $99 converts better than feature lists — same pattern as Ancestry.com.

## Distribution

- Direct download from heirvo.com. Lemon Squeezy for global payment + tax handling.
- **Avoid Microsoft Store** — revenue cut, slow approval, restricts raw device access.

## Lemon Squeezy product IDs

Set via build-time env vars (see `.env.example`):
- `VITE_LS_PRODUCT_RECOVER` — Recover ($59)
- `VITE_LS_PRODUCT_ARCHIVE` — Archive ($99)
- `VITE_LS_PRODUCT_FAMILY` — Family ($149)

## Marketing wedge

- Real recovery comparisons on YouTube vs IsoBuster/CDRoller using test disc library.
- SEO: *"recover scratched DVD home video"*, *"wedding DVD won't play"*, *"unfinalized DVD recovery"*, *"Kodak photo CD Windows 11"*. High-intent traffic converts.
- Reddit: r/DataHoarder, r/datarecovery — be helpful, not promotional.
- Heirvo Labs (home operators, 9 US metros) — creates human-interest stories and testimonials.

## Additional revenue

- **Mail-in recovery service** — $89/disc via Labs network, no-recovery/no-charge guarantee.
- **Labs operator network** — piece-rate operators expand geographic reach, not a direct revenue line.

## Five things that determine success

1. **The recovery engine genuinely outperforms IsoBuster on real damaged discs.** Buy 30 scratched discs and benchmark obsessively.
2. **The four-screen UX is so simple a 70-year-old can use it.** Test with actual non-technical users before launch.
3. **Resumability is bulletproof.** Pull the disc, kill the process, reboot — must always recover gracefully. This is the #1 testimonial driver.
4. **AI restoration is conservative by default.** Win by NOT producing the waxy Topaz look. *"It looks like the original, just clearer"* is the review you want.
5. **The trial lets users SEE recovered video before paying.** This single thing breaks the IsoBuster pricing trust problem.
