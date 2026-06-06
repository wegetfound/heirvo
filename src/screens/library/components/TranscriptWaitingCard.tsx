import React from "react";
import { Play, BookOpen, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Disc } from "../data/types";

const S = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
    padding: "20px",
    background: "linear-gradient(135deg, var(--lib-surface-light) 0%, rgba(var(--lib-accent-rgb), 0.05) 100%)",
    border: "1px solid var(--lib-border-light)",
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.6,
    color: "var(--lib-text)",
  },
  headline: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--lib-text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  divider: {
    height: 1,
    background: "var(--lib-border-light)",
  },
  message: {
    fontSize: 14,
    color: "var(--lib-text)",
    lineHeight: 1.6,
  },
  bulletPoints: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
    padding: "12px 0",
  },
  bullet: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletIcon: {
    flexShrink: 0,
    marginTop: 2,
  },
  bulletText: {
    fontSize: 13,
    color: "var(--lib-text-muted)",
  },
  progressSection: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    padding: "12px 0",
    borderTop: "1px solid var(--lib-border-light)",
    borderBottom: "1px solid var(--lib-border-light)",
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--lib-text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  progressBar: {
    height: 4,
    background: "var(--lib-border-light)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: (percent: number) => ({
    height: "100%",
    width: `${percent}%`,
    background: "var(--lib-accent)",
    transition: "width 300ms ease",
  } as React.CSSProperties),
  progressText: {
    fontSize: 12,
    color: "var(--lib-text-muted)",
    display: "flex",
    justifyContent: "space-between",
  },
  actionButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    background: "var(--lib-accent)",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity 150ms ease",
    textDecoration: "none",
  },
  actionButtonHover: {
    opacity: 0.9,
  },
};

interface TranscriptWaitingCardProps {
  disc: Disc | null;
  isTranscribing?: boolean;
}

export function TranscriptWaitingCard({ disc, isTranscribing = false }: TranscriptWaitingCardProps) {
  const navigate = useNavigate();
  const discId = disc?.id;

  if (!disc) return null;

  const totalPhrases = disc.transcript?.length || 0;
  const indexedPhrases = disc.phrasesIndexed || 0;
  const percent = totalPhrases > 0 ? Math.round((indexedPhrases / totalPhrases) * 100) : 0;
  const remainingPhrases = Math.max(0, totalPhrases - indexedPhrases);

  return (
    <div style={S.container as React.CSSProperties}>
      {/* Headline */}
      <div style={S.headline as React.CSSProperties}>
        <BookOpen size={14} />
        Transcript coming…
      </div>

      {/* Divider */}
      <div style={S.divider} />

      {/* Message */}
      <p style={S.message as React.CSSProperties}>
        Your video is ready to watch. The transcript is being prepared in the background — we'll make it searchable once it's ready.
      </p>

      {/* What you can do */}
      <div style={S.bulletPoints as React.CSSProperties}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--lib-text-muted)", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          While you wait
        </p>
        <div style={S.bullet as React.CSSProperties}>
          <Play size={14} style={{ ...S.bulletIcon, color: "var(--lib-accent)" }} />
          <span style={S.bulletText}>Play the video and watch it now</span>
        </div>
        <div style={S.bullet as React.CSSProperties}>
          <FileText size={14} style={{ ...S.bulletIcon, color: "var(--lib-accent)" }} />
          <span style={S.bulletText}>Browse disc metadata and file list</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={S.progressSection as React.CSSProperties}>
        <div style={S.progressLabel}>Indexing progress</div>
        <div style={S.progressBar}>
          <div style={S.progressFill(percent)} />
        </div>
        <div style={S.progressText}>
          <span>{indexedPhrases.toLocaleString()} of {totalPhrases.toLocaleString()} phrases</span>
          <span>{percent}%</span>
        </div>
        {isTranscribing && remainingPhrases > 0 && (
          <div style={{ fontSize: 11, color: "var(--lib-text-muted)", marginTop: 4 }}>
            {remainingPhrases.toLocaleString()} phrases remaining…
          </div>
        )}
      </div>

      {/* Action button */}
      <button
        onClick={() => discId && navigate(`/disc/${discId}`)}
        style={S.actionButton as React.CSSProperties}
        onMouseEnter={(e) => Object.assign(e.currentTarget.style, S.actionButtonHover)}
        onMouseLeave={(e) => Object.assign(e.currentTarget.style, { opacity: "1" })}
      >
        <FileText size={14} />
        View disc details
      </button>
    </div>
  );
}
