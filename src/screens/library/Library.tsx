import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Activity, ArrowRight, Upload } from "lucide-react";
import { MOCK_DISCS, getDiscById } from "./data/mockDiscs";
import type { Disc } from "./data/types";
import { HeroFeatured } from "./components/HeroFeatured";
import { DiscRail } from "./components/DiscRail";
import { ipc } from "../../lib/ipc";
import type { Session, ImportPreview } from "../../lib/types";
import { ImportPaywallModal } from "../dashboard/ImportPaywallModal";

export default function Library() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [discs, setDiscs] = useState<Disc[]>(MOCK_DISCS);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  // Page size for the first load and each "Load more" click. 60 covers
  // ~3-4 rails of 15-20 cards each, which is what the rail composition
  // below (recentlyRecovered / onThisDay / birthdays / trips) consumes.
  const PAGE_SIZE = 60;

  // Poll for an in-flight recovery session — mirrors Home.tsx so the
  // library always surfaces the live rescue at the top.
  useEffect(() => {
    const tick = async () => {
      try {
        const list = await ipc.listSessions();
        const running = list.find(
          (s) => s.status === "recovering" || s.status === "paused",
        );
        setActiveSession(running ?? null);
      } catch {
        /* ignore until backend ready */
      }
    };
    tick();
    const t = setInterval(tick, 3000);
    return () => clearInterval(t);
  }, []);

  // Pull real discs from the backend. If the library is empty on first
  // launch, seed it with the same demo content the UI shows so the user gets
  // an instantly-interactive, DB-backed (and searchable) library.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let page = await ipc.library.listPage(0, PAGE_SIZE);
        if (!cancelled && page.discs.length === 0) {
          await ipc.library.seedDemo();
          page = await ipc.library.listPage(0, PAGE_SIZE);
        }
        if (!cancelled && page.discs.length > 0) {
          setDiscs(page.discs);
          setNextCursor(page.nextCursor);
        }
      } catch {
        // Dev mode without Tauri shell, or backend error — fall back to mock.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Explicit "Load more" — keeps older users from being confused by
  // infinite scroll, and keeps the IPC load bounded.
  async function loadMore() {
    if (nextCursor == null || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await ipc.library.listPage(nextCursor, PAGE_SIZE);
      setDiscs((prev) => [...prev, ...page.discs]);
      setNextCursor(page.nextCursor);
    } catch {
      // Best-effort; leave the button visible so the user can retry.
    } finally {
      setLoadingMore(false);
    }
  }

  const findById = (id: string): Disc | undefined =>
    discs.find((d) => d.id === id) ?? getDiscById(id);

  const featured = findById("hawaii-vacation") ?? discs[0] ?? MOCK_DISCS[0];

  const recentlyRecovered = discs.slice(0, 8);
  const onThisDay = [
    "hawaii-vacation",
    "baby-emma-first-steps",
    "graduation-michael",
    "family-reunion-lake-house",
    "road-trip-route-66",
    "thanksgiving-aunt-mary",
  ]
    .map((id) => findById(id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  const birthdays = [
    "dads-60th",
    "eleanor-80th",
    "baby-emma-first-steps",
    "kids-first-day-school",
  ]
    .map((id) => findById(id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  const trips = [
    "hawaii-vacation",
    "camping-yellowstone",
    "road-trip-route-66",
    "family-reunion-lake-house",
  ]
    .map((id) => findById(id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  // The currently-pending import: file the user picked + the size/gate preview.
  // When set + !preview.gate.allowed → paywall modal shows.
  // When set + gate.allowed + needsConfirm → size-confirm dialog shows.
  // Cleared after success, cancel, or paywall close.
  const [pending, setPending] = useState<{
    path: string;
    title: string;
    preview: ImportPreview;
  } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  /** Open the file picker, fetch the size+gate preview, then route to either
   *  the paywall, the size confirm dialog, or straight into the import. */
  async function handleImportVideo() {
    if (importing) return;
    setImportMsg(null);
    try {
      const dialog = await import("@tauri-apps/plugin-dialog");
      const picked = await dialog.open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "Video or Audio",
            extensions: [
              "mp4", "mov", "avi", "mkv", "mts", "m2ts", "ts", "wmv", "webm",
              "wav", "mp3", "flac", "m4a", "aac", "ogg", "opus",
            ],
          },
        ],
      });
      if (!picked || typeof picked !== "string") return;

      const base = picked.split(/[\\/]/).pop() ?? picked;
      const stem = base.replace(/\.[^.]+$/, "");
      const title = stem
        .replace(/[_\-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase()) || "Imported Media";

      // Cheap pre-flight — no hashing, no copying yet.
      const preview = await ipc.library.getImportSizePreview(picked);
      setPending({ path: picked, title, preview });

      if (!preview.gate.allowed) {
        // Paywall path — the modal opens via `pending && !gate.allowed`.
        return;
      }
      if (!preview.willFit) {
        setImportMsg(
          `Not enough disk space — need ${preview.fileSizeDisplay} for the vault copy.`,
        );
        setTimeout(() => setImportMsg(null), 6000);
        setPending(null);
        return;
      }
      // Always confirm before a multi-GB copy. For tiny files (<200 MB) skip
      // the confirmation — the wait is short and the friction isn't worth it.
      if (preview.fileSize > 200 * 1024 * 1024) {
        setShowConfirm(true);
      } else {
        void runImport();
      }
    } catch {
      setImportMsg("Available in the desktop app");
      setTimeout(() => setImportMsg(null), 3500);
    }
  }

  /** Final step — actually hash, copy into vault, and enqueue transcription. */
  async function runImport() {
    if (!pending || importing) return;
    setShowConfirm(false);
    setImporting(true);
    try {
      const result = await ipc.library.importMedia(pending.path, pending.title);
      if (!result.isDuplicate) {
        try {
          await ipc.transcription.enqueue(result.id, pending.path);
        } catch {
          // Non-fatal — user can retry from the disc page.
        }
      }
      nav(`/disc/${result.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Surface the backend's tier-gate error in case the license changed
      // between the preview and the import (rare, but possible).
      if (msg.includes("import_blocked")) {
        setImportMsg("Import requires the Archive tier — see upgrade page.");
      } else {
        setImportMsg("Import failed — please try again.");
      }
      setTimeout(() => setImportMsg(null), 5000);
    } finally {
      setImporting(false);
      setPending(null);
    }
  }

  return (
    <div className="lib-root">
      <div className="lib-container">
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "16px 0 0",
            gap: 10,
            alignItems: "center",
          }}
        >
          {importMsg && (
            <span
              role="status"
              style={{
                fontSize: 12.5,
                color: "var(--lib-muted)",
                fontFamily: "var(--lib-sans)",
              }}
            >
              {importMsg}
            </span>
          )}
          <button
            type="button"
            onClick={handleImportVideo}
            disabled={importing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 13px",
              borderRadius: 8,
              border: "1px solid var(--lib-line)",
              background: "#fff",
              color: "var(--lib-ink-2)",
              fontFamily: "var(--lib-sans)",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: importing ? "default" : "pointer",
              opacity: importing ? 0.6 : 1,
            }}
            title="Add a local video or audio file to your library and transcribe it"
          >
            <Upload size={13} />
            {importing ? "Importing…" : "Import media"}
          </button>
        </div>

        <form onSubmit={submit} className="lib-search-form">
          <Search size={16} className="lib-search-icon" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search every spoken word…  try "birthday"'
            className="lib-search-input"
          />
        </form>

        {activeSession && (
          <Link
            to={`/session/${activeSession.id}`}
            style={{
              marginTop: 20,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 18px",
              borderRadius: 14,
              background: "linear-gradient(180deg, #FFF8EC 0%, #FBF1DE 100%)",
              border: "1px solid var(--lib-amber-soft)",
              boxShadow: "var(--lib-shadow-soft)",
              textDecoration: "none",
              color: "var(--lib-ink)",
              transition: "transform .2s ease, box-shadow .2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "var(--lib-shadow-card)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "var(--lib-shadow-soft)";
            }}
          >
            <span
              aria-hidden
              style={{
                position: "relative",
                width: 10,
                height: 10,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: "var(--lib-amber)",
                  opacity: 0.55,
                  animation: "lib-ping 1.6s cubic-bezier(0,0,.2,1) infinite",
                }}
              />
              <span
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "var(--lib-amber)",
                }}
              />
            </span>
            <Activity
              size={18}
              style={{ flexShrink: 0, color: "var(--lib-amber)" }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--lib-sans)",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "var(--lib-ink)",
                }}
              >
                Live: rescuing {activeSession.user_label || activeSession.disc_label || "Untitled disc"}
              </div>
              <div
                style={{
                  fontFamily: "var(--lib-sans)",
                  fontSize: 12,
                  color: "var(--lib-muted)",
                  marginTop: 2,
                }}
              >
                {activeSession.status === "paused"
                  ? "Paused — click to resume"
                  : "Reading sector by sector — open the scan to watch progress"}
              </div>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--lib-sans)",
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--lib-amber)",
                flexShrink: 0,
              }}
            >
              Open scan
              <ArrowRight size={14} />
            </span>
            <style>{`
              @keyframes lib-ping {
                75%, 100% { transform: scale(2.2); opacity: 0; }
              }
            `}</style>
          </Link>
        )}

        <HeroFeatured disc={featured} />

        <DiscRail
          title="Recently recovered"
          sub="From the last 30 days · 7 discs, 14 hours restored"
          discs={recentlyRecovered}
          seeAllHref="/library/all?title=Recently+recovered&filter=recent"
        />
        <DiscRail
          title="On this day in your archive"
          sub="May 16 across the years — birthdays, beaches, backyards"
          discs={onThisDay}
          showStatus={false}
          seeAllHref="/library/all?title=On+this+day&filter=on-this-day"
        />
        <DiscRail
          title="Family birthdays"
          sub='Curated automatically from cake, candles & "happy birthday" detected in audio'
          discs={birthdays}
          showStatus={false}
          seeAllHref="/library/all?title=Family+birthdays&filter=birthdays"
        />
        <DiscRail
          title="Trips & vacations"
          sub="Places you went, road songs you sang in the back seat"
          discs={trips}
          showStatus={false}
          seeAllHref="/library/all?title=Trips+%26+vacations&filter=trips"
        />

        {nextCursor != null && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: 56,
            }}
          >
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              style={{
                padding: "10px 22px",
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
              {loadingMore ? "Loading…" : "Load more discs"}
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
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>Heirvo · {discs.length} discs in your library · backed up locally</div>
          <div>v0.9 preview</div>
        </footer>
      </div>

      {/* ── Import paywall — shown when the picked file is allowed by the
            backend's tier gate. Closing the modal cancels the pending import. */}
      {pending && !pending.preview.gate.allowed && (
        <ImportPaywallModal
          open
          onClose={() => setPending(null)}
          onUnlocked={() => {
            // License just upgraded — re-check the preview, then continue.
            // Easiest: trigger the same flow by re-using the picked path.
            void (async () => {
              try {
                const preview = await ipc.library.getImportSizePreview(pending.path);
                setPending({ ...pending, preview });
                if (preview.gate.allowed && preview.willFit) {
                  if (preview.fileSize > 200 * 1024 * 1024) {
                    setShowConfirm(true);
                  } else {
                    void runImport();
                  }
                }
              } catch {
                setPending(null);
              }
            })();
          }}
          fileName={pending.path.split(/[\\/]/).pop()}
          fileSizeDisplay={pending.preview.fileSizeDisplay}
        />
      )}

      {/* ── Size-confirm dialog — shown for files > 200 MB so the user knows
            disk space will be consumed. Skipped for small audio clips. */}
      {showConfirm && pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-confirm-title"
        >
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl p-6">
            <h3
              id="import-confirm-title"
              className="font-display text-[18px] font-bold tracking-[-0.01em] text-ink-900"
            >
              Copy {pending.preview.fileSizeDisplay} to your vault?
            </h3>
            <p className="mt-2 text-[13.5px] leading-[1.55] text-ink-600">
              Heirvo will copy{" "}
              <span className="font-medium text-ink-900">
                {pending.path.split(/[\\/]/).pop()}
              </span>{" "}
              into a permanent vault so your library doesn't break if you move
              or delete the original. Your file stays where it is.
            </p>
            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false);
                  setPending(null);
                }}
                className="rounded-xl border border-ink-200 px-4 py-2 text-[13px] font-medium text-ink-700 transition hover:bg-ink-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void runImport()}
                className="rounded-xl bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-500"
              >
                Copy &amp; import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
