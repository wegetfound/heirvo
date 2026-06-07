import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

/**
 * Concept 3 — "Degradation Reversed"
 *
 * Loss-aversion front-loaded. Opens on VISIBLE DECAY: amber rot bloom creeping
 * from the rim, colour draining to grey, scanline/glitch corruption, fragments
 * flaking off and drifting away. Holds the dread ~1.5 s. Then Heirvo engages
 * and runs ENTROPY BACKWARD: decay retreats, fragments fly home, colour and warmth
 * flood from the centre outward, glitch resolves to clean. Ends on a pristine,
 * sealed, glowing archive.
 *
 * SVG filter pipeline (c3-decay):
 *   feTurbulence  → noise/warp driven by GSAP .attr({ baseFrequency })
 *   feColorMatrix → saturation + amber tint driven by GSAP .attr({ values })
 *   feGaussianBlur → defocus/focus driven by GSAP .attr({ stdDeviation })
 *   feDisplacementMap → warps the disc image using noise during decay
 *
 * Emotional arc (≈ 5.5 s):
 *   BEAT 1 · DECAY        0.00–1.50 s  amber rot, desaturation, fragments splinter
 *   BEAT 2 · DREAD HOLD   1.50–2.00 s  peak damage — hold the fear
 *   BEAT 3 · SCAN         2.00–3.20 s  blue scan beam, turbulence retreats
 *   BEAT 4 · REVERSAL     3.20–4.60 s  warmth floods in, fragments fly home
 *   BEAT 5 · SEALED       4.60–5.50 s  pristine disc, brand mark, download cue
 *
 * Design tokens (from brief):
 *   #0B1220 page · #0A84FF blue · #F59E0B amber · #C8956C sepia
 *   #34D399 success · #F0EDE8 text · #94A3B8 textMuted
 */

// ── Design tokens ─────────────────────────────────────────────────────────────
const BLUE        = "#0A84FF";
const AMBER       = "#F59E0B";
const SEPIA       = "#C8956C";
const SUCCESS     = "#34D399";
const TEXT        = "#F0EDE8";
const TEXT_MUTED  = "#94A3B8";
const PAGE_DARK   = "#04091A";

// ── Viewport ──────────────────────────────────────────────────────────────────
const W  = 560;
const H  = 560;
const CX = W / 2;
const CY = H / 2;

// Disc geometry
const R_DISC  = 234;   // outer disc radius
const R_LABEL = 96;    // inner label area
const R_HUB   = 26;    // spindle hole

// ── Fragment data ──────────────────────────────────────────────────────────────
// Each fragment: px/py = rest position (relative to CX/CY), tx/ty = scatter target,
// pts = polygon points (small irregular quad, origin = 0,0, drawn at translate).
const FRAGMENTS = [
  { id: 0,  px:  72, py: -188, tx:  120, ty: -290, pts: "0,0 24,-6 28,12 6,20"  },
  { id: 1,  px: -58, py: -205, tx: -108, ty: -315, pts: "0,0 18,4 22,24 0,28"   },
  { id: 2,  px: 196, py: -96,  tx:  310, ty: -142, pts: "0,0 26,-4 30,16 4,22"  },
  { id: 3,  px: 218, py:  38,  tx:  338, ty:   56, pts: "0,0 22,2 24,20 0,22"   },
  { id: 4,  px: 176, py: 148,  tx:  275, ty:  228, pts: "0,0 20,8 16,26 -4,18"  },
  { id: 5,  px: -78, py: 196,  tx: -128, ty:  310, pts: "0,0 26,10 22,30 -2,24" },
  { id: 6,  px:-196, py:  96,  tx: -306, ty:  146, pts: "0,0 20,-4 22,14 2,20"  },
  { id: 7,  px:-218, py: -58,  tx: -338, ty:  -88, pts: "0,0 22,6 20,26 -2,20"  },
  { id: 8,  px: 136, py: -168, tx:  208, ty: -258, pts: "0,0 16,0 18,16 0,16"   },
  { id: 9,  px:-136, py: -158, tx: -210, ty: -240, pts: "0,0 14,-2 18,14 2,16"  },
  { id: 10, px:  28, py:  228, tx:   44, ty:  346, pts: "0,0 18,4 16,22 -2,20"  },
  { id: 11, px:-158, py:  176, tx: -248, ty:  268, pts: "0,0 22,10 18,30 -4,22" },
] as const;

// ── Concentric data rings ─────────────────────────────────────────────────────
const DATA_RINGS = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  r: R_LABEL + 10 + i * 10.5,
}));

