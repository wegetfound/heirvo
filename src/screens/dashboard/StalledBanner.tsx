import React from "react";
import { Loader2, Moon, HardDrive, Pause } from "lucide-react";
import type { RecoveryMode } from "@/lib/types";

// Inline styles avoid unused variable warnings. All colors/fonts are set inline.
//
// Calm hold, not an alarm. The recovery engine holds its position on a dropped
// drive and auto-resumes the instant the drive responds (see wait_for_device in
// the Rust engine), so this banner reassures + offers the GENUINE options —
// it never runs the old cancel/restart "reconnect" loop.

interface StalledBannerProps {
  stalledElapsedSecs: number | null;
  resumeMode: RecoveryMode;
  onPatientMode: () => Promise<void>;
  onChangeDrive: () => void;
  onPause: () => void;
  resuming: boolean;
}

export function StalledBanner({
  stalledElapsedSecs,
  resumeMode,
  onPatientMode,
  onChangeDrive,
  onPause,
  resuming,
}: StalledBannerProps) {
  const elapsedSecs = stalledElapsedSecs ?? 0;
  const elapsedMin = Math.floor(elapsedSecs / 60);

  // Honest, calm copy that escalates gently in WORDING only (never red alarms).
  const subline =
    elapsedMin < 1
      ? "No reads in the last minute. Cheap USB bridges drop out now and then — we're holding your place and will continue the instant the drive responds."
      : elapsedMin < 3
      ? `Still waiting (${elapsedMin} min). Your progress is safe. If the drive doesn't wake up, a different one often gets reading again.`
      : `Still waiting (${elapsedMin} min). The drive may have powered down — your progress is safe. A different drive usually helps here.`;

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
    border: "1.5px solid var(--db-border)",
    transition: "transform 120ms ease, background 150ms ease",
    background: "var(--db-surface-2)",
    color: "var(--db-text)",
  });

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        borderRadius: 12,
        padding: "16px 18px",
        background: "var(--db-amber-light)",
        border: "1px solid var(--db-amber-glow)",
        width: "100%",
      }}
    >
      {/* Header — calm waiting indicator, not an alert triangle */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
        <Loader2 size={18} className="animate-spin" style={{ flexShrink: 0, marginTop: 2, color: "var(--db-amber)" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--db-amber)", marginBottom: 4 }}>
            Waiting for the drive
          </div>
          <div style={{ fontSize: 12, color: "var(--db-text-muted)", lineHeight: 1.5 }}>
            {subline}
          </div>
        </div>
      </div>

      {/* Genuine options only — no no-op "reconnect" button. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Overnight: offer once a quick pass has waited a bit */}
        {resumeMode === "quick" && elapsedSecs >= 60 && (
          <button style={buttonStyle(resuming)} onClick={onPatientMode} disabled={resuming}>
            <Moon size={13} />
            Try overnight mode (slower, deeper scan)
          </button>
        )}

        {/* Try a different drive — always genuinely useful on a flaky bridge */}
        <button style={buttonStyle()} onClick={onChangeDrive}>
          <HardDrive size={13} />
          Try a different drive
        </button>

        {/* Pause: always available */}
        <button style={buttonStyle()} onClick={onPause}>
          <Pause size={13} />
          Pause recovery
        </button>
      </div>
    </div>
  );
}
