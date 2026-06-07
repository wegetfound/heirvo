import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

gsap.registerPlugin(DrawSVGPlugin);

/**
 * HeroFilmFrame — "It Was Never Gone" / "The Frame That Held"
 *
 * A 16:9 film frame holding a warm, out-of-focus still (an implied first
 * birthday). It opens damaged — desaturated, blurred, glitchy, scanlines
 * rolling — then a light-wipe sweeps across and the scratches *slide off-frame*
 * rather than being erased. The memory was always under there. We just bring
 * the light back to it.
 *
 * The emotional arc (≈5s, plays once on mount):
 *   BEAT 1 · THE DAMAGE          0.00–0.80s  desat, 18px blur, scanlines, dread
 *   BEAT 2 · FIRST SIGN OF LIFE  0.80–1.40s  colour warms, blur 18→9px
 *   BEAT 3 · THE CLEARING        1.40–2.80s  light-wipe + drawSVG retract (HERO)
 *   BEAT 4 · THE BREATH          2.80–3.80s  focus lands, bloom, alive cue
 *   BEAT 5 · THE KEEPING         3.80–5.00s  holds; border traces once (vault)
 *
 * The scratches are *honored*, never erased — in the final state they remain
 * faintly visible at the frame edges, gold instead of grey.
 */

const VW = 1920;
const VH = 1080;

// 16:9 organic arcing scratches — soft curves, not sharp vectors. They live
// across the frame and, during the clearing, retract toward the right edge as
// the light-wipe passes over them.
const SCRATCHES = [
  { id: 0, d: "M 120 180 Q 620 90 1180 240 T 1860 200" },
  { id: 1, d: "M 90 540 Q 540 470 1040 560 Q 1480 640 1880 520" },
  { id: 2, d: "M 220 880 Q 700 800 1180 900 T 1840 840" },
  { id: 3, d: "M 380 120 Q 520 420 700 720 Q 840 940 980 1020" },
  { id: 4, d: "M 1320 90 Q 1240 400 1380 700 Q 1480 900 1620 1000" },
  { id: 5, d: "M 60 320 Q 380 360 760 330 Q 1180 300 1620 360" },
];

interface Props {
  reducedMotion?: boolean;
}

