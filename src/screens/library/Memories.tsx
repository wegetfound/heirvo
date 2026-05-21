/**
 * Memories — the Library landing ("The Immersive Living Room").
 *
 * The active memory's gradient bleeds into the entire backdrop as a breathing
 * ambient glow (warm projector-light across a dark room). The player floats
 * large and centered with a soft halo. A glass searchbar sits beneath it with
 * phrase chips. Other memories live in a horizontal cover-flow carousel where
 * selecting one cross-fades the whole room to that memory's color. Fullscreen
 * mode deepens the ambient and floats the player huge — lights fully down.
 *
 * Data: starts from the bundled demo discs, then upgrades to the real
 * DB-backed library via IPC (mock fallback keeps the screen alive in dev).
 * The inline player is a live "preview" (simulated playback on the gradient
 * poster); "Open full player" / a transcript search hit deep-link into the
 * dedicated /watch/:discId screen which owns real video + synced transcript.
 */

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { gsap } from "gsap";
import {
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { convertFileSrc } from "@tauri-apps/api/core";
import { MOCK_DISCS, getDiscById } from "./data/mockDiscs";
import { gradientCss } from "./components/GradientArt";
import type { Disc } from "./data/types";
import { ipc, events } from "../../lib/ipc";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtSec(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const REDUCED = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Derive a warm, desaturated "room glow" color from a disc gradient string.
// We just pick the dominant hue from the gradient's first color stop.
const GLOW_OVERRIDES: Record<string, string> = {
  hawaii: "rgba(43,107,168,0.55)",
  wedding: "rgba(184,132,110,0.50)",
  christmas: "rgba(196,74,58,0.50)",
  dad60: "rgba(194,116,31,0.55)",
  school: "rgba(200,140,80,0.50)",
  reunion: "rgba(80,140,80,0.45)",
  eleanor: "rgba(180,100,120,0.50)",
  yellow: "rgba(100,160,80,0.50)",
  capecod: "rgba(74,123,168,0.50)",
  babysarah: "rgba(200,140,90,0.50)",
  easter: "rgba(160,180,140,0.45)",
  newyear: "rgba(200,140,40,0.50)",
  graduation: "rgba(60,80,120,0.55)",
  thx: "rgba(194,116,31,0.55)",
};

function roomGlow(disc: Disc): string {
  return GLOW_OVERRIDES[disc.gradient] ?? "rgba(194,116,31,0.45)";
}

// ─── sub-components ───────────────────────────────────────────────────────────

function PeopleAvatars({ people }: { people: Disc["people"] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {people.slice(0, 5).map((p, i) => (
        <div
          key={p.initials + i}
          title={p.name}
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "rgba(194,116,31,0.18)",
            border: "1.5px solid rgba(194,116,31,0.30)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--lib-amber)",
            fontFamily: "var(--lib-sans)",
            flexShrink: 0,
            marginLeft: i > 0 ? -8 : 0,
            boxShadow: "0 0 0 1.5px rgba(248,244,236,0.6)",
          }}
        >
          {p.initials}
        </div>
      ))}
      {people.length > 0 && (
        <span
          style={{
            marginLeft: 10,
            fontSize: 12,
            color: "rgba(248,244,236,0.70)",
            fontFamily: "var(--lib-sans)",
          }}
        >
          {people.length} {people.length === 1 ? "person" : "people"} identified
        </span>
      )}
    </div>
  );
}

interface ScrubberProps {
  currentSec: number;
  durationSec: number;
  onSeek: (sec: number) => void;
  ambient?: boolean;
}

