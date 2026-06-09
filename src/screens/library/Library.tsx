import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Activity, ArrowRight, Upload } from "lucide-react";
// mockDiscs intentionally NOT imported here — Library only shows real recovered discs.
import type { Disc } from "./data/types";
import { HeroFeatured } from "./components/HeroFeatured";
import { DiscRail } from "./components/DiscRail";
import { DiscCard } from "./components/DiscCard";
import { DiscMetadataFilter } from "./components/DiscMetadataFilter";
import { ipc } from "../../lib/ipc";
import type { Session, ImportPreview, Album } from "../../lib/types";
import { ImportPaywallModal } from "../dashboard/ImportPaywallModal";
import { convertFileSrc } from "@tauri-apps/api/core";

export default function Library() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [discs, setDiscs] = useState<Disc[]>([]);
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

  // Pull real discs from the backend.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const page = await ipc.library.listPage(0, PAGE_SIZE);
        if (!cancelled) {
          setDiscs(page.discs);
          setMetadataFilteredDiscs(page.discs); // Initialize metadata filter with all discs
          setNextCursor(page.nextCursor);
        }
      } catch {
        // Dev mode without Tauri shell, or backend error — leave empty.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Surface any toast left by DiscDetail (e.g. after a delete) so the user
  // sees confirmation when they land on /library.
  useEffect(() => {
    try {
      const note = sessionStorage.getItem("lib_toast");
      if (note) {
        sessionStorage.removeItem("lib_toast");
        setImportMsg(note);
        setTimeout(() => setImportMsg(null), 5000);
      }
    } catch {/* private mode */}
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

  // Library filter by media type / albums. "all" leaves the rails untouched
  // so the curated rails (On this day / Birthdays / Trips) keep working.
  // "albums" shows the album grid; everything else collapses the rails into
  // a single flat grid of matching discs.
  type FilterKind = "all" | "albums" | "imported" | "video" | "audio" | "photo" | "disc";
  const [filter, setFilter] = useState<FilterKind>("all");
  const [albums, setAlbums] = useState<Album[]>([]);

  // Metadata filtering state (title, people, topics search)
  const [metadataFilteredDiscs, setMetadataFilteredDiscs] = useState<Disc[]>([]);

  // ── Multi-select / bulk-delete state (lifted so it persists across filter tab switches) ──
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteErr, setBulkDeleteErr] = useState<string | null>(null);
  // Second-step confirm for the bulk permanent-delete path.
  const [bulkPermanentConfirmOpen, setBulkPermanentConfirmOpen] = useState(false);

  // Clear selection when leaving a filter tab or exiting select mode.
  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
    setBulkDeleteOpen(false);
    setBulkDeleteErr(null);
    setBulkPermanentConfirmOpen(false);
  }

  function toggleSelectMode() {
    if (selectMode) {
      exitSelectMode();
    } else {
      setSelectMode(true);
      setSelected(new Set());
    }
  }

  function toggleDisc(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkRemove() {
    if (bulkDeleting || selected.size === 0) return;
    setBulkDeleting(true);
    setBulkDeleteErr(null);
    try {
      await ipc.library.deleteDiscsBulk(Array.from(selected), false);
      setBulkDeleteOpen(false);
      exitSelectMode();
      setImportMsg(`Removed ${selected.size} ${selected.size === 1 ? "disc" : "discs"} from Heirvo. Video files are still saved in your Documents › Heirvo folder.`);
      setTimeout(() => setImportMsg(null), 6000);
      try {
        const page = await ipc.library.listPage(0, PAGE_SIZE);
        setDiscs(page.discs);
        setNextCursor(page.nextCursor);
      } catch {/* ignore refresh error */}
    } catch (e) {
      setBulkDeleteErr(e instanceof Error ? e.message : "Remove failed — please try again.");
      setBulkDeleting(false);
    }
  }

  async function handleBulkDeletePermanently() {
    if (bulkDeleting || selected.size === 0) return;
    setBulkDeleting(true);
    setBulkDeleteErr(null);
    try {
      await ipc.library.deleteDiscsBulk(Array.from(selected), true);
      setBulkDeleteOpen(false);
      setBulkPermanentConfirmOpen(false);
      exitSelectMode();
      setImportMsg(`Permanently deleted ${selected.size} ${selected.size === 1 ? "disc" : "discs"} from your computer.`);
      setTimeout(() => setImportMsg(null), 6000);
      try {
        const page = await ipc.library.listPage(0, PAGE_SIZE);
        setDiscs(page.discs);
        setNextCursor(page.nextCursor);
      } catch {/* ignore refresh error */}
    } catch (e) {
      setBulkDeleteErr(e instanceof Error ? e.message : "Delete failed — please try again.");
      setBulkDeleting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await ipc.albums.list();
        if (!cancelled) setAlbums(list);
      } catch {/* dev mode — albums stay empty */}
    })();
    return () => { cancelled = true; };
  }, [filter]); // refresh when user navigates to albums tab

  /** Classify a disc into one of the filter buckets. Recovered DVDs and
   *  audio CDs come from the rescue flow; everything else is imported. */
  function bucketOf(d: Disc): FilterKind {
    const src = (d.source || "").toLowerCase();
    const isRecoveredDisc =
      src.includes("dvd") || src.includes("blu-ray") ||
      src.includes("cd") || src.includes("disc");
    if (isRecoveredDisc && !src.startsWith("imported")) return "disc";
    if (d.mediaType === "photo") return "photo";
    if (d.mediaType === "audio") return "audio";
    return "video";
  }

  const filteredDiscs = filter === "all"
    ? discs
    : filter === "imported"
    ? discs.filter((d) => bucketOf(d) !== "disc")
    : discs.filter((d) => bucketOf(d) === filter);

  // Live counts for the tab badges — drive engagement and show the user
  // what their vault looks like at a glance.
  const counts = {
    all: discs.length,
    albums: albums.length,
    imported: discs.filter((d) => bucketOf(d) !== "disc").length,
    video: discs.filter((d) => bucketOf(d) === "video").length,
    audio: discs.filter((d) => bucketOf(d) === "audio").length,
    photo: discs.filter((d) => bucketOf(d) === "photo").length,
    disc: discs.filter((d) => bucketOf(d) === "disc").length,
  };

  // Use filtered discs if metadata filter is active, otherwise use all discs
  const displayDiscs = metadataFilteredDiscs.length > 0 ? metadataFilteredDiscs : discs;

  const featured = displayDiscs[0] ?? null;

  const recentlyRecovered = displayDiscs.slice(0, 8);

  // "On this day" — discs whose date matches today's month+day.
  const todayM = new Date().getMonth();
  const todayD = new Date().getDate();
  const MONTHS_LC = ["january","february","march","april","may","june",
    "july","august","september","october","november","december"];
  const onThisDay = displayDiscs.filter((d) => {
    const m = d.date?.match(/^(\w+)\s+(\d+)/);
    if (!m) return false;
    const mi = MONTHS_LC.findIndex((n) => n.startsWith(m[1].toLowerCase().slice(0, 3)));
    return mi === todayM && parseInt(m[2]) === todayD;
  });

  // "Birthdays" — discs with birthday-related topics.
  const birthdays = displayDiscs.filter((d) =>
    d.topics?.some((t) => {
      const l = t.label.toLowerCase();
      return l.includes("birthday") || l.includes("cake") || l.includes("candle");
    })
  );

  // "Trips" — discs with travel-related topics.
  const trips = displayDiscs.filter((d) =>
    d.topics?.some((t) => {
      const l = t.label.toLowerCase();
      return l.includes("trip") || l.includes("vacation") || l.includes("travel") ||
             l.includes("road") || l.includes("cruise");
    })
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  // One or more files queued for import. Each has its own preview so the
  // paywall and size-confirm dialogs can render meaningful counts.
  // `folderOrigin` is the dropped-folder path the file came from (null for
  // file-picker / loose-file drops). Albums are created lazily in runImport
  // ONLY after the user clears the paywall + confirm, so cancelled imports
  // don't leave empty albums in the library.
  const [pending, setPending] = useState<Array<{
    path: string;
    title: string;
    folderOrigin: string | null;
    preview: ImportPreview;
  }>>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  // Live progress during a multi-file bulk import: "Importing 3 of 7…"
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [isDragHover, setIsDragHover] = useState(false);

  /** Accepted extensions for both picker and drag-drop. */
  const ACCEPTED_EXT = [
    // video
    "mp4","mov","avi","mkv","mts","m2ts","ts","wmv","webm",
    // audio
    "wav","mp3","flac","m4a","aac","ogg","opus",
    // photo
    "jpg","jpeg","png","heic","tiff","tif","webp","gif","bmp",
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
        filters: [{ name: "Media (video, audio, photos)", extensions: ACCEPTED_EXT }],
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

  /** Shared path for both file-picker and drag-drop. Gates, confirms, runs.
   *  Accepts plain string paths (no album) or tagged objects (folder drops
   *  with the source folder path; the actual album row is created later in
   *  runImport, AFTER the user has cleared the paywall and the confirm). */
  async function processImports(input: Array<string | { path: string; folderOrigin: string | null }>) {
    if (input.length === 0) return;
    const items = input.map((it) =>
      typeof it === "string" ? { path: it, folderOrigin: null as string | null } : it,
    );

    const accepted = items.filter(({ path }) => {
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      return ACCEPTED_EXT.includes(ext);
    });
    if (accepted.length === 0) {
      setImportMsg("Only video, audio, and photo files can be imported.");
      setTimeout(() => setImportMsg(null), 4000);
      return;
    }
    if (accepted.length < items.length) {
      setImportMsg(`Skipped ${items.length - accepted.length} file(s) — unsupported format.`);
      setTimeout(() => setImportMsg(null), 4500);
    }

    // Pre-flight every file in parallel — gives us per-file size + the gate.
    const previews = await Promise.all(
      accepted.map(async ({ path, folderOrigin }) => ({
        path,
        folderOrigin,
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

  /** Actually hash, copy, and (backend auto-enqueues transcription). Albums
   *  are created here, just-in-time — one per distinct folderOrigin — so a
   *  cancelled flow never leaves empty albums behind. */
  async function runImport(items: typeof pending = pending) {
    if (items.length === 0 || importing) return;
    setShowConfirm(false);
    setImporting(true);
    setBulkProgress({ done: 0, total: items.length });

    // ── Create albums for each distinct folder this import covers ────────
    // Album rows are now created here (commit time), not at drag-drop time,
    // so users who cancel at the paywall or size-confirm don't pollute
    // their library with empty albums.
    const folderToAlbumId = new Map<string, string>();
    for (const it of items) {
      if (!it.folderOrigin || folderToAlbumId.has(it.folderOrigin)) continue;
      const folderName = it.folderOrigin
        .split(/[\\/]/)
        .filter(Boolean)
        .pop() ?? "Untitled album";
      try {
        const album = await ipc.albums.create(folderName);
        folderToAlbumId.set(it.folderOrigin, album.id);
      } catch {
        // Album creation failed — fall through and import this folder's
        // files as loose entries rather than blocking the whole batch.
      }
    }

    let lastId: string | null = null;
    let failed = 0;
    let duplicates = 0;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const albumId = it.folderOrigin ? folderToAlbumId.get(it.folderOrigin) ?? null : null;
      try {
        const result = await ipc.library.importMedia(it.path, it.title, albumId);
        lastId = result.id;
        if (result.isDuplicate) duplicates++;
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

    // Compose a single result message covering successes, dups, and failures.
    const succeeded = items.length - failed - duplicates;
    const parts: string[] = [];
    if (succeeded > 0) parts.push(`Imported ${succeeded}`);
    if (duplicates > 0) parts.push(`${duplicates} already in library`);
    if (failed > 0) parts.push(`${failed} failed`);
    if (parts.length > 0) {
      setImportMsg(parts.join(" · "));
      setTimeout(() => setImportMsg(null), 6000);
    }

    // Navigate to the album when the whole batch shares one (folder drop);
    // single-file → disc page; bulk loose files → stay on library.
    const sharedFolder = items[0]?.folderOrigin;
    const allSameFolder = sharedFolder && items.every((it) => it.folderOrigin === sharedFolder);
    const sharedAlbumId = allSameFolder ? folderToAlbumId.get(sharedFolder) ?? null : null;
    if (sharedAlbumId && items.length > 1) {
      nav(`/album/${sharedAlbumId}`);
    } else if (items.length === 1 && lastId) {
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
            // Expand any directories into their contained importable media.
            // Each dropped folder is tagged as the "folderOrigin" for the
            // files inside; runImport will materialize the album row from
            // the origin only after the user clears paywall + confirm.
            void (async () => {
              const expanded: Array<{ path: string; folderOrigin: string | null }> = [];
              const folderSet = new Set<string>();
              for (const p of paths) {
                try {
                  const inside = await ipc.library.listImportableMediaInDir(p);
                  if (inside.length > 0) {
                    expanded.push(...inside.map((q) => ({ path: q, folderOrigin: p })));
                    folderSet.add(p);
                    continue;
                  }
                  expanded.push({ path: p, folderOrigin: null });
                } catch {
                  expanded.push({ path: p, folderOrigin: null });
                }
              }

              // De-duplicate by path while preserving folder tagging.
              const seen = new Set<string>();
              const unique: Array<{ path: string; folderOrigin: string | null }> = [];
              for (const it of expanded) {
                if (seen.has(it.path)) continue;
                seen.add(it.path);
                unique.push(it);
              }

              if (unique.length > paths.length) {
                const note = folderSet.size > 0
                  ? `Found ${unique.length} files in ${folderSet.size} folder(s) — will import as album(s)`
                  : `Found ${unique.length} media file(s) in dropped folders`;
                setImportMsg(note);
                setTimeout(() => setImportMsg(null), 5000);
              }
              void processImports(unique);
            })();
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
              background: "var(--lib-surface)",
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

        {/* Metadata filter (title, people, topics) - only shown on "all" tab */}
        {filter === "all" && (
          <DiscMetadataFilter
            discs={discs}
            onFilterChange={setMetadataFilteredDiscs}
          />
        )}

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
              // Banner surface is always cream, so text is pinned dark in BOTH
              // themes — the theme vars (--lib-ink etc.) flip to near-white in
              // dark mode and would vanish on this cream background.
              color: "#2E2008",
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
                  color: "#2E2008",
                }}
              >
                Live: rescuing {activeSession.user_label || activeSession.disc_label || "Untitled disc"}
              </div>
              <div
                style={{
                  fontFamily: "var(--lib-sans)",
                  fontSize: 12,
                  color: "#7A6F62",
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

        {/* ── Filter tabs: cuts a mixed vault down to one media type ─── */}
        <FilterTabs
          filter={filter}
          setFilter={(k) => { exitSelectMode(); setFilter(k); }}
          counts={counts}
          selectMode={selectMode}
          onToggleSelectMode={toggleSelectMode}
          showSelectToggle={filter !== "all" && filter !== "albums"}
        />

        {filter === "albums" ? (
          <AlbumGrid albums={albums} />
        ) : filter === "all" ? (
          <>
            {featured && <HeroFeatured disc={featured} />}

            <DiscRail
              title="Recently recovered"
              sub={recentlyRecovered.length > 0 ? `${recentlyRecovered.length} disc${recentlyRecovered.length === 1 ? "" : "s"} recovered` : "From the last 30 days"}
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
          </>
        ) : (
          <FilteredGrid
            discs={filteredDiscs}
            filter={filter}
            selectMode={selectMode}
            selected={selected}
            onToggleDisc={toggleDisc}
            onRequestBulkDelete={() => setBulkDeleteOpen(true)}
            onCancelSelect={exitSelectMode}
          />
        )}

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
                background: "var(--lib-surface)",
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

      {/* ── Bulk-delete two-tier modal ──────────────────────────────── */}
      {bulkDeleteOpen && !bulkPermanentConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-delete-title"
        >
          <div
            style={{
              background: "var(--lib-paper)",
              borderRadius: 20,
              width: "100%",
              maxWidth: 420,
              padding: "28px 28px 24px",
              boxShadow: "0 32px 80px rgba(30,20,10,0.30)",
              border: "1px solid var(--lib-line)",
            }}
          >
            <h3
              id="bulk-delete-title"
              style={{
                fontFamily: "var(--lib-serif)",
                fontWeight: 500,
                fontSize: 20,
                letterSpacing: "-0.015em",
                color: "var(--lib-ink)",
                margin: "0 0 8px",
              }}
            >
              Remove {selected.size} {selected.size === 1 ? "disc" : "discs"}?
            </h3>
            <p
              style={{
                fontFamily: "var(--lib-sans)",
                fontSize: 13.5,
                lineHeight: 1.55,
                color: "var(--lib-ink-2)",
                margin: "0 0 20px",
              }}
            >
              Choose how you want to remove {selected.size === 1 ? "this memory" : "these memories"}.
            </p>

            {/* Option 1 — safe remove */}
            <button
              type="button"
              onClick={() => void handleBulkRemove()}
              disabled={bulkDeleting}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "var(--lib-surface)",
                border: "1px solid var(--lib-line)",
                borderRadius: 14,
                padding: "16px 18px",
                marginBottom: 10,
                cursor: bulkDeleting ? "default" : "pointer",
                opacity: bulkDeleting ? 0.6 : 1,
                transition: "background .15s ease",
              }}
              onMouseEnter={(e) => { if (!bulkDeleting) (e.currentTarget as HTMLButtonElement).style.background = "var(--lib-paper-2)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--lib-surface)"; }}
            >
              <div
                style={{
                  fontFamily: "var(--lib-sans)",
                  fontWeight: 600,
                  fontSize: 14,
                  color: "var(--lib-ink)",
                  marginBottom: 4,
                }}
              >
                {bulkDeleting ? "Removing…" : "Remove from Heirvo"}
              </div>
              <div
                style={{
                  fontFamily: "var(--lib-sans)",
                  fontSize: 12.5,
                  lineHeight: 1.45,
                  color: "var(--lib-muted)",
                }}
              >
                Removes {selected.size === 1 ? "the disc" : "the discs"} from this app. Video files stay saved in your Documents &rsaquo; Heirvo folder.
              </div>
            </button>

            {/* Option 2 — permanent delete */}
            <button
              type="button"
              onClick={() => { setBulkDeleteErr(null); setBulkPermanentConfirmOpen(true); }}
              disabled={bulkDeleting}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: "1px solid var(--lib-line)",
                borderRadius: 14,
                padding: "16px 18px",
                marginBottom: 20,
                cursor: bulkDeleting ? "default" : "pointer",
                opacity: bulkDeleting ? 0.5 : 1,
                transition: "background .15s ease",
              }}
              onMouseEnter={(e) => { if (!bulkDeleting) (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.04)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <div
                style={{
                  fontFamily: "var(--lib-sans)",
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#b91c1c",
                  marginBottom: 4,
                }}
              >
                Delete permanently from my computer
              </div>
              <div
                style={{
                  fontFamily: "var(--lib-sans)",
                  fontSize: 12.5,
                  lineHeight: 1.45,
                  color: "var(--lib-muted)",
                }}
              >
                Removes {selected.size === 1 ? "the disc" : "the discs"} from this app AND deletes the video files from your Documents &rsaquo; Heirvo folder. This cannot be undone.
              </div>
            </button>

            {bulkDeleteErr && (
              <p
                style={{
                  fontFamily: "var(--lib-sans)",
                  fontSize: 12.5,
                  color: "#b91c1c",
                  margin: "-12px 0 14px",
                }}
              >
                {bulkDeleteErr}
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => { setBulkDeleteOpen(false); setBulkDeleteErr(null); }}
                disabled={bulkDeleting}
                style={{
                  background: "transparent",
                  border: "1px solid var(--lib-line)",
                  borderRadius: 10,
                  padding: "8px 18px",
                  fontFamily: "var(--lib-sans)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--lib-ink-2)",
                  cursor: bulkDeleting ? "default" : "pointer",
                  opacity: bulkDeleting ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk permanent-delete second-step confirm */}
      {bulkDeleteOpen && bulkPermanentConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-perm-delete-title"
        >
          <div
            style={{
              background: "var(--lib-paper)",
              borderRadius: 20,
              width: "100%",
              maxWidth: 400,
              padding: "28px 28px 24px",
              boxShadow: "0 32px 80px rgba(30,20,10,0.30)",
              border: "1px solid rgba(185,28,28,0.25)",
            }}
          >
            <h3
              id="bulk-perm-delete-title"
              style={{
                fontFamily: "var(--lib-serif)",
                fontWeight: 500,
                fontSize: 20,
                letterSpacing: "-0.015em",
                color: "var(--lib-ink)",
                margin: "0 0 10px",
              }}
            >
              Delete permanently?
            </h3>
            <p
              style={{
                fontFamily: "var(--lib-sans)",
                fontSize: 13.5,
                lineHeight: 1.6,
                color: "var(--lib-ink-2)",
                margin: "0 0 22px",
              }}
            >
              This will permanently delete <strong style={{ color: "var(--lib-ink)" }}>{selected.size} {selected.size === 1 ? "disc" : "discs"}</strong> from your computer — including the video files in your Documents &rsaquo; Heirvo folder.{" "}
              <strong style={{ color: "#b91c1c" }}>This cannot be undone.</strong>
            </p>

            {bulkDeleteErr && (
              <p
                style={{
                  fontFamily: "var(--lib-sans)",
                  fontSize: 12.5,
                  color: "#b91c1c",
                  margin: "-10px 0 16px",
                }}
              >
                {bulkDeleteErr}
              </p>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => { setBulkPermanentConfirmOpen(false); setBulkDeleteErr(null); }}
                disabled={bulkDeleting}
                style={{
                  background: "transparent",
                  border: "1px solid var(--lib-line)",
                  borderRadius: 10,
                  padding: "8px 18px",
                  fontFamily: "var(--lib-sans)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--lib-ink-2)",
                  cursor: bulkDeleting ? "default" : "pointer",
                  opacity: bulkDeleting ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleBulkDeletePermanently()}
                disabled={bulkDeleting}
                style={{
                  background: bulkDeleting ? "rgba(185,28,28,0.6)" : "#b91c1c",
                  border: "none",
                  borderRadius: 10,
                  padding: "8px 18px",
                  fontFamily: "var(--lib-sans)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#fff",
                  cursor: bulkDeleting ? "default" : "pointer",
                  transition: "background .15s ease",
                }}
                onMouseEnter={(e) => { if (!bulkDeleting) (e.currentTarget as HTMLButtonElement).style.background = "#991b1b"; }}
                onMouseLeave={(e) => { if (!bulkDeleting) (e.currentTarget as HTMLButtonElement).style.background = "#b91c1c"; }}
              >
                {bulkDeleting ? "Deleting…" : `Yes, delete ${selected.size} permanently`}
              </button>
            </div>
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

/* ─── Filter tabs ─────────────────────────────────────────────────────────── */
type FilterKind = "all" | "albums" | "imported" | "video" | "audio" | "photo" | "disc";

function FilterTabs({
  filter,
  setFilter,
  counts,
  selectMode,
  onToggleSelectMode,
  showSelectToggle,
}: {
  filter: FilterKind;
  setFilter: (k: FilterKind) => void;
  counts: Record<FilterKind, number>;
  selectMode: boolean;
  onToggleSelectMode: () => void;
  showSelectToggle: boolean;
}) {
  const tabs: Array<{ key: FilterKind; label: string }> = [
    { key: "all", label: "All" },
    { key: "albums", label: "Albums" },
    { key: "video", label: "Videos" },
    { key: "photo", label: "Photos" },
    { key: "audio", label: "Audio" },
    { key: "disc", label: "Recovered discs" },
    { key: "imported", label: "All imports" },
  ];
  return (
    <div
      style={{
        marginTop: 28,
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        padding: "10px 0 6px",
        borderBottom: "1px solid var(--lib-line)",
        alignItems: "center",
      }}
    >
      {tabs.map((t) => {
        const active = filter === t.key;
        const n = counts[t.key];
        // Hide tabs with no content (except "all", which always shows).
        if (n === 0 && t.key !== "all") return null;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            style={{
              padding: "7px 12px",
              borderRadius: 999,
              border: "1px solid",
              borderColor: active ? "var(--lib-ink)" : "transparent",
              background: active ? "var(--lib-ink)" : "transparent",
              color: active ? "#fff" : "var(--lib-ink-2)",
              fontFamily: "var(--lib-sans)",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              transition: "background .15s ease, color .15s ease",
            }}
          >
            {t.label}
            <span
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 11,
                color: active ? "rgba(255,255,255,.7)" : "var(--lib-muted)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {n}
            </span>
          </button>
        );
      })}
      {showSelectToggle && (
        <button
          type="button"
          onClick={onToggleSelectMode}
          style={{
            marginLeft: "auto",
            padding: "7px 12px",
            borderRadius: 999,
            border: "1px solid",
            borderColor: selectMode ? "var(--lib-amber, #b45309)" : "var(--lib-line)",
            background: selectMode ? "rgba(180,83,9,.08)" : "transparent",
            color: selectMode ? "var(--lib-amber, #b45309)" : "var(--lib-ink-2)",
            fontFamily: "var(--lib-sans)",
            fontSize: 12.5,
            fontWeight: 500,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            transition: "background .15s ease, color .15s ease, border-color .15s ease",
          }}
        >
          {selectMode ? "Cancel" : "Select"}
        </button>
      )}
    </div>
  );
}

/* ─── Flat filtered grid ──────────────────────────────────────────────────── */
function FilteredGrid({
  discs,
  filter,
  selectMode,
  selected,
  onToggleDisc,
  onRequestBulkDelete,
  onCancelSelect,
}: {
  discs: Disc[];
  filter: FilterKind;
  selectMode: boolean;
  selected: Set<string>;
  onToggleDisc: (id: string) => void;
  onRequestBulkDelete: () => void;
  onCancelSelect: () => void;
}) {
  if (discs.length === 0) {
    return (
      <div
        style={{
          marginTop: 64,
          padding: "60px 24px",
          textAlign: "center",
          color: "var(--lib-muted)",
          fontFamily: "var(--lib-serif)",
          fontStyle: "italic",
          fontSize: 16,
        }}
      >
        Nothing in this section yet — try importing some {filter === "all" ? "media" : filter}.
      </div>
    );
  }

  return (
    <section style={{ marginTop: 32, paddingBottom: selectMode ? 80 : 0 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 22,
        }}
      >
        {discs.map((d) => {
          const isSelected = selected.has(d.id);
          if (!selectMode) {
            return (
              <DiscCard
                key={d.id}
                disc={d}
                showStatus={false}
                showSource={true}
              />
            );
          }
          // In select mode: wrap card in a div that intercepts clicks.
          return (
            <div
              key={d.id}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onToggleDisc(d.id)}
              onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") onToggleDisc(d.id); }}
              style={{
                position: "relative",
                cursor: "pointer",
                borderRadius: 16,
                outline: isSelected ? "2.5px solid var(--lib-amber, #b45309)" : "2.5px solid transparent",
                transition: "outline-color .15s ease",
              }}
            >
              {/* Click-catching overlay above DiscCard. MUST keep pointerEvents:
                  "auto" — with "none" the click falls through to the <Link> inside
                  DiscCard and the page navigates instead of toggling selection. */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 10,
                  borderRadius: 16,
                  pointerEvents: "auto",
                  cursor: "pointer",
                }}
              />
              <DiscCard disc={d} showStatus={false} showSource={true} />
              {/* Checkbox indicator top-left */}
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  zIndex: 11,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: "2px solid",
                  borderColor: isSelected ? "var(--lib-amber, #b45309)" : "rgba(255,255,255,.9)",
                  background: isSelected ? "var(--lib-amber, #b45309)" : "rgba(0,0,0,.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 1px 4px rgba(0,0,0,.3)",
                  backdropFilter: "blur(4px)",
                  transition: "background .15s ease, border-color .15s ease",
                  pointerEvents: "none",
                }}
              >
                {isSelected && (
                  <svg width="12" height="9" viewBox="0 0 12 9" fill="none" aria-hidden>
                    <path d="M1 4L4.5 7.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Floating bottom toolbar — visible only in select mode */}
      {selectMode && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(30,30,30,.96)",
            backdropFilter: "blur(12px)",
            borderRadius: 999,
            padding: "10px 18px",
            boxShadow: "0 4px 24px rgba(0,0,0,.35)",
            fontFamily: "var(--lib-sans)",
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,.7)",
              fontVariantNumeric: "tabular-nums",
              minWidth: 80,
            }}
          >
            {selected.size === 0 ? "None selected" : `${selected.size} selected`}
          </span>
          <button
            type="button"
            onClick={onCancelSelect}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.2)",
              background: "transparent",
              color: "rgba(255,255,255,.85)",
              fontFamily: "var(--lib-sans)",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={onRequestBulkDelete}
            style={{
              padding: "6px 16px",
              borderRadius: 999,
              border: "none",
              background: selected.size === 0 ? "rgba(255,255,255,.15)" : "#e53e3e",
              color: "#fff",
              fontFamily: "var(--lib-sans)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: selected.size === 0 ? "default" : "pointer",
              opacity: selected.size === 0 ? 0.5 : 1,
              transition: "background .15s ease, opacity .15s ease",
            }}
          >
            Delete {selected.size > 0 ? selected.size : ""} selected
          </button>
        </div>
      )}
    </section>
  );
}

/* ─── Album grid ──────────────────────────────────────────────────────────── */
function AlbumGrid({ albums }: { albums: Album[] }) {
  if (albums.length === 0) {
    return (
      <div
        style={{
          marginTop: 64,
          padding: "60px 24px",
          textAlign: "center",
          color: "var(--lib-muted)",
          fontFamily: "var(--lib-serif)",
          fontStyle: "italic",
          fontSize: 16,
        }}
      >
        No albums yet — drop a folder of photos onto the library to create one.
      </div>
    );
  }
  return (
    <section style={{ marginTop: 32 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 22,
        }}
      >
        {albums.map((a) => (
          <AlbumCard key={a.id} album={a} />
        ))}
      </div>
    </section>
  );
}

/* ─── Album card — 2x2 collage cover ──────────────────────────────────────── */
function AlbumCard({ album }: { album: Album }) {
  // Fetch up to 4 disc thumbnails for the collage cover. Lazy — only runs
  // when this card mounts, so a 50-album library doesn't fire 200 IPCs at once.
  const [thumbs, setThumbs] = useState<Array<string | null>>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const full = await ipc.albums.get(album.id);
        if (!full || cancelled) return;
        const firstFour = full.discs.slice(0, 4);
        const paths = await Promise.all(
          firstFour.map(async (d) => {
            try {
              const p = await ipc.library.ensureDiscThumbnail(d.id);
              return p ? convertFileSrc(p) : null;
            } catch {
              return null;
            }
          }),
        );
        if (!cancelled) setThumbs(paths);
      } catch {/* ignore */}
    })();
    return () => { cancelled = true; };
  }, [album.id]);

  const cells = [0, 1, 2, 3]; // always 4 cells; missing thumbs render as gradient

  return (
    <Link
      to={`/album/${album.id}`}
      className="lib-card"
      style={{
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
        transition: "transform .25s ease",
        display: "block",
      }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: "4 / 3",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "var(--lib-shadow-soft)",
          background: "linear-gradient(135deg, #0a84ff 0%, #5ac8fa 100%)",
          position: "relative",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 2,
        }}
      >
        {cells.map((i) => (
          <div
            key={i}
            style={{
              background: "rgba(255,255,255,0.06)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {thumbs[i] && (
              <img
                src={thumbs[i] as string}
                alt=""
                aria-hidden
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            )}
          </div>
        ))}
        {/* Count badge */}
        <span
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            background: "rgba(0,0,0,.65)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 9px",
            borderRadius: 999,
            backdropFilter: "blur(8px)",
          }}
        >
          {album.discCount} item{album.discCount === 1 ? "" : "s"}
        </span>
      </div>
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
        {album.title}
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: "var(--lib-muted)",
          marginLeft: 2,
        }}
      >
        Album · {new Date(album.updatedAt * 1000).toLocaleDateString()}
      </div>
    </Link>
  );
}
