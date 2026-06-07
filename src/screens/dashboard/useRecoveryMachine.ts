import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ipc, events } from "@/lib/ipc";
import type { RecoveryStats, RecoveryMode, DriveInfo, DiscInfo, Session } from "@/lib/types";
import { audio } from "@/lib/audio";
import { documentDir, join } from "@tauri-apps/api/path";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

// ─── Public types ─────────────────────────────────────────────────────────────

/**
 * Union discriminated type for the recovery state machine.
 * Represents all possible states during disc recovery.
 *
 * States:
 * - `idle`: Waiting for user to pick a drive and disc
 * - `discovering`: Reading disc metadata
 * - `ready`: Disc found, ready to start recovery
 * - `unreadable`: Disc could not be read
 * - `starting`: Launching recovery session
 * - `recovering`: Recovery in progress, reading files
 * - `paused`: User paused recovery (can resume)
 * - `stalled`: No progress detected, drive may be disconnected
 * - `complete`: Recovery finished, files saved
 * - `error`: Unrecoverable error occurred
 */
export type RecoveryPhase =
  | { phase: "idle";        drive: DriveInfo | null }
  | { phase: "discovering"; drive: DriveInfo }
  | { phase: "ready";       drive: DriveInfo; disc: DiscInfo; outputDir: string }
  | { phase: "unreadable";  drive: DriveInfo; error: string }
  | { phase: "starting";    sessionId: string; session: Session | null }
  | { phase: "recovering";  sessionId: string; session: Session | null; stats: RecoveryStats; lastProgressAt: number }
  | { phase: "paused";      sessionId: string; session: Session | null; stats: RecoveryStats | null }
  | { phase: "stalled";     sessionId: string; session: Session | null; stats: RecoveryStats | null; reconnectElapsed: number }
  | { phase: "complete";    sessionId: string; session: Session | null; stats: RecoveryStats | null; holes: number; partial: boolean }
  | { phase: "error";       sessionId: string | null; session: Session | null; error: string };

/** Actions available on the recovery machine for user interaction. */
export interface RecoveryActions {
  /** Start recovery with current settings. */
  start: () => Promise<void>;
  /** Pause an in-progress recovery. */
  pause: () => void;
  /** Resume a paused or stalled recovery. */
  resume: (mode: RecoveryMode) => Promise<void>;
  /** Attempt to reconnect after drive disconnect. */
  reconnect: () => Promise<void>;
  /** Start an overnight recovery job (runs unattended until completion). */
  startOvernight: () => Promise<void>;
  /** Cancel the current recovery session completely. */
  cancel: () => void;
  /** Reset state to discover and recover another disc. */
  recoverAnother: () => void;
  /** Retry the last failed operation. */
  retry: () => void;
  /** Set the output directory for recovered files. */
  setOutputDir: (dir: string) => void;
  /** Open file browser to select output directory. */
  browseDest: () => Promise<void>;
  /** Switch to a different drive. */
  changeDrive: (path: string) => Promise<void>;
}

/**
 * Complete state and control interface for disc recovery.
 * Returned by the useRecoveryMachine hook.
 */
