import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

/**
 * Concept1_TheLastRead — "Recovery Radar"
 *
 * Top-down optical disc rendered in SVG. A volumetric radar sweep of
 * blue scan-light rotates around the disc surface. As the sweep passes
 * over "dead" grey/amber-corroded sectors, they ignite and resolve into
 * warm memory thumbnails (silhouettes/gradients only — no external images).
 *
 * A live mono readout ticks: sectors scanned, files found, % recovered.
 * The disc starts cold/grey/decaying and finishes warm and whole.
 *
 * Emotional arc (≈5s, plays once on mount):
 *   BEAT 1 · THE DECAY        0.00–0.80s  disc materializes cold, corroded sectors visible
 *   BEAT 2 · FIRST SCAN       0.80–1.60s  radar sweep starts, first sectors ignite
 *   BEAT 3 · RECOVERY         1.60–3.40s  sweep completes first pass; memories emerge
 *   BEAT 4 · WARMTH BLOOMS    3.40–4.40s  disc warms fully; readout nears completion
 *   BEAT 5 · PRESERVED        4.40–5.40s  tagline fades in; gentle breathing begins
 *
 * Design tokens used:
 *   page #0B1220 · text #F0EDE8 · textMuted #94A3B8
 *   blue #0A84FF · amber #F59E0B · sepia #C8956C · success #34D399
 *   Fonts: Sora · "Cormorant Garamond" · JetBrains Mono
 */

// ── Geometry ──────────────────────────────────────────────────────────────────
const SIZE = 520;
const C = SIZE / 2;
const DISC_R = C - 28;        // outer disc edge
const TRACK_OUT = DISC_R - 8; // outermost data track
const TRACK_IN = DISC_R * 0.35; // inner hub clearance
const HUB_R = DISC_R * 0.14;

// Number of concentric track rings (visual texture)
const TRACK_COUNT = 24;

// ── Sector layout ─────────────────────────────────────────────────────────────
const SECTOR_COUNT = 72; // 5° each
// Corrosion / damage map — indices of damaged sectors
const DAMAGED_SECTORS = new Set([
  4, 5, 6, 22, 23, 24, 25, 38, 39, 40, 55, 56, 57, 58, 68, 69, 70, 71,
]);
// Memory silhouette types assigned to each damaged sector
const MEMORY_TYPES = ["wedding", "birthday", "child", "christmas", "vacation", "fishing"];

// ── Memory thumbnail definitions (pure SVG silhouettes) ───────────────────────
// Each is drawn relative to local origin (0,0), sized ~40×40 units
type MemoryType = "wedding" | "birthday" | "child" | "christmas" | "vacation" | "fishing";

