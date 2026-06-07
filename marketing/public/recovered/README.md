# Recovered-memory images — "What comes back" grid

Drop the 5 vintage WebP images here. They render in the homepage
"What comes back" section (`src/pages/Landing.tsx`, section 05) with the
clip-path "printing up" reveal.

Served at site root: a file here is reachable at `/recovered/<name>.webp`.

| Box | Filename | Size (WebP) | Theme |
|-----|----------|-------------|-------|
| 1 — wide (2:1) | `wedding-1987.webp`     | 1600 × 800 | Parents' wedding, 1987 |
| 2 (4:3)        | `birthday-1994.webp`    | 800 × 600  | Birthday party, 1994 |
| 3 (4:3)        | `first-steps-2003.webp` | 800 × 600  | Baby's first steps, 2003 |
| 4 (4:3)        | `christmas-1991.webp`   | 800 × 600  | Christmas morning, 1991 |
| 5 (4:3)        | `beach-1999.webp`       | 800 × 600  | Family beach vacation, 1999 |

Generate at 1536×1024 (ChatGPT image tool), then crop/resize to the size
above and export as WebP (~80 quality). Vintage/aged look — see the prompts
used to create them. Keep faces centered with headroom so the crop is safe.
