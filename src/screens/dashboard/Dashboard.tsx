import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ipc, events } from "@/lib/ipc";
import type { RecoveryStats, RecoveryMode } from "@/lib/types";
import { OutputPanel } from "./OutputPanel";
import { EnhancementOffer } from "./EnhancementOffer";
import { Pause, Play, Loader2, RefreshCw, X } from "lucide-react";
import type { DriveInfo } from "@/lib/types";
import { sectorsToMinutes, sectorsToBytes, bytesToHuman } from "@/lib/human";
import { friendlyError } from "@/lib/friendly-errors";
import { audio } from "@/lib/audio";
import { pulseIn, sparkleBurst } from "@/utils/gsap-fx";
import { Disc3 } from "lucide-react";

/* ─── tiny helpers ─────────────────────────────────────────────── */
function minsRecovered(stats: RecoveryStats | null) {
  return stats ? sectorsToMinutes(stats.good) : 0;
}
function minsRemaining(stats: RecoveryStats | null): number | null {
  if (!stats?.eta_secs) return null;
  return Math.round(stats.eta_secs / 60);
}
function minsDamaged(stats: RecoveryStats | null) {
  return stats ? sectorsToMinutes(stats.failed + stats.skipped) : 0;
}
function pctRecovered(stats: RecoveryStats | null): number {
  return stats && stats.total > 0 ? Math.round((stats.good / stats.total) * 100) : 0;
}
function gbRecovered(stats: RecoveryStats | null): string {
  return stats ? bytesToHuman(sectorsToBytes(stats.good)) : "";
}

/* ─── CSS-var-aware inline style helpers ───────────────────────── */
const S = {
  base:         { background: "var(--db-base)" } as React.CSSProperties,
  surface:      { background: "var(--db-surface)", border: "1px solid var(--db-border)", boxShadow: "var(--db-shadow)" } as React.CSSProperties,
  surface2:     { background: "var(--db-surface-2)", border: "1px solid var(--db-border)" } as React.CSSProperties,
  text:         { color: "var(--db-text)" } as React.CSSProperties,
  textMuted:    { color: "var(--db-text-muted)" } as React.CSSProperties,
  textFaint:    { color: "var(--db-text-faint)" } as React.CSSProperties,
  amber:        { color: "var(--db-amber)" } as React.CSSProperties,
  amberBg:      { background: "var(--db-amber-light)", border: "1px solid var(--db-amber-glow)" } as React.CSSProperties,
  green:        { color: "var(--db-green)" } as React.CSSProperties,
  greenBg:      { background: "var(--db-green-light)", border: "1px solid rgba(26,135,80,0.20)" } as React.CSSProperties,
  serif:        { fontFamily: "var(--db-serif)" } as React.CSSProperties,
  sans:         { fontFamily: "var(--db-sans)" } as React.CSSProperties,
};

/* ──────────────────────────────────────────────────────────────── */

