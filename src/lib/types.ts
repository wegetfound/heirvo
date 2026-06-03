// TypeScript mirrors of Rust IPC types.

export interface DriveCapabilities {
  reads_dvd: boolean;
  reads_cd: boolean;
  reads_bluray: boolean;
  supports_speed_control: boolean;
}

export interface DriveInfo {
  path: string;
  letter: string;
  vendor: string;
  model: string;
  firmware: string;
  capabilities: DriveCapabilities;
  has_media: boolean;
}

export type DiscType =
  | "DvdVideo"
  | "DvdRom"
  | "DvdAudio"
  | "Cd"
  | "AudioCd"
  | "Bluray"
  | "Unknown";

export interface AudioTrack {
  number: number;
  start_lba: number;
  end_lba: number;
  duration_secs: number;
}

export interface AudioToc {
  tracks: AudioTrack[];
  lead_out_lba: number;
}

export interface ExtractedAudioFile {
  track_number: number;
  file_path: string;
  size_bytes: number;
  duration_secs: number;
  bad_sectors: number;
}

export interface DiscInfo {
  disc_type: DiscType;
  label: string;
  total_sectors: number;
  sector_size: number;
  fingerprint: string;
  has_video_ts: boolean;
  has_audio_ts: boolean;
}

// Recovery Plan briefing — Heirvo's pre-scan transparency feature.
// No other consumer recovery tool surfaces this before the user commits.

export type DiscStatus = "empty" | "incomplete" | "finalized" | "other";
export type DriveQuality =
  | "pro"
  | "good"
  | "acceptable"
  | "marginal"
  | "avoid"
  | "unknown";

export interface DiscProfile {
  vendor: string;
  model: string;
  firmware: string;
  media_present: boolean;
  profile_code: number;
  profile_name: string;
  disc_status: DiscStatus;
  num_sessions: number;
  erasable: boolean;
}

export interface DriveAssessment {
  quality: DriveQuality;
  category: string;
  notes: string;
}

export interface RecoveryPlanBriefing {
  disc: DiscProfile;
  drive_assessment: DriveAssessment;
}

export type SessionStatus =
  | "created"
  | "scanning"
  | "recovering"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Recovery pacing mode.
 * - "quick": balanced first pass — block triage, fast on healthy drives.
 * - "overnight": deep retry pass for remaining damaged sectors. Slower
 *   re-reads, cool-down pauses, bidirectional seeks. Designed to run
 *   unattended for hours; works only the holes Quick couldn't fill.
 */
export type RecoveryMode = "quick" | "overnight";

/** Convenience type for the holes count after a Quick pass completes. */
export interface OvernightReadiness {
  /** Total sectors that are still failed or unknown after a Quick pass. */
  holes_remaining: number;
}

/** Freemium license status. Returned by get_license_status IPC.
 *
 * Plan tiers (2026-05-18):
 *   - "free"     — full recovery, no save, no media import
 *   - "recover"  — unlocks Save (MP4, ISO, all-files)
 *   - "archive"  — Recover features + personal media import into vault
 *   - "family"   — Archive features + (future) multi-user library sync
 *   - "pro"      — legacy alias, treated as Archive for backward compat
 */
export type Plan = "free" | "recover" | "archive" | "family" | "pro";
export interface LicenseStatus {
  plan: Plan;
  holder: string | null;
  can_save: boolean;
  /** True on Archive / Family / (legacy) Pro tiers only. */
  can_import_media: boolean;
  exports_used: number;
}

/** Returned by get_import_size_preview — used by the import flow to show a
 * size confirmation OR a paywall before committing to a multi-GB hash+copy. */
export interface ImportPreview {
  fileSize: number;
  fileSizeDisplay: string;
  vaultFreeSpace: number | null;
  willFit: boolean;
  mediaKind: "video" | "audio";
  gate: ImportGate;
}

export interface ImportGate {
  allowed: boolean;
  /** Tier the user needs to unlock import. Currently always "archive". */
  requiredPlan: "archive";
  reason: string | null;
}

/** Returned by delete_library_disc. `vaultFileRemoved` is false if the disc
 * was a recovered DVD whose video_path lived outside the vault — in that
 * case only the DB row is dropped, the original file is untouched. */
export interface DeleteResult {
  id: string;
  vaultFileRemoved: boolean;
  bytesFreed: number;
}

/** Returned by delete_library_discs_bulk. Partial success is allowed. */
export interface BulkDeleteResult {
  successCount: number;
  failCount: number;
  bytesFreed: number;
}

/** A library album — groups related discs (most commonly photos from a
 *  dropped folder) under a single library card. */
