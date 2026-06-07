import React from "react";
import { Pause, Play, Loader2, RefreshCw, X } from "lucide-react";
import type { RecoveryStats, RecoveryMode } from "@/lib/types";
import { friendlyError } from "@/lib/friendly-errors";

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function minsRemaining(stats: RecoveryStats | null): number | null {
  if (!stats?.eta_secs) return null;
  return Math.round(stats.eta_secs / 60);
}

// ─── CSS var style helpers ────────────────────────────────────────────────────

const S = {
  surface:    { background: "var(--db-surface)", border: "1px solid var(--db-border)", boxShadow: "var(--db-shadow)" } as React.CSSProperties,
  text:       { color: "var(--db-text)" } as React.CSSProperties,
  textMuted:  { color: "var(--db-text-muted)" } as React.CSSProperties,
  textFaint:  { color: "var(--db-text-faint)" } as React.CSSProperties,
  amber:      { color: "var(--db-amber)" } as React.CSSProperties,
  green:      { color: "var(--db-green)" } as React.CSSProperties,
  serif:      { fontFamily: "var(--db-serif)" } as React.CSSProperties,
  sans:       { fontFamily: "var(--db-sans)" } as React.CSSProperties,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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
  return <button style={style} onClick={onClick} disabled={disabled}>{children}</button>;
}

