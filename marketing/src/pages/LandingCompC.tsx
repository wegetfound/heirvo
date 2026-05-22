/*
 * COMPETITION ENTRY C — Memory Lane (Identity-First Conversion Direction)
 * Philosophy: Lead with IDENTITY before product. "You're the one who doesn't let things slip away."
 *   The page is a slow, tactile journey — it resolves hesitation rather than amplifying grief.
 *   Tone: warm technical confidence, like a craftsman handing you back something you thought was lost.
 *
 * Technique 1: Identity-first hero — "You're the one in this family..." opens BEFORE any product mention.
 *   Char-level SplitText stagger (y:30, rotateX:-40, stagger:0.025) on the headline — slow 1.4s duration.
 * Technique 2: Warm/cold palette shift — ScrollTrigger background color tweens between #0B1220 and #1A1208.
 * Technique 3: Polaroid clip-path wipe reveals — inset(100%→0%) from bottom, "printing from developer."
 * Technique 4: Staggered memory lines — single lines surface one at a time like memories being recalled.
 * Monetization 1: Real-deadline Father's Day banner — "June 21. X weeks to recover his discs." Dismissible.
 * Monetization 2: "Archivist" identity tier (not "Archive") — the buyer who does this properly self-selects.
 * Monetization 3: Gift flow CTA as first-class amber block; mail-in framed as "we handle the irreplaceable ones."
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);

const DOWNLOAD_URL: string =
  (import.meta.env.VITE_DOWNLOAD_URL as string) || "#";

// ─── Design tokens ─────────────────────────────────────────────────────────

const C = {
  page:         "#0B1220",
  pageAlt:      "#0E1628",
  pageMid:      "#111827",
  text:         "#F0EDE8",
  textMuted:    "#94A3B8",
  textFaint:    "#5E7290",
  border:       "rgba(255,255,255,0.08)",
  borderMed:    "rgba(255,255,255,0.12)",
  borderBright: "rgba(255,255,255,0.20)",
  blue:         "#0A84FF",
  blueHover:    "#3B9EFF",
  blueFaint:    "rgba(10,132,255,0.12)",
  blueBorder:   "rgba(10,132,255,0.30)",
  amber:        "#F59E0B",
  amberHover:   "#FBB03B",
  amberFaint:   "rgba(245,158,11,0.10)",
  amberBorder:  "rgba(245,158,11,0.25)",
  // Warm palette for emotional sections
  warmBg:       "#1A1208",
  warmBgMid:    "#16100A",
  sepia:        "#C8956C",
  sepiaFaint:   "rgba(200,149,108,0.12)",
  sepiaBorder:  "rgba(200,149,108,0.25)",
  sepiaText:    "#D4A882",
} as const;

const SORA    = '"Sora", ui-sans-serif, system-ui, sans-serif';
const GARAMOND = '"Cormorant Garamond", "Georgia", serif';
const MONO    = '"JetBrains Mono", "Fira Code", ui-monospace, monospace';

// Register the "album" ease — heavier, more deliberate than cinematic
// This plays before gsap-fx.ts registers its own, so no conflict
CustomEase.create("album", "M0,0 C0.16,0 0.84,1 1,1");
CustomEase.create("cinematic", "M0,0 C0.76,0 0.24,1 1,1");

// ─── Father's Day seasonal banner ──────────────────────────────────────────

// Father's Day date — update annually. Banner shows from May 26 onward.
const FATHERS_DAY_DATE  = new Date("2026-06-21T00:00:00");
const BANNER_SHOW_FROM  = new Date("2026-05-26T00:00:00");

function useFathersDayBanner(): { show: boolean; daysLeft: number } {
  const now = new Date();
  const show = now >= BANNER_SHOW_FROM && now < FATHERS_DAY_DATE;
  const msLeft = FATHERS_DAY_DATE.getTime() - now.getTime();
  const daysLeft = Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  return { show, daysLeft };
}

// ─── JSON-LD ────────────────────────────────────────────────────────────────

const SOFTWARE_SCHEMA = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Heirvo",
  "operatingSystem": "Windows 10, Windows 11",
  "applicationCategory": "UtilitiesApplication",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "description": "DVD and CD recovery software. Rescues photos and videos from scratched, damaged, or unreadable discs.",
  "url": "https://heirvo.com"
});

// ─── Styles ────────────────────────────────────────────────────────────────

const PAGE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap');

  .comp-c-page {
    background: ${C.page};
    color: ${C.text};
    font-family: ${SORA};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
  }
  .comp-c-page ::selection {
    background: ${C.sepia};
    color: ${C.warmBg};
  }
  .comp-c-page ::-webkit-scrollbar { width: 5px; }
  .comp-c-page ::-webkit-scrollbar-track { background: ${C.page}; }
  .comp-c-page ::-webkit-scrollbar-thumb { background: rgba(200,149,108,0.3); border-radius: 3px; }

  /* Section label / eyebrow */
  .eyebrow-c {
    font-family: ${MONO};
    font-size: 0.68rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: ${C.sepia};
    opacity: 0.8;
  }

  /* Display text — Cormorant Garamond italic */
  .display-c {
    font-family: ${GARAMOND};
    font-weight: 300;
    font-style: italic;
    line-height: 1.12;
    letter-spacing: -0.01em;
    text-wrap: balance;
  }

  /* Polaroid photo card */
  .polaroid {
    background: #f5f0e8;
    padding: 14px 14px 48px 14px;
    box-shadow:
      0 1px 3px rgba(0,0,0,0.18),
      0 8px 32px rgba(0,0,0,0.28),
      0 24px 64px -8px rgba(0,0,0,0.22);
    position: relative;
    clip-path: inset(0% 0% 100% 0%);
    will-change: clip-path;
    transform-origin: center bottom;
  }
  .polaroid-photo {
    width: 100%;
    aspect-ratio: 1;
    display: block;
  }
  .polaroid-caption {
    position: absolute;
    bottom: 12px;
    left: 0;
    right: 0;
    text-align: center;
    font-family: ${GARAMOND};
    font-style: italic;
    font-size: 0.85rem;
    color: #5a4a3a;
    letter-spacing: 0.03em;
  }

  /* Memory line reveal */
  .memory-line {
    overflow: hidden;
    line-height: 1.5;
  }
  .memory-line-inner {
    display: block;
    transform: translateY(100%);
    opacity: 0;
  }

  /* Disc ring */
  .disc-ring {
    border-radius: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    border: 1px solid;
    transform: translate(-50%, -50%);
    transition: opacity 1.2s ease;
  }

  /* Price card */
  .price-card-c {
    border: 1px solid ${C.border};
    border-radius: 6px;
    padding: 2rem 1.75rem;
    background: ${C.pageAlt};
    transition: border-color 0.25s ease, transform 0.25s cubic-bezier(0.16,1,0.3,1);
  }
  .price-card-c:hover {
    border-color: ${C.sepiaBorder};
    transform: translateY(-2px);
  }
  .price-card-c.featured-c {
    border-color: ${C.sepia};
    background: linear-gradient(135deg, rgba(200,149,108,0.08) 0%, ${C.pageAlt} 60%);
  }

  /* Warm section background shift (JS controls this via gsap) */
  .warm-section {
    position: relative;
  }
  .warm-section::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 30% 50%, rgba(200,149,108,0.06) 0%, transparent 70%);
    pointer-events: none;
  }

  /* 1px divider with annotation */
  .divider-c {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 0 6vw;
  }
  .divider-c::before,
  .divider-c::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${C.border};
    transform: scaleX(0);
    transform-origin: left center;
  }
  .divider-c.revealed::before,
  .divider-c.revealed::after {
    transform: scaleX(1);
    transition: transform 1.2s cubic-bezier(0.16,1,0.3,1) 0.1s;
  }
  .divider-c::after {
    transform-origin: right center;
  }

  /* CTA buttons */
  .btn-primary-c {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem 2rem;
    background: ${C.sepia};
    color: ${C.warmBg};
    font-family: ${SORA};
    font-size: 0.9rem;
    font-weight: 600;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.2s ease, transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease;
    letter-spacing: 0.01em;
  }
  .btn-primary-c:hover {
    background: #D9A97C;
    transform: translateY(-1px);
    box-shadow: 0 10px 28px -8px rgba(200,149,108,0.45);
  }
  .btn-primary-c:focus-visible {
    outline: 2px solid ${C.sepia};
    outline-offset: 2px;
  }

  .btn-ghost-c {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.875rem 1.75rem;
    background: transparent;
    color: ${C.text};
    font-family: ${SORA};
    font-size: 0.9rem;
    border-radius: 4px;
    border: 1px solid ${C.borderMed};
    cursor: pointer;
    text-decoration: none;
    transition: border-color 0.2s ease, color 0.2s ease;
    letter-spacing: 0.01em;
  }
  .btn-ghost-c:hover {
    border-color: ${C.sepiaBorder};
    color: ${C.sepiaText};
  }
  .btn-ghost-c:focus-visible {
    outline: 2px solid ${C.sepia};
    outline-offset: 2px;
  }

  /* Seasonal badge */
  .seasonal-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.85rem;
    border-radius: 999px;
    border: 1px solid ${C.amberBorder};
    background: ${C.amberFaint};
    font-family: ${MONO};
    font-size: 0.65rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: ${C.amber};
  }

  /* How it works steps */
  .step-c {
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
  }
  .step-num-c {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid ${C.sepiaBorder};
    background: ${C.sepiaFaint};
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: ${MONO};
    font-size: 0.75rem;
    color: ${C.sepia};
    letter-spacing: 0.05em;
  }
