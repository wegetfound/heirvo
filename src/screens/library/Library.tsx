import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Activity, ArrowRight, Upload } from "lucide-react";
import { MOCK_DISCS, getDiscById } from "./data/mockDiscs";
import type { Disc } from "./data/types";
import { HeroFeatured } from "./components/HeroFeatured";
import { DiscRail } from "./components/DiscRail";
import { ipc } from "../../lib/ipc";
import type { Session } from "../../lib/types";

export default function Library() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [discs, setDiscs] = useState<Disc[]>(MOCK_DISCS);
  const [activeSession, setActiveSession] = useState<Session | null>(null);

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
        let real = await ipc.library.list();
        if (!cancelled && real.length === 0) {
          await ipc.library.seedDemo();
          real = await ipc.library.list();
        }
        if (!cancelled && real.length > 0) setDiscs(real);
      } catch {
        // Dev mode without Tauri shell, or backend error — fall back to mock.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
  async function handleImportVideo() {
    if (importing) return;
    setImporting(true);
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
      if (!picked || typeof picked !== "string") {
        setImporting(false);
        return;
      }
      // Derive a nice title from the filename.
      const base = picked.split(/[\\/]/).pop() ?? picked;
      const stem = base.replace(/\.[^.]+$/, "");
      const title = stem
        .replace(/[_\-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase()) || "Imported Media";
      const discId = await ipc.library.importMedia(picked, title);
      try {
        await ipc.transcription.enqueue(discId, picked);
      } catch {
        // Non-fatal — user can retry from the disc page.
      }
      nav(`/disc/${discId}`);
    } catch {
      setImportMsg("Available in the desktop app");
      setTimeout(() => setImportMsg(null), 3500);
    } finally {
      setImporting(false);
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
        />
        <DiscRail
          title="On this day in your archive"
          sub="May 16 across the years — birthdays, beaches, backyards"
          discs={onThisDay}
          showStatus={false}
        />
        <DiscRail
          title="Family birthdays"
          sub='Curated automatically from cake, candles & "happy birthday" detected in audio'
          discs={birthdays}
          showStatus={false}
        />
        <DiscRail
          title="Trips & vacations"
          sub="Places you went, road songs you sang in the back seat"
          discs={trips}
          showStatus={false}
        />

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
    </div>
  );
}
