/**
 * Single source of truth for Heirvo's pricing.
 *
 * Update the numbers here when prices change; every UI surface that needs to
 * show a price should import from this module. (Marketing prose inside
 * `data/guides.ts` is intentionally hand-edited rather than templated — the
 * exact phrasing matters for SEO content and isn't suitable for variable
 * substitution.)
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
  mailInFrom: {
    dollars: 89,
    label: "$89",
  },
  /**
   * IsoBuster competitor price. Do NOT change this unless IsoBuster's pricing
   * actually changes — it's used in comparison copy.
   */
  isobuster: {
    dollarsPerYear: 49.95,
    label: "$49.95/year",
  },
} as const;
