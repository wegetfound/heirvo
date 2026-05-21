import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { Disc, PhotoAsset } from "../data/types";
import { gradientCss } from "./GradientArt";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function srcOf(p: PhotoAsset): string | null {
  if (!p.path) return null;
  try {
    return convertFileSrc(p.path);
  } catch {
    return null;
  }
}

/** A single tile / lightbox image: a real recovered photo, or a warm placeholder
 *  when the file isn't available yet (demo data, or thumbnail still converting). */
function PhotoImage({
  photo,
  fallbackTint,
  fit,
  alt,
}: {
  photo: PhotoAsset;
  fallbackTint: string;
  fit: "cover" | "contain";
  alt: string;
}) {
  const [broken, setBroken] = useState(false);
  const src = srcOf(photo);
  const tint = photo.tint ?? fallbackTint;
  if (!src || broken) {
    // Warm placeholder — never a broken-image icon.
    return <div aria-label={alt} style={{ width: "100%", height: "100%", background: tint }} />;
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      style={{ width: "100%", height: "100%", objectFit: fit, background: "#000" }}
    />
  );
}

/** Full-screen gallery for a photo-set disc (Kodak Photo CD, scanned photos…).
 *  One disc → many photos → a grid you can tap into a lightbox. */
export function PhotoGalleryView({ disc, onBack }: { disc: Disc; onBack: () => void }) {
  const photos = disc.photos ?? [];
  const fallbackTint = gradientCss(disc.gradient);
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const go = useCallback(
    (dir: 1 | -1) =>
      setOpen((i) => (i === null ? null : Math.max(0, Math.min(photos.length - 1, i + dir)))),
    [photos.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, go]);

  return (
    <div className="lib-root">
      <div className="lib-container-wide" style={{ paddingBottom: 64 }}>
        <button
          type="button"
          onClick={onBack}
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

        {/* Title */}
        <div style={{ padding: "0 4px 22px" }}>
          <h1
            style={{
              fontFamily: "var(--lib-serif)",
              fontSize: 30,
              fontWeight: 400,
              letterSpacing: "-0.02em",
              lineHeight: 1.12,
              color: "var(--lib-ink)",
              margin: 0,
            }}
          >
            {disc.title}
          </h1>
          <div style={{ color: "var(--lib-muted)", fontSize: 13, marginTop: 6 }}>
            {disc.date} · {disc.source} · {photos.length} photo{photos.length === 1 ? "" : "s"} recovered
          </div>
        </div>

        {/* Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 14,
          }}
        >
          {photos.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setOpen(i)}
              className="lib-card"
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid var(--lib-line)",
                padding: 0,
                cursor: "pointer",
                background: "var(--lib-paper-2)",
                boxShadow: "var(--lib-shadow-soft)",
                transition: REDUCED ? "none" : "transform .25s cubic-bezier(0.16,1,0.3,1)",
              }}
            >
              <PhotoImage photo={p} fallbackTint={fallbackTint} fit="cover" alt={p.caption ?? `Photo ${i + 1}`} />
              {p.caption && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "18px 10px 8px",
                    background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)",
                    color: "rgba(255,255,255,0.95)",
                    fontFamily: "var(--lib-serif)",
                    fontStyle: "italic",
                    fontSize: 12,
                    textAlign: "left",
                  }}
                >
                  {p.caption}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {open !== null && photos[open] && (
        <div
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(12,8,5,0.92)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Close */}
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>

          {/* Prev */}
          {open > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); go(-1); }}
              aria-label="Previous photo"
              style={navArrow("left")}
            >
              <ChevronLeft size={22} />
            </button>
          )}
          {/* Next */}
          {open < photos.length - 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); go(1); }}
              aria-label="Next photo"
              style={navArrow("right")}
            >
              <ChevronRight size={22} />
            </button>
          )}

          {/* Image */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(86vw, 1100px)", height: "min(74vh, 760px)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <div style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
              <PhotoImage
                photo={photos[open]}
                fallbackTint={fallbackTint}
                fit="contain"
                alt={photos[open].caption ?? `Photo ${open + 1}`}
              />
            </div>
          </div>

          {/* Caption + counter */}
          <div style={{ marginTop: 16, textAlign: "center", color: "rgba(255,255,255,0.8)", fontFamily: "var(--lib-sans)", fontSize: 13 }}>
            {photos[open].caption && (
              <div style={{ fontFamily: "var(--lib-serif)", fontStyle: "italic", fontSize: 16, marginBottom: 4, color: "rgba(255,255,255,0.95)" }}>
                {photos[open].caption}
              </div>
            )}
            {open + 1} of {photos.length}
          </div>
        </div>
      )}
    </div>
  );
}

function navArrow(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    [side]: 24,
    top: "50%",
    transform: "translateY(-50%)",
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "rgba(255,255,255,0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 10,
  };
}
