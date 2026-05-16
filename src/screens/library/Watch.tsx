import { useEffect, useMemo, useRef, useState } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
  Link,
} from "react-router-dom";
import { ChevronLeft, Play, Pause, Search as SearchIcon } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getDiscById, tsToSec } from "./data/mockDiscs";
import { gradientCss } from "./components/GradientArt";
import { TranscriptLine } from "./components/TranscriptLine";
import type { Disc, TranscriptLine as TLine } from "./data/types";
import { ipc } from "../../lib/ipc";

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function Watch() {
  const { discId } = useParams<{ discId: string }>();
  const [params] = useSearchParams();
  const nav = useNavigate();
  // Start with the mock so the UI never goes blank, then upgrade to the
  // real DB-backed disc once IPC resolves.
  const [disc, setDisc] = useState<Disc | undefined>(() =>
    discId ? getDiscById(discId) : undefined,
  );
  useEffect(() => {
    let cancelled = false;
    if (!discId) {
      setDisc(undefined);
      return;
    }
    setDisc(getDiscById(discId));
    (async () => {
      try {
        const real = await ipc.library.get(discId);
        if (!cancelled && real) setDisc(real);
      } catch {
        // mock fallback already shown
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [discId]);

  const initialSec = useMemo(() => {
    const t = params.get("t");
    if (t) return tsToSec(t);
    return disc?.transcript[0]?.timeSec ?? 0;
  }, [params, disc]);

  const [currentSec, setCurrentSec] = useState(initialSec);
  const [playing, setPlaying] = useState(false);
  const [filterQ, setFilterQ] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Resolve the local media path to an asset URL the webview can load.
  // Falls back to null when the disc has no recovered file (mock/demo data).
  const mediaSrc = useMemo(() => {
    if (!disc?.videoPath) return null;
    try {
      return convertFileSrc(disc.videoPath);
    } catch {
      return null;
    }
  }, [disc?.videoPath]);
  const hasMedia = mediaSrc !== null;

  useEffect(() => {
    setCurrentSec(initialSec);
  }, [initialSec]);

  // Sync video element with React state. Seeks come from transcript clicks
  // and scrubber drags; the timeupdate handler below pushes back the other way.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (Math.abs(v.currentTime - currentSec) > 0.5) {
      v.currentTime = currentSec;
    }
  }, [currentSec]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.play().catch(() => setPlaying(false));
    } else {
      v.pause();
    }
  }, [playing]);

  if (!disc) {
    return (
      <div className="lib-root">
        <div className="lib-container" style={{ padding: "64px 32px" }}>
          <p style={{ color: "var(--lib-muted)" }}>Disc not found.</p>
          <Link to="/library" style={{ color: "var(--lib-amber)" }}>
            Back to library
          </Link>
        </div>
      </div>
    );
  }

  const total = disc.durationSec || 1;
  const progressPct = Math.max(0, Math.min(100, (currentSec / total) * 100));

  const handleSeek = (line: TLine) => {
    setCurrentSec(line.timeSec);
  };

  const onScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - r.left) / r.width;
    setCurrentSec(Math.max(0, Math.min(total, total * pct)));
  };

  const visibleLines = filterQ.trim()
    ? disc.transcript.filter((l) =>
        l.text.toLowerCase().includes(filterQ.toLowerCase()),
      )
    : disc.transcript;

  // Active line = last line whose timeSec <= currentSec
  let activeIdx = -1;
  for (let i = 0; i < disc.transcript.length; i++) {
    if (disc.transcript[i].timeSec <= currentSec) activeIdx = i;
    else break;
  }
  const activeTimeSec = activeIdx >= 0 ? disc.transcript[activeIdx].timeSec : -1;

  return (
    <div className="lib-root">
      <div className="lib-container-wide">
        <button
          type="button"
          onClick={() => nav(-1)}
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
            padding: "20px 0 12px",
          }}
        >
          <ChevronLeft size={14} /> Back
        </button>

        <div className="lib-watch-wrap">
          <div className="lib-watch-left">
            <div
              style={{
                background: "#fff",
                border: "1px solid var(--lib-line)",
                borderRadius: 18,
                overflow: "hidden",
                boxShadow: "var(--lib-shadow-card)",
              }}
            >
              <div
                style={{
                  aspectRatio: "4 / 3",
                  background: hasMedia ? "#000" : gradientCss(disc.gradient),
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {hasMedia ? (
                  <video
                    ref={videoRef}
                    src={mediaSrc ?? undefined}
                    onTimeUpdate={(e) => setCurrentSec(e.currentTarget.currentTime)}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onEnded={() => setPlaying(false)}
                    onClick={() => setPlaying((p) => !p)}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      cursor: "pointer",
                      background: "#000",
                    }}
                    playsInline
                  />
                ) : (
                  <>
                    <div
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 3px), radial-gradient(circle at 30% 80%, rgba(255,180,120,0.18), transparent 50%)",
                        mixBlendMode: "overlay",
                        pointerEvents: "none",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: 16,
                        left: 16,
                        padding: "4px 10px",
                        background: "rgba(0,0,0,0.55)",
                        color: "rgba(255,255,255,0.9)",
                        borderRadius: 6,
                        fontFamily: "var(--lib-sans)",
                        fontSize: 11,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        zIndex: 1,
                      }}
                    >
                      Transcript-only preview
                    </div>
                    <button
                      type="button"
                      disabled
                      title="No recovered media file linked to this disc"
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.92)",
                        border: 0,
                        cursor: "not-allowed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--lib-ink)",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                        zIndex: 2,
                        opacity: 0.55,
                      }}
                    >
                      <Play size={24} fill="currentColor" stroke="none" style={{ marginLeft: 3 }} />
                    </button>
                  </>
                )}
              </div>
              <div
                style={{
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  borderTop: "1px solid var(--lib-line)",
                  background: "var(--lib-paper)",
                }}
              >
                <button
                  type="button"
                  onClick={() => hasMedia && setPlaying((p) => !p)}
                  disabled={!hasMedia}
                  title={hasMedia ? undefined : "No recovered media file"}
                  style={{
                    background: "transparent",
                    border: 0,
                    cursor: hasMedia ? "pointer" : "not-allowed",
                    color: "var(--lib-ink-2)",
                    padding: 4,
                    display: "flex",
                    opacity: hasMedia ? 1 : 0.4,
                  }}
                >
                  {playing ? (
                    <Pause size={18} fill="currentColor" stroke="none" />
                  ) : (
                    <Play size={18} fill="currentColor" stroke="none" />
                  )}
                </button>
                <div
                  onClick={onScrubberClick}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: "rgba(28,26,23,0.08)",
                    position: "relative",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${progressPct}%`,
                      background: "var(--lib-ink)",
                      borderRadius: 2,
                      transition: "width 0.3s ease",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: `${progressPct}%`,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: "#fff",
                      border: "1.5px solid var(--lib-ink)",
                      transform: "translate(-50%, -50%)",
                      transition: "left 0.3s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: 12,
                    color: "var(--lib-ink-2)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtTime(currentSec)} / {disc.durationFormatted}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 22, padding: "0 4px" }}>
              <div
                style={{
                  fontFamily: "var(--lib-serif)",
                  fontSize: 26,
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                  color: "var(--lib-ink)",
                }}
              >
                {disc.title}
              </div>
              <div style={{ color: "var(--lib-muted)", fontSize: 13, marginTop: 6 }}>
                {disc.date} · {disc.source}, recovered {disc.recoveredAt} ·{" "}
                {disc.scenes.length} scenes · {disc.phrasesIndexed.toLocaleString()} phrases
              </div>
              <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link to={`/disc/${disc.id}`} className="lib-btn-flat lib-btn-flat-primary">
                  View disc
                </Link>
                <button type="button" className="lib-btn-flat">
                  Export clip
                </button>
                <button type="button" className="lib-btn-flat">
                  Share moment
                </button>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 8 }}>
            <div
              style={{
                marginBottom: 24,
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--lib-serif)",
                  fontWeight: 400,
                  fontSize: 22,
                  margin: 0,
                  letterSpacing: "-0.015em",
                  color: "var(--lib-ink)",
                }}
              >
                Transcript
              </h2>
              <div style={{ position: "relative" }}>
                <SearchIcon
                  size={13}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--lib-muted)",
                  }}
                />
                <input
                  value={filterQ}
                  onChange={(e) => setFilterQ(e.target.value)}
                  placeholder="Find in transcript"
                  style={{
                    background: "#fff",
                    border: "1px solid var(--lib-line)",
                    borderRadius: 10,
                    padding: "7px 12px 7px 32px",
                    fontFamily: "var(--lib-sans)",
                    fontSize: 13,
                    color: "var(--lib-ink)",
                    outline: "none",
                    width: 200,
                  }}
                />
              </div>
            </div>

            <div>
              {visibleLines.map((line) => (
                <TranscriptLine
                  key={`${line.timeSec}-${line.text.slice(0, 12)}`}
                  line={line}
                  active={line.timeSec === activeTimeSec}
                  onSeek={handleSeek}
                />
              ))}
              {visibleLines.length === 0 && (
                <div style={{ padding: 16, color: "var(--lib-muted)", fontSize: 14 }}>
                  No transcript lines match &ldquo;{filterQ}&rdquo;.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
