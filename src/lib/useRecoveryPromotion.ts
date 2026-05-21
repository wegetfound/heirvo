/**
 * useRecoveryPromotion
 *
 * App-level hook (mounted once in App.tsx) that bridges the recovery → library
 * loop.  Listens for `library:disc_added`, kicks off normalization when needed,
 * and dispatches `heirvo:library-changed` so mounted library screens refresh.
 *
 * Dev-mode safety: `events.*` helpers reject in non-Tauri context; all
 * subscriptions are wrapped in try/catch so the hook is a no-op in dev.
 */

import { useEffect } from "react";
import { ipc, events } from "./ipc";

// Dispatch a window-level CustomEvent so any mounted library screen can react.
function dispatchLibraryChanged(discId: string) {
  window.dispatchEvent(
    new CustomEvent("heirvo:library-changed", { detail: { discId } }),
  );
}

// Derive the normalization output path: strip the last extension and append
// `.heirvo-h264.mp4`.
// e.g. `/output/video.vob`  →  `/output/video.heirvo-h264.mp4`
//      `/output/VIDEO_TS.iso` → `/output/VIDEO_TS.heirvo-h264.mp4`
function deriveOutputPath(inputPath: string): string {
  // Strip the extension from the FILENAME only — never from a folder that
  // contains a dot (e.g. `C:\my.folder\video.vob` must keep `my.folder`).
  const sep = Math.max(inputPath.lastIndexOf("/"), inputPath.lastIndexOf("\\"));
  const dot = inputPath.lastIndexOf(".");
  const base = dot > sep ? inputPath.slice(0, dot) : inputPath;
  return `${base}.heirvo-h264.mp4`;
}

export function useRecoveryPromotion() {
  useEffect(() => {
    // Collect cleanup functions returned by `listen` (Promises<UnlistenFn>).
    const cleanups: Array<Promise<() => void>> = [];

    // Active normalization jobs: job_id → { discId, outPath }
    const pendingJobs = new Map<string, { discId: string; outPath: string }>();

    // ── Subscribe to normalize:complete ──────────────────────────────────────
    const completeP = events
      .onNormalizeComplete(async ({ job_id, mode }) => {
        const job = pendingJobs.get(job_id);
        if (!job) return;
        pendingJobs.delete(job_id);

        // "already_safe" means the output file was not written; the original
        // path is already playable — no need to call updateDiscVideoPath.
        if (mode === "already_safe") {
          dispatchLibraryChanged(job.discId);
          return;
        }

        try {
          await ipc.library.updateDiscVideoPath(job.discId, job.outPath, "recovered");
        } catch (err) {
          console.warn("[RecoveryPromotion] updateDiscVideoPath failed:", err);
        }
        dispatchLibraryChanged(job.discId);
      })
      .catch(() => () => {}); // no-op unlisten in dev

    cleanups.push(completeP);

    // ── Subscribe to normalize:error ─────────────────────────────────────────
    const errorP = events
      .onNormalizeError(({ job_id, error }) => {
        const job = pendingJobs.get(job_id);
        if (!job) return;
        pendingJobs.delete(job_id);
        console.warn(
          `[RecoveryPromotion] normalization failed for disc ${job.discId} (job ${job_id}):`,
          error,
        );
        // Non-fatal: leave disc as-is; the "getting ready" UI state handles it.
      })
      .catch(() => () => {});

    cleanups.push(errorP);

    // ── Subscribe to library:disc_added ──────────────────────────────────────
    const addedP = events
      .onDiscAdded(async ({ discId, needsNormalization, videoPath }) => {
        // Always notify library screens immediately so the new disc appears.
        dispatchLibraryChanged(discId);

        if (!needsNormalization || !videoPath) return;

        const outPath = deriveOutputPath(videoPath);

        try {
          const { job_id } = await ipc.normalizeForPlayback(videoPath, outPath);
          pendingJobs.set(job_id, { discId, outPath });
        } catch (err) {
          console.warn(
            "[RecoveryPromotion] normalizeForPlayback invoke failed:",
            err,
          );
        }
      })
      .catch(() => () => {});

    cleanups.push(addedP);

    // ── Cleanup: resolve all unlisten fns and call them ──────────────────────
    return () => {
      Promise.allSettled(cleanups).then((results) => {
        for (const r of results) {
          if (r.status === "fulfilled") {
            try {
              r.value();
            } catch {
              // ignore
            }
          }
        }
      });
      pendingJobs.clear();
    };
  }, []);
}
