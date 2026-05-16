import { MOCK_DISCS } from "./mockDiscs";
import type { SearchHit } from "./types";

/**
 * Naive case-insensitive multi-word search across every transcript line of every disc.
 * Returns one hit per matching transcript line; relevance = number of terms matched.
 */
export function searchTranscripts(query: string): SearchHit[] {
  const q = query.trim();
  if (!q) return [];
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const hits: Array<SearchHit & { score: number }> = [];

  for (const disc of MOCK_DISCS) {
    for (const line of disc.transcript) {
      const haystack = line.text.toLowerCase();
      const matched = terms.filter((t) => haystack.includes(t));
      if (matched.length === 0) continue;
      hits.push({
        discId: disc.id,
        discTitle: disc.title,
        discDate: disc.date,
        time: line.time,
        timeSec: line.timeSec,
        speaker: line.speaker,
        snippet: line.text,
        matchedTerms: matched,
        score: matched.length * 100 + (line.text.length < 240 ? 5 : 0),
      });
    }
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.map(({ score: _score, ...rest }) => rest);
}
