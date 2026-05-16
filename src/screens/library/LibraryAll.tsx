import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, ChevronLeft } from "lucide-react";
import type { Disc } from "./data/types";
import { DiscCard } from "./components/DiscCard";
import { ipc } from "../../lib/ipc";

const PAGE_SIZE = 60;

/**
 * Full paginated disc grid — the destination for every "See all" link in
 * the Library rails. Shows every disc newest-first with load-more pagination.
 * The optional `?title=<label>` param is used as the heading so the breadcrumb
 * context ("Family birthdays · All") makes sense when arriving from a rail.
 */
export default function LibraryAll() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const railTitle = params.get("title") ?? null;

  const [q, setQ] = useState("");
  const [discs, setDiscs] = useState<Disc[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ready, setReady] = useState(false);
  const total = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const page = await ipc.library.listPage(0, PAGE_SIZE);
        if (cancelled) return;
        setDiscs(page.discs);
        setNextCursor(page.nextCursor);
        // Rough total: what we loaded + any remaining cursor indicates more.
        total.current = page.discs.length + (page.nextCursor != null ? 1 : 0);
      } catch {
        // Fallback to empty — no crash.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function loadMore() {
    if (nextCursor == null || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await ipc.library.listPage(nextCursor, PAGE_SIZE);
      setDiscs((prev) => [...prev, ...page.discs]);
      setNextCursor(page.nextCursor);
    } catch {
      /* leave button visible for retry */
    } finally {
      setLoadingMore(false);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="lib-root">
      <div className="lib-container">
        {/* Breadcrumb */}
        <div style={{ paddingTop: 20, paddingBottom: 8 }}>
          <Link
            to="/library"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--lib-muted)",
              textDecoration: "none",
              fontFamily: "var(--lib-sans)",
            }}
          >
            <ChevronLeft size={14} />
            Library
          </Link>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontFamily: "var(--lib-serif)",
              fontWeight: 500,
              fontSize: 36,
              letterSpacing: "-0.02em",
              color: "var(--lib-ink)",
              margin: 0,
            }}
          >
            {railTitle ?? "Your archive"}
          </h1>
          {ready && (
            <div
              style={{
                fontSize: 13,
                color: "var(--lib-muted)",
                marginTop: 6,
                fontFamily: "var(--lib-sans)",
              }}
            >
              {discs.length} disc{discs.length !== 1 ? "s" : ""}
              {nextCursor != null ? "+" : ""}
              {" "}
              · every word searchable
            </div>
          )}
        </div>

        {/* Search */}
        <form onSubmit={submit} className="lib-search-form" style={{ marginBottom: 36 }}>
          <Search size={16} className="lib-search-icon" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search every spoken word… try "birthday"'
            className="lib-search-input"
          />
        </form>

        {/* Grid */}
        {!ready ? (
          <div
            style={{
              color: "var(--lib-muted)",
              fontFamily: "var(--lib-sans)",
              fontSize: 13,
              padding: "40px 0",
              textAlign: "center",
            }}
          >
            Loading your library…
          </div>
        ) : discs.length === 0 ? (
          <div
            style={{
              color: "var(--lib-muted)",
              fontFamily: "var(--lib-sans)",
              fontSize: 14,
              padding: "60px 0",
              textAlign: "center",
            }}
          >
            No discs yet.{" "}
            <Link
              to="/library"
              style={{ color: "var(--lib-amber)", textDecoration: "none" }}
            >
              Import a video to get started.
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              // 260px matches DiscCard's fixed width; auto-fill packs as many
              // columns as fit, leaving a partial last row naturally.
              gridTemplateColumns: "repeat(auto-fill, 260px)",
              gap: 24,
            }}
          >
            {discs.map((d) => (
              <DiscCard
                key={d.id}
                disc={d}
                showStatus
                showSource
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {nextCursor != null && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: 48,
            }}
          >
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              style={{
                padding: "10px 24px",
                borderRadius: 10,
                border: "1px solid var(--lib-line)",
                background: "#fff",
                color: "var(--lib-ink-2)",
                fontFamily: "var(--lib-sans)",
                fontSize: 13,
                fontWeight: 500,
                cursor: loadingMore ? "default" : "pointer",
                opacity: loadingMore ? 0.6 : 1,
              }}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}

        <footer
          style={{
            padding: "48px 0 60px",
            borderTop: "1px solid var(--lib-line)",
            marginTop: 64,
            color: "var(--lib-muted)",
            fontSize: 12.5,
            fontFamily: "var(--lib-sans)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>Heirvo · {discs.length} disc{discs.length !== 1 ? "s" : ""} · backed up locally</div>
          <Link to="/library" style={{ color: "var(--lib-amber)", textDecoration: "none" }}>
            ← Back to Library
          </Link>
        </footer>
      </div>
    </div>
  );
}