// ── Component ─────────────────────────────────────────────────────────────────
export default function Concept3_DegradationReversed({
  reducedMotion = false,
}: {
  reducedMotion?: boolean;
}) {
  const scopeRef     = useRef<HTMLDivElement>(null);

  // SVG filter primitive refs
  const turbRef      = useRef<SVGFETurbulenceElement>(null);
  const colorMxRef   = useRef<SVGFEColorMatrixElement>(null);
  const blurRef      = useRef<SVGFEGaussianBlurElement>(null);
  const displaceRef  = useRef<SVGFEDisplacementMapElement>(null);

  // Main disc group
  const discGroupRef = useRef<SVGGElement>(null);

  // Fragment polygon refs
  const fragRefs     = useRef<(SVGPolygonElement | null)[]>([]);

  // Scan beam + ring
  const scanBeamRef  = useRef<SVGRectElement>(null);
  const scanRingRef  = useRef<SVGCircleElement>(null);

  // Damage overlays
  const rotBloomRef  = useRef<SVGCircleElement>(null);
  const glitchRef    = useRef<SVGGElement>(null);
  const scanlinesRef = useRef<SVGRectElement>(null);
  const greyWashRef  = useRef<SVGCircleElement>(null);

  // Restoration elements
  const restoreGlowRef  = useRef<SVGCircleElement>(null);
  const archiveRingRef  = useRef<SVGCircleElement>(null);
  const prismaticRef    = useRef<SVGCircleElement>(null);

  // Brand + text
  const brandGroupRef = useRef<SVGGElement>(null);
  const taglineRef    = useRef<SVGTextElement>(null);
  const subtitleRef   = useRef<SVGTextElement>(null);

  // Reduced motion state
  const [isReduced, setIsReduced] = useState(reducedMotion);

  // ── Honour system prefers-reduced-motion ─────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReduced(reducedMotion || mq.matches);
    const handler = (e: MediaQueryListEvent) =>
      setIsReduced(reducedMotion || e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [reducedMotion]);

  // ── Main animation effect ─────────────────────────────────────────────────
  useEffect(() => {
    if (!scopeRef.current) return;

    // ── REDUCED MOTION — static pristine final frame ──────────────────────
    if (isReduced) {
      // Filter: zero noise, zero blur, neutral colour matrix
      turbRef.current?.setAttribute("baseFrequency", "0");
      turbRef.current?.setAttribute("numOctaves", "1");
      colorMxRef.current?.setAttribute(
        "values",
        "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
      );
      blurRef.current?.setAttribute("stdDeviation", "0");
      displaceRef.current?.setAttribute("scale", "0");

      // Damage elements — hidden
      const hide = [
        rotBloomRef, glitchRef, scanlinesRef, greyWashRef, scanBeamRef, scanRingRef,
      ] as const;
      hide.forEach((r) => { if (r.current) (r.current as SVGElement).style.opacity = "0"; });

      // Restoration elements — revealed
      if (restoreGlowRef.current) {
        restoreGlowRef.current.style.opacity = "0.4";
        restoreGlowRef.current.setAttribute("r", String(R_DISC));
      }
      if (prismaticRef.current)  prismaticRef.current.style.opacity = "0.65";
      if (archiveRingRef.current) {
        archiveRingRef.current.style.opacity = "1";
        archiveRingRef.current.setAttribute("stroke-dashoffset", "0");
      }
      if (brandGroupRef.current) brandGroupRef.current.style.opacity = "1";
      if (taglineRef.current)    taglineRef.current.style.opacity = "1";
      if (subtitleRef.current)   subtitleRef.current.style.opacity = "1";
      if (discGroupRef.current)  discGroupRef.current.style.opacity = "1";

      // Fragments hidden (absorbed back)
      fragRefs.current.forEach((el) => { if (el) el.style.opacity = "0"; });
      return;
    }

    // ── FULL ANIMATION ────────────────────────────────────────────────────
    const ctx = gsap.context(() => {

      // ── PRIME: set opening damaged state ─────────────────────────────────
      // SVG filter: max turbulence + amber matrix + defocus
      gsap.set(turbRef.current, {
        attr: { baseFrequency: "0.65 0.40", numOctaves: 4, seed: 2 },
      });
      gsap.set(colorMxRef.current, {
        attr: {
          // Desaturated + amber shift: R boosted, G pulled, B suppressed
          values:
            "0.85 0.18 0.00 0 0.06  " +
            "0.18 0.52 0.00 0 0.00  " +
            "0.00 0.08 0.30 0 0.00  " +
            "0    0    0    0.85 0",
        },
      });
      gsap.set(blurRef.current, { attr: { stdDeviation: 4.5 } });
      gsap.set(displaceRef.current, { attr: { scale: 22 } });

      // Damage overlays: initial state
      gsap.set(rotBloomRef.current,  { opacity: 0 });
      gsap.set(glitchRef.current,    { opacity: 0 });
      gsap.set(scanlinesRef.current, { opacity: 0 });
      gsap.set(greyWashRef.current,  { opacity: 0 });

      // Scan elements
      gsap.set(scanBeamRef.current, { x: -(W + 80), opacity: 0 });
      gsap.set(scanRingRef.current, { opacity: 0, attr: { r: 0 } });

      // Restoration elements
      gsap.set(restoreGlowRef.current, { opacity: 0, attr: { r: R_DISC * 0.15 } });
      gsap.set(archiveRingRef.current, {
        opacity: 0,
        strokeDashoffset: 2 * Math.PI * (R_DISC + 14),
      });
      gsap.set(prismaticRef.current,  { opacity: 0 });
      gsap.set(brandGroupRef.current, { opacity: 0, y: 14 });
      gsap.set(taglineRef.current,    { opacity: 0, y: 10 });
      gsap.set(subtitleRef.current,   { opacity: 0, y: 8 });

      // Disc: opens invisible
      gsap.set(discGroupRef.current, {
        opacity: 0,
        scale: 0.95,
        transformOrigin: `${CX}px ${CY}px`,
      });

      // Fragments: home position, hidden
      fragRefs.current.forEach((el, i) => {
        if (!el) return;
        const f = FRAGMENTS[i];
        gsap.set(el, {
          x: 0, y: 0, opacity: 0, rotation: 0,
          transformOrigin: `${CX + f.px}px ${CY + f.py}px`,
        });
      });

      /* ══════════════════════════════════════════════════════════════════
         BEAT 1 · DECAY  0.00–1.50 s
         Disc materialises already sick. Amber rot blooms from rim,
         scanlines crackle, fragments flake away.
      ══════════════════════════════════════════════════════════════════ */
      const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });

      // Disc fades in already damaged
      tl.to(discGroupRef.current, {
        opacity: 1, scale: 1,
        duration: 0.65,
        ease: "power1.out",
      }, 0);

      // Grey desaturation floods immediately
      tl.to(greyWashRef.current, { opacity: 0.6, duration: 0.55 }, 0.08);

      // Amber rot creeps in from rim
      tl.to(rotBloomRef.current, { opacity: 0.78, duration: 0.85, ease: "power1.in" }, 0.15);

      // Scanlines crackle on
      tl.to(scanlinesRef.current, { opacity: 0.52, duration: 0.3 }, 0.22);

      // Glitch bands stutter in
      tl.to(glitchRef.current, { opacity: 0.72, duration: 0.18 }, 0.38);

      // Turbulence intensifies (oxidation spreading)
      tl.to(turbRef.current, {
        attr: { baseFrequency: "0.78 0.52" },
        duration: 0.95,
        ease: "power1.in",
      }, 0.28);

      // Displacement peaks
      tl.to(displaceRef.current, {
        attr: { scale: 32 },
        duration: 0.9,
        ease: "power1.in",
      }, 0.28);

      // Colour matrix peak: very amber/desat
      tl.to(colorMxRef.current, {
        attr: {
          values:
            "0.90 0.22 0.00 0 0.08  " +
            "0.12 0.45 0.00 0 0.00  " +
            "0.00 0.05 0.25 0 0.00  " +
            "0    0    0    0.88 0",
        },
        duration: 1.0,
        ease: "power1.in",
      }, 0.2);

      // Blur deepens a little
      tl.to(blurRef.current, { attr: { stdDeviation: 6.5 }, duration: 0.9, ease: "power1.in" }, 0.2);

      // Glitch jitter (runs alongside tl, independent)
      const glitchJitter = gsap.to(glitchRef.current, {
        x: "+=7",
        duration: 0.072,
        repeat: 24,
        yoyo: true,
        ease: "steps(2)",
        delay: 0.42,
      });

      // Scanlines roll continuously
      const scanRoll = gsap.to(scanlinesRef.current, {
        yPercent: -15,
        duration: 1.0,
        repeat: -1,
        ease: "none",
        delay: 0.22,
      });

      // Fragments flake off, staggered
      fragRefs.current.forEach((el, i) => {
        if (!el) return;
        const f = FRAGMENTS[i];
        const at = 0.42 + i * 0.065;
        // Brief appearance at home position
        tl.to(el, { opacity: 0.88, duration: 0.16 }, at);
        // Scatter outward
        tl.to(el, {
          x: f.tx - f.px,
          y: f.ty - f.py,
          opacity: 0,
          rotation: (i % 2 === 0 ? 1 : -1) * (14 + i * 5),
          duration: 0.88,
          ease: "power2.out",
        }, at + 0.16);
      });

      /* ══════════════════════════════════════════════════════════════════
         BEAT 2 · DREAD HOLD  1.50–2.00 s
         Peak damage. Everything broken. Hold the fear.
      ══════════════════════════════════════════════════════════════════ */

      // Blur pulse (camera trying to focus and failing)
      tl.to(blurRef.current, { attr: { stdDeviation: 8 }, duration: 0.28 }, 1.52);
      tl.to(blurRef.current, { attr: { stdDeviation: 5 }, duration: 0.32 }, 1.80);

      // Colour at peak amber rot
      tl.to(colorMxRef.current, {
        attr: {
          values:
            "0.92 0.24 0.00 0 0.10  " +
            "0.08 0.40 0.00 0 0.00  " +
            "0.00 0.04 0.22 0 0.00  " +
            "0    0    0    0.90 0",
        },
        duration: 0.4,
      }, 1.52);

      /* ══════════════════════════════════════════════════════════════════
         BEAT 3 · HEIRVO SCANS  2.00–3.20 s
         Cold blue scan beam enters. Turbulence begins retreating.
         Glitch & scanlines fade.
      ══════════════════════════════════════════════════════════════════ */

      // Kill rolling/jitter animations
      tl.add(() => {
        scanRoll.kill();
        glitchJitter.kill();
      }, 2.0);

      // Scan beam sweeps L → R across full disc
      tl.to(scanBeamRef.current, { opacity: 0.88, duration: 0.22 }, 2.0);
      tl.to(scanBeamRef.current, {
        x: W + 80,
        duration: 1.1,
        ease: "power2.inOut",
      }, 2.0);
      tl.to(scanBeamRef.current, { opacity: 0, duration: 0.3 }, 2.95);

      // Scan ring pulse from centre
      tl.to(scanRingRef.current, {
        opacity: 0.9,
        attr: { r: R_DISC * 0.18 },
        duration: 0.28,
        ease: "power2.out",
      }, 2.08);
      tl.to(scanRingRef.current, {
        attr: { r: R_DISC * 1.04 },
        opacity: 0,
        duration: 0.88,
        ease: "power2.out",
      }, 2.22);

      // Turbulence retreats (chaos → order)
      tl.to(turbRef.current, {
        attr: { baseFrequency: "0.12 0.08" },
        duration: 1.15,
        ease: "power2.inOut",
      }, 2.0);

      // Displacement retreats
      tl.to(displaceRef.current, {
        attr: { scale: 8 },
        duration: 1.15,
        ease: "power2.inOut",
      }, 2.0);

      // Colour matrix recovers toward neutral
      tl.to(colorMxRef.current, {
        attr: {
          values:
            "1 0 0 0 0  " +
            "0 1 0 0 0  " +
            "0 0 1 0 0  " +
            "0 0 0 0.60 0",
        },
        duration: 1.15,
        ease: "power2.inOut",
      }, 2.0);

      // Blur begins recovering
      tl.to(blurRef.current, { attr: { stdDeviation: 2.2 }, duration: 1.15, ease: "power2.out" }, 2.0);

      // Glitch & scanlines fade as beam passes
      tl.to(glitchRef.current, { opacity: 0, duration: 0.85 }, 2.08);
      tl.to(scanlinesRef.current, { opacity: 0, duration: 0.95 }, 2.08);

      // Rot bloom begins retreating
      tl.to(rotBloomRef.current, { opacity: 0.28, duration: 1.0 }, 2.1);
      // Grey wash lifts
      tl.to(greyWashRef.current, { opacity: 0, duration: 1.05 }, 2.1);

      /* ══════════════════════════════════════════════════════════════════
         BEAT 4 · REVERSAL  3.20–4.60 s
         ENTROPY RUNS BACKWARD.
         Warmth + colour flood from centre outward. Fragments fly home.
         Turbulence fully resolves. Disc becomes prismatic and alive.
      ══════════════════════════════════════════════════════════════════ */

      // Warmth restoration glow pulses from centre outward
      tl.to(restoreGlowRef.current, {
        opacity: 0.92,
        attr: { r: R_DISC * 0.45 },
        duration: 0.55,
        ease: "power2.out",
      }, 3.2);
      tl.to(restoreGlowRef.current, {
        attr: { r: R_DISC * 1.05 },
        opacity: 0.28,
        duration: 0.92,
        ease: "power2.inOut",
      }, 3.62);

      // Turbulence fully resolves (zero noise)
      tl.to(turbRef.current, {
        attr: { baseFrequency: "0.0 0.0" },
        duration: 1.05,
        ease: "power3.out",
      }, 3.2);

      // Displacement fully resolves
      tl.to(displaceRef.current, {
        attr: { scale: 0 },
        duration: 1.05,
        ease: "power3.out",
      }, 3.2);

      // feColorMatrix returns to full neutral
      tl.to(colorMxRef.current, {
        attr: {
          values:
            "1 0 0 0 0  " +
            "0 1 0 0 0  " +
            "0 0 1 0 0  " +
            "0 0 0 1 0",
        },
        duration: 1.05,
        ease: "power3.out",
      }, 3.2);

      // Blur fully resolves
      tl.to(blurRef.current, { attr: { stdDeviation: 0 }, duration: 1.1, ease: "power3.out" }, 3.2);

      // Rot bloom fully retreats
      tl.to(rotBloomRef.current, { opacity: 0, duration: 0.72 }, 3.2);

      // Prismatic rainbow glint floods in
      tl.to(prismaticRef.current, { opacity: 0.65, duration: 1.05, ease: "power2.out" }, 3.38);

      // FRAGMENTS FLY HOME — entropy reversed
      fragRefs.current.forEach((el, i) => {
        if (!el) return;
        const f = FRAGMENTS[i];
        const at = 3.2 + i * 0.055;
        // Snap to scatter position (they were invisible after scatter)
        tl.set(el,
          { x: f.tx - f.px, y: f.ty - f.py, opacity: 0, rotation: (i % 2 === 0 ? 1 : -1) * (14 + i * 5) },
          at - 0.02
        );
        // Fly home
        tl.to(el, {
          x: 0, y: 0,
          opacity: 1,
          rotation: 0,
          duration: 0.68,
          ease: "back.out(1.6)",
        }, at);
        // Integrate into disc surface (fade out as they "merge")
        tl.to(el, {
          opacity: 0,
          duration: 0.32,
          ease: "power1.in",
        }, at + 0.65);
      });

      /* ══════════════════════════════════════════════════════════════════
         BEAT 5 · SEALED  4.60–5.50 s
         Archive ring traces (vault closing). Brand mark appears.
         Tagline + download cue fade in.
      ══════════════════════════════════════════════════════════════════ */

      // Archive ring traces around the disc
      tl.to(archiveRingRef.current, { opacity: 1, duration: 0.38 }, 4.55);
      tl.to(archiveRingRef.current, {
        strokeDashoffset: 0,
        duration: 0.92,
        ease: "power2.inOut",
      }, 4.62);

      // Brand group rises in
      tl.to(brandGroupRef.current, {
        opacity: 1, y: 0,
        duration: 0.65,
        ease: "power2.out",
      }, 4.68);

      // Tagline
      tl.to(taglineRef.current, {
        opacity: 1, y: 0,
        duration: 0.52,
        ease: "power2.out",
      }, 4.88);

      // Subtitle / download cue
      tl.to(subtitleRef.current, {
        opacity: 1, y: 0,
        duration: 0.48,
        ease: "power2.out",
      }, 5.08);

      /* ── ETERNAL BREATH after 5.5 s ─────────────────────────────── */
      tl.add(() => {
        gsap.to(scopeRef.current, {
          scale: 1.006,
          duration: 7.0,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          transformOrigin: "50% 50%",
        });
        gsap.to(restoreGlowRef.current, {
          opacity: 0.16,
          duration: 4.2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
        gsap.to(archiveRingRef.current, {
          opacity: 0.55,
          duration: 3.8,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      }, 5.55);

    }, scopeRef);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReduced]);

  // Archive ring stroke-dasharray value
  const archiveCircumference = 2 * Math.PI * (R_DISC + 14);

  return (
    <div
      ref={scopeRef}
      className="relative will-change-transform"
      style={{
        width: "100%",
        maxWidth: W,
        aspectRatio: "1 / 1",
      }}
      aria-hidden
    >
      {/* Ambient page glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(closest-side,
            rgba(10,132,255,0.20) 0%,
            rgba(200,149,108,0.10) 55%,
            transparent 80%)`,
          filter: "blur(36px)",
        }}
      />

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          {/* ── DECAY FILTER ─────────────────────────────────────────────── */}
          <filter
            id="c3-decay"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
            colorInterpolationFilters="sRGB"
          >
            {/* Noise source for displacement + colour */}
            <feTurbulence
              ref={turbRef}
              type="fractalNoise"
              baseFrequency="0.65 0.40"
              numOctaves={4}
              seed={2}
              result="noise"
            />
            {/* Displace the source graphic using noise — simulates oxidation warp */}
            <feDisplacementMap
              ref={displaceRef}
              in="SourceGraphic"
              in2="noise"
              scale={22}
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
            {/* Colour matrix: saturation + amber tint driven by GSAP */}
            <feColorMatrix
              ref={colorMxRef}
              in="displaced"
              type="matrix"
              values="0.85 0.18 0.00 0 0.06  0.18 0.52 0.00 0 0.00  0.00 0.08 0.30 0 0.00  0 0 0 0.85 0"
              result="recoloured"
            />
            {/* Focus blur */}
            <feGaussianBlur
              ref={blurRef}
              in="recoloured"
              stdDeviation={4.5}
            />
          </filter>

          {/* ── DISC GRADIENTS ──────────────────────────────────────────── */}
          <radialGradient id="c3-discBody" cx="0.40" cy="0.35" r="0.85">
            <stop offset="0%"   stopColor="#1A3A6B" />
            <stop offset="35%"  stopColor="#0E2548" />
            <stop offset="70%"  stopColor="#091A36" />
            <stop offset="100%" stopColor={PAGE_DARK} />
          </radialGradient>

          <linearGradient id="c3-prism" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#5AC8FA" stopOpacity="0.65" />
            <stop offset="25%"  stopColor="#A78BFA" stopOpacity="0.52" />
            <stop offset="50%"  stopColor="#F472B6" stopOpacity="0.40" />
            <stop offset="75%"  stopColor="#FBBF24" stopOpacity="0.42" />
            <stop offset="100%" stopColor={SUCCESS}  stopOpacity="0.52" />
          </linearGradient>

          <radialGradient id="c3-hub" cx="0.5" cy="0.4" r="0.8">
            <stop offset="0%"   stopColor="#FFFFFF" />
            <stop offset="60%"  stopColor="#E6EEF8" />
            <stop offset="100%" stopColor="#9AA6B8" />
          </radialGradient>

          {/* ── DAMAGE GRADIENTS ─────────────────────────────────────────── */}
          <radialGradient id="c3-rot" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%"   stopColor={AMBER}    stopOpacity="0"    />
            <stop offset="52%"  stopColor={AMBER}    stopOpacity="0.16" />
            <stop offset="78%"  stopColor={SEPIA}    stopOpacity="0.58" />
            <stop offset="100%" stopColor="#2A0E00"  stopOpacity="0.88" />
          </radialGradient>

          <radialGradient id="c3-grey" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%"   stopColor="#666666"  stopOpacity="0.25" />
            <stop offset="100%" stopColor="#111111"  stopOpacity="0.65" />
          </radialGradient>

          {/* ── RESTORATION GRADIENTS ──────────────────────────────────── */}
          <radialGradient id="c3-restore" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%"   stopColor={SUCCESS}  stopOpacity="0.92" />
            <stop offset="38%"  stopColor={BLUE}     stopOpacity="0.52" />
            <stop offset="100%" stopColor={BLUE}     stopOpacity="0"    />
          </radialGradient>

          {/* ── SCAN BEAM (vertical cold-blue sweep) ──────────────────── */}
          <linearGradient id="c3-beam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={BLUE}    stopOpacity="0"    />
            <stop offset="35%"  stopColor={BLUE}    stopOpacity="0.80" />
            <stop offset="50%"  stopColor="#FFFFFF"  stopOpacity="0.96" />
            <stop offset="65%"  stopColor={BLUE}    stopOpacity="0.70" />
            <stop offset="100%" stopColor={BLUE}    stopOpacity="0"    />
          </linearGradient>

          {/* ── SCANLINE TILE ─────────────────────────────────────────── */}
          <pattern id="c3-scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="transparent" />
            <rect width="4" height="2" fill="rgba(0,0,0,0.24)" />
          </pattern>

          {/* ── FRAGMENT GRADIENT ─────────────────────────────────────── */}
          <linearGradient id="c3-frag" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#5AC8FA"  stopOpacity="0.90" />
            <stop offset="100%" stopColor="#A78BFA"  stopOpacity="0.62" />
          </linearGradient>

          {/* Clip path: disc circle */}
          <clipPath id="c3-discClip">
            <circle cx={CX} cy={CY} r={R_DISC} />
          </clipPath>

          {/* Memory silhouette — warm implied family photo */}
          <radialGradient id="c3-memory" cx="0.5" cy="0.46" r="0.58">
            <stop offset="0%"   stopColor={SEPIA}    stopOpacity="0.52" />
            <stop offset="60%"  stopColor={SEPIA}    stopOpacity="0.22" />
            <stop offset="100%" stopColor={SEPIA}    stopOpacity="0"    />
          </radialGradient>
        </defs>

        {/* ════════════════════════════════════════════════════════════════
            DISC GROUP — rendered through the decay SVG filter
        ════════════════════════════════════════════════════════════════ */}
        <g ref={discGroupRef} filter="url(#c3-decay)">

          {/* Disc body */}
          <circle cx={CX} cy={CY} r={R_DISC} fill="url(#c3-discBody)" />

          {/* Concentric data rings (sheen) */}
          {DATA_RINGS.map((ring) => (
            <circle
              key={ring.id}
              cx={CX}
              cy={CY}
              r={ring.r}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            />
          ))}

          {/* Specular highlight streak */}
          <ellipse
            cx={CX - 26}
            cy={CY - 66}
            rx={70}
            ry={19}
            fill="rgba(255,255,255,0.15)"
            transform={`rotate(-25 ${CX - 26} ${CY - 66})`}
          />

          {/* Implied family memory silhouettes inside label area */}
          <g clipPath="url(#c3-discClip)">
            {/* Couple silhouette */}
            <ellipse cx={CX - 28} cy={CY - 28} rx={15} ry={19} fill="url(#c3-memory)" />
            <ellipse cx={CX + 20} cy={CY - 26} rx={13} ry={17} fill="url(#c3-memory)" />
            {/* Child silhouette */}
            <ellipse cx={CX - 10} cy={CY + 16} rx={9}  ry={11} fill="url(#c3-memory)" />
            {/* Warm bokeh / birthday candles */}
            <circle cx={CX}      cy={CY + 22} r={26}   fill="rgba(245,158,11,0.18)" />
            <circle cx={CX + 38} cy={CY + 34} r={15}   fill="rgba(245,158,11,0.12)" />
          </g>

          {/* Label ring */}
          <circle cx={CX} cy={CY} r={R_LABEL} fill="rgba(255,255,255,0.04)" />

          {/* Hub */}
          <circle cx={CX} cy={CY} r={R_HUB + 8} fill={PAGE_DARK} />
          <circle
            cx={CX} cy={CY} r={R_HUB}
            fill={PAGE_DARK}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={1.2}
          />
          <circle cx={CX} cy={CY} r={5} fill={BLUE} />
        </g>

        {/* ════════════════════════════════════════════════════════════════
            DAMAGE OVERLAYS — outside the decay filter group so they
            compositing on top of the filtered result
        ════════════════════════════════════════════════════════════════ */}

        {/* Amber rot bloom from rim */}
        <circle
          ref={rotBloomRef}
          cx={CX} cy={CY} r={R_DISC}
          fill="url(#c3-rot)"
          opacity={0}
          style={{ mixBlendMode: "multiply" }}
        />

        {/* Grey desaturation wash */}
        <circle
          ref={greyWashRef}
          cx={CX} cy={CY} r={R_DISC}
          fill="url(#c3-grey)"
          opacity={0}
          style={{ mixBlendMode: "color" }}
        />

        {/* Scanlines — VHS decay striping */}
        <rect
          ref={scanlinesRef}
          x={CX - R_DISC}
          y={CY - R_DISC - 20}
          width={R_DISC * 2}
          height={R_DISC * 2 + 40}
          fill="url(#c3-scanlines)"
          opacity={0}
          clipPath="url(#c3-discClip)"
          style={{ mixBlendMode: "multiply" }}
        />

        {/* Glitch bands */}
        <g ref={glitchRef} opacity={0} style={{ mixBlendMode: "screen" }}>
          <rect
            x={CX - R_DISC} y={CY - 82}
            width={R_DISC * 2} height={11}
            fill="#7FD4FF" opacity={0.32}
            clipPath="url(#c3-discClip)"
          />
          <rect
            x={CX - R_DISC} y={CY + 28}
            width={R_DISC * 2} height={8}
            fill="#FF7FB0" opacity={0.26}
            clipPath="url(#c3-discClip)"
          />
          <rect
            x={CX - R_DISC} y={CY + 96}
            width={R_DISC * 2} height={5}
            fill="#9FFFD0" opacity={0.20}
            clipPath="url(#c3-discClip)"
          />
        </g>

        {/* ════════════════════════════════════════════════════════════════
            SCAN ELEMENTS
        ════════════════════════════════════════════════════════════════ */}

        {/* Scan beam — vertical blue sweep */}
        <rect
          ref={scanBeamRef}
          x={CX - R_DISC}
          y={CY - R_DISC}
          width={R_DISC * 0.52}
          height={R_DISC * 2}
          fill="url(#c3-beam)"
          opacity={0}
          clipPath="url(#c3-discClip)"
          style={{ mixBlendMode: "screen" }}
        />

        {/* Scan ring pulse */}
        <circle
          ref={scanRingRef}
          cx={CX} cy={CY} r={0}
          fill="none"
          stroke={BLUE}
          strokeWidth={2.2}
          opacity={0}
        />

        {/* ════════════════════════════════════════════════════════════════
            RESTORATION ELEMENTS
        ════════════════════════════════════════════════════════════════ */}

        {/* Prismatic glint (floods in on reversal) */}
        <circle
          ref={prismaticRef}
          cx={CX} cy={CY} r={R_DISC}
          fill="url(#c3-prism)"
          opacity={0}
          style={{ mixBlendMode: "screen" }}
        />

        {/* Restoration glow — warmth from centre outward */}
        <circle
          ref={restoreGlowRef}
          cx={CX} cy={CY} r={R_DISC * 0.15}
          fill="url(#c3-restore)"
          opacity={0}
          style={{ mixBlendMode: "screen" }}
        />

        {/* ════════════════════════════════════════════════════════════════
            FRAGMENT POLYGONS — scatter + reassemble
        ════════════════════════════════════════════════════════════════ */}
        {FRAGMENTS.map((f, i) => (
          <polygon
            key={f.id}
            ref={(el) => { fragRefs.current[i] = el; }}
            points={f.pts}
            transform={`translate(${CX + f.px} ${CY + f.py})`}
            fill="url(#c3-frag)"
            stroke="rgba(255,255,255,0.52)"
            strokeWidth={0.9}
            opacity={0}
            style={{
              filter: "drop-shadow(0 3px 8px rgba(10,132,255,0.50))",
              mixBlendMode: "screen",
            }}
          />
        ))}

        {/* ════════════════════════════════════════════════════════════════
            ARCHIVE RING — vault sealing in Beat 5
        ════════════════════════════════════════════════════════════════ */}
        <circle
          ref={archiveRingRef}
          cx={CX} cy={CY}
          r={R_DISC + 14}
          fill="none"
          stroke={SUCCESS}
          strokeWidth={2.8}
          strokeLinecap="round"
          strokeDasharray={archiveCircumference}
          strokeDashoffset={archiveCircumference}
          opacity={0}
          transform={`rotate(-90 ${CX} ${CY})`}
        />

        {/* ════════════════════════════════════════════════════════════════
            BRAND GROUP — final frame (inside disc hub area)
        ════════════════════════════════════════════════════════════════ */}
        <g ref={brandGroupRef} opacity={0}>
          {/* Wordmark */}
          <text
            x={CX}
            y={CY + 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={TEXT}
            fontFamily="'Sora', sans-serif"
            fontWeight={600}
            fontSize={14}
            letterSpacing={5}
          >
            HEIRVO
          </text>
          {/* Three-dot mark — Recover · Restore · Preserve */}
          <circle cx={CX - 30} cy={CY + 20} r={2.2} fill={SUCCESS} opacity={0.88} />
          <circle cx={CX}      cy={CY + 20} r={2.2} fill={SUCCESS} opacity={0.88} />
          <circle cx={CX + 30} cy={CY + 20} r={2.2} fill={SUCCESS} opacity={0.88} />
        </g>

        {/* ════════════════════════════════════════════════════════════════
            TAGLINE  — Cormorant Garamond italic
        ════════════════════════════════════════════════════════════════ */}
        <text
          ref={taglineRef}
          x={CX}
          y={CY + R_DISC + 46}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={TEXT}
          fontFamily="'Cormorant Garamond', Georgia, serif"
          fontStyle="italic"
          fontWeight={300}
          fontSize={22}
          opacity={0}
        >
          Recover · Restore · Preserve
        </text>

        {/* ════════════════════════════════════════════════════════════════
            SUBTITLE / DOWNLOAD CUE — JetBrains Mono
        ════════════════════════════════════════════════════════════════ */}
        <text
          ref={subtitleRef}
          x={CX}
          y={CY + R_DISC + 74}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={TEXT_MUTED}
          fontFamily="'JetBrains Mono', 'Courier New', monospace"
          fontSize={10}
          letterSpacing={2.5}
          opacity={0}
        >
          FREE SCAN · $59 TO SAVE · RUNS 100% LOCALLY
        </text>
      </svg>
    </div>
  );
}
