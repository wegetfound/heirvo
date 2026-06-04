export type DiscStatus = "recovered" | "partial" | "recovering" | "incomplete";

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

/** A single recovered image in a photo set (e.g. a Kodak Photo CD, which holds
 *  dozens-to-hundreds of scans). One disc → many photos → one gallery. */
export interface PhotoAsset {
  /** Local filesystem path to the recovered/converted image (JPEG). Loaded via
   *  convertFileSrc. Absent in demo/mock data → a warm placeholder is shown. */
  path?: string;
  caption?: string;
  /** CSS background used as the placeholder tile when there is no real file
   *  yet (demo data, or a thumbnail still being generated). */
  tint?: string;
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
  /** Local filesystem path to the recovered media file. Loaded via Tauri's
   *  asset protocol (convertFileSrc) in the Watch screen. */
  videoPath?: string;
  /** Friendly copy of the recovered/imported file saved in Documents\Heirvo\<Title>\<Title>.mp4.
   *  Use deliverablePath ?? videoPath for user-facing file operations (open, reveal).
   *  Optional — may be undefined for older/mock discs. */
  deliverablePath?: string;
  /** "video" | "audio" | "photo" | "document". Drives conditional render in
   *  the Watch screen (img vs video) and DiscDetail (transcript visibility).
   *  Defaults to "video" for all existing recovered DVD rows. */
  mediaType?: "video" | "audio" | "photo" | "document";
  /** A multi-image set (Kodak Photo CD, scanned-photo disc, slideshow source).
   *  When present (length > 0) the disc opens as a gallery rather than a single
   *  image/player. Backward compatible: existing single-file discs omit it. */
  photos?: PhotoAsset[];
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
