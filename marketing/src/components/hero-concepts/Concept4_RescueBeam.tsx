/**
 * Concept 4 — "The Rescue Beam"
 * Editorial minimal, Linear/Arc/Stripe tier.
 *
 * A single clean disc on dark. One elegant scanning arc of light. Recovered
 * sectors illuminate sequentially in warm gold with exquisite ease curves and
 * micro-stagger. A perfectly-typeset mono readout updates with confident calm.
 * Secondary motion: breathing glow, a single hairline ring that traces once to
 * "seal" the archive.
 *
 * 5-beat emotional arc (≈ 6s, plays once on mount):
 *   BEAT 1 · REVELATION      0.00–0.80s  disc materialises from dark, scratches visible
 *   BEAT 2 · THREAT          0.80–1.80s  amber decay pulse radiates outward — memory at risk
 *   BEAT 3 · SCAN            1.80–4.00s  beam arc sweeps, sectors relight warm gold, readout climbs
 *   BEAT 4 · SEAL            4.00–5.20s  hairline ring traces to close the vault
 *   BEAT 5 · KEEP            5.20–∞      breathing glow; disc held, safe
 *
 * Design tokens: page #0B1220 · blue #0A84FF · amber #F59E0B · sepia #C8956C
 *   success #34D399 · text #F0EDE8 · textMuted #94A3B8
 * Fonts: Sora (UI) · "Cormorant Garamond" italic (emotional) · JetBrains Mono (readout)
 */

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

gsap.registerPlugin(DrawSVGPlugin);

// ─── Geometry ────────────────────────────────────────────────────────────────
const SIZE = 520;
const C = SIZE / 2;
const R_DISC = 196;   // disc outer edge
const R_HUB = 38;     // centre hole radius

// Sector ring band: data tracks sit between these radii
const R_TRACK_OUT = R_DISC - 4;
const R_TRACK_IN = R_DISC - 60;

// Number of sector slices that will illuminate during the scan
const SECTOR_COUNT = 72;

// Final readout values (interpolated via GSAP proxy during scan)
const READOUT_FINAL = { pct: 100, files: 261, sectors: 15634 };

// Three faint concentric data-track rings rendered for texture
const DATA_TRACK_RADII = [R_DISC - 20, R_DISC - 40, R_DISC - 60];

// Hairline scratch paths (surface blemishes, revealed at start, fade during seal)
const SCRATCHES = [
  "M 185 155 Q 250 200 260 280",
  "M 300 140 Q 280 210 290 290",
  "M 220 310 Q 260 330 310 320",
];