function memoryPath(type: MemoryType): React.ReactNode {
  switch (type) {
    case "wedding":
      // Two interlinked hearts
      return (
        <g>
          <path d="M-10-4 C-10-10,-2-12,0-6 C2-12,10-10,10-4 C10,4,0,12,0,12 C0,12,-10,4,-10-4Z" fill="#C8956C" opacity="0.85" />
          <path d="M-2-10 C-2-16,6-18,8-12 C10-18,18-16,18-10 C18-2,8,6,8,6 C8,6,-2-2,-2-10Z" fill="#F59E0B" opacity="0.7" transform="translate(4,-2)" />
        </g>
      );
    case "birthday":
      // Birthday cake with candle
      return (
        <g>
          <rect x="-12" y="2" width="24" height="14" rx="3" fill="#C8956C" opacity="0.85" />
          <rect x="-8" y="-4" width="16" height="8" rx="2" fill="#F59E0B" opacity="0.75" />
          <rect x="-1.5" y="-14" width="3" height="12" fill="#F0EDE8" opacity="0.9" />
          <ellipse cx="0" cy="-14" rx="3" ry="4" fill="#F59E0B" opacity="0.95" />
        </g>
      );
    case "child":
      // Child silhouette (stick figure implied)
      return (
        <g>
          <circle cx="0" cy="-10" r="6" fill="#C8956C" opacity="0.85" />
          <path d="M0-4 L-8,10 M0-4 L8,10 M-4,1 L4,1 M0-4 L0,10" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8" />
        </g>
      );
    case "christmas":
      // Christmas tree
      return (
        <g>
          <polygon points="0,-14 -12,8 12,8" fill="#34D399" opacity="0.8" />
          <polygon points="0,-8 -8,6 8,6" fill="#34D399" opacity="0.9" />
          <rect x="-3" y="8" width="6" height="6" fill="#C8956C" opacity="0.85" />
          <circle cx="-4" cy="-2" r="2" fill="#F59E0B" opacity="0.9" />
          <circle cx="4" cy="2" r="1.5" fill="#F0EDE8" opacity="0.9" />
          <circle cx="0" cy="-14" r="2" fill="#F59E0B" opacity="1" />
        </g>
      );
    case "vacation":
      // Beach / waves + sun
      return (
        <g>
          <circle cx="2" cy="-8" r="7" fill="#F59E0B" opacity="0.9" />
          <path d="M-14,4 Q-7,0,0,4 Q7,8,14,4" stroke="#0A84FF" strokeWidth="3" fill="none" opacity="0.8" />
          <path d="M-14,10 Q-7,6,0,10 Q7,14,14,10" stroke="#0A84FF" strokeWidth="2.5" fill="none" opacity="0.6" />
        </g>
      );
    case "fishing":
      // Fishing rod silhouette
      return (
        <g>
          <line x1="-12" y1="10" x2="10" y2="-12" stroke="#C8956C" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
          <line x1="10" y1="-12" x2="16" y2="4" stroke="#F0EDE8" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.75" />
          <circle cx="16" cy="6" r="3" fill="#0A84FF" opacity="0.9" />
        </g>
      );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function sectorArcPath(
  cx: number,
  cy: number,
  ro: number,
  ri: number,
  startDeg: number,
  endDeg: number
): string {
  const p1 = polar(cx, cy, ro, startDeg);
  const p2 = polar(cx, cy, ro, endDeg);
  const p3 = polar(cx, cy, ri, endDeg);
  const p4 = polar(cx, cy, ri, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return (
    `M ${p1.x} ${p1.y}` +
    ` A ${ro} ${ro} 0 ${large} 1 ${p2.x} ${p2.y}` +
    ` L ${p3.x} ${p3.y}` +
    ` A ${ri} ${ri} 0 ${large} 0 ${p4.x} ${p4.y}` +
    " Z"
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Concept1_TheLastRead({
  reducedMotion = false,
}: {
  reducedMotion?: boolean;
}) {
  const scopeRef = useRef<HTMLDivElement>(null);

  // Sector fill refs (each of the 72 sectors)
  const sectorRefs = useRef<(SVGPathElement | null)[]>([]);
  // Memory thumbnail groups (one per damaged sector)
  const memoryRefs = useRef<(SVGGElement | null)[]>([]);
  // Radar wedge
  const radarRef = useRef<SVGGElement>(null);
  const radarWedgeRef = useRef<SVGPathElement>(null);
  const radarBeamRef = useRef<SVGLineElement>(null);
  // Readout display
  const pctRef = useRef<HTMLSpanElement>(null);
  const sectorsRef = useRef<HTMLSpanElement>(null);
  const filesRef = useRef<HTMLSpanElement>(null);
  // Tagline
  const taglineRef = useRef<HTMLDivElement>(null);
  // Outer amber ring (corroded state)
  const corrosionRef = useRef<SVGCircleElement>(null);
  // Disc glow
  const discGlowRef = useRef<HTMLDivElement>(null);

  const [isReduced, setIsReduced] = useState(reducedMotion);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReduced(reducedMotion || mq.matches);
    const handler = (e: MediaQueryListEvent) =>
      setIsReduced(reducedMotion || e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [reducedMotion]);

  useEffect(() => {
    if (!scopeRef.current) return;

    // ── REDUCED MOTION: jump to final warm restored state ──────────────────
    if (isReduced) {
      // All sectors: recovered warm teal
      sectorRefs.current.forEach((el, i) => {
        if (!el) return;
        const isDamaged = DAMAGED_SECTORS.has(i);
        gsap.set(el, {
          attr: { fill: isDamaged ? "#34D399" : "#1A3A6B" },
          opacity: isDamaged ? 0.95 : 0.55,
        });
      });
      // All memories: visible
      memoryRefs.current.forEach((el) => {
        if (!el) return;
        gsap.set(el, { opacity: 1 });
      });
      // Radar hidden
      if (radarRef.current) gsap.set(radarRef.current, { opacity: 0 });
      // Corrosion ring hidden
      if (corrosionRef.current) gsap.set(corrosionRef.current, { opacity: 0 });
      // Readout: final values
      if (pctRef.current) pctRef.current.textContent = "100";
      if (sectorsRef.current) sectorsRef.current.textContent = "2304";
      if (filesRef.current) filesRef.current.textContent = "847";
      // Tagline visible
      if (taglineRef.current) gsap.set(taglineRef.current, { opacity: 1 });
      // Disc glow: warm
      if (discGlowRef.current)
        gsap.set(discGlowRef.current, { opacity: 1, background: "radial-gradient(closest-side, rgba(245,158,11,0.28), rgba(52,211,153,0.14) 55%, transparent 80%)" });
      return;
    }

    // ── ANIMATED PATH ─────────────────────────────────────────────────────
    const cleanups: Array<() => void> = [];

    const ctx = gsap.context(() => {
      // ── PRIME: damaged state ─────────────────────────────────────────────
      sectorRefs.current.forEach((el, i) => {
        if (!el) return;
        const isDamaged = DAMAGED_SECTORS.has(i);
        gsap.set(el, {
          attr: { fill: isDamaged ? "#3D2A0A" : "#0E1C36" },
          opacity: isDamaged ? 0.9 : 0.45,
        });
      });
      memoryRefs.current.forEach((el) => {
        if (!el) return;
        gsap.set(el, { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" });
      });
      if (radarRef.current) gsap.set(radarRef.current, { opacity: 0, rotate: 0, transformOrigin: `${C}px ${C}px` });
      if (radarWedgeRef.current) gsap.set(radarWedgeRef.current, { opacity: 0 });
      if (radarBeamRef.current) gsap.set(radarBeamRef.current, { opacity: 0 });
      if (corrosionRef.current) gsap.set(corrosionRef.current, { opacity: 0.7 });
      if (taglineRef.current) gsap.set(taglineRef.current, { opacity: 0, y: 8 });
      if (discGlowRef.current) gsap.set(discGlowRef.current, { opacity: 0.3 });
      if (pctRef.current) pctRef.current.textContent = "0";
      if (sectorsRef.current) sectorsRef.current.textContent = "0";
      if (filesRef.current) filesRef.current.textContent = "0";

      // ── Radar sweep rotation (continuous after BEAT 2 starts) ──────────
      // We'll start the rotate in the timeline, then let it run
      const radarSweep = gsap.to(radarRef.current, {
        rotate: 360,
        duration: 4.2,
        ease: "none",
        repeat: -1,
        transformOrigin: `${C}px ${C}px`,
        paused: true,
      });
      cleanups.push(() => radarSweep.kill());

      // ── Corrosion amber pulse ────────────────────────────────────────────
      const corrosionPulse = gsap.to(corrosionRef.current, {
        opacity: 0.35,
        duration: 1.6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        paused: true,
      });
      cleanups.push(() => corrosionPulse.kill());

      // ── Tick readout counters ─────────────────────────────────────────────
      // We'll drive via an onUpdate in the main tl
      const readout = { pct: 0, sectors: 0, files: 0 };

      // ── Main narrative timeline ──────────────────────────────────────────
      const tl = gsap.timeline({
        delay: 0.2,
        defaults: { ease: "power2.inOut" },
      });

      /* BEAT 1 · THE DECAY — 0.00–0.80s
         Disc materializes from dark: corroded sectors glow amber dully.
         A feeling of age, damage, unreadability. */
      tl.to(corrosionRef.current, { opacity: 0.65, duration: 0.8, ease: "power1.out" }, 0);
      tl.add(() => corrosionPulse.play(), 0.5);

      // Damaged sectors glow amber-dull (decay warmth)
      const damagedEls: SVGPathElement[] = [];
      sectorRefs.current.forEach((el, i) => {
        if (el && DAMAGED_SECTORS.has(i)) damagedEls.push(el);
      });
      tl.to(damagedEls, {
        attr: { fill: "#7A3D0A" },
        opacity: 0.85,
        duration: 0.8,
        ease: "power1.out",
        stagger: 0.04,
      }, 0.1);

      /* BEAT 2 · FIRST SCAN — 0.80–1.60s
         Radar sweep fades in; beam starts rotating; first sectors resolve. */
      tl.to(radarRef.current, { opacity: 1, duration: 0.5 }, 0.8);
      tl.to(radarWedgeRef.current, { opacity: 0.85, duration: 0.4 }, 0.9);
      tl.to(radarBeamRef.current, { opacity: 1, duration: 0.4 }, 0.9);
      tl.add(() => { radarSweep.play(); corrosionPulse.pause(); }, 0.95);
      tl.to(corrosionRef.current, { opacity: 0, duration: 0.6 }, 1.0);

      /* BEAT 3 · RECOVERY — 1.60–3.40s
         As radar sweeps ~1 full rotation, sector by sector ignites:
         grey→teal, memory thumbnail blooms in. Readout ticks.
         We stagger all sectors to resolve over ~1.8s window. */

      // Resolve sectors staggered across the first full sweep (4.2s period,
      // but we compress the "found" feeling into 1.6s of timeline time).
      const sortedDamaged = [...DAMAGED_SECTORS].sort((a, b) => a - b);
      sortedDamaged.forEach((sectorIdx, order) => {
        const el = sectorRefs.current[sectorIdx];
        if (!el) return;
        const at = 1.65 + order * 0.12;
        // Sector: flash bright (#34D399 teal) then settle
        tl.to(el, {
          attr: { fill: "#5DFFC0" },
          opacity: 1,
          duration: 0.18,
          ease: "power3.out",
        }, at);
        tl.to(el, {
          attr: { fill: "#34D399" },
          opacity: 0.92,
          duration: 0.45,
          ease: "power2.out",
        }, at + 0.18);
      });

      // Memory thumbnails bloom in (staggered, offset slightly after sector flash)
      let memIdx = 0;
      sortedDamaged.forEach((_sectorIdx, order) => {
        const memEl = memoryRefs.current[memIdx];
        if (memEl) {
          const at = 1.72 + order * 0.12;
          tl.to(memEl, {
            opacity: 1,
            scale: 1,
            duration: 0.4,
            ease: "back.out(1.8)",
            transformOrigin: "50% 50%",
          }, at);
        }
        memIdx++;
      });

      // Readout counter tick — drives pct / sectors / files
      tl.to(readout, {
        pct: 100,
        sectors: 2304,
        files: 847,
        duration: 2.8,
        ease: "power1.inOut",
        onUpdate: () => {
          if (pctRef.current)
            pctRef.current.textContent = String(Math.round(readout.pct));
          if (sectorsRef.current)
            sectorsRef.current.textContent = String(Math.round(readout.sectors));
          if (filesRef.current)
            filesRef.current.textContent = String(Math.round(readout.files));
        },
      }, 1.6);

      // Non-damaged sectors gently warm from cold blue to a richer indigo
      const healthyEls: SVGPathElement[] = [];
      sectorRefs.current.forEach((el, i) => {
        if (el && !DAMAGED_SECTORS.has(i)) healthyEls.push(el);
      });
      tl.to(healthyEls, {
        attr: { fill: "#1A3A6B" },
        opacity: 0.65,
        duration: 1.8,
        ease: "power1.inOut",
      }, 1.65);

      /* BEAT 4 · WARMTH BLOOMS — 3.40–4.40s
         Disc fully recovered. Disc glow transitions cold→warm. Radar slows. */
      tl.to(discGlowRef.current, {
        opacity: 0.85,
        duration: 1.2,
        ease: "power2.out",
      }, 3.3);
      // We can't change the gradient inline easily — use filter hue-rotate trick
      tl.to(scopeRef.current, {
        "--glow-h": "38",  // CSS variable nudge — amber shift
        duration: 1.2,
        ease: "power1.inOut",
      }, 3.3);

      /* BEAT 5 · PRESERVED — 4.40–5.40s
         Radar wedge fades (job done). Tagline appears. Breathing begins. */
      tl.to(radarWedgeRef.current, { opacity: 0.4, duration: 0.6 }, 4.3);
      tl.to(radarBeamRef.current, { opacity: 0.7, duration: 0.6 }, 4.3);
      // Keep the radar gently sweeping forever so the disc never looks frozen.
      tl.to(radarRef.current, { opacity: 0.55, duration: 0.8 }, 4.5);
      tl.to(taglineRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power2.out",
      }, 4.6);

      // ── Eternal breath after narrative ends ────────────────────────────
      tl.add(() => {
        gsap.to(scopeRef.current, {
          scale: 1.007,
          duration: 6,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          transformOrigin: "50% 50%",
        });
        gsap.to(discGlowRef.current, {
          opacity: 0.6,
          duration: 4.5,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      }, 5.5);

      // ── Hover: gentle warmth amplification ─────────────────────────────
      const pointerMq = window.matchMedia("(pointer: fine)");
      if (pointerMq.matches) {
        const onEnter = () => {
          gsap.to(discGlowRef.current, { opacity: 1, scale: 1.08, duration: 0.7, ease: "power2.out" });
        };
        const onLeave = () => {
          gsap.to(discGlowRef.current, { opacity: 0.7, scale: 1, duration: 0.9, ease: "power2.out" });
        };
        scopeRef.current?.addEventListener("mouseenter", onEnter);
        scopeRef.current?.addEventListener("mouseleave", onLeave);
        cleanups.push(() => {
          scopeRef.current?.removeEventListener("mouseenter", onEnter);
          scopeRef.current?.removeEventListener("mouseleave", onLeave);
        });
      }
    }, scopeRef);

    return () => {
      cleanups.forEach((fn) => fn());
      ctx.revert();
    };
  }, [isReduced]);

  // Pre-compute sector geometry (stable, no random)
  const stepDeg = 360 / SECTOR_COUNT;
  // Map damaged sector index → memory type (cycling through MEMORY_TYPES)
  const sortedDamagedArr = [...DAMAGED_SECTORS].sort((a, b) => a - b);

  // Pre-compute memory thumbnail positions (center of each damaged sector's annular region)
  const memoryPositions = sortedDamagedArr.map((sectorIdx) => {
    const midDeg = sectorIdx * stepDeg + stepDeg / 2;
    const midR = (TRACK_OUT + TRACK_IN) / 2;
    return polar(C, C, midR, midDeg);
  });

  return (
    <div
      ref={scopeRef}
      className="relative w-full will-change-transform"
      style={{
        maxWidth: 520,
        aspectRatio: "1 / 1",
      }}
      aria-hidden
    >
      {/* Ambient disc glow — cold blue start, warms to amber after recovery */}
      <div
        ref={discGlowRef}
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(closest-side, rgba(10,132,255,0.32), rgba(52,211,153,0.14) 55%, transparent 80%)",
          filter: "blur(32px)",
          opacity: 0.3,
          borderRadius: "50%",
          willChange: "opacity, transform",
        }}
      />

      {/* SVG disc ─────────────────────────────────────────────────────── */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          display: "block",
          filter: "drop-shadow(0 24px 52px rgba(10,18,32,0.55))",
          overflow: "visible",
        }}
      >
        <defs>
          {/* Disc body gradient — deep navy */}
          <radialGradient id="lr-discBody" cx="0.42" cy="0.38" r="0.82">
            <stop offset="0%" stopColor="#1B2E52" />
            <stop offset="45%" stopColor="#0E1C38" />
            <stop offset="80%" stopColor="#080F20" />
            <stop offset="100%" stopColor="#040810" />
          </radialGradient>

          {/* Rainbow refraction at hub */}
          <radialGradient id="lr-prism" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.18" />
            <stop offset="20%" stopColor="#5AC8FA" stopOpacity="0.22" />
            <stop offset="40%" stopColor="#A78BFA" stopOpacity="0.18" />
            <stop offset="60%" stopColor="#F472B6" stopOpacity="0.12" />
            <stop offset="80%" stopColor="#FBBF24" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#34C759" stopOpacity="0.08" />
          </radialGradient>

          {/* Hub gradient */}
          <radialGradient id="lr-hub" cx="0.5" cy="0.35" r="0.8">
            <stop offset="0%" stopColor="#E8EDF8" />
            <stop offset="55%" stopColor="#C4CDD8" />
            <stop offset="100%" stopColor="#8090A4" />
          </radialGradient>

          {/* Radar sweep wedge gradient (polar-ish via linearGradient approximation) */}
          <linearGradient id="lr-radar" x1="0.5" y1="0.5" x2="1" y2="0">
            <stop offset="0%" stopColor="#0A84FF" stopOpacity="0" />
            <stop offset="50%" stopColor="#0A84FF" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0A84FF" stopOpacity="0.08" />
          </linearGradient>

          {/* Corrosion/decay ring gradient */}
          <linearGradient id="lr-corrosion" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#92400E" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.45" />
          </linearGradient>

          {/* Radar beam leading edge */}
          <linearGradient id="lr-beam" x1="0.5" y1="1" x2="0.5" y2="0">
            <stop offset="0%" stopColor="#0A84FF" stopOpacity="0" />
            <stop offset="70%" stopColor="#5AC8FA" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.95" />
          </linearGradient>

          {/* Clip to disc circle */}
          <clipPath id="lr-discClip">
            <circle cx={C} cy={C} r={DISC_R} />
          </clipPath>

          {/* Memory thumbnail clip */}
          <clipPath id="lr-memClip">
            <circle cx={C} cy={C} r={DISC_R} />
          </clipPath>

          {/* Soft blur for track rings */}
          <filter id="lr-soft">
            <feGaussianBlur stdDeviation="0.8" />
          </filter>
        </defs>

        {/* ── Outer corrosion ring (amber, pulses in Beat 1) ─────────────── */}
        <circle
          ref={corrosionRef}
          cx={C}
          cy={C}
          r={DISC_R + 6}
          fill="none"
          stroke="url(#lr-corrosion)"
          strokeWidth={10}
          opacity={0}
          style={{ filter: "blur(4px)" }}
        />

        {/* ── Disc base ─────────────────────────────────────────────────── */}
        <circle cx={C} cy={C} r={DISC_R} fill="url(#lr-discBody)" />

        {/* ── Prismatic refraction overlay ──────────────────────────────── */}
        <circle
          cx={C}
          cy={C}
          r={DISC_R}
          fill="url(#lr-prism)"
          style={{ mixBlendMode: "screen" }}
        />

        {/* ── Concentric data track rings (texture) ─────────────────────── */}
        <g clipPath="url(#lr-discClip)" filter="url(#lr-soft)">
          {Array.from({ length: TRACK_COUNT }, (_, i) => {
            const r = TRACK_IN + ((TRACK_OUT - TRACK_IN) * i) / (TRACK_COUNT - 1);
            return (
              <circle
                key={i}
                cx={C}
                cy={C}
                r={r}
                fill="none"
                stroke="rgba(255,255,255,0.045)"
                strokeWidth={1.1}
              />
            );
          })}
        </g>

        {/* ── Sector ring (72 sectors, 5° each) ────────────────────────── */}
        <g clipPath="url(#lr-discClip)">
          {Array.from({ length: SECTOR_COUNT }, (_, i) => {
            const startDeg = i * stepDeg;
            const endDeg = startDeg + stepDeg - 0.3;
            const isDamaged = DAMAGED_SECTORS.has(i);
            return (
              <path
                key={i}
                ref={(el) => { sectorRefs.current[i] = el; }}
                d={sectorArcPath(C, C, TRACK_OUT, TRACK_IN, startDeg, endDeg)}
                fill={isDamaged ? "#3D2A0A" : "#0E1C36"}
                opacity={isDamaged ? 0.9 : 0.45}
              />
            );
          })}
        </g>

        {/* ── Memory thumbnails (one per damaged sector) ───────────────── */}
        <g clipPath="url(#lr-memClip)">
          {sortedDamagedArr.map((sectorIdx, order) => {
            const pos = memoryPositions[order];
            const type = MEMORY_TYPES[order % MEMORY_TYPES.length] as MemoryType;
            return (
              <g
                key={sectorIdx}
                ref={(el) => { memoryRefs.current[order] = el; }}
                transform={`translate(${pos.x} ${pos.y}) scale(0.52)`}
                opacity={0}
              >
                {/* Warm backdrop */}
                <circle cx="0" cy="0" r="22" fill="#1A1208" opacity="0.85" />
                <circle cx="0" cy="0" r="19" fill="#C8956C" opacity="0.22" />
                {memoryPath(type)}
              </g>
            );
          })}
        </g>

        {/* ── Hub bright streak (light refraction) ─────────────────────── */}
        <ellipse
          cx={C - 18}
          cy={C - 52}
          rx={52}
          ry={14}
          fill="rgba(255,255,255,0.14)"
          transform={`rotate(-22 ${C - 18} ${C - 52})`}
        />

        {/* ── Hub ──────────────────────────────────────────────────────── */}
        <circle cx={C} cy={C} r={HUB_R + 4} fill="url(#lr-hub)" />
        <circle cx={C} cy={C} r={HUB_R - 4} fill="#060C1A" />
        <circle cx={C} cy={C} r={6} fill="#0A84FF" opacity={0.9} />

        {/* ── Radar sweep group (rotates) ──────────────────────────────── */}
        <g
          ref={radarRef}
          style={{ transformOrigin: `${C}px ${C}px` }}
          opacity={0}
          clipPath="url(#lr-discClip)"
        >
          {/* Volumetric wedge — 60° fan of blue scan-light */}
          <path
            ref={radarWedgeRef}
            d={(() => {
              // Build a 60° wedge path from center
              const r = TRACK_OUT + 2;
              const p1 = polar(C, C, r, 0);
              const p2 = polar(C, C, r, 60);
              return `M ${C} ${C} L ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y} Z`;
            })()}
            fill="url(#lr-radar)"
            opacity={0}
          />
          {/* Leading beam line (bright edge of sweep) */}
          <line
            ref={radarBeamRef}
            x1={C}
            y1={C}
            x2={C}
            y2={C - TRACK_OUT}
            stroke="url(#lr-beam)"
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0}
          />
          {/* Trailing fade dot at beam tip */}
          <circle
            cx={C}
            cy={C - TRACK_OUT}
            r={4}
            fill="#0A84FF"
            opacity={0.9}
          />
        </g>

        {/* ── Outer ring fine border ────────────────────────────────────── */}
        <circle
          cx={C}
          cy={C}
          r={DISC_R}
          fill="none"
          stroke="rgba(148,163,184,0.25)"
          strokeWidth={1.5}
        />
        <circle
          cx={C}
          cy={C}
          r={DISC_R - 2}
          fill="none"
          stroke="rgba(10,132,255,0.18)"
          strokeWidth={1}
        />
      </svg>

      {/* ── Readout display (HUD overlay) ──────────────────────────────── */}
      <div
        className="pointer-events-none absolute"
        style={{
          bottom: "6%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "86%",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "clamp(9px, 1.8vw, 12px)",
          color: "#94A3B8",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
          letterSpacing: "0.04em",
          userSelect: "none",
        }}
      >
        <span style={{ whiteSpace: "nowrap" }}>
          SECTORS{" "}
          <span
            ref={sectorsRef}
            style={{ color: "#0A84FF", fontVariantNumeric: "tabular-nums" }}
          >
            0
          </span>
        </span>
        <span style={{ whiteSpace: "nowrap" }}>
          FILES{" "}
          <span
            ref={filesRef}
            style={{ color: "#34D399", fontVariantNumeric: "tabular-nums" }}
          >
            0
          </span>
        </span>
        <span style={{ whiteSpace: "nowrap" }}>
          RECOVERED{" "}
          <span
            ref={pctRef}
            style={{ color: "#F59E0B", fontVariantNumeric: "tabular-nums" }}
          >
            0
          </span>
          %
        </span>
      </div>

      {/* ── Tagline (BEAT 5) ────────────────────────────────────────────── */}
      <div
        ref={taglineRef}
        className="pointer-events-none absolute"
        style={{
          top: "5%",
          left: "50%",
          transform: "translateX(-50%)",
          opacity: 0,
          textAlign: "center",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(13px, 2.6vw, 18px)",
            color: "#F0EDE8",
            letterSpacing: "0.12em",
            opacity: 0.92,
          }}
        >
          Recover · Restore · Preserve
        </span>
      </div>

      {/* Film grain — subtle texture over entire frame */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: "50%",
          opacity: 0.04,
          mixBlendMode: "overlay",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
