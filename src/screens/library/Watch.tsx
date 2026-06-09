import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
  Link,
} from "react-router-dom";
import { ChevronLeft, Play, Pause, Search as SearchIcon, Music, FileText, FolderOpen, Heart, ExternalLink, Maximize, Minimize, Loader2 } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { tsToSec } from "./data/mockDiscs";
import { gradientCss } from "./components/GradientArt";
import { TranscriptLine } from "./components/TranscriptLine";
import { TranscriptWaitingCard } from "./components/TranscriptWaitingCard";
import { PhotoGalleryView } from "./components/PhotoGallery";
import type { Disc, TranscriptLine as TLine } from "./data/types";
import { ipc } from "../../lib/ipc";

/** Browser-safe video codecs WebView2 can decode natively. */
const BROWSER_SAFE_CODECS = new Set(["h264", "avc", "avc1", "vp8", "vp9", "av1"]);

/** Fetch the stream server base URL once and cache it. */
let _streamBaseCache: string | null = null;
async function fetchStreamBase(): Promise<string> {
  if (_streamBaseCache !== null) return _streamBaseCache;
  try {
    _streamBaseCache = await ipc.getStreamBase();
  } catch {
    _streamBaseCache = "";
  }
  return _streamBaseCache;
}

// Error type enumeration for better UX messaging
type MediaErrorType = "file-not-found" | "decode-error" | "unknown";

// Virtual scroller hook: efficient rendering for 10k+ items
// Only renders visible window + buffer, vastly reducing DOM nodes
function useVirtualScroll<T>(
  items: T[],
  containerRef: React.RefObject<HTMLDivElement>,
  itemHeight: number = 40, // pixels per line
  bufferSize: number = 5,  // lines above/below to keep in DOM
) {
  const [startIdx, setStartIdx] = useState(0);
  const windowSize = 50; // render ~50 visible items at a time

  const onScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop } = containerRef.current;
    const newStartIdx = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
    setStartIdx(newStartIdx);
  }, [containerRef, itemHeight, bufferSize]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, [containerRef, onScroll]);

  const endIdx = Math.min(items.length, startIdx + windowSize + bufferSize * 2);
  const visibleItems = items.slice(startIdx, endIdx);
  const offsetY = startIdx * itemHeight;
  const totalHeight = items.length * itemHeight;
  const bottomHeight = (items.length - endIdx) * itemHeight;

  return { visibleItems, offsetY, totalHeight, bottomHeight, startIdx };
}

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/* ── TranscriptRenderer: Smart virtual scrolling for 10k+ items ──
   For small lists (<500 items): render all (no overhead)
   For large lists (500+): render only visible window (50 items + buffer)
   This keeps DOM lean and UI responsive at scale. */
function TranscriptRenderer({
  lines,
  activeTimeSec,
  onSeek,
  containerRef,
  filterQ,
}: {
  lines: TLine[];
  activeTimeSec: number;
  onSeek: (line: TLine) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  filterQ: string;
}) {
  const VIRTUALIZATION_THRESHOLD = 500; // Switch to virtual scrolling above this
  const shouldVirtualize = lines.length > VIRTUALIZATION_THRESHOLD;

  const virtualScroll = useVirtualScroll(lines, containerRef, 40, 5);
  const linesToRender = shouldVirtualize ? virtualScroll.visibleItems : lines;
  const containerStyle = shouldVirtualize
    ? {
        height: "500px", // Fixed height for scrolling
        overflowY: "auto" as const,
        position: "relative" as const,
      }
    : {};

  return (
    <div ref={containerRef} style={containerStyle}>
      {shouldVirtualize && (
        <div style={{ height: `${virtualScroll.offsetY}px` }} aria-hidden="true" />
      )}
      <div>
        {linesToRender.map((line) => (
          <TranscriptLine
            key={`${line.timeSec}`}
            line={line}
            active={line.timeSec === activeTimeSec}
            onSeek={onSeek}
          />
        ))}
        {lines.length === 0 && (
          <div style={{ padding: 16, color: "var(--lib-muted)", fontSize: 14 }}>
            No transcript lines match &ldquo;{filterQ}&rdquo;.
          </div>
        )}
      </div>
      {shouldVirtualize && (
        <div style={{ height: `${virtualScroll.bottomHeight}px` }} aria-hidden="true" />
      )}
    </div>
  );
}

/* ── Humane "we rescued your files" card (Tier 2: audio / documents) ──────────
   Grandma never sees a black box or a codec word — she sees a kind sentence and
   a clear way to her files. */
