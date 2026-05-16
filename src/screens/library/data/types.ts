export type DiscStatus = "recovered" | "partial" | "recovering";

export type GradientId =
  | "wedding"
  | "christmas"
  | "hawaii"
  | "dad60"
  | "school"
  | "reunion"
  | "eleanor"
  | "yellow"
  | "capecod"
  | "babysarah"
  | "easter"
  | "newyear"
  | "graduation"
  | "thx";

export interface TranscriptLine {
  /** "HH:MM:SS" */
  time: string;
  /** seconds — pre-computed from time for ease */
  timeSec: number;
  speaker?: string;
  text: string;
  /** stage direction like "[laughter]" — renders italicized, no speaker */
  isStageDirection?: boolean;
}

export interface Scene {
  time: string;
  timeSec: number;
  title: string;
  description?: string;
}

export interface TopicTag {
  label: string;
  count: number;
}

export interface Person {
  initials: string;
  name: string;
}

export type MonogramId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Disc {
  id: string;
  title: string;
  year: number;
  date: string;
  filmedBy?: string;
  location?: string;
  source: string;
  status: DiscStatus;
  durationFormatted: string;
  durationSec: number;
  recoveredAt: string;
  phrasesIndexed: number;
  scenes: Scene[];
  topics: TopicTag[];
  people: Person[];
  transcript: TranscriptLine[];
  monogramId: MonogramId;
  gradient: GradientId;
  about?: string;
}

export interface SearchHit {
  discId: string;
  discTitle: string;
  discDate: string;
  time: string;
  timeSec: number;
  speaker?: string;
  snippet: string;
  matchedTerms: string[];
}
