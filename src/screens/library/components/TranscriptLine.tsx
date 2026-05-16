import { cn } from "@/lib/cn";
import type { TranscriptLine as TLine } from "../data/types";

interface Props {
  line: TLine;
  active?: boolean;
  onSeek?: (line: TLine) => void;
}

export function TranscriptLine({ line, active, onSeek }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSeek?.(line)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSeek?.(line);
        }
      }}
      className={cn("lib-tline", active && "lib-tline-active")}
      style={{
        display: "grid",
        gridTemplateColumns: "70px 1fr",
        gap: 24,
        padding: "10px 12px",
        borderRadius: 8,
        cursor: "pointer",
        transition: "background 0.15s",
        alignItems: "baseline",
        background: active ? "rgba(194,116,31,.10)" : undefined,
      }}
    >
      <div
        style={{
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
          fontSize: 11.5,
          color: active ? "var(--lib-amber)" : "var(--lib-muted)",
          fontVariantNumeric: "tabular-nums",
          paddingTop: 6,
          fontWeight: active ? 600 : 400,
        }}
      >
        {line.time}
      </div>
      <div
        style={{
          fontFamily: "var(--lib-serif)",
          fontSize: 19,
          lineHeight: 1.65,
          color: "var(--lib-ink)",
          letterSpacing: "-0.01em",
        }}
      >
        {line.isStageDirection ? (
          <span style={{ color: "var(--lib-muted)", fontStyle: "italic", fontSize: 16 }}>
            {line.text}
          </span>
        ) : (
          <>
            {line.speaker && (
              <span style={{ fontStyle: "italic", color: "var(--lib-muted)", marginRight: 8 }}>
                {line.speaker}:
              </span>
            )}
            {line.text}
          </>
        )}
      </div>
    </div>
  );
}