function Scrubber({ currentSec, durationSec, onSeek, ambient }: ScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pct = durationSec > 0 ? (currentSec / durationSec) * 100 : 0;

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(Math.round(ratio * durationSec));
  }

  return (
    <div
      ref={trackRef}
      onClick={handleClick}
      style={{
        width: "100%",
        height: 4,
        borderRadius: 2,
        background: ambient
          ? "rgba(255,255,255,0.18)"
          : "rgba(27,23,20,0.15)",
        cursor: "pointer",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* filled */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: "100%",
          width: `${pct}%`,
          borderRadius: 2,
          background: ambient
            ? "rgba(255,255,255,0.80)"
            : "var(--lib-amber)",
          transition: "width 0.25s linear",
        }}
      />
      {/* thumb */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: `${pct}%`,
          transform: "translate(-50%, -50%)",
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: ambient ? "#fff" : "var(--lib-amber)",
          boxShadow: "0 0 0 2px rgba(255,255,255,0.4)",
          transition: "left 0.25s linear",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// ─── PHRASE CHIPS ─────────────────────────────────────────────────────────────

const FEATURED_CHIPS = ["pretzel", "the leis", "rental keys", "I could die here"];
const CHIP_MAP: Record<string, string[]> = {
  "hawaii-vacation": ["pretzel", "the leis", "rental keys", "I could die here"],
  "wedding-sarah-mike": ["I do", "lawfully wedded", "lucky", "first kiss"],
  "christmas-1992": ["Nintendo", "five-thirty", "down the stairs", "stockings"],
  "dads-60th": ["surprise", "I'm not crying", "sixty more", "dark room"],
  "kids-first-day-school": ["the camera", "ten", "the bus", "goodbye"],
  "eleanor-80th": ["pancakes", "eighty candles", "make my wish", "champion"],
  "family-reunion-lake-house": ["donate a boat", "Grandpa", "ninety", "cordless"],
  "camping-yellowstone": ["don't run", "squirrel", "earth is breathing", "bear"],
  "thanksgiving-aunt-mary": ["two turkeys", "seconds", "extra grateful", "pie"],
  "baby-emma-first-steps": ["she did it", "one step", "let go", "coffee table"],
  "graduation-michael": ["every day", "eighteen years", "you proud", "Italian"],
  "road-trip-route-66": ["hon", "Pacific Ocean", "from the kitchen", "fries"],
};

// ─── COVER-FLOW CAROUSEL ──────────────────────────────────────────────────────

interface CarouselProps {
  discs: Disc[];
  activeId: string;
  onSelect: (d: Disc) => void;
  fullscreen: boolean;
}

function CoverFlow({ discs, activeId, onSelect, fullscreen }: CarouselProps) {
  const centerIdx = discs.findIndex((d) => d.id === activeId);
  const [localIdx, setLocalIdx] = useState(centerIdx >= 0 ? centerIdx : 0);

  // Sync when parent changes active
  useEffect(() => {
    const idx = discs.findIndex((d) => d.id === activeId);
    if (idx >= 0) setLocalIdx(idx);
  }, [activeId, discs]);

  function prev() {
    const next = Math.max(0, localIdx - 1);
    setLocalIdx(next);
    onSelect(discs[next]);
  }
  function next() {
    const nxt = Math.min(discs.length - 1, localIdx + 1);
    setLocalIdx(nxt);
    onSelect(discs[nxt]);
  }
  function select(i: number) {
    setLocalIdx(i);
    onSelect(discs[i]);
  }

  // Show window of 7 centered on localIdx
  const windowSize = 7;
  const half = Math.floor(windowSize / 2);
  const startIdx = Math.max(0, Math.min(localIdx - half, discs.length - windowSize));
  const visible = discs.slice(startIdx, startIdx + windowSize);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        width: "100%",
        height: fullscreen ? 110 : 120,
      }}
    >
      {/* Prev button */}
      <button
        onClick={prev}
        disabled={localIdx === 0}
        style={{
          position: "absolute",
          left: 0,
          zIndex: 10,
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.20)",
          background: "rgba(255,255,255,0.10)",
          backdropFilter: "blur(8px)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: localIdx === 0 ? "default" : "pointer",
          opacity: localIdx === 0 ? 0.3 : 0.8,
          transition: "opacity 0.2s",
          flexShrink: 0,
        }}
      >
        <ChevronLeft size={16} />
      </button>

      {/* Cards */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          flex: 1,
          padding: "0 52px",
          overflow: "hidden",
        }}
      >
        {visible.map((disc, vi) => {
          const absIdx = startIdx + vi;
          const offset = absIdx - localIdx;
          const isCenter = offset === 0;
          const absOff = Math.abs(offset);

          const scale = isCenter ? 1 : absOff === 1 ? 0.82 : 0.68;
          const rotateY = offset * -14;
          const tx = offset * (isCenter ? 0 : 6);
          const opacity = absOff > 2 ? 0.35 : absOff === 2 ? 0.55 : absOff === 1 ? 0.80 : 1;
          const zIndex = 10 - absOff;
          const cardH = fullscreen ? 80 : 88;
          const cardW = fullscreen ? 108 : 120;

          return (
            <div
              key={disc.id}
              onClick={() => select(absIdx)}
              style={{
                flexShrink: 0,
                width: cardW,
                height: cardH,
                borderRadius: 10,
                background: gradientCss(disc.gradient),
                cursor: isCenter ? "default" : "pointer",
                transform: `perspective(700px) rotateY(${rotateY}deg) scale(${scale}) translateX(${tx}px)`,
                opacity,
                zIndex,
                transition: REDUCED()
                  ? "none"
                  : "transform 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease",
                position: "relative",
                boxShadow: isCenter
                  ? "0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.30)"
                  : "0 4px 16px rgba(0,0,0,0.25)",
                border: isCenter
                  ? "1.5px solid rgba(255,255,255,0.35)"
                  : "1px solid rgba(255,255,255,0.12)",
                overflow: "hidden",
              }}
            >
              {/* Film grain overlay on card */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
                  backgroundSize: "150px 150px",
                  opacity: 0.4,
                  pointerEvents: "none",
                  borderRadius: 10,
                }}
              />
              {/* Title overlay */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "18px 8px 6px",
                  background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)",
                  borderRadius: "0 0 10px 10px",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.90)",
                    fontFamily: "var(--lib-sans)",
                    lineHeight: 1.2,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    padding: "0 4px",
                  }}
                >
                  {disc.title}
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: "rgba(255,255,255,0.55)",
                    textAlign: "center",
                    fontFamily: "var(--lib-sans)",
                  }}
                >
                  {disc.year}
                </div>
              </div>
              {/* Active indicator dot */}
              {isCenter && (
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 0 6px rgba(255,255,255,0.8)",
                  }}
                />
              )}
              {/* "Getting ready" badge for recovering discs */}
              {disc.status === "recovering" && (
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    left: 6,
                    background: "rgba(194,116,31,0.75)",
                    backdropFilter: "blur(4px)",
                    borderRadius: 4,
                    padding: "2px 5px",
                    fontSize: 7,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.95)",
                    fontFamily: "var(--lib-sans)",
                    letterSpacing: "0.04em",
                    whiteSpace: "nowrap",
                  }}
                >
                  Getting ready…
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Next button */}
      <button
        onClick={next}
        disabled={localIdx === discs.length - 1}
        style={{
          position: "absolute",
          right: 0,
          zIndex: 10,
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.20)",
          background: "rgba(255,255,255,0.10)",
          backdropFilter: "blur(8px)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: localIdx === discs.length - 1 ? "default" : "pointer",
          opacity: localIdx === discs.length - 1 ? 0.3 : 0.8,
          transition: "opacity 0.2s",
          flexShrink: 0,
        }}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ─── IMMERSIVE PLAYER (stable top-level component) ───────────────────────────
