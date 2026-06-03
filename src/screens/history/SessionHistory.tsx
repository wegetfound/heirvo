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
    <div className="mx-auto max-w-4xl px-10 py-6">
      <header className="mb-5">
        <span className="eyebrow">Your archive</span>
        <h1 className="mt-1.5 font-display text-[24px] font-semibold tracking-[-0.025em] text-ink-900">
          My Discs
        </h1>
        <div className="mt-1 flex items-center justify-between gap-4">
          <p className="text-[13px] text-ink-500">
            Every disc you've rescued, in the order you rescued them.
          </p>
          {prunable.length > 0 && (
            <button
              type="button"
              onClick={clearEmptyAttempts}
              disabled={pruning}
              className="shrink-0 text-[12px] text-ink-400 underline underline-offset-2 transition hover:text-ink-600 disabled:opacity-50"
            >
              {pruning ? "Clearing…" : `Clear ${prunable.length} empty attempt${prunable.length === 1 ? "" : "s"}`}
            </button>
          )}
        </div>
      </header>

      {groups.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="divide-y divide-ink-200/70 border-y border-ink-200/70">
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

function EmptyState() {
  return (
    <div className="card flex flex-col items-center px-8 py-10 text-center">
      <EmptyMark />
      <h2 className="mt-4 font-display text-[18px] font-semibold tracking-tightish text-ink-900">
        No discs rescued yet.
      </h2>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-500">
        When you're ready, pop one in. We'll meet you here with everything you
        save.
      </p>
      <Link to="/wizard" className="btn btn-primary mt-5">
        Rescue your first disc
      </Link>
    </div>
  );
}

/**
 * Warm SVG illustration: a gentle disc with a soft halo and subtle
 * concentric rings — feels archival rather than clinical.
 */
function EmptyMark() {
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden>
      <defs>
        <radialGradient id="es-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0A84FF" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0A84FF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="es-disc" x1="0" y1="0" x2="84" y2="84">
          <stop offset="0%" stopColor="#0A84FF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#5AC8FA" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <circle cx="42" cy="42" r="42" fill="url(#es-halo)" />
      <circle cx="42" cy="42" r="26" fill="url(#es-disc)" />
      <circle cx="42" cy="42" r="22" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
      <circle cx="42" cy="42" r="17" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
      <circle cx="42" cy="42" r="12" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" />
      <circle cx="42" cy="42" r="6" fill="#F4F6FA" />
    </svg>
  );
}

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
    <li className="group flex items-center gap-6 py-5">
      <div className="w-24 shrink-0">
        <div className="font-display text-[15px] font-semibold tabular-nums text-ink-900">
          {dateText}
        </div>
        <div className="text-[11px] tabular-nums text-ink-400">{timeText}</div>
        {attemptCount > 1 && (
          <div className="mt-0.5 text-[10px] text-ink-400">
            · {attemptCount} attempts
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {renaming ? (
          <div className="flex items-center gap-2">
            <StatusDot status={s.status} />
            <input
              ref={inputRef}
              className="flex-1 rounded-lg border border-brand-300 bg-white px-2 py-0.5 text-[15px] font-medium text-ink-900 outline-none focus:ring-2 focus:ring-brand-400/30"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenaming(false);
              }}
              autoFocus
            />
            <button
              className="rounded-lg p-1.5 text-ios-green hover:bg-ios-green/10"
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
              className="inline-flex items-center gap-1.5 text-[16px] font-medium text-ink-900 transition hover:text-brand-600"
            >
              <StatusDot status={s.status} />
              <span className="truncate">{displayLabel}</span>
              <ChevronRight className="h-4 w-4 -translate-x-0.5 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
            </Link>
            <button
              className="rounded p-0.5 text-ink-300 opacity-0 transition hover:text-ink-600 group-hover:opacity-100"
              onClick={startRename}
              title="Rename session"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-ink-500">
          <span className="capitalize">{s.status}</span>
          <span className="text-ink-300">·</span>
          <span className="tabular-nums">Pass {s.current_pass || 0}</span>
          <span className="text-ink-300">·</span>
          <span className="tabular-nums">{gb} GB</span>
          <span className="text-ink-300">·</span>
          <span className="tabular-nums">
            {s.total_sectors.toLocaleString()} sectors
          </span>
        </div>
        <div className="mt-1 truncate font-mono text-[11px] text-ink-400">
          {s.output_dir}
        </div>
      </div>

      {s.status === "completed" && (
        <div className="flex flex-col items-end gap-0.5">
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200/70 bg-white px-2.5 py-1.5 text-[12px] font-medium text-ink-700 opacity-0 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 group-hover:opacity-100 disabled:opacity-50"
            onClick={enrollToLibrary}
            disabled={enrolling}
            title="Add the recovered file to your library and transcribe it"
          >
            <LibraryIcon className="h-3.5 w-3.5" />
            <Sparkles className="h-3.5 w-3.5" />
            {enrolling ? "Adding…" : "Add to Library + transcribe"}
          </button>
          {enrollMsg && (
            <span className="text-[11px] text-ink-500" role="status">
              {enrollMsg}
            </span>
          )}
        </div>
      )}

      <button
        className="rounded-lg p-2 text-ink-400 opacity-0 transition hover:bg-ios-red/10 hover:text-ios-red group-hover:opacity-100"
        onClick={onDelete}
        title="Delete session"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function StatusDot({ status }: { status: SessionStatus }) {
  const map: Record<SessionStatus, { color: string; pulse?: boolean }> = {
    created: { color: "#9AA6B8" },
    scanning: { color: "#0A84FF", pulse: true },
    recovering: { color: "#34C759", pulse: true },
    paused: { color: "#FF9500" },
    completed: { color: "#34C759" },
    failed: { color: "#FF3B30" },
    cancelled: { color: "#9AA6B8" },
  };
  const { color, pulse } = map[status];
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      {pulse && (
        <span
          className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60")}
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
