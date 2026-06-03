import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ipc } from "@/lib/ipc";
import type { Session, SessionStatus } from "@/lib/types";
import {
  Trash2,
  ChevronRight,
  Pencil,
  Check,
  Library as LibraryIcon,
  Sparkles,
  Disc3,
} from "lucide-react";
import { cn } from "@/lib/cn";

// ─────────────────────────────────────────────────────────────────────────────
// Grouping helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Stable key for a disc — fingerprint when available, label as fallback. */
function discKey(s: Session): string {
  return s.disc_fingerprint ? `fp:${s.disc_fingerprint}` : `lbl:${s.disc_label}`;
}

/**
 * Status rank — higher = more advanced/useful. Used to pick the representative
 * session from a group: prefer completed, then in-progress, then newest.
 */
const STATUS_RANK: Record<SessionStatus, number> = {
  completed: 6,
  recovering: 5,
  scanning: 4,
  paused: 3,
  failed: 2,
  cancelled: 1,
  created: 0,
};

interface DiscGroup {
  key: string;
  /** The session shown as the primary row. */
  primary: Session;
  /** All sessions in the group, including primary. */
  all: Session[];
}

function groupSessions(sessions: Session[]): DiscGroup[] {
  const map = new Map<string, Session[]>();
  for (const s of sessions) {
    const k = discKey(s);
    const arr = map.get(k) ?? [];
    arr.push(s);
    map.set(k, arr);
  }

  const groups: DiscGroup[] = [];
  for (const [key, arr] of map) {
    // Sort: highest rank first, then newest created_at first.
    const sorted = [...arr].sort((a, b) => {
      const rankDiff = STATUS_RANK[b.status] - STATUS_RANK[a.status];
      if (rankDiff !== 0) return rankDiff;
      return b.created_at - a.created_at;
    });
    groups.push({ key, primary: sorted[0], all: sorted });
  }

  // Sort groups by the primary session's updated_at (most recent first).
  groups.sort((a, b) => b.primary.updated_at - a.primary.updated_at);
  return groups;
}

/**
 * Sessions eligible for "Clear empty attempts" pruning:
 * - status === "created" (never actually started)
 * - NOT the only/primary session for their disc group
 * - NOT a completed or in-progress session
 */
function prunableSessions(sessions: Session[]): Session[] {
  const groups = groupSessions(sessions);
  const primaryIds = new Set(groups.map((g) => g.primary.id));
  return sessions.filter(
    (s) => s.status === "created" && !primaryIds.has(s.id),
  );
}