//
// Hoisted out of Memories() so React never sees a new component type each
// render, which would remount (and reset) the <video> element on every state
// tick.  Everything the old closure-Player captured is now an explicit prop.

interface ImmersivePlayerProps {
  // layout
  height: number | string;
  ambient?: boolean;
  // visual
  glow: string;
  posterBg: string;
  aspect: string;
  // playback state
  disc: Disc;
  currentSec: number;
  isPlaying: boolean;
  hasVideo: boolean;
  mediaSrc: string | null;
  // setters
  setCurrentSec: React.Dispatch<React.SetStateAction<number>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
  setAspect: React.Dispatch<React.SetStateAction<string>>;
  // refs from parent (created there so parent GSAP effects still work)
  playerRef: React.RefObject<HTMLDivElement | null>;
  posterRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

function ImmersivePlayer({
  height,
  ambient,
  glow,
  posterBg,
  disc,
  currentSec,
  isPlaying,
  hasVideo,
  mediaSrc,
  setCurrentSec,
  setIsPlaying,
  setFullscreen,
  setAspect,
  playerRef,
  posterRef,
  videoRef,
}: ImmersivePlayerProps) {
  // Track whether video failed to load so we can fall back to the poster.
  const [videoFailed, setVideoFailed] = useState(false);

  // Reset failure state when the disc changes (new video source).
  useEffect(() => {
    setVideoFailed(false);
  }, [mediaSrc]);

  // ── Sync video element → seek when currentSec changes from scrubber/external
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !hasVideo || videoFailed) return;
    if (Math.abs(v.currentTime - currentSec) > 0.5) {
      v.currentTime = currentSec;
    }
  }, [currentSec, hasVideo, videoFailed, videoRef]);

  // ── Sync video element play/pause
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !hasVideo || videoFailed) return;
    if (isPlaying) {
      v.play().catch(() => setIsPlaying(false));
    } else {
      v.pause();
    }
  }, [isPlaying, hasVideo, videoFailed, videoRef, setIsPlaying]);

  // Decide whether to show the real video or the poster (poster if no video,
  // or if the video element reported an error).
  const showVideo = hasVideo && !videoFailed;

  return (
    <div
      ref={playerRef as React.RefObject<HTMLDivElement>}
      style={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: ambient ? 18 : 16,
        overflow: "hidden",
        boxShadow: ambient
          ? `0 0 80px ${glow}, 0 24px 80px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35)`
          : `0 0 60px ${glow}, 0 16px 60px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.20)`,
        border: "1px solid rgba(255,255,255,0.12)",
        flexShrink: 0,
      }}
    >
      {/* ── REAL VIDEO (when hasVideo and no error) ── */}
      {showVideo && (
        <video
          ref={videoRef as React.RefObject<HTMLVideoElement>}
          src={mediaSrc ?? undefined}
          playsInline
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            background: "#000",
            zIndex: 1,
            // Promote the video to its own compositing layer. WebView2/Chromium
            // can render a <video> black inside a rounded `overflow:hidden`
            // container; isolating it on its own GPU layer fixes the paint.
            transform: "translateZ(0)",
            willChange: "transform",
          }}
          onTimeUpdate={(e) => {
            setCurrentSec((e.currentTarget as HTMLVideoElement).currentTime);
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentSec(disc.durationSec);
          }}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget as HTMLVideoElement;
            if (v.videoWidth && v.videoHeight) {
              setAspect(`${v.videoWidth} / ${v.videoHeight}`);
            }
          }}
          onError={() => setVideoFailed(true)}
        />
      )}

      {/* ── POSTER ART with Ken Burns (poster path OR video fallback) ── */}
      {!showVideo && (
        <div
          ref={posterRef as React.RefObject<HTMLDivElement>}
          style={{
            position: "absolute",
            inset: 0,
            background: posterBg,
            transformOrigin: "center center",
            zIndex: 1,
          }}
        />
      )}

      {/* Film grain — POSTER ONLY. A mix-blend-mode layer over a <video> makes
          WebView2/Chromium paint the video black, and real footage doesn't need
          fake grain. So we only texture the gradient poster, never the video. */}
      {!showVideo && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.055'/%3E%3C/svg%3E")`,
            backgroundSize: "200px 200px",
            pointerEvents: "none",
            mixBlendMode: "overlay",
            zIndex: 2,
          }}
        />
      )}

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.65) 100%)",
          pointerEvents: "none",
          zIndex: 3,
        }}
      />

      {/* Bottom info gradient */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "55%",
          background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 3,
        }}
      />

      {/* Top bar — expand button */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          display: "flex",
          gap: 8,
          zIndex: 10,
        }}
      >
        {!ambient && (
          <button
            onClick={() => setFullscreen(true)}
            title="Theater mode (F)"
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.40)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.90)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.65)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.40)";
            }}
          >
            <Maximize2 size={15} />
          </button>
        )}
      </div>

      {/* Controls overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: ambient ? "16px 24px 20px" : "12px 20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: ambient ? 10 : 8,
          zIndex: 5,
        }}
      >
        {/* Scrubber */}
        <Scrubber
          currentSec={currentSec}
          durationSec={disc.durationSec}
          onSeek={(s) => setCurrentSec(s)}
          ambient={true}
        />

        {/* Play row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Big play button */}
            <button
              onClick={() => setIsPlaying((p) => !p)}
              style={{
                width: ambient ? 52 : 44,
                height: ambient ? 52 : 44,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.95)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              }}
            >
              {isPlaying ? (
                <Pause size={ambient ? 20 : 17} fill="var(--lib-ink)" color="var(--lib-ink)" />
              ) : (
                <Play
                  size={ambient ? 20 : 17}
                  fill="var(--lib-ink)"
                  color="var(--lib-ink)"
                  style={{ marginLeft: 2 }}
                />
              )}
            </button>

            {/* Timecode */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--lib-sans)",
                fontSize: ambient ? 14 : 12,
                color: "rgba(255,255,255,0.85)",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "0.01em",
              }}
            >
              <Clock size={11} style={{ opacity: 0.6 }} />
              <span>{fmtSec(currentSec)}</span>
              <span style={{ opacity: 0.45 }}>/</span>
              <span style={{ opacity: 0.65 }}>{disc.durationFormatted}</span>
            </div>
          </div>

          {/* Right side: volume hint + fullscreen */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Volume2 size={14} style={{ color: "rgba(255,255,255,0.45)" }} />
            {ambient && (
              <button
                onClick={() => setFullscreen(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "rgba(255,255,255,0.85)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Minimize2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function Memories() {
  const nav = useNavigate();
  const INITIAL = getDiscById("hawaii-vacation") ?? MOCK_DISCS[0];

  // Start from the bundled demo discs so the room is never empty, then upgrade
  // to the real DB-backed library once IPC resolves (mock fallback in dev).
  const [discs, setDiscs] = useState<Disc[]>(MOCK_DISCS);
  const [disc, setDisc] = useState<Disc>(INITIAL);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [query, setQuery] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  // Player frame aspect ratio. Defaults to 4:3 (old DVD/camcorder/VHS footage);
  // a real <video> sets this from its native dimensions via onLoadedMetadata so
  // footage is shown true and never stretched.
  const [aspect, setAspect] = useState("4 / 3");
  const [importing, setImporting] = useState(false);

  // ── Resolve a playable media source for the active disc ──────────────────────
  // URL passthrough (http/https/blob/data) lets this work without a Tauri shell.
  // Local paths go through convertFileSrc (Tauri asset protocol).
  const mediaSrc = useMemo<string | null>(() => {
    if (!disc.videoPath) return null;
    if (/^(https?:|blob:|data:)/i.test(disc.videoPath)) return disc.videoPath;
    try {
      return convertFileSrc(disc.videoPath);
    } catch {
      return null;
    }
  }, [disc.videoPath]);
  const hasVideo = mediaSrc !== null && disc.mediaType !== "photo";

  // Refs for GSAP targets
  const rootRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gsapKbRef = useRef<ReturnType<typeof gsap.to> | null>(null);

  // ── Load the real library (IPC), falling back to demo discs ──────────────────
  const loadDiscs = useCallback(async () => {
    try {
      const page = await ipc.library.listPage(0, 200);
      if (!page?.discs?.length) return;
      setDiscs(page.discs);
      // Keep the featured "on this day" disc if it still exists, else feature
      // the most recently recovered real disc.
      setDisc((cur) => page.discs.find((d) => d.id === cur.id) ?? page.discs[0]);
    } catch {
      // demo discs already shown
    }
  }, []);

  useEffect(() => {
    loadDiscs();
  }, [loadDiscs]);

  // ── Import a memory from a file (video / audio / photo) ──────────────────────
  const handleImport = useCallback(async () => {
    if (importing) return;
    setImporting(true);
    try {
      const dialog = await import("@tauri-apps/plugin-dialog");
      const picked = await dialog.open({
        multiple: true,
        directory: false,
        filters: [
          {
            name: "Memories (video, audio, photos)",
            extensions: [
              "mp4", "mov", "mkv", "avi", "webm", "m4v", "mpg", "mpeg", "vob",
              "mp3", "wav", "flac", "m4a", "aac", "ogg",
              "jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif", "heic",
            ],
          },
        ],
      });
      if (!picked) return;
      const paths = (Array.isArray(picked) ? picked : [picked]).filter(
        (p): p is string => typeof p === "string",
      );
      let lastId: string | null = null;
      for (const p of paths) {
        const title = p.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") || "Imported memory";
        try {
          const r = await ipc.library.importMedia(p, title, null);
          lastId = (r as { id?: string } | undefined)?.id ?? lastId;
        } catch (err) {
          console.warn("[Heirvo] import failed for", p, err);
        }
      }
      window.dispatchEvent(new CustomEvent("heirvo:library-changed", { detail: { discId: lastId } }));
      await loadDiscs();
    } catch (err) {
      console.warn("[Heirvo] import dialog unavailable (dev mode?)", err);
    } finally {
      setImporting(false);
    }
  }, [importing, loadDiscs]);

  // ── Refresh on recovery completion (window event + disc_added IPC) ───────────
  useEffect(() => {
    // Window CustomEvent dispatched by useRecoveryPromotion after normalization.
    function onLibraryChanged() {
      loadDiscs();
    }
    window.addEventListener("heirvo:library-changed", onLibraryChanged);

    // Also subscribe directly so Memories refreshes even if the hook fires
    // before this component mounts (race safety).
    let unlisten: (() => void) | null = null;
    events
      .onDiscAdded(() => {
        loadDiscs();
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {
        // non-Tauri dev — no-op
      });

    return () => {
      window.removeEventListener("heirvo:library-changed", onLibraryChanged);
      unlisten?.();
    };
  }, [loadDiscs]);

  // ── Lazy-load full detail for the active disc ────────────────────────────────
  // The list endpoint may return lightweight rows (no transcript/people). When
  // the active memory lacks a transcript, fetch its full record so search and
  // the people row work — mirrors the Watch screen's mock→real upgrade.
  useEffect(() => {
    if (disc.transcript && disc.transcript.length) return;
    let cancelled = false;
    (async () => {
      try {
        const full = await ipc.library.get(disc.id);
        if (!cancelled && full && full.transcript?.length) setDisc(full);
      } catch {
        // keep the lightweight row
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [disc.id]);

  // ── Playback simulation (poster / no-video path only) ───────────────────────
  // When a real <video> is present its onTimeUpdate drives currentSec instead.
  useEffect(() => {
    if (hasVideo) return; // real video drives time — do not double-advance
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentSec((s) => {
          if (s >= disc.durationSec) {
            setIsPlaying(false);
            return disc.durationSec;
          }
          return s + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, disc.durationSec, hasVideo]);

  // ── Ambient Ken Burns pulse on the poster (poster / no-video path only) ─────
  // When real video is playing there is no poster element to animate.
  useEffect(() => {
    if (REDUCED() || !posterRef.current || hasVideo) return;
    gsapKbRef.current = gsap.to(posterRef.current, {
      scale: 1.06,
      duration: 14,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
    return () => {
      gsapKbRef.current?.kill();
    };
  }, [disc.id, hasVideo]);

  // ── Entrance animation (once on mount) ──────────────────────────────────────
  useEffect(() => {
    if (REDUCED()) return;
    const targets = [
      headerRef.current,
      playerRef.current,
      searchRef.current,
      carouselRef.current,
    ].filter(Boolean);
    gsap.fromTo(
      targets,
      { opacity: 0, y: 18 },
      {
        opacity: 1,
        y: 0,
        duration: 0.75,
        stagger: 0.10,
        ease: "expo.out",
        clearProps: "transform",
      }
    );
    // Glow fade in
    if (glowRef.current) {
      gsap.fromTo(glowRef.current, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: "power2.out" });
    }
  }, []);

  // ── Cross-fade when switching memory ────────────────────────────────────────
  const switchDisc = useCallback(
    (next: Disc) => {
      if (next.id === disc.id || transitioning) return;
      setTransitioning(true);
      setIsPlaying(false);
      setCurrentSec(0);

      if (REDUCED()) {
        setDisc(next);
        setTransitioning(false);
        return;
      }

      const targets = [
        posterRef.current,
        headerRef.current,
        searchRef.current,
      ].filter(Boolean);

      gsap.to(targets, {
        opacity: 0,
        y: -8,
        duration: 0.28,
        ease: "power2.in",
        onComplete: () => {
          setDisc(next);
          // Animate glow color via backdrop
          gsap.to(glowRef.current, {
            opacity: 0,
            duration: 0.15,
            onComplete: () => {
              gsap.to(glowRef.current, { opacity: 1, duration: 0.6, ease: "power2.out" });
            },
          });
          gsap.fromTo(
            targets,
            { opacity: 0, y: 8 },
            {
              opacity: 1,
              y: 0,
              duration: 0.55,
              stagger: 0.06,
              ease: "expo.out",
              clearProps: "transform",
              onComplete: () => setTransitioning(false),
            }
          );
        },
      });
    },
    [disc.id, transitioning]
  );

  // ── Fullscreen entrance ──────────────────────────────────────────────────────
  useEffect(() => {
    if (REDUCED()) return;
    // Just a quick opacity flash on the overlay
  }, [fullscreen]);

  // ── Keyboard: Escape exits fullscreen ────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && fullscreen) setFullscreen(false);
      if (e.key === " " && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const chips = CHIP_MAP[disc.id] ?? FEATURED_CHIPS;
  const glow = roomGlow(disc);
  const posterBg = gradientCss(disc.gradient);
  const yearsAgo = new Date().getFullYear() - disc.year;

  // ── FULLSCREEN OVERLAY ────────────────────────────────────────────────────────
  if (fullscreen) {
    return (
      <div
        className="lib-root"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: "#0D0A08",
        }}
      >
        {/* Deep ambient glow — larger, more immersive */}
        <div
          style={{
            position: "absolute",
            inset: "-20%",
            background: `radial-gradient(ellipse 80% 80% at 50% 50%, ${glow}, transparent 70%)`,
            filter: "blur(60px)",
            opacity: 0.85,
            pointerEvents: "none",
            transition: REDUCED() ? "none" : "background 0.8s ease",
          }}
        />
        {/* Second, tighter glow for the halo effect */}
        <div
          style={{
            position: "absolute",
            inset: "10%",
            background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${glow}, transparent 65%)`,
            filter: "blur(40px)",
            opacity: 0.55,
            pointerEvents: "none",
          }}
        />

        {/* Close */}
        <button
          onClick={() => setFullscreen(false)}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            zIndex: 20,
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.10)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.80)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={16} />
        </button>

        {/* Eyebrow */}
        <div
          style={{
            position: "relative",
            zIndex: 5,
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--lib-sans)",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.55)",
            fontWeight: 600,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 16,
              height: 1,
              background: "rgba(255,255,255,0.35)",
            }}
          />
          On this day · {disc.date}
        </div>

        {/* Title */}
        <h1
          style={{
            position: "relative",
            zIndex: 5,
            fontFamily: "var(--lib-serif)",
            fontSize: "clamp(28px, 3.5vw, 52px)",
            fontWeight: 300,
            color: "#fff",
            margin: "0 0 20px",
            textAlign: "center",
            textShadow: "0 2px 24px rgba(0,0,0,0.5)",
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
          }}
        >
          {disc.title}
          {disc.year && (
            <span
              style={{
                display: "block",
                fontSize: "0.45em",
                fontFamily: "var(--lib-sans)",
                fontWeight: 400,
                color: "rgba(255,255,255,0.50)",
                letterSpacing: "0.04em",
                marginTop: 6,
                textTransform: "uppercase",
              }}
            >
              {yearsAgo} years ago
            </span>
          )}
        </h1>

        {/* Player — large, centered, aspect-locked (lights fully down) */}
        <div
          style={{
            position: "relative",
            zIndex: 5,
            height: "min(72vh, 640px)",
            aspectRatio: `${aspect}`,
            maxWidth: "min(92vw, 960px)",
          }}
        >
          <ImmersivePlayer
            height="100%"
            ambient={true}
            glow={glow}
            posterBg={posterBg}
            aspect={aspect}
            disc={disc}
            currentSec={currentSec}
            isPlaying={isPlaying}
            hasVideo={hasVideo}
            mediaSrc={mediaSrc}
            setCurrentSec={setCurrentSec}
            setIsPlaying={setIsPlaying}
            setFullscreen={setFullscreen}
            setAspect={setAspect}
            playerRef={playerRef}
            posterRef={posterRef}
            videoRef={videoRef}
          />
        </div>

        {/* People avatars */}
        {(disc.people?.length ?? 0) > 0 && (
          <div style={{ position: "relative", zIndex: 5, marginTop: 20 }}>
            <PeopleAvatars people={disc.people ?? []} />
          </div>
        )}

        {/* Esc hint */}
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 11,
            color: "rgba(255,255,255,0.28)",
            fontFamily: "var(--lib-sans)",
            letterSpacing: "0.06em",
          }}
        >
          Press <kbd style={{ opacity: 0.6, fontFamily: "inherit" }}>Esc</kbd> to exit
        </div>
      </div>
    );
  }

  // ── NORMAL LAYOUT ─────────────────────────────────────────────────────────────
  return (
    <div
      ref={rootRef}
      className="lib-root"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        background: "#1A120B",
      }}
    >
      {/* ── Ambient room glow — full bleed backdrop ───────────────────────── */}
      <div
        ref={glowRef}
        style={{
          position: "absolute",
          inset: "-10%",
          background: `radial-gradient(ellipse 90% 70% at 50% 30%, ${glow}, transparent 65%)`,
          filter: "blur(50px)",
          opacity: 0.80,
          pointerEvents: "none",
          transition: REDUCED() ? "none" : "background 1s ease",
          zIndex: 0,
        }}
      />
      {/* Second glow ring — deeper, bottom half */}
      <div
        style={{
          position: "absolute",
          inset: "20% -10% -10%",
          background: `radial-gradient(ellipse 70% 60% at 50% 80%, ${glow}, transparent 65%)`,
          filter: "blur(60px)",
          opacity: 0.30,
          pointerEvents: "none",
          transition: REDUCED() ? "none" : "background 1s ease",
          zIndex: 0,
        }}
      />

      {/* ── Content column ────────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: "18px 28px 16px",
          gap: 12,
          minHeight: 0,
        }}
      >
        {/* ── Header: eyebrow + title + people ────────────────────────────── */}
        <div ref={headerRef} style={{ flexShrink: 0 }}>
          {/* Eyebrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
              fontFamily: "var(--lib-sans)",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.50)",
              fontWeight: 600,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 14,
                height: 1,
                background: "rgba(255,255,255,0.30)",
              }}
            />
            On this day · {disc.date}
          </div>

          {/* Title row */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <h1
                style={{
                  fontFamily: "var(--lib-serif)",
                  fontSize: "clamp(20px, 2.4vw, 34px)",
                  fontWeight: 300,
                  color: "#fff",
                  margin: 0,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.1,
                  textShadow: "0 2px 16px rgba(0,0,0,0.4)",
                }}
              >
                {disc.title}
                <span
                  style={{
                    fontFamily: "var(--lib-sans)",
                    fontSize: "0.42em",
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.45)",
                    marginLeft: 10,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    verticalAlign: "middle",
                  }}
                >
                  {yearsAgo}y ago
                </span>
              </h1>
              {disc.about && (
                <p
                  style={{
                    margin: "4px 0 0",
                    fontFamily: "var(--lib-sans)",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.52)",
                    lineHeight: 1.5,
                    maxWidth: 520,
                    fontStyle: "italic",
                  }}
                >
                  {disc.about}
                </p>
              )}
              {disc.status === "recovering" && (
                <p
                  style={{
                    margin: "6px 0 0",
                    fontFamily: "var(--lib-sans)",
                    fontSize: 11,
                    color: "rgba(233,185,122,0.80)",
                    letterSpacing: "0.02em",
                    fontStyle: "italic",
                  }}
                >
                  Getting your video ready…
                </p>
              )}
              <button
                onClick={() => nav(`/watch/${disc.id}`)}
                style={{
                  marginTop: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  color: "rgba(255,255,255,0.92)",
                  fontFamily: "var(--lib-sans)",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: 99,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.18)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.10)";
                }}
              >
                {disc.photos?.length
                  ? `View all ${disc.photos.length} photos →`
                  : "Open full player & transcript →"}
              </button>
              <button
                onClick={() => { void handleImport(); }}
                disabled={importing}
                title="Add a video, photo, or song from your computer"
                style={{
                  marginTop: 10,
                  marginLeft: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  color: "rgba(255,255,255,0.78)",
                  fontFamily: "var(--lib-sans)",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: 99,
                  cursor: importing ? "default" : "pointer",
                  opacity: importing ? 0.6 : 1,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!importing) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                }}
              >
                {importing ? "Importing…" : "+ Import a memory"}
              </button>
            </div>

            {/* People avatars */}
            {(disc.people?.length ?? 0) > 0 && (
              <div style={{ flexShrink: 0, paddingBottom: 2 }}>
                <PeopleAvatars people={disc.people ?? []} />
              </div>
            )}
          </div>
        </div>

        {/* ── Player — aspect-locked & letterboxed in the ambient room ──────────
            The frame sizes to the FOOTAGE, never the window: a 4:3 box (the
            right neutral for old DVD/camcorder/VHS transfers) centered with the
            warm glow filling the surround, like a screen in a dark room. When a
            real video loads it adopts the file's true ratio via `aspect`. ── */}
        <div style={{ flex: "1 1 0", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ height: "100%", aspectRatio: `${aspect}`, maxWidth: "100%" }}>
            <ImmersivePlayer
              height="100%"
              glow={glow}
              posterBg={posterBg}
              aspect={aspect}
              disc={disc}
              currentSec={currentSec}
              isPlaying={isPlaying}
              hasVideo={hasVideo}
              mediaSrc={mediaSrc}
              setCurrentSec={setCurrentSec}
              setIsPlaying={setIsPlaying}
              setFullscreen={setFullscreen}
              setAspect={setAspect}
              playerRef={playerRef}
              posterRef={posterRef}
              videoRef={videoRef}
            />
          </div>
        </div>

        {/* ── Search bar ────────────────────────────────────────────────────── */}
        <div ref={searchRef} style={{ flexShrink: 0 }}>
          {/* Glass card */}
          <div
            style={{
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 16,
              padding: "10px 14px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.10)",
            }}
          >
            {/* Label */}
            <div
              style={{
                fontSize: 10,
                fontFamily: "var(--lib-sans)",
                color: "rgba(255,255,255,0.38)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Search every spoken word
            </div>

            {/* Input row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Search size={15} style={{ color: "rgba(255,255,255,0.45)", flexShrink: 0 }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Search every spoken word… try "birthday"'
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontFamily: "var(--lib-sans)",
                  fontSize: 13,
                  color: "#fff",
                  caretColor: "rgba(194,116,31,0.9)",
                }}
                onFocus={(e) => {
                  (e.currentTarget.closest("div[style]") as HTMLElement).style.borderColor =
                    "rgba(194,116,31,0.45)";
                }}
                onBlur={(e) => {
                  (e.currentTarget.closest("div[style]") as HTMLElement).style.borderColor =
                    "rgba(255,255,255,0.14)";
                }}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.45)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Phrase chips */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "nowrap",
                gap: 6,
                marginTop: 8,
                overflowX: "auto",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.35)",
                  fontFamily: "var(--lib-sans)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                Try:
              </span>
              {chips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => setQuery(chip)}
                  style={{
                    flexShrink: 0,
                    background:
                      query === chip
                        ? "rgba(194,116,31,0.30)"
                        : "rgba(255,255,255,0.08)",
                    border:
                      query === chip
                        ? "1px solid rgba(194,116,31,0.50)"
                        : "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 99,
                    padding: "3px 10px",
                    fontFamily: "var(--lib-sans)",
                    fontSize: 11,
                    fontWeight: 500,
                    color:
                      query === chip
                        ? "rgba(233,185,122,1)"
                        : "rgba(255,255,255,0.65)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (query !== chip)
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,255,255,0.14)";
                  }}
                  onMouseLeave={(e) => {
                    if (query !== chip)
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,255,255,0.08)";
                  }}
                >
                  "{chip}"
                </button>
              ))}
            </div>
          </div>

          {/* Transcript snippet when searching */}
          {query.length >= 2 && (
            <div
              style={{
                marginTop: 6,
                maxHeight: 80,
                overflowY: "auto",
                background: "rgba(0,0,0,0.30)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "6px 10px",
              }}
            >
              {(disc.transcript ?? [])
                .filter(
                  (t) =>
                    !t.isStageDirection &&
                    t.text.toLowerCase().includes(query.toLowerCase())
                )
                .slice(0, 4)
                .map((t, i) => (
                  <div
                    key={i}
                    onClick={() => nav(`/watch/${disc.id}?t=${t.timeSec}`)}
                    title="Open this moment in the full player"
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "baseline",
                      padding: "3px 4px",
                      borderRadius: 6,
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background =
                        "rgba(255,255,255,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = "transparent";
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: "rgba(194,116,31,0.8)",
                        fontFamily: "var(--lib-sans)",
                        fontVariantNumeric: "tabular-nums",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.time}
                    </span>
                    {t.speaker && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.45)",
                          fontFamily: "var(--lib-sans)",
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t.speaker}:
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.75)",
                        fontFamily: "var(--lib-sans)",
                        lineHeight: 1.4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      dangerouslySetInnerHTML={{
                        __html: t.text.replace(
                          new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
                          '<mark style="background:rgba(246,210,122,0.35);color:rgba(246,210,122,1);border-radius:2px;padding:0 2px;">$1</mark>'
                        ),
                      }}
                    />
                  </div>
                ))}
              {(disc.transcript ?? []).filter(
                (t) =>
                  !t.isStageDirection &&
                  t.text.toLowerCase().includes(query.toLowerCase())
              ).length === 0 && (
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.35)",
                    fontFamily: "var(--lib-sans)",
                    padding: "4px 4px",
                    fontStyle: "italic",
                  }}
                >
                  No matches in this memory.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Cover-flow carousel ─────────────────────────────────────────── */}
        <div ref={carouselRef} style={{ flexShrink: 0, paddingBottom: 2 }}>
          {/* Section label */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontFamily: "var(--lib-sans)",
                color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                fontWeight: 600,
              }}
            >
              All Memories · {discs.length} recovered
            </div>
            <div
              style={{
                fontSize: 10,
                fontFamily: "var(--lib-sans)",
                color: "rgba(255,255,255,0.25)",
                letterSpacing: "0.04em",
              }}
            >
              Click any card to load
            </div>
          </div>
          <CoverFlow
            discs={discs}
            activeId={disc.id}
            onSelect={switchDisc}
            fullscreen={false}
          />
        </div>
      </div>
    </div>
  );
}
