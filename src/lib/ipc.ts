import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  DriveInfo,
  DiscInfo,
  DiscType,
  RecoveryPlanBriefing,
  Session,
  RecoveryProgress,
  StructureSummary,
  ExtractedFile,
  HealthReport,
  IsoResult,
  TranscodeJob,
  TranscodeStarted,
  TranscodeProgress,
  FfmpegStatus,
  ImagemagickStatus,
  ProbeResult,
  RecoveryMode,
  StorageDrive,
  LicenseStatus,
  AudioToc,
  ExtractedAudioFile,
  LibraryDisc,
  LibraryDiscPage,
  LibrarySearchHit,
  TranscriptionJob,
  TranscriptionProgress,
  ImportResult,
  ImportPreview,
  DeleteResult,
  BulkDeleteResult,
  VaultStats,
  Album,
  AlbumWithDiscs,
  DeleteAlbumResult,
  WhisperModelInfo,
} from "./types";

export const ipc = {
  // Drives
  listDrives: () => invoke<DriveInfo[]>("list_drives"),
  checkDisc: (drivePath: string) =>
    invoke<DiscInfo | null>("check_disc", { drivePath }),
  probeDiscProfile: (drivePath: string) =>
    invoke<RecoveryPlanBriefing | null>("probe_disc_profile", { drivePath }),

  // Output destination drives (USB sticks, external HDDs — NOT optical)
  listStorageDrives: () => invoke<StorageDrive[]>("list_storage_drives"),

  // Freemium license
  getLicenseStatus: () => invoke<LicenseStatus>("get_license_status"),
  activateLicense: (key: string) => invoke<LicenseStatus>("activate_license", { key }),
  deactivateLicense: () => invoke<LicenseStatus>("deactivate_license"),

  // Sessions
  createSession: (args: {
    disc_label: string;
    disc_fingerprint: string;
    drive_path: string;
    total_sectors: number;
    output_dir: string;
    disc_type?: DiscType | null;
  }) => invoke<Session>("create_session", { args }),
  listSessions: () => invoke<Session[]>("list_sessions"),
  resumeSession: (sessionId: string) =>
    invoke<Session>("resume_session", { sessionId }),
  deleteSession: (sessionId: string) =>
    invoke<void>("delete_session", { sessionId }),
  changeDrive: (sessionId: string, newDrivePath: string) =>
    invoke<Session>("change_drive", { sessionId, newDrivePath }),
  renameSession: (sessionId: string, label: string) =>
    invoke<void>("rename_session", { sessionId, label }),
  changeOutputDir: (sessionId: string, newOutputDir: string) =>
    invoke<Session>("change_output_dir", { sessionId, newOutputDir }),

  // Recovery
  /** Start (or restart) a recovery pass for a session.
   *  `mode` defaults to "quick" — the fast first pass. Pass "overnight" to
   *  retry only the remaining damaged sectors with slower re-reads, cool-downs,
   *  and bidirectional seeks. */
  startRecovery: (sessionId: string, mode: RecoveryMode = "quick") =>
    invoke<void>("start_recovery", { sessionId, mode }),
  pauseRecovery: (sessionId: string) =>
    invoke<void>("pause_recovery", { sessionId }),
  cancelRecovery: (sessionId: string) =>
    invoke<void>("cancel_recovery", { sessionId }),
  getSectorMap: (sessionId: string, buckets: number) =>
    invoke<number[]>("get_sector_map", { sessionId, buckets }),
  exportRmap: (sessionId: string, outputPath?: string) =>
    invoke<{ path: string; bytes_written: number; run_count: number }>(
      "export_rmap",
      { sessionId, outputPath },
    ),
  importRmap: (sessionId: string, inputPath: string) =>
    invoke<{
      good_sectors: number;
      failed_sectors: number;
      skipped_sectors: number;
      unknown_sectors: number;
    }>("import_rmap", { sessionId, inputPath }),
  exportReceiptManifest: (sessionId: string, outputPath?: string) =>
    invoke<{ manifest: string; sector_count: number }>(
      "export_receipt_manifest",
      { sessionId, outputPath },
    ),

  // DVD
  analyzeStructure: (sessionId: string) =>
    invoke<StructureSummary>("analyze_structure", { sessionId }),
  extractVobs: (sessionId: string, fileNames: string[] = []) =>
    invoke<ExtractedFile[]>("extract_vobs", { sessionId, fileNames }),
  extractAllFiles: (sessionId: string) =>
    invoke<ExtractedFile[]>("extract_all_files", { sessionId }),
  healthScore: (sessionId: string) =>
    invoke<HealthReport>("health_score", { sessionId }),
  listFilesInIso: (isoPath: string) =>
    invoke<{
      path: string;
      totalSectors: number;
      fileCount: number;
      usedUdf: boolean;
      entries: Array<{ path: string; sizeBytes: number; startLba: number; isDamaged: boolean }>;
    }>("list_files_in_iso", { isoPath }),
  scanIsoSignatures: (isoPath: string) =>
    invoke<{
      hits: Array<{ file_type: string; start_lba: number; extension: string }>;
      damagedSectors: number;
      totalSectors: number;
    }>("scan_iso_signatures", { isoPath }),

  // Media
  createIso: (sessionId: string, outputPath?: string) =>
    invoke<IsoResult>("create_iso", { sessionId, outputPath }),
  saveAsMp4: (sessionId: string) =>
    invoke<{ output_path: string; bytes_written: number; source_files: string[] }>(
      "save_as_mp4",
      { sessionId },
    ),
  ffmpegStatus: () => invoke<FfmpegStatus>("ffmpeg_status"),
  ffprobeFile: (path: string) => invoke<ProbeResult>("ffprobe_file", { path }),
  installFfmpeg: () => invoke<string>("install_ffmpeg"),
  imagemagickStatus: () => invoke<ImagemagickStatus>("imagemagick_status"),
  installImagemagick: () => invoke<string>("install_imagemagick"),
  transcode: (job: TranscodeJob) => invoke<TranscodeStarted>("transcode", { job }),
  /** Re-encode or remux a recovered video so it is playable in the Chromium
   * webview. Fires `normalize:progress`, `normalize:complete`, and
   * `normalize:error` events while running.
   *
   * `mode` in the complete payload is one of:
   *   - `"already_safe"` — input was already H.264/AAC MP4; `outputPath` is
   *     not written and the UI should play `inputPath` directly.
   *   - `"remux"` — stream-copy into MP4, no quality loss.
   *   - `"reencode"` — full libx264/AAC encode (MPEG-2/Xvid/etc. sources). */
  normalizeForPlayback: (inputPath: string, outputPath: string) =>
    invoke<{ job_id: string }>("normalize_for_playback", { inputPath, outputPath }),

  // AI
  listModels: () => invoke<import("./types").ModelCatalog>("list_models"),
  downloadModel: (model: import("./types").AiModel) =>
    invoke<import("./types").ModelDownloadResult>("download_model", { model }),
  aiBackendInfo: () => invoke<import("./types").AiBackendInfo>("ai_backend_info"),
  queueEnhancement: (job: import("./types").EnhancementJob) =>
    invoke<number>("queue_enhancement", { job }),
  getJobStatus: (jobId: number) =>
    invoke<import("./types").AiJobRecord>("get_job_status", { jobId }),
  listEnhancementJobs: () =>
    invoke<import("./types").AiJobRecord[]>("list_enhancement_jobs"),
  enhancePreview: (input: string, timestampSecs: number, preset: import("./types").AiPreset) =>
    invoke<import("./types").PreviewResult>("enhance_preview", {
      input,
      timestampSecs,
      preset,
    }),

  // Audio CD
  readAudioToc: (sessionId: string) =>
    invoke<AudioToc>("read_audio_toc", { sessionId }),
  extractAudioTracks: (sessionId: string, outputDir?: string) =>
    invoke<ExtractedAudioFile[]>("extract_audio_tracks", { sessionId, outputDir }),

  // Shell / OS
  openFolder: (path: string) => invoke<void>("open_folder", { path }),
  /** Reveal a file or folder in the OS file manager (Explorer on Windows,
   *  Finder on macOS, Files on Linux). Selects the item if it's a file.
   *  Delegates to the existing `open_folder` command which runs
   *  `explorer /select,<path>` on Windows and `xdg-open` on Linux/macOS. */
  revealInFolder: (path: string) => invoke<void>("open_folder", { path }),
  /** Open a file in the OS default app (the user's normal video player,
   *  photo viewer, etc.). Unlike revealInFolder which selects it in Explorer,
   *  this OPENS it. */
  openFile: (path: string) => invoke<void>("open_file", { path }),

  // Preflight
  getPreflightStatus: () =>
    invoke<import("./types").PreflightStatus>("get_preflight_status"),
  markPreflightSeen: () => invoke<void>("mark_preflight_seen"),

  // Library
  library: {
    list: () => invoke<LibraryDisc[]>("list_library_discs"),
    listPage: (cursor: number, limit: number) =>
      invoke<LibraryDiscPage>("list_library_discs_page", { cursor, limit }),
    get: (id: string) => invoke<LibraryDisc | null>("get_library_disc", { id }),
    search: (query: string) =>
      invoke<LibrarySearchHit[]>("search_library_transcripts", { query }),
    seedDemo: () => invoke<number>("seed_library_demo"),
    exportHtml: (discId: string, outputPath: string) =>
      invoke<number>("export_disc_html", { discId, outputPath }),
    importVideoDisc: (videoPath: string, title: string) =>
      // Backwards-compat alias — routes to the new media importer.
      invoke<ImportResult>("import_media_disc", { mediaPath: videoPath, title, albumId: null }),
    importMedia: (mediaPath: string, title: string, albumId: string | null = null) =>
      invoke<ImportResult>("import_media_disc", { mediaPath, title, albumId }),
    /** Cheap pre-flight: returns size, free-space, and the licensing gate.
     * Call this BEFORE importMedia so the UI can show a paywall or a
     * "this will use X GB" confirmation before committing to a multi-GB copy. */
    getImportSizePreview: (mediaPath: string) =>
      invoke<ImportPreview>("get_import_size_preview", { mediaPath }),
    /** Remove a disc from the library.
     *
     * `permanent = false` (safe default): deletes the DB row, internal vault
     * copy, and cached thumbnail — but **keeps** the Documents\Heirvo
     * deliverable file. Returns `deliverableKept` with the preserved path.
     *
     * `permanent = true`: same as above plus the Documents\Heirvo deliverable
     * is permanently deleted from the computer. `deliverableKept` will be null. */
    deleteDisc: (id: string, permanent: boolean) =>
      invoke<DeleteResult>("delete_library_disc", { id, permanent }),
    /** Bulk-delete multiple discs. Loops delete_library_disc internally and
     * returns aggregate totals. Partial success is allowed.
     * `permanent` has the same two-mode semantics as deleteDisc. */
    deleteDiscsBulk: (ids: string[], permanent: boolean) =>
      invoke<BulkDeleteResult>("delete_library_discs_bulk", { ids, permanent }),
    /** Aggregate vault stats — total files, bytes used, free space. */
    getVaultStats: () => invoke<VaultStats>("get_vault_stats"),
    /** Walk a directory (recursively, capped) and return all importable media
     * file paths. Used by the drag-drop handler when the user drops a folder. */
    listImportableMediaInDir: (dir: string) =>
      invoke<string[]>("list_importable_media_in_dir", { dir }),
    /** Return a cached thumbnail path for the disc (generates on first call).
     * Currently only returns a path for photo discs; recovered DVDs and
     * imported videos/audio resolve to null and the UI falls back to the
     * gradient artwork. */
    ensureDiscThumbnail: (discId: string) =>
      invoke<string | null>("ensure_disc_thumbnail", { discId }),

    /**
     * Convert a source image to a web-viewable JPEG and write it to outputPath.
     *
     * Natively supported (via the `image` crate — no extra dependencies):
     *   JPEG · PNG · GIF · WebP · BMP · TIFF
     *
     * Returns a discriminated-union result:
     *   { status: "ok", outputPath: string }
     *   { status: "needs_external_converter", extension, reason, recommendation }
     *   { status: "decode_error", message }
     *
     * @param maxDim  Optional longest-edge cap for gallery display sizes.
     *                Pass undefined / null for full-resolution output.
     */
    convertImageToJpeg: (
      inputPath: string,
      outputPath: string,
      maxDim?: number | null,
    ) =>
      invoke<
        | { status: "ok"; output_path: string }
        | { status: "needs_external_converter"; extension: string; reason: string; recommendation: string }
        | { status: "decode_error"; message: string }
      >("convert_image_to_jpeg", { inputPath, outputPath, maxDim: maxDim ?? null }),

    /**
     * Probe a special-format image (.pcd / .heic / RAW) and return the
     * documented conversion path. Always returns `needs_external_converter`
     * — this is a planning/routing command, not a conversion.
     *
     * See the Rust doc-comment on `convert_special_image` for the recommended
     * Phase-2 implementation plan for each format.
     */
    convertSpecialImage: (inputPath: string) =>
      invoke<
        | { status: "needs_external_converter"; extension: string; reason: string; recommendation: string }
        | { status: "decode_error"; message: string }
      >("convert_special_image", { inputPath }),

    /** Update the video_path of a disc after normalization completes.
     * Called by the frontend after `normalizeForPlayback` finishes so the
     * Watch screen can load the normalized MP4 instead of the raw file.
     * `status` is optional — omit to leave the current status unchanged. */
    updateDiscVideoPath: (discId: string, videoPath: string, status?: string) =>
      invoke<void>("update_disc_video_path", { discId, videoPath, status: status ?? null }),

    rescanDiscForSession: (sessionId: string) =>
      invoke<string | null>("rescan_disc_for_session", { sessionId }),
  },

  // Albums
  albums: {
    create: (title: string) => invoke<Album>("create_album", { title }),
    list: () => invoke<Album[]>("list_albums"),
    get: (id: string) => invoke<AlbumWithDiscs | null>("get_album_with_discs", { id }),
    rename: (id: string, title: string) =>
      invoke<void>("rename_album", { id, title }),
    setCover: (albumId: string, discId: string) =>
      invoke<void>("set_album_cover", { albumId, discId }),
    delete: (id: string, deleteMembers: boolean) =>
      invoke<DeleteAlbumResult>("delete_album", { id, deleteMembers }),
    addDisc: (discId: string, albumId: string) =>
      invoke<void>("add_disc_to_album", { discId, albumId }),
    removeDisc: (discId: string) =>
      invoke<void>("remove_disc_from_album", { discId }),
  },

  // Transcription
  transcription: {
    enqueue: (discId: string, videoPath: string) =>
      invoke<number>("enqueue_transcription", { discId, videoPath }),
    list: () => invoke<TranscriptionJob[]>("list_transcription_jobs"),
    forDisc: (discId: string) =>
      invoke<TranscriptionJob[]>("jobs_for_disc", { discId }),
    cancel: (jobId: number) => invoke<void>("cancel_transcription", { jobId }),
    retry: (jobId: number) => invoke<number>("retry_transcription", { jobId }),
    getModelInfo: () => invoke<WhisperModelInfo>("get_whisper_model_info"),
    setModel: (model: "tiny.en" | "base.en") =>
      invoke<WhisperModelInfo>("set_whisper_model", { model }),
  },

  // AutoPlay / disc insertion
  autoplayGetEnabled: () => invoke<boolean>("autoplay_get_enabled"),
  autoplaySetEnabled: (enabled: boolean) =>
    invoke<void>("autoplay_set_enabled", { enabled }),
  getPendingDisc: () => invoke<string | null>("get_pending_disc"),

  // Diagnostics
  exportDiagnosticBundle: (sessionId: string, outputPath?: string) =>
    invoke<{ zip_path: string; bytes: number; session_id: string }>(
      "export_diagnostic_bundle",
      { sessionId, outputPath },
    ),
  getLogPath: () => invoke<string>("get_log_path"),
  openLogFolder: () => invoke<void>("open_log_folder"),
};