function DriveHealthBanner({ stats, compact = false }: { stats: RecoveryStats; compact?: boolean }) {
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

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ProgressWheelProps {
  phase: string;
  pct: number;
  headline: string;
  subline: string;
  isActive: boolean;
  noDamage: boolean;
  damaged: number;
  reconnecting: boolean;
  reconnectElapsed: number;
  resuming: boolean;
  resumeError: string | null;
  resumeMode: RecoveryMode;
  onResumeMode: (m: RecoveryMode) => void;
  onStart: () => Promise<void>;        // Start recovery from ready phase
  onPause: () => void;
  onResume: () => Promise<void>;       // Resume from paused/stalled
  onCancel: () => void;
  onReconnect: () => Promise<void>;
  onRecoverAnother: () => void; // Start new recovery session
  doneBannerRef: React.RefObject<HTMLDivElement>;
  stats: RecoveryStats | null;
  idle: boolean;
  recoveryDone: boolean;
  sessionId: string | null;
  stalled?: boolean;
  stalledElapsedSecs?: number | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProgressWheel({
  phase,
  pct,
  headline,
  subline,
  isActive,
  noDamage,
  damaged,
  reconnecting,
  reconnectElapsed,
  resuming,
  resumeError,
  resumeMode,
  onResumeMode,
  onStart,
  onPause,
  onResume,
  onCancel,
  onReconnect,
  onRecoverAnother,
  doneBannerRef,
  stats,
  idle,
  recoveryDone,
  sessionId,
  stalled = false,
  stalledElapsedSecs = null,
}: ProgressWheelProps) {
  // Wheel geometry: r=68, viewBox 0 0 148 148
  const WHEEL_R = 68;
  const WHEEL_CIRC = 2 * Math.PI * WHEEL_R;

  // Placeholder when no session active yet
  const showPlaceholder = phase === "idle" || phase === "discovering" || phase === "ready" || phase === "unreadable";
  const effectivePct = showPlaceholder ? 0 : pct;
  const wheelOffset = WHEEL_CIRC * (1 - effectivePct / 100);

  const ringColor = showPlaceholder
    ? "var(--db-text-faint)"
    : (isActive || recoveryDone)
    ? "var(--db-amber)"
    : "var(--db-text-faint)";

  const breathe = isActive && !showPlaceholder;

  const remaining = minsRemaining(stats);
  const etaIsLong = remaining != null && remaining > 90;
  const remainingChip = remaining == null
    ? "Calculating…"
    : etaIsLong
    ? "Working through damage"
    : `~${remaining} min left`;

  // "starting" = drive is opening / first read pending (resuming, no stats yet).
  // Show an honest "Starting…" rather than "Paused" so a slow drive re-spin
  // doesn't read as a stalled/idle session.
  const isStarting = phase === "starting" || (resuming && !stats);
  const isStalled = stalled || phase === "stalled";
  const liveColor = isActive
    ? "var(--db-green)"
    : isStarting
    ? "var(--db-amber)"
    : isStalled
    ? "var(--db-red)"
    : idle && !recoveryDone
    ? "var(--db-text-faint)"
    : "var(--db-green)";
  const liveLabel = isActive
    ? "Working"
    : isStarting
    ? "Starting…"
    : isStalled
    ? stalledElapsedSecs !== null && stalledElapsedSecs !== undefined
      ? `Stalled (${Math.floor(stalledElapsedSecs / 60)}m)`
      : "Stalled (checking…)"
    : recoveryDone
    ? "Complete"
    : "Paused";

  // Render action buttons for "ready" phase (Start button) and active recovery sessions
  // In "ready" phase, sessionId is null (not created yet), but we still show Start button
  const inSession = phase === "ready" || (sessionId !== null && !showPlaceholder);

  return (
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

      {/* Progress wheel */}
      <div style={{
        position: "relative",
        width: 150, height: 150,
        animation: breathe ? "db-breathe 3.6s ease-in-out infinite" : "none",
        flexShrink: 0,
      }}>
        <svg
          width="150" height="150"
          viewBox="0 0 148 148"
          style={{ transform: "rotate(-90deg)", filter: "drop-shadow(0 0 11px var(--db-amber-glow))" }}
          aria-hidden
        >
          <circle cx="74" cy="74" r={WHEEL_R} fill="none" stroke="var(--db-amber-light)" strokeWidth="7" />
          <circle
            cx="74" cy="74" r={WHEEL_R}
            fill="none"
            stroke={ringColor}
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
            color: (isActive || recoveryDone) && !showPlaceholder ? "var(--db-amber)" : "var(--db-text-faint)",
          }}>{effectivePct}%</span>
          <span style={{
            fontSize: 9, fontWeight: 600, letterSpacing: "0.16em",
            textTransform: "uppercase", marginTop: 4, ...S.textFaint,
          }}>read</span>
        </div>
      </div>

      {/* Headline + subline */}
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

      {/* Status badges — complete state */}
      {recoveryDone && !showPlaceholder && (
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

      {/* Status pill chips — recovering state */}
      {inSession && !recoveryDone && (
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

      {/* Drive health warning */}
      {inSession && !recoveryDone && stats?.drive_health === "suspect" && (
        <DriveHealthBanner stats={stats} compact />
      )}

      {/* Action buttons */}
      {inSession && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
          {/* Recover another disc — prominent when done */}
          {recoveryDone && (
            <ActionBtn
              primary
              onClick={onRecoverAnother}
              fullWidth
              disabled={reconnecting || resuming}
            >
              <RefreshCw size={13} style={{ animation: (reconnecting || resuming) ? "spin 1s linear infinite" : "none" }} />
              {reconnecting || resuming ? "Recovering..." : "Recover another disc"}
            </ActionBtn>
          )}

          {/* Reconnect & resume — show for stalled, suspect health, or idle+progress */}
          {!recoveryDone && (isStalled || stats?.drive_health === "suspect" || (idle && !recoveryDone && pct > 0)) && (
            <ActionBtn primary onClick={onReconnect} disabled={reconnecting || resuming} fullWidth>
              {reconnecting
                ? <><Loader2 size={13} className="animate-spin" /> Reconnecting… ({reconnectElapsed}s)</>
                : <><RefreshCw size={13} /> Reconnect &amp; resume</>
              }
            </ActionBtn>
          )}
          {/* Resume controls — hide when stalled */}
          {!recoveryDone && (idle || phase === "ready") && !isStalled && (
            <>
              <select
                value={resumeMode}
                onChange={(e) => onResumeMode(e.target.value as RecoveryMode)}
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
              <ActionBtn primary onClick={phase === "ready" ? onStart : onResume} disabled={resuming || reconnecting} fullWidth>
                {resuming ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                {pct === 0 ? "Start" : "Resume"}
              </ActionBtn>
            </>
          )}
          {/* Pause — hide when stalled or starting */}
          {!recoveryDone && !idle && !isStalled && phase !== "ready" && sessionId && (
            <ActionBtn onClick={onPause} fullWidth>
              <Pause size={13} /> Pause
            </ActionBtn>
          )}
          {/* Cancel — show for ready phase and when not idle+active */}
          {!recoveryDone && (phase === "ready" || !idle) && !isStalled && (
            <ActionBtn danger onClick={onCancel} fullWidth>
              <X size={12} /> Cancel
            </ActionBtn>
          )}
        </div>
      )}

      {/* Resume error */}
      {inSession && !recoveryDone && resumeError && (() => {
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

      {/* Liveness indicator */}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "absolute", top: 14, right: 14,
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 11, fontWeight: 600, letterSpacing: "0.02em",
          ...S.sans,
          color: liveColor,
        }}
      >
        <span style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
          <span style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: isActive && !showPlaceholder ? "var(--db-green)" : "var(--db-text-faint)",
          }} />
          {isActive && !showPlaceholder && (
            <span style={{
              position: "absolute", inset: -3, borderRadius: "50%",
              border: "1.5px solid var(--db-green)", opacity: 0,
              animation: "db-ripple 2s ease-out infinite",
            }} />
          )}
        </span>
        {showPlaceholder ? "Standby" : liveLabel}
      </div>
    </div>
  );
}
