/**
 * Pricing constants for the Heirvo desktop app.
 *
 * Mirrors `marketing/src/lib/pricing.ts`. Keep the two files in sync — they
 * deliberately live in separate trees because the marketing site and the
 * Tauri app ship as independent bundles.
 */

export const PRICING = {
  recover: {
    dollars: 59,
    label: "$59",
  },
  archive: {
    dollars: 99,
    label: "$99",
  },
  family: {
    dollars: 149,
    label: "$149",
  },
} as const;