// ─── Polar helpers ────────────────────────────────────────────────────────────
function toXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function sectorPath(
  cx: number, cy: number,
  ro: number, ri: number,
  startDeg: number, endDeg: number,
): string {
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const o1 = toXY(cx, cy, ro, startDeg);
  const o2 = toXY(cx, cy, ro, endDeg);
  const i1 = toXY(cx, cy, ri, endDeg);
  const i2 = toXY(cx, cy, ri, startDeg);
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${ro} ${ro} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${ri} ${ri} 0 ${large} 0 ${i2.x} ${i2.y}`,
    "Z",
  ].join(" ");
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Concept4_RescueBeam({
  reducedMotion = false,
}: {
  reducedMotion?: boolean;
}) {
  const scopeRef = useRef<HTMLDivElement>(null);

  // Disc refs
  const discBodyRef = useRef<SVGCircleElement>(null);
  const hubRef = useRef<SVGCircleElement>(null);

  // Sector refs (illuminated one by one)
  const sectorRefs = useRef<(SVGPathElement | null)[]>([]);

  // Scratch refs
  const scratchRefs = useRef<(SVGPathElement | null)[]>([]);

  // Beam arc ref (the scanning sweep)
  const beamArcRef = useRef<SVGCircleElement>(null);
  const beamHeadRef = useRef<SVGCircleElement>(null);

  // Seal ring ref
  const sealRingRef = useRef<SVGCircleElement>(null);

  // Decay pulse ref
  const decayPulseRef = useRef<SVGCircleElement>(null);

  // Glow halo (breathing after KEEP)
  const glowRef = useRef<SVGRadialGradientElement>(null);
  const glowCircleRef = useRef<SVGCircleElement>(null);

  // Readout state (driven via GSAP proxy to avoid excessive re-renders)
  const [readout, setReadout] = useState({ pct: 0, files: 0, sectors: 0 });
  const readoutProxy = useRef({ pct: 0, files: 0, sectors: 0 });

  // Reduced-motion gate (prop + system preference)
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

    // ── REDUCED MOTION: show final frame immediately ──────────────────────────
    if (isReduced) {
      // All sectors lit warm gold
      sectorRefs.current.forEach((el) => {
        if (!el) return;
        gsap.set(el, { opacity: 1, fill: "#C8956C" });
      });
      // Scratches barely visible (honored, not erased)
      scratchRefs.current.forEach((el) => {
        if (!el) return;
        gsap.set(el, { opacity: 0.08 });
      });
      // Seal ring fully drawn
      if (sealRingRef.current) {
        gsap.set(sealRingRef.current, { drawSVG: "100%", opacity: 0.7 });
      }
      // Beam hidden
      if (beamArcRef.current) gsap.set(beamArcRef.current, { opacity: 0 });
      if (beamHeadRef.current) gsap.set(beamHeadRef.current, { opacity: 0 });
      if (decayPulseRef.current) gsap.set(decayPulseRef.current, { opacity: 0 });
      // Glow softly on
      if (glowCircleRef.current) gsap.set(glowCircleRef.current, { opacity: 0.35 });
      // Readout final
      setReadout(READOUT_FINAL);
      return;
    }

    // ── ANIMATED PATH ─────────────────────────────────────────────────────────
    const ctx = gsap.context(() => {
      const sectors = sectorRefs.current.filter(Boolean) as SVGPathElement[];
      const scratches = scratchRefs.current.filter(Boolean) as SVGPathElement[];

      // PRIME — initial dark state
      gsap.set(discBodyRef.current, { opacity: 0 });
      gsap.set(hubRef.current, { opacity: 0 });
      gsap.set(sectors, { opacity: 0, fill: "#0F1E38" });
      gsap.set(scratches, { opacity: 0 });
      gsap.set(sealRingRef.current, { drawSVG: "0%", opacity: 0 });
      gsap.set(beamArcRef.current, { opacity: 0, rotate: -90, transformOrigin: `${C}px ${C}px` });
      gsap.set(beamHeadRef.current, { opacity: 0 });
      gsap.set(decayPulseRef.current, { scale: 0.3, opacity: 0, transformOrigin: `${C}px ${C}px` });
      gsap.set(glowCircleRef.current, { opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });

      /* ══ BEAT 1 · REVELATION ══════════════════════════════════ 0.00–0.80s ══
         The disc materialises from the dark. Not a happy entrance — a sombre
         reveal. Scratches appear faintly on the surface. Cost of time. */
      tl.to(discBodyRef.current, { opacity: 1, duration: 0.7, ease: "power1.out" }, 0)
        .to(hubRef.current, { opacity: 1, duration: 0.5, ease: "power1.out" }, 0.15)
        .to(scratches, { opacity: 0.22, duration: 0.6, stagger: 0.12, ease: "power1.in" }, 0.25)
        // Sector ring dims into view (very faint, unlit state)
        .to(sectors, { opacity: 0.07, duration: 0.55, stagger: { amount: 0.3 } }, 0.2);

      /* ══ BEAT 2 · THREAT ══════════════════════════════════════ 0.80–1.80s ══
         An amber decay pulse radiates outward from the disc center. This is the
         loss-aversion moment: the memory is visibly degrading. */
      tl.to(decayPulseRef.current, {
        scale: 2.4,
        opacity: 0.55,
        duration: 0.45,
        ease: "power2.out",
      }, 0.9)
        .to(decayPulseRef.current, {
          scale: 3.6,
          opacity: 0,
          duration: 0.6,
          ease: "power1.out",
        }, 1.25);

      /* ══ BEAT 3 · SCAN ════════════════════════════════════════ 1.80–4.00s ══
         The rescue beam. A hairline arc of #0A84FF sweeps 360° around the disc.
         As it passes each sector, the sector snaps to warm gold (#C8956C→#F59E0B→
         settled #C8956C). A small bright head dot leads the arc.
         The mono readout climbs in parallel — calm, certain, counting up. */

      const SCAN_DURATION = 2.2;
      const SCAN_START = 1.8;
      const BEAM_CIRCUMFERENCE = 2 * Math.PI * R_TRACK_OUT;

      // Beam arc: starts at top (−90°), sweeps full 360. We animate strokeDashoffset.
      // The arc starts as a 2px thin line that extends as the sweep progresses.
      tl.to(beamArcRef.current, { opacity: 0.9, duration: 0.2, ease: "power2.out" }, SCAN_START)
        .to(beamHeadRef.current, { opacity: 1, duration: 0.15 }, SCAN_START + 0.05);

      // Beam sweep — we rotate the entire beam group 360°
      tl.fromTo(
        [beamArcRef.current, beamHeadRef.current],
        { rotate: -90, transformOrigin: `${C}px ${C}px` },
        {
          rotate: 270,
          transformOrigin: `${C}px ${C}px`,
          duration: SCAN_DURATION,
          ease: "power1.inOut",
        },
        SCAN_START,
      );

      // As the beam sweeps, illuminate sectors sequentially
      sectors.forEach((el, i) => {
        const sectorAngle = (360 / SECTOR_COUNT) * i; // 0° = top of disc
        // Time when beam reaches this sector (proportional to angle / 360)
        const arrivalProgress = sectorAngle / 360;
        const at = SCAN_START + arrivalProgress * SCAN_DURATION;

        // Flash to bright blue-white the instant the beam hits (30ms), then warm gold settle
        tl.to(el, { fill: "#A5C8FF", opacity: 1, duration: 0.04 }, at)
          .to(el, { fill: "#C8956C", opacity: 0.92, duration: 0.4, ease: "power2.out" }, at + 0.04);
      });

      // Readout climbs — GSAP proxy object drives setReadout
      tl.to(readoutProxy.current, {
        pct: READOUT_FINAL.pct,
        files: READOUT_FINAL.files,
        sectors: READOUT_FINAL.sectors,
        duration: SCAN_DURATION,
        ease: "power1.inOut",
        onUpdate: () => {
          setReadout({
            pct: Math.round(readoutProxy.current.pct),
            files: Math.round(readoutProxy.current.files),
            sectors: Math.round(readoutProxy.current.sectors),
          });
        },
      }, SCAN_START);

      // Fade beam and head at end of scan
      tl.to(beamArcRef.current, { opacity: 0, duration: 0.4, ease: "power1.in" }, SCAN_START + SCAN_DURATION - 0.1)
        .to(beamHeadRef.current, { opacity: 0, duration: 0.25, ease: "power1.in" }, SCAN_START + SCAN_DURATION - 0.15);

      // Scratches warm to very faint gold as the beam passes (honored, not erased)
      tl.to(scratches, { opacity: 0.06, stroke: "#F59E0B", duration: 0.8, stagger: 0.15 }, SCAN_START + 0.4);

      /* ══ BEAT 4 · SEAL ════════════════════════════════════════ 4.00–5.20s ══
         A hairline ring traces once around the disc rim — the vault closing.
         Calm. Certain. The archive is sealed. */
      const SEAL_START = SCAN_START + SCAN_DURATION + 0.15;
      tl.to(sealRingRef.current, { opacity: 0.7, duration: 0.2 }, SEAL_START)
        .fromTo(
          sealRingRef.current,
          { drawSVG: "0%" },
          { drawSVG: "100%", duration: 1.1, ease: "power2.inOut" },
          SEAL_START,
        );

      /* ══ BEAT 5 · KEEP ════════════════════════════════════════ 5.20–∞ ══════
         Disc held. A gentle breathing glow — the memory at rest.
         Sectors settle, glow softly breathes. */
      const KEEP_START = SEAL_START + 1.25;
      tl.to(glowCircleRef.current, { opacity: 0.28, duration: 1.0, ease: "power1.out" }, KEEP_START)
        .add(() => {
          // Eternal breath — runs forever until unmount
          gsap.to(glowCircleRef.current, {
            opacity: 0.42,
            duration: 5.0,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
          // Very subtle disc scale breathe
          gsap.to(scopeRef.current, {
            scale: 1.006,
            duration: 6.5,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            transformOrigin: "50% 50%",
          });
          // Hairline seal ring dims to resting opacity
          gsap.to(sealRingRef.current, {
            opacity: 0.5,
            duration: 2.0,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        }, KEEP_START);

      // Beam arc stroke dash — we set up a partial arc dasharray that travels
      // This is handled purely via the rotation + a fixed visible segment
      const BEAM_ARC_VISIBLE = BEAM_CIRCUMFERENCE * 0.045; // ~16° visible arc
      const BEAM_ARC_GAP = BEAM_CIRCUMFERENCE - BEAM_ARC_VISIBLE;
      if (beamArcRef.current) {
        gsap.set(beamArcRef.current, {
          strokeDasharray: `${BEAM_ARC_VISIBLE} ${BEAM_ARC_GAP}`,
          strokeDashoffset: 0,
        });
      }
    }, scopeRef);

    return () => ctx.revert();
  }, [isReduced]);

  // Pre-compute sector paths (stable — same every render)
  const sectors = Array.from({ length: SECTOR_COUNT }, (_, i) => {
    const step = 360 / SECTOR_COUNT;
    const start = i * step;
    const end = start + step - 0.4; // hairline gap between sectors
    return sectorPath(C, C, R_TRACK_OUT, R_TRACK_IN, start, end);
  });

  // Beam arc radius sits at the outer track edge
  const beamCircumference = 2 * Math.PI * R_TRACK_OUT;
  const beamArcVisible = beamCircumference * 0.045;
  const beamArcGap = beamCircumference - beamArcVisible;

  return (
    <div
      ref={scopeRef}
      className="relative will-change-transform"
      style={{
        width: "100%",
        maxWidth: SIZE,
        aspectRatio: "1 / 1",
      }}
      aria-hidden
    >
      {/* ── Outer glow halo (CSS layer, very faint until KEEP) ──────────────── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(closest-side, rgba(10,132,255,0.18) 0%, rgba(200,149,108,0.10) 50%, transparent 80%)",
          filter: "blur(32px)",
          zIndex: 0,
        }}
      />

      {/* ── Main SVG ────────────────────────────────────────────────────────── */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{
          display: "block",
          position: "relative",
          zIndex: 1,
          filter: "drop-shadow(0 24px 56px rgba(4,9,26,0.55))",
        }}
      >
        <defs>
          {/* Disc body gradient — deep navy, slightly lighter at centre */}
          <radialGradient id="rb-discGrad" cx="0.42" cy="0.38" r="0.85">
            <stop offset="0%" stopColor="#111E38" />
            <stop offset="45%" stopColor="#0B1628" />
            <stop offset="100%" stopColor="#060D1A" />
          </radialGradient>

          {/* Prismatic iridescent shimmer (very subtle) */}
          <linearGradient id="rb-prism" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#5AC8FA" stopOpacity="0.07" />
            <stop offset="40%"  stopColor="#A78BFA" stopOpacity="0.05" />
            <stop offset="75%"  stopColor="#F59E0B" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#34D399" stopOpacity="0.06" />
          </linearGradient>

          {/* Hub hole gradient */}
          <radialGradient id="rb-hub" cx="0.5" cy="0.4" r="0.7">
            <stop offset="0%" stopColor="#192840" />
            <stop offset="100%" stopColor="#06101E" />
          </radialGradient>

          {/* Beam arc — electric blue */}
          <linearGradient id="rb-beamGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0A84FF" stopOpacity="0" />
            <stop offset="50%" stopColor="#0A84FF" />
            <stop offset="100%" stopColor="#5AC8FA" stopOpacity="0.8" />
          </linearGradient>

          {/* Seal ring — warm gold */}
          <linearGradient id="rb-sealGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#C8956C" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>

          {/* Decay pulse fill — amber, radial */}
          <radialGradient id="rb-decayGrad" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>

          {/* Breathing glow — sepia/gold warmth */}
          <radialGradient
            id="rb-glowGrad"
            ref={glowRef}
            cx="0.5"
            cy="0.5"
            r="0.5"
          >
            <stop offset="0%" stopColor="#C8956C" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#F59E0B" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>

          {/* Scratch soften */}
          <filter id="rb-scratchBlur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.8" />
          </filter>

          {/* Clip to disc circle (prevents beam bleeding outside) */}
          <clipPath id="rb-discClip">
            <circle cx={C} cy={C} r={R_DISC} />
          </clipPath>
        </defs>

        {/* ── Decay pulse (BEAT 2, radiates then vanishes) ─────────────────── */}
        <circle
          ref={decayPulseRef}
          cx={C}
          cy={C}
          r={R_DISC * 0.55}
          fill="url(#rb-decayGrad)"
          opacity={0}
        />

        {/* ── Disc body ────────────────────────────────────────────────────── */}
        <circle
          ref={discBodyRef}
          cx={C}
          cy={C}
          r={R_DISC}
          fill="url(#rb-discGrad)"
          opacity={0}
        />

        {/* Prismatic iridescent shimmer layer */}
        <circle
          cx={C}
          cy={C}
          r={R_DISC}
          fill="url(#rb-prism)"
          opacity={0}
          style={{ mixBlendMode: "screen" }}
        />

        {/* Data track lines (texture only — very faint concentric rings) */}
        <g clipPath="url(#rb-discClip)" opacity={0.18}>
          {DATA_TRACK_RADII.map((r, i) => (
            <circle
              key={i}
              cx={C}
              cy={C}
              r={r}
              fill="none"
              stroke="#94A3B8"
              strokeWidth={0.5}
            />
          ))}
          {/* Additional micro-groove rings */}
          {Array.from({ length: 24 }, (_, i) => (
            <circle
              key={`groove-${i}`}
              cx={C}
              cy={C}
              r={R_TRACK_IN + (i * (R_TRACK_OUT - R_TRACK_IN)) / 24}
              fill="none"
              stroke="#94A3B8"
              strokeWidth={0.3}
              opacity={0.6}
            />
          ))}
        </g>

        {/* ── Sector ring (illuminated by beam sweep) ──────────────────────── */}
        <g>
          {sectors.map((d, i) => (
            <path
              key={i}
              ref={(el) => { sectorRefs.current[i] = el; }}
              d={d}
              fill="#0F1E38"
              opacity={0.07}
            />
          ))}
        </g>

        {/* Outer hairline disc rim */}
        <circle
          cx={C}
          cy={C}
          r={R_DISC}
          fill="none"
          stroke="#94A3B8"
          strokeWidth={0.6}
          opacity={0.25}
        />

        {/* ── Surface scratches (honored, slide to faint on heal) ───────────── */}
        <g filter="url(#rb-scratchBlur)" clipPath="url(#rb-discClip)">
          {SCRATCHES.map((d, i) => (
            <path
              key={i}
              ref={(el) => { scratchRefs.current[i] = el; }}
              d={d}
              stroke="#8B8680"
              strokeWidth={1.0}
              fill="none"
              strokeLinecap="round"
              opacity={0}
            />
          ))}
        </g>

        {/* ── Beam scanning arc (BEAT 3) ───────────────────────────────────── */}
        {/* Rotating group: beam arc + head dot */}
        <circle
          ref={beamArcRef}
          cx={C}
          cy={C}
          r={R_TRACK_OUT}
          fill="none"
          stroke="#0A84FF"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeDasharray={`${beamArcVisible} ${beamArcGap}`}
          strokeDashoffset={0}
          opacity={0}
          style={{ transformOrigin: `${C}px ${C}px` }}
        />
        {/* Beam head — bright dot at the leading edge of the arc */}
        <circle
          ref={beamHeadRef}
          cx={C}
          cy={C - R_TRACK_OUT}
          r={4}
          fill="#5AC8FA"
          opacity={0}
          style={{
            filter: "drop-shadow(0 0 6px #0A84FF)",
            transformOrigin: `${C}px ${C}px`,
          }}
        />

        {/* ── Hub hole ────────────────────────────────────────────────────── */}
        <circle
          ref={hubRef}
          cx={C}
          cy={C}
          r={R_HUB}
          fill="url(#rb-hub)"
          stroke="#94A3B8"
          strokeWidth={0.6}
          opacity={0}
        />
        {/* Hub inner pin */}
        <circle cx={C} cy={C} r={5} fill="#0A84FF" opacity={0.6} />

        {/* ── Seal ring (BEAT 4 — traces once at disc outer edge) ──────────── */}
        <circle
          ref={sealRingRef}
          cx={C}
          cy={C}
          r={R_DISC + 6}
          fill="none"
          stroke="url(#rb-sealGrad)"
          strokeWidth={1.2}
          strokeLinecap="round"
          opacity={0}
        />

        {/* ── Breathing glow (BEAT 5, warm sepia) ─────────────────────────── */}
        <circle
          ref={glowCircleRef}
          cx={C}
          cy={C}
          r={R_DISC * 0.8}
          fill="url(#rb-glowGrad)"
          opacity={0}
          style={{ mixBlendMode: "screen" }}
        />
      </svg>

      {/* ── Mono readout overlay ────────────────────────────────────────────── */}
      {/* Positioned bottom-left of the disc — generous negative space */}
      <div
        className="pointer-events-none absolute"
        style={{
          bottom: "9%",
          left: "7%",
          fontFamily: '"JetBrains Mono", "Courier New", monospace',
          fontSize: "clamp(9px, 1.8vw, 12px)",
          lineHeight: 1.7,
          color: "#94A3B8",
          letterSpacing: "0.04em",
          zIndex: 2,
          userSelect: "none",
        }}
      >
        <div style={{ color: "#F59E0B", fontWeight: 500, marginBottom: 2 }}>
          HEIRVO SCAN
        </div>
        <div>
          FILES_FOUND{" "}
          <span style={{ color: "#F0EDE8" }}>
            {readout.files.toString().padStart(3, "0")}
          </span>
        </div>
        <div>
          SECTORS_OK{" "}
          <span style={{ color: "#F0EDE8" }}>
            {readout.sectors.toString().padStart(5, "0")}
          </span>
        </div>
        <div>
          RECOVERED{" "}
          <span
            style={{
              color: readout.pct >= 100 ? "#34D399" : "#0A84FF",
              fontWeight: 600,
            }}
          >
            {readout.pct.toString().padStart(3, " ")}%
          </span>
        </div>
      </div>

      {/* ── Emotional tagline (BEAT 5 presence, always visible but muted til end) */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: "8%",
          right: "5%",
          textAlign: "right",
          zIndex: 2,
          userSelect: "none",
        }}
      >
        <div
          style={{
            fontFamily: '"Cormorant Garamond", "Georgia", serif',
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: "clamp(13px, 2.6vw, 17px)",
            color: "#C8956C",
            opacity: 0.72,
            lineHeight: 1.4,
            letterSpacing: "0.01em",
          }}
        >
          Recover · Restore · Preserve
        </div>
      </div>

      {/* Film grain texture layer */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: "50%",
          opacity: 0.04,
          mixBlendMode: "overlay",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          zIndex: 3,
        }}
      />
    </div>
  );
}