export function Dashboard() {
  const { id } = useParams<{ id: string }>();
  const [stats, setStats] = useState<RecoveryStats | null>(null);
  const [lastProgressAt, setLastProgressAt] = useState<number>(Date.now());
  const [now, setNow] = useState(Date.now());
  const [resuming, setResuming] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [recoveryDone, setRecoveryDone] = useState(false);
  // Mirrors OutputPanel: a reopened terminal session (completed/cancelled/failed)
  // fires no live `complete` event this mount, but saving must still be unlocked.
  // Kept separate from recoveryDone so the headline never mislabels a cancelled or
  // partial disc as "fully recovered".
  const [sessionFinished, setSessionFinished] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [driveSwitchMsg, setDriveSwitchMsg] = useState<string | null>(null);
  const [savedVideoPath, setSavedVideoPath] = useState<string | null>(null);
  const [resumeMode, setResumeMode] = useState<RecoveryMode>(() => {
    try {
      const saved = id ? localStorage.getItem(`mode:${id}`) : null;
      return saved === "overnight" ? "overnight" : "quick";
    } catch { return "quick"; }
  });
  const [holesAtCompletion, setHolesAtCompletion] = useState<number | null>(null);
  const [isOvernightRunning, setIsOvernightRunning] = useState(false);
  const [realRuntimeMin, setRealRuntimeMin] = useState<number | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectElapsed, setReconnectElapsed] = useState(0);

  const scopeRef = useRef<HTMLDivElement>(null);
  const doneBannerRef = useRef<HTMLDivElement>(null);

  // Refs used by the drive-presence watcher to read latest state without
  // recreating the interval on every render (avoids tight loops).
  const recoveryDoneRef = useRef(false);
  const idleRef = useRef(false);
  const statsRef = useRef<RecoveryStats | null>(null);
  const reconnectingRef = useRef(false);
  const drivePresentRef = useRef<boolean>(true);

  // Keep refs in sync each render so the drive-watcher interval closure
  // always reads the latest values (no stale-closure risk).
  recoveryDoneRef.current = recoveryDone;
  statsRef.current = stats;
  reconnectingRef.current = reconnecting;

  /* ── events ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!id) return;
    const onProgress = events.onProgress((p) => {
      if (p.session_id === id) {
        setStats(p.stats);
        setLastProgressAt(Date.now());
      }
    });
    const onComplete = events.onComplete((sid) => {
      if (sid !== id) return;
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
  }, [id]);

  /* ── clock ──────────────────────────────────────────────────── */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── reopened terminal session → unlock saving without a live event ── */
  // Runs immediately on mount, then every 3 s until the session is done.
  // This catches the race where recovery:complete fires before the async
  // listen() Promise resolves, or when the app is re-opened after the
  // session already finished.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const checkSession = () => {
      ipc.listSessions()
        .then((all) => {
          if (cancelled) return;
          const s = all.find((x) => x.id === id);
          if (s && (s.status === "completed" || s.status === "cancelled" || s.status === "failed")) {
            setSessionFinished(true);
            // completed specifically → also drive headline/pills/buttons
            if (s.status === "completed") {
              setRecoveryDone(true);
            }
            // No need to keep polling once terminal status is confirmed.
            if (intervalId !== null) {
              clearInterval(intervalId);
              intervalId = null;
            }
          }
        })
        .catch(() => {});
    };

    // Immediate check on mount
    checkSession();

    // Then poll every 3 s as a safety net for missed events
    intervalId = setInterval(checkSession, 3000);

    return () => {
      cancelled = true;
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [id]);

  /* ── audio milestones ───────────────────────────────────────── */
  /* ── pct-based safety net: if progress shows 100% but complete event was missed ── */
  // Derive pct locally from stats here (same formula as the derived section below)
  // so we don't reference the not-yet-declared `pct` const.
  const statsPctForSafetyNet = stats && stats.total > 0
    ? Math.round((stats.good / stats.total) * 100)
    : 0;
  useEffect(() => {
    if (statsPctForSafetyNet < 100 || recoveryDone || sessionFinished || !id) return;
    // Re-query once — if the engine has already marked it completed, unlock saves.
    ipc.listSessions()
      .then((all) => {
        const s = all.find((x) => x.id === id);
        if (s && s.status === "completed") {
          setSessionFinished(true);
          setRecoveryDone(true);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsPctForSafetyNet]); // only re-run when pct changes; recoveryDone/sessionFinished are stable guards

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

  /* ── done banner sparkle ────────────────────────────────────── */
  useEffect(() => {
    if (!recoveryDone || !stats) return;
    pulseIn(doneBannerRef.current);
    if (minsDamaged(stats) === 0) {
      const t = window.setTimeout(() => sparkleBurst(doneBannerRef.current, 16), 220);
      return () => window.clearTimeout(t);
    }
  }, [recoveryDone, stats]);

  /* ── accurate runtime from the DVD IFO ─────────────────────── */
  useEffect(() => {
    if (!recoveryDone || !id) return;
    let cancelled = false;
    ipc
      .dvdRuntimeSecs(id)
      .then((secs) => {
        if (!cancelled && secs && secs > 0) {
          setRealRuntimeMin(Math.max(1, Math.round(secs / 60)));
        }
      })
      .catch(() => { /* non-DVD or unreadable IFO */ });
    return () => { cancelled = true; };
  }, [recoveryDone, id]);

  /* ── drive-presence watcher (auto-resume on absent→present) ── */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const intervalId = setInterval(async () => {
      if (cancelled) return;
      let drives: DriveInfo[] = [];
      try { drives = await ipc.listDrives(); } catch { return; }
      if (cancelled) return;
      const present = drives.length > 0;
      const wasAbsent = !drivePresentRef.current;
      // Detect absent → present transition
      if (wasAbsent && present) {
        // Auto-resume only when stalled (not done, not already reconnecting)
        const stalled =
          !recoveryDoneRef.current &&
          !reconnectingRef.current &&
          (statsRef.current?.drive_health === "suspect" ||
            (idleRef.current && (statsRef.current?.total ?? 0) > 0));
        if (stalled) {
          // fire-and-forget; reconnectResume manages its own state
          void reconnectResume();
        }
      }
      drivePresentRef.current = present;
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // stable: reconnectResume is defined above; refs hold live values

  /* ── clear stale errors/reconnecting state when recovery completes ── */
  useEffect(() => {
    if (recoveryDone) {
      setResumeError(null);
      setReconnecting(false);
    }
  }, [recoveryDone]);

  /* ── derived values ─────────────────────────────────────────── */
  const idle = now - lastProgressAt > 5000;
  idleRef.current = idle; // keep ref in sync for the drive-watcher closure
  const isActive = !idle && !recoveryDone;
  const total = stats?.total ?? 0;
  const pct = total > 0 ? Math.round((stats!.good / total) * 100) : 0;
  // Wheel geometry: r=68, viewBox 0 0 148 148 (same as mockup)
  const WHEEL_R = 68;
  const WHEEL_CIRC = 2 * Math.PI * WHEEL_R;
  const wheelOffset = WHEEL_CIRC * (1 - pct / 100);

  const resume = async () => {
    if (!id) return;
    setResuming(true);
    setResumeError(null);
    setRecoveryDone(false);
    try {
      await ipc.startRecovery(id, resumeMode);
      try { localStorage.setItem(`mode:${id}`, resumeMode); } catch { /* ignore */ }
      setLastProgressAt(Date.now());
    } catch (e) {
      setResumeError(String(e));
    } finally {
      setResuming(false);
    }
  };

  const reconnectResume = async () => {
    if (!id) return;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    setReconnecting(true);
    setReconnectElapsed(0);
    setResuming(true);
    setResumeError(null);
    try {
      try { await ipc.cancelRecovery(id); } catch { /* may already be stopped */ }
      // Wait up to 60 seconds for the drive to re-enumerate after a USB drop.
      let started = false;
      const startTs = Date.now();
      while (Date.now() - startTs < 60_000) {
        await sleep(1500);
        setReconnectElapsed(Math.round((Date.now() - startTs) / 1000));
        try {
          await ipc.startRecovery(id, resumeMode);
          started = true;
          break;
        } catch {
          // Drive not back yet — keep waiting
        }
      }
      if (!started) {
        setResumeError(
          "The drive didn't come back within 60 seconds. Unplug it, wait a few seconds, plug it back in, then press Reconnect again."
        );
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
  };

  const startOvernight = async () => {
    if (!id) return;
    setResuming(true);
    setResumeError(null);
    setRecoveryDone(false);
    setIsOvernightRunning(true);
    try {
      await ipc.startRecovery(id, "overnight");
      setHolesAtCompletion(null);
      try { localStorage.setItem(`mode:${id}`, "overnight"); } catch { /* ignore */ }
      setLastProgressAt(Date.now());
    } catch (e) {
      setResumeError(String(e));
      setIsOvernightRunning(false);
    } finally {
      setResuming(false);
    }
  };

  if (!id) return null;

  /* ── headline / subline ─────────────────────────────────────── */
  const savedGb = gbRecovered(stats);
  const videoNote = realRuntimeMin != null ? ` · about ${realRuntimeMin} min of video` : "";
  const remaining = minsRemaining(stats);
  const etaIsLong = remaining != null && remaining > 90;
  const remainingChip =
    remaining == null
      ? "Calculating…"
      : etaIsLong
      ? "Working through damage"
      : `~${remaining} min left`;

  const neverStarted = idle && !stats;
  const warmingUp    = idle && !!stats && pct === 0;
  const midRest      = idle && !!stats && pct > 0;

  const headline = recoveryDone
    ? (savedGb ? `Disc fully recovered — ${savedGb} read` : "Disc fully recovered")
    : neverStarted
    ? "Ready when you are."
    : warmingUp
    ? "Getting started…"
    : midRest
    ? "Taking a short break."
    : isOvernightRunning
    ? "Working through the last few spots."
    : "We're saving your video.";

  const subline = recoveryDone
    ? (savedGb
        ? `Every readable byte is safe${videoNote}. Now choose how you'd like to keep it.`
        : "Every readable byte is safe. Now choose how you'd like to keep it.")
    : neverStarted
    ? "Insert your disc and click Start — we'll begin reading right away."
    : warmingUp
    ? "Drive detected. Click Resume to begin reading your disc."
    : isOvernightRunning && stats
    ? `Recovering the last few spots — leave it running, stop anytime.`
    : stats && savedGb
    ? `Recovered ${savedGb} so far.`
    : "Getting ready — listening for your disc…";

  const damaged = minsDamaged(stats);
  const noDamage = damaged === 0;

  /* ── saveReady (mirrors OutputPanel's own check) ────────────── */
  // Dashboard still needs this for the lock strip below OutputPanel.
  const saveReady = recoveryDone || sessionFinished;

  /* ── Wheel rail JSX — passed to OutputPanel as `header` ────────
     Now the RIGHT column of the top-frame grid (equal width, full height).
     NEVER dimmed — it holds Pause/Cancel during extraction. */
  const wheelRail = (
    <div
      ref={doneBannerRef}
      style={{
        ...S.surface,
        borderRadius: 18,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        position: "relative",
        overflow: "hidden",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: -90, left: "50%", transform: "translateX(-50%)",
        width: 320, height: 320, pointerEvents: "none",
        background: "radial-gradient(circle, var(--db-amber-glow) 0%, transparent 66%)",
      }} />

      {/* ── Progress wheel (124px — proportional to the wider box) ── */}
      <div style={{
        position: "relative",
        width: 124, height: 124,
        animation: isActive ? "db-breathe 3.6s ease-in-out infinite" : "none",
        flexShrink: 0,
      }}>
        <svg
          width="124" height="124"
          viewBox="0 0 148 148"
          style={{ transform: "rotate(-90deg)", filter: "drop-shadow(0 0 11px var(--db-amber-glow))" }}
          aria-hidden
        >
          <circle cx="74" cy="74" r={WHEEL_R} fill="none" stroke="var(--db-amber-light)" strokeWidth="7" />
          <circle
            cx="74" cy="74" r={WHEEL_R}
            fill="none"
            stroke={isActive || recoveryDone ? "var(--db-amber)" : "var(--db-text-faint)"}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={WHEEL_CIRC}
            strokeDashoffset={wheelOffset}
            style={{ transition: "stroke-dashoffset 1.2s ease, stroke 0.4s ease" }}
          />
        </svg>
        {/* Overlaid percentage */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            ...S.serif, ...S.amber,
            fontSize: 28, fontWeight: 400,
            lineHeight: 1, letterSpacing: "-0.03em",
            color: isActive || recoveryDone ? "var(--db-amber)" : "var(--db-text-faint)",
          }}>{pct}%</span>
          <span style={{
            fontSize: 9, fontWeight: 600, letterSpacing: "0.16em",
            textTransform: "uppercase", marginTop: 4, ...S.textFaint,
          }}>read</span>
        </div>
      </div>

      {/* ── Headline + subline ── */}
      <div style={{ textAlign: "center" }}>
        <h1 style={{
          ...S.serif, ...S.text,
          fontSize: 18, fontWeight: 400, lineHeight: 1.25,
          letterSpacing: "-0.01em", margin: 0,
        }}>
          {headline}
        </h1>
        <p style={{ fontSize: 12.5, fontWeight: 400, ...S.textMuted, marginTop: 5, lineHeight: 1.5 }}>
          {subline}
        </p>
      </div>

      {/* ── Status badges (complete state) ── */}
      {recoveryDone && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 10px", borderRadius: 100, ...S.sans,
            fontSize: 11, fontWeight: 600, letterSpacing: "0.02em", textTransform: "uppercase",
            background: noDamage ? "var(--db-green-light)" : "var(--db-amber-light)",
            border: noDamage ? "1px solid rgba(26,135,80,0.22)" : "1px solid var(--db-amber-glow)",
            color: noDamage ? "var(--db-green)" : "var(--db-amber)",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
            {noDamage ? "Disc healthy" : `${damaged} min damaged`}
          </span>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 10px", borderRadius: 100, ...S.sans,
            fontSize: 11, fontWeight: 600, letterSpacing: "0.02em", textTransform: "uppercase",
            background: "var(--db-green-light)",
            border: "1px solid rgba(26,135,80,0.22)",
            color: "var(--db-green)",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
            Recovery complete
          </span>
        </div>
      )}

      {/* ── Status pill chips (recovering state) — compact single-line badges matching mockup ── */}
      {!recoveryDone && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          {/* Health pill */}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 10px", borderRadius: 100, ...S.sans,
            fontSize: 11, fontWeight: 600, letterSpacing: "0.02em", textTransform: "uppercase",
            background: noDamage ? "var(--db-green-light)" : "rgba(197,48,48,0.08)",
            border: noDamage ? "1px solid rgba(26,135,80,0.22)" : "1px solid rgba(197,48,48,0.22)",
            color: noDamage ? "var(--db-green)" : "var(--db-red)",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
            {noDamage ? "Disc healthy" : `${damaged} min damaged`}
          </span>
          {/* Time / state pill */}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 10px", borderRadius: 100, ...S.sans,
            fontSize: 11, fontWeight: 600, letterSpacing: "0.02em", textTransform: "uppercase",
            background: "var(--db-amber-light)",
            border: "1px solid var(--db-amber-glow)",
            color: "var(--db-amber)",
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%", background: "currentColor", flexShrink: 0,
              ...(isActive ? { animation: "db-pulse 1.4s ease-in-out infinite" } : {}),
            }} />
            {remainingChip}
          </span>
        </div>
      )}

      {/* ── Drive health warning — hidden once recovery is complete ── */}
      {!recoveryDone && stats?.drive_health === "suspect" && <DriveHealthBanner stats={stats} compact />}

      {/* ── Action buttons ── */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
        {/* Reconnect & resume — shown when drive is stalling (suspect) or idle mid-recovery */}
        {!recoveryDone && (stats?.drive_health === "suspect" || (idle && !recoveryDone && pct > 0)) && (
          <ActionBtn primary onClick={reconnectResume} disabled={reconnecting || resuming} fullWidth>
            {reconnecting
              ? <><Loader2 size={13} className="animate-spin" /> Reconnecting… ({reconnectElapsed}s)</>
              : <><RefreshCw size={13} /> Reconnect &amp; resume</>
            }
          </ActionBtn>
        )}
        {!recoveryDone && idle && (
          <>
            <select
              value={resumeMode}
              onChange={(e) => setResumeMode(e.target.value as RecoveryMode)}
              disabled={resuming}
              style={{
                borderRadius: 9, border: "1px solid var(--db-border)",
                background: "var(--db-surface-2)", color: "var(--db-text)",
                padding: "8px 10px", fontSize: 12, fontWeight: 500,
                cursor: resuming ? "default" : "pointer",
                fontFamily: "var(--db-sans)",
                width: "100%",
              }}
            >
              <option value="quick">Quick mode</option>
              <option value="overnight">Overnight (deeper)</option>
            </select>
            <ActionBtn primary onClick={resume} disabled={resuming || reconnecting} fullWidth>
              {resuming ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              {pct === 0 ? "Start" : "Resume"}
            </ActionBtn>
          </>
        )}
        {!recoveryDone && !idle && (
          <ActionBtn onClick={() => ipc.pauseRecovery(id)} fullWidth>
            <Pause size={13} /> Pause
          </ActionBtn>
        )}
        {!recoveryDone && (
          <ActionBtn danger onClick={() => ipc.cancelRecovery(id)} fullWidth>
            <X size={12} /> Cancel
          </ActionBtn>
        )}
      </div>

      {/* Resume error — hidden once recovery is complete */}
      {!recoveryDone && resumeError && (() => {
        const fe = friendlyError(resumeError);
        return (
          <div style={{
            borderRadius: 10, padding: "10px 14px", width: "100%",
            background: "rgba(197,48,48,0.06)", border: "1px solid rgba(197,48,48,0.25)",
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, ...S.text }}>{fe.headline}</div>
            {fe.hint && <div style={{ fontSize: 11, ...S.textMuted, marginTop: 3 }}>{fe.hint}</div>}
          </div>
        );
      })()}

      {/* Liveness indicator (top-right) */}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "absolute", top: 14, right: 14,
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 11, fontWeight: 600, letterSpacing: "0.02em",
          ...S.sans,
          color: isActive ? "var(--db-green)" : idle && !recoveryDone ? "var(--db-text-faint)" : "var(--db-green)",
        }}
      >
        <span style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
          <span style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: isActive ? "var(--db-green)" : "var(--db-text-faint)",
          }} />
          {isActive && <>
            <span style={{
              position: "absolute", inset: -3, borderRadius: "50%",
              border: "1.5px solid var(--db-green)", opacity: 0,
              animation: "db-ripple 2s ease-out infinite",
            }} />
          </>}
        </span>
        {isActive ? "Working" : recoveryDone ? "Complete" : "Paused"}
      </div>
    </div>
  );

  return (
    <div
      ref={scopeRef}
      style={{
        flex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        scrollbarWidth: "thin",
        ...S.base,
      }}
    >
      {/* ── Scrollable content wrap ─────────────────────────────── */}
      <div style={{
        width: "100%",
        maxWidth: 1060,
        margin: "0 auto",
        padding: "20px 32px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}>

        {/* ══ OutputPanel — full-width; the top-frame grid lives INSIDE it.
            The wheel rail is passed as `header` and rendered as the left
            column. The right column (action stack) and the full-width bottom
            block (alt-grid + results + advanced) dim internally when !saveReady.
            The wheel rail is never dimmed — it holds Pause/Cancel. */}
        <OutputPanel
          sessionId={id}
          onMp4Saved={setSavedVideoPath}
          recoveryPct={pct}
          recoveryDone={recoveryDone}
          header={wheelRail}
        />

        {/* ══ DONE BANNER (partial recoveries only) ════════════════ */}
        {recoveryDone && pct < 100 && <DoneBanner stats={stats} realMinutes={realRuntimeMin} />}

        {/* ══ OVERNIGHT OFFER ══════════════════════════════════════ */}
        {recoveryDone && holesAtCompletion !== null && holesAtCompletion > 0 && (
          <OvernightOfferCard
            stats={stats}
            holesAtCompletion={holesAtCompletion}
            onStart={startOvernight}
            starting={resuming}
            error={resumeError}
          />
        )}

        {/* ══ ENHANCEMENT OFFER ════════════════════════════════════ */}
        {recoveryDone && (
          <EnhancementOffer
            savedVideoPath={savedVideoPath}
            onAccepted={(p) => setSavedVideoPath(p)}
          />
        )}

        {/* ══ DRIVE SWITCH ═════════════════════════════════════════ */}
        {(idle || recoveryDone) && (
          <div>
            <button
              onClick={async () => {
                setDriveSwitchMsg(null);
                if (!showDrivePicker) {
                  try { setDrives(await ipc.listDrives()); }
                  catch (e) { setDriveSwitchMsg(String(e)); }
                }
                setShowDrivePicker(!showDrivePicker);
              }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 500, ...S.textMuted, display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <RefreshCw size={12} />
              {showDrivePicker ? "Hide" : "Try a different drive"}
            </button>
            {showDrivePicker && (
              <div style={{ ...S.surface, borderRadius: 14, padding: "16px", marginTop: 10 }}>
                <p style={{ fontSize: 12, ...S.textMuted, marginBottom: 12 }}>
                  Different drives have different read tolerances — a second drive often rescues what the first couldn't.
                </p>
                {drives.length === 0
                  ? <p style={{ fontSize: 12, ...S.textMuted }}>No other drives detected.</p>
                  : drives.map((d) => {
                    const label = [d.vendor, d.model].map(s => s.trim()).filter(s => s && s.toLowerCase() !== "unknown").join(" ");
                    return (
                      <button key={d.path}
                        onClick={async () => {
                          try {
                            await ipc.changeDrive(id, d.path);
                            setDriveSwitchMsg(`Switched to ${label || d.letter}. Click Resume to retry.`);
                            setShowDrivePicker(false);
                          } catch (e) { setDriveSwitchMsg(String(e)); }
                        }}
                        style={{
                          width: "100%", textAlign: "left", background: "none",
                          border: "none", cursor: "pointer", padding: "8px 10px",
                          borderRadius: 8, fontSize: 13, ...S.text,
                          display: "flex", justifyContent: "space-between",
                        }}
                      >
                        <span>{label || `Drive ${d.letter}`}</span>
                        <span style={{ ...S.textFaint, fontSize: 12 }}>{d.has_media ? "disc inserted" : "empty"}</span>
                      </button>
                    );
                  })
                }
              </div>
            )}
            {driveSwitchMsg && (
              <p style={{ fontSize: 12, color: "var(--db-green)", marginTop: 8 }}>{driveSwitchMsg}</p>
            )}
          </div>
        )}

        {/* ══ LOCK HINT STRIP (extracting only, always at the bottom) ════
            Positioned AFTER all content so the top layout never shifts. */}
        {!saveReady && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            background: "var(--db-amber-light)", border: "1px solid var(--db-amber-glow)",
            borderRadius: 14, padding: "12px 18px", fontSize: 12.5, color: "var(--db-amber)",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>
              Your save options unlock the moment the disc finishes — or press <strong>Cancel</strong> to stop and keep what's recovered so far.
            </span>
          </div>
        )}

      </div>{/* end content wrap */}

      {/* Keyframe animations */}
      <style>{`
        @keyframes db-breathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.02); }
        }
        @keyframes db-ripple {
          0%   { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes db-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.82); }
        }
      `}</style>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────── */

function ActionBtn({
  children, onClick, disabled, primary, danger, fullWidth,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
  fullWidth?: boolean;
}) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "9px 16px", borderRadius: 9, minHeight: 38,
    width: fullWidth ? "100%" : undefined,
    fontFamily: "var(--db-sans)", fontSize: 13, fontWeight: 600,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
    border: "1.5px solid transparent",
    transition: "transform 120ms ease, background 150ms ease",
  };
  const style: React.CSSProperties = primary
    ? { ...base, background: "var(--db-amber)", color: "#FFF", boxShadow: "0 3px 12px var(--db-amber-glow)" }
    : danger
    ? { ...base, background: "none", color: "var(--db-red)", borderColor: "rgba(197,48,48,0.30)" }
    : { ...base, background: "var(--db-surface-2)", color: "var(--db-text)", borderColor: "var(--db-border)" };
  return (
    <button style={style} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function DriveHealthBanner({
  stats, compact = false,
}: { stats: RecoveryStats; compact?: boolean }) {
  const { reads_ok, reads_err, idle_secs } = stats;
  const attempts = reads_ok + reads_err;
  const idleMin = idle_secs ? Math.floor(idle_secs / 60) : 0;
  const detail = reads_ok === 0
    ? `Tried ${attempts.toLocaleString()} reads — none worked. Try a different drive or USB port.`
    : idleMin >= 2
    ? `No successful reads in ${idleMin} min. The drive may have stopped responding — check the cable.`
    : "Almost no reads are succeeding. A different disc drive often helps.";
  return (
    <div style={{
      borderRadius: 10, padding: compact ? "8px 12px" : "14px 18px", width: "100%",
      background: "rgba(197,48,48,0.06)", border: "1px solid rgba(197,48,48,0.25)",
    }} role="alert">
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--db-red)", marginBottom: 2 }}>
        The drive may not be reading this disc
      </div>
      <div style={{ fontSize: 11, color: "var(--db-text-muted)", lineHeight: 1.5 }}>{detail}</div>
    </div>
  );
}

const DoneBanner = React.forwardRef<HTMLDivElement, { stats: RecoveryStats | null; realMinutes?: number | null } & React.HTMLAttributes<HTMLDivElement>>(
({ stats, realMinutes, ...props }, ref) => {
  const pct = pctRecovered(stats);
  const gb = gbRecovered(stats);
  const videoNote = realMinutes != null ? ` · about ${realMinutes} min of video` : "";

  let bg = "var(--db-surface-2)";
  let border = "var(--db-border)";
  let headline = "Recovery complete.";
  let detail = "Use the Save buttons to keep an exact copy, the original files, or convert to a video.";

  if (stats) {
    if (pct >= 100) {
      bg = "linear-gradient(135deg, rgba(26,135,80,0.10), rgba(26,135,80,0.05))";
      border = "rgba(26,135,80,0.30)";
      headline = `We saved everything — ${gb}${videoNote}.`;
      detail = "Use the Save buttons below to keep an exact copy of the disc, the original files, or convert to a video (MP4).";
    } else if (pct >= 75) {
      bg = "linear-gradient(135deg, rgba(194,116,31,0.10), rgba(194,116,31,0.05))";
      border = "rgba(194,116,31,0.30)";
      headline = `We saved ${pct}% of the disc — ${gb}.`;
      detail = `The other ${100 - pct}% had damage we couldn't read. A second drive sometimes helps.`;
    } else {
      headline = pct > 0 ? `This disc is heavily damaged — we saved ${pct}% (${gb}).` : "We weren't able to read this disc.";
      detail = pct > 0
        ? "Even professional services often can't do much better. You can try a different drive."
        : "Try cleaning the disc, or use a different disc drive.";
    }
  }

  return (
    <div ref={ref} style={{
      borderRadius: 16, padding: "18px 24px",
      background: bg, border: `1px solid ${border}`,
    }} {...props}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <Disc3 size={18} style={{ flexShrink: 0, marginTop: 2, color: "var(--db-amber)" }} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--db-text)", fontFamily: "var(--db-serif)" }}>{headline}</div>
          <div style={{ fontSize: 13, color: "var(--db-text-muted)", marginTop: 4, lineHeight: 1.5 }}>{detail}</div>
        </div>
      </div>
    </div>
  );
});
DoneBanner.displayName = "DoneBanner";

function OvernightOfferCard({
  stats,
  holesAtCompletion,
  onStart,
  starting,
  error,
}: {
  stats: RecoveryStats | null;
  holesAtCompletion: number;
  onStart: () => void;
  starting: boolean;
  error: string | null;
}) {
  const recoveredMin = minsRecovered(stats);
  const holeMin = Math.max(1, sectorsToMinutes(holesAtCompletion));

  return (
    <div
      style={{
        borderRadius: 20,
        padding: "28px 32px",
        background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(99,102,241,0.06) 100%)",
        border: "1px solid rgba(99,102,241,0.22)",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div>
        <div style={{
          fontSize: 20, fontWeight: 600, letterSpacing: "-0.018em",
          lineHeight: 1.25, fontFamily: "var(--db-serif)", color: "var(--db-text)",
        }}>
          We rescued most of it.
        </div>
        <p style={{ fontSize: 15, fontWeight: 500, color: "var(--db-text-muted)", marginTop: 8, lineHeight: 1.55 }}>
          {recoveredMin} minute{recoveredMin !== 1 ? "s" : ""} are safe.{" "}
          {holesAtCompletion.toLocaleString()} spot{holesAtCompletion === 1 ? "" : "s"}{" "}
          ({holeMin} min) {holesAtCompletion === 1 ? "is" : "are"} damaged and need more time.
          Overnight mode tries much harder — slower re-reads, cool-downs,
          reading from both directions. Best left running while you sleep; you can stop
          anytime and keep everything we've already rescued.
        </p>
      </div>

      <p style={{
        fontSize: 12, color: "var(--db-text-faint)", lineHeight: 1.55,
        borderTop: "1px solid rgba(99,102,241,0.14)", paddingTop: 12,
      }}>
        Some damage is physical and can't be recovered by any software. Overnight mode
        simply tries harder on the sectors that Quick pass gave up on — it won't always win.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <ActionBtn primary onClick={onStart} disabled={starting}>
          {starting
            ? <Loader2 size={15} className="animate-spin" />
            : <RefreshCw size={15} />}
          {starting ? "Starting…" : "Try Overnight ▸"}
        </ActionBtn>
        <span style={{ fontSize: 12, color: "var(--db-text-faint)" }}>
          You can pause or stop at any time — nothing already recovered will be lost.
        </span>
      </div>

      {error && (() => {
        const fe = friendlyError(error);
        return (
          <div style={{
            borderRadius: 10, padding: "10px 14px",
            background: "rgba(197,48,48,0.06)", border: "1px solid rgba(197,48,48,0.25)",
            fontSize: 13, fontWeight: 600, color: "var(--db-text)",
          }}>
            {fe.headline}
            {fe.hint && <div style={{ fontSize: 12, color: "var(--db-text-muted)", marginTop: 4, fontWeight: 400 }}>{fe.hint}</div>}
          </div>
        );
      })()}
    </div>
  );
}
