/*
 * COMPETITION ENTRY A — Cinematic Archive
 * Philosophy: The page IS the emotional experience — you scroll through grief,
 *   nostalgia, and finally relief, just like pulling a disc from a shoebox.
 * Technique 1: Scroll-pinned horizontal narrative (4 panels, x-translate on scrub)
 *   — forces the user to live inside the story, not past it.
 * Technique 2: SplitText line-by-line clip-path reveals with staggered wipe-up
 *   on every heading — no heading fades in, every heading APPEARS like a title card.
 * Technique 3: Multi-speed parallax depth stack in hero (3 z-layers at 0.2/0.5/0.9
 *   scrub multipliers) combined with Ken Burns scale-in on page load.
 * Psychological bet: Loss aversion in the first 300ms. "Before these photos
 *   disappear forever." The word FOREVER in amber stops the scroll-bounce reflex.
 * Monetization hook: Amber "Gift a Recovery" panel mid-page, seasonal badge in hero,
 *   and a gift CTA alongside each pricing tier — frames the purchase as love, not cost.
 */

import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);

CustomEase.create("cinematic", "M0,0 C0.76,0 0.24,1 1,1");
CustomEase.create("snap", "M0,0 C0.34,1.56 0.64,1 1,1");

const DOWNLOAD_URL: string =
  (import.meta.env.VITE_DOWNLOAD_URL as string) || "#";

// ─── Design tokens ─────────────────────────────────────────────────────────

const C = {
  page: "#0B1220",
  pageAlt: "#0E1628",
  pageMid: "#111827",
  text: "#F0EDE8",
  textMuted: "#94A3B8",
  textFaint: "#5E7290",
  border: "rgba(255,255,255,0.08)",
  borderMed: "rgba(255,255,255,0.12)",
  borderBright: "rgba(255,255,255,0.20)",
  blue: "#0A84FF",
  blueHover: "#3B9EFF",
  blueFaint: "rgba(10,132,255,0.12)",
  blueBorder: "rgba(10,132,255,0.30)",
  amber: "#F59E0B",
  amberHover: "#FBB03B",
  amberFaint: "rgba(245,158,11,0.10)",
  amberBorder: "rgba(245,158,11,0.25)",
  // Warm sepia spotlight — replaces cold blue as the hero light source
  // Brief: radial-gradient amber-sepia at ~12% opacity emanating from hero centre
  heroSpotlight: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(200,150,80,0.12), transparent 70%)",
  // SVG noise grain — fractalNoise, desaturated, stitched, ~10% opacity
  grain: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.10'/%3E%3C/svg%3E\")",
} as const;

const SORA = '"Sora", ui-sans-serif, system-ui, sans-serif';
const MONO = '"JetBrains Mono", "Fira Mono", ui-monospace, monospace';

// ─── FAQ data ──────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Which disc formats does Heirvo support?",
    a: "Heirvo recovers files from DVDs, CDs, Blu-rays, and Kodak Photo CDs. It handles scratched, cracked, and oxidised discs — including discs that Windows Explorer refuses to open.",
  },
  {
    q: "Do I need a special disc drive?",
    a: "Any standard USB or internal DVD/Blu-ray drive on a Windows 10 or 11 PC works. No specialist hardware or adapters are required.",
  },
  {
    q: "What happens if only some files are recoverable?",
    a: "Heirvo shows you a preview of every file it can read before you pay anything. You see exactly what you're getting. If the disc is too far gone, you owe nothing.",
  },
  {
    q: "Can I give Heirvo as a gift?",
    a: "Yes — you can purchase a recovery licence on behalf of someone else and email them the activation code. A short note from you makes it the most personal gift imaginable.",
  },
];

// ─── Structured data ───────────────────────────────────────────────────────

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Heirvo",
  "applicationCategory": "UtilitiesApplication",
  "operatingSystem": "Windows 10, Windows 11",
  "description": "Recover photos, videos, and files from damaged, scratched, or unreadable DVDs, CDs, Blu-rays, and Kodak Photo CDs.",
  "offers": [
    { "@type": "Offer", "price": "0", "priceCurrency": "USD", "name": "Free scan" },
    { "@type": "Offer", "price": "59", "priceCurrency": "USD", "name": "Recover" },
    { "@type": "Offer", "price": "99", "priceCurrency": "USD", "name": "Archive" },
  ],
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

// ─── Disc SVG ──────────────────────────────────────────────────────────────

function DiscSVG({ size = 120, opacity = 0.18 }: { size?: number; opacity?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden
      style={{ opacity, flexShrink: 0 }}
    >
      <circle cx="60" cy="60" r="58" stroke={C.textFaint} strokeWidth="1" />
      <circle cx="60" cy="60" r="44" stroke={C.textFaint} strokeWidth="0.5" strokeDasharray="3 4" />
      <circle cx="60" cy="60" r="28" stroke={C.textFaint} strokeWidth="0.5" />
      <circle cx="60" cy="60" r="10" stroke={C.textFaint} strokeWidth="1" />
      <circle cx="60" cy="60" r="4" fill={C.textFaint} opacity="0.4" />
    </svg>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────

function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p
      style={{
        fontFamily: MONO,
        fontSize: "0.68rem",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: light ? C.amber : C.textFaint,
        marginBottom: "1.5rem",
      }}
    >
      {children}
    </p>
  );
}

// ─── Divider ───────────────────────────────────────────────────────────────

function FilmDivider({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "0 6vw",
        margin: "0 auto",
        maxWidth: "1200px",
      }}
    >
      <div
        style={{
          flex: 1,
          height: "1px",
          background: C.border,
        }}
      />
      <span
        style={{
          fontFamily: MONO,
          fontSize: "0.62rem",
          letterSpacing: "0.18em",
          color: C.textFaint,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: "1px",
          background: C.border,
        }}
      />
    </div>
  );
}

// ─── FAQ Accordion item ─────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (open) {
      gsap.to(el, { height: "auto", opacity: 1, duration: 0.42, ease: "power2.inOut" });
    } else {
      gsap.to(el, { height: 0, opacity: 0, duration: 0.28, ease: "power2.in" });
    }
  }, [open]);

  useEffect(() => {
    if (bodyRef.current) {
      gsap.set(bodyRef.current, { height: 0, opacity: 0, overflow: "hidden" });
    }
  }, []);

  return (
    <div
      style={{
        borderBottom: `1px solid ${C.border}`,
        paddingBottom: "0",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "2rem",
          padding: "1.5rem 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          color: C.text,
          fontFamily: SORA,
          fontSize: "1rem",
          fontWeight: 500,
        }}
        aria-expanded={open}
      >
        <span>{q}</span>
        <span
          style={{
            flexShrink: 0,
            width: "20px",
            height: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1)",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
            color: open ? C.amber : C.textFaint,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      <div ref={bodyRef}>
        <p
          style={{
            fontFamily: SORA,
            fontSize: "0.9375rem",
            lineHeight: 1.7,
            color: C.textMuted,
            paddingBottom: "1.5rem",
            maxWidth: "60ch",
          }}
        >
          {a}
        </p>
      </div>
    </div>
  );
}

