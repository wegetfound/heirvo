import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Trash2, Pencil, Star } from "lucide-react";
import { ipc } from "../../lib/ipc";
import type { AlbumWithDiscs } from "../../lib/types";
import { DiscCard } from "./components/DiscCard";

export default function AlbumDetail() {
  const { albumId } = useParams<{ albumId: string }>();
  const nav = useNavigate();
  const [album, setAlbum] = useState<AlbumWithDiscs | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!albumId) return;
    let cancelled = false;
    (async () => {
      try {
        const a = await ipc.albums.get(albumId);
        if (!cancelled) setAlbum(a);
      } catch (e) {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [albumId]);

  async function saveRename() {
    if (!albumId || !newTitle.trim()) {
      setEditing(false);
      return;
    }
    try {
      await ipc.albums.rename(albumId, newTitle.trim());
      setAlbum((a) => (a ? { ...a, title: newTitle.trim() } : a));
    } catch {/* ignore — keep old title */}
    setEditing(false);
  }

  async function handleSetCover(discId: string) {
    if (!albumId) return;
    try {
      await ipc.albums.setCover(albumId, discId);
      setAlbum((a) => (a ? { ...a, coverDiscId: discId } : a));
    } catch {/* ignore — keep current cover */}
  }

  async function confirmDelete(deleteMembers: boolean) {
    if (!albumId) return;
    setDeleting(true);
    try {
      const r = await ipc.albums.delete(albumId, deleteMembers);
      const note = deleteMembers
        ? `Removed album · freed ${(r.bytesFreed / 1024 / 1024 / 1024).toFixed(2)} GB`
        : `Ungrouped album · ${r.membersRemoved === 0 ? "files kept" : ""}`;
      try { sessionStorage.setItem("lib_toast", note); } catch {/* private */}
      nav("/library");
    } catch (e) {
      setDeleting(false);
      setLoadErr(e instanceof Error ? e.message : String(e));
    }
  }

  if (loadErr) {
    return (
      <div className="lib-root">
        <div className="lib-container" style={{ padding: "64px 32px" }}>
          <p style={{ color: "var(--lib-muted)" }}>Couldn't load album: {loadErr}</p>
          <Link to="/library/browse" style={{ color: "var(--lib-amber)" }}>← Back to library</Link>
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="lib-root">
        <div className="lib-container" style={{ padding: "64px 32px" }}>
          <p style={{ color: "var(--lib-muted)" }}>Loading album…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lib-root">
      <div className="lib-container" style={{ paddingTop: 20 }}>
        <button
          type="button"
          onClick={() => nav("/library")}
          style={{
            background: "transparent",
            border: 0,
            color: "var(--lib-ink-2)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            fontFamily: "var(--lib-sans)",
            fontSize: 13,
            padding: "8px 0 16px",
          }}
        >
          <ChevronLeft size={14} /> Library
        </button>

        {/* Album header */}
        <header style={{ marginBottom: 32, display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{
              fontFamily: "var(--lib-sans)",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--lib-muted)",
              fontWeight: 600,
              marginBottom: 8,
            }}>
              Album · {album.discCount} item{album.discCount === 1 ? "" : "s"}
            </div>
            {editing ? (
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onBlur={saveRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveRename();
                  if (e.key === "Escape") setEditing(false);
                }}
                style={{
                  fontFamily: "var(--lib-serif)",
                  fontSize: 38,
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  color: "var(--lib-ink)",
                  border: 0,
                  borderBottom: "2px solid var(--lib-amber)",
                  outline: "none",
                  background: "transparent",
                  width: "100%",
                  maxWidth: 560,
                  padding: "2px 0",
                }}
              />
            ) : (
              <h1 style={{
                fontFamily: "var(--lib-serif)",
                fontSize: 38,
                fontWeight: 400,
                letterSpacing: "-0.02em",
                margin: "0 0 6px",
                color: "var(--lib-ink)",
                lineHeight: 1.1,
              }}>
                {album.title}
              </h1>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setNewTitle(album.title);
                setEditing(true);
              }}
              className="lib-btn lib-btn-ghost"
              title="Rename album"
            >
              <Pencil size={13} /> Rename
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="lib-btn lib-btn-ghost"
              style={{ color: "var(--lib-amber, #b45309)" }}
              title="Delete album (ungroup or fully remove)"
            >
              <Trash2 size={13} /> Delete album
            </button>
          </div>
        </header>

        {album.discs.length === 0 ? (
          <div style={{
            padding: "60px 24px",
            textAlign: "center",
            color: "var(--lib-muted)",
            fontFamily: "var(--lib-serif)",
            fontStyle: "italic",
            fontSize: 16,
          }}>
            This album is empty. Drag files onto the library to add them.
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 22,
            paddingBottom: 60,
          }}>
            {album.discs.map((d) => {
              const isCover = album.coverDiscId === d.id;
              return (
                <div
                  key={d.id}
                  style={{ position: "relative" }}
                  className="album-member-card"
                >
                  <DiscCard disc={d as any} showStatus={false} showSource={false} />
                  {/* Cover-picker button — always visible if current cover,
                      else fades in on hover (via CSS in the parent class). */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isCover) void handleSetCover(d.id);
                    }}
                    aria-label={isCover ? "Album cover" : "Set as album cover"}
                    title={isCover ? "Current album cover" : "Set as album cover"}
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      border: "none",
                      background: isCover ? "var(--lib-amber, #b45309)" : "rgba(0,0,0,.55)",
                      color: "#fff",
                      cursor: isCover ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backdropFilter: "blur(8px)",
                      zIndex: 5,
                      opacity: isCover ? 1 : 0,
                      transition: "opacity .2s ease, background .15s ease",
                      boxShadow: isCover ? "0 2px 8px rgba(180,83,9,.4)" : "0 1px 4px rgba(0,0,0,.3)",
                    }}
                  >
                    <Star
                      size={15}
                      fill={isCover ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth={2}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* CSS for hover-reveal of the cover button (everything else is inline) */}
        <style>{`
          .album-member-card:hover > button { opacity: 1 !important; }
          .album-member-card:focus-within > button { opacity: 1 !important; }
        `}</style>
      </div>

      {/* Delete-album confirm modal */}
      {deleteOpen && album && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl p-6">
            <h3 className="font-display text-[18px] font-bold tracking-[-0.01em] text-ink-900">
              Delete album “{album.title}”?
            </h3>
            <p className="mt-2 text-[13.5px] leading-[1.55] text-ink-600">
              Choose what happens to the {album.discCount} items inside:
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void confirmDelete(false)}
                disabled={deleting}
                className="rounded-xl border border-ink-200 px-4 py-3 text-left text-[13px] font-medium text-ink-900 hover:bg-ink-50 disabled:opacity-50"
              >
                <span className="block font-semibold">Ungroup — keep items in library</span>
                <span className="block text-[12px] font-normal text-ink-500 mt-0.5">
                  Album cover goes away; each item becomes a loose library entry.
                </span>
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete(true)}
                disabled={deleting}
                className="rounded-xl bg-ios-red px-4 py-3 text-left text-[13px] font-medium text-white hover:bg-red-500 disabled:opacity-60"
              >
                <span className="block font-semibold">Delete album AND all items</span>
                <span className="block text-[12px] font-normal text-white/80 mt-0.5">
                  Removes the album and deletes every file from your vault.
                </span>
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="rounded-xl border border-ink-200 px-4 py-2 text-[13px] font-medium text-ink-700 transition hover:bg-ink-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
