import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Play, Search as SearchIcon, ArrowRight } from "lucide-react";
// mockSearch / mockDiscs intentionally NOT imported — Search only queries real transcripts.
import type { Disc, SearchHit } from "./data/types";
import { GradientArt } from "./components/GradientArt";
import { SearchResultRow, highlightTerms } from "./components/SearchResultRow";
import { ipc } from "../../lib/ipc";

export default function Search() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const initialQ = params.get("q") ?? "";
  const [q, setQ] = useState(initialQ);

  const queryString = params.get("q") ?? "";

  // Real FTS5 search via IPC. On error show empty results — never fabricated mock data.
  const [hits, setHits] = useState<SearchHit[]>([]);
  useEffect(() => {
    let cancelled = false;
    if (!queryString.trim()) {
      setHits([]);
      return;
    }
    (async () => {
      try {
        const real = await ipc.library.search(queryString);
        if (!cancelled) setHits(real);
      } catch {
        if (!cancelled) setHits([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  // Resolve the "best disc" art from the real library via IPC.
  const best = hits[0];
  const rest = hits.slice(1);
  const [bestDisc, setBestDisc] = useState<Disc | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    if (!best) {
      setBestDisc(undefined);
      return;
    }
    (async () => {
      try {
        const real = await ipc.library.get(best.discId);
        if (!cancelled) setBestDisc(real ?? undefined);
      } catch {
        if (!cancelled) setBestDisc(undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [best?.discId]);

  const discCount = useMemo(() => new Set(hits.map((h) => h.discId)).size, [hits]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setParams(q.trim() ? { q: q.trim() } : {});
  };

  return (
    <div className="lib-root">
      <div className="lib-container">
        <form onSubmit={submit} className="lib-search-form" style={{ marginTop: 24 }}>
          <SearchIcon size={16} className="lib-search-icon" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search every spoken word…"
            className="lib-search-input"
            autoFocus
          />
        </form>

        <div style={{ padding: "32px 0 28px", borderBottom: "1px solid var(--lib-line)" }}>
          <div
            style={{
              fontSize: 12,
              color: "var(--lib-muted)",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Universal search · across every disc and every spoken word
          </div>
          <h1
            style={{
              fontFamily: "var(--lib-serif)",
              fontWeight: 400,
              fontSize: 46,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              margin: "10px 0 6px",
              color: "var(--lib-ink)",
            }}
          >
            {queryString ? (
              <>
                Results for{" "}
                <em style={{ fontStyle: "italic", color: "var(--lib-amber)" }}>
                  &ldquo;{queryString}&rdquo;
                </em>
              </>
            ) : (
              "Search your memories"
            )}
          </h1>
          <div style={{ color: "var(--lib-muted)", fontSize: 14 }}>
            {queryString
              ? `${hits.length} moments found across ${discCount} disc${discCount === 1 ? "" : "s"} · sorted by relevance`
              : "Type a name, place, or phrase someone said."}
          </div>
        </div>

        {best && bestDisc && (
          <div
            style={{
              marginTop: 32,
              display: "grid",
              gridTemplateColumns: "1.1fr 1fr",
              gap: 0,
              borderRadius: 22,
              overflow: "hidden",
              background: "var(--lib-paper)",
              boxShadow: "var(--lib-shadow-card)",
              border: "1px solid var(--lib-line)",
            }}
          >
            <GradientArt
              gradient={bestDisc.gradient}
              style={{ minHeight: 380, position: "relative" }}
            >
              <Link
                to={`/watch/${best.discId}?t=${best.time}`}
                style={{
                  position: "absolute",
                  inset: 0,
                  margin: "auto",
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,.95)",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 12px 32px rgba(0,0,0,.25)",
                  color: "var(--lib-ink)",
                }}
              >
                <Play size={28} fill="currentColor" stroke="none" style={{ marginLeft: 3 }} />
              </Link>
            </GradientArt>
            <div style={{ padding: "40px 44px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: "var(--lib-amber)",
                  marginBottom: 14,
                }}
              >
                Best match
              </div>
              <h2
                style={{
                  fontFamily: "var(--lib-serif)",
                  fontWeight: 500,
                  fontSize: 30,
                  letterSpacing: "-0.015em",
                  lineHeight: 1.15,
                  margin: "0 0 8px",
                  color: "var(--lib-ink)",
                }}
              >
                {bestDisc.title} — {best.time}
              </h2>
              <div style={{ fontSize: 13, color: "var(--lib-muted)", marginBottom: 22 }}>
                Disc · &quot;{bestDisc.title} {bestDisc.year}&quot; · {best.time}
              </div>
              <blockquote
                style={{
                  fontFamily: "var(--lib-serif)",
                  fontStyle: "italic",
                  fontSize: 18,
                  lineHeight: 1.5,
                  color: "var(--lib-ink-2)",
                  borderLeft: "2px solid var(--lib-amber)",
                  paddingLeft: 18,
                  margin: "0 0 26px",
                }}
                dangerouslySetInnerHTML={{
                  __html: `“${highlightTerms(best.snippet, best.matchedTerms)}”`,
                }}
              />
              <button
                type="button"
                onClick={() => nav(`/watch/${best.discId}?t=${best.time}`)}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--lib-ink)",
                  display: "inline-flex",
                  gap: 6,
                  alignItems: "center",
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Open this moment <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {queryString && hits.length === 0 && (
          <div
            style={{
              marginTop: 48,
              padding: 32,
              border: "1px dashed var(--lib-line)",
              borderRadius: 14,
              color: "var(--lib-muted)",
              fontSize: 14,
            }}
          >
            No matches found. Try a simpler word or check spelling.
          </div>
        )}

        {rest.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <div
              style={{
                fontFamily: "var(--lib-serif)",
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                marginBottom: 18,
                color: "var(--lib-ink-2)",
              }}
            >
              More moments mentioning &ldquo;{queryString}&rdquo;
            </div>
            {rest.map((h, i) => (
              <SearchResultRow key={`${h.discId}-${h.timeSec}-${i}`} hit={h} />
            ))}
          </div>
        )}

        <footer
          style={{
            padding: "48px 0 60px",
            borderTop: "1px solid var(--lib-line)",
            marginTop: 64,
            color: "var(--lib-muted)",
            fontSize: 12.5,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>Transcribed locally on this device · Whisper.cpp · large-v3</div>
          <div>{discCount > 0 ? `${discCount} discs in this search` : ""}</div>
        </footer>
      </div>
    </div>
  );
}
