import { Link } from "react-router-dom";
import type { Disc } from "../data/types";
import { GradientArt } from "./GradientArt";

interface Props {
  disc: Pick<Disc, "id" | "title" | "year" | "source" | "gradient" | "durationFormatted" | "status">;
  showStatus?: boolean;
  showSource?: boolean;
}

export function DiscCard({ disc, showStatus = true, showSource = true }: Props) {
  return (
    <Link
      to={`/disc/${disc.id}`}
      className="lib-card"
      style={{
        flex: "0 0 auto",
        width: 260,
        scrollSnapAlign: "start",
        cursor: "pointer",
        transition: "transform .25s ease",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <GradientArt
        gradient={disc.gradient}
        className="lib-card-art"
        style={{
          width: "100%",
          aspectRatio: "4 / 3",
          borderRadius: 14,
          boxShadow: "var(--lib-shadow-soft)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {showStatus && (
          <span
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              background: "rgba(255,255,255,.9)",
              color: "var(--lib-ink)",
              fontSize: 10.5,
              fontWeight: 600,
              padding: "4px 8px",
              borderRadius: 999,
              zIndex: 2,
              textTransform: "uppercase",
              letterSpacing: ".06em",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2E9E4F" }} />
            {disc.status === "recovered" ? "Restored" : disc.status === "partial" ? "Partial" : "In progress"}
          </span>
        )}
        <span
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            background: "rgba(0,0,0,.55)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: 6,
            zIndex: 2,
            backdropFilter: "blur(8px)",
          }}
        >
          {disc.durationFormatted}
        </span>
        <span
          aria-hidden
          style={{
            content: "''",
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, transparent 55%, rgba(0,0,0,.25) 100%)",
            borderRadius: "inherit",
            pointerEvents: "none",
          }}
        />
      </GradientArt>
      <div
        style={{
          fontFamily: "var(--lib-serif)",
          fontWeight: 500,
          fontSize: 16.5,
          lineHeight: 1.25,
          letterSpacing: "-0.01em",
          margin: "14px 2px 4px",
          color: "var(--lib-ink)",
        }}
      >
        {disc.title}
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: "var(--lib-muted)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginLeft: 2,
        }}
      >
        <span>{disc.year}</span>
        {showSource && (
          <>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--lib-muted)" }} />
            <span>{disc.source}</span>
          </>
        )}
      </div>
    </Link>
  );
}
