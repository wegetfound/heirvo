import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ipc, events } from "@/lib/ipc";
import type { RecoveryStats, RecoveryMode } from "@/lib/types";
import { OutputPanel } from "./OutputPanel";
import { EnhancementOffer } from "./EnhancementOffer";
import { Pause, Play, Loader2, RefreshCw, X } from "lucide-react";
import type { DriveInfo } from "@/lib/types";
import { sectorsToMinutes } from "@/lib/human";
import { friendlyError } from "@/lib/friendly-errors";
import { audio } from "@/lib/audio";
import { pulseIn, sparkleBurst } from "@/utils/gsap-fx";
import { Disc3 } from "lucide-react";

/* ─── tiny helpers ─────────────────────────────────────────────── */
function minsRecovered(stats: RecoveryStats | null) {
  return stats ? sectorsToMinutes(stats.good) : 0;
}
function minsTotal(stats: RecoveryStats | null) {
  return stats ? sectorsToMinutes(stats.total) : 0;
}
function minsRemaining(stats: RecoveryStats | null): number | null {
  if (!stats?.eta_secs) return null;
  return Math.round(stats.eta_secs / 60);
}
function minsDamaged(stats: RecoveryStats | null) {
  return stats ? sectorsToMinutes(stats.failed + stats.skipped) : 0;
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
  // Tracks the active recovery mode so the progress UI knows which phase we're in.
  // Stores holes count captured at Quick-pass completion for the overnight offer.
  const [holesAtCompletion, setHolesAtCompletion] = useState<number | null>(null);
  // True while overnight is running (so progress copy changes).
  const [isOvernightRunning, setIsOvernightRunning] = useState(false);

  const scopeRef = useRef<HTMLDivElement>(null);
  const doneBannerRef = useRef<HTMLDivElement>(null);

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
      // Capture the holes count from the last known stats so the overnight
      // offer card can show the right numbers. We read `stats` via a ref
      // because this closure can't capture the latest useState value reliably.
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

  /* ── audio milestones ───────────────────────────────────────── */
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

  /* ── derived values ─────────────────────────────────────────── */
  const idle = now - lastProgressAt > 5000;
  const isActive = !idle && !recoveryDone;
  const total = stats?.total ?? 0;
  const pct = total > 0 ? Math.round((stats!.good / total) * 100) : 0;
  const CIRC = 2 * Math.PI * 85; // r=85
  const dashOffset = CIRC * (1 - pct / 100);

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
  const recovered = minsRecovered(stats);
  const remaining = minsRemaining(stats);

  // Distinguish between "never started" (no stats yet), "resting mid-read" (stats + pct>0),
  // and "just inserted, warming up" (stats but pct still 0).
  const neverStarted = idle && !stats;
  const warmingUp    = idle && !!stats && pct === 0;
  const midRest      = idle && !!stats && pct > 0;

  const headline = recoveryDone
    ? "All done!"
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
    ? `We saved ${recovered} minute${recovered !== 1 ? "s" : ""} of video.`
    : neverStarted
    ? "Insert your disc and click Start — we'll begin reading right away."
    : warmingUp
    ? "Drive detected. Click Resume to begin reading your disc."
    : isOvernightRunning && stats
    ? `Recovering the last few spots — leave it running, stop anytime. ${stats.failed + stats.unknown > 0 ? `${(stats.failed + stats.unknown).toLocaleString()} spots still to go.` : "Almost there."}`
    : stats
    ? `Found ${recovered} minute${recovered !== 1 ? "s" : ""} of video so far.${remaining != null ? ` About ${remaining} minute${remaining !== 1 ? "s" : ""} to go.` : ""}`
    : "Getting ready — listening for your disc…";

  const damaged = minsDamaged(stats);
  const noDamage = damaged === 0;

  return (
    <div
      ref={scopeRef}
      style={{
        flex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "row",
        overflow: "hidden",
        ...S.base,
      }}
    >

      {/* ── LEFT PANEL: progress + controls (always visible) ──── */}
      <div style={{
        width: 380,
        flexShrink: 0,
        overflowY: "auto",
        scrollbarWidth: "thin",
        padding: "32px 20px 32px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}>

      {/* ══ HERO CARD ══════════════════════════════════════════════ */}
      <div
        style={{
          ...S.surface,
          borderRadius: 20,
          padding: "28px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow */}
        <div style={{
          position: "absolute", top: -80, right: -80,
          width: 280, height: 280, pointerEvents: "none",
          background: "radial-gradient(circle, var(--db-amber-glow) 0%, transparent 70%)",
        }} />

        {/* ── Liveness indicator ── */}
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "absolute", top: 20, right: 20,
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 12, fontWeight: 600, letterSpacing: "0.02em",
            ...S.sans,
            color: isActive ? "var(--db-green)" : idle && !recoveryDone ? "var(--db-text-faint)" : "var(--db-green)",
          }}
        >
          <span style={{ position: "relative", width: 10, height: 10, flexShrink: 0 }}>
            <span style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: isActive ? "var(--db-green)" : "var(--db-text-faint)",
            }} />
            {isActive && <>
              <span style={{
                position: "absolute", inset: -4, borderRadius: "50%",
                border: "1.5px solid var(--db-green)", opacity: 0,
                animation: "db-ripple 2s ease-out infinite",
              }} />
              <span style={{
                position: "absolute", inset: -4, borderRadius: "50%",
                border: "1.5px solid var(--db-green)", opacity: 0,
                animation: "db-ripple 2s ease-out 0.7s infinite",
              }} />
            </>}
          </span>
          {isActive ? "Working" : recoveryDone ? "Complete" : "Paused"}
        </div>

        {/* ── Progress circle ── */}
        <div
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            animation: isActive ? "db-breathe 3.5s ease-in-out infinite" : "none",
            position: "relative",
            width: 170, height: 170,
            margin: "0 auto",
          }}
        >
          <svg
            width="170" height="170"
            viewBox="0 0 200 200"
            style={{ transform: "rotate(-90deg)", filter: `drop-shadow(0 4px 16px var(--db-amber-glow))` }}
            aria-hidden
          >
            <circle cx="100" cy="100" r="85" fill="none" stroke="var(--db-amber-light)" strokeWidth="10" />
            <circle
              cx="100" cy="100" r="85"
              fill="none"
              stroke={isActive || recoveryDone ? "var(--db-amber)" : "var(--db-text-faint)"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 1.2s ease, stroke 0.4s ease" }}
            />
          </svg>
          {/* Overlaid text */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              ...S.serif, ...S.amber,
              fontSize: pct >= 10 ? 48 : 52, fontWeight: 700,
              lineHeight: 1, letterSpacing: "-0.03em",
              color: isActive || recoveryDone ? "var(--db-amber)" : "var(--db-text-faint)",
            }}>{pct}%</span>
            <span style={{
              fontSize: 12, fontWeight: 600, letterSpacing: "0.08em",
              textTransform: "uppercase", marginTop: 4, ...S.textFaint,
            }}>saved</span>
          </div>
        </div>

        {/* ── Hero text ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{
              ...S.serif, ...S.text,
              fontSize: 24, fontWeight: 600, lineHeight: 1.2,
              letterSpacing: "-0.02em", margin: 0,
            }}>
              {headline}
            </h1>
            <p style={{ fontSize: 14, fontWeight: 500, ...S.textMuted, marginTop: 6, lineHeight: 1.5 }}>
              {subline}
            </p>
          </div>

          {/* ── Health chips ── */}
          {!recoveryDone && (
            <div style={{ display: "flex", gap: 12 }}>
              <HealthChip
                tone={noDamage ? "green" : "red"}
                icon={noDamage ? "✓" : "!"}
                title={noDamage ? "No damage found" : `${damaged} min damaged`}
                sub={noDamage ? "Looking great so far" : "We'll keep trying these"}
              />
              <HealthChip
                tone="amber"
                icon="◷"
                title={remaining != null ? `~${remaining} min left` : "Calculating…"}
                sub={isActive ? "Reading sector by sector" : idle ? (pct === 0 ? "Click Resume to start" : "Drive resting — click Resume") : "—"}
              />
            </div>
          )}

          {/* ── Drive health warning ── */}
          {stats?.drive_health === "suspect" && <DriveHealthBanner stats={stats} compact />}

          {/* ── Action buttons ── */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {!recoveryDone && idle && (
              <>
                <select
                  value={resumeMode}
                  onChange={(e) => setResumeMode(e.target.value as RecoveryMode)}
                  disabled={resuming}
                  style={{
                    borderRadius: 10, border: "1.5px solid var(--db-border)",
                    background: "var(--db-surface-2)", color: "var(--db-text)",
                    padding: "10px 14px", fontSize: 13, fontWeight: 500,
                    cursor: resuming ? "default" : "pointer",
                    fontFamily: "var(--db-sans)",
                  }}
                >
                  <option value="quick">Quick mode</option>
                  <option value="overnight">Overnight mode (slower, deeper)</option>
                </select>
                <ActionBtn primary onClick={resume} disabled={resuming}>
                  {resuming ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                  {pct === 0 ? "Start" : "Resume"}
                </ActionBtn>
              </>
            )}
            {!recoveryDone && !idle && (
              <ActionBtn onClick={() => ipc.pauseRecovery(id)}>
                <Pause size={15} /> Pause
              </ActionBtn>
            )}
            {!recoveryDone && (
              <ActionBtn danger onClick={() => ipc.cancelRecovery(id)}>
                <X size={14} /> Cancel
              </ActionBtn>
            )}
            {/* Overnight offer is shown in the dedicated OvernightOfferCard below the done banner */}
          </div>

          {/* Resume error */}
          {resumeError && (() => {
            const fe = friendlyError(resumeError);
            return (
              <div style={{
                borderRadius: 12, padding: "12px 16px",
                background: "rgba(197,48,48,0.06)", border: "1px solid rgba(197,48,48,0.25)",
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, ...S.text }}>{fe.headline}</div>
                {fe.hint && <div style={{ fontSize: 12, ...S.textMuted, marginTop: 4 }}>{fe.hint}</div>}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ══ DONE BANNER ════════════════════════════════════════════ */}
      {recoveryDone && <DoneBanner ref={doneBannerRef} stats={stats} />}

      {/* ══ OVERNIGHT OFFER ════════════════════════════════════════ */}
      {recoveryDone && holesAtCompletion !== null && holesAtCompletion > 0 && (
        <OvernightOfferCard
          stats={stats}
          holesAtCompletion={holesAtCompletion}
          onStart={startOvernight}
          starting={resuming}
          error={resumeError}
        />
      )}

      {/* ══ DRIVE SWITCH ═══════════════════════════════════════════ */}
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

      </div>{/* end LEFT PANEL */}

      {/* ── RIGHT PANEL: output + sector map (scrollable) ───────── */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        scrollbarWidth: "thin",
        padding: "32px 40px 32px 0",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}>

      {/* ══ OUTPUT PANEL ════════════════════════════════════════════ */}
      <div style={{ ...S.surface, borderRadius: 20 }}>
        <OutputPanel
          sessionId={id}
          onMp4Saved={setSavedVideoPath}
          recoveryPct={pct}
          recoveryDone={recoveryDone}
        />
      </div>

      {/* ══ ENHANCEMENT OFFER ══════════════════════════════════════ */}
      {recoveryDone && (
        <EnhancementOffer
          savedVideoPath={savedVideoPath}
          onAccepted={(p) => setSavedVideoPath(p)}
        />
      )}

      </div>{/* end RIGHT PANEL */}

      {/* Keyframe animations injected once */}
      <style>{`
        @keyframes db-breathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.018); }
        }
        @keyframes db-ripple {
          0%   { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────── */

function HealthChip({
  tone, icon, title, sub,
}: { tone: "green" | "amber" | "red"; icon: string; title: string; sub: string }) {
  const colors = {
    green: { bg: "var(--db-green-light)", border: "rgba(26,135,80,0.20)", text: "var(--db-green)" },
    amber: { bg: "var(--db-amber-light)", border: "var(--db-amber-glow)",  text: "var(--db-amber)" },
    red:   { bg: "rgba(197,48,48,0.08)", border: "rgba(197,48,48,0.20)",  text: "var(--db-red)" },
  }[tone];
  return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", gap: 10,
      padding: "12px 16px", borderRadius: 12,
      background: colors.bg, border: `1px solid ${colors.border}`,
    }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{title}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: colors.text, opacity: 0.7, marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  );
}

function ActionBtn({
  children, onClick, disabled, primary, danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 7,
    padding: "13px 24px", borderRadius: 12, minHeight: 48,
    fontFamily: "var(--db-sans)", fontSize: 14, fontWeight: 600,
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
      borderRadius: 12, padding: compact ? "10px 14px" : "14px 18px",
      background: "rgba(197,48,48,0.06)", border: "1px solid rgba(197,48,48,0.25)",
    }} role="alert">
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--db-red)", marginBottom: 2 }}>
        The drive may not be reading this disc
      </div>
      <div style={{ fontSize: 12, ...S.textMuted, lineHeight: 1.5 }}>{detail}</div>
    </div>
  );
}

const DoneBanner = React.forwardRef<HTMLDivElement, { stats: RecoveryStats | null } & React.HTMLAttributes<HTMLDivElement>>(
({ stats, ...props }, ref) => {
  const recovered = minsRecovered(stats);
  const damaged = minsDamaged(stats);
  const total = minsTotal(stats);

  // Theme-aware defaults (the old hardcoded white bg rendered as an invisible
  // gray box in dark mode when stats hadn't arrived yet).
  let bg = "var(--db-surface-2)";
  let border = "var(--db-border)";
  let headline = "Recovery complete.";
  let detail = "Use the Save buttons to keep your video or extract files.";

  if (stats) {
    if (damaged === 0) {
      bg = "linear-gradient(135deg, rgba(26,135,80,0.10), rgba(26,135,80,0.05))";
      border = "rgba(26,135,80,0.30)";
      headline = `We saved everything — ${recovered} minutes recovered.`;
      detail = "Use the Save buttons below to keep your video as an MP4 or extract individual chapters.";
    } else if (recovered > damaged * 3) {
      bg = "linear-gradient(135deg, rgba(194,116,31,0.10), rgba(194,116,31,0.05))";
      border = "rgba(194,116,31,0.30)";
      headline = `We saved ${recovered} of ${total} minutes.`;
      detail = `${damaged} minutes had damage we couldn't read. A second drive sometimes helps.`;
    } else {
      headline = recovered > 0 ? `This disc is heavily damaged — we got ${recovered} minutes.` : "We weren't able to read this disc.";
      detail = recovered > 0
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
          <div style={{ fontSize: 16, fontWeight: 600, ...S.text, ...S.serif }}>{headline}</div>
          <div style={{ fontSize: 13, ...S.textMuted, marginTop: 4, lineHeight: 1.5 }}>{detail}</div>
        </div>
      </div>
    </div>
  );
});
DoneBanner.displayName = "DoneBanner";

/**
 * OvernightOfferCard — shown after a Quick pass completes with holes remaining.
 * Gives the user a calm, honest offer to run Overnight mode while they sleep.
 *
 * Minutes are derived via sectorsToMinutes (2048 bytes/sector, ~0.0034 sec/sector,
 * ~5 Mbps MPEG-2 average). This is the same constant used everywhere in the UI.
 */
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
      {/* Header */}
      <div>
        <div style={{
          fontSize: 20, fontWeight: 600, letterSpacing: "-0.018em",
          lineHeight: 1.25, ...S.serif, ...S.text,
        }}>
          We rescued most of it.
        </div>
        <p style={{ fontSize: 15, fontWeight: 500, ...S.textMuted, marginTop: 8, lineHeight: 1.55 }}>
          {recoveredMin} minute{recoveredMin !== 1 ? "s" : ""} are safe.{" "}
          {holesAtCompletion.toLocaleString()} spot{holesAtCompletion === 1 ? "" : "s"}{" "}
          ({holeMin} min) {holesAtCompletion === 1 ? "is" : "are"} damaged and need more time.
          Overnight mode tries much harder — slower re-reads, cool-downs,
          reading from both directions. Best left running while you sleep; you can stop
          anytime and keep everything we've already rescued.
        </p>
      </div>

      {/* Honest disclaimer */}
      <p style={{
        fontSize: 12, ...S.textFaint, lineHeight: 1.55,
        borderTop: "1px solid rgba(99,102,241,0.14)", paddingTop: 12,
      }}>
        Some damage is physical and can't be recovered by any software. Overnight mode
        simply tries harder on the sectors that Quick pass gave up on — it won't always win.
      </p>

      {/* Action */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <ActionBtn primary onClick={onStart} disabled={starting}>
          {starting
            ? <Loader2 size={15} className="animate-spin" />
            : <RefreshCw size={15} />}
          {starting ? "Starting…" : "Try Overnight ▸"}
        </ActionBtn>
        <span style={{ fontSize: 12, ...S.textFaint }}>
          You can pause or stop at any time — nothing already recovered will be lost.
        </span>
      </div>

      {error && (() => {
        const fe = friendlyError(error);
        return (
          <div style={{
            borderRadius: 10, padding: "10px 14px",
            background: "rgba(197,48,48,0.06)", border: "1px solid rgba(197,48,48,0.25)",
            fontSize: 13, fontWeight: 600, ...S.text,
          }}>
            {fe.headline}
            {fe.hint && <div style={{ fontSize: 12, ...S.textMuted, marginTop: 4, fontWeight: 400 }}>{fe.hint}</div>}
          </div>
        );
      })()}
    </div>
  );
}