export function SessionHistory() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pruning, setPruning] = useState(false);

  const refresh = async () => setSessions(await ipc.listSessions());

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, []);

  const prunable = prunableSessions(sessions);
  const groups = groupSessions(sessions);

  const clearEmptyAttempts = async () => {
    if (pruning) return;
    if (
      !confirm(
        `Remove ${prunable.length} abandoned attempt${prunable.length === 1 ? "" : "s"} that were never started? Completed and in-progress sessions are not affected.`,
      )
    )
      return;
    setPruning(true);
    try {
      await Promise.all(prunable.map((s) => ipc.deleteSession(s.id)));
      await refresh();
    } finally {
      setPruning(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-10 py-8">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header className="mb-8">
        {/* Eyebrow */}
        <p
          className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ fontFamily: "var(--db-sans)", color: "var(--db-amber)" }}
        >
          Your Archive
        </p>

        {/* Title */}
        <h1
          className="text-[32px] font-semibold leading-tight tracking-[-0.02em]"
          style={{ fontFamily: "var(--db-serif)", color: "var(--db-text)" }}
        >
          My Discs
        </h1>

        {/* Sub-row: description + prune button */}
        <div className="mt-2 flex items-center justify-between gap-4">
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: "var(--db-text-muted)" }}
          >
            Every disc you've rescued, in the order you rescued them.
          </p>
          {prunable.length > 0 && (
            <button
              type="button"
              onClick={clearEmptyAttempts}
              disabled={pruning}
              className="shrink-0 text-[12px] underline underline-offset-2 transition-colors disabled:opacity-50"
              style={{
                fontFamily: "var(--db-sans)",
                color: "var(--db-text-faint)",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color =
                  "var(--db-amber)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color =
                  "var(--db-text-faint)")
              }
            >
              {pruning
                ? "Clearing…"
                : `Clear ${prunable.length} empty attempt${prunable.length === 1 ? "" : "s"}`}
            </button>
          )}
        </div>
      </header>

      {/* ── List / empty state ──────────────────────────────────────────── */}
      {groups.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map((g) => (
            <SessionRow
              key={g.key}
              session={g.primary}
              attemptCount={g.all.length}
              onDelete={async () => {
                const label = g.primary.user_label ?? g.primary.disc_label;
                if (!confirm(`Delete "${label}"?`)) return;
                await ipc.deleteSession(g.primary.id);
                refresh();
              }}
              onRenamed={refresh}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center rounded-2xl px-8 py-14 text-center"
      style={{
        background: "var(--db-surface)",
        border: "1px solid var(--db-border)",
        boxShadow: "var(--db-shadow)",
      }}
    >
      <EmptyMark />
      <h2
        className="mt-5 text-[20px] font-semibold leading-snug tracking-[-0.02em]"
        style={{ fontFamily: "var(--db-serif)", color: "var(--db-text)" }}
      >
        No discs rescued yet.
      </h2>
      <p
        className="mt-2 max-w-sm text-[13px] leading-relaxed"
        style={{ color: "var(--db-text-muted)" }}
      >
        When you're ready, pop one in. We'll meet you here with everything you
        save.
      </p>
      <Link to="/wizard" className="btn btn-primary mt-6">
        Rescue your first disc
      </Link>
    </div>
  );
}

/**
 * Warm SVG illustration: a gentle disc with a soft amber halo and subtle
 * concentric rings — feels archival rather than clinical.
 */
function EmptyMark() {
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden>
      <defs>
        <radialGradient id="es-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--db-amber)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--db-amber)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="es-disc" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="var(--db-amber)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--db-amber)" stopOpacity="0.45" />
        </radialGradient>
      </defs>
      {/* Halo */}
      <circle cx="42" cy="42" r="42" fill="url(#es-halo)" />
      {/* Disc body */}
      <circle cx="42" cy="42" r="26" fill="url(#es-disc)" />
      {/* Concentric track rings */}
      <circle cx="42" cy="42" r="22" fill="none" stroke="var(--db-base)" strokeOpacity="0.35" strokeWidth="0.7" />
      <circle cx="42" cy="42" r="17" fill="none" stroke="var(--db-base)" strokeOpacity="0.25" strokeWidth="0.7" />
      <circle cx="42" cy="42" r="12" fill="none" stroke="var(--db-base)" strokeOpacity="0.2" strokeWidth="0.7" />
      {/* Hub */}
      <circle cx="42" cy="42" r="5.5" fill="var(--db-surface)" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Session row (one per disc group)
// ─────────────────────────────────────────────────────────────────────────────

function SessionRow({
  session: s,
  attemptCount = 1,
  onDelete,
  onRenamed,
}: {
  session: Session;
  /** Total number of sessions for this disc (including the primary). */
  attemptCount?: number;
  onDelete: () => void;
  onRenamed: () => void;
}) {
  const nav = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollMsg, setEnrollMsg] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const enrollToLibrary = async () => {
    if (enrolling) return;
    setEnrolling(true);
    setEnrollMsg(null);
    try {
      const dialog = await import("@tauri-apps/plugin-dialog");
      const picked = await dialog.open({
        multiple: false,
        directory: false,
        defaultPath: s.output_dir,
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
      if (!picked || typeof picked !== "string") {
        setEnrolling(false);
        return;
      }
      const title = s.user_label || s.disc_label || "Recovered disc";
      const result = await ipc.library.importMedia(picked, title);
      if (result.isDuplicate) {
        setEnrollMsg("This disc is already in your library.");
        setTimeout(() => setEnrollMsg(null), 4000);
      } else {
        try {
          await ipc.transcription.enqueue(result.id, picked);
        } catch {
          // Non-fatal — user can retry from the disc page.
        }
      }
      nav(`/disc/${result.id}`);
    } catch {
      setEnrollMsg("Save this disc as MP4 first (Save As… screen).");
      setTimeout(() => setEnrollMsg(null), 4500);
    } finally {
      setEnrolling(false);
    }
  };

  const startRename = () => {
    setDraft(s.user_label ?? s.disc_label ?? "");
    setRenaming(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitRename = async () => {
    setRenaming(false);
    await ipc.renameSession(s.id, draft);
    onRenamed();
  };

  const updated = new Date(s.updated_at * 1000);
  const dateText = updated.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeText = updated.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const gb = ((s.total_sectors * 2048) / 1024 / 1024 / 1024).toFixed(2);
  const displayLabel = s.user_label || s.disc_label || "Untitled disc";

  return (
    <li
      className="group flex items-center gap-4 rounded-xl px-4 py-4 transition-all"
      style={{
        background: hovered ? "var(--db-surface-2)" : "var(--db-surface)",
        border: hovered
          ? "1px solid var(--db-amber-glow)"
          : "1px solid var(--db-border)",
        boxShadow: hovered
          ? "var(--db-shadow), 0 0 0 1px var(--db-amber-glow)"
          : "var(--db-shadow)",
        transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
        transitionDuration: "220ms",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Disc avatar ───────────────────────────────────────────────── */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{
          background: "var(--db-amber-light)",
          border: "1px solid var(--db-border-soft)",
        }}
      >
        <Disc3
          className="h-5 w-5"
          style={{ color: "var(--db-amber)" }}
          strokeWidth={1.5}
        />
      </div>

      {/* ── Date / attempts column ────────────────────────────────────── */}
      <div className="w-24 shrink-0">
        <div
          className="text-[13px] font-medium tabular-nums"
          style={{ fontFamily: "var(--db-sans)", color: "var(--db-text)" }}
        >
          {dateText}
        </div>
        <div
          className="text-[11px] tabular-nums"
          style={{ color: "var(--db-text-faint)" }}
        >
          {timeText}
        </div>
        {attemptCount > 1 && (
          <div
            className="mt-0.5 text-[10px]"
            style={{ color: "var(--db-text-faint)" }}
          >
            · {attemptCount} attempts
          </div>
        )}
      </div>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        {renaming ? (
          <div className="flex items-center gap-2">
            <StatusDot status={s.status} />
            <input
              ref={inputRef}
              className="flex-1 rounded-lg px-2 py-0.5 text-[15px] font-medium outline-none"
              style={{
                fontFamily: "var(--db-sans)",
                background: "var(--db-base)",
                border: "1px solid var(--db-amber)",
                color: "var(--db-text)",
                boxShadow: "0 0 0 3px var(--db-amber-glow)",
              }}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenaming(false);
              }}
              autoFocus
            />
            <button
              className="rounded-lg p-1.5 transition-colors"
              style={{ color: "var(--db-green)" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "var(--db-green-light)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "transparent")
              }
              onClick={commitRename}
              title="Save name"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Link
              to={`/session/${s.id}`}
              className="inline-flex items-center gap-1.5 text-[15px] font-medium transition-colors"
              style={{ fontFamily: "var(--db-sans)", color: "var(--db-text)" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color =
                  "var(--db-amber)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color =
                  "var(--db-text)")
              }
            >
              <StatusDot status={s.status} />
              <span className="truncate">{displayLabel}</span>
              <ChevronRight
                className="h-4 w-4 -translate-x-0.5 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100"
                style={{ color: "var(--db-amber)" }}
              />
            </Link>
            <button
              className="rounded p-0.5 opacity-0 transition group-hover:opacity-100"
              style={{ color: "var(--db-text-faint)" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color =
                  "var(--db-text-muted)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color =
                  "var(--db-text-faint)")
              }
              onClick={startRename}
              title="Rename session"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Metadata row */}
        <div
          className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px]"
          style={{ color: "var(--db-text-faint)" }}
        >
          <span className="capitalize">{s.status}</span>
          <span style={{ color: "var(--db-border)" }}>·</span>
          <span className="tabular-nums">Pass {s.current_pass || 0}</span>
          <span style={{ color: "var(--db-border)" }}>·</span>
          <span className="tabular-nums">{gb} GB</span>
          <span style={{ color: "var(--db-border)" }}>·</span>
          <span className="tabular-nums">
            {s.total_sectors.toLocaleString()} sectors
          </span>
        </div>

        {/* Output path */}
        <div
          className="mt-0.5 truncate text-[11px]"
          style={{
            fontFamily: "var(--db-sans)",
            fontVariantNumeric: "tabular-nums",
            color: "var(--db-text-faint)",
            opacity: 0.7,
          }}
        >
          {s.output_dir}
        </div>
      </div>

      {/* ── Enroll to library (completed only) ───────────────────────── */}
      {s.status === "completed" && (
        <div className="flex flex-col items-end gap-0.5">
          <button
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium opacity-0 transition-all group-hover:opacity-100 disabled:opacity-50"
            style={{
              fontFamily: "var(--db-sans)",
              background: "var(--db-surface-2)",
              border: "1px solid var(--db-border)",
              color: "var(--db-text-muted)",
              transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
            }}
            onMouseEnter={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.borderColor = "var(--db-amber)";
              btn.style.background = "var(--db-amber-light)";
              btn.style.color = "var(--db-amber)";
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.borderColor = "var(--db-border)";
              btn.style.background = "var(--db-surface-2)";
              btn.style.color = "var(--db-text-muted)";
            }}
            onClick={enrollToLibrary}
            disabled={enrolling}
            title="Add the recovered file to your library and transcribe it"
          >
            <LibraryIcon className="h-3.5 w-3.5" />
            <Sparkles className="h-3.5 w-3.5" />
            {enrolling ? "Adding…" : "Add to Library + transcribe"}
          </button>
          {enrollMsg && (
            <span
              className="text-[11px]"
              style={{ color: "var(--db-text-faint)" }}
              role="status"
            >
              {enrollMsg}
            </span>
          )}
        </div>
      )}

      {/* ── Delete button ─────────────────────────────────────────────── */}
      <button
        className="rounded-lg p-2 opacity-0 transition-all group-hover:opacity-100"
        style={{
          color: "var(--db-text-faint)",
          transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
        }}
        onMouseEnter={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.background = "color-mix(in srgb, var(--db-red) 12%, transparent)";
          btn.style.color = "var(--db-red)";
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.background = "transparent";
          btn.style.color = "var(--db-text-faint)";
        }}
        onClick={onDelete}
        title="Delete session"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status dot — tokenized, pulse preserved
// ─────────────────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: SessionStatus }) {
  // Map statuses to CSS variable tokens
  const map: Record<SessionStatus, { color: string; pulse?: boolean }> = {
    created:   { color: "var(--db-text-faint)" },
    scanning:  { color: "var(--db-amber)",      pulse: true },
    recovering:{ color: "var(--db-green)",       pulse: true },
    paused:    { color: "var(--db-amber)" },
    completed: { color: "var(--db-green)" },
    failed:    { color: "var(--db-red)" },
    cancelled: { color: "var(--db-text-faint)" },
  };
  const { color, pulse } = map[status];
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
          )}
          style={{ background: color }}
        />
      )}
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ background: color }}
      />
    </span>
  );
}
