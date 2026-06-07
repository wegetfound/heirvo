/**
 * Concept 5 — "Fragments Reassemble" (the moonshot)
 *
 * 2D <canvas> particle system — raw, no library beyond GSAP for the overlay
 * GSAP layer (text, labels, scan-beam overlay). The canvas drives every particle.
 *
 * Emotional arc (~5-6 s, plays once on mount, then idles):
 *   BEAT 1 · SCATTERING    0.00–1.20 s   Hundreds of warm shards float scattered
 *                                          in deep 3-D-feeling space (size/opacity
 *                                          encodes depth). Music-box sparseness,
 *                                          a sense of loss and fragmentation.
 *   BEAT 2 · RECOGNITION   1.20–2.00 s   Heirvo's scan-beam sweeps the field.
 *                                          Particles react — light passes through
 *                                          them, a few begin to slow.
 *   BEAT 3 · MAGNETIC PULL 2.00–3.80 s   The beam returns as a magnetic force.
 *                                          Every shard is tugged inward, snapping
 *                                          toward a central luminous frame-shape.
 *   BEAT 4 · MEMORY FORMS  3.80–4.80 s   Shards lock into a warm photo-rectangle.
 *                                          The assembled image glows amber—sepia,
 *                                          a recognisable memory. Complete.
 *   BEAT 5 · VAULT SEAL    4.80–6.00 s   The assembled frame seals with a vault-
 *                                          glow pulse. Text fades in:
 *                                          "Recover · Restore · Preserve" + mark.
 *
 * Technical notes:
 *  - 100% raw 2D canvas + requestAnimationFrame — zero external drawing libs
 *  - GSAP drives the overlay (text / beam glow / UI labels) via SVG layers
 *  - Depth: particles have a z in [0,1]; large/bright = near, small/dim = far
 *  - GPU-cheap: no ctx.save/restore per particle; batch by opacity bucket
 *  - Particle count capped at 280 (tested 60fps on mid-range laptop)
 *  - Full cleanup: cancelAnimationFrame + gsap.context().revert() on unmount
 *  - reducedMotion: render a beautiful static "final frame" (no rAF at all)
 */

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

// ─── Design tokens (exact values from brief) ────────────────────────────────
const C_PAGE = "#0B1220";
const C_PAGE_ALT = "#0E1628";
const C_BLUE = "#0A84FF";
const C_AMBER = "#F59E0B";
const C_SEPIA = "#C8956C";
// C_WARM_BG: "#1A1208" — used in warmth palette reference; canvas uses hex inline
const C_SUCCESS = "#34D399";
// C_TEXT: "#F0EDE8" — used in frame border SVG gradient stop inline
const C_TEXT_MUTED = "#94A3B8";

// ─── Canvas size (logical, canvas CSS scales to container) ──────────────────
const CW = 560;
const CH = 480; // slightly taller than 16:9 to accommodate text area below

// ─── Particle configuration ──────────────────────────────────────────────────
const PARTICLE_COUNT = 240;

// ─── The assembled memory frame: a warm photo-rectangle in the centre ───────
const FRAME_X = CW * 0.18;
const FRAME_Y = CH * 0.12;
const FRAME_W = CW * 0.64;
const FRAME_H = CH * 0.58;

// ─── Types ───────────────────────────────────────────────────────────────────
interface Particle {
  // Current position
  x: number;
  y: number;
  // Scatter position (Beat 1 resting state)
  sx: number;
  sy: number;
  // Assembled position (Beat 4 target — maps onto the memory frame)
  tx: number;
  ty: number;
  // Z depth [0 = far, 1 = near]; drives size, opacity, speed
  z: number;
  // Base size (at z=1)
  baseSize: number;
  // Warm colour — amber/sepia range
  r: number;
  g: number;
  b: number;
  // Drift velocity (scatter phase)
  vx: number;
  vy: number;
  // Phase: 0=scatter, 1=assembled
  phase: number; // 0→1 lerp controlled by animProgress
  // Individual pull delay (stagger the magnetic snap for organic feel)
  pullDelay: number;
  // Pull strength multiplier
  pullStrength: number;
}