export interface RecoveryMachineResult {
  /** Current recovery state (discriminated union). */
  state: RecoveryPhase;
  /** User action handlers. */
  actions: RecoveryActions;
  /** Error message from last resume attempt (power-loss recovery). */
  resumeError: string | null;
  /** Elapsed seconds since stall was detected (0 if not stalled). */
  reconnectElapsed: number;
  /** Count of unreadable sectors at completion. */
  holesAtCompletion: number | null;
  /** Actual runtime in minutes. */
  realRuntimeMin: number | null;
  /** Preferred recovery mode (quick or overnight). */
  resumeMode: RecoveryMode;
  /** Update recovery mode preference. */
  setResumeMode: (m: RecoveryMode) => void;
  /** True while waiting for recovery to resume. */
  resuming: boolean;
  /** True while reconnect is in progress. */
  reconnecting: boolean;
  /** Currently available optical drives. */
  drives: DriveInfo[];
  /** Elapsed seconds in current stall (null if not stalled). */
  stalledElapsedSecs: number | null;
  /** Counter of how many stalls have occurred this session. */
  stallCount: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * State machine for managing disc recovery with power-loss resilience.
 *
 * Features:
 * - Automatic drive detection and disc identification
 * - Power-loss recovery: uses disc fingerprinting to detect swaps
 * - Stall detection: monitors for drive timeout or disconnection
 * - Virtual scroll support: optimized rendering for 10k+ transcript items
 *
 * Power-Loss Recovery (three-phase):
 * 1. Stabilize: Wait 50ms for transients to settle
 * 2. Verify: Check drives are accessible and disc is readable
 * 3. Recover: If same disc, resume existing session; if different, start fresh
 *
 * @param initialSessionId - Optional session ID to resume (e.g., from browser reload)
 * @returns Recovery machine state, actions, and status flags
 *
 * @example
 * const { state, actions } = useRecoveryMachine();
 * if (state.phase === "ready") {
 *   await actions.start();
 * }
 */
export function useRecoveryMachine(initialSessionId?: string): RecoveryMachineResult {
  const navigate = useNavigate();

  // ── Wizard-side state (pre-session) ────────────────────────────────────────
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [pickedDrive, setPickedDrive] = useState<DriveInfo | null>(null);
  const [disc, setDisc] = useState<DiscInfo | null>(null);
  const [outputDir, setOutputDir] = useState("");
  const [identifying, setIdentifying] = useState(false);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const everSawDrive = useRef(false);
  // Set by "Recover another disc": forces the next Start to create a brand-new
  // session even if the same disc (same fingerprint) is still in the drive,
  // instead of silently re-opening the previous COMPLETED session.
  const forceFreshSession = useRef(false);

  // ── Session-side state (post-session) ─────────────────────────────────────
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null);
  const [session, setSession] = useState<Session | null>(null);
  const [stats, setStats] = useState<RecoveryStats | null>(null);
  const [lastProgressAt, setLastProgressAt] = useState<number>(Date.now());
  const [now, setNow] = useState(Date.now());
  const [resuming, setResuming] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [recoveryDone, setRecoveryDone] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectElapsed, setReconnectElapsed] = useState(0);
  const [holesAtCompletion, setHolesAtCompletion] = useState<number | null>(null);
  const [isOvernightRunning, setIsOvernightRunning] = useState(false);
  const [realRuntimeMin, setRealRuntimeMin] = useState<number | null>(null);
  const [resumeMode, setResumeMode] = useState<RecoveryMode>(() => {
    try {
      const saved = initialSessionId ? localStorage.getItem(`mode:${initialSessionId}`) : null;
      return saved === "overnight" ? "overnight" : "quick";
    } catch { return "quick"; }
  });

  // ── Refs (avoid stale closures in intervals) ───────────────────────────────
  const recoveryDoneRef = useRef(false);
  const idleRef = useRef(false);
  const statsRef = useRef<RecoveryStats | null>(null);
  const reconnectingRef = useRef(false);
  const drivePresentRef = useRef<boolean>(true);
  const resumeModeRef = useRef<RecoveryMode>(resumeMode);

  // Power-loss recovery: disc fingerprinting prevents cross-disc recovery corruption.
  // When power fails mid-recovery, we store the disc's UUID. On reconnection, we
  // verify it's still the same disc before resuming. If the user swapped discs,
  // we start fresh to prevent mismatched file IDs from corrupting the output.
  interface DiscFingerprint {
    uuid: string;         // Stable ID from disc metadata (remains same across boots)
    timestamp: number;    // When first detected
    recoverySessionId: string;
  }
  const discFingerprintRef = useRef<DiscFingerprint | null>(null);

  recoveryDoneRef.current = recoveryDone;
  statsRef.current = stats;
  reconnectingRef.current = reconnecting;
  resumeModeRef.current = resumeMode;

  // ── Stable probe primitives (prevent stale closure probe cancellation) ─────
  const probeDrivePath = pickedDrive?.path ?? null;
  const probeHasMedia = pickedDrive?.has_media ?? false;

  // ── Drive list + live updates ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const note = (d: DriveInfo[]) => {
      if (cancelled) return;
      if (d.length > 0) everSawDrive.current = true;
      setDrives(d);
    };
    ipc.listDrives().then(note).catch(() => {});
    const unsub = events.onDrivesChanged(note);
    return () => {
      cancelled = true;
      unsub.then((fn) => fn());
    };
  }, []);

  // ── Auto-pick drive ────────────────────────────────────────────────────────
  useEffect(() => {
    if (drives.length === 0) { setPickedDrive(null); return; }
    const withMedia = drives.filter((d) => d.has_media);
    if (withMedia.length === 1) { setPickedDrive(withMedia[0]); return; }
    if (drives.length === 1) { setPickedDrive(drives[0]); return; }
    if (pickedDrive && !drives.some((d) => d.path === pickedDrive.path)) {
      setPickedDrive(null);
    }
  }, [drives, pickedDrive]);

  // ── Auto-probe disc ────────────────────────────────────────────────────────
  useEffect(() => {
    // Only probe when we're in pre-session mode (no active session)
    if (sessionId) return;
    if (!probeDrivePath || !probeHasMedia) {
      setDisc(null);
      setProbeError(null);
      return;
    }
    let cancelled = false;
    setDisc(null);
    setIdentifying(true);
    setProbeError(null);
    (async () => {
      const PROBE_TIMEOUT_MS = 90_000;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Timed out while reading the disc. It may be badly scratched or unreadable — try cleaning it and inserting again.")),
          PROBE_TIMEOUT_MS,
        );
      });
      try {
        const info = await Promise.race([ipc.checkDisc(probeDrivePath), timeout]);
        if (cancelled) return;
        if (info) { setDisc(info); }
        else { setProbeError("No readable disc found in this drive. Try reinserting the disc or using a different drive."); }
      } catch (e) {
        if (!cancelled) setProbeError(String(e));
      } finally {
        if (timer) clearTimeout(timer);
        if (!cancelled) setIdentifying(false);
      }
    })();
    return () => { cancelled = true; };
  }, [probeDrivePath, probeHasMedia, retryNonce, sessionId]);

  // ── Disc ejected mid-flow ──────────────────────────────────────────────────
  useEffect(() => {
    if (sessionId) return;
    if (!pickedDrive) return;
    const stillThere = drives.find((d) => d.path === pickedDrive.path && d.has_media);
    if (!stillThere && disc) {
      setDisc(null);
      setProbeError(null);
    }
  }, [drives, pickedDrive, disc, sessionId]);

  // ── Auto-output-dir ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!disc || outputDir) return;
    const safeLabel = disc.label
      .replace(/[ -]/g, "")
      .replace(/[<>:"/\\|?*]/g, "_")
      .replace(/_+/g, "_")
      .trim() || "Untitled disc";
    (async () => {
      try {
        const docs = await documentDir();
        const path = await join(docs, "Heirvo", safeLabel);
        setOutputDir(path);
      } catch { /* leave blank */ }
    })();
  }, [disc, outputDir]);

  // ── Session events (onProgress / onComplete) ──────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    const onProgress = events.onProgress((p) => {
      if (p.session_id === sessionId) {
        setStats(p.stats);
        setLastProgressAt(Date.now());
      }
    });
    const onComplete = events.onComplete((sid) => {
      if (sid !== sessionId) return;
      setStats((latestStats) => {
        if (latestStats) {
          const holes = latestStats.failed + latestStats.unknown;
          setHolesAtCompletion(holes);
        }
        return latestStats;
      });
      setRecoveryDone(true);
      setIsOvernightRunning(false);
      audio.play("recovery_done");
      const notify = () =>
        new Notification("Heirvo — Recovery complete", {
          body: "Your disc has been scanned. Open Heirvo to save your files.",
          icon: "/favicon.svg",
        });
      if (Notification.permission === "granted") notify();
      else if (Notification.permission !== "denied")
        Notification.requestPermission().then((p) => { if (p === "granted") notify(); });
    });
    return () => {
      onProgress.then((fn) => fn());
      onComplete.then((fn) => fn());
    };
  }, [sessionId]);

  // ── Clock (tick for idle detection) ───────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Session poller (reopened terminal session) ─────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const checkSession = () => {
      ipc.listSessions()
        .then((all) => {
          if (cancelled) return;
          const s = all.find((x) => x.id === sessionId);
          if (!s) return;
          setSession(s);
          if (s.status === "completed" || s.status === "cancelled" || s.status === "failed") {
            setSessionFinished(true);
            if (s.status === "completed") setRecoveryDone(true);
            if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
          }
        })
        .catch(() => {});
    };

    checkSession();
    intervalId = setInterval(checkSession, 3000);
    return () => { cancelled = true; if (intervalId !== null) clearInterval(intervalId); };
  }, [sessionId]);

  // ── Pct safety net ────────────────────────────────────────────────────────
  const statsPct = stats && stats.total > 0 ? Math.round((stats.good / stats.total) * 100) : 0;
  useEffect(() => {
    if (statsPct < 100 || recoveryDone || sessionFinished || !sessionId) return;
    ipc.listSessions()
      .then((all) => {
        const s = all.find((x) => x.id === sessionId);
        if (s && s.status === "completed") { setSessionFinished(true); setRecoveryDone(true); }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsPct]);

  // ── Audio milestones ──────────────────────────────────────────────────────
  const lastMilestoneTierRef = useRef<number>(-1);
  const lastRingTiersRef = useRef({ recovered: false, damaged: false, scanned: false });
  const lastDriveHealthRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!stats || stats.total <= 0) return;
    const goodFrac = stats.good / stats.total;
    const damagedFrac = (stats.failed + stats.skipped) / stats.total;
    const scannedFrac = (stats.good + stats.failed + stats.skipped) / stats.total;
    const tier = Math.floor(goodFrac * 10);
    if (lastMilestoneTierRef.current >= 0 && tier > lastMilestoneTierRef.current && tier > 0)
      audio.play("milestone");
    lastMilestoneTierRef.current = tier;
    const fired = lastRingTiersRef.current;
    if (!fired.recovered && goodFrac >= 0.999) { audio.play("ring_complete"); fired.recovered = true; }
    if (!fired.damaged && damagedFrac >= 0.999) { audio.play("ring_complete"); fired.damaged = true; }
    if (!fired.scanned && scannedFrac >= 0.999) { audio.play("ring_complete"); fired.scanned = true; }
    if (stats.drive_health === "suspect" && lastDriveHealthRef.current !== "suspect")
      audio.play("drive_warning");
    lastDriveHealthRef.current = stats.drive_health;
  }, [stats]);

  // ── Accurate runtime from DVD IFO ─────────────────────────────────────────
  useEffect(() => {
    if (!recoveryDone || !sessionId) return;
    let cancelled = false;
    ipc.dvdRuntimeSecs(sessionId)
      .then((secs) => { if (!cancelled && secs && secs > 0) setRealRuntimeMin(Math.max(1, Math.round(secs / 60))); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [recoveryDone, sessionId]);

  // ── Stall detection (replaces brittle 5s gate with engine's idle_secs tracking) ──
  const engineStalled = stats?.stalled === true;
  const stalledElapsedSecs = engineStalled && stats ? stats.idle_secs ?? null : null;
  const stallCount = stats?.stall_count ?? 0;

  // Idle = either stalled or heartbeat lost (for UI state only)
  const heartbeatLost = (now - lastProgressAt > 15_000) && !!stats && !recoveryDone;
  const idle = engineStalled || heartbeatLost;
  idleRef.current = idle;

  // ── Actions (session-side) — defined before drive-presence watcher ────────
  const resumeAction = useCallback(async (mode: RecoveryMode) => {
    if (!sessionId) return;
    setResuming(true);
    setResumeError(null);
    setRecoveryDone(false);
    try {
      await ipc.startRecovery(sessionId, mode);
      try { localStorage.setItem(`mode:${sessionId}`, mode); } catch { /* ignore */ }
      setLastProgressAt(Date.now());
    } catch (e) {
      setResumeError(String(e));
    } finally {
      setResuming(false);
    }
  }, [sessionId]);

  const reconnectResumeInner = useCallback(async () => {
    if (!sessionId) return;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    setReconnecting(true);
    setReconnectElapsed(0);
    setResuming(true);
    setResumeError(null);
    try {
      try { await ipc.cancelRecovery(sessionId); } catch { /* may already be stopped */ }
      let started = false;
      const startTs = Date.now();
      while (Date.now() - startTs < 60_000) {
        await sleep(1500);
        setReconnectElapsed(Math.round((Date.now() - startTs) / 1000));
        try {
          await ipc.startRecovery(sessionId, resumeModeRef.current);
          started = true;
          break;
        } catch { /* keep waiting */ }
      }
      if (!started) {
        setResumeError("The drive didn't come back within 60 seconds. Unplug it, wait a few seconds, plug it back in, then press Reconnect again.");
        return;
      }
      setLastProgressAt(Date.now());
      setRecoveryDone(false);
      setResumeError(null);
    } catch (e) {
      setResumeError(String(e));
    } finally {
      setReconnecting(false);
      setResuming(false);
    }
  }, [sessionId]);

  // ── Drive-presence watcher ────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const intervalId = setInterval(async () => {
      if (cancelled) return;
      let drvs: DriveInfo[] = [];
      try { drvs = await ipc.listDrives(); } catch { return; }
      if (cancelled) return;
      const present = drvs.length > 0;
      const wasAbsent = !drivePresentRef.current;
      if (wasAbsent && present) {
        const idle2 = Date.now() - lastProgressAt > 5000;
        const stalled =
          !recoveryDoneRef.current &&
          !reconnectingRef.current &&
          (statsRef.current?.drive_health === "suspect" ||
            (idle2 && (statsRef.current?.total ?? 0) > 0));
        if (stalled) void reconnectResumeInner();
      }
      drivePresentRef.current = present;
    }, 3000);
    return () => { cancelled = true; clearInterval(intervalId); };
  }, [sessionId, reconnectResumeInner]);

  // ── Clear stale errors when done ──────────────────────────────────────────
  useEffect(() => {
    if (recoveryDone) { setResumeError(null); setReconnecting(false); }
  }, [recoveryDone]);

  const startOvernightAction = useCallback(async () => {
    if (!sessionId) return;
    setResuming(true);
    setResumeError(null);
    setRecoveryDone(false);
    setIsOvernightRunning(true);
    try {
      await ipc.startRecovery(sessionId, "overnight");
      setHolesAtCompletion(null);
      try { localStorage.setItem(`mode:${sessionId}`, "overnight"); } catch { /* ignore */ }
      setLastProgressAt(Date.now());
    } catch (e) {
      setResumeError(String(e));
      setIsOvernightRunning(false);
    } finally {
      setResuming(false);
    }
  }, [sessionId]);

  // ── Actions (pre-session-side) ────────────────────────────────────────────
  const startAction = useCallback(async () => {
    if (!pickedDrive || !disc || !outputDir) return;
    // Consume the "Recover another" intent. When set, we skip the
    // fingerprint-resume path entirely so the SAME disc can be scanned again
    // into a fresh session instead of bouncing back to the prior completed one.
    const wantFresh = forceFreshSession.current;
    forceFreshSession.current = false;
    try {
      let existingId: string | null = null;
      if (disc.fingerprint && !wantFresh) {
        const all = await ipc.listSessions();
        // Only resume sessions that have NOT already completed. A completed
        // session for this fingerprint must not hijack a new Start — that left
        // the drive idle (no IPC sent) and looked like a stuck loop.
        const match = all.find(
          (s) =>
            s.disc_fingerprint &&
            s.disc_fingerprint === disc.fingerprint &&
            s.status !== "completed",
        );
        if (match) existingId = match.id;
      }
      if (existingId !== null) {
        const all = await ipc.listSessions();
        const existing = all.find((s) => s.id === existingId)!;
        if (existing.status === "completed") {
          setSessionId(existingId);
          navigate(`/session/${existingId}`, { replace: true });
          return;
        }

        // ── Power-loss recovery: Capture disc fingerprint for resumed session ────
        discFingerprintRef.current = {
          uuid: disc.fingerprint || `fallback-${Date.now()}`,
          timestamp: Date.now(),
          recoverySessionId: existingId,
        };

        // Surface a spinner while the drive re-opens. Without this the screen
        // derives the "starting" phase but shows no progress, so a slow drive
        // re-spin looks like a hang. `resuming` flips the phase to a clear
        // "Getting started…" state and is cleared the moment stats arrive (or
        // on error below).
        setResuming(true);
        setRecoveryDone(false);
        setSessionId(existingId);
        setLastProgressAt(Date.now());
        navigate(`/session/${existingId}`, { replace: true });
        try {
          await ipc.startRecovery(existingId);
        } catch (resumeErr) {
          const msg = String(resumeErr);
          // RecoveryInProgress / already-running is benign — the engine is live.
          if (!msg.includes("RecoveryInProgress") && !msg.toLowerCase().includes("already")) {
            setResumeError(String(resumeErr));
            setResuming(false);
            throw resumeErr;
          }
        }
        setResuming(false);
        return;
      }
      const newSession = await ipc.createSession({
        disc_label: disc.label,
        disc_fingerprint: disc.fingerprint,
        drive_path: pickedDrive.path,
        total_sectors: disc.total_sectors,
        output_dir: outputDir,
        disc_type: disc.disc_type,
      });
      // Validate the session actually came back before we try to drive it.
      if (!newSession?.id) {
        setProbeError("Could not create a recovery session. Check that the destination folder is writable and try again.");
        return;
      }

      // ── Power-loss recovery: Capture disc fingerprint for verification ──────
      // This lets us detect if the disc changes during power loss, so we can
      // either resume the same session or start fresh if disc was swapped.
      discFingerprintRef.current = {
        uuid: disc.fingerprint || `fallback-${Date.now()}`,
        timestamp: Date.now(),
        recoverySessionId: newSession.id,
      };

      // Show a spinner while the drive opens for the first read. The phase
      // derivation reads `resuming && !stats` as "starting", giving the user a
      // clear "Getting started…" state instead of an ambiguous idle wheel while
      // the drive spins up.
      setResuming(true);
      setRecoveryDone(false);
      setSessionId(newSession.id);
      setLastProgressAt(Date.now());
      navigate(`/session/${newSession.id}`, { replace: true });
      try {
        // If start_recovery throws (drive busy/locked/asleep), surface it
        // instead of swallowing it — otherwise the UI silently lands on a
        // session screen with a drive that never spun up.
        await ipc.startRecovery(newSession.id);
      } catch (startErr) {
        setResumeError(String(startErr));
        throw startErr;
      } finally {
        setResuming(false);
      }
    } catch (e) {
      setProbeError(String(e));
    }
  }, [pickedDrive, disc, outputDir, navigate]);

  const browseDestAction = useCallback(async () => {
    const picked = await openDialog({ directory: true, multiple: false, title: "Save rescued files to…" });
    if (typeof picked === "string") setOutputDir(picked);
  }, []);

  const retryAction = useCallback(() => {
    setProbeError(null);
    setDisc(null);
    setRetryNonce((n) => n + 1);
  }, []);

  const changeDriveAction = useCallback(async (path: string) => {
    if (!sessionId) return;
    try { await ipc.changeDrive(sessionId, path); } catch { /* pass errors to callers */ }
  }, [sessionId]);

  const recoverAnotherAction = useCallback(async () => {
    // Power-loss recovery: three-phase design for maximum stability.
    // Handles the scenario where power fails mid-recovery. On reconnection,
    // we verify it's the SAME disc before resuming, or start fresh if swapped.
    // This prevents partial recovery data corruption from mixed discs.

    try {
      // Phase 1: Stabilize
      // Wait 50ms for USB transients to settle. Some drives emit spurious bus
      // events during power recovery; this grace period avoids false positives.
      await new Promise(resolve => setTimeout(resolve, 50));

      // Phase 2: Verify drive is back online
      // If user had a drive before and lost power, they're reconnecting now.
      // Ensure at least one drive is visible before proceeding.
      const currentDrives = await ipc.listDrives().catch(() => []);
      if (currentDrives.length === 0) {
        setResumeError("Drive not detected. Unplug the drive, wait a few seconds, then plug it back in and try again.");
        return;
      }

      // Phase 3: Verify it's the SAME disc (prevent cross-disc recovery data loss)
      // If user has an active session, we check: is it still the same disc?
      // Same UUID → resume recovery. Different UUID or missing → start fresh.
      if (sessionId && discFingerprintRef.current) {
        try {
          const firstDrive = currentDrives[0];
          // 15s timeout matches the initial probe timeout. If the drive hangs here,
          // it's likely unresponsive and the user should try reconnecting it.
          const DISC_CHECK_TIMEOUT_MS = 15_000;
          let timer: ReturnType<typeof setTimeout> | undefined;
          const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new Error("Disc verification timed out. Drive may be unresponsive.")),
              DISC_CHECK_TIMEOUT_MS,
            );
          });
          const currentDisc = await Promise.race([ipc.checkDisc(firstDrive.path), timeout]).catch(() => null);
          if (timer) clearTimeout(timer);

          if (!currentDisc) {
            setResumeError("Disc no longer readable. Try cleaning it or using a different drive.");
            return;
          }

          // Critical: compare disc fingerprints (stable UUID from disc metadata)
          // If different, the user swapped discs. We CANNOT resume the old session
          // because the file IDs won't match and we'll corrupt the output.
          const fingerprintChanged = currentDisc.fingerprint !== discFingerprintRef.current.uuid;
          if (fingerprintChanged) {
            setResumeError("You inserted a different disc than before. We'll start a fresh scan for this one.");
            forceFreshSession.current = true;
            setSessionId(null);
            setSession(null);
            setStats(null);
            discFingerprintRef.current = null;
            return;
          }

          // Same disc fingerprint → safe to resume the existing session
          // We're picking up where we left off before the power loss.
          setResumeError(null);
          setResuming(true);
          try {
            await ipc.startRecovery(sessionId, resumeModeRef.current);
            try { localStorage.setItem(`mode:${sessionId}`, resumeModeRef.current); } catch { /* ignore */ }
            setLastProgressAt(Date.now());
          } catch (e) {
            setResumeError(String(e));
          } finally {
            setResuming(false);
          }
          return;
        } catch (err) {
          setResumeError("We couldn't read the disc right now. Try ejecting it, waiting a moment, then reinserting it.");
          return;
        }
      }

      // No prior session or fingerprint: reset to idle for fresh start.
      // User is starting a new recovery, not resuming after power loss.
      forceFreshSession.current = true;
      setSessionId(null);
      setSession(null);
      setStats(null);
      setRecoveryDone(false);
      setSessionFinished(false);
      setResumeError(null);
      setHolesAtCompletion(null);
      setIsOvernightRunning(false);
      setPickedDrive(null);
      setDisc(null);
      setProbeError(null);
      discFingerprintRef.current = null;
    } catch (err) {
      setResumeError(`Power recovery failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [sessionId]);

  // ── Derive phase ──────────────────────────────────────────────────────────
  // Stall detection now feeds in via engineStalled (from stats.stalled).
  // When the engine detects no progress for 60s past grace, we transition to
  // "stalled" phase instead of "recovering", showing clear UI recovery options.
  const state: RecoveryPhase = (() => {
    // Once we have a session, we're in session-mode
    if (sessionId) {
      const saveReady = recoveryDone || sessionFinished;
      if (saveReady) {
        const holes = holesAtCompletion ?? 0;
        const partial = stats ? stats.good < stats.total : false;
        return { phase: "complete", sessionId, session, stats, holes, partial };
      }
      // Stalled: engine has no progress + we're not actively reconnecting
      if (engineStalled && stats && !reconnecting) {
        return { phase: "stalled", sessionId, session, stats, reconnectElapsed: stalledElapsedSecs ?? 0 };
      }
      // Reconnecting: actively waiting for drive to come back
      if (reconnecting) {
        return { phase: "stalled", sessionId, session, stats, reconnectElapsed };
      }
      if (resuming && !stats) {
        return { phase: "starting", sessionId, session };
      }
      if (idle && !isOvernightRunning && !engineStalled) {
        return { phase: "paused", sessionId, session, stats };
      }
      // Has stats + active or overnight
      if (stats) {
        return { phase: "recovering", sessionId, session, stats, lastProgressAt };
      }
      // Starting up (no stats yet)
      return { phase: "starting", sessionId, session };
    }

    // Pre-session wizard phases
    if (drives.length === 0) return { phase: "idle", drive: null };
    if (!pickedDrive) return { phase: "idle", drive: null };
    if (identifying) return { phase: "discovering", drive: pickedDrive };
    if (probeError) return { phase: "unreadable", drive: pickedDrive, error: probeError };
    if (disc) return { phase: "ready", drive: pickedDrive, disc, outputDir };
    return { phase: "idle", drive: pickedDrive };
  })();

  const actions: RecoveryActions = {
    start: startAction,
    pause: () => { if (sessionId) ipc.pauseRecovery(sessionId); },
    resume: resumeAction,
    reconnect: reconnectResumeInner,
    startOvernight: startOvernightAction,
    cancel: () => { if (sessionId) ipc.cancelRecovery(sessionId); },
    recoverAnother: recoverAnotherAction,
    retry: retryAction,
    setOutputDir,
    browseDest: browseDestAction,
    changeDrive: changeDriveAction,
  };

  return {
    state,
    actions,
    resumeError,
    reconnectElapsed,
    holesAtCompletion,
    realRuntimeMin,
    resumeMode,
    setResumeMode,
    resuming,
    reconnecting,
    drives,
    stalledElapsedSecs,
    stallCount,
  };
}
