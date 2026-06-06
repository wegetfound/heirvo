import React from "react";
import { AlertTriangle, RefreshCw, Moon, HardDrive, Pause } from "lucide-react";
import type { RecoveryMode } from "@/lib/types";

// Inline styles avoid unused variable warnings. All colors/fonts are set inline.

interface StalledBannerProps {
  stalledElapsedSecs: number | null;
  resumeMode: RecoveryMode;
  onReconnect: () => Promise<void>;
  onPatientMode: () => Promise<void>;
  onChangeDrive: () => void;
  onPause: () => void;
  reconnecting: boolean;
  resuming: boolean;
}

export function StalledBanner({
  stalledElapsedSecs,
  resumeMode,
  onReconnect,
  onPatientMode,
  onChangeDrive,
  onPause,
  reconnecting,
  resuming,
}: StalledBannerProps) {
  const elapsedSecs = stalledElapsedSecs ?? 0;
  const elapsedMin = Math.floor(elapsedSecs / 60);

  // Severity escalation
  const severity = elapsedSecs < 120 ? "warning" : elapsedSecs < 180 ? "alert" : "critical";
  const bgColor = severity === "critical"
    ? "rgba(197, 48, 48, 0.12)"
    : severity === "alert"
    ? "rgba(197, 48, 48, 0.08)"
    : "rgba(180, 136, 26, 0.08)";
  const borderColor = severity === "critical"
    ? "rgba(197, 48, 48, 0.35)"
    : severity === "alert"
    ? "rgba(197, 48, 48, 0.22)"
    : "rgba(180, 136, 26, 0.22)";
  const textColor = severity === "critical"
    ? "var(--db-red)"
    : severity === "alert"
    ? "var(--db-red)"
    : "var(--db-amber)";

  const headline = severity === "critical"
    ? "Drive not responding — try a different drive"
    : severity === "alert"
    ? "Drive may have stopped responding"
    : "Drive has gone silent";

  const subline = elapsedMin < 1
    ? "No successful reads in the last 60 seconds. Check the cable and power."
    : elapsedMin < 2
    ? `No successful reads for ${elapsedMin} minute. The drive may have powered down.`
    : `No successful reads for ${elapsedMin} minutes. The drive has likely stopped.`;

  const buttonStyle = (disabled = false): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "9px 16px",
    borderRadius: 9,
    minHeight: 38,
    fontFamily: "var(--db-sans)",
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
    border: "1.5px solid transparent",
    transition: "transform 120ms ease, background 150ms ease",
    background: "var(--db-surface-2)",
    color: "var(--db-text)",
    borderColor: "var(--db-border)",
  });

  const primaryButtonStyle = (disabled = false): React.CSSProperties => ({
    ...buttonStyle(disabled),
    background: "var(--db-amber)",
    color: "#FFF",
    boxShadow: "0 3px 12px var(--db-amber-glow)",
    borderColor: "transparent",
  });

  return (
    <div
      role="alert"
      style={{
        borderRadius: 12,
        padding: "16px 18px",
        background: bgColor,
        border: `1px solid ${borderColor}`,
        width: "100%",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
        <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2, color: textColor }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: textColor, marginBottom: 4 }}>
            {headline}
          </div>
          <div style={{ fontSize: 12, color: "var(--db-text-muted)", lineHeight: 1.5 }}>
            {subline}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Reconnect: primary until 2+ minutes */}
        {elapsedSecs < 120 && (
          <button
            style={primaryButtonStyle(reconnecting || resuming)}
            onClick={onReconnect}
            disabled={reconnecting || resuming}
          >
            <RefreshCw size={13} />
            {reconnecting ? "Reconnecting…" : "Reconnect & resume"}
          </button>
        )}

        {/* Patient mode: switch to overnight if quick didn't work */}
        {resumeMode === "quick" && elapsedSecs >= 60 && (
          <button
            style={buttonStyle(resuming)}
            onClick={onPatientMode}
            disabled={resuming}
          >
            <Moon size={13} />
            Try overnight mode (slower, deeper scan)
          </button>
        )}

        {/* Change drive: prominent when critical */}
        {severity === "critical" && (
          <button style={buttonStyle()} onClick={onChangeDrive}>
            <HardDrive size={13} />
            Try a different drive
          </button>
        )}

        {/* Pause: always available */}
        <button style={buttonStyle()} onClick={onPause}>
          <Pause size={13} />
          Pause recovery
        </button>
      </div>

      {/* Info footer */}
      {severity !== "warning" && (
        <div
          style={{
            fontSize: 11,
            color: "var(--db-text-faint)",
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px solid ${borderColor}`,
            lineHeight: 1.5,
          }}
        >
          {severity === "critical"
            ? "This drive isn't responding at all. Using a different drive often rescues discs the first drive can't read."
            : "Different drives have different read tolerances. Switching to a second drive often retrieves data the first drive can't access."}
        </div>
      )}
    </div>
  );
}
