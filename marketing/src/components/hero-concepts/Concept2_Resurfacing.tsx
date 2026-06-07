/**
 * Concept2_Resurfacing — "Memories Bloom From The Surface"
 *
 * The disc sits at a gentle CSS 3D tilt like a dark, reflective pond.
 * A volumetric scan-light sweeps across it. Where the light passes,
 * frozen memory-frames bloom UP from the surface like Polaroids
 * developing — rising, gaining warmth and focus (blur→sharp,
 * desaturated→warm sepia), then settling into a floating archive
 * stack to one side.
 *
 * Metaphor: the memories were never gone — they were under the surface,
 * waiting to be lifted out.
 *
 * Beat map (≈ 5.5 s, plays once then idles):
 *   BEAT 1  0.00–0.90s  Disc materialises, tilted, dark, reflective
 *   BEAT 2  0.90–1.80s  Faint life-moments visible beneath (blur, low sat)
 *   BEAT 3  1.80–3.80s  Scan beam sweeps; polaroids bloom upward
 *   BEAT 4  3.80–4.80s  Archive stack settles; disc brightens
 *   BEAT 5  4.80–5.50s  Caption & CTA mark fade in; idle breathing begins
 *
 * GSAP only. No Three.js, no Lottie, no new deps.
 * All cleanup on unmount via gsap.context().revert().
 * Reduced-motion: jumps to the final frame (everything recovered, static).
 * Accessible: aria-hidden on decorative container.
 */

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

// ─── Design tokens ────────────────────────────────────────────────────────────
const TOKEN = {
  page:      "#0B1220",
  pageAlt:   "#0E1628",
  text:      "#F0EDE8",
  textMuted: "#94A3B8",
  blue:      "#0A84FF",
  amber:     "#F59E0B",
  sepia:     "#C8956C",
  warmBg:    "#1A1208",
  success:   "#34D399",
} as const;

// ─── Viewbox ──────────────────────────────────────────────────────────────────
// Square canvas; disc is centred, polaroids bloom into the upper-right quadrant.
const VW = 560;
const VH = 560;
const DC = VW / 2;                    // disc centre x
const DC_Y = VH * 0.56;              // disc centre y (pushed down to leave sky for cards)
const DISC_R = 118;                   // outer radius
const HOLE_R = 18;                    // centre hole

// ─── Polaroid / memory-frame data ────────────────────────────────────────────
// Each card rises from just below the disc surface to its final resting position.
// Staggered beam offsets so they bloom as the scan light reaches their longitude.
interface PolaroidDef {
  id: number;
  // Final resting position (relative to disc centre)
  tx: number;    // x in SVG units
  ty: number;    // y in SVG units
  rot: number;   // final rotation (deg)
  // Starting position (where it blooms from — near disc surface)
  sx: number;
  sy: number;
  // Gradient stops that suggest a memory (implied photo, no external images)
  topColor:    string;
  midColor:    string;
  botColor:    string;
  // Caption text label on the card
  label:       string;
  // When the beam reaches this card (seconds into Beat 3 = 1.80 base)
  beamOffset:  number;
}

const POLAROIDS: PolaroidDef[] = [
  {
    id: 0,
    tx: DC + 148, ty: DC_Y - 172, rot: 6,
    sx: DC + 40,  sy: DC_Y - 30,
    topColor:    "#F5D9A8",
    midColor:    "#E8B978",
    botColor:    "#9E6B3E",
    label:       "First Steps",
    beamOffset:  0.00,
  },
  {
    id: 1,
    tx: DC + 88,  ty: DC_Y - 270, rot: -5,
    sx: DC - 10,  sy: DC_Y - 30,
    topColor:    "#F9E0D0",
    midColor:    "#E8A878",
    botColor:    "#7A4E2A",
    label:       "Wedding Day",
    beamOffset:  0.35,
  },
  {
    id: 2,
    tx: DC + 210, ty: DC_Y - 100, rot: 14,
    sx: DC + 80,  sy: DC_Y - 20,
    topColor:    "#D8EAF5",
    midColor:    "#A8C8E0",
    botColor:    "#4A7A9E",
    label:       "Christmas",
    beamOffset:  0.18,
  },
  {
    id: 3,
    tx: DC - 20,  ty: DC_Y - 300, rot: -10,
    sx: DC - 60,  sy: DC_Y - 28,
    topColor:    "#E8F5E0",
    midColor:    "#B8D898",
    botColor:    "#5A8A4A",
    label:       "Vacation",
    beamOffset:  0.55,
  },
  {
    id: 4,
    tx: DC + 168, ty: DC_Y - 220, rot: -3,
    sx: DC + 60,  sy: DC_Y - 32,
    topColor:    "#F5EAD0",
    midColor:    "#E0C880",
    botColor:    "#8A7030",
    label:       "Birthday",
    beamOffset:  0.70,
  },
];