export interface Album {
  id: string;
  title: string;
  coverDiscId: string | null;
  discCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface AlbumWithDiscs extends Album {
  discs: import("../screens/library/data/types").Disc[];
}

export interface DeleteAlbumResult {
  id: string;
  membersRemoved: number;
  bytesFreed: number;
}

/** Returned by get_vault_stats. Powers the Settings storage panel. */
export interface VaultStats {
  vaultPath: string;
  fileCount: number;
  bytesUsed: number;
  bytesUsedDisplay: string;
  bytesFree: number | null;
  bytesFreeDisplay: string | null;
}

/** Whisper model info returned by get_whisper_model_info. */
export interface WhisperModelInfo {
  current: string;         // e.g. "ggml-base.en.bin" or "ggml-tiny.en.bin"
  base_en_present: boolean;
  tiny_en_present: boolean;
}

/** A local storage destination (for picking output drives). NOT optical drives. */
export interface StorageDrive {
  path: string;        // "D:\\" with trailing backslash on Windows
  label: string;       // Volume label, may be empty
  kind: "fixed" | "removable" | "network";
  total_bytes: number;
  free_bytes: number;
}

export interface Session {
  id: string;
  disc_label: string;
  disc_fingerprint: string;
  drive_path: string;
  total_sectors: number;
  output_dir: string;
  status: SessionStatus;
  current_pass: number;
  created_at: number;
  updated_at: number;
  disc_type: DiscType | null;
  user_label: string | null;
}

export type DriveHealthHint = "unknown" | "good" | "marginal" | "suspect";

export interface RecoveryStats {
  good: number;
  failed: number;
  skipped: number;
  unknown: number;
  total: number;
  current_lba: number;
  current_pass: number;
  pass_strategy: string;
  speed_sps: number;
  elapsed_secs: number;
  eta_secs: number | null;
  /** Heuristic about whether the drive itself looks healthy. */
  drive_health: DriveHealthHint;
  /** Cumulative successful sector reads since recovery started. */
  reads_ok: number;
  /** Cumulative failed read attempts since recovery started. */
  reads_err: number;
  /** Seconds since the last successful read; null if we never had one. */
  idle_secs: number | null;
}

export interface RecoveryProgress {
  session_id: string;
  stats: RecoveryStats;
  /**
   * Convenience count of sectors still unrecovered (failed + unknown).
   * If the backend omits this field, the UI derives it from stats.failed +
   * stats.unknown directly. Zero means a clean recovery with no holes.
   */
  holes_remaining?: number;
}

export interface IsoEntry {
  name: string;
  is_dir: boolean;
  start_lba: number;
  size_bytes: number;
}

export interface StructureSummary {
  volume_label: string;
  video_ts_files: IsoEntry[];
}

export interface ExtractedFile {
  name: string;
  path: string;
  size_bytes: number;
  good_sectors: number;
  zero_filled_sectors: number;
  good_read_failed_sectors: number;
}

export interface HealthReport {
  score: number;
  coverage_pct: number;
  critical_intact: boolean;
  failed_sectors: number;
  largest_failed_run: number;
  summary: string;
}

export interface IsoResult {
  path: string;
  bytes_written: number;
  good_sectors: number;
  zero_filled_sectors: number;
  good_read_failed_sectors: number;
}

export type OutputCodec = "h264" | "h265" | "av1";
export type QualityPreset = "archive" | "high_quality" | "streaming" | "mobile";

export interface TranscodeJob {
  input: string;
  output: string;
  codec: OutputCodec;
  quality: QualityPreset;
  deinterlace: boolean;
  denoise: boolean;
  resolution: [number, number] | null;
}

export interface TranscodeStarted {
  job_id: string;
}

export interface FfmpegStatus {
  available: boolean;
  path: string | null;
  version: string | null;
}

export interface ImagemagickStatus {
  available: boolean;
  path: string | null;
  version: string | null;
}

export type InstallStage = "starting" | "downloading" | "extracting" | "installed" | "failed";

export interface InstallProgress {
  stage: InstallStage;
  bytes_done: number;
  bytes_total: number;
  message: string;
}

export interface ProbeResult {
  duration_secs: number;
  video_codec: string;
  audio_codec: string;
  width: number;
  height: number;
  interlaced: boolean;
}

export interface TranscodeProgress {
  job_id: string;
  frame: number;
  fps: number;
  bitrate_kbps: number;
  out_time_us: number;
  speed: number;
  progress: string;
}

export type AiModel =
  | "RealEsrganX2"
  | "RealEsrganX4"
  | "Rife4"
  | "DeepFilterNet"
  | "BasicVsr";

export type EnhancementOp =
  | { kind: "deinterlace" }
  | { kind: "denoise" }
  | { kind: "upscale"; model: AiModel }
  | { kind: "interpolate_frames"; model: AiModel; target_fps: number }
  | { kind: "audio_cleanup"; model: AiModel };

export interface EnhancementJob {
  input: string;
  output: string;
  ops: EnhancementOp[];
}

export type AiPreset = "light" | "standard" | "maximum";

export interface AiBackendInfo {
  name: string;
  device: string;
  tile_layout: "bgra" | "rgb";
  max_tile_size: number;
  available?: boolean;
}

export type AiJobStatus = "queued" | "running" | "complete" | "error";

export interface AiJobRecord {
  id: number;
  session_id: string | null;
  input_file: string;
  output_file: string;
  status: AiJobStatus;
  progress: number;
  started_at: number | null;
  completed_at: number | null;
  error_message: string | null;
}

export interface AiJobProgress {
  job_id: number;
  progress: number;
}

export interface AiJobError {
  job_id: number;
  error: string;
}

export interface ModelEntry {
  model: AiModel;
  installed: boolean;
  path: string | null;
  size_mb: number;
  download_url: string | null;
  has_pinned_hash: boolean;
  description: string;
  /** False until model hosting URLs are configured — UI should disable the
   *  download action and show "install manually" when this is false. */
  available_for_download: boolean;
}

export interface ModelCatalog {
  models: ModelEntry[];
}

export type ModelDownloadStage =
  | "starting"
  | "downloading"
  | "verifying"
  | "installed"
  | "failed";

export interface ModelDownloadProgress {
  model_id: string;
  stage: ModelDownloadStage;
  bytes_done: number;
  bytes_total: number;
  message: string;
}

export interface ModelDownloadResult {
  model_id: string;
  path: string;
  bytes: number;
  verified: boolean;
}

export interface PreviewResult {
  original_png_path: string;
  enhanced_png_path: string;
  original_width: number;
  original_height: number;
  enhanced_width: number;
  enhanced_height: number;
  backend_name: string;
  upscale_factor: number;
}

export function presetOps(preset: AiPreset): EnhancementOp[] {
  // Mirrors src-tauri/src/ai/pipeline.rs Preset::ops()
  switch (preset) {
    case "light":
      return [
        { kind: "deinterlace" },
        { kind: "denoise" },
        { kind: "upscale", model: "RealEsrganX2" },
      ];
    case "standard":
      return [
        { kind: "deinterlace" },
        { kind: "denoise" },
        { kind: "upscale", model: "RealEsrganX2" },
        { kind: "audio_cleanup", model: "DeepFilterNet" },
      ];
    case "maximum":
      return [
        { kind: "deinterlace" },
        { kind: "denoise" },
        { kind: "upscale", model: "RealEsrganX2" },
        { kind: "interpolate_frames", model: "Rife4", target_fps: 60 },
        { kind: "audio_cleanup", model: "DeepFilterNet" },
      ];
  }
}

// SectorState values returned by the downsampled map (1 byte per bucket).
export const SECTOR_STATE = {
  Unknown: 0b00,
  Good: 0b01,
  Failed: 0b10,
  Skipped: 0b11,
} as const;

// Preflight checks shown on first launch.
export interface PreflightCheck {
  id: string;
  label: string;
  ok: boolean | null;
  detail: string;
  critical: boolean;
}

export interface PreflightStatus {
  seen: boolean;
  checks: PreflightCheck[];
  allCriticalOk: boolean;
}

// Transcription pipeline (audio extraction + speech-to-text).
export type TranscriptionStatus =
  | "queued"
  | "extracting"
  | "transcribing"
  | "complete"
  | "error"
  | "cancelled";

export interface ImportResult {
  id: string;
  isDuplicate: boolean;
}

export interface TranscriptionJob {
  id: number;
  discId: string;
  videoPath: string;
  audioPath: string | null;
  backend: string;
  model: string | null;
  status: TranscriptionStatus;
  progress: number;
  errorMessage: string | null;
  queuedAt: number;
  startedAt: number | null;
  completedAt: number | null;
  durationSec: number | null;
}

export interface TranscriptionProgress {
  jobId: number;
  discId: string;
  status: TranscriptionStatus;
  progress: number;
}

// Paginated library page — returned by ipc.library.listPage.
// `nextCursor === null` ⇒ no more rows; otherwise pass it back to fetch
// the next page. The cursor is an opaque epoch-seconds value the backend
// uses to seek; treat it as an opaque token in the UI.
export interface LibraryDiscPage {
  discs: import("../screens/library/data/types").Disc[];
  nextCursor: number | null;
}

// Library — re-export the canonical shapes used by the library screens so
// every consumer (IPC client, screen components) imports from one place.
export type {
  Disc as LibraryDisc,
  SearchHit as LibrarySearchHit,
  TranscriptLine as LibraryTranscriptLine,
  Scene as LibraryScene,
  TopicTag as LibraryTopicTag,
  Person as LibraryPerson,
  DiscStatus as LibraryDiscStatus,
  GradientId as LibraryGradientId,
  MonogramId as LibraryMonogramId,
} from "../screens/library/data/types";