export default function HeroFilmFrame({ reducedMotion = false }: Props) {
  const scopeRef = useRef<HTMLDivElement>(null);

  // Layer refs
  const stillRef = useRef<SVGGElement>(null);
  const blurRef = useRef<SVGFEGaussianBlurElement>(null);
  const scratchRefs = useRef<(SVGPathElement | null)[]>([]);
  const scanlinesRef = useRef<SVGRectElement>(null);
  const glitchRef = useRef<SVGGElement>(null);
  const lightWipeRef = useRef<SVGRectElement>(null);
  const borderRef = useRef<SVGRectElement>(null);
  const vignetteRef = useRef<SVGRectElement>(null);
  const bloomRef = useRef<SVGRectElement>(null);
  const flickerRef = useRef<SVGEllipseElement>(null);
  const parallaxRef = useRef<SVGGElement>(null);

  const [isReduced, setIsReduced] = useState(reducedMotion);

  // Honor system-level reduced-motion in addition to the prop.
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

    const scratches = () =>
      scratchRefs.current.filter(Boolean) as SVGPathElement[];

    /* ── REDUCED MOTION ─────────────────────────────────────────────────────
       Jump straight to the final, peaceful held state. Sharp, warm, still.
       One frame, no loop, no narrative. */
    if (isReduced) {
      gsap.set(blurRef.current, { attr: { stdDeviation: 0 } });
      gsap.set(stillRef.current, { opacity: 1 });
      // Warm + fully saturated final look.
      stillRef.current?.style.setProperty(
        "filter",
        "saturate(1) sepia(0.35) brightness(1.04)"
      );
      gsap.set(scanlinesRef.current, { opacity: 0 });
      gsap.set(glitchRef.current, { opacity: 0 });
      gsap.set(lightWipeRef.current, { opacity: 0 });
      gsap.set(bloomRef.current, { opacity: 0.18 });
      gsap.set(vignetteRef.current, { opacity: 0.5 });
      gsap.set(borderRef.current, { drawSVG: "100%", opacity: 0.85 });
      // Scratches honored, not erased: faint, gold, retracted to the edges.
      scratches().forEach((s) =>
        gsap.set(s, { drawSVG: "92% 100%", stroke: "#D4AF37", opacity: 0.22 })
      );
      return;
    }

    const cleanups: Array<() => void> = [];

    const ctx = gsap.context(() => {
      /* ── PRIME — the damaged opening state ──────────────────────────────── */
      // Heavy blur, desaturated, scanlines on, glitch on, scratches fully drawn
      // across the frame in cool grey. The border is undrawn (vault still open).
      gsap.set(blurRef.current, { attr: { stdDeviation: 18 } });
      // saturation/warmth ride on the still group's CSS filter
      const setStillFilter = (sat: number, warm: number) => {
        stillRef.current?.style.setProperty(
          "filter",
          `saturate(${sat}) sepia(${warm * 0.35}) hue-rotate(${(1 - warm) * -8}deg) brightness(${0.86 + warm * 0.18})`
        );
      };
      setStillFilter(0.15, 0);

      gsap.set(stillRef.current, { opacity: 0 });
      gsap.set(scanlinesRef.current, { opacity: 0.55, yPercent: 0 });
      gsap.set(glitchRef.current, { opacity: 0.6 });
      gsap.set(lightWipeRef.current, { opacity: 0, xPercent: -120 });
      gsap.set(bloomRef.current, { opacity: 0 });
      gsap.set(vignetteRef.current, { opacity: 0.78 });
      gsap.set(flickerRef.current, { opacity: 0, transformOrigin: "50% 50%" });
      gsap.set(parallaxRef.current, { x: 0, y: 0, scale: 1.02 });
      gsap.set(borderRef.current, { drawSVG: "0%", opacity: 0 });

      // Scratches: fully drawn across the frame, cool grey, clearly visible.
      scratches().forEach((s) =>
        gsap.set(s, {
          drawSVG: "0% 100%",
          stroke: "#8B8680",
          opacity: 0.5,
        })
      );

      // The damaged-state phantom — a glitch jitter while loss still rules.
      const glitchJitter = gsap.to(glitchRef.current, {
        x: "+=4",
        duration: 0.06,
        repeat: 18,
        yoyo: true,
        ease: "steps(2)",
      });
      cleanups.push(() => glitchJitter.kill());

      // Scanlines roll continuously until they fade in Beat 3.
      const scanRoll = gsap.to(scanlinesRef.current, {
        yPercent: -12,
        duration: 0.9,
        repeat: -1,
        ease: "none",
      });
      cleanups.push(() => scanRoll.kill());

      const tl = gsap.timeline({
        delay: 0.15, // a held breath before it begins
        defaults: { ease: "power2.inOut" },
      });

      /* ══ BEAT 1 · THE DAMAGE ═══════════════════════════════ 0.00–0.80s ══
         Old. Damaged. Almost lost. The frame fades up desaturated and blurred,
         glitchy, scanlines rolling. Dread. */
      tl.to(stillRef.current, { opacity: 1, duration: 0.8, ease: "power1.out" }, 0);

      /* ══ BEAT 2 · FIRST SIGN OF LIFE ═══════════════════════ 0.80–1.40s ══
         Colour warms from grey toward amber; blur eases 18→9px.
         "Wait — there's something under there." */
      tl.to(
        blurRef.current,
        { attr: { stdDeviation: 9 }, duration: 0.6 },
        0.8
      ).to(
        { sat: 0.15, warm: 0 },
        {
          sat: 0.55,
          warm: 0.45,
          duration: 0.6,
          ease: "power1.inOut",
          onUpdate: function () {
            const t = this.targets()[0] as { sat: number; warm: number };
            setStillFilter(t.sat, t.warm);
          },
        },
        0.8
      ).to(glitchRef.current, { opacity: 0.35, duration: 0.6 }, 0.8);

      /* ══ BEAT 3 · THE CLEARING — THE HERO BEAT ═════════════ 1.40–2.80s ══
         The thesis. Scratches don't erase — a light-wipe sweeps left→right and
         as it passes, each scratch *retracts off-frame* via drawSVG. Scanlines
         fade. Blur 9→1.5px. "It's being uncovered, not rebuilt." */

      // The light-wipe sweeps across the whole frame, left → right.
      tl.to(lightWipeRef.current, { opacity: 0.85, duration: 0.3 }, 1.4)
        .to(
          lightWipeRef.current,
          { xPercent: 120, duration: 1.4, ease: "power1.inOut" },
          1.4
        )
        .to(lightWipeRef.current, { opacity: 0, duration: 0.4 }, 2.6);

      // Blur eases toward focus as the wipe passes.
      tl.to(
        blurRef.current,
        { attr: { stdDeviation: 1.5 }, duration: 1.4, ease: "power2.inOut" },
        1.4
      );

      // Colour blooms further toward warm amber.
      tl.to(
        { sat: 0.55, warm: 0.45 },
        {
          sat: 0.92,
          warm: 0.85,
          duration: 1.4,
          ease: "power1.inOut",
          onUpdate: function () {
            const t = this.targets()[0] as { sat: number; warm: number };
            setStillFilter(t.sat, t.warm);
          },
        },
        1.4
      );

      // Scanlines + glitch fade as the light clears the surface.
      tl.to(scanlinesRef.current, { opacity: 0, duration: 1.1 }, 1.5)
        .to(glitchRef.current, { opacity: 0, duration: 1.0 }, 1.5);

      // THE RETRACT — scratches slide off toward the right edge, staggered so
      // they go as the wipe reaches them. They warm to gold on the way out
      // (caught in the light), then settle faint. drawSVG "X% 100%" keeps the
      // visible segment shrinking against the right end → it never vanishes,
      // it slides off-frame.
      scratches().forEach((s, i) => {
        const at = 1.5 + i * 0.13;
        tl.to(s, { stroke: "#D4AF37", duration: 0.5 }, at)
          .to(
            s,
            { drawSVG: "92% 100%", duration: 0.9, ease: "power2.in" },
            at
          )
          .to(s, { opacity: 0.22, duration: 0.9 }, at + 0.2);
      });

      /* ══ BEAT 4 · THE BREATH ═══════════════════════════════ 2.80–3.80s ══
         Focus lands (1.5→0px). Colour blooms. A single subtle alive cue:
         candle-flicker 2% scale + a 2% parallax drift. "There she is." */
      tl.to(
        blurRef.current,
        { attr: { stdDeviation: 0 }, duration: 1.0, ease: "power2.out" },
        2.8
      )
        .to(bloomRef.current, { opacity: 0.2, duration: 1.0 }, 2.8)
        .to(
          { sat: 0.92, warm: 0.85 },
          {
            sat: 1,
            warm: 1,
            duration: 1.0,
            ease: "power1.out",
            onUpdate: function () {
              const t = this.targets()[0] as { sat: number; warm: number };
              setStillFilter(t.sat, t.warm);
            },
          },
          2.8
        )
        // Candle flicker — a tiny living pulse on the warm core.
        .to(flickerRef.current, { opacity: 0.5, duration: 0.4 }, 2.9)
        .to(
          flickerRef.current,
          {
            scale: 1.02,
            opacity: 0.32,
            duration: 0.7,
            ease: "sine.inOut",
            yoyo: true,
            repeat: 1,
          },
          3.0
        )
        // 2% parallax drift — the still settles, alive, never frozen.
        .to(
          parallaxRef.current,
          { x: VW * 0.012, y: -VH * 0.01, duration: 1.0, ease: "sine.inOut" },
          2.8
        );

      /* ══ BEAT 5 · THE KEEPING ══════════════════════════════ 3.80–5.00s ══
         Everything holds. Vignette softens. A thin light-rule traces the frame
         border once (drawSVG) like a vault closing. Final: 100%, sharp, warm,
         still. "It's safe now." */
      tl.to(vignetteRef.current, { opacity: 0.5, duration: 1.2 }, 3.8)
        .to(borderRef.current, { opacity: 0.85, duration: 0.3 }, 3.85)
        .fromTo(
          borderRef.current,
          { drawSVG: "0%" },
          { drawSVG: "100%", duration: 1.15, ease: "power2.inOut" },
          3.9
        );

      /* ══ THE ETERNAL BREATH ════════════════════════════ after 5.00s ══
         Only after the narrative completes: an almost imperceptible breathing.
         The memory is at rest. */
      tl.add(() => {
        gsap.to(scopeRef.current, {
          scale: 1.008,
          duration: 7,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          transformOrigin: "50% 50%",
        });
        gsap.to(bloomRef.current, {
          opacity: 0.26,
          duration: 5,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
        gsap.to(flickerRef.current, {
          opacity: 0.24,
          duration: 4.5,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      }, 5.05);

      /* ── HOVER — gentle warming, never aggressive ──────────────────────── */
      const pointerMq = window.matchMedia("(pointer: fine)");
      if (pointerMq.matches) {
        const onEnter = () => {
          gsap.to(bloomRef.current, {
            opacity: 0.34,
            duration: 0.7,
            ease: "power2.out",
          });
          gsap.to(vignetteRef.current, {
            opacity: 0.42,
            duration: 0.7,
            ease: "power2.out",
          });
        };
        const onLeave = () => {
          gsap.to(bloomRef.current, {
            opacity: 0.26,
            duration: 0.9,
            ease: "power2.out",
          });
          gsap.to(vignetteRef.current, {
            opacity: 0.5,
            duration: 0.9,
            ease: "power2.out",
          });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReduced]);

  return (
    <div
      ref={scopeRef}
      className="relative w-full will-change-transform"
      style={{ aspectRatio: "16 / 9", maxWidth: 560 }}
      aria-hidden
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid slice"
        style={{
          display: "block",
          borderRadius: 18,
          overflow: "hidden",
          filter: "drop-shadow(0 28px 60px rgba(44,44,44,0.26))",
        }}
      >
        <defs>
          {/* Focus blur — animated stdDeviation drives the "coming into focus". */}
          <filter id="frameBlur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur ref={blurRef} in="SourceGraphic" stdDeviation="18" />
          </filter>

          {/* Soften the scratch strokes — poetic wear, not sharp vectors. */}
          <filter id="soften">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>

          {/* The warm out-of-focus still: cream base with amber bokeh and a
              soft silhouette suggestion (an implied child's face / party). */}
          <radialGradient id="stillBase" cx="0.46" cy="0.42" r="0.95">
            <stop offset="0%" stopColor="#FFF3E0" />
            <stop offset="38%" stopColor="#F5D9A8" />
            <stop offset="70%" stopColor="#E8B978" />
            <stop offset="100%" stopColor="#7A5A38" />
          </radialGradient>

          <radialGradient id="bokehWarm" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#FFE7B0" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FFE7B0" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="silhouette" cx="0.5" cy="0.46" r="0.55">
            <stop offset="0%" stopColor="#5A3D24" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#5A3D24" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#5A3D24" stopOpacity="0" />
          </radialGradient>

          {/* Candle-flicker / warm core glow used as the "alive" cue. */}
          <radialGradient id="flickerGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#FFD9A0" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FFD9A0" stopOpacity="0" />
          </radialGradient>

          {/* The light-wipe gradient — a soft warm band that sweeps across. */}
          <linearGradient id="wipeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="42%" stopColor="#FFF6E0" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#FFE9C0" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
          </linearGradient>

          {/* Bloom wash for the breath / keeping beats. */}
          <radialGradient id="bloomWash" cx="0.5" cy="0.45" r="0.75">
            <stop offset="0%" stopColor="#FFE7B0" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FFE7B0" stopOpacity="0" />
          </radialGradient>

          {/* Corner vignette — loss reads heavy at the start, softens at rest. */}
          <radialGradient id="vignetteGrad" cx="0.5" cy="0.5" r="0.72">
            <stop offset="55%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
          </radialGradient>

          {/* Scanline tile — VHS striping. */}
          <pattern
            id="scanlines"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <rect width="6" height="6" fill="transparent" />
            <rect width="6" height="3" fill="rgba(0,0,0,0.15)" />
          </pattern>
        </defs>

        {/* ── THE STILL (blurred, desaturated → warm sharp) ──────────────── */}
        <g ref={stillRef} filter="url(#frameBlur)">
          <g ref={parallaxRef}>
            {/* Warm base */}
            <rect x="0" y="0" width={VW} height={VH} fill="url(#stillBase)" />
            {/* Bokeh party lights — soft out-of-focus circles */}
            <circle cx="320" cy="240" r="170" fill="url(#bokehWarm)" />
            <circle cx="1560" cy="300" r="210" fill="url(#bokehWarm)" />
            <circle cx="1680" cy="780" r="150" fill="url(#bokehWarm)" />
            <circle cx="220" cy="860" r="130" fill="url(#bokehWarm)" />
            <circle cx="1180" cy="180" r="90" fill="url(#bokehWarm)" />
            {/* The implied child / first-birthday silhouette, centred */}
            <ellipse cx="960" cy="560" rx="430" ry="470" fill="url(#silhouette)" />
            <ellipse cx="960" cy="430" rx="180" ry="200" fill="url(#silhouette)" />
            {/* Candle flame warm core */}
            <ellipse
              ref={flickerRef}
              cx="960"
              cy="540"
              rx="240"
              ry="260"
              fill="url(#flickerGlow)"
              opacity="0"
            />
          </g>
        </g>

        {/* ── BLOOM WASH (breath / keeping) ──────────────────────────────── */}
        <rect
          ref={bloomRef}
          x="0"
          y="0"
          width={VW}
          height={VH}
          fill="url(#bloomWash)"
          opacity="0"
          style={{ mixBlendMode: "screen" }}
        />

        {/* ── SCANLINES (VHS striping, rolls then fades) ─────────────────── */}
        <rect
          ref={scanlinesRef}
          x="0"
          y="-60"
          width={VW}
          height={VH + 120}
          fill="url(#scanlines)"
          opacity="0.55"
          style={{ mixBlendMode: "multiply" }}
        />

        {/* ── GLITCH BAND (damaged jitter, fades in Beat 3) ──────────────── */}
        <g ref={glitchRef} opacity="0.6" style={{ mixBlendMode: "screen" }}>
          <rect x="0" y="300" width={VW} height="14" fill="#7Fd4ff" opacity="0.25" />
          <rect x="0" y="620" width={VW} height="9" fill="#ff7fb0" opacity="0.22" />
          <rect x="0" y="840" width={VW} height="6" fill="#9fffd0" opacity="0.18" />
        </g>

        {/* ── SCRATCHES (honored — they slide off, never erased) ─────────── */}
        <g filter="url(#soften)">
          {SCRATCHES.map((s, i) => (
            <path
              key={s.id}
              ref={(el) => {
                scratchRefs.current[i] = el;
              }}
              d={s.d}
              stroke="#8B8680"
              strokeWidth="3.2"
              fill="none"
              strokeLinecap="round"
              opacity="0.5"
            />
          ))}
        </g>

        {/* ── LIGHT-WIPE (sweeps left→right during the clearing) ─────────── */}
        <rect
          ref={lightWipeRef}
          x={-VW * 0.6}
          y="0"
          width={VW * 1.2}
          height={VH}
          fill="url(#wipeGrad)"
          opacity="0"
          style={{ mixBlendMode: "screen" }}
        />

        {/* ── VIGNETTE ───────────────────────────────────────────────────── */}
        <rect
          ref={vignetteRef}
          x="0"
          y="0"
          width={VW}
          height={VH}
          fill="url(#vignetteGrad)"
          opacity="0.78"
        />

        {/* ── FRAME BORDER (the vault close — drawn once in Beat 5) ───────── */}
        <rect
          ref={borderRef}
          x="14"
          y="14"
          width={VW - 28}
          height={VH - 28}
          rx="14"
          fill="none"
          stroke="#E8DCC8"
          strokeWidth="3"
          opacity="0"
        />
      </svg>

      {/* Film grain over the whole frame (CSS layer for crispness). */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: 18,
          opacity: 0.06,
          mixBlendMode: "overlay",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