const POLAROID_IMGS = [
  "/memory-first-steps.webp",
  "/memory-wedding.webp",
  "/memory-christmas.webp",
  "/memory-vacation.webp",
  "/memory-birthday.webp",
];

// Polaroid card dimensions (SVG units)
const PW = 72;   // width
const PH = 86;   // height
const PB = 18;   // white border thickness bottom (where label lives)

// ─── Disc concentric rings (visible texture) ──────────────────────────────────
const RING_COUNT = 14;

// ─── Reflection shimmer positions on disc ────────────────────────────────────
// Small, soft ellipses that give the "pond surface" feel
const SHIMMER_POS = [
  { cx: DC - 40, cy: DC_Y - 48, rx: 38, ry: 6, rot: -22 },
  { cx: DC + 55, cy: DC_Y + 30, rx: 24, ry: 4, rot: 15  },
  { cx: DC - 20, cy: DC_Y + 55, rx: 16, ry: 3, rot: -8  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Concept2_Resurfacing({
  reducedMotion = false,
}: {
  reducedMotion?: boolean;
}) {
  const wrapRef      = useRef<HTMLDivElement>(null);
  const discGroupRef = useRef<SVGGElement>(null);
  const beamRef      = useRef<SVGRectElement>(null);
  const captionRef   = useRef<HTMLDivElement>(null);
  const ctaRef       = useRef<HTMLDivElement>(null);
  const shimmerRefs  = useRef<(SVGEllipseElement | null)[]>([]);
  const polaroidRefs = useRef<(SVGGElement | null)[]>([]);

  // Honour both prop and OS-level preference
  const [isReduced, setIsReduced] = useState(reducedMotion);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReduced(reducedMotion || mq.matches);
    const handler = (e: MediaQueryListEvent) =>
      setIsReduced(reducedMotion || e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [reducedMotion]);

  useEffect(() => {
    if (!wrapRef.current) return;

    // ── REDUCED MOTION — jump to final frame ─────────────────────────────────
    if (isReduced) {
      // Disc: upright, bright
      if (discGroupRef.current) {
        gsap.set(discGroupRef.current, {
          rotateX: 0, rotateY: 0, opacity: 1,
        });
      }
      // Beam: hidden
      if (beamRef.current) gsap.set(beamRef.current, { opacity: 0 });
      // All polaroids at final resting state, sharp and warm
      polaroidRefs.current.forEach((el, i) => {
        if (!el) return;
        const p = POLAROIDS[i];
        gsap.set(el, {
          x: p.tx, y: p.ty,
          rotation: p.rot,
          opacity: 1,
          scale: 1,
        });
        // Remove blur filter on the image rect inside
        const imgRect = el.querySelector(".polar-img") as SVGRectElement | null;
        if (imgRect) {
          gsap.set(imgRect, { attr: { filter: "none" }, opacity: 1 });
        }
      });
      // Caption & CTA visible
      if (captionRef.current) gsap.set(captionRef.current, { opacity: 1, y: 0 });
      if (ctaRef.current)     gsap.set(ctaRef.current,     { opacity: 1, y: 0 });
      return;
    }

    // ── FULL ANIMATION ────────────────────────────────────────────────────────
    const ctx = gsap.context(() => {

      // Prime state
      gsap.set(discGroupRef.current, {
        opacity: 0,
        scale: 0.92,
        transformOrigin: "50% 56%",   // matches disc centre in the SVG layout
      });
      if (beamRef.current)
        gsap.set(beamRef.current, { x: -VW * 0.55, opacity: 0 });
      if (captionRef.current)
        gsap.set(captionRef.current, { opacity: 0, y: 18 });
      if (ctaRef.current)
        gsap.set(ctaRef.current, { opacity: 0, y: 10 });

      // Polaroids primed at source (bloomed from under the disc)
      polaroidRefs.current.forEach((el, i) => {
        if (!el) return;
        const p = POLAROIDS[i];
        gsap.set(el, {
          x: p.sx,
          y: p.sy,
          rotation: p.rot + (Math.random() - 0.5) * 20,
          opacity: 0,
          scale: 0.55,
        });
      });

      // Shimmer lines primed invisible
      shimmerRefs.current.forEach((el) => {
        if (el) gsap.set(el, { opacity: 0 });
      });

      // ── BEAT 1 · DISC MATERIALISES ──────────────────────────────── 0–0.90s
      const master = gsap.timeline({ delay: 0.2 });

      master.to(discGroupRef.current, {
        opacity: 1,
        scale: 1,
        duration: 0.9,
        ease: "expo.out",
      }, 0);

      // Shimmers pulse softly to establish the "pond" feel
      shimmerRefs.current.forEach((el, i) => {
        if (!el) return;
        master.to(el, {
          opacity: 0.18 + i * 0.06,
          duration: 0.7,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          repeatDelay: 1.2 + i * 0.8,
        }, 0.6 + i * 0.2);
      });

      // ── BEAT 2 · LIFE-MOMENTS BENEATH ───────────────────────────────────────
      //    0.90–1.80s — disc warms: sepia + slight dim suggests hidden memories
      const discFilter = { sepia: 0, brightness: 1 };
      const applyDiscFilter = () => {
        if (discGroupRef.current) {
          discGroupRef.current.style.filter =
            `sepia(${discFilter.sepia.toFixed(2)}) brightness(${discFilter.brightness.toFixed(2)})`;
        }
      };
      master.to(discFilter, {
        sepia: 0.35,
        brightness: 0.88,
        duration: 0.9,
        ease: "power1.inOut",
        onUpdate: applyDiscFilter,
      }, 0.9);

      // ── BEAT 3 · SCAN BEAM + POLAROIDS BLOOM ─────────────────────────────
      //    1.80–3.80s
      // Beam appears and sweeps left → right
      master.to(beamRef.current, {
        opacity: 1,
        duration: 0.25,
        ease: "power2.out",
      }, 1.80);
      master.to(beamRef.current, {
        x: VW * 0.55,
        duration: 2.0,
        ease: "power1.inOut",
      }, 1.80);
      master.to(beamRef.current, {
        opacity: 0,
        duration: 0.4,
        ease: "power2.in",
      }, 3.55);

      // Polaroids bloom up as the beam reaches each one
      POLAROIDS.forEach((p, i) => {
        const el = polaroidRefs.current[i];
        if (!el) return;
        const beamAt = 1.80 + p.beamOffset;

        // 1. Rise from the surface
        master.to(el, {
          x: p.tx,
          y: p.ty,
          rotation: p.rot,
          scale: 1,
          opacity: 1,
          duration: 1.05,
          ease: "expo.out",
        }, beamAt);

        // 2. Blur clears (CSS filter on wrapper div — we animate a data attribute
        //    we drive via onUpdate since GSAP can tween arbitrary objects)
        const blurProxy = { v: 12 };
        master.to(blurProxy, {
          v: 0,
          duration: 1.0,
          ease: "power2.out",
          onUpdate() {
            if (el) el.style.filter = `blur(${blurProxy.v.toFixed(1)}px)`;
          },
        }, beamAt);

        // 3. Warmth settles slightly after the rise (follow-through)
        master.to(el, {
          rotation: p.rot - (Math.random() > 0.5 ? 1 : -1) * 0.8,
          duration: 0.8,
          ease: "sine.inOut",
        }, beamAt + 0.85);
      });

      // ── BEAT 4 · ARCHIVE SETTLES + DISC BRIGHTENS ─────────────────────────
      //    3.80–4.80s
      // Sepia drains away; brightness blooms — fully recovered
      master.to(discFilter, {
        sepia: 0,
        brightness: 1.15,
        duration: 1.0,
        ease: "power2.out",
        onUpdate: applyDiscFilter,
      }, 3.80);

      // Gentle parallax tilt on the disc group (secondary motion)
      master.to(discGroupRef.current, {
        rotateX: -6,
        rotateY: 4,
        duration: 1.2,
        ease: "power2.inOut",
      }, 3.80);

      // Archive stack breathes together — subtle scale + y oscillation
      polaroidRefs.current.forEach((el, i) => {
        if (!el) return;
        master.to(el, {
          y: `+=${-6 - i * 2}`,
          duration: 1.0,
          ease: "power2.out",
        }, 3.80 + i * 0.04);
      });

      // ── BEAT 5 · CAPTION + CTA FADE IN ─────────────────────────────────────
      //    4.80–5.50s
      master.to(captionRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power2.out",
      }, 4.80);
      master.to(ctaRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power2.out",
      }, 5.20);

      // ── ETERNAL BREATH (after 5.5s) ─────────────────────────────────────────
      master.add(() => {
        // Disc breathes
        gsap.to(discGroupRef.current, {
          scale: 1.012,
          duration: 6,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          transformOrigin: "50% 56%",
        });
        // Polaroids drift with slight parallax
        polaroidRefs.current.forEach((el, i) => {
          if (!el) return;
          const dir = i % 2 === 0 ? 1 : -1;
          gsap.to(el, {
            y: `+=${dir * 5}`,
            rotation: `+=${dir * 0.6}`,
            duration: 5 + i * 0.7,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        });
      }, 5.60);

      // ── MOUSE PARALLAX ───────────────────────────────────────────────────────
      const pointerMq = window.matchMedia("(pointer: fine)");
      if (pointerMq.matches) {
        const onMove = (e: MouseEvent) => {
          const rect = wrapRef.current?.getBoundingClientRect();
          if (!rect) return;
          const px = (e.clientX - rect.left) / rect.width  - 0.5;
          const py = (e.clientY - rect.top)  / rect.height - 0.5;
          // 3D tilt the whole disc — absolute values, no accumulation
          gsap.to(discGroupRef.current, {
            rotateX: py * -12,
            rotateY: px * 14,
            duration: 1.1,
            ease: "power3.out",
            overwrite: "auto",
          });
          // Polaroids get a parallax offset relative to their FINAL resting pos
          // (so we tween to absolute tx/ty + parallax nudge)
          polaroidRefs.current.forEach((el, i) => {
            if (!el) return;
            const p = POLAROIDS[i];
            gsap.to(el, {
              x: p.tx + px * -12,
              y: p.ty + py * -8,
              duration: 1.3,
              ease: "power3.out",
              overwrite: "auto",
            });
          });
        };
        window.addEventListener("mousemove", onMove);
        // Return cleanup from context (context.revert kills tweens; we need the listener removed)
        return () => window.removeEventListener("mousemove", onMove);
      }
    }, wrapRef);

    return () => ctx.revert();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReduced]);

  return (
    <div
      ref={wrapRef}
      className="relative select-none"
      style={{
        width: "100%",
        maxWidth: 560,
        aspectRatio: "1 / 1",
        perspective: "900px",
        perspectiveOrigin: "50% 50%",
        // Performance hint
        willChange: "transform",
      }}
      aria-hidden
    >
      {/* ── SVG canvas ─────────────────────────────────────────────────────── */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          {/* ── Disc gradients ── */}
          <radialGradient id="discBody2" cx="0.42" cy="0.35" r="0.88">
            <stop offset="0%"   stopColor="#1A2E50" />
            <stop offset="40%"  stopColor="#0D1E3A" />
            <stop offset="75%"  stopColor="#080F22" />
            <stop offset="100%" stopColor="#04091A" />
          </radialGradient>

          {/* Prismatic sheen — screen blend */}
          <linearGradient id="prism2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#5AC8FA" stopOpacity="0.50" />
            <stop offset="28%"  stopColor="#A78BFA" stopOpacity="0.35" />
            <stop offset="54%"  stopColor="#F472B6" stopOpacity="0.28" />
            <stop offset="80%"  stopColor="#FBBF24" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#34C759" stopOpacity="0.40" />
          </linearGradient>

          {/* Warm amber overlay — "life beneath the surface" */}
          <radialGradient id="warmOverlay2" cx="0.5" cy="0.5" r="0.7">
            <stop offset="0%"   stopColor={TOKEN.amber}  stopOpacity="0.28" />
            <stop offset="60%"  stopColor={TOKEN.sepia}  stopOpacity="0.12" />
            <stop offset="100%" stopColor={TOKEN.warmBg} stopOpacity="0"    />
          </radialGradient>

          {/* Hub */}
          <radialGradient id="hub2" cx="0.5" cy="0.35" r="0.85">
            <stop offset="0%"   stopColor="#FFFFFF"  />
            <stop offset="65%"  stopColor="#D8E4F0"  />
            <stop offset="100%" stopColor="#90A0B8"  />
          </radialGradient>

          {/* ── Scan beam gradient ── */}
          <linearGradient id="beamGrad2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={TOKEN.blue} stopOpacity="0"    />
            <stop offset="30%"  stopColor="#FFFFFF"    stopOpacity="0.85" />
            <stop offset="50%"  stopColor={TOKEN.blue} stopOpacity="0.70" />
            <stop offset="100%" stopColor={TOKEN.blue} stopOpacity="0"    />
          </linearGradient>

          {/* ── Vignette ── */}
          <radialGradient id="vignette2" cx="0.5" cy="0.5" r="0.72">
            <stop offset="50%"  stopColor="#000000" stopOpacity="0"    />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.42" />
          </radialGradient>

          {/* ── Polaroid image fill gradients (one per card) ── */}
          {POLAROIDS.map((p) => (
            <linearGradient
              key={`imgGrad${p.id}`}
              id={`imgGrad${p.id}`}
              x1="0" y1="0" x2="0" y2="1"
            >
              <stop offset="0%"   stopColor={p.topColor} />
              <stop offset="55%"  stopColor={p.midColor} />
              <stop offset="100%" stopColor={p.botColor} />
            </linearGradient>
          ))}

          {/* Shared blur filter for initial bloom state */}
          <filter id="polarBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" />
          </filter>

          {/* Soft drop-shadow for polaroids */}
          <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="8" stdDeviation="12"
              floodColor="#000000" floodOpacity="0.45" />
          </filter>

          {/* Soft glow for the scan beam — blur copy merged under original */}
          <filter id="beamGlow" x="-30%" y="-5%" width="160%" height="110%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Clip to disc circle for the scan beam */}
          <clipPath id="discClip2">
            <circle cx={DC} cy={DC_Y} r={DISC_R} />
          </clipPath>
        </defs>

        {/* ── DISC (3D tilt group) ─────────────────────────────────────────── */}
        <g
          ref={discGroupRef}
          style={{
            transformOrigin: `${DC}px ${DC_Y}px`,
            transformBox: "fill-box",
          }}
        >
          {/* Disc body */}
          <g>
            {/* Base */}
            <circle cx={DC} cy={DC_Y} r={DISC_R} fill="url(#discBody2)" />

            {/* Concentric data rings */}
            {Array.from({ length: RING_COUNT }, (_, i) => {
              const r = DISC_R * 0.28 + (DISC_R * 0.68) * (i / (RING_COUNT - 1));
              return (
                <circle
                  key={i}
                  cx={DC} cy={DC_Y}
                  r={r}
                  fill="none"
                  stroke="rgba(255,255,255,0.035)"
                  strokeWidth={1.2}
                />
              );
            })}

            {/* Prismatic glint — screen blend */}
            <circle
              cx={DC} cy={DC_Y}
              r={DISC_R}
              fill="url(#prism2)"
              style={{ mixBlendMode: "screen" }}
            />

            {/* Warm overlay — memories beneath the surface */}
            <circle
              cx={DC} cy={DC_Y}
              r={DISC_R}
              fill="url(#warmOverlay2)"
              style={{ mixBlendMode: "screen" }}
            />

            {/* Highlight streak — gives the pond sheen */}
            <ellipse
              cx={DC - 28} cy={DC_Y - 55}
              rx={62} ry={12}
              fill="rgba(255,255,255,0.14)"
              transform={`rotate(-28, ${DC - 28}, ${DC_Y - 55})`}
            />

            {/* Shimmer reflections (the "pond" surface glints) */}
            {SHIMMER_POS.map((s, i) => (
              <ellipse
                key={i}
                ref={(el) => { shimmerRefs.current[i] = el; }}
                cx={s.cx} cy={s.cy}
                rx={s.rx} ry={s.ry}
                fill="rgba(255,255,255,0.55)"
                opacity={0}
                transform={`rotate(${s.rot}, ${s.cx}, ${s.cy})`}
                style={{ mixBlendMode: "screen" }}
              />
            ))}

            {/* Hub */}
            <circle cx={DC} cy={DC_Y} r={28} fill="url(#hub2)" />
            <circle cx={DC} cy={DC_Y} r={HOLE_R} fill={TOKEN.page} />
            <circle cx={DC} cy={DC_Y} r={5}  fill={TOKEN.blue} />

            {/* Outer rim */}
            <circle
              cx={DC} cy={DC_Y}
              r={DISC_R}
              fill="none"
              stroke="rgba(90,200,250,0.35)"
              strokeWidth={1.5}
            />
          </g>

          {/* ── SCAN BEAM (clipped to disc) ─────────────────────────────────── */}
          <g clipPath="url(#discClip2)">
            <rect
              ref={beamRef}
              x={-VW * 0.2}
              y={DC_Y - DISC_R}
              width={VW * 0.4}
              height={DISC_R * 2}
              fill="url(#beamGrad2)"
              opacity={0}
              filter="url(#beamGlow)"
              style={{ mixBlendMode: "screen" }}
            />
          </g>
        </g>

        {/* ── POLAROID MEMORY FRAMES ─────────────────────────────────────────── */}
        {POLAROIDS.map((p, i) => (
          <g
            key={p.id}
            ref={(el) => { polaroidRefs.current[i] = el; }}
            style={{
              filter: "blur(12px)",
              transformOrigin: `${PW / 2}px ${PH / 2}px`,
              transformBox: "fill-box",
            }}
          >
            {/* Card drop shadow */}
            <g filter="url(#cardShadow)">
              {/* White Polaroid border */}
              <rect
                x={-PW / 2} y={-PH / 2}
                width={PW} height={PH}
                rx={3} ry={3}
                fill="#F5F0E8"
              />
              {/* Real photo */}
              <clipPath id={`polarClip${p.id}`}>
                <rect
                  x={-PW / 2 + 5}  y={-PH / 2 + 5}
                  width={PW - 10}   height={PH - PB - 6}
                  rx={1.5} ry={1.5}
                />
              </clipPath>
              <image
                className="polar-img"
                href={POLAROID_IMGS[i]}
                x={-PW / 2 + 5}    y={-PH / 2 + 5}
                width={PW - 10}    height={PH - PB - 6}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#polarClip${p.id})`}
              />
              {/* Warm sepia overlay */}
              <rect
                x={-PW / 2 + 5}    y={-PH / 2 + 5}
                width={PW - 10}    height={PH - PB - 6}
                rx={1.5} ry={1.5}
                fill={TOKEN.sepia}
                opacity={0.18}
                style={{ mixBlendMode: "multiply" }}
              />
              {/* Label on white bottom strip */}
              <text
                x={0}
                y={PH / 2 - 6}
                textAnchor="middle"
                fontSize={8}
                fontFamily="'Sora', sans-serif"
                fill="#3A2A1A"
                opacity={0.7}
              >
                {p.label}
              </text>
            </g>
          </g>
        ))}

        {/* ── VIGNETTE ───────────────────────────────────────────────────────── */}
        <rect
          x={0} y={0}
          width={VW} height={VH}
          fill="url(#vignette2)"
          style={{ pointerEvents: "none" }}
        />
      </svg>

      {/* ── CAPTION (Cormorant Garamond italic) ──────────────────────────────── */}
      <div
        ref={captionRef}
        style={{
          position:  "absolute",
          bottom:    "14%",
          left:      0,
          right:     0,
          textAlign: "center",
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle:  "italic",
          fontWeight: 300,
          fontSize:   "clamp(16px, 3.2vw, 22px)",
          color:      TOKEN.text,
          opacity:    0,
          letterSpacing: "0.02em",
          lineHeight: 1.35,
          pointerEvents: "none",
          textShadow: "0 2px 18px rgba(0,0,0,0.55)",
        }}
      >
        Your memories were never gone —<br />
        <span style={{ color: TOKEN.sepia }}>they were waiting to be lifted out.</span>
      </div>

      {/* ── CTA TAG ────────────────────────────────────────────────────────────── */}
      <div
        ref={ctaRef}
        style={{
          position:   "absolute",
          bottom:     "5%",
          left:       "50%",
          transform:  "translateX(-50%)",
          display:    "flex",
          alignItems: "center",
          gap:        8,
          opacity:    0,
          pointerEvents: "none",
        }}
      >
        {/* Pill — Recover · Restore · Preserve */}
        <div style={{
          fontFamily:    "'Sora', sans-serif",
          fontSize:      "clamp(9px, 1.6vw, 11px)",
          fontWeight:    600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color:         TOKEN.textMuted,
        }}>
          Recover&nbsp;·&nbsp;Restore&nbsp;·&nbsp;Preserve
        </div>
        {/* Brand mark dot */}
        <div style={{
          width:        8,
          height:       8,
          borderRadius: "50%",
          background:   TOKEN.blue,
          boxShadow:    `0 0 10px 3px ${TOKEN.blue}55`,
        }} />
      </div>

      {/* Film grain layer */}
      <div
        style={{
          position:     "absolute",
          inset:        0,
          pointerEvents: "none",
          opacity:       0.05,
          mixBlendMode:  "overlay",
          borderRadius:  "inherit",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
