import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, ChevronLeft } from "lucide-react";
import type { Disc } from "./data/types";
import { DiscCard } from "./components/DiscCard";
import { ipc } from "../../lib/ipc";

const PAGE_SIZE = 60;

type FilterId = "recent" | "on-this-day" | "birthdays" | "trips" | null;

function applyFilter(discs: Disc[], filter: FilterId): Disc[] {
  if (!filter) return discs;
  const today = new Date();
  switch (filter) {
    case "recent": {
      const cutoff = new Date(today);
      cutoff.setDate(cutoff.getDate() - 30);
      return discs.filter((d) => {
        // recoveredAt format: "May 14" — assume current year, handle Jan boundary
        const parsed = new Date(`${d.recoveredAt}, ${today.getFullYear()}`);
        if (!isNaN(parsed.getTime())) {
          const adjusted = parsed > today
            ? new Date(parsed.setFullYear(today.getFullYear() - 1))
            : parsed;
          return adjusted >= cutoff;
        }
        return true;
      });
    }
    case "on-this-day": {
      const todayMonth = today.getMonth();
      const todayDay = today.getDate();
      const MONTHS = [
        "january","february","march","april","may","june",
        "july","august","september","october","november","december",
      ];
      return discs.filter((d) => {
        // date format: "May 16, 1999"
        const m = d.date.match(/^(\w+)\s+(\d+)/);
        if (!m) return false;
        const monthIdx = MONTHS.findIndex((n) =>
          n.startsWith(m[1].toLowerCase().slice(0, 3))
        );
        return monthIdx === todayMonth && parseInt(m[2]) === todayDay;
      });
    }
    case "birthdays":
      return discs.filter((d) =>
        d.topics.some((t) => {
          const l = t.label.toLowerCase();
          return l.includes("birthday") || l.includes("cake") || l.includes("candle");
        })
      );
    case "trips":
      return discs.filter((d) =>
        d.topics.some((t) => {
          const l = t.label.toLowerCase();
          return (
            l.includes("trip") ||
            l.includes("vacation") ||
            l.includes("travel") ||
            l.includes("road") ||
            l.includes("cruise")
          );
        })
      );
    default:
      return discs;
  }
}

function filterDescription(filter: FilterId): string | null {
  switch (filter) {
    case "recent": return "Discs recovered in the last 30 days";
    case "on-this-day": return "Discs filmed on this calendar day in past years";
    case "birthdays": return "Detected birthday moments — cake, candles, singing";
    case "trips": return "Trips, vacations, and road journeys";
    default: return null;
  }
}

/**
 * Full paginated disc grid — destination for every "See all" link in the
 * Library rails. Applies a client-side filter when ?filter= is present so
 * each rail shows only its relevant subset.
 */
export default function LibraryAll() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const railTitle = params.get("title") ?? null;
  const filter = (params.get("filter") ?? null) as FilterId;

  const [q, setQ] = useState("");
  const [allDiscs, setAllDiscs] = useState<Disc[]>([]);
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
        setAllDiscs(page.discs);
        setNextCursor(page.nextCursor);
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
      setAllDiscs((prev) => [...prev, ...page.discs]);
      setNextCursor(page.nextCursor);
    } catch {
      /* leave button visible for retry */
    } finally {
      setLoadingMore(false);
    }
  }

  const discs = applyFilter(allDiscs, filter);
  const filterDesc = filterDescription(filter);

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
              {filter == null && nextCursor != null ? "+" : ""}
              {filterDesc ? ` · ${filterDesc}` : " · every word searchable"}
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
            {filter ? (
              <>
                No discs match this filter yet.{" "}
                <Link to="/library/all" style={{ color: "var(--lib-amber)", textDecoration: "none" }}>
                  View all discs →
                </Link>
              </>
            ) : (
              <>
                No discs yet.{" "}
                <Link to="/library" style={{ color: "var(--lib-amber)", textDecoration: "none" }}>
                  Import a video to get started.
                </Link>
              </>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
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

        {/* Load more — only shown when not filtering (filter is client-side over loaded set) */}
        {filter == null && nextCursor != null && (
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