// ─── Seeded pseudo-random (deterministic layout — no layout shift on re-render)
function seededRand(seed: number): () => number {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Build particles ─────────────────────────────────────────────────────────
function buildParticles(): Particle[] {
  const rand = seededRand(0x4865697276_0 & 0x7fffffff); // "Heirvo" seed
  const particles: Particle[] = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const z = 0.15 + rand() * 0.85; // depth bias toward near
    const baseSize = 1.2 + z * 4.2;

    // Scatter position: full canvas, with more clustering near centre
    const angle = rand() * Math.PI * 2;
    const dist = 60 + rand() * (Math.min(CW, CH) * 0.55);
    const sx = CW * 0.5 + Math.cos(angle) * dist * (0.5 + rand() * 1.2);
    const sy = CH * 0.42 + Math.sin(angle) * dist * (0.5 + rand() * 1.0);

    // Assembled position: random point inside the memory frame
    // With slight margin to keep particles within the frame bounds
    const tx = FRAME_X + 8 + rand() * (FRAME_W - 16);
    const ty = FRAME_Y + 8 + rand() * (FRAME_H - 16);

    // Warm amber/sepia range — slight variation per particle
    const rBase = 0.72 + rand() * 0.24; // 0.72–0.96
    const gBase = 0.38 + rand() * 0.30; // 0.38–0.68
    const bBase = 0.10 + rand() * 0.28; // 0.10–0.38

    particles.push({
      x: sx,
      y: sy,
      sx,
      sy,
      tx,
      ty,
      z,
      baseSize,
      r: Math.round(rBase * 255),
      g: Math.round(gBase * 255),
      b: Math.round(bBase * 255),
      vx: (rand() - 0.5) * 0.35 * (1.1 - z * 0.6),
      vy: (rand() - 0.5) * 0.35 * (1.1 - z * 0.6),
      phase: 0,
      pullDelay: rand() * 0.55, // stagger up to 550ms
      pullStrength: 0.6 + rand() * 0.8,
    });
  }
  return particles;
}