// Typed event subscriptions
export const events = {
  onProgress(handler: (p: RecoveryProgress) => void): Promise<UnlistenFn> {
    return listen<RecoveryProgress>("recovery:progress", (e) => handler(e.payload));
  },
  onComplete(handler: (sessionId: string) => void): Promise<UnlistenFn> {
    return listen<string>("recovery:complete", (e) => handler(e.payload));
  },
  onTranscodeProgress(handler: (p: TranscodeProgress) => void): Promise<UnlistenFn> {
    return listen<TranscodeProgress>("transcode:progress", (e) => handler(e.payload));
  },
  onTranscodeComplete(handler: (jobId: string) => void): Promise<UnlistenFn> {
    return listen<string>("transcode:complete", (e) => handler(e.payload));
  },
  onTranscodeError(
    handler: (p: { job_id: string; error: string }) => void,
  ): Promise<UnlistenFn> {
    return listen<{ job_id: string; error: string }>("transcode:error", (e) => handler(e.payload));
  },
  onFfmpegInstallProgress(
    handler: (p: import("./types").InstallProgress) => void,
  ): Promise<UnlistenFn> {
    return listen<import("./types").InstallProgress>("ffmpeg:install_progress", (e) =>
      handler(e.payload),
    );
  },
  onImagemagickInstallProgress(
    handler: (p: import("./types").InstallProgress) => void,
  ): Promise<UnlistenFn> {
    return listen<import("./types").InstallProgress>("imagemagick:install_progress", (e) =>
      handler(e.payload),
    );
  },
  onDrivesChanged(handler: (drives: DriveInfo[]) => void): Promise<UnlistenFn> {
    return listen<DriveInfo[]>("drives:changed", (e) => handler(e.payload));
  },
  onEnhancementProgress(
    handler: (p: import("./types").AiJobProgress) => void,
  ): Promise<UnlistenFn> {
    return listen<import("./types").AiJobProgress>("enhancement:progress", (e) =>
      handler(e.payload),
    );
  },
  onEnhancementComplete(handler: (jobId: number) => void): Promise<UnlistenFn> {
    return listen<number>("enhancement:complete", (e) => handler(e.payload));
  },
  onEnhancementError(
    handler: (p: import("./types").AiJobError) => void,
  ): Promise<UnlistenFn> {
    return listen<import("./types").AiJobError>("enhancement:error", (e) =>
      handler(e.payload),
    );
  },
  onTranscriptionProgress(
    handler: (p: TranscriptionProgress) => void,
  ): Promise<UnlistenFn> {
    return listen<TranscriptionProgress>("transcription:progress", (e) =>
      handler(e.payload),
    );
  },
  onTranscriptionComplete(
    handler: (p: { jobId: number; discId: string }) => void,
  ): Promise<UnlistenFn> {
    return listen<{ jobId: number; discId: string }>(
      "transcription:complete",
      (e) => handler(e.payload),
    );
  },
  onTranscriptionError(
    handler: (p: { jobId: number; discId: string; error: string }) => void,
  ): Promise<UnlistenFn> {
    return listen<{ jobId: number; discId: string; error: string }>(
      "transcription:error",
      (e) => handler(e.payload),
    );
  },
  onModelDownloadProgress(
    handler: (p: import("./types").ModelDownloadProgress) => void,
  ): Promise<UnlistenFn> {
    return listen<import("./types").ModelDownloadProgress>(
      "model:download_progress",
      (e) => handler(e.payload),
    );
  },
  /** Fired when a recovered session is promoted to a library disc.
   * `needsNormalization: true` means the frontend should call
   * `normalizeForPlayback` then `library.updateDiscVideoPath`. */
  onDiscAdded(
    handler: (p: {
      discId: string;
      needsNormalization: boolean;
      videoPath: string | null;
    }) => void,
  ): Promise<UnlistenFn> {
    return listen<{
      discId: string;
      needsNormalization: boolean;
      videoPath: string | null;
    }>("library:disc_added", (e) => handler(e.payload));
  },
  /** Fired when `normalizeForPlayback` finishes successfully.
   * `mode` is one of `"already_safe"` | `"remux"` | `"reencode"`.
   * When `mode === "already_safe"` the output file was NOT written — play
   * the original `inputPath` directly. */
  onNormalizeComplete(
    handler: (p: { job_id: string; mode: string }) => void,
  ): Promise<UnlistenFn> {
    return listen<{ job_id: string; mode: string }>(
      "normalize:complete",
      (e) => handler(e.payload),
    );
  },
  /** Fired when `normalizeForPlayback` fails. Non-fatal — leave the disc
   * with whatever path it already has. */
  onNormalizeError(
    handler: (p: { job_id: string; error: string }) => void,
  ): Promise<UnlistenFn> {
    return listen<{ job_id: string; error: string }>(
      "normalize:error",
      (e) => handler(e.payload),
    );
  },
  /** Fired for each photo converted during a photo-disc promotion.
   * Payload: `{ sessionId, done, total }` (camelCase from Rust
   * `PromoteProgressPayload { session_id, done, total }`). */
  onAutoplayOpenDisc(handler: (path: string | null) => void): Promise<UnlistenFn> {
    return listen<{ path: string | null }>("autoplay:open-disc", (e) =>
      handler(e.payload.path),
    );
  },
  onPromoteProgress(
    handler: (p: { sessionId: string; done: number; total: number }) => void,
  ): Promise<UnlistenFn> {
    return listen<{ sessionId: string; done: number; total: number }>(
      "library:promote_progress",
      (e) => handler(e.payload),
    );
  },
};
