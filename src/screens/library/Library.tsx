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
  // One or more files queued for import. Each has its own preview so the
  // paywall and size-confirm dialogs can render meaningful counts.
  const [pending, setPending] = useState<Array<{
    path: string;
    title: string;
    preview: ImportPreview;
  }>>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  // Live progress during a multi-file bulk import: "Importing 3 of 7…"
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [isDragHover, setIsDragHover] = useState(false);

  /** Accepted extensions for both picker and drag-drop. */
  const ACCEPTED_EXT = [
    "mp4","mov","avi","mkv","mts","m2ts","ts","wmv","webm",
    "wav","mp3","flac","m4a","aac","ogg","opus",
  ];

  /** Derive a title-cased title from a file path's stem. */
  function titleFromPath(p: string) {
    const base = p.split(/[\\/]/).pop() ?? p;
    const stem = base.replace(/\.[^.]+$/, "");
    return stem.replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim()
      .replace(/\b\w/g, (c) => c.toUpperCase()) || "Imported Media";
  }

  /** Sum a list of files' sizes with a human-readable label. */
  function bytesLabel(n: number): string {
    if (n >= 1024**3) return `${(n / 1024**3).toFixed(2)} GB`;
    if (n >= 1024**2) return `${(n / 1024**2).toFixed(1)} MB`;
    if (n >= 1024)    return `${(n / 1024).toFixed(1)} KB`;
    return `${n} B`;
  }

  /** Open file picker, then route N files through the gate+confirm flow. */
  async function handleImportVideo() {
    if (importing) return;
    setImportMsg(null);
    try {
      const dialog = await import("@tauri-apps/plugin-dialog");
      const picked = await dialog.open({
        multiple: true,
        directory: false,
        filters: [{ name: "Video or Audio", extensions: ACCEPTED_EXT }],
      });
      if (!picked) return;
      const paths = Array.isArray(picked) ? picked : [picked];
      if (paths.length === 0) return;
      await processImports(paths.filter((p): p is string => typeof p === "string"));
    } catch {
      setImportMsg("Available in the desktop app");
      setTimeout(() => setImportMsg(null), 3500);
    }
  }

  /** Shared path for both file-picker and drag-drop. Gates, confirms, runs. */
  async function processImports(paths: string[]) {
    if (paths.length === 0) return;

    // Filter by accepted extensions — drag-drop can deliver anything.
    const accepted = paths.filter((p) => {
      const ext = p.split(".").pop()?.toLowerCase() ?? "";
      return ACCEPTED_EXT.includes(ext);
    });
    if (accepted.length === 0) {
      setImportMsg("Only video and audio files can be imported.");
      setTimeout(() => setImportMsg(null), 4000);
      return;
    }
    if (accepted.length < paths.length) {
      setImportMsg(`Skipped ${paths.length - accepted.length} file(s) — unsupported format.`);
      setTimeout(() => setImportMsg(null), 4500);
    }

    // Pre-flight every file in parallel — gives us per-file size + the gate.
    const previews = await Promise.all(
      accepted.map(async (path) => ({
        path,
        title: titleFromPath(path),
        preview: await ipc.library.getImportSizePreview(path),
      })),
    );

    // Gate check — if any file is blocked, the whole batch is (same license).
    if (previews.some((p) => !p.preview.gate.allowed)) {
      setPending(previews);
      return; // ImportPaywallModal opens via render check below
    }

    // Disk-space check across the whole batch.
    const totalBytes = previews.reduce((sum, p) => sum + p.preview.fileSize, 0);
    const minFree = previews.reduce(
      (acc, p) => p.preview.vaultFreeSpace != null
        ? Math.min(acc, p.preview.vaultFreeSpace)
        : acc,
      Number.POSITIVE_INFINITY,
    );
    if (minFree !== Number.POSITIVE_INFINITY && totalBytes > minFree) {
      setImportMsg(`Not enough disk space — batch needs ${bytesLabel(totalBytes)}.`);
      setTimeout(() => setImportMsg(null), 6000);
      return;
    }

    setPending(previews);

    // Confirm: always for multi-file; for single file only if > 200 MB.
    const needsConfirm = previews.length > 1 || totalBytes > 200 * 1024 * 1024;
    if (needsConfirm) {
      setShowConfirm(true);
    } else {
      void runImport(previews);
    }
  }

  /** Actually hash, copy, and (backend auto-enqueues transcription). */
  async function runImport(items: typeof pending = pending) {
    if (items.length === 0 || importing) return;
    setShowConfirm(false);
    setImporting(true);
    setBulkProgress({ done: 0, total: items.length });

    let lastId: string | null = null;
    let failed = 0;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      try {
        const result = await ipc.library.importMedia(it.path, it.title);
        lastId = result.id;
        // Backend auto-enqueues transcription on import — no separate call needed.
      } catch (e) {
        failed++;
        const msg = e instanceof Error ? e.message : String(e);
        // If the license is suddenly gone, abort the whole batch.
        if (msg.includes("import_blocked")) {
          setImportMsg("Import requires the Archive tier — see upgrade page.");
          setTimeout(() => setImportMsg(null), 5000);
          break;
        }
      }
      setBulkProgress({ done: i + 1, total: items.length });
    }

    setImporting(false);
    setPending([]);
    setBulkProgress(null);

    if (failed > 0) {
      setImportMsg(`Imported ${items.length - failed} of ${items.length} (${failed} failed).`);
      setTimeout(() => setImportMsg(null), 6000);
    }

    // Single-file flow → jump straight to that disc. Bulk flow → stay on library.
    if (items.length === 1 && lastId) {
      nav(`/disc/${lastId}`);
    } else if (lastId) {
      // Refresh the library so newly-imported discs appear.
      try {
        const page = await ipc.library.listPage(0, PAGE_SIZE);
        setDiscs(page.discs);
        setNextCursor(page.nextCursor);
      } catch {/* ignore */}
    }
  }

  // ── Drag-and-drop on the whole Library page ───────────────────────────
  // Tauri's webview drop event delivers absolute paths (works in dev too).
  // We accept files dropped anywhere on the screen so the user doesn't
  // have to aim — the visual hover state is global, but the picker
  // import button still works for users who prefer it.
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    (async () => {
      try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        const u = await getCurrentWebview().onDragDropEvent((e) => {
          if (e.payload.type === "over" || e.payload.type === "enter") {
            setIsDragHover(true);
          } else if (e.payload.type === "leave") {
            setIsDragHover(false);
          } else if (e.payload.type === "drop") {
            setIsDragHover(false);
            const paths = e.payload.paths.filter((p): p is string => typeof p === "string");
            void processImports(paths);
          }
        });
        unlisten = u;
      } catch {
        // dev / non-tauri env — drag-drop unavailable, picker still works
      }
    })();
    return () => {
      if (unlisten) unlisten();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            title="Add local video or audio files to your library — drag & drop also works"
          >
            <Upload size={13} />
            {importing && bulkProgress
              ? `Importing ${bulkProgress.done}/${bulkProgress.total}…`
              : importing
              ? "Importing…"
              : "Import media"}
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

      {/* ── Drag-and-drop overlay — shown while files hover the window ─── */}
      {isDragHover && (
        <div
          aria-hidden
          className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
          style={{
            background: "rgba(10, 132, 255, 0.08)",
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            className="rounded-2xl border-2 border-dashed bg-white/95 px-8 py-6 shadow-2xl"
            style={{ borderColor: "rgba(10, 132, 255, 0.5)" }}
          >
            <p className="font-display text-[20px] font-bold text-ink-900">
              Drop files to import
            </p>
            <p className="mt-1 text-[13px] text-ink-600">
              Video & audio · Heirvo will copy them to your vault
            </p>
          </div>
        </div>
      )}

      {/* ── Import paywall — shown when ANY file in the batch is blocked.
            Same license gates all files, so one paywall covers the batch. */}
      {pending.length > 0 && !pending[0].preview.gate.allowed && (
        <ImportPaywallModal
          open
          onClose={() => setPending([])}
          onUnlocked={() => {
            // License just upgraded — re-check every file's preview, then continue.
            void (async () => {
              try {
                const refreshed = await Promise.all(
                  pending.map(async (it) => ({
                    ...it,
                    preview: await ipc.library.getImportSizePreview(it.path),
                  })),
                );
                setPending(refreshed);
                if (refreshed.every((p) => p.preview.gate.allowed && p.preview.willFit)) {
                  const total = refreshed.reduce((s, p) => s + p.preview.fileSize, 0);
                  if (refreshed.length > 1 || total > 200 * 1024 * 1024) {
                    setShowConfirm(true);
                  } else {
                    void runImport(refreshed);
                  }
                }
              } catch {
                setPending([]);
              }
            })();
          }}
          fileName={
            pending.length === 1
              ? pending[0].path.split(/[\\/]/).pop()
              : `${pending.length} files`
          }
          fileSizeDisplay={bytesLabel(
            pending.reduce((s, p) => s + p.preview.fileSize, 0),
          )}
        />
      )}

      {/* ── Size-confirm dialog — bulk-aware. Lists files for small batches,
            collapses to a count for large ones. */}
      {showConfirm && pending.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-confirm-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl p-6">
            <h3
              id="import-confirm-title"
              className="font-display text-[18px] font-bold tracking-[-0.01em] text-ink-900"
            >
              {pending.length === 1
                ? `Copy ${pending[0].preview.fileSizeDisplay} to your vault?`
                : `Copy ${pending.length} files (${bytesLabel(
                    pending.reduce((s, p) => s + p.preview.fileSize, 0),
                  )}) to your vault?`}
            </h3>
            <p className="mt-2 text-[13.5px] leading-[1.55] text-ink-600">
              Heirvo copies imported files into a permanent vault so your
              library doesn't break if you move or delete the originals.
              Your files stay where they are.
            </p>
            {pending.length > 1 && pending.length <= 8 && (
              <ul className="mt-3 max-h-48 overflow-y-auto space-y-1 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2">
                {pending.map((p) => (
                  <li
                    key={p.path}
                    className="flex items-center justify-between gap-3 text-[12px] text-ink-700"
                  >
                    <span className="truncate">{p.path.split(/[\\/]/).pop()}</span>
                    <span className="shrink-0 font-mono tabular-nums text-ink-500">
                      {p.preview.fileSizeDisplay}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false);
                  setPending([]);
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