// ─── Pricing Card ───────────────────────────────────────────────────────────

interface PricingCardProps {
  label: string;
  price: string;
  tagline: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted?: boolean;
  giftable?: boolean;
}

function PricingCard({
  label,
  price,
  tagline,
  features,
  cta,
  ctaHref,
  highlighted = false,
  giftable = false,
}: PricingCardProps) {
  return (
    <div
      style={{
        background: highlighted ? `linear-gradient(135deg, ${C.pageMid}, ${C.pageAlt})` : C.pageAlt,
        border: `1px solid ${highlighted ? C.borderBright : C.border}`,
        borderRadius: "6px",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {highlighted && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: `linear-gradient(90deg, ${C.blue}, ${C.blueHover})`,
          }}
          aria-hidden
        />
      )}
      <div>
        <SectionLabel>{label}</SectionLabel>
        <div
          style={{
            fontFamily: SORA,
            fontSize: "clamp(2rem, 4vw, 2.75rem)",
            fontWeight: 700,
            color: C.text,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            marginBottom: "0.5rem",
          }}
        >
          {price}
        </div>
        <p style={{ fontFamily: SORA, fontSize: "0.875rem", color: C.textMuted }}>{tagline}</p>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {features.map((f) => (
          <li
            key={f}
            style={{
              display: "flex",
              gap: "0.625rem",
              alignItems: "flex-start",
              fontFamily: SORA,
              fontSize: "0.875rem",
              color: C.textMuted,
              lineHeight: 1.5,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0, marginTop: "1px" }}>
              <path d="M3 8l3.5 3.5L13 4.5" stroke={C.blue} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        <a
          href={ctaHref}
          style={{
            display: "block",
            textAlign: "center",
            padding: "0.8125rem 1.25rem",
            borderRadius: "5px",
            background: highlighted ? C.blue : "transparent",
            border: `1px solid ${highlighted ? C.blue : C.borderMed}`,
            color: C.text,
            fontFamily: SORA,
            fontSize: "0.9375rem",
            fontWeight: 600,
            textDecoration: "none",
            transition: "background 0.18s, border-color 0.18s, transform 0.18s cubic-bezier(0.16,1,0.3,1)",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = highlighted ? C.blueHover : C.border;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = highlighted ? C.blue : "transparent";
          }}
        >
          {cta}
        </a>
        {giftable && (
          <a
            href="#gift"
            style={{
              display: "block",
              textAlign: "center",
              padding: "0.6875rem 1.25rem",
              borderRadius: "5px",
              background: C.amberFaint,
              border: `1px solid ${C.amberBorder}`,
              color: C.amber,
              fontFamily: SORA,
              fontSize: "0.8125rem",
              fontWeight: 500,
              textDecoration: "none",
              transition: "background 0.18s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = `rgba(245,158,11,0.18)`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = C.amberFaint;
            }}
          >
            Gift a recovery →
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function LandingCompA() {
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const heroTextRef = useRef<HTMLDivElement>(null);
  const heroBgRef = useRef<HTMLDivElement>(null);
  const heroSubRef = useRef<HTMLDivElement>(null);
  const heroDiscRef = useRef<HTMLDivElement>(null);
  const horizontalRef = useRef<HTMLDivElement>(null);
  const panelTrackRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const ctx = gsap.context(() => {

      // ── Scroll progress bar ──────────────────────────────────────────────
      if (progressBarRef.current) {
        gsap.set(progressBarRef.current, { scaleX: 0, transformOrigin: "left center" });
        gsap.to(progressBarRef.current, {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: document.documentElement,
            start: "top top",
            end: "bottom bottom",
            scrub: 0,
          },
        });
      }

      // ── Hero: Ken Burns load ─────────────────────────────────────────────
      if (heroBgRef.current) {
        gsap.fromTo(
          heroBgRef.current,
          { scale: 1.06, willChange: "transform" },
          {
            scale: 1,
            duration: 3.5,
            ease: "power2.out",
            onComplete: () => gsap.set(heroBgRef.current, { willChange: "auto" }),
          }
        );
      }

      // ── Hero: Headline — 3D char flip-up (brief spec: y:30 rotateX:-40 stagger:0.025) ──
      // This produces a perspective-depth letter-assembly feel that Awwwards juries score highly.
      // Each char flips up from 40° tilt on the X-axis while rising 30px, with a 25ms stagger.
      const heroHeadEls = heroTextRef.current?.querySelectorAll(".hero-head");
      if (heroHeadEls) {
        heroHeadEls.forEach((el, i) => {
          try {
            const split = SplitText.create(el, { type: "chars,words" });
            gsap.set(split.chars, {
              opacity: 0,
              y: 30,
              rotateX: -40,
              transformOrigin: "50% 50% -20px",
              willChange: "transform, opacity",
            });
            gsap.to(split.chars, {
              opacity: 1,
              y: 0,
              rotateX: 0,
              duration: 0.65,
              stagger: 0.025,
              ease: "power3.out",
              delay: 0.3 + i * 0.05,
              onComplete: () =>
                gsap.set(split.chars, { willChange: "auto", clearProps: "rotateX,transformOrigin" }),
            });
          } catch {
            // SplitText unavailable — headline visible as fallback
          }
        });
      }

      // ── Hero: subtitle + CTA fade from below ────────────────────────────
      if (heroSubRef.current) {
        gsap.from(heroSubRef.current, {
          y: 28,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          delay: 0.85,
        });
      }

      // ── Hero: parallax depth layers on scroll ───────────────────────────
      if (heroTextRef.current) {
        gsap.to(heroTextRef.current, {
          yPercent: -18,
          ease: "none",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.5,
          },
        });
      }
      if (heroSubRef.current) {
        gsap.to(heroSubRef.current, {
          yPercent: -12,
          ease: "none",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.5,
          },
        });
      }
      if (heroBgRef.current) {
        gsap.to(heroBgRef.current, {
          yPercent: -6,
          ease: "none",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.5,
          },
        });
      }
      if (heroDiscRef.current) {
        gsap.to(heroDiscRef.current, {
          yPercent: -30,
          ease: "none",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.5,
          },
        });
      }

      // ── Horizontal narrative pin ─────────────────────────────────────────
      if (horizontalRef.current && panelTrackRef.current) {
        const panels = panelTrackRef.current.querySelectorAll(".narrative-panel");
        const totalWidth = (panels.length - 1) * 100; // vw units

        // Capture the tween so we can pass it as containerAnimation below
        const hTween = gsap.to(panelTrackRef.current, {
          x: () => `-${(panels.length - 1) * panelTrackRef.current!.offsetWidth / panels.length}px`,
          ease: "none",
          scrollTrigger: {
            trigger: horizontalRef.current,
            start: "top top",
            end: () => `+=${totalWidth * window.innerWidth / 100}`,
            pin: true,
            anticipatePin: 1,
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        });

        // Animate text inside each panel as it enters via containerAnimation
        panels.forEach((panel, i) => {
          if (i === 0) return; // first panel visible immediately
          const heading = panel.querySelector(".panel-heading");
          const body = panel.querySelector(".panel-body");

          if (heading) {
            const split = new SplitText(heading, { type: "lines", linesClass: "split-line" });
            gsap.set(split.lines, { clipPath: "inset(0% 0% 100% 0%)" });
            gsap.to(split.lines, {
              clipPath: "inset(0% 0% 0% 0%)",
              duration: 0.9,
              ease: "cinematic",
              stagger: 0.1,
              scrollTrigger: {
                trigger: panel,
                containerAnimation: hTween,
                start: "left 80%",
                end: "left 20%",
                toggleActions: "play none none reverse",
              },
            });
          }
          if (body) {
            gsap.from(body, {
              opacity: 0,
              y: 20,
              duration: 0.7,
              ease: "power3.out",
              scrollTrigger: {
                trigger: panel,
                containerAnimation: hTween,
                start: "left 70%",
                toggleActions: "play none none reverse",
              },
            });
          }
        });
      }

      // ── Section heading reveals — 3D char flip-up on scroll enter ──────────
      // Brief spec: y:30, rotateX:-40, stagger:0.025 — same formula as hero for consistency.
      // Horizontal narrative panel headings (.panel-heading) retain the line-clip approach
      // because they're triggered by containerAnimation, not viewport ScrollTrigger.
      document.querySelectorAll(".section-head").forEach((el) => {
        try {
          const split = SplitText.create(el, { type: "chars,words" });
          gsap.set(split.chars, {
            opacity: 0,
            y: 30,
            rotateX: -40,
            transformOrigin: "50% 50% -20px",
            willChange: "transform, opacity",
          });
          ScrollTrigger.create({
            trigger: el,
            start: "top 88%",
            once: true,
            onEnter: () =>
              gsap.to(split.chars, {
                opacity: 1,
                y: 0,
                rotateX: 0,
                duration: 0.6,
                stagger: 0.025,
                ease: "power3.out",
                onComplete: () =>
                  gsap.set(split.chars, { willChange: "auto", clearProps: "rotateX,transformOrigin" }),
              }),
          });
        } catch {
          // SplitText unavailable — leave element visible
        }
      });

      // ── Card stagger reveals ────────────────────────────────────────────
      ScrollTrigger.batch(".reveal-card", {
        onEnter: (batch) =>
          gsap.from(batch, {
            y: 48,
            opacity: 0,
            duration: 0.85,
            ease: "power3.out",
            stagger: 0.1,
          }),
        start: "top 88%",
        once: true,
      });

      // ── Bento tile stagger — each tile rises independently ───────────────
      const bentoTiles = document.querySelectorAll(".bento-tile");
      if (bentoTiles.length) {
        gsap.set(bentoTiles, { opacity: 0, y: 40, willChange: "transform, opacity" });
        ScrollTrigger.batch(bentoTiles, {
          onEnter: (batch) =>
            gsap.to(batch, {
              opacity: 1, y: 0,
              duration: 0.85, ease: "power3.out", stagger: 0.09,
              onComplete: () => gsap.set(batch, { willChange: "auto" }),
            }),
          start: "top 85%",
          once: true,
        });
      }

      // ── Photo wipe — clip-path inset(100% 0 0 0) → inset(0% 0 0 0) ───────
      // Brief: "printing up from a photo developer" — mirrors recovery metaphor.
      // inset(100% → 0%) wipes from bottom to top, stagger 0.12s.
      const photoGrid = document.getElementById("photo-recovery-grid");
      if (photoGrid) {
        const cards = photoGrid.querySelectorAll(".photo-wipe-card");
        gsap.set(cards, { clipPath: "inset(100% 0 0 0)", willChange: "clip-path" });
        ScrollTrigger.create({
          trigger: photoGrid,
          start: "top 75%",
          once: true,
          onEnter: () =>
            gsap.to(cards, {
              clipPath: "inset(0% 0 0 0)",
              duration: 0.9,
              ease: "power2.inOut",
              stagger: 0.12,
              onComplete: () => gsap.set(cards, { willChange: "auto" }),
            }),
        });
      }

      // ── Step number counter reveals ─────────────────────────────────────
      ScrollTrigger.batch(".step-num", {
        onEnter: (batch) =>
          gsap.from(batch, {
            scale: 0.6,
            opacity: 0,
            duration: 0.7,
            ease: "snap",
            stagger: 0.12,
          }),
        start: "top 88%",
        once: true,
      });

    }, pageRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <div
      ref={pageRef}
      style={{
        background: C.page,
        color: C.text,
        fontFamily: SORA,
        overflowX: "hidden",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      {/* ── JSON-LD ───────────────────────────────────────────────────────── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />

      {/* ── Noise grain overlay — fixed, pointer-events:none, blend:overlay ── */}
      {/* Brief: feTurbulence fractalNoise at 0.85 baseFreq, saturate:0, ~10% opacity */}
      {/* Creates the tactile premium feel that prevents void-black flatness */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 9999,
          backgroundImage: C.grain,
          backgroundSize: "256px 256px",
          mixBlendMode: "overlay",
        }}
      />

      {/* ── Warm amber-sepia spotlight ─────────────────────────────────────── */}
      {/* Brief: replace purple-blue with amber-sepia rgba(200,150,80,0.12) */}
      {/* Evokes warmth of analog memory; disc label art as radiant source */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background: C.heroSpotlight,
        }}
      />

      {/* ── Scroll progress bar ───────────────────────────────────────────── */}
      <div
        ref={progressBarRef}
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: C.amber,
          zIndex: 200,
          transformOrigin: "left center",
          pointerEvents: "none",
        }}
      />

      {/* ── Global styles ─────────────────────────────────────────────────── */}
      <style>{`
        *,:after,:before{box-sizing:border-box}
        ::selection{background:${C.amber};color:${C.page}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:${C.page}}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:3px}
        .split-line{overflow:hidden;display:block}
        .hero-head{display:block}
        .narrative-panel{flex-shrink:0}
        @media (max-width: 768px) {
          .hide-mobile{display:none!important}
        }
      `}</style>

      <Nav />

      {/* ═══════════════════════════════════════════════════════════════════
          HERO — viewport-filling, 3-layer parallax depth
      ═══════════════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          paddingBottom: "8vh",
          overflow: "hidden",
        }}
      >
        {/* Background layer — deepest, slowest parallax */}
        <div
          ref={heroBgRef}
          aria-hidden
          style={{
            position: "absolute",
            inset: "-10% -5%",
            background: `
              radial-gradient(ellipse 80% 60% at 70% 40%, rgba(10,132,255,0.07), transparent),
              radial-gradient(ellipse 60% 80% at 20% 60%, rgba(245,158,11,0.05), transparent),
              ${C.page}
            `,
            zIndex: 0,
          }}
        />

        {/* Disc ornament — mid layer, faster parallax */}
        <div
          ref={heroDiscRef}
          aria-hidden
          style={{
            position: "absolute",
            right: "8vw",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1,
            pointerEvents: "none",
          }}
          className="hide-mobile"
        >
          <DiscSVG size={340} opacity={0.09} />
        </div>

        {/* Seasonal badge */}
        <div
          style={{
            position: "absolute",
            top: "calc(80px + 2.5rem)",
            right: "6vw",
            zIndex: 3,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.375rem 0.875rem",
              borderRadius: "999px",
              background: C.amberFaint,
              border: `1px solid ${C.amberBorder}`,
              fontFamily: MONO,
              fontSize: "0.65rem",
              letterSpacing: "0.15em",
              color: C.amber,
              textTransform: "uppercase",
            }}
          >
            <span aria-hidden>◆</span>
            Mother&apos;s Day · Father&apos;s Day · Christmas
          </div>
        </div>

        {/* Film frame marks */}
        {[20, 40, 60, 80].map((top) => (
          <div
            key={top}
            aria-hidden
            style={{
              position: "absolute",
              left: "2.5rem",
              top: `${top}%`,
              width: "1.5rem",
              height: "1px",
              background: C.border,
              zIndex: 1,
            }}
          />
        ))}

        {/* Content — front layer */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            padding: "0 6vw",
            maxWidth: "1400px",
          }}
        >
          {/* Section label */}
          <div ref={heroTextRef}>
            <SectionLabel>01 — Disc Recovery</SectionLabel>

            {/* Identity-first statement — brief: lead with identity before product.
                "You're someone who doesn't let things slip away." Mirrors Artifact Uprising
                and 23andMe conversion strategy: frame the purchase as consistent with who
                the buyer already believes themselves to be (the responsible adult child). */}
            <p
              style={{
                fontFamily: SORA,
                fontSize: "clamp(13px, 1.3vw, 15px)",
                fontWeight: 500,
                letterSpacing: "0.02em",
                color: C.amber,
                opacity: 0.8,
                marginBottom: "1.1em",
                lineHeight: 1.5,
              }}
            >
              You&apos;re someone who doesn&apos;t let things slip away.
            </p>

            {/* MASSIVE editorial headline — perspective enables 3D rotateX on chars */}
            <h1
              className="hero-head"
              style={{
                fontFamily: SORA,
                fontSize: "clamp(3.5rem, 10vw, 8.5rem)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 0.95,
                color: C.text,
                margin: "0 0 0.25em",
                textWrap: "balance",
                maxWidth: "16ch",
                perspective: "600px",
              }}
            >
              Before these photos
            </h1>
            <h1
              className="hero-head"
              style={{
                fontFamily: SORA,
                fontSize: "clamp(3.5rem, 10vw, 8.5rem)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 0.95,
                color: C.amber,
                margin: "0 0 0.5em",
                textWrap: "balance",
                maxWidth: "16ch",
                perspective: "600px",
              }}
            >
              disappear forever.
            </h1>
          </div>

          {/* Subtitle + CTA — middle z layer */}
          <div ref={heroSubRef} style={{ maxWidth: "540px" }}>
            <p
              style={{
                fontFamily: SORA,
                fontSize: "clamp(1.05rem, 1.8vw, 1.25rem)",
                lineHeight: 1.65,
                color: C.textMuted,
                marginBottom: "2.5rem",
                textWrap: "pretty" as React.CSSProperties["textWrap"],
              }}
            >
              Heirvo recovers photos, videos, and files from scratched, cracked,
              or unreadable DVDs, CDs, and Kodak Photo CDs — before the disc
              degrades beyond saving.
            </p>
            {/* Brief: gift flow with recipient framing converts well.
                "Buy for a parent" as a distinct CTA path — shifts decision frame
                from "project I'll do later" to "gift I'm giving now." (Artifact Uprising pattern) */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
              <a
                href={DOWNLOAD_URL}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.9375rem 2rem",
                  borderRadius: "5px",
                  background: C.blue,
                  color: C.text,
                  fontFamily: SORA,
                  fontSize: "1rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "background 0.18s, transform 0.18s cubic-bezier(0.16,1,0.3,1)",
                  willChange: "transform",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = C.blueHover;
                  (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = C.blue;
                  (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
                }}
              >
                Scan your disc — it&apos;s free
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <Link
                to="/gift"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.9375rem 1.5rem",
                  borderRadius: "5px",
                  background: C.amberFaint,
                  border: `1px solid ${C.amberBorder}`,
                  color: C.amber,
                  fontFamily: SORA,
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "border-color 0.18s, background 0.18s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = C.amber;
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(245,158,11,0.16)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = C.amberBorder;
                  (e.currentTarget as HTMLAnchorElement).style.background = C.amberFaint;
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Buy for a parent
              </Link>
            </div>

            {/* Trust note */}
            <p
              style={{
                marginTop: "1.5rem",
                fontFamily: MONO,
                fontSize: "0.68rem",
                letterSpacing: "0.12em",
                color: C.textFaint,
              }}
            >
              Windows 10 / 11 · Free scan · Pay only to recover
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SCROLL-PINNED HORIZONTAL NARRATIVE
          4 panels that tell the emotional story
      ═══════════════════════════════════════════════════════════════════ */}
      <FilmDivider label="02 — The story of every family's disc" />

      <div
        ref={horizontalRef}
        style={{
          position: "relative",
          height: "100vh",
          overflow: "hidden",
          background: C.page,
          marginTop: "0",
        }}
      >
        <div
          ref={panelTrackRef}
          style={{
            display: "flex",
            height: "100%",
            willChange: "transform",
          }}
        >
          {/* Panel 1 — The disc */}
          <div
            className="narrative-panel"
            style={{
              width: "100vw",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: "0 6vw 8vh",
              flexShrink: 0,
              position: "relative",
              borderRight: `1px solid ${C.border}`,
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: "50%",
                right: "12vw",
                transform: "translateY(-50%)",
              }}
            >
              <DiscSVG size={280} opacity={0.12} />
            </div>
            <SectionLabel>1997</SectionLabel>
            <h2
              className="panel-heading section-head"
              style={{
                fontFamily: SORA,
                fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                lineHeight: 1.0,
                color: C.text,
                maxWidth: "14ch",
                margin: "0 0 1.5rem",
              }}
            >
              Your disc.{"\n"}Somewhere in the attic.
            </h2>
            <p
              className="panel-body"
              style={{
                fontFamily: SORA,
                fontSize: "1.0625rem",
                color: C.textMuted,
                maxWidth: "42ch",
                lineHeight: 1.7,
              }}
            >
              A DVD of your daughter&apos;s first birthday. A CD of your parents&apos;
              wedding slideshow. A Kodak Photo CD from 1994. Sitting in a jewel case,
              waiting.
            </p>
          </div>

          {/* Panel 2 — The shoebox */}
          <div
            className="narrative-panel"
            style={{
              width: "100vw",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: "0 6vw 8vh",
              flexShrink: 0,
              borderRight: `1px solid ${C.border}`,
              background: `radial-gradient(ellipse 60% 50% at 80% 30%, rgba(245,158,11,0.04), transparent)`,
            }}
          >
            <SectionLabel>The shoebox in the attic</SectionLabel>
            <h2
              className="panel-heading section-head"
              style={{
                fontFamily: SORA,
                fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                lineHeight: 1.0,
                color: C.text,
                maxWidth: "16ch",
                margin: "0 0 1.5rem",
              }}
            >
              The shoebox isn&apos;t going anywhere.
            </h2>
            <p
              className="panel-body"
              style={{
                fontFamily: SORA,
                fontSize: "1.0625rem",
                color: C.textMuted,
                maxWidth: "44ch",
                lineHeight: 1.7,
              }}
            >
              But the disc is. Every year, the reflective layer oxidises a little more.
              Every scratch cuts a little deeper. Disc rot is slow, invisible, and
              completely permanent.
            </p>
          </div>

          {/* Panel 3 — Still recoverable */}
          <div
            className="narrative-panel"
            style={{
              width: "100vw",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: "0 6vw 8vh",
              flexShrink: 0,
              borderRight: `1px solid ${C.border}`,
              background: `radial-gradient(ellipse 70% 50% at 20% 60%, rgba(10,132,255,0.06), transparent)`,
            }}
          >
            <SectionLabel>03 — Today</SectionLabel>
            <h2
              className="panel-heading section-head"
              style={{
                fontFamily: SORA,
                fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                lineHeight: 1.0,
                color: C.blue,
                maxWidth: "14ch",
                margin: "0 0 1.5rem",
              }}
            >
              Still recoverable.
            </h2>
            <p
              className="panel-body"
              style={{
                fontFamily: SORA,
                fontSize: "1.0625rem",
                color: C.textMuted,
                maxWidth: "44ch",
                lineHeight: 1.7,
              }}
            >
              Heirvo reads sector by sector, making multiple passes where other software
              gives up. Most discs that Windows can&apos;t open still have 80–95% of
              their data intact. You just need the right tool to reach it.
            </p>
          </div>

          {/* Panel 4 — CTA */}
          <div
            className="narrative-panel"
            style={{
              width: "100vw",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: "0 6vw 8vh",
              flexShrink: 0,
              background: `radial-gradient(ellipse 80% 60% at 50% 40%, rgba(245,158,11,0.05), transparent)`,
            }}
          >
            <SectionLabel>Don&apos;t wait</SectionLabel>
            <h2
              className="panel-heading section-head"
              style={{
                fontFamily: SORA,
                fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                lineHeight: 1.0,
                color: C.text,
                maxWidth: "14ch",
                margin: "0 0 1.5rem",
              }}
            >
              The scan is free. The decision is not.
            </h2>
            <p
              className="panel-body"
              style={{
                fontFamily: SORA,
                fontSize: "1.0625rem",
                color: C.textMuted,
                maxWidth: "44ch",
                lineHeight: 1.7,
                marginBottom: "2.5rem",
              }}
            >
              Download Heirvo, insert your disc, and see exactly what&apos;s still
              recoverable — before you spend a single cent.
            </p>
            <a
              href={DOWNLOAD_URL}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1rem 2rem",
                borderRadius: "5px",
                background: C.blue,
                color: C.text,
                fontFamily: SORA,
                fontSize: "1rem",
                fontWeight: 600,
                textDecoration: "none",
                transition: "background 0.18s, transform 0.15s cubic-bezier(0.16,1,0.3,1)",
                width: "fit-content",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = C.blueHover;
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = C.blue;
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
              }}
            >
              Free scan →
            </a>
          </div>
        </div>

        {/* Panel progress indicator */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "0.5rem",
            zIndex: 5,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: "2.5rem",
                height: "2px",
                borderRadius: "1px",
                background: i === 0 ? C.amber : C.border,
              }}
            />
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BENTO GRID — asymmetric feature section
          Brief: 2×2 hero tile + 1×1/1×2 supporting tiles.
          Apple-popularised at WWDC 2023; CSS Design Awards WOTDs in 2024.
          "Reduces a long feature list into a single scannable spread."
      ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="features"
        style={{ padding: "8rem 6vw", background: C.page }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <FilmDivider label="03 — What Heirvo does" />
          <div style={{ marginTop: "5rem" }}>
            <h2
              className="section-head"
              style={{
                fontFamily: SORA,
                fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
                fontWeight: 700,
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
                color: C.text,
                maxWidth: "22ch",
                marginBottom: "3rem",
                perspective: "600px",
              }}
            >
              Built for discs nothing else can read.
            </h2>

            {/* Asymmetric bento: 3 columns, 3 rows. Hero tile spans 2×2. */}
            <div
              className="bento-grid reveal-card"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gridTemplateRows: "auto auto auto",
                gap: "14px",
              }}
            >
              {/* Hero tile — 2×2, signature capability */}
              <div
                className="bento-tile"
                style={{
                  gridArea: "1 / 1 / 3 / 3",
                  background: C.pageAlt,
                  border: `1px solid ${C.border}`,
                  borderRadius: "16px",
                  padding: "2.5rem",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: `0 1px 0 ${C.borderMed} inset, 0 4px 32px rgba(0,0,0,0.35)`,
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: "1.25rem",
                  transition: "border-color 0.2s ease",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = C.amberBorder;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = C.border;
                }}
              >
                {/* Warm glow inside hero tile */}
                <div aria-hidden style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  background: "radial-gradient(ellipse 70% 50% at 30% 60%, rgba(10,132,255,0.06), transparent)",
                }} />
                {/* Animated scan progress bar — static representation */}
                <div style={{
                  width: "100%",
                  height: "3px",
                  borderRadius: "2px",
                  background: C.border,
                  overflow: "hidden",
                  marginBottom: "0.5rem",
                }}>
                  <div style={{
                    width: "73%",
                    height: "100%",
                    borderRadius: "2px",
                    background: `linear-gradient(90deg, ${C.blue}, ${C.blueHover})`,
                    boxShadow: `0 0 6px rgba(10,132,255,0.45)`,
                  }} />
                </div>
                <div>
                  <p style={{
                    fontFamily: SORA, fontSize: "0.7rem", fontWeight: 700,
                    letterSpacing: "0.15em", textTransform: "uppercase" as const,
                    color: C.textFaint, marginBottom: "0.6rem",
                  }}>
                    Sector-by-sector recovery
                  </p>
                  <h3 style={{
                    fontFamily: SORA, fontWeight: 700,
                    fontSize: "clamp(1.35rem, 2.2vw, 1.9rem)",
                    letterSpacing: "-0.03em", color: C.text,
                    lineHeight: 1.2, marginBottom: "0.75rem",
                  }}>
                    Every readable sector. Up to 8 passes.
                  </h3>
                  <p style={{
                    fontFamily: SORA, fontSize: "0.9375rem",
                    color: C.textMuted, lineHeight: 1.65,
                  }}>
                    Most disc software stops on first read error. Heirvo retries each damaged
                    sector at multiple speeds — forward and backward — recovering data other
                    tools leave on the disc. Most discs Windows can&apos;t open still have
                    80–95% of their data intact.
                  </p>
                </div>
              </div>

              {/* 1×1 — Format support */}
              <div
                className="bento-tile"
                style={{
                  gridArea: "1 / 3 / 2 / 4",
                  background: C.pageAlt,
                  border: `1px solid ${C.border}`,
                  borderRadius: "16px",
                  padding: "1.75rem",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: "0.75rem",
                  transition: "border-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = C.amberBorder;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = C.border;
                }}
              >
                <svg width="22" height="22" viewBox="0 0 64 64" fill="none" aria-hidden>
                  <circle cx="32" cy="32" r="30" stroke={C.amber} strokeWidth="1.5" opacity="0.4"/>
                  <circle cx="32" cy="32" r="18" stroke={C.amber} strokeWidth="1.5" opacity="0.6"/>
                  <circle cx="32" cy="32" r="4"  fill={C.amber} opacity="0.9"/>
                </svg>
                <p style={{
                  fontFamily: SORA, fontWeight: 700,
                  fontSize: "1rem", letterSpacing: "-0.025em", color: C.text,
                }}>
                  All disc formats
                </p>
                <p style={{
                  fontFamily: SORA, fontSize: "0.8125rem",
                  color: C.textMuted, lineHeight: 1.55,
                }}>
                  DVD · CD · Blu-ray · Kodak Photo CD
                </p>
              </div>

              {/* 1×1 — Read-only safety */}
              <div
                className="bento-tile"
                style={{
                  gridArea: "2 / 3 / 3 / 4",
                  background: C.pageAlt,
                  border: `1px solid ${C.border}`,
                  borderRadius: "16px",
                  padding: "1.75rem",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: "0.75rem",
                  transition: "border-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = C.amberBorder;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = C.border;
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 12l2 2 4-4" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p style={{
                  fontFamily: SORA, fontWeight: 700,
                  fontSize: "1rem", letterSpacing: "-0.025em", color: C.text,
                }}>
                  Read-only.
                </p>
                <p style={{
                  fontFamily: SORA, fontSize: "0.8125rem",
                  color: C.textMuted, lineHeight: 1.55,
                }}>
                  Your disc is never written to. Heirvo only reads.
                </p>
              </div>

              {/* 1×1 — ~15 min */}
              <div
                className="bento-tile"
                style={{
                  gridArea: "3 / 1 / 4 / 2",
                  background: C.pageAlt,
                  border: `1px solid ${C.border}`,
                  borderRadius: "16px",
                  padding: "1.75rem",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: "0.75rem",
                  transition: "border-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = C.amberBorder;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = C.border;
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="9" stroke={C.textMuted} strokeWidth="1.4"/>
                  <path d="M12 7v5l3 3" stroke={C.textMuted} strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                <p style={{
                  fontFamily: SORA, fontWeight: 700,
                  fontSize: "1rem", letterSpacing: "-0.025em", color: C.text,
                }}>
                  ~15 min
                </p>
                <p style={{
                  fontFamily: SORA, fontSize: "0.8125rem",
                  color: C.textMuted, lineHeight: 1.55,
                }}>
                  Average scan for a single-layer DVD
                </p>
              </div>

              {/* 1×2 — Scan free */}
              <div
                className="bento-tile"
                style={{
                  gridArea: "3 / 2 / 4 / 4",
                  background: C.amberFaint,
                  border: `1px solid ${C.amberBorder}`,
                  borderRadius: "16px",
                  padding: "1.75rem",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: "0.75rem",
                  transition: "border-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = C.amber;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = C.amberBorder;
                }}
              >
                <p style={{
                  fontFamily: SORA, fontWeight: 700,
                  fontSize: "1rem", letterSpacing: "-0.025em", color: C.amber,
                }}>
                  Scan free. Always.
                </p>
                <p style={{
                  fontFamily: SORA, fontSize: "0.8125rem",
                  color: C.textMuted, lineHeight: 1.55,
                }}>
                  See every recoverable file before you pay a cent. No account required.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          RECOVERED PHOTO GRID — clip-path inset(100% → 0%) wipe reveals
          Brief: "printing up from a photo developer" — mirrors recovery metaphor.
          stagger: 0.12 across 3×3 grid = 1.08s total, deeply satisfying.
      ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="photos"
        style={{ padding: "8rem 6vw", background: C.pageAlt }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <FilmDivider label="04 — What comes back" />
          <div style={{ marginTop: "5rem" }}>
            <h2
              className="section-head"
              style={{
                fontFamily: SORA,
                fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
                fontWeight: 700,
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
                color: C.text,
                maxWidth: "24ch",
                marginBottom: "1rem",
                perspective: "600px",
              }}
            >
              Ninety-two photos. Three videos. One wedding.
            </h2>
            <p
              style={{
                fontFamily: SORA,
                fontSize: "1.0625rem",
                color: C.textMuted,
                maxWidth: "50ch",
                lineHeight: 1.65,
                marginBottom: "3.5rem",
              }}
            >
              What a real Heirvo scan returned from a scratched DVD-R sitting in
              a shoebox since 2004.
            </p>

            {/* Photo grid — clip-path wipe from bottom (inset 100%→0%) */}
            {/* Each tile represents a recovered family photo */}
            <div
              id="photo-recovery-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
              }}
            >
              {[
                { span: 2, label: "DSC_0001.jpg — Parents' wedding, 1987", tone: "rgba(200,150,80,0.15)" },
                { span: 1, label: "Photo 2", tone: "rgba(160,100,60,0.18)" },
                { span: 1, label: "Photo 3", tone: "rgba(180,130,70,0.16)" },
                { span: 1, label: "Photo 4", tone: "rgba(140,80,50,0.20)" },
                { span: 1, label: "Photo 5", tone: "rgba(210,160,90,0.13)" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="photo-wipe-card"
                  style={{
                    gridColumn: `span ${item.span}`,
                    aspectRatio: item.span === 2 ? "2 / 1" : "4 / 3",
                    borderRadius: "10px",
                    background: C.pageMid,
                    border: `1px solid ${C.border}`,
                    overflow: "hidden",
                    position: "relative",
                    willChange: "clip-path",
                  }}
                >
                  <div style={{
                    position: "absolute", inset: 0,
                    background: item.tone,
                  }} />
                  {/* Sepia film grain on each photo */}
                  <div aria-hidden style={{
                    position: "absolute", inset: 0,
                    backgroundImage: C.grain,
                    backgroundSize: "128px 128px",
                    mixBlendMode: "overlay",
                    opacity: 0.5,
                  }} />
                  <div style={{
                    position: "absolute", bottom: 8, left: 10,
                    fontFamily: MONO,
                    fontSize: "0.62rem",
                    letterSpacing: "0.1em",
                    color: "rgba(240,237,232,0.4)",
                    textTransform: "uppercase" as const,
                  }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          GIFT SECTION — amber, emotional, monetisation anchor
      ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="gift"
        style={{
          background: C.amberFaint,
          borderTop: `1px solid ${C.amberBorder}`,
          borderBottom: `1px solid ${C.amberBorder}`,
          padding: "6rem 6vw",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <SectionLabel light>The most personal gift you can give</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "4rem",
              alignItems: "center",
            }}
          >
            <div>
              <h2
                className="section-head"
                style={{
                  fontFamily: SORA,
                  fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                  color: C.text,
                  margin: "0 0 1.25rem",
                  maxWidth: "22ch",
                }}
              >
                Give someone their memories back.
              </h2>
              <p
                style={{
                  fontFamily: SORA,
                  fontSize: "1.0625rem",
                  color: C.textMuted,
                  lineHeight: 1.7,
                  maxWidth: "50ch",
                  marginBottom: "2rem",
                }}
              >
                A Heirvo recovery licence is a gift that could recover 30 years of family
                history. Buy one for a parent, a grandparent, a sibling who still has those
                old discs in a drawer — and email them the activation code.
              </p>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <a
                  href="#pricing"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.9375rem 1.875rem",
                    borderRadius: "5px",
                    background: C.amber,
                    color: C.page,
                    fontFamily: SORA,
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                    textDecoration: "none",
                    transition: "background 0.18s, transform 0.15s cubic-bezier(0.16,1,0.3,1)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = C.amberHover;
                    (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = C.amber;
                    (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
                  }}
                >
                  Gift this to Mum →
                </a>
                <a
                  href="#pricing"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.9375rem 1.5rem",
                    borderRadius: "5px",
                    background: "transparent",
                    border: `1px solid ${C.amberBorder}`,
                    color: C.amber,
                    fontFamily: SORA,
                    fontSize: "0.9375rem",
                    textDecoration: "none",
                    transition: "border-color 0.18s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = C.amber;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = C.amberBorder;
                  }}
                >
                  See pricing
                </a>
              </div>
            </div>
            <div
              className="hide-mobile"
              style={{ display: "flex", flexDirection: "column", gap: "1rem", minWidth: "200px" }}
            >
              {["Mother's Day", "Father's Day", "Birthday", "Christmas"].map((occasion) => (
                <div
                  key={occasion}
                  style={{
                    padding: "0.75rem 1.25rem",
                    borderRadius: "5px",
                    border: `1px solid ${C.amberBorder}`,
                    fontFamily: MONO,
                    fontSize: "0.75rem",
                    letterSpacing: "0.12em",
                    color: C.amber,
                    textTransform: "uppercase",
                  }}
                >
                  {occasion}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          HOW IT WORKS — 3 steps
      ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="how"
        style={{
          padding: "8rem 6vw",
          background: C.pageAlt,
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <FilmDivider label="03 — How it works" />
          <div style={{ marginTop: "5rem" }}>
            <h2
              className="section-head"
              style={{
                fontFamily: SORA,
                fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
                fontWeight: 700,
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
                color: C.text,
                maxWidth: "24ch",
                marginBottom: "4rem",
              }}
            >
              Three steps. Most recoveries complete in under an hour.
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "2px",
              }}
            >
              {[
                {
                  num: "01",
                  title: "Insert your disc",
                  body: "Any USB or internal DVD / Blu-ray drive on Windows 10 or 11. Heirvo detects the disc type automatically — DVD, CD, Blu-ray, or Kodak Photo CD.",
                },
                {
                  num: "02",
                  title: "Run the free scan",
                  body: "Heirvo reads sector by sector, making multiple error-correction passes. You see a live preview of every recoverable file before spending anything.",
                },
                {
                  num: "03",
                  title: "Save your files",
                  body: "Choose a folder. Heirvo saves everything it recovered — photos at full resolution, video files intact — exactly as they were on disc.",
                },
              ].map(({ num, title, body }) => (
                <div
                  key={num}
                  className="reveal-card"
                  style={{
                    background: C.page,
                    padding: "2.5rem 2rem",
                    borderTop: `1px solid ${C.border}`,
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <div
                    className="step-num"
                    style={{
                      fontFamily: MONO,
                      fontSize: "3.5rem",
                      fontWeight: 700,
                      color: C.border,
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                      marginBottom: "1.5rem",
                    }}
                  >
                    {num}
                  </div>
                  <h3
                    style={{
                      fontFamily: SORA,
                      fontSize: "1.125rem",
                      fontWeight: 600,
                      color: C.text,
                      marginBottom: "0.875rem",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {title}
                  </h3>
                  <p
                    style={{
                      fontFamily: SORA,
                      fontSize: "0.9375rem",
                      color: C.textMuted,
                      lineHeight: 1.7,
                    }}
                  >
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          WHAT HEIRVO RESCUES — formats
      ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="rescue"
        style={{ padding: "8rem 6vw", background: C.page }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <FilmDivider label="04 — What Heirvo rescues" />
          <div style={{ marginTop: "5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" }}>
            {[
              { label: "DVD-Video", detail: "Family recordings, home movies, photo slideshows burned to DVD" },
              { label: "CD-ROM / CD-R", detail: "Data backups, music archives, early digital photos from CD writers" },
              { label: "Blu-ray", detail: "High-definition home video, archival backups on 25–128 GB discs" },
              { label: "Kodak Photo CD", detail: "Professional Kodak scans from the 1990s, multiple resolutions per image" },
            ].map(({ label, detail }) => (
              <div
                key={label}
                className="reveal-card"
                style={{
                  background: C.pageAlt,
                  border: `1px solid ${C.border}`,
                  borderRadius: "6px",
                  padding: "1.75rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.875rem",
                    marginBottom: "1rem",
                  }}
                >
                  <DiscSVG size={32} opacity={0.5} />
                  <span
                    style={{
                      fontFamily: SORA,
                      fontWeight: 600,
                      fontSize: "0.9375rem",
                      color: C.text,
                    }}
                  >
                    {label}
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: SORA,
                    fontSize: "0.875rem",
                    color: C.textMuted,
                    lineHeight: 1.65,
                  }}
                >
                  {detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          PRICING — 3 tiers
      ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="pricing"
        style={{ padding: "8rem 6vw", background: C.pageAlt }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <FilmDivider label="05 — Pricing" />
          <div style={{ marginTop: "5rem" }}>
            <h2
              className="section-head"
              style={{
                fontFamily: SORA,
                fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
                fontWeight: 700,
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
                color: C.text,
                maxWidth: "28ch",
                marginBottom: "1rem",
              }}
            >
              Scan free. Pay only when you&apos;re sure.
            </h2>
            <p
              style={{
                fontFamily: SORA,
                fontSize: "1.0625rem",
                color: C.textMuted,
                maxWidth: "50ch",
                lineHeight: 1.65,
                marginBottom: "3.5rem",
              }}
            >
              You see every recoverable file before you spend anything.
              One-time payment, one disc, no subscription.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "1.5rem",
              }}
            >
              <PricingCard
                label="Free"
                price="$0"
                tagline="See what&apos;s recoverable before you commit."
                features={[
                  "Insert any disc",
                  "Full sector-by-sector scan",
                  "File preview — every recoverable file",
                  "Damage report",
                ]}
                cta="Download free"
                ctaHref={DOWNLOAD_URL}
              />
              <PricingCard
                label="Recover"
                price="$59"
                tagline="One disc. One-time payment. Keep your files forever."
                features={[
                  "Everything in Free",
                  "Save all recovered files",
                  "DVD, CD, Blu-ray support",
                  "60-day money-back guarantee",
                  "Lifetime licence — no subscription",
                ]}
                cta="Buy Recover"
                ctaHref="#"
                highlighted
                giftable
              />
              {/* Archivist tier — identity-based naming per brief.
                  "Name the premium tier something that flatters the buyer's self-concept."
                  "Archivist" signals the buyer is the kind of person who takes care of things
                  properly. Positioned at ~1.7× Essential ($99 vs $59). */}
              <PricingCard
                label="Archivist"
                price="$99"
                tagline="For the family keeper — the one who makes sure things survive."
                features={[
                  "Everything in Recover",
                  "Kodak Photo CD (.PCD) support",
                  "AI filename tagging by date & faces",
                  "Unlimited discs, one machine",
                  "Printed recovery certificate",
                  "60-day money-back guarantee",
                ]}
                cta="Become the Archivist"
                ctaHref="#"
                giftable
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="faq"
        style={{ padding: "8rem 6vw", background: C.page }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <FilmDivider label="06 — Common questions" />
          <div style={{ marginTop: "5rem" }}>
            <h2
              className="section-head"
              style={{
                fontFamily: SORA,
                fontSize: "clamp(1.875rem, 3vw, 2.25rem)",
                fontWeight: 700,
                letterSpacing: "-0.025em",
                lineHeight: 1.2,
                color: C.text,
                marginBottom: "3rem",
              }}
            >
              Questions worth asking before you start.
            </h2>
            <div
              style={{
                borderTop: `1px solid ${C.border}`,
              }}
            >
              {FAQS.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FINAL CTA — full bleed
      ═══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          padding: "10rem 6vw",
          background: `
            radial-gradient(ellipse 70% 60% at 50% 50%, rgba(10,132,255,0.08), transparent),
            ${C.pageAlt}
          `,
          borderTop: `1px solid ${C.border}`,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <DiscSVG size={80} opacity={0.12} />
          <div style={{ margin: "2rem 0" }}>
            <SectionLabel>Before it&apos;s too late</SectionLabel>
          </div>
          <h2
            className="section-head"
            style={{
              fontFamily: SORA,
              fontSize: "clamp(2.25rem, 5vw, 4rem)",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              lineHeight: 1.05,
              color: C.text,
              marginBottom: "1.5rem",
              textWrap: "balance",
            }}
          >
            Recover files from any damaged disc.
          </h2>
          <p
            style={{
              fontFamily: SORA,
              fontSize: "1.125rem",
              color: C.textMuted,
              lineHeight: 1.7,
              maxWidth: "44ch",
              margin: "0 auto 3rem",
            }}
          >
            The scan is free and takes under five minutes. You&apos;ll know exactly what&apos;s
            recoverable before you decide anything.
          </p>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <a
              href={DOWNLOAD_URL}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1rem 2.25rem",
                borderRadius: "5px",
                background: C.blue,
                color: C.text,
                fontFamily: SORA,
                fontSize: "1rem",
                fontWeight: 600,
                textDecoration: "none",
                transition: "background 0.18s, transform 0.15s cubic-bezier(0.16,1,0.3,1)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = C.blueHover;
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = C.blue;
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
              }}
            >
              Download Heirvo — free
            </a>
            <a
              href="#gift"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1rem 1.75rem",
                borderRadius: "5px",
                background: C.amberFaint,
                border: `1px solid ${C.amberBorder}`,
                color: C.amber,
                fontFamily: SORA,
                fontSize: "0.9375rem",
                fontWeight: 500,
                textDecoration: "none",
                transition: "background 0.18s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = `rgba(245,158,11,0.18)`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = C.amberFaint;
              }}
            >
              Gift a recovery
            </a>
          </div>
          <p
            style={{
              marginTop: "2rem",
              fontFamily: MONO,
              fontSize: "0.68rem",
              letterSpacing: "0.12em",
              color: C.textFaint,
            }}
          >
            Windows 10 / 11 · One-time payment · 60-day money-back guarantee
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