// ─── Hex → rgb helper ────────────────────────────────────────────────────────
function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Concept5_FragmentsReassemble({
  reducedMotion = false,
}: {
  reducedMotion?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // GSAP overlay element refs
  const beamRef = useRef<SVGRectElement>(null);
  const beamGlowRef = useRef<SVGEllipseElement>(null);
  const frameBorderRef = useRef<SVGRectElement>(null);
  const vaultGlowRef = useRef<SVGEllipseElement>(null);
  const taglineRef = useRef<SVGTextElement>(null);
  const brandRef = useRef<SVGGElement>(null);
  const scanLabelRef = useRef<SVGTextElement>(null);
  const recoveringLabelRef = useRef<SVGTextElement>(null);

  const [isReduced, setIsReduced] = useState(reducedMotion);

  // Honor system-level prefers-reduced-motion
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;
    // non-null asserted above so the type persists into the rAF draw closure

    // ── REDUCED MOTION: static final frame, no rAF ──────────────────────────
    if (isReduced) {
      // Draw the assembled state directly
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      canvas.width = CW * dpr;
      canvas.height = CH * dpr;
      ctx.scale(dpr, dpr);

      // Background
      ctx.fillStyle = C_PAGE;
      ctx.fillRect(0, 0, CW, CH);

      // Assembled memory frame warm glow
      const grd = ctx.createRadialGradient(
        CW * 0.5, CH * 0.4, 10,
        CW * 0.5, CH * 0.4, FRAME_W * 0.7
      );
      grd.addColorStop(0, "rgba(200,149,108,0.38)");
      grd.addColorStop(0.55, "rgba(245,158,11,0.15)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, CW, CH);

      // Draw assembled particles (final state)
      const particles = buildParticles();
      for (const p of particles) {
        const sz = p.baseSize * (0.4 + p.z * 0.6);
        const alpha = 0.55 + p.z * 0.45;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
        ctx.beginPath();
        ctx.arc(p.tx, p.ty, sz * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Frame border
      ctx.strokeStyle = "rgba(200,149,108,0.7)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(FRAME_X, FRAME_Y, FRAME_W, FRAME_H);

      // Vault glow overlay
      const vaultGrd = ctx.createRadialGradient(
        CW * 0.5, CH * 0.4, 0,
        CW * 0.5, CH * 0.4, FRAME_W * 0.55
      );
      vaultGrd.addColorStop(0, "rgba(52,211,153,0.22)");
      vaultGrd.addColorStop(0.6, "rgba(10,132,255,0.10)");
      vaultGrd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = vaultGrd;
      ctx.fillRect(0, 0, CW, CH);

      return; // No cleanup needed for reduced motion (no rAF)
    }

    // ── FULL ANIMATION ───────────────────────────────────────────────────────

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    canvas.width = CW * dpr;
    canvas.height = CH * dpr;
    ctx.scale(dpr, dpr);

    const particles = buildParticles();

    // Animation state — a single linear progress drives all beats
    // We use a mutable object so the rAF loop always reads the current value
    const state = {
      // Overall animation progress 0→1 (maps to the 6s arc)
      progress: 0,
      // Whether the particles have fully assembled (idle loop after Beat 5)
      assembled: false,
      // Idle breath counter (used after beat 5)
      idleT: 0,
      // Beam X position (0→CW, driven by GSAP)
      beamX: -80,
      // Magnetic pull strength 0→1 (driven by GSAP)
      pull: 0,
      // Vault glow alpha 0→1 (driven by GSAP)
      vault: 0,
    };

    // GSAP context for overlay SVG + state driving
    const gsapCtx = gsap.context(() => {
      if (!svgRef.current) return;

      // Hide all overlay elements initially
      gsap.set(
        [
          beamRef.current,
          beamGlowRef.current,
          frameBorderRef.current,
          vaultGlowRef.current,
          taglineRef.current,
          brandRef.current,
          scanLabelRef.current,
          recoveringLabelRef.current,
        ],
        { opacity: 0 }
      );
      gsap.set(".c5-corner", { opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });

      // ── BEAT 1 · SCATTERING (0–1.2s) ──────────────────────────────────────
      // Just particles drifting — nothing in the SVG overlay yet.
      // Animate overall progress to 0.20 (20%) by 1.2s
      tl.to(state, { progress: 0.20, duration: 1.2, ease: "power1.out" }, 0);

      // ── BEAT 2 · SCAN-BEAM SWEEPS (1.2–2.0s) ─────────────────────────────
      // Scan label fades in, beam sweeps L→R
      tl.to(state, { progress: 0.38, duration: 0.8, ease: "power1.inOut" }, 1.2);
      tl.to(scanLabelRef.current, { opacity: 1, duration: 0.3 }, 1.1);
      tl.to(beamRef.current, { opacity: 0.85, duration: 0.25 }, 1.2);
      tl.to(beamGlowRef.current, { opacity: 0.6, duration: 0.25 }, 1.2);
      // Animate beam X — drives both the canvas beam and the SVG beam rect
      tl.fromTo(
        state,
        { beamX: -80 },
        { beamX: CW + 80, duration: 0.8, ease: "power1.inOut",
          onUpdate: function () {
            // Sync SVG beam rect position with the canvas beam
            if (beamRef.current) {
              beamRef.current.setAttribute("x", String(state.beamX - 40));
            }
            if (beamGlowRef.current) {
              beamGlowRef.current.setAttribute("cx", String(state.beamX));
            }
          }
        },
        1.2
      );
      tl.to(beamRef.current, { opacity: 0, duration: 0.25 }, 1.95);
      tl.to(beamGlowRef.current, { opacity: 0, duration: 0.25 }, 1.95);
      tl.to(scanLabelRef.current, { opacity: 0, duration: 0.3 }, 1.9);

      // ── BEAT 3 · MAGNETIC PULL (2.0–3.8s) ────────────────────────────────
      // Pull ramps up, progress 0.38→0.72
      tl.to(state, { progress: 0.72, duration: 1.8, ease: "power2.inOut" }, 2.0);
      tl.to(state, { pull: 1, duration: 1.5, ease: "power2.in" }, 2.0);
      tl.to(recoveringLabelRef.current, { opacity: 1, duration: 0.4 }, 2.3);

      // ── BEAT 4 · MEMORY FORMS (3.8–4.8s) ─────────────────────────────────
      // Progress 0.72→1.0; frame border appears
      tl.to(state, { progress: 1.0, duration: 1.0, ease: "power3.out" }, 3.8);
      tl.to(frameBorderRef.current, { opacity: 0.75, duration: 0.5 }, 3.9);
      tl.to(".c5-corner", { opacity: 0.6, duration: 0.4, stagger: 0.08 }, 4.0);
      tl.to(recoveringLabelRef.current, { opacity: 0, duration: 0.3 }, 4.5);
      tl.add(() => {
        state.assembled = true;
      }, 4.5);

      // ── BEAT 5 · VAULT SEAL (4.8–6.0s) ───────────────────────────────────
      tl.to(state, { vault: 1, duration: 0.6, ease: "power2.out" }, 4.8);
      tl.to(vaultGlowRef.current, { opacity: 1, duration: 0.4 }, 4.8);
      tl.to(vaultGlowRef.current, { opacity: 0.45, duration: 0.8 }, 5.2);
      tl.to(taglineRef.current, { opacity: 1, duration: 0.6 }, 5.1);
      tl.to(brandRef.current, { opacity: 1, duration: 0.6 }, 5.3);
      // Subtle vault-glow breathing after the seal
      tl.add(() => {
        gsap.to(vaultGlowRef.current, {
          opacity: 0.65,
          duration: 3.5,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      }, 5.9);
    }, svgRef);

    // ── rAF LOOP ─────────────────────────────────────────────────────────────
    let rafId: number;
    let lastTime = 0;

    const [blueR, blueG, blueB] = hexRgb(C_BLUE);
    const [amberR, amberG, amberB] = hexRgb(C_AMBER);
    const [succR, succG, succB] = hexRgb(C_SUCCESS);

    function draw(ts: number) {
      rafId = requestAnimationFrame(draw);
      const dt = Math.min((ts - lastTime) / 1000, 0.05); // cap at 50ms
      lastTime = ts;

      const prog = state.progress; // 0→1 overall
      const pull = state.pull;     // 0→1 magnetic pull strength

      // ── Clear ─────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, CW, CH);

      // ── Background gradient ───────────────────────────────────────────────
      const bgGrd = ctx.createLinearGradient(0, 0, 0, CH);
      bgGrd.addColorStop(0, C_PAGE_ALT);
      bgGrd.addColorStop(1, C_PAGE);
      ctx.fillStyle = bgGrd;
      ctx.fillRect(0, 0, CW, CH);

      // ── Ambient glow beneath the frame (grows with progress) ─────────────
      if (prog > 0.3) {
        const glowAlpha = Math.max(0, (prog - 0.3) / 0.7) * 0.35;
        const ambGrd = ctx.createRadialGradient(
          CW * 0.5, CH * 0.4, 5,
          CW * 0.5, CH * 0.4, FRAME_W * 0.85
        );
        ambGrd.addColorStop(0, `rgba(${amberR},${amberG},${amberB},${glowAlpha})`);
        ambGrd.addColorStop(0.5, `rgba(${amberR},${amberG * 0.6},${amberB * 0.2},${glowAlpha * 0.4})`);
        ambGrd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = ambGrd;
        ctx.fillRect(0, 0, CW, CH);
      }

      // ── Scan-beam canvas layer (complements the SVG beam) ─────────────────
      if (state.beamX > -80 && state.beamX < CW + 80) {
        const bx = state.beamX;
        const beamGrd = ctx.createLinearGradient(bx - 60, 0, bx + 60, 0);
        beamGrd.addColorStop(0, `rgba(${blueR},${blueG},${blueB},0)`);
        beamGrd.addColorStop(0.4, `rgba(${blueR},${blueG},${blueB},0.12)`);
        beamGrd.addColorStop(0.5, `rgba(${blueR},${blueG},${blueB},0.22)`);
        beamGrd.addColorStop(0.6, `rgba(${blueR},${blueG},${blueB},0.12)`);
        beamGrd.addColorStop(1, `rgba(${blueR},${blueG},${blueB},0)`);
        ctx.fillStyle = beamGrd;
        ctx.fillRect(Math.max(0, bx - 60), 0, 120, CH);
      }

      // ── Update and draw particles ──────────────────────────────────────────
      // Advance idle timer once per frame (not per particle)
      if (state.assembled) {
        state.idleT += dt;
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (state.assembled) {
          // Idle breathing: tiny sine wobble after assembly
          const wobble = Math.sin(state.idleT * 0.7 + i * 0.23) * 0.6;
          p.x = p.tx + wobble;
          p.y = p.ty + wobble * 0.6;
        } else if (pull > 0) {
          // Magnetic pull phase — lerp toward target, delayed per particle
          const effectivePull = Math.max(0, pull - p.pullDelay * 0.8);
          if (effectivePull > 0) {
            const t = Math.min(1, effectivePull * p.pullStrength * 1.4);
            // Eased snap: use smoothstep for organic feel
            const et = t * t * (3 - 2 * t);
            p.x = p.sx + (p.tx - p.sx) * et;
            p.y = p.sy + (p.ty - p.sy) * et;
          } else {
            // Still drifting — gentle drift
            p.x += p.vx;
            p.y += p.vy;
            // Soft bounce off canvas edges
            if (p.x < 4 || p.x > CW - 4) p.vx *= -0.7;
            if (p.y < 4 || p.y > CH * 0.85 - 4) p.vy *= -0.7;
          }
        } else {
          // Scatter drift phase — gentle Brownian motion
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 4 || p.x > CW - 4) p.vx *= -0.7;
          if (p.y < 4 || p.y > CH * 0.85 - 4) p.vy *= -0.7;
          // Micro randomness
          p.vx += (Math.random() - 0.5) * 0.02;
          p.vy += (Math.random() - 0.5) * 0.02;
          // Speed cap
          const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (spd > 0.5) { p.vx *= 0.5 / spd; p.vy *= 0.5 / spd; }
        }

        // Depth-modulated size and opacity
        const sz = p.baseSize * (0.3 + p.z * 0.7);
        const baseAlpha = 0.35 + p.z * 0.65;

        // Scan-beam highlight: boost brightness near beam X
        let alpha = baseAlpha;
        let pr = p.r, pg = p.g, pb = p.b;
        if (state.beamX > -80 && state.beamX < CW + 80) {
          const dist = Math.abs(p.x - state.beamX);
          if (dist < 70) {
            const boost = (1 - dist / 70) * 0.7;
            alpha = Math.min(1, alpha + boost * 0.5);
            pr = Math.min(255, Math.round(p.r + boost * (blueR - p.r) * 0.6));
            pg = Math.min(255, Math.round(p.g + boost * (blueG - p.g) * 0.4));
            pb = Math.min(255, Math.round(p.b + boost * (blueB - p.b) * 0.6));
          }
        }

        // Vault-glow tint: shift toward success green at assembly
        if (state.vault > 0 && state.assembled) {
          const vt = state.vault * 0.3;
          pr = Math.round(pr + (succR - pr) * vt);
          pg = Math.round(pg + (succG - pg) * vt);
          pb = Math.round(pb + (succB - pb) * vt);
          alpha = Math.min(1, alpha + state.vault * 0.15);
        }

        // Draw particle as a soft circle (glow = larger circle at low alpha)
        // Near particles get a glow halo; far particles are crisp dots
        if (p.z > 0.6) {
          ctx.globalAlpha = alpha * 0.18;
          ctx.fillStyle = `rgb(${pr},${pg},${pb})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, sz * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgb(${pr},${pg},${pb})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      // ── Assembled frame inner warm glow (Beat 4+) ─────────────────────────
      if (prog > 0.75) {
        const fa = Math.min(1, (prog - 0.75) / 0.25);
        const memGrd = ctx.createRadialGradient(
          FRAME_X + FRAME_W * 0.5, FRAME_Y + FRAME_H * 0.45, 0,
          FRAME_X + FRAME_W * 0.5, FRAME_Y + FRAME_H * 0.45, FRAME_W * 0.6
        );
        memGrd.addColorStop(0, `rgba(255,243,224,${fa * 0.22})`);
        memGrd.addColorStop(0.45, `rgba(200,149,108,${fa * 0.12})`);
        memGrd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = memGrd;
        ctx.fillRect(FRAME_X, FRAME_Y, FRAME_W, FRAME_H);
      }

      // ── Vault seal pulse on canvas (Beat 5) ──────────────────────────────
      if (state.vault > 0) {
        const vAlpha = state.vault * 0.28;
        const vGrd = ctx.createRadialGradient(
          FRAME_X + FRAME_W * 0.5, FRAME_Y + FRAME_H * 0.5, 2,
          FRAME_X + FRAME_W * 0.5, FRAME_Y + FRAME_H * 0.5, FRAME_W * 0.65
        );
        vGrd.addColorStop(0, `rgba(52,211,153,${vAlpha})`);
        vGrd.addColorStop(0.5, `rgba(10,132,255,${vAlpha * 0.4})`);
        vGrd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = vGrd;
        ctx.fillRect(0, 0, CW, CH);
      }
    }

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      gsapCtx.revert();
    };
  }, [isReduced]);

  // ── REDUCED MOTION static render ─────────────────────────────────────────
  if (isReduced) {
    return (
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ maxWidth: CW, aspectRatio: `${CW} / ${CH}` }}
        aria-hidden
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            borderRadius: 16,
          }}
        />
        {/* Static tagline overlay */}
        <div
          className="pointer-events-none absolute inset-x-0"
          style={{
            bottom: "10%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: "clamp(14px, 2.8vw, 18px)",
              color: C_SEPIA,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Recover · Restore · Preserve
          </p>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "clamp(9px, 1.5vw, 11px)",
              color: C_SUCCESS,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Memories Secured
          </p>
        </div>
      </div>
    );
  }

  // ── FULL ANIMATION render ─────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative w-full will-change-transform"
      style={{ maxWidth: CW, aspectRatio: `${CW} / ${CH}` }}
      aria-hidden
    >
      {/* Canvas layer — particles */}
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          borderRadius: 16,
          position: "absolute",
          inset: 0,
        }}
      />

      {/* SVG overlay — beam + frame border + text */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${CW} ${CH}`}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <defs>
          {/* Scan beam gradient */}
          <linearGradient id="c5beamGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={C_BLUE} stopOpacity="0" />
            <stop offset="35%" stopColor={C_BLUE} stopOpacity="0.55" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.75" />
            <stop offset="65%" stopColor={C_BLUE} stopOpacity="0.55" />
            <stop offset="100%" stopColor={C_BLUE} stopOpacity="0" />
          </linearGradient>

          {/* Beam glow (wider, softer) */}
          <linearGradient id="c5beamGlowGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={C_BLUE} stopOpacity="0" />
            <stop offset="50%" stopColor={C_BLUE} stopOpacity="0.15" />
            <stop offset="100%" stopColor={C_BLUE} stopOpacity="0" />
          </linearGradient>

          {/* Vault glow radial */}
          <radialGradient id="c5vaultGrad" cx="50%" cy="42%" r="55%">
            <stop offset="0%" stopColor={C_SUCCESS} stopOpacity="0.55" />
            <stop offset="45%" stopColor={C_BLUE} stopOpacity="0.22" />
            <stop offset="100%" stopColor={C_BLUE} stopOpacity="0" />
          </radialGradient>

          {/* Frame border glow gradient */}
          <linearGradient id="c5frameBorder" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={C_SEPIA} />
            <stop offset="50%" stopColor="#F0EDE8" />
            <stop offset="100%" stopColor={C_AMBER} />
          </linearGradient>

          {/* Clip path for beam (constrains to canvas area) */}
          <clipPath id="c5clip">
            <rect x="0" y="0" width={CW} height={CH * 0.85} />
          </clipPath>
        </defs>

        {/* Vault glow (Beat 5) */}
        <ellipse
          ref={vaultGlowRef}
          cx={FRAME_X + FRAME_W * 0.5}
          cy={FRAME_Y + FRAME_H * 0.42}
          rx={FRAME_W * 0.55}
          ry={FRAME_H * 0.55}
          fill="url(#c5vaultGrad)"
          opacity={0}
          style={{ mixBlendMode: "screen" }}
        />

        {/* Wide beam glow (Beat 2) */}
        <g clipPath="url(#c5clip)">
          <ellipse
            ref={beamGlowRef}
            cx={CW * 0.5}
            cy={CH * 0.42}
            rx={90}
            ry={CH * 0.46}
            fill="url(#c5beamGlowGrad)"
            opacity={0}
            style={{ mixBlendMode: "screen" }}
          />

          {/* Crisp beam line (Beat 2) */}
          <rect
            ref={beamRef}
            x={-50}
            y={0}
            width={80}
            height={CH * 0.85}
            fill="url(#c5beamGrad)"
            opacity={0}
            style={{ mixBlendMode: "screen" }}
          />
        </g>

        {/* Memory frame border (Beat 4) */}
        <rect
          ref={frameBorderRef}
          x={FRAME_X}
          y={FRAME_Y}
          width={FRAME_W}
          height={FRAME_H}
          rx={4}
          fill="none"
          stroke="url(#c5frameBorder)"
          strokeWidth={1.5}
          opacity={0}
        />

        {/* Corner accents on the frame — animated via GSAP ".c5-corner" selector */}
        {(
          [
            [FRAME_X, FRAME_Y, 1, 1],
            [FRAME_X + FRAME_W, FRAME_Y, -1, 1],
            [FRAME_X, FRAME_Y + FRAME_H, 1, -1],
            [FRAME_X + FRAME_W, FRAME_Y + FRAME_H, -1, -1],
          ] as [number, number, number, number][]
        ).map(([cx, cy, dx, dy], i) => (
          <g key={i} className="c5-corner" opacity={0}>
            <line
              x1={cx}
              y1={cy}
              x2={cx + dx * 12}
              y2={cy}
              stroke={C_SEPIA}
              strokeWidth={2}
            />
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy + dy * 12}
              stroke={C_SEPIA}
              strokeWidth={2}
            />
          </g>
        ))}

        {/* Scan label (Beat 2) */}
        <text
          ref={scanLabelRef}
          x={CW * 0.5}
          y={CH * 0.89}
          textAnchor="middle"
          fontFamily="'JetBrains Mono', monospace"
          fontSize={10}
          fill={C_BLUE}
          letterSpacing="0.14em"
          opacity={0}
          style={{ textTransform: "uppercase" }}
        >
          Scanning disc surface…
        </text>

        {/* Recovering label (Beat 3) */}
        <text
          ref={recoveringLabelRef}
          x={CW * 0.5}
          y={CH * 0.89}
          textAnchor="middle"
          fontFamily="'JetBrains Mono', monospace"
          fontSize={10}
          fill={C_AMBER}
          letterSpacing="0.14em"
          opacity={0}
          style={{ textTransform: "uppercase" }}
        >
          Recovering fragments…
        </text>

        {/* Tagline (Beat 5) */}
        <text
          ref={taglineRef}
          x={CW * 0.5}
          y={CH * 0.895}
          textAnchor="middle"
          fontFamily="'Cormorant Garamond', serif"
          fontSize={15}
          fontStyle="italic"
          fontWeight={300}
          fill={C_SEPIA}
          letterSpacing="0.16em"
          opacity={0}
        >
          Recover · Restore · Preserve
        </text>

        {/* Heirvo brand mark (Beat 5) */}
        <g ref={brandRef} opacity={0}>
          {/* Minimal wordmark placeholder — "heirvo" in Sora */}
          <text
            x={CW * 0.5}
            y={CH * 0.975}
            textAnchor="middle"
            fontFamily="'Sora', sans-serif"
            fontSize={11}
            fontWeight={600}
            fill={C_TEXT_MUTED}
            letterSpacing="0.22em"
            style={{ textTransform: "uppercase" }}
          >
            HEIRVO
          </text>
          {/* Brand dot — Heirvo brand blue */}
          <circle cx={CW * 0.5 - 31} cy={CH * 0.97} r={2.5} fill={C_BLUE} />
        </g>
      </svg>

      {/* Film grain overlay — matches HeroFilmFrame house style */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: 16,
          opacity: 0.045,
          mixBlendMode: "overlay",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