function RescuedFilesCard({ kind, path }: { kind: "audio" | "document"; path?: string }) {
  const Icon = kind === "audio" ? Music : FileText;
  const title = kind === "audio" ? "Your music is saved" : "Your files are saved";
  const body =
    kind === "audio"
      ? "We rescued these tracks and saved them to your computer, ready to play in your music app."
      : "We rescued these files and saved them to your computer, ready to open anytime.";

  async function handleReveal() {
    if (!path) return;
    try {
      await ipc.revealInFolder(path);
    } catch (err) {
      // Dev mode without a Tauri shell — swallow gracefully.
      console.warn("[Heirvo] revealInFolder unavailable in dev mode:", err);
    }
  }

  return (
    <div style={{ textAlign: "center", padding: "32px 28px", maxWidth: 420, position: "relative", zIndex: 1 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--lib-surface)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 8px 28px rgba(40,20,10,0.18)" }}>
        <Icon size={26} style={{ color: "var(--lib-amber)" }} />
      </div>
      <div style={{ fontFamily: "var(--lib-serif)", fontSize: 24, color: "var(--lib-ink)", marginBottom: 8 }}>{title}</div>
      <p style={{ fontFamily: "var(--lib-sans)", fontSize: 14, lineHeight: 1.55, color: "var(--lib-ink-2)", margin: "0 0 18px" }}>{body}</p>
      {path ? (
        <button type="button" className="lib-btn lib-btn-primary" style={{ margin: "0 auto" }} onClick={() => { void handleReveal(); }}>
          <FolderOpen size={15} /> Open files
        </button>
      ) : (
        <p style={{ fontFamily: "var(--lib-sans)", fontSize: 13, color: "var(--lib-muted)", margin: 0, fontStyle: "italic" }}>
          Saved to your computer
        </p>
      )}
    </div>
  );
}

/* ── Humane "rescue didn't finish" card (incomplete — no output file saved) ── */
function IncompleteRescueCard() {
  return (
    <div style={{ textAlign: "center", padding: "32px 28px", maxWidth: 440, position: "relative", zIndex: 1 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--lib-surface)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 8px 28px rgba(40,20,10,0.18)" }}>
        <Play size={26} style={{ color: "var(--lib-amber)", marginLeft: 3 }} />
      </div>
      <div style={{ fontFamily: "var(--lib-serif)", fontSize: 24, color: "var(--lib-ink)", marginBottom: 8 }}>
        This disc didn&rsquo;t finish rescuing
      </div>
      <p style={{ fontFamily: "var(--lib-sans)", fontSize: 14, lineHeight: 1.55, color: "var(--lib-ink-2)", margin: "0 0 18px" }}>
        We started rescuing this disc but it didn&rsquo;t complete, so no video was saved yet.
        This often happens if the drive lost power mid-rescue. You can try rescuing it again
        from the Home screen.
      </p>
    </div>
  );
}

/* ── Humane "we couldn’t preview, but it’s safe" card (recovered but not webview-renderable) ── */
function CantPreviewCard({
  path,
  onRetry,
  errorType,
}: {
  path?: string;
  onRetry?: () => void;
  errorType?: MediaErrorType | null;
}) {
  async function handleReveal() {
    if (!path) return;
    try {
      await ipc.revealInFolder(path);
    } catch (err) {
      // Dev mode without a Tauri shell — swallow gracefully.
      console.warn("[Heirvo] revealInFolder unavailable in dev mode:", err);
    }
  }

  const getTitle = () => {
    if (errorType === "file-not-found") return "We can’t find this file";
    if (errorType === "decode-error") return "We’re having trouble playing this video";
    if (onRetry) return "We’re having trouble playing this video";
    return "This memory is safe";
  };

  const getDescription = () => {
    if (errorType === "file-not-found") {
      return "The video file was moved or deleted. You may need to recover the disc again, or check if it’s on a connected external drive.";
    }
    if (errorType === "decode-error") {
      return "This video format isn’t supported by the player, or the file is corrupted. You can open it with your system’s media player instead.";
    }
    if (onRetry) {
      return "The video file may not have finished preparing. Try again below — if it keeps happening, the file may be corrupted or use an unsupported format.";
    }
    return "We rescued it and saved it to your computer. We can’t show a preview here, but your file is ready and waiting for you.";
  };

  return (
    <div style={{ textAlign: "center", padding: "32px 28px", maxWidth: 440, position: "relative", zIndex: 1 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--lib-surface)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 8px 28px rgba(40,20,10,0.18)" }}>
        <Heart size={26} style={{ color: "var(--lib-amber)" }} />
      </div>
      <div style={{ fontFamily: "var(--lib-serif)", fontSize: 24, color: "var(--lib-ink)", marginBottom: 8 }}>
        {getTitle()}
      </div>
      <p style={{ fontFamily: "var(--lib-sans)", fontSize: 14, lineHeight: 1.55, color: "var(--lib-ink-2)", margin: "0 0 18px" }}>
        {getDescription()}
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        {onRetry && (
          <button type="button" className="lib-btn lib-btn-primary" style={{ margin: "0 auto" }} onClick={onRetry}>
            Try again
          </button>
        )}
        {path ? (
          <button type="button" className="lib-btn lib-btn-ghost" style={{ margin: "0 auto" }} onClick={() => { void handleReveal(); }}>
            <FolderOpen size={15} /> Open files
          </button>
        ) : (
          <p style={{ fontFamily: "var(--lib-sans)", fontSize: 13, color: "var(--lib-muted)", margin: 0, fontStyle: "italic" }}>
            Saved to your computer
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Calm "getting your video ready" state — shown while a recovered ISO/VOB is
   transcoded to a webview-playable MP4 in the background. WebView2 cannot decode
   a raw ISO/VOB, so we NEVER hand those to <video>; we show this and swap to the
   player automatically once normalization finishes. ── */
function PreparingCard({ timedOut, onRetry }: { timedOut?: boolean; onRetry?: () => void }) {
  if (timedOut) {
    return (
      <div style={{ textAlign: "center", padding: "32px 28px", maxWidth: 440, position: "relative", zIndex: 1 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--lib-surface)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 8px 28px rgba(40,20,10,0.18)" }}>
          <Heart size={26} style={{ color: "var(--lib-amber)" }} />
        </div>
        <div style={{ fontFamily: "var(--lib-serif)", fontSize: 24, color: "var(--lib-ink)", marginBottom: 8 }}>
          This is taking longer than expected
        </div>
        <p style={{ fontFamily: "var(--lib-sans)", fontSize: 14, lineHeight: 1.55, color: "var(--lib-ink-2)", margin: "0 0 18px" }}>
          Your disc is safe and we&rsquo;re still working on it, but the video conversion is taking longer than usual.
          You can try again, or go back and save the original file instead.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {onRetry && (
            <button type="button" className="lib-btn lib-btn-primary" onClick={onRetry}>
              Try again
            </button>
          )}
          <button type="button" className="lib-btn lib-btn-ghost" onClick={() => window.history.back()}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "32px 28px", maxWidth: 440, position: "relative", zIndex: 1 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--lib-surface)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 8px 28px rgba(40,20,10,0.18)" }}>
        <Loader2 size={26} className="animate-spin" style={{ color: "var(--lib-amber)" }} />
      </div>
      <div style={{ fontFamily: "var(--lib-serif)", fontSize: 24, color: "var(--lib-ink)", marginBottom: 8 }}>
        Getting your video ready&hellip;
      </div>
      <p style={{ fontFamily: "var(--lib-sans)", fontSize: 14, lineHeight: 1.55, color: "var(--lib-ink-2)", margin: 0 }}>
        Your disc is safe. We&rsquo;re preparing it to play here &mdash; this usually takes a minute or
        two, and it&rsquo;ll start automatically when it&rsquo;s ready.
      </p>
    </div>
  );
}

export default function Watch() {
  const { discId } = useParams<{ discId: string }>();
  const [params] = useSearchParams();
  const nav = useNavigate();
  // Start with undefined — load from the real DB only. Never pre-populate with
  // fabricated mock data so users only ever see their own recovered memories.
  const [disc, setDisc] = useState<Disc | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    if (!discId) {
      setDisc(undefined);
      return;
    }
    (async () => {
      try {
        const real = await ipc.library.get(discId);
        if (!cancelled) setDisc(real ?? undefined);
      } catch {
        if (!cancelled) setDisc(undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [discId]);

  const initialSec = useMemo(() => {
    const t = params.get("t");
    if (t) return tsToSec(t);
    // Defensive: transcript may be null or empty
    const firstTime = disc?.transcript?.[0]?.timeSec;
    return typeof firstTime === "number" && isFinite(firstTime) ? firstTime : 0;
  }, [params, disc]);

  const [currentSec, setCurrentSec] = useState(initialSec);
  const [playing, setPlaying] = useState(false);
  const [filterQ, setFilterQ] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reset transcript scroll when filter changes to prevent misaligned virtual scroll
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = 0;
    }
  }, [filterQ]);

  // Normalization timeout (15 minutes). Tracks when isPreparing became true.
  const prepareStartTimeRef = useRef<number | null>(null);
  const [prepareTimedOut, setPrepareTimedOut] = useState(false);
  const PREPARE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

  // Error type tracking for better UX messaging
  const [mediaErrorType, setMediaErrorType] = useState<MediaErrorType | null>(null);

  // Resolve the local media path to an asset URL the webview can load.
  // Pre-validate file existence to differentiate file-not-found from codec errors.
  // Falls back to null when the disc has no recovered file (mock/demo data).
  const mediaSrc = useMemo(() => {
    if (!disc?.videoPath) return null;
    try {
      const src = convertFileSrc(disc.videoPath);
      // Note: convertFileSrc doesn't validate file exists; we'll handle that via onError
      return src;
    } catch (err) {
      console.warn("[Watch] convertFileSrc failed:", err);
      setMediaErrorType("unknown");
      return null;
    }
  }, [disc?.videoPath]);
  const hasMedia = mediaSrc !== null;
  const isPhoto = disc?.mediaType === "photo";
  const isAudio = disc?.mediaType === "audio";
  const isDocument = disc?.mediaType === "document";
  // True only for media we actually play/show inline (video + photo). Audio &
  // documents are "recover-to-file" — we present them warmly, never a black box.
  const isPlayable = !isAudio && !isDocument;
  // If a video file fails to decode in the webview, we swap to a human message
  // instead of a silent black frame.
  const [mediaError, setMediaError] = useState(false);
  // "Try again" — clears the error flag so the <video> element re-mounts and
  // attempts to load the file again. Useful when the h264 file wasn't fully
  // written when the player first opened it.
  const handleVideoRetry = () => {
    setMediaError(false);
  };

  // ── Codec-aware playback routing ────────────────────────────────────────────
  //
  // A freshly-recovered DVD sets videoPath to the raw ISO/VOB and status
  // "recovering" BEFORE the background normalizer produces a webview-playable
  // MP4. WebView2 can't decode ISO/VOB or MPEG-2, so we must never feed those
  // to <video>.
  //
  // We probe the actual video codec via ffprobe instead of relying on the file
  // extension alone. MPEG-2-in-.mp4 files pass the extension check but fail
  // WebView2 decoding — probing catches them and routes them through the stream
  // server instead.
  //
  // Codec probe states:
  //   null     — probe not started / disc not loaded yet
  //   ""       — probing in flight (treat as "not yet known")
  //   "h264"   — browser-safe direct play
  //   "mpeg2video" (etc.) — needs stream server
  const [detectedCodec, setDetectedCodec] = useState<string | null>(null);

  useEffect(() => {
    const videoPath = disc?.videoPath;
    if (!videoPath || isAudio || isDocument || isPhoto) {
      setDetectedCodec(null);
      return;
    }

    // A recovered `.iso` (raw disc image) can't be probed directly — but the
    // stream server carves its MPEG-2 program stream and transcodes to H.264 on
    // the fly. Mark it with a non-browser-safe sentinel so `isPlayableFile`
    // stays false (we never feed a raw ISO to <video>) while the streaming
    // effect below engages and routes it through the localhost server.
    if (videoPath.toLowerCase().endsWith(".iso")) {
      setDetectedCodec("mpeg2video");
      return;
    }

    // Mark probe in-flight ("" means "probing").
    setDetectedCodec("");
    let cancelled = false;
    void (async () => {
      try {
        const result = await ipc.ffprobeFile(videoPath);
        if (!cancelled) {
          setDetectedCodec(result.video_codec.toLowerCase());
        }
      } catch {
        // ffprobe unavailable or file unreadable — treat as unknown codec so
        // the stream server handles it (safer than silently feeding to webview).
        if (!cancelled) {
          setDetectedCodec("unknown");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [disc?.videoPath, isAudio, isDocument, isPhoto]);

  // A file is directly playable only when:
  //   1. The container extension is a browser-friendly format (mp4/m4v/mov/webm), AND
  //   2. The detected video codec is confirmed browser-safe (h264/vp8/vp9/av1).
  // While the probe is in-flight (detectedCodec === "") we return false so the
  // "preparing" state holds and no premature error flashes.
  const isPlayableFile = useMemo(() => {
    const p = (disc?.videoPath ?? "").toLowerCase();
    const goodContainer = /\.(mp4|m4v|mov|webm)$/.test(p);
    if (!goodContainer) return false;
    if (detectedCodec === null || detectedCodec === "") return false; // probe pending
    return BROWSER_SAFE_CODECS.has(detectedCodec);
  }, [disc?.videoPath, detectedCodec]);

  // isPreparing covers two sub-cases:
  //   A. disc.status === "recovering" — recovery engine is still running, no
  //      output file yet. Show the PreparingCard (old path — nothing to stream).
  //   B. hasMedia && !isPlayableFile — recovery is done, file exists but is
  //      MPEG-2 / VOB / ISO / probe still running. Use the streaming server
  //      (new Stage-1.5 path) or keep the "preparing" card.
  const isPreparing =
    !isAudio && !isDocument && !isPhoto &&
    (disc?.status === "recovering" || (hasMedia && !isPlayableFile));

  // Stage-1.5 streaming: when the video path is non-playable (MPEG-2-in-mp4,
  // VOB, or a recovered ISO), build a stream URL pointing at the localhost
  // transcoding server instead of showing the "Getting ready" card. The server
  // carves an ISO's MPEG-2 program stream (dead filesystem and all) and pipes
  // it through ffmpeg → H.264, so raw ISOs play here too.
  const [streamSrc, setStreamSrc] = useState<string | null>(null);

  useEffect(() => {
    const videoPath = disc?.videoPath ?? "";

    // Engage when there IS a file, it's not H.264/browser-safe, and recovery is
    // complete (not still writing the file). ISOs are included — the stream
    // server reads them via the program-stream carve + pipe path.
    const shouldStream =
      !isAudio && !isDocument && !isPhoto &&
      hasMedia && !isPlayableFile &&
      disc?.status !== "recovering" &&
      !!videoPath &&
      detectedCodec !== "" && detectedCodec !== null; // don't stream until probe finishes

    if (!shouldStream) {
      setStreamSrc(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const base = await fetchStreamBase();
      if (cancelled || !base) return;
      const url = `${base}/stream?src=${encodeURIComponent(videoPath)}`;
      setStreamSrc(url);
    })();

    return () => { cancelled = true; };
  }, [disc?.videoPath, disc?.status, hasMedia, isPlayableFile, isAudio, isDocument, isPhoto, detectedCodec]);

  // Reset the decode-error flag whenever the file changes — otherwise a failed
  // source load would keep showing "can't preview" even after a new file is ready.
  // We rely on the video element's onError handler for actual decode/missing errors;
  // this effect only clears stale state when the path changes.
  useEffect(() => {
    setMediaError(false);
    setMediaErrorType(null);
  }, [disc?.videoPath]);

  // Normalization timeout monitor: if isPreparing lasts > 15 minutes, show fallback.
  // Resets whenever isPreparing becomes false (file is ready or error occurred).
  useEffect(() => {
    if (isPreparing) {
      // Start the timer if not already running
      if (prepareStartTimeRef.current === null) {
        prepareStartTimeRef.current = Date.now();
        setPrepareTimedOut(false);

        const timeoutHandle = setTimeout(() => {
          setPrepareTimedOut(true);
        }, PREPARE_TIMEOUT_MS);

        return () => clearTimeout(timeoutHandle);
      }
    } else {
      // Reset when preparing finishes (whether success or error)
      prepareStartTimeRef.current = null;
      setPrepareTimedOut(false);
    }
  }, [isPreparing]);

  // Re-fetch when the library changes. useRecoveryPromotion dispatches this after
  // it swaps videoPath ISO→MP4 on normalize:complete, so the player picks up the
  // playable file and flips out of the "getting ready" state on its own.
  useEffect(() => {
    if (!discId) return;
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail as { discId?: string } | undefined;
      if (detail?.discId && detail.discId !== discId) return;
      ipc.library.get(discId).then((fresh) => { if (fresh) setDisc(fresh); }).catch(() => {});
    };
    window.addEventListener("heirvo:library-changed", onChanged as EventListener);
    return () => window.removeEventListener("heirvo:library-changed", onChanged as EventListener);
  }, [discId]);

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

  // Keep `isFullscreen` in sync with the browser, including when the user
  // presses Esc or uses the native fullscreen control. Covers the standard
  // and webkit-prefixed events (WebView2 / older WebKit).
  useEffect(() => {
    const onFsChange = () => {
      const fsEl =
        document.fullscreenElement ||
        // @ts-expect-error vendor-prefixed fallback
        document.webkitFullscreenElement ||
        null;
      setIsFullscreen(!!fsEl);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  // Toggle fullscreen on the player container (video + scrubber stay together).
  // Falls back to the video element, then to the Tauri window, so it always
  // does *something* even if the webview blocks the element Fullscreen API.
  // Provides feedback to user if all methods fail.
  const toggleFullscreen = async () => {
    const fsEl =
      document.fullscreenElement ||
      // @ts-expect-error vendor-prefixed fallback
      document.webkitFullscreenElement ||
      null;

    // Exiting fullscreen
    if (fsEl) {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else {
          const webkitExit = (document as any).webkitExitFullscreen;
          if (webkitExit) {
            webkitExit.call(document);
          }
        }
        setIsFullscreen(false);
        return;
      } catch (err) {
        console.warn("[Watch] exitFullscreen failed:", err);
      }
    }

    // Entering fullscreen — try element API first
    const target = playerRef.current ?? videoRef.current;
    try {
      if (target?.requestFullscreen) {
        await target.requestFullscreen();
        setIsFullscreen(true);
        return;
      }
      // @ts-expect-error vendor-prefixed fallback
      if (target?.webkitRequestFullscreen) {
        // @ts-expect-error vendor-prefixed fallback
        target.webkitRequestFullscreen();
        setIsFullscreen(true);
        return;
      }
    } catch (err) {
      console.warn("[Watch] Element fullscreen blocked by WebView2:", err);
      // Fall through to Tauri window fallback
    }

    // Last resort: toggle the Tauri OS window to fullscreen
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const w = getCurrentWindow();
      const cur = await w.isFullscreen();
      const newState = !cur;
      await w.setFullscreen(newState);
      setIsFullscreen(newState);
      console.info("[Watch] Tauri window fullscreen:", newState);
    } catch (err) {
      console.error("[Watch] Fullscreen unavailable on this platform:", err);
      // Final fallback: show a toast-like message (optional, skipped for now)
      // Users can still use browser fullscreen or press F11
    }
  };

  if (!disc) {
    return (
      <div className="lib-root">
        <div className="lib-container" style={{ padding: "64px 32px" }}>
          <p style={{ color: "var(--lib-muted)" }}>Disc not found.</p>
          <Link to="/library/browse" style={{ color: "var(--lib-amber)" }}>
            Back to library
          </Link>
        </div>
      </div>
    );
  }

  // A multi-photo disc (Kodak Photo CD, scanned-photo disc) opens as a gallery,
  // not the single-image / video layout — so every photo is reachable.
  if (disc.photos && disc.photos.length > 0) {
    return <PhotoGalleryView disc={disc} onBack={() => nav(-1)} />;
  }

  const total = disc.durationSec || 1;
  const progressPct = Math.max(0, Math.min(100, (currentSec / total) * 100));
  const userFilePath = disc.deliverablePath ?? disc.videoPath ?? undefined;

  const handleSeek = (line: TLine) => {
    setCurrentSec(line.timeSec);
  };

  const onScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - r.left) / r.width;
    setCurrentSec(Math.max(0, Math.min(total, total * pct)));
  };

  // Defensive: transcript may be null or empty; filter safely
  const transcriptLines = disc?.transcript ?? [];

  // Unicode-aware search: normalize diacritics + case-insensitive
  // Handles: "café" matches "cafe", Greek σ matches ς, etc.
  const normalizeForSearch = (s: string): string => {
    if (!s) return "";
    try {
      // NFD: decompose diacritics (é → e + ́)
      // Then remove combining marks (the ́ part)
      return s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "") // Remove diacritical marks
        .toLowerCase();
    } catch {
      // Fallback if normalize fails (shouldn't happen)
      return s.toLowerCase();
    }
  };

  const normalizedQuery = normalizeForSearch(filterQ.trim());
  const visibleLines = normalizedQuery
    ? transcriptLines.filter((l) => {
        const lineText = l?.text ?? "";
        return normalizeForSearch(lineText).includes(normalizedQuery);
      })
    : transcriptLines;

  // Active line = last line whose timeSec <= currentSec
  let activeIdx = -1;
  for (let i = 0; i < transcriptLines.length; i++) {
    const line = transcriptLines[i];
    if (line && typeof line.timeSec === "number" && line.timeSec <= currentSec) {
      activeIdx = i;
    } else if (line && typeof line.timeSec === "number" && line.timeSec > currentSec) {
      break;
    }
  }
  const activeTimeSec = activeIdx >= 0 && transcriptLines[activeIdx] ? transcriptLines[activeIdx].timeSec : -1;

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
              ref={playerRef}
              className="lib-player-card"
              style={{
                background: "var(--lib-paper)",
                border: "1px solid var(--lib-line)",
                borderRadius: 18,
                overflow: "hidden",
                boxShadow: "var(--lib-shadow-card)",
              }}
            >
              <div
                className="lib-player-stage"
                style={{
                  aspectRatio: "4 / 3",
                  background: (isPlayable && hasMedia && !mediaError && !isPreparing) ? "#000" : gradientCss(disc.gradient),
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {disc.status === "incomplete" && !hasMedia ? (
                  /* Incomplete rescue — no output file was saved; never show a silent black box */
                  <IncompleteRescueCard />
                ) : isAudio || isDocument ? (
                  /* Tier 2 — recovered to files, presented warmly (never a black box) */
                  <RescuedFilesCard kind={isAudio ? "audio" : "document"} path={disc.deliverablePath ?? disc.videoPath} />
                ) : hasMedia && isPhoto && !mediaError ? (
                  <img
                    src={mediaSrc ?? undefined}
                    alt={disc?.title ?? "Your photo"}
                    onError={() => {
                      setMediaErrorType("file-not-found");
                      setMediaError(true);
                      console.warn("[Watch] Image load failed for:", disc?.videoPath);
                    }}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      background: "#000",
                    }}
                  />
                ) : isPreparing && streamSrc && !mediaError ? (
                  /* Stage-1 streaming path: VOB/ISO source — transcode via localhost server */
                  <video
                    key={streamSrc}
                    ref={videoRef}
                    src={streamSrc}
                    onTimeUpdate={(e) => setCurrentSec(e.currentTarget.currentTime)}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onEnded={() => setPlaying(false)}
                    onError={(e) => {
                      const err = e.currentTarget.error;
                      if (err?.code === 4 || err?.code === 2) {
                        setMediaErrorType("file-not-found");
                      } else if (err?.code === 3) {
                        setMediaErrorType("decode-error");
                      } else {
                        setMediaErrorType("unknown");
                      }
                      setMediaError(true);
                      console.warn("[Watch] Stream error:", err?.code, err?.message);
                    }}
                    onDoubleClick={toggleFullscreen}
                    onClick={() => !isFullscreen && setPlaying((p) => !p)}
                    controls={isFullscreen}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      cursor: "pointer",
                      background: "#000",
                    }}
                    playsInline
                  />
                ) : isPreparing ? (
                  /* Recovery still running (no file yet), or stream URL not loaded yet */
                  <PreparingCard timedOut={prepareTimedOut} onRetry={() => { setPrepareTimedOut(false); prepareStartTimeRef.current = null; }} />
                ) : hasMedia && !mediaError ? (
                  <video
                    key={mediaSrc}
                    ref={videoRef}
                    src={mediaSrc ?? undefined}
                    onTimeUpdate={(e) => setCurrentSec(e.currentTarget.currentTime)}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onEnded={() => setPlaying(false)}
                    onError={(e) => {
                      // Differentiate error types based on HTML5 video error code
                      const err = e.currentTarget.error;
                      if (err?.code === 4 || err?.code === 2) {
                        // MEDIA_ERR_SRC_NOT_SUPPORTED (4) or MEDIA_ERR_NETWORK (2)
                        // Likely file not found, unsupported format, or access denied
                        setMediaErrorType("file-not-found");
                      } else if (err?.code === 3) {
                        // MEDIA_ERR_DECODE
                        setMediaErrorType("decode-error");
                      } else {
                        setMediaErrorType("unknown");
                      }
                      setMediaError(true);
                      console.warn("[Watch] Video error:", err?.code, err?.message);
                    }}
                    onDoubleClick={toggleFullscreen}
                    onClick={() => !isFullscreen && setPlaying((p) => !p)}
                    // Native controls (scrubber, volume) while fullscreen; our
                    // custom minimal bar is used at normal size.
                    controls={isFullscreen}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      cursor: "pointer",
                      background: "#000",
                    }}
                    playsInline
                  />
                ) : hasMedia && mediaError ? (
                  /* Recovered, but the webview can't preview this file — stay kind, never show a codec error */
                  <CantPreviewCard
                    path={disc.deliverablePath ?? disc.videoPath}
                    onRetry={isPlayable && !isPhoto ? handleVideoRetry : undefined}
                    errorType={mediaErrorType}
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
                        background: "var(--lib-surface)",
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
              {isPlayable && !isPhoto && (
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
                  role="slider"
                  tabIndex={hasMedia ? 0 : -1}
                  aria-label="Video progress"
                  aria-valuemin={0}
                  aria-valuemax={Math.round(total)}
                  aria-valuenow={Math.round(currentSec)}
                  aria-valuetext={`${fmtTime(currentSec)} of ${disc.durationFormatted}`}
                  onKeyDown={(e) => {
                    if (!hasMedia) return;
                    const step = 5; // 5-second step
                    switch (e.key) {
                      case "ArrowLeft":
                        e.preventDefault();
                        setCurrentSec(Math.max(0, currentSec - step));
                        break;
                      case "ArrowRight":
                        e.preventDefault();
                        setCurrentSec(Math.min(total, currentSec + step));
                        break;
                      case "Home":
                        e.preventDefault();
                        setCurrentSec(0);
                        break;
                      case "End":
                        e.preventDefault();
                        setCurrentSec(total);
                        break;
                      default:
                        break;
                    }
                  }}
                  onClick={onScrubberClick}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: "rgba(28,26,23,0.08)",
                    position: "relative",
                    cursor: hasMedia ? "pointer" : "not-allowed",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    if (hasMedia) {
                      e.currentTarget.style.outlineOffset = "4px";
                      e.currentTarget.style.outline = "2px solid var(--lib-amber)";
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.outline = "none";
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
                    aria-hidden="true"
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: `${progressPct}%`,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: "var(--lib-paper)",
                      border: "1.5px solid var(--lib-ink)",
                      transform: "translate(-50%, -50%)",
                      transition: "left 0.3s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                    }}
                    aria-hidden="true"
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
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  disabled={!hasMedia}
                  title={isFullscreen ? "Exit full screen" : "Full screen"}
                  aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
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
                  {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
              </div>
              )}
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
                {disc.date} · {disc.source}, recovered {disc.recoveredAt}
                {isPlayable && !isPhoto && (
                  <>
                    {" "}· {disc.scenes.length} scenes ·{" "}
                    {disc.phrasesIndexed.toLocaleString()} phrases
                  </>
                )}
              </div>
              {disc.deliverablePath && (
                <button
                  type="button"
                  onClick={() => { void ipc.revealInFolder(disc.deliverablePath!).catch(() => {}); }}
                  style={{
                    background: "transparent", border: 0, padding: "8px 0 0", cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 6,
                    fontFamily: "var(--lib-sans)", fontSize: 12.5, color: "var(--lib-amber)",
                  }}
                  title="Open the folder where your video is saved"
                >
                  <FolderOpen size={13} /> Saved in your Documents › Heirvo folder
                </button>
              )}
              <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link to={`/disc/${disc.id}`} className="lib-btn-flat lib-btn-flat-primary">
                  View disc
                </Link>
                {userFilePath && (
                  <>
                    <button
                      type="button"
                      className="lib-btn-flat"
                      onClick={() => { void ipc.openFile(userFilePath).catch((e) => console.warn("[Heirvo] openFile:", e)); }}
                    >
                      <ExternalLink size={14} style={{ marginRight: 6 }} /> Open
                    </button>
                    <button
                      type="button"
                      className="lib-btn-flat"
                      onClick={() => { void ipc.revealInFolder(userFilePath).catch((e) => console.warn("[Heirvo] revealInFolder:", e)); }}
                    >
                      <FolderOpen size={14} style={{ marginRight: 6 }} /> Show in folder
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 8 }}>
            {!isPlayable || isPhoto ? (
              <div
                style={{
                  padding: "20px 22px",
                  background: "var(--lib-paper)",
                  border: "1px solid var(--lib-line)",
                  borderRadius: 14,
                  fontFamily: "var(--lib-serif)",
                  fontStyle: "italic",
                  color: "var(--lib-ink-2)",
                  fontSize: 15,
                  lineHeight: 1.55,
                }}
              >
                {isAudio
                  ? "Your music is saved to your computer — there's nothing to watch or read here, just press Open files to listen."
                  : isDocument
                  ? "Your files are saved to your computer — there's nothing to watch or read here, just press Open files to view them."
                  : "Photos in your vault don't carry a spoken transcript — but they still live alongside your videos so the whole family archive is in one place."}
              </div>
            ) : (
            <>
            {/* Check if transcription is complete (phrasesIndexed > 0) */}
            {disc && disc.phrasesIndexed && disc.phrasesIndexed > 0 ? (
              // Transcript panel (when transcription is done)
              <>
              <div
                style={{
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                  opacity: 1,
                  transition: "opacity 300ms ease",
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
                      background: "var(--lib-surface)",
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

              <TranscriptRenderer
                lines={visibleLines}
                activeTimeSec={activeTimeSec}
                onSeek={handleSeek}
                containerRef={transcriptContainerRef}
                filterQ={filterQ}
              />
              </>
            ) : (
              // Waiting card (when transcription is in progress)
              <div style={{ opacity: 1, transition: "opacity 300ms ease" }}>
                <TranscriptWaitingCard
                  disc={disc}
                  isTranscribing={disc?.status === "recovering"}
                />
              </div>
            )}
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
