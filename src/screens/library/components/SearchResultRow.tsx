import { useNavigate } from "react-router-dom";
import type { SearchHit } from "../data/types";
import { GradientArt } from "./GradientArt";

interface Props {
  hit: SearchHit;
}

export function SearchResultRow({ hit }: Props) {
  const nav = useNavigate();

  const handleClick = () => {
    nav(`/watch/${hit.discId}?t=${hit.time}`);
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleClick();
      }}
      role="button"
      tabIndex={0}
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr auto",
        gap: 24,
        padding: "22px 12px",
        borderBottom: "1px solid var(--lib-line)",
        alignItems: "center",
        cursor: "pointer",
        borderRadius: 8,
        margin: "0 -12px",
      }}
      className="lib-result-row"
    >
      <GradientArt
        gradient="capecod"
        style={{
          width: 200,
          aspectRatio: "16 / 10",
          borderRadius: 10,
          position: "relative",
          boxShadow: "var(--lib-shadow-soft)",
        }}
      >
        <span
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            background: "rgba(0,0,0,.55)",
            color: "#fff",
            fontSize: 10.5,
            fontWeight: 600,
            padding: "3px 7px",
            borderRadius: 5,
          }}
        >
          {hit.time}
        </span>
      </GradientArt>
      <div>
        <div
          style={{
            fontSize: 12,
            color: "var(--lib-muted)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: ".06em",
          }}
        >
          {hit.discTitle} · {hit.discDate}
        </div>
        <div
          style={{
            fontFamily: "var(--lib-serif)",
            fontSize: 19,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            margin: "4px 0 8px",
            color: "var(--lib-ink)",
          }}
        >
          {hit.speaker ? `${hit.speaker} — ${hit.discDate}` : hit.discDate}
        </div>
        <div
          style={{ fontSize: 14, lineHeight: 1.5, color: "var(--lib-ink-2)" }}
          dangerouslySetInnerHTML={{
            __html: highlightTerms(hit.snippet, hit.matchedTerms),
          }}
        />
      </div>
      <div style={{ color: "var(--lib-muted)", fontSize: 18 }}>→</div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightTerms(text: string, terms: string[]): string {
  let safe = escapeHtml(text);
  for (const term of terms) {
    if (!term) continue;
    const re = new RegExp(`(${escapeRegex(escapeHtml(term))})`, "gi");
    safe = safe.replace(re, "<mark>$1</mark>");
  }
  return safe;
}