`;

// ─── Component ──────────────────────────────────────────────────────────────

export default function LandingCompC() {
  const pageRef           = useRef<HTMLDivElement>(null);
  const heroRef           = useRef<HTMLElement>(null);
  const heroIdentityRef   = useRef<HTMLParagraphElement>(null);
  const heroHeadRef       = useRef<HTMLHeadingElement>(null);
  const heroSubRef        = useRef<HTMLParagraphElement>(null);
  const heroCtaRef        = useRef<HTMLDivElement>(null);
  const wrapperRef        = useRef<HTMLDivElement>(null);

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { show: showBanner, daysLeft } = useFathersDayBanner();

  // Emotional section refs
  const emotionalSecRef   = useRef<HTMLElement>(null);
  const polaroid1Ref      = useRef<HTMLDivElement>(null);
  const polaroid2Ref      = useRef<HTMLDivElement>(null);
  const polaroid3Ref      = useRef<HTMLDivElement>(null);

  // Memory lines section
  const memorySecRef      = useRef<HTMLElement>(null);
  const memoryLinesRef    = useRef<HTMLDivElement>(null);

  // Urgency section
  const urgencySecRef     = useRef<HTMLElement>(null);
  const ringsRef          = useRef<HTMLDivElement>(null);

  // How it works
  const howSecRef         = useRef<HTMLElement>(null);

  // Gift section
  const giftSecRef        = useRef<HTMLElement>(null);

  // Pricing
  const pricingSecRef     = useRef<HTMLElement>(null);

  // Final CTA
  const finalSecRef       = useRef<HTMLElement>(null);

  // Dividers
  const div1Ref           = useRef<HTMLDivElement>(null);
  const div2Ref           = useRef<HTMLDivElement>(null);
  const div3Ref           = useRef<HTMLDivElement>(null);
  const div4Ref           = useRef<HTMLDivElement>(null);
  const div5Ref           = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // ── Hero entrance ────────────────────────────────────────────────────
      if (!reduced) {
        const tl = gsap.timeline({ delay: 0.3 });

        // Identity statement fades in first — before any product mention
        if (heroIdentityRef.current) {
          tl.from(heroIdentityRef.current, {
            opacity: 0,
            y: 14,
            duration: 0.75,
            ease: "power3.out",
          });
        }

        // Headline — char stagger with rotateX for emotional weight (brief spec)
        if (heroHeadRef.current) {
          try {
            const split = SplitText.create(heroHeadRef.current, { type: "chars,words" });
            gsap.set(split.chars, {
              opacity: 0,
              y: 30,
              rotateX: -40,
              transformOrigin: "50% 50% -20px",
              willChange: "transform, opacity",
            });
            tl.to(split.chars, {
              opacity: 1,
              y: 0,
              rotateX: 0,
              duration: 1.4,
              stagger: 0.025,
              ease: "power3.out",
              onComplete: () => gsap.set(split.chars, { willChange: "auto" }),
            }, "-=0.3");
          } catch {
            // SplitText unavailable — headline stays visible
            gsap.set(heroHeadRef.current, { opacity: 1 });
          }
        }

        if (heroSubRef.current) {
          tl.from(heroSubRef.current, {
            opacity: 0, y: 20,
            duration: 1.0, ease: "power3.out"
          }, "-=0.8");
        }
        if (heroCtaRef.current) {
          tl.from(heroCtaRef.current, {
            opacity: 0, y: 16,
            duration: 0.9, ease: "power3.out"
          }, "-=0.7");
        }
      }

      // ── Warm/cold palette shift ────────────────────────────────────────
      // Emotional section → warm
      if (emotionalSecRef.current && wrapperRef.current) {
        ScrollTrigger.create({
          trigger: emotionalSecRef.current,
          start: "top 60%",
          end: "bottom 40%",
          onEnter: () => {
            gsap.to(wrapperRef.current, {
              backgroundColor: C.warmBg,
              duration: 1.8,
              ease: "power2.inOut",
            });
          },
          onLeave: () => {
            gsap.to(wrapperRef.current, {
              backgroundColor: C.page,
              duration: 1.4,
              ease: "power2.inOut",
            });
          },
          onEnterBack: () => {
            gsap.to(wrapperRef.current, {
              backgroundColor: C.warmBg,
              duration: 1.8,
              ease: "power2.inOut",
            });
          },
          onLeaveBack: () => {
            gsap.to(wrapperRef.current, {
              backgroundColor: C.page,
              duration: 1.4,
              ease: "power2.inOut",
            });
          },
        });
      }

      // Memory section → warmest
      if (memorySecRef.current && wrapperRef.current) {
        ScrollTrigger.create({
          trigger: memorySecRef.current,
          start: "top 60%",
          end: "bottom 40%",
          onEnter: () => {
            gsap.to(wrapperRef.current, {
              backgroundColor: C.warmBgMid,
              duration: 2.0,
              ease: "power2.inOut",
            });
          },
          onLeave: () => {
            gsap.to(wrapperRef.current, {
              backgroundColor: C.page,
              duration: 1.4,
              ease: "power2.inOut",
            });
          },
          onEnterBack: () => {
            gsap.to(wrapperRef.current, {
              backgroundColor: C.warmBgMid,
              duration: 2.0,
              ease: "power2.inOut",
            });
          },
          onLeaveBack: () => {
            gsap.to(wrapperRef.current, {
              backgroundColor: C.page,
              duration: 1.4,
              ease: "power2.inOut",
            });
          },
        });
      }

      // Gift section → amber warm
      if (giftSecRef.current && wrapperRef.current) {
        ScrollTrigger.create({
          trigger: giftSecRef.current,
          start: "top 60%",
          end: "bottom 40%",
          onEnter: () => {
            gsap.to(wrapperRef.current, {
              backgroundColor: "#160E04",
              duration: 1.6,
              ease: "power2.inOut",
            });
          },
          onLeave: () => {
            gsap.to(wrapperRef.current, {
              backgroundColor: C.page,
              duration: 1.4,
              ease: "power2.inOut",
            });
          },
          onEnterBack: () => {
            gsap.to(wrapperRef.current, {
              backgroundColor: "#160E04",
              duration: 1.6,
              ease: "power2.inOut",
            });
          },
          onLeaveBack: () => {
            gsap.to(wrapperRef.current, {
              backgroundColor: C.page,
              duration: 1.4,
              ease: "power2.inOut",
            });
          },
        });
      }

      // ── Polaroid reveals ──────────────────────────────────────────────
      const polaroids = [polaroid1Ref.current, polaroid2Ref.current, polaroid3Ref.current];
      const polaroidDelays = [0, 0.22, 0.44];
      polaroids.forEach((el, i) => {
        if (!el) return;
        gsap.set(el, { clipPath: "inset(0% 0% 100% 0%)", opacity: 0, willChange: "clip-path, opacity" });
        gsap.to(el, {
          clipPath: "inset(0% 0% 0% 0%)",
          opacity: 1,
          duration: 1.6,
          delay: polaroidDelays[i],
          ease: "album",
          scrollTrigger: {
            trigger: el,
            start: "top 82%",
            once: true,
          },
          onComplete: () => gsap.set(el, { willChange: "auto" }),
        });
      });

      // ── Memory lines reveal ───────────────────────────────────────────
      if (memoryLinesRef.current) {
        const lines = memoryLinesRef.current.querySelectorAll<HTMLElement>(".memory-line-inner");
        gsap.set(lines, { y: "100%", opacity: 0 });
        ScrollTrigger.create({
          trigger: memoryLinesRef.current,
          start: "top 75%",
          once: true,
          onEnter: () => {
            gsap.to(lines, {
              y: "0%",
              opacity: 1,
              duration: 1.6,
              ease: "album",
              stagger: 0.55,
            });
          },
        });
      }

      // ── Urgency disc rings ────────────────────────────────────────────
      if (ringsRef.current) {
        const ring4 = ringsRef.current.querySelector<HTMLElement>("[data-ring='4']");
        const ring5 = ringsRef.current.querySelector<HTMLElement>("[data-ring='5']");
        if (ring4 && ring5) {
          ScrollTrigger.create({
            trigger: ringsRef.current,
            start: "top 60%",
            once: true,
            onEnter: () => {
              gsap.to([ring4, ring5], {
                opacity: 0,
                duration: 2.4,
                ease: "power2.inOut",
                stagger: 0.6,
              });
            },
          });
        }
      }

      // ── Section heading reveals ───────────────────────────────────────
      const sectionHeadings = document.querySelectorAll<HTMLElement>(".section-heading-c");
      sectionHeadings.forEach((el) => {
        if (reduced) return;
        const split = new SplitText(el, { type: "lines" });
        gsap.set(split.lines, { clipPath: "inset(0% 0% 100% 0%)", willChange: "clip-path" });
        gsap.to(split.lines, {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 1.4,
          ease: "album",
          stagger: 0.12,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
          onComplete: () => gsap.set(split.lines, { willChange: "auto" }),
        });
      });

      // ── Stagger card reveals ──────────────────────────────────────────
      ScrollTrigger.batch(".stagger-reveal-c", {
        onEnter: (batch) =>
          gsap.fromTo(batch,
            { y: 48, opacity: 0 },
            { y: 0, opacity: 1, duration: 1.0, ease: "power3.out", stagger: 0.12,
              onComplete: () => gsap.set(batch, { willChange: "auto" }) }
          ),
        start: "top 86%",
        once: true,
      });

      // ── Divider line animations ───────────────────────────────────────
      [div1Ref, div2Ref, div3Ref, div4Ref, div5Ref].forEach((ref) => {
        if (!ref.current) return;
        ScrollTrigger.create({
          trigger: ref.current,
          start: "top 90%",
          once: true,
          onEnter: () => ref.current?.classList.add("revealed"),
        });
      });

      // ── Hero Ken Burns subtle ────────────────────────────────────────
      if (heroRef.current) {
        const bg = heroRef.current.querySelector<HTMLElement>(".hero-bg-c");
        if (bg && !reduced) {
          gsap.fromTo(bg, { scale: 1.04 }, { scale: 1, duration: 4, ease: "power2.out" });
        }
      }

    }, pageRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef} className="comp-c-page">
      <style>{PAGE_STYLES}</style>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: SOFTWARE_SCHEMA }}
      />

      {/* Scroll progress bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: `linear-gradient(to right, ${C.sepia}, ${C.amber})`,
          transformOrigin: "left center",
          zIndex: 100,
          transform: "scaleX(0)",
        }}
        id="scroll-progress-c"
      />

      {/* ── Father's Day seasonal banner — real deadline, not fake timer ──── */}
      {showBanner && !bannerDismissed && (
        <div
          role="banner"
          style={{
            position: "relative",
            zIndex: 50,
            background: `linear-gradient(90deg, rgba(180,110,30,0.15) 0%, rgba(180,110,30,0.09) 100%)`,
            borderBottom: `1px solid rgba(245,158,11,0.22)`,
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 13, color: C.text, fontFamily: SORA }}>
            <span style={{ color: C.amber, fontWeight: 600 }}>
              Father's Day is June 21.
            </span>{" "}
            {daysLeft} day{daysLeft !== 1 ? "s" : ""} to recover his old discs and give them back.
          </span>
          <Link
            to="/gift"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.amber,
              textDecoration: "underline",
              textUnderlineOffset: 2,
              whiteSpace: "nowrap",
              fontFamily: SORA,
            }}
          >
            Give as a gift
          </Link>
          <button
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss Father's Day banner"
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: C.textFaint,
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>
      )}

      <Nav />

      {/* Wrapper that receives background color tweens */}
      <div ref={wrapperRef} style={{ background: C.page, transition: "none" }}>

        {/* ═══════════════════════════════════════════════════════════════
            HERO — with seasonal badge
        ══════════════════════════════════════════════════════════════════ */}
        <section
          ref={heroRef}
          style={{
            position: "relative",
            minHeight: "96vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "8rem 6vw 6rem",
            overflow: "hidden",
          }}
        >
          {/* Subtle warm radial glow — hero background accent */}
          <div
            className="hero-bg-c"
            style={{
              position: "absolute",
              inset: 0,
              background: `
                radial-gradient(ellipse at 65% 45%, rgba(200,149,108,0.07) 0%, transparent 55%),
                radial-gradient(ellipse at 20% 70%, rgba(10,132,255,0.05) 0%, transparent 50%)
              `,
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", maxWidth: "780px" }}>

            {/* Identity statement — leads BEFORE any product mention */}
            {/* 23andMe / Artifact Uprising pattern: open with who the buyer already is */}
            <p
              ref={heroIdentityRef}
              style={{
                fontFamily: MONO,
                fontSize: "0.72rem",
                fontWeight: 400,
                letterSpacing: "0.18em",
                textTransform: "uppercase" as const,
                color: C.sepia,
                marginBottom: "1.5rem",
                opacity: 0,
              }}
            >
              You're the one in this family who doesn't let things slip away.
            </p>

            {/* Seasonal badge */}
            <div style={{ marginBottom: "1.75rem" }}>
              <span className="seasonal-badge">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="5" cy="5" r="1.5" fill="currentColor" />
                </svg>
                Perfect gift · Mother's Day · Father's Day · Christmas
              </span>
            </div>

            <p className="eyebrow-c" style={{ marginBottom: "1.25rem" }}>
              01 — Disc recovery software for Windows
            </p>

            <h1
              ref={heroHeadRef}
              className="display-c"
              style={{
                fontSize: "clamp(3rem, 7vw, 6rem)",
                color: C.text,
                marginBottom: "1.75rem",
                maxWidth: "720px",
                perspective: "800px",
              }}
            >
              The photos are still there.<br />
              You just need to go get them.
            </h1>

            <p
              ref={heroSubRef}
              style={{
                fontFamily: SORA,
                fontSize: "clamp(1rem, 2vw, 1.2rem)",
                color: C.textMuted,
                maxWidth: "520px",
                lineHeight: "1.65",
                marginBottom: "2.5rem",
                textWrap: "pretty",
              }}
            >
              Heirvo rescues photos, videos, and memories from scratched DVDs,
              damaged CDs, and Kodak Photo CDs — formats the rest of the world
              has forgotten but your family still needs.
            </p>

            <div
              ref={heroCtaRef}
              style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}
            >
              <a href={DOWNLOAD_URL} className="btn-primary-c">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 2v8M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Free scan — see what's recoverable
              </a>
              <Link to="/recover" className="btn-ghost-c">
                Can't read the disc at all? Mail it in →
              </Link>
            </div>

            <p
              style={{
                fontFamily: MONO,
                fontSize: "0.68rem",
                color: C.textFaint,
                marginTop: "1.25rem",
                letterSpacing: "0.08em",
              }}
            >
              Free to scan · $59 one-time to save · Windows 10 / 11
            </p>
          </div>

          {/* Decorative disc silhouette */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              right: "6vw",
              top: "50%",
              transform: "translateY(-50%)",
              width: "min(380px, 38vw)",
              height: "min(380px, 38vw)",
              opacity: 0.06,
              borderRadius: "50%",
              border: `1px solid ${C.sepia}`,
              boxShadow: `0 0 0 20px rgba(200,149,108,0.04), 0 0 0 40px rgba(200,149,108,0.03), 0 0 0 70px rgba(200,149,108,0.02)`,
              pointerEvents: "none",
            }}
          />
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            DIVIDER 1
        ══════════════════════════════════════════════════════════════════ */}
        <div ref={div1Ref} className="divider-c" style={{ margin: "0" }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: "0.62rem",
              color: C.textFaint,
              letterSpacing: "0.15em",
              whiteSpace: "nowrap",
            }}
          >
            DVD · CD · Blu-ray · Kodak Photo CD
          </span>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            MEMORY LINES — the emotional hook
        ══════════════════════════════════════════════════════════════════ */}
        <section
          ref={memorySecRef}
          className="warm-section"
          style={{
            padding: "8rem 6vw",
            maxWidth: "860px",
            margin: "0 auto",
          }}
        >
          <p className="eyebrow-c" style={{ marginBottom: "2.5rem" }}>
            02 — What's on the disc
          </p>

          <div ref={memoryLinesRef} style={{ marginBottom: "4rem" }}>
            {[
              "Her voice at the birthday party.",
              "The way he laughed that Christmas.",
              "The last video before he moved away.",
              "Her face before the illness changed everything.",
              "Your parents, young and unguarded, dancing.",
            ].map((line, i) => (
              <div key={i} className="memory-line" style={{ marginBottom: i < 4 ? "0.85rem" : 0 }}>
                <span
                  className="memory-line-inner display-c"
                  style={{
                    fontSize: "clamp(1.5rem, 3.2vw, 2.5rem)",
                    color: i < 3 ? C.text : C.textMuted,
                    opacity: 1,
                  }}
                >
                  {line}
                </span>
              </div>
            ))}
          </div>

          <p
            style={{
              fontFamily: SORA,
              fontSize: "1.05rem",
              color: C.textMuted,
              lineHeight: "1.7",
              maxWidth: "540px",
              textWrap: "pretty",
            }}
          >
            The voice on that disc may be the last recording you have.
            Not a backup. Not a copy. The original.
          </p>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            DIVIDER 2
        ══════════════════════════════════════════════════════════════════ */}
        <div ref={div2Ref} className="divider-c">
          <span
            style={{
              fontFamily: MONO,
              fontSize: "0.62rem",
              color: C.textFaint,
              letterSpacing: "0.15em",
              whiteSpace: "nowrap",
            }}
          >
            recovered memories
          </span>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            POLAROID SECTION — emotional / warm
        ══════════════════════════════════════════════════════════════════ */}
        <section
          ref={emotionalSecRef}
          className="warm-section"
          style={{
            padding: "8rem 6vw",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6vw",
              alignItems: "center",
              maxWidth: "1100px",
              margin: "0 auto",
            }}
          >
            {/* Left: copy */}
            <div>
              <p className="eyebrow-c" style={{ marginBottom: "1.25rem" }}>
                03 — Recovered memories
              </p>
              <h2
                className="display-c section-heading-c"
                style={{
                  fontSize: "clamp(2rem, 4vw, 3.4rem)",
                  color: C.text,
                  marginBottom: "1.5rem",
                }}
              >
                Every recovered disc is a story that almost didn't get told.
              </h2>
              <p
                style={{
                  fontSize: "1rem",
                  color: C.textMuted,
                  lineHeight: "1.7",
                  maxWidth: "440px",
                  marginBottom: "1.5rem",
                  textWrap: "pretty",
                }}
              >
                Heirvo makes multiple passes over every damaged sector — reading
                forward and backward, at slower speeds, in ways a standard disc
                copy never attempts. Files that other software declares lost,
                Heirvo finds.
              </p>
              <p
                style={{
                  fontSize: "0.9rem",
                  color: C.sepiaText,
                  lineHeight: "1.6",
                  fontStyle: "italic",
                  fontFamily: GARAMOND,
                  maxWidth: "380px",
                }}
              >
                "You're the one in the family who will actually do this.
                That's not nothing."
              </p>

              {/* Physical keepsake tease */}
              <p
                style={{
                  marginTop: "2rem",
                  fontSize: "0.78rem",
                  color: C.textFaint,
                  fontFamily: MONO,
                  letterSpacing: "0.08em",
                }}
              >
                Coming soon: order a printed photo book from your recovered memories.
              </p>
            </div>

            {/* Right: polaroids */}
            <div
              style={{
                position: "relative",
                height: "420px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Polaroid 1 — 1997 Family vacation */}
              <div
                ref={polaroid1Ref}
                className="polaroid"
                style={{
                  position: "absolute",
                  width: "180px",
                  top: "20px",
                  left: "10px",
                  transform: "rotate(-4deg)",
                  zIndex: 1,
                }}
              >
                <div
                  className="polaroid-photo"
                  style={{
                    background: `linear-gradient(135deg, #8B7355 0%, #C4A882 40%, #7A9BAA 100%)`,
                  }}
                  aria-label="Recovered photo from 1997"
                />
                <span className="polaroid-caption">1997 · Family vacation</span>
              </div>

              {/* Polaroid 2 — 2003 Wedding */}
              <div
                ref={polaroid2Ref}
                className="polaroid"
                style={{
                  position: "absolute",
                  width: "200px",
                  top: "60px",
                  left: "120px",
                  transform: "rotate(1.5deg)",
                  zIndex: 3,
                }}
              >
                <div
                  className="polaroid-photo"
                  style={{
                    background: `linear-gradient(160deg, #D4B896 0%, #E8C9A0 35%, #C4956C 100%)`,
                  }}
                  aria-label="Recovered photo from 2003 wedding"
                />
                <span className="polaroid-caption">2003 · Wedding day</span>
              </div>

              {/* Polaroid 3 — 1993 Kodak Photo CD */}
              <div
                ref={polaroid3Ref}
                className="polaroid"
                style={{
                  position: "absolute",
                  width: "165px",
                  bottom: "10px",
                  right: "10px",
                  transform: "rotate(3.5deg)",
                  zIndex: 2,
                }}
              >
                <div
                  className="polaroid-photo"
                  style={{
                    background: `linear-gradient(120deg, #6B8B6B 0%, #9BAA7A 50%, #8B9B5A 100%)`,
                    filter: "sepia(0.4)",
                  }}
                  aria-label="Recovered Kodak Photo CD image from 1993"
                />
                <span className="polaroid-caption">1993 · Kodak Photo CD</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            DIVIDER 3
        ══════════════════════════════════════════════════════════════════ */}
        <div ref={div3Ref} className="divider-c">
          <span
            style={{
              fontFamily: MONO,
              fontSize: "0.62rem",
              color: C.textFaint,
              letterSpacing: "0.15em",
              whiteSpace: "nowrap",
            }}
          >
            disc degradation
          </span>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            URGENCY — The Clock Is Ticking
        ══════════════════════════════════════════════════════════════════ */}
        <section
          ref={urgencySecRef}
          style={{
            padding: "8rem 6vw",
            maxWidth: "1100px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6vw",
              alignItems: "center",
            }}
          >
            {/* Left: disc rings */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                ref={ringsRef}
                style={{
                  position: "relative",
                  width: "280px",
                  height: "280px",
                  flexShrink: 0,
                }}
                aria-label="Diagram showing disc degradation over time — outer rings fade, representing permanent data loss"
              >
                {/* Rings 1–5 from inner to outer, 4 and 5 will fade */}
                {[
                  { size: 60,  color: C.sepia,      opacity: 0.9, ring: "1" },
                  { size: 108, color: C.sepia,      opacity: 0.75, ring: "2" },
                  { size: 158, color: C.textMuted,  opacity: 0.55, ring: "3" },
                  { size: 208, color: C.textFaint,  opacity: 0.4,  ring: "4" },
                  { size: 258, color: C.textFaint,  opacity: 0.22, ring: "5" },
                ].map(({ size, color, opacity, ring }) => (
                  <div
                    key={ring}
                    data-ring={ring}
                    className="disc-ring"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      borderColor: color,
                      opacity,
                    }}
                  />
                ))}

                {/* Center hole */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    border: `1px solid rgba(200,149,108,0.5)`,
                    background: C.page,
                  }}
                />

                {/* Label: "Data lost" for outer rings */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "-2.5rem",
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontFamily: MONO,
                    fontSize: "0.65rem",
                    color: C.textFaint,
                    letterSpacing: "0.1em",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                  }}
                >
                  outer rings → permanently unreadable
                </div>
              </div>
            </div>

            {/* Right: copy */}
            <div>
              <p className="eyebrow-c" style={{ marginBottom: "1.25rem" }}>
                04 — The clock is ticking
              </p>
              <h2
                className="display-c section-heading-c"
                style={{
                  fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
                  color: C.text,
                  marginBottom: "1.5rem",
                }}
              >
                Optical disc dye breaks down. Every year you wait, some sectors become permanently unreadable.
              </h2>
              <p
                style={{
                  fontSize: "1rem",
                  color: C.textMuted,
                  lineHeight: "1.7",
                  marginBottom: "1rem",
                  textWrap: "pretty",
                }}
              >
                This isn't marketing. It's physics. The outer data tracks on a recordable disc are the
                first to go — and they often contain the end of a video, the last photos on a roll.
              </p>
              <p
                style={{
                  fontSize: "0.95rem",
                  color: C.textMuted,
                  lineHeight: "1.7",
                  marginBottom: "2rem",
                  textWrap: "pretty",
                }}
              >
                Pressed discs (commercial DVDs, audio CDs) last longer — but recordable media
                (DVD-R, CD-R) can start degrading in as little as 10 years under normal storage.
                Most of the discs people bring to us are 15–25 years old.
              </p>
              <a href={DOWNLOAD_URL} className="btn-primary-c">
                Scan the disc now — it's free
              </a>
              <p
                style={{
                  marginTop: "1rem",
                  fontFamily: MONO,
                  fontSize: "0.65rem",
                  color: C.textFaint,
                  letterSpacing: "0.08em",
                }}
              >
                You'll never regret checking. You might regret not checking.
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            DIVIDER 4
        ══════════════════════════════════════════════════════════════════ */}
        <div ref={div4Ref} className="divider-c">
          <span
            style={{
              fontFamily: MONO,
              fontSize: "0.62rem",
              color: C.textFaint,
              letterSpacing: "0.15em",
              whiteSpace: "nowrap",
            }}
          >
            how it works
          </span>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            HOW IT WORKS — 3 steps
        ══════════════════════════════════════════════════════════════════ */}
        <section
          ref={howSecRef}
          style={{ padding: "8rem 6vw", maxWidth: "1100px", margin: "0 auto" }}
        >
          <div style={{ maxWidth: "680px", marginBottom: "4rem" }}>
            <p className="eyebrow-c" style={{ marginBottom: "1.25rem" }}>
              05 — Simple process
            </p>
            <h2
              className="display-c section-heading-c"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.2rem)",
                color: C.text,
                marginBottom: "1rem",
              }}
            >
              Three steps. One afternoon. A lifetime of memories back.
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "2.5rem",
            }}
          >
            {[
              {
                num: "01",
                title: "Insert the disc",
                body: "Connect any USB or internal disc drive to your Windows PC. Heirvo detects the disc type automatically — DVD, CD, Blu-ray, or Kodak Photo CD. No configuration needed.",
              },
              {
                num: "02",
                title: "Run the free scan",
                body: "Heirvo reads every sector multiple times, at varying speeds, forward and backward. The scan is completely free. You see every recoverable file before spending anything.",
              },
              {
                num: "03",
                title: "Save what was found",
                body: "One-time $59 unlocks everything recovered. Save files individually, extract as an ISO, or let Heirvo auto-convert video to MP4. No subscription. No account required.",
              },
            ].map((step) => (
              <div key={step.num} className="step-c stagger-reveal-c">
                <div className="step-num-c" aria-hidden="true">
                  {step.num}
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: SORA,
                      fontSize: "1.05rem",
                      fontWeight: 500,
                      color: C.text,
                      marginBottom: "0.65rem",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      color: C.textMuted,
                      lineHeight: "1.65",
                      textWrap: "pretty",
                    }}
                  >
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            GIFT SECTION — amber warm, first-class CTA
        ══════════════════════════════════════════════════════════════════ */}
        <section
          ref={giftSecRef}
          className="warm-section"
          style={{
            padding: "8rem 6vw",
            borderTop: `1px solid ${C.amberBorder}`,
            borderBottom: `1px solid ${C.amberBorder}`,
            background: `linear-gradient(135deg, rgba(245,158,11,0.06) 0%, transparent 50%)`,
          }}
        >
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "4rem",
                alignItems: "center",
              }}
            >
              <div>
                <p
                  className="eyebrow-c"
                  style={{ marginBottom: "1.25rem", color: C.amber, opacity: 1 }}
                >
                  06 — The most personal gift
                </p>
                <h2
                  className="display-c section-heading-c"
                  style={{
                    fontSize: "clamp(2rem, 4vw, 3.4rem)",
                    color: C.text,
                    marginBottom: "1.25rem",
                  }}
                >
                  The most personal gift isn't bought — it's rescued.
                </h2>
                <p
                  style={{
                    fontSize: "1rem",
                    color: C.textMuted,
                    lineHeight: "1.7",
                    maxWidth: "520px",
                    marginBottom: "2rem",
                    textWrap: "pretty",
                  }}
                >
                  Recovering your parents' wedding video — or the home movies
                  from when your children were small — is the kind of gift that
                  doesn't have a price tag. It has a story.
                </p>

                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <Link
                    to="/gift"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      padding: "0.875rem 1.75rem",
                      background: C.amber,
                      color: "#1A0F00",
                      fontFamily: SORA,
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      borderRadius: "4px",
                      textDecoration: "none",
                      transition: "background 0.2s ease, transform 0.2s cubic-bezier(0.16,1,0.3,1)",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = C.amberHover;
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = C.amber;
                      (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <rect x="1" y="5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M5.5 5C5.5 3.619 6.619 2.5 8 2.5s2.5 1.119 2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      <path d="M8 5v9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    Doing this as a gift? See the gift guide
                  </Link>
                  <a href={DOWNLOAD_URL} className="btn-ghost-c">
                    Start with a free scan
                  </a>
                </div>
              </div>

              {/* Gift visual — decorative */}
              <div
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  border: `1px solid ${C.amberBorder}`,
                  background: C.amberFaint,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: C.amber,
                  opacity: 0.7,
                }}
              >
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect x="4" y="18" width="40" height="26" rx="3" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M14 18C14 12.477 18.477 8 24 8s10 4.477 10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M24 18v26" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M4 26h40" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            DIVIDER 5
        ══════════════════════════════════════════════════════════════════ */}
        <div ref={div5Ref} className="divider-c">
          <span
            style={{
              fontFamily: MONO,
              fontSize: "0.62rem",
              color: C.textFaint,
              letterSpacing: "0.15em",
              whiteSpace: "nowrap",
            }}
          >
            choose what works for you
          </span>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            PRICING — 3 tiers
        ══════════════════════════════════════════════════════════════════ */}
        <section
          ref={pricingSecRef}
          style={{ padding: "8rem 6vw", maxWidth: "1100px", margin: "0 auto" }}
        >
          <div style={{ maxWidth: "600px", marginBottom: "4rem" }}>
            <p className="eyebrow-c" style={{ marginBottom: "1.25rem" }}>
              07 — Pricing
            </p>
            <h2
              className="display-c section-heading-c"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.2rem)",
                color: C.text,
                marginBottom: "1rem",
              }}
            >
              Pay once. Keep everything.
            </h2>
            <p style={{ fontSize: "0.95rem", color: C.textMuted, lineHeight: "1.65" }}>
              No subscription. No account required. The free scan always comes first.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {/* Recover */}
            <div className="price-card-c stagger-reveal-c">
              <p className="eyebrow-c" style={{ marginBottom: "1rem", fontSize: "0.65rem" }}>
                Recover
              </p>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: "2.2rem",
                  fontWeight: 400,
                  color: C.text,
                  marginBottom: "0.25rem",
                  letterSpacing: "-0.02em",
                }}
              >
                $59
              </div>
              <p style={{ fontSize: "0.8rem", color: C.textFaint, marginBottom: "1.5rem" }}>
                one-time · per disc
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem 0" }}>
                {[
                  "Recover files from one disc",
                  "All formats: DVD, CD, Blu-ray",
                  "JPEG + TIFF from Kodak Photo CDs",
                  "Sector-by-sector deep scan",
                  "Auto MP4 conversion for video",
                ].map((f) => (
                  <li
                    key={f}
                    style={{
                      fontSize: "0.875rem",
                      color: C.textMuted,
                      padding: "0.4rem 0",
                      borderBottom: `1px solid ${C.border}`,
                      display: "flex",
                      gap: "0.6rem",
                      alignItems: "flex-start",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: "2px", color: C.sepia }}>
                      <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href={DOWNLOAD_URL} className="btn-ghost-c" style={{ width: "100%", justifyContent: "center" }}>
                Start with free scan
              </a>
            </div>

            {/* Archivist — identity tier. Name flatters self-concept: "the one who does this properly" */}
            <div className="price-card-c featured-c stagger-reveal-c">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "1rem",
                }}
              >
                <p className="eyebrow-c" style={{ fontSize: "0.65rem" }}>
                  Archivist
                </p>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: "0.6rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: C.amber,
                    border: `1px solid rgba(245,158,11,0.25)`,
                    padding: "0.2rem 0.5rem",
                    borderRadius: "999px",
                    background: "rgba(245,158,11,0.07)",
                  }}
                >
                  Most complete
                </span>
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: "2.2rem",
                  fontWeight: 400,
                  color: C.text,
                  marginBottom: "0.25rem",
                  letterSpacing: "-0.02em",
                }}
              >
                $99
              </div>
              <p style={{ fontSize: "0.8rem", color: C.textFaint, marginBottom: "1.5rem" }}>
                one-time · for the one who does this properly
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem 0" }}>
                {[
                  "Everything in Recover",
                  "Kodak Photo CD (.PCD) support",
                  "AI filename tagging by date + faces",
                  "Full ISO archive image",
                  "Automatic folder organisation",
                  "Metadata preservation (EXIF dates)",
                ].map((f) => (
                  <li
                    key={f}
                    style={{
                      fontSize: "0.875rem",
                      color: C.textMuted,
                      padding: "0.4rem 0",
                      borderBottom: `1px solid ${C.border}`,
                      display: "flex",
                      gap: "0.6rem",
                      alignItems: "flex-start",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: "2px", color: C.sepia }}>
                      <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href={DOWNLOAD_URL} className="btn-primary-c" style={{ width: "100%", justifyContent: "center" }}>
                Recover my family's photos
              </a>
            </div>

            {/* Mail-in — premium emotional */}
            <div className="price-card-c stagger-reveal-c">
              <p className="eyebrow-c" style={{ marginBottom: "1rem", fontSize: "0.65rem" }}>
                Mail-in service
              </p>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: "2.2rem",
                  fontWeight: 400,
                  color: C.text,
                  marginBottom: "0.25rem",
                  letterSpacing: "-0.02em",
                }}
              >
                $89+
              </div>
              <p style={{ fontSize: "0.8rem", color: C.textFaint, marginBottom: "1.5rem" }}>
                per disc · no recovery = no charge
              </p>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: C.sepiaText,
                  fontFamily: GARAMOND,
                  fontStyle: "italic",
                  lineHeight: "1.6",
                  marginBottom: "1.5rem",
                }}
              >
                "We handle the irreplaceable ones."
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem 0" }}>
                {[
                  "No disc drive required",
                  "Professional optical equipment",
                  "Handles physically damaged discs",
                  "Results in 10–14 days",
                  "Files via secure cloud link",
                ].map((f) => (
                  <li
                    key={f}
                    style={{
                      fontSize: "0.875rem",
                      color: C.textMuted,
                      padding: "0.4rem 0",
                      borderBottom: `1px solid ${C.border}`,
                      display: "flex",
                      gap: "0.6rem",
                      alignItems: "flex-start",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: "2px", color: C.amber }}>
                      <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/recover" className="btn-ghost-c" style={{ width: "100%", justifyContent: "center" }}>
                Learn about mail-in →
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            FINAL CTA — regret avoidance
        ══════════════════════════════════════════════════════════════════ */}
        <section
          ref={finalSecRef}
          style={{
            padding: "10rem 6vw",
            textAlign: "center",
            borderTop: `1px solid ${C.border}`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Warm radial glow */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(ellipse at 50% 60%, rgba(200,149,108,0.08) 0%, transparent 65%)`,
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", maxWidth: "620px", margin: "0 auto" }}>
            <p className="eyebrow-c" style={{ marginBottom: "1.75rem", display: "block" }}>
              08 — Begin
            </p>
            <h2
              className="display-c section-heading-c"
              style={{
                fontSize: "clamp(2.2rem, 5vw, 4rem)",
                color: C.text,
                marginBottom: "1.5rem",
              }}
            >
              You'll never regret checking. You might regret not checking.
            </h2>
            <p
              style={{
                fontSize: "1rem",
                color: C.textMuted,
                lineHeight: "1.7",
                marginBottom: "3rem",
                maxWidth: "480px",
                margin: "0 auto 3rem",
                textWrap: "pretty",
              }}
            >
              The scan is free. There is no risk. Five minutes from now you'll
              know exactly what's on that disc — and whether it's too late.
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <a href={DOWNLOAD_URL} className="btn-primary-c" style={{ fontSize: "1rem", padding: "1rem 2.5rem" }}>
                Download Heirvo — free scan
              </a>
              <Link to="/recover" className="btn-ghost-c" style={{ fontSize: "1rem" }}>
                Mail-in service →
              </Link>
            </div>
            <p
              style={{
                marginTop: "2rem",
                fontFamily: MONO,
                fontSize: "0.68rem",
                color: C.textFaint,
                letterSpacing: "0.1em",
              }}
            >
              Windows 10 / 11 · 64-bit · No account required · No subscription
            </p>
          </div>
        </section>

      </div>{/* end wrapperRef */}

      <Footer />
    </div>
  );
}
