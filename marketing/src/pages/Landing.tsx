/*
 * LANDING MERGE — Best-of-three synthesis
 * Foundation: Comp C (Memory Lane) — identity-first, warm/cold palette, emotional narrative
 * Hero right column: Comp B (Precision Interface) — animated product scan demo
 * Proof section: Comp A (Cinematic Archive) — asymmetric bento grid + clip-path photo wipes
 *
 * Merge plan (from session handoff):
 * 1. C's identity opener + warm palette shift throughout
 * 2. B's animated scan demo in hero right column
 * 3. C's memory lines + polaroid section (emotional narrative)
 * 4. A's asymmetric bento grid for proof/stats
 * 5. A's clip-path photo wipe tiles ("printing up" recovery metaphor)
 * 6. C's "Clock Is Ticking" disc degradation urgency section
 * 7. Archivist tier naming ($99, identity purchase)
 * 8. C's closing line — "You'll never regret checking."
 * 9. Father's Day countdown banner (C)
 * DROPPED: A's horizontal pinned narrative (too complex for 45-55yo audience)
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import Concept2_Resurfacing from "../components/hero-concepts/Concept2_Resurfacing";

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);

CustomEase.create("album", "M0,0 C0.16,0 0.84,1 1,1");
CustomEase.create("cinematic", "M0,0 C0.76,0 0.24,1 1,1");

const DOWNLOAD_URL: string = (import.meta.env.VITE_DOWNLOAD_URL as string) || "#";
const RECOVER_URL: string = (import.meta.env.VITE_LS_CHECKOUT_URL as string) || "#";
const ARCHIVE_URL: string = (import.meta.env.VITE_LS_ARCHIVE_URL as string) || "#";
const FAMILY_URL: string  = (import.meta.env.VITE_LS_FAMILY_URL as string)  || "#";

// ─── Design tokens ────────────────────────────────────────────────────────────
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
  // Warm palette for emotional sections (from C)
  warmBg:       "#1A1208",
  warmBgMid:    "#16100A",
  sepia:        "#C8956C",
  sepiaFaint:   "rgba(200,149,108,0.12)",
  sepiaBorder:  "rgba(200,149,108,0.25)",
  sepiaText:    "#D4A882",
  // Grain overlay
  grain: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.10'/%3E%3C/svg%3E\")",
} as const;

const SORA     = '"Sora", ui-sans-serif, system-ui, sans-serif';
const GARAMOND = '"Cormorant Garamond", "Georgia", serif';
const MONO     = '"JetBrains Mono", "Fira Code", ui-monospace, monospace';

// ─── Terminal log lines for product demo (from B) ────────────────────────────
// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "Which disc formats does Heirvo support?",
    a: "Heirvo recovers files from DVDs, CDs, Blu-rays, and Kodak Photo CDs. It handles scratched, cracked, and oxidised discs — including discs that Windows Explorer refuses to open.",
  },
  {
    q: "How many passes does Heirvo attempt on a damaged sector?",
    a: "Up to 9 passes per damaged sector, with adaptive read-speed throttling between attempts. Most recovery tools stop at 1–3 passes. Heirvo treats every sector as recoverable until proven otherwise.",
  },
  {
    q: "Does Heirvo upload my files to a server?",
    a: "Zero bytes leave your machine. All processing is local — the scanner, the decoder, the output. No account required for scanning. Your family photos are yours.",
  },
  {
    q: "What happens if only some files are recoverable?",
    a: "Heirvo shows you a preview of every file it can read before you pay anything. You see exactly what you're getting. If the disc is too far gone, you owe nothing.",
  },
  {
    q: "What's the difference between Recover ($59) and Archivist ($99)?",
    a: "Recover unlocks saving for one disc. Archivist is for the person who wants to do this properly: unlimited disc scans, Kodak Photo CD full-resolution export, AI filename tagging, and a printed recovery certificate. The kind of person who gets Archivist doesn't do things halfway.",
  },
];

// ─── JSON-LD ─────────────────────────────────────────────────────────────────
const SOFTWARE_SCHEMA = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Heirvo",
  "operatingSystem": "Windows 10, Windows 11",
  "applicationCategory": "UtilitiesApplication",
  "image": "https://heirvo.com/assets/hero.png",
  "offers": [
    { "@type": "Offer", "price": "0",  "priceCurrency": "USD", "name": "Free scan" },
    { "@type": "Offer", "price": "59", "priceCurrency": "USD", "name": "Recover" },
    { "@type": "Offer", "price": "99", "priceCurrency": "USD", "name": "Archive" },
    { "@type": "Offer", "price": "149", "priceCurrency": "USD", "name": "Family" },
  ],
  "description": "DVD and CD recovery software. Rescues photos and videos from scratched, damaged, or unreadable discs. Includes personal media vault, Whisper transcription, and family memory archive.",
  "url": "https://heirvo.com",
});

// ─── Page styles ──────────────────────────────────────────────────────────────
const PAGE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap');

  .lm-page {
    background: ${C.page};
    color: ${C.text};
    font-family: ${SORA};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
  }
  .lm-page ::selection { background: ${C.sepia}; color: ${C.warmBg}; }
  .lm-page ::-webkit-scrollbar { width: 5px; }
  .lm-page ::-webkit-scrollbar-track { background: ${C.page}; }
  .lm-page ::-webkit-scrollbar-thumb { background: rgba(200,149,108,0.3); border-radius: 3px; }

  /* Typography */
  .eyebrow-lm {
    font-family: ${MONO};
    font-size: 0.68rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: ${C.sepia};
    opacity: 0.8;
  }
  .display-lm {
    font-family: ${GARAMOND};
    font-weight: 300;
    font-style: italic;
    line-height: 1.12;
    letter-spacing: -0.01em;
    text-wrap: balance;
  }

  /* Polaroid card (from C) */
  .polaroid-lm {
    background: #f5f0e8;
    padding: 14px 14px 48px 14px;
    box-shadow:
      0 1px 3px rgba(0,0,0,0.18),
      0 8px 32px rgba(0,0,0,0.28),
      0 24px 64px -8px rgba(0,0,0,0.22);
    position: relative;
    clip-path: inset(0% 0% 100% 0%);
    will-change: clip-path;
  }
  .polaroid-caption-lm {
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

  /* Memory line reveal (from C) */
  .memory-line-lm {
    overflow: hidden;
    line-height: 1.5;
  }
  .memory-line-inner-lm {
    display: block;
    transform: translateY(100%);
    opacity: 0;
  }

  /* Disc ring (from C) */
  .disc-ring-lm {
    border-radius: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    border: 1px solid;
    transform: translate(-50%, -50%);
    transition: opacity 1.2s ease;
  }

  /* Warm section radial glow */
  .warm-section-lm {
    position: relative;
  }
  .warm-section-lm::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 30% 50%, rgba(200,149,108,0.06) 0%, transparent 70%);
    pointer-events: none;
  }

  /* Animated divider (from C) */
  .divider-lm {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 0 6vw;
  }
  .divider-lm::before, .divider-lm::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${C.border};
    transform: scaleX(0);
    transform-origin: left center;
  }
  .divider-lm::after { transform-origin: right center; }
  .divider-lm.revealed::before, .divider-lm.revealed::after {
    transform: scaleX(1);
    transition: transform 1.2s cubic-bezier(0.16,1,0.3,1) 0.1s;
  }

  /* Bento grid (from A) */
  .bento-tile-lm {
    transition: border-color 0.2s ease;
  }
  .bento-tile-lm:hover { border-color: ${C.amberBorder} !important; }

  /* Pricing card */
  .price-card-lm {
    border: 1px solid ${C.border};
    border-radius: 6px;
    padding: 2rem 1.75rem;
    background: ${C.pageAlt};
    transition: border-color 0.25s ease, transform 0.25s cubic-bezier(0.16,1,0.3,1);
  }
  .price-card-lm:hover { border-color: ${C.sepiaBorder}; transform: translateY(-2px); }
  .price-card-lm.featured-lm {
    border-color: ${C.sepia};
    background: linear-gradient(135deg, rgba(200,149,108,0.08) 0%, ${C.pageAlt} 60%);
  }

  /* Step layout (from C) */
  .step-lm { display: flex; gap: 1.5rem; align-items: flex-start; }
  .step-num-lm {
    flex-shrink: 0;
    width: 36px; height: 36px;
    border-radius: 50%;
    border: 1px solid ${C.sepiaBorder};
    background: ${C.sepiaFaint};
    display: flex; align-items: center; justify-content: center;
    font-family: ${MONO};
    font-size: 0.75rem;
    color: ${C.sepia};
    letter-spacing: 0.05em;
  }

  /* CTA buttons */
  .btn-primary-lm {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
    padding: 0.9375rem 2rem;
    background: ${C.blue}; color: ${C.text};
    font-family: ${SORA}; font-size: 1rem; font-weight: 600;
    border-radius: 5px; border: none; cursor: pointer;
    text-decoration: none;
    transition: background 0.18s, transform 0.18s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s ease;
    letter-spacing: 0.005em;
  }
  .btn-primary-lm:hover {
    background: ${C.blueHover};
    transform: translateY(-1px);
    box-shadow: 0 10px 28px -8px rgba(10,132,255,0.45);
  }
  .btn-amber-lm {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.9375rem 1.75rem;
    background: ${C.amber}; color: #1A0F00;
    font-family: ${SORA}; font-size: 0.9375rem; font-weight: 700;
    border-radius: 5px; border: none; cursor: pointer;
    text-decoration: none;
    transition: background 0.2s ease, transform 0.2s cubic-bezier(0.16,1,0.3,1);
  }
  .btn-amber-lm:hover { background: ${C.amberHover}; transform: translateY(-1px); }
  .btn-ghost-lm {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.9375rem 1.75rem;
    background: transparent; color: ${C.text};
    font-family: ${SORA}; font-size: 0.9rem;
    border-radius: 5px; border: 1px solid ${C.borderMed};
    cursor: pointer; text-decoration: none;
    transition: border-color 0.2s ease, color 0.2s ease;
  }
  .btn-ghost-lm:hover { border-color: ${C.sepiaBorder}; color: ${C.sepiaText}; }

  /* Product window (from B) */
  .lm-window {
    background: #0d1526;
    border: 1px solid ${C.borderMed};
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 24px 64px -16px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04);
  }
  .lm-window-bar {
    display: flex; align-items: center; gap: 6px;
    padding: 10px 14px;
    border-bottom: 1px solid ${C.border};
    background: #0a1120;
  }
  .lm-dot { width: 10px; height: 10px; border-radius: 50%; }
  .lm-log-line { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .lm-scan-cta {
    background: linear-gradient(135deg, rgba(10,132,255,0.15), rgba(10,132,255,0.05));
    border: 1px solid ${C.blueBorder};
    border-radius: 8px; padding: 16px 20px; margin-top: 12px;
    opacity: 0; transform: translateY(8px);
    transition: opacity 400ms ease, transform 400ms cubic-bezier(0.16,1,0.3,1);
  }
  .lm-scan-cta.visible { opacity: 1; transform: translateY(0); }

  @keyframes lm-ambient-spin {
    from { transform: translate(-50%,-50%) rotate(0deg); }
    to   { transform: translate(-50%,-50%) rotate(360deg); }
  }
  .lm-ambient-beam { animation: lm-ambient-spin 7s linear infinite; }

  /* FAQ item */
  .faq-item-lm { border-bottom: 1px solid ${C.border}; overflow: hidden; }
  .faq-btn-lm {
    width: 100%; background: none; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 0; font-family: ${SORA}; font-size: 1rem; font-weight: 500;
    color: ${C.text}; text-align: left; gap: 16px;
    transition: color 150ms ease;
  }
  .faq-btn-lm:hover { color: #fff; }

  /* Seasonal badge */
  .seasonal-badge-lm {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.35rem 0.85rem;
    border-radius: 999px; border: 1px solid ${C.amberBorder};
    background: ${C.amberFaint};
    font-family: ${MONO}; font-size: 0.65rem; letter-spacing: 0.12em;
    text-transform: uppercase; color: ${C.amber};
  }

  @media (max-width: 768px) {
    .hide-mobile-lm { display: none !important; }
    .mobile-stack-lm { grid-template-columns: 1fr !important; }
  }
  @media (prefers-reduced-motion: reduce) {
    .lm-ambient-beam { animation: none !important; }
  }
`;


// ─── FAQ item ─────────────────────────────────────────────────────────────────
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = answerRef.current;
    if (!el) return;
    if (open) {
      gsap.to(el, { height: "auto", opacity: 1, duration: 0.38, ease: "power2.inOut" });
    } else {
      gsap.to(el, { height: 0, opacity: 0, duration: 0.26, ease: "power2.in" });
    }
  }, [open]);

  useEffect(() => {
    if (answerRef.current) gsap.set(answerRef.current, { height: 0, opacity: 0, overflow: "hidden" });
  }, []);

  return (
    <div className="faq-item-lm">
      <button className="faq-btn-lm" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: MONO, fontSize: "0.68rem", color: C.textFaint, flexShrink: 0 }}>
            {String(index + 1).padStart(2, "0")}
          </span>
          {q}
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden style={{
          flexShrink: 0,
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
          transition: "transform 250ms cubic-bezier(0.16,1,0.3,1)",
          color: open ? C.sepia : C.textFaint,
        }}>
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <div ref={answerRef}>
        <p style={{
          fontFamily: SORA, fontSize: "0.9rem", lineHeight: 1.7, color: C.textMuted,
          paddingBottom: "1.25rem",
        }}>
          {a}
        </p>
      </div>
    </div>
  );
}

// ─── Divider label ────────────────────────────────────────────────────────────
function DividerLm({ label, divRef }: { label: string; divRef: React.RefObject<HTMLDivElement> }) {
  return (
    <div ref={divRef} className="divider-lm">
      <span style={{
        fontFamily: MONO, fontSize: "0.62rem", color: C.textFaint,
        letterSpacing: "0.15em", whiteSpace: "nowrap",
      }}>
        {label}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LandingMerge() {
  const pageRef         = useRef<HTMLDivElement>(null);
  const wrapperRef      = useRef<HTMLDivElement>(null);
  const heroRef         = useRef<HTMLElement>(null);
  const heroIdentityRef = useRef<HTMLParagraphElement>(null);
  const heroHeadRef     = useRef<HTMLHeadingElement>(null);
  const heroSubRef      = useRef<HTMLParagraphElement>(null);
  const heroCtaRef      = useRef<HTMLDivElement>(null);

  // Emotional section refs
  const memorySecRef    = useRef<HTMLElement>(null);
  const emotionalSecRef = useRef<HTMLElement>(null);
  const polaroid1Ref    = useRef<HTMLDivElement>(null);
  const polaroid2Ref    = useRef<HTMLDivElement>(null);
  const polaroid3Ref    = useRef<HTMLDivElement>(null);
  const memoryLinesRef  = useRef<HTMLDivElement>(null);

  // Urgency section
  const urgencySecRef   = useRef<HTMLElement>(null);
  const ringsRef        = useRef<HTMLDivElement>(null);

  // Gift / pricing refs
  const giftSecRef      = useRef<HTMLElement>(null);

  // Divider refs
  const div1Ref = useRef<HTMLDivElement>(null);
  const div2Ref = useRef<HTMLDivElement>(null);
  const div3Ref = useRef<HTMLDivElement>(null);
  const div4Ref = useRef<HTMLDivElement>(null);
  const div5Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // ── Scroll progress bar ───────────────────────────────────────────────
      const progressBar = document.getElementById("lm-scroll-bar");
      if (progressBar) {
        gsap.set(progressBar, { scaleX: 0, transformOrigin: "left center" });
        gsap.to(progressBar, {
          scaleX: 1, ease: "none",
          scrollTrigger: {
            trigger: document.documentElement,
            start: "top top", end: "bottom bottom", scrub: 0,
          },
        });
      }

      // ── Hero entrance ─────────────────────────────────────────────────────
      if (!reduced) {
        const tl = gsap.timeline({ delay: 0.3 });

        if (heroIdentityRef.current) {
          tl.from(heroIdentityRef.current, { opacity: 0, y: 14, duration: 0.75, ease: "power3.out" });
        }

        if (heroHeadRef.current) {
          try {
            const split = SplitText.create(heroHeadRef.current, { type: "chars,words" });
            gsap.set(split.chars, {
              opacity: 0, y: 30, rotateX: -40,
              transformOrigin: "50% 50% -20px", willChange: "transform, opacity",
            });
            tl.to(split.chars, {
              opacity: 1, y: 0, rotateX: 0,
              duration: 1.4, stagger: 0.025, ease: "power3.out",
              onComplete: () => gsap.set(split.chars, { willChange: "auto" }),
            }, "-=0.3");
          } catch {
            gsap.set(heroHeadRef.current, { opacity: 1 });
          }
        }

        if (heroSubRef.current)
          tl.from(heroSubRef.current, { opacity: 0, y: 20, duration: 1.0, ease: "power3.out" }, "-=0.8");
        if (heroCtaRef.current)
          tl.from(heroCtaRef.current, { opacity: 0, y: 16, duration: 0.9, ease: "power3.out" }, "-=0.7");
      }

      // ── Warm/cold palette shift (from C) ──────────────────────────────────
      const bgTween = (bg: string, duration: number) =>
        gsap.to(wrapperRef.current, { backgroundColor: bg, duration, ease: "power2.inOut" });

      if (memorySecRef.current && wrapperRef.current) {
        ScrollTrigger.create({
          trigger: memorySecRef.current, start: "top 60%", end: "bottom 40%",
          onEnter:     () => bgTween(C.warmBgMid, 2.0),
          onLeave:     () => bgTween(C.page, 1.4),
          onEnterBack: () => bgTween(C.warmBgMid, 2.0),
          onLeaveBack: () => bgTween(C.page, 1.4),
        });
      }
      if (emotionalSecRef.current && wrapperRef.current) {
        ScrollTrigger.create({
          trigger: emotionalSecRef.current, start: "top 60%", end: "bottom 40%",
          onEnter:     () => bgTween(C.warmBg, 1.8),
          onLeave:     () => bgTween(C.page, 1.4),
          onEnterBack: () => bgTween(C.warmBg, 1.8),
          onLeaveBack: () => bgTween(C.page, 1.4),
        });
      }
      if (giftSecRef.current && wrapperRef.current) {
        ScrollTrigger.create({
          trigger: giftSecRef.current, start: "top 60%", end: "bottom 40%",
          onEnter:     () => bgTween("#160E04", 1.6),
          onLeave:     () => bgTween(C.page, 1.4),
          onEnterBack: () => bgTween("#160E04", 1.6),
          onLeaveBack: () => bgTween(C.page, 1.4),
        });
      }

      // ── Section heading reveals — SplitText clip-path wipe ────────────────
      if (!reduced) {
        document.querySelectorAll<HTMLElement>(".section-heading-lm").forEach((el) => {
          try {
            const split = new SplitText(el, { type: "lines" });
            gsap.set(split.lines, { clipPath: "inset(0% 0% 100% 0%)", willChange: "clip-path" });
            gsap.to(split.lines, {
              clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "album", stagger: 0.12,
              scrollTrigger: { trigger: el, start: "top 85%", once: true },
              onComplete: () => gsap.set(split.lines, { willChange: "auto" }),
            });
          } catch {
            // fallback: heading stays visible
          }
        });
      }

      // ── Stagger card reveals ──────────────────────────────────────────────
      ScrollTrigger.batch(".stagger-lm", {
        onEnter: (batch) => gsap.fromTo(batch,
          { y: 48, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.0, ease: "power3.out", stagger: 0.12,
            onComplete: () => gsap.set(batch, { willChange: "auto" }) }
        ),
        start: "top 86%", once: true,
      });

      // ── Bento tile reveals (from A) ───────────────────────────────────────
      const bentoTiles = document.querySelectorAll<HTMLElement>(".bento-tile-lm");
      if (bentoTiles.length) {
        gsap.set(bentoTiles, { opacity: 0, y: 40, willChange: "transform, opacity" });
        ScrollTrigger.batch(bentoTiles, {
          onEnter: (batch) => gsap.to(batch, {
            opacity: 1, y: 0, duration: 0.85, ease: "power3.out", stagger: 0.09,
            onComplete: () => gsap.set(batch, { willChange: "auto" }),
          }),
          start: "top 85%", once: true,
        });
      }

      // ── Polaroid reveals (from C) ─────────────────────────────────────────
      const polaroids = [polaroid1Ref.current, polaroid2Ref.current, polaroid3Ref.current];
      polaroids.forEach((el, i) => {
        if (!el) return;
        gsap.set(el, { clipPath: "inset(0% 0% 100% 0%)", opacity: 0, willChange: "clip-path, opacity" });
        gsap.to(el, {
          clipPath: "inset(0% 0% 0% 0%)", opacity: 1,
          duration: 1.6, delay: i * 0.22, ease: "album",
          scrollTrigger: { trigger: el, start: "top 82%", once: true },
          onComplete: () => gsap.set(el, { willChange: "auto" }),
        });
      });

      // ── Memory lines (from C) ─────────────────────────────────────────────
      if (memoryLinesRef.current) {
        const lines = memoryLinesRef.current.querySelectorAll<HTMLElement>(".memory-line-inner-lm");
        gsap.set(lines, { y: "100%", opacity: 0 });
        ScrollTrigger.create({
          trigger: memoryLinesRef.current, start: "top 75%", once: true,
          onEnter: () => gsap.to(lines, {
            y: "0%", opacity: 1, duration: 1.6, ease: "album", stagger: 0.55,
          }),
        });
      }

      // ── Urgency disc rings fade (from C) ──────────────────────────────────
      if (ringsRef.current) {
        const ring4 = ringsRef.current.querySelector<HTMLElement>("[data-ring='4']");
        const ring5 = ringsRef.current.querySelector<HTMLElement>("[data-ring='5']");
        if (ring4 && ring5) {
          ScrollTrigger.create({
            trigger: ringsRef.current, start: "top 60%", once: true,
            onEnter: () => gsap.to([ring4, ring5], {
              opacity: 0, duration: 2.4, ease: "power2.inOut", stagger: 0.6,
            }),
          });
        }
      }

      // ── Photo wipe tiles (from A) ─────────────────────────────────────────
      const photoGrid = document.getElementById("lm-photo-grid");
      if (photoGrid) {
        const cards = photoGrid.querySelectorAll(".lm-photo-wipe");
        gsap.set(cards, { clipPath: "inset(100% 0 0 0)", willChange: "clip-path" });
        ScrollTrigger.create({
          trigger: photoGrid, start: "top 75%", once: true,
          onEnter: () => gsap.to(cards, {
            clipPath: "inset(0% 0 0 0)", duration: 0.9, ease: "power2.inOut", stagger: 0.12,
            onComplete: () => gsap.set(cards, { willChange: "auto" }),
          }),
        });
      }

      // ── Divider line animations ───────────────────────────────────────────
      [div1Ref, div2Ref, div3Ref, div4Ref, div5Ref].forEach((ref) => {
        if (!ref.current) return;
        ScrollTrigger.create({
          trigger: ref.current, start: "top 90%", once: true,
          onEnter: () => ref.current?.classList.add("revealed"),
        });
      });

    }, pageRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef} className="lm-page">
      <style>{PAGE_STYLES}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SOFTWARE_SCHEMA }} />

      {/* Grain overlay */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999,
        backgroundImage: C.grain, backgroundSize: "256px 256px", mixBlendMode: "overlay",
      }} />

      {/* Scroll progress bar */}
      <div
        id="lm-scroll-bar"
        aria-hidden
        style={{
          position: "fixed", top: 0, left: 0, right: 0, height: "2px",
          background: `linear-gradient(to right, ${C.sepia}, ${C.amber})`,
          zIndex: 200, pointerEvents: "none",
        }}
      />

      <Nav theme="dark" />

      {/* Wrapper receives background color tweens */}
      <div ref={wrapperRef} style={{ background: C.page }}>

        {/* ═══════════════════════════════════════════════════════════════════
            01 — HERO: identity-first (C) + animated scan demo (B)
        ═══════════════════════════════════════════════════════════════════ */}
        <section
          ref={heroRef}
          style={{
            maxWidth: 1300,
            margin: "0 auto",
            minHeight: "calc(100vh - 64px)",
            boxSizing: "border-box",
            padding: "clamp(1.25rem, 3vh, 2.75rem) 6vw",
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: "clamp(2rem, 4vw, 4rem)",
            alignItems: "center",
          }}
          className="mobile-stack-lm"
        >
          {/* Left: identity-first copy (from C) */}
          <div>
            {/* Identity opener — leads BEFORE product mention */}
            <p
              ref={heroIdentityRef}
              style={{
                fontFamily: MONO, fontSize: "0.72rem", fontWeight: 400,
                letterSpacing: "0.18em", textTransform: "uppercase",
                color: C.sepia, marginBottom: "0.9rem", opacity: 0,
              }}
            >
              Free to scan · Windows 10 / 11 · No cloud · No subscription
            </p>

            <p className="eyebrow-lm" style={{ marginBottom: "1rem" }}>
              Recover Family Memories | Disc Recovery Software | Windows
            </p>

            <h1
              ref={heroHeadRef}
              className="display-lm"
              style={{
                fontSize: "clamp(1.85rem, 3.4vw, 3.15rem)",
                color: C.text,
                marginBottom: "1.1rem",
                maxWidth: "600px",
                perspective: "800px",
              }}
            >
              Your family's irreplaceable memories are locked in aging discs.{" "}
              <span style={{ color: C.sepia }}>Let's get them back before they're lost forever.</span>
            </h1>

            <p
              ref={heroSubRef}
              style={{
                fontFamily: SORA, fontSize: "clamp(0.92rem, 1.3vw, 1.02rem)",
                color: C.textMuted, maxWidth: "460px", lineHeight: "1.6",
                marginBottom: "1.5rem", textWrap: "pretty",
              }}
            >
              Heirvo rescues photos, videos, and memories from scratched DVDs,
              damaged CDs, and Kodak Photo CDs — before the disc degrades beyond saving.
              <strong style={{ color: C.text }}> Free to scan. $59 to save. Runs on your computer.</strong>
            </p>

            {/* Founder voice — the anti-vaporware anchor: a real person, a real reason */}
            <figure style={{
              margin: "0 0 1.5rem 0", paddingLeft: "1rem",
              borderLeft: `2px solid ${C.sepiaBorder}`,
            }}>
              <blockquote style={{
                fontFamily: GARAMOND, fontStyle: "italic", fontSize: "0.98rem",
                lineHeight: 1.5, color: C.sepiaText, margin: 0, maxWidth: "440px",
              }}>
                "I built Heirvo for my own discs first. A series of lampworking videos I made
                in the early 2000s was down to scratched copies — and it pulled back all nine.
                Now it shows you what's there first, too."
              </blockquote>
              <figcaption style={{
                marginTop: "0.5rem", fontFamily: MONO, fontSize: "0.64rem",
                letterSpacing: "0.1em", color: C.textFaint, textTransform: "uppercase",
              }}>
                — Sasha, who made Heirvo · Pai, Thailand
              </figcaption>
            </figure>

            <div ref={heroCtaRef} style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", alignItems: "center" }}>
              <a href={DOWNLOAD_URL} className="btn-primary-lm">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M8 2v8M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Scan your disc — it's free
              </a>
              <Link to="/gift" style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                padding: "0.9375rem 1.5rem", borderRadius: "5px",
                background: C.amberFaint, border: `1px solid ${C.amberBorder}`,
                color: C.amber, fontFamily: SORA, fontSize: "0.9375rem", fontWeight: 500,
                textDecoration: "none", transition: "background 0.18s, border-color 0.18s",
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(245,158,11,0.18)";
                  (e.currentTarget as HTMLElement).style.borderColor = C.amber;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = C.amberFaint;
                  (e.currentTarget as HTMLElement).style.borderColor = C.amberBorder;
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="4" y="9" width="16" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M9 9C9 6.791 10.343 5 12 5s3 1.791 3 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M12 9v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                Buy for a parent
              </Link>
            </div>
          </div>

          {/* Right: animated product scan demo (from B) */}
          <div className="hide-mobile-lm" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", width: "100%", height: "100%" }}>
            {/* Ambient disc spin */}
            <div aria-hidden style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: 440, height: 440,
              pointerEvents: "none", zIndex: 0, opacity: 0.16,
            }}>
              {[1.0, 0.78, 0.58, 0.38, 0.20].map((scale, i) => (
                <div key={i} style={{
                  position: "absolute", top: "50%", left: "50%",
                  width: `${scale * 100}%`, height: `${scale * 100}%`,
                  borderRadius: "50%", transform: "translate(-50%, -50%)",
                  border: `1px solid rgba(10,132,255,${0.08 + i * 0.04})`,
                }} />
              ))}
              <div className="lm-ambient-beam" style={{
                position: "absolute", top: "50%", left: "50%",
                width: "100%", height: "100%", borderRadius: "50%",
                transform: "translate(-50%, -50%)",
                background: "conic-gradient(transparent 330deg, rgba(10,132,255,0.04) 345deg, rgba(10,132,255,0.25) 355deg, rgba(10,132,255,0.06) 360deg)",
              }} />
            </div>

            {/* Honest framing label — this is a real demonstration, not a flourish */}
            <p style={{
              fontFamily: MONO, fontSize: "0.64rem", letterSpacing: "0.16em",
              textTransform: "uppercase", color: C.sepia, opacity: 0.8,
              marginBottom: "0.75rem", textAlign: "center", zIndex: 1,
            }}>
              What a real scan looks like
            </p>

            <div style={{ width: "100%", maxWidth: 380 }}>
              <Concept2_Resurfacing reducedMotion={false} />
            </div>

            {/* Caption: ties the radar to the "see before you pay" promise */}
            <p style={{
              fontFamily: SORA, fontStyle: "italic", fontSize: "0.78rem",
              color: C.textMuted, marginTop: "0.85rem", textAlign: "center",
              maxWidth: 380, zIndex: 1,
            }}>
              Every thumbnail that lights up is a file Heirvo found. What you see is exactly
              what you get.
            </p>
          </div>
        </section>

        {/* ── Divider 1 ──────────────────────────────────────────────────────── */}
        <DividerLm label="DVD · CD · Blu-ray · Kodak Photo CD" divRef={div1Ref} />

        {/* ═══════════════════════════════════════════════════════════════════
            01a — WHAT THIS ACTUALLY IS — plain-language honesty (Kitchen Table)
        ═══════════════════════════════════════════════════════════════════ */}
        <section style={{ padding: "7rem 6vw", maxWidth: "760px", margin: "0 auto" }}>
          <p className="eyebrow-lm" style={{ marginBottom: "1.25rem" }}>
            A plain explanation — no jargon
          </p>
          <h2
            className="display-lm section-heading-lm"
            style={{ fontSize: "clamp(1.7rem, 3.2vw, 2.6rem)", color: C.text, marginBottom: "2rem" }}
          >
            Here's exactly what Heirvo is, and what it can't do.
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <p style={{ fontFamily: SORA, fontSize: "1.05rem", color: C.textMuted, lineHeight: 1.75, textWrap: "pretty" }}>
              Heirvo is a Windows program that reads files from optical discs that Windows
              Explorer can't open. It works by retrying each damaged area of the disc many
              times — up to 9 attempts per sector, at different speeds and directions. Some
              data survives in full. Some survives in part. And some discs are simply too far
              gone.
            </p>
            <p style={{ fontFamily: SORA, fontSize: "1.05rem", color: C.textMuted, lineHeight: 1.75, textWrap: "pretty" }}>
              Before you pay anything, you scan the disc and see exactly which files were found
              — the wedding video, the folder of baby photos, the audio from a Christmas morning.
              If you see something worth saving, you unlock the save:
              <strong style={{ color: C.text }}> $59 for one disc, $99 for unlimited.</strong>
              {" "}If the disc is unreadable, you don't spend a cent.
            </p>
            <p style={{ fontFamily: MONO, fontSize: "0.78rem", color: C.sepia, letterSpacing: "0.06em", marginTop: "0.25rem" }}>
              That's it. That's the whole product.
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            01b — WHY THIS EXISTS — founder origin story (Kitchen Table)
        ═══════════════════════════════════════════════════════════════════ */}
        <section
          className="warm-section-lm"
          style={{
            padding: "8rem 6vw",
            borderTop: `1px solid ${C.sepiaBorder}`,
            borderBottom: `1px solid ${C.sepiaBorder}`,
            background: "linear-gradient(135deg, rgba(200,149,108,0.05) 0%, transparent 55%)",
          }}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: "5vw", alignItems: "start", maxWidth: "1100px", margin: "0 auto" }}
            className="mobile-stack-lm"
          >
            <div>
              <p className="eyebrow-lm" style={{ marginBottom: "1.25rem" }}>
                The reason this exists
              </p>
              <h2
                className="display-lm section-heading-lm"
                style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", color: C.text, lineHeight: 1.1 }}
              >
                My own discs were dying. So I built something.
              </h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "560px" }}>
              <p style={{ fontFamily: SORA, fontSize: "1rem", color: C.textMuted, lineHeight: 1.75, textWrap: "pretty" }}>
                I'm Sasha, and I built Heirvo for my own discs first. In the early 2000s I made
                a series of lampworking videos — techniques I'd recorded only once. By now the
                only copies I had left were old, scratched discs.
              </p>
              <p style={{ fontFamily: SORA, fontSize: "1rem", color: C.textMuted, lineHeight: 1.75, textWrap: "pretty" }}>
                You could see them failing, and nothing Windows offered could read them. So —
                I'm a developer — I built a recovery tool and pointed it at my own collection.
                It pulled back all nine of those videos. Not every disc will recover like that,
                but mine did: footage I'd thought was gone for good.
              </p>
              <p style={{ fontFamily: SORA, fontSize: "1rem", color: C.text, lineHeight: 1.75, textWrap: "pretty" }}>
                I packaged it up because I figured I'm probably not the only person with a box of
                discs in a closet, wondering if it's already too late.
              </p>
              <p style={{
                fontFamily: GARAMOND, fontStyle: "italic", fontSize: "1.2rem",
                color: C.sepiaText, marginTop: "0.5rem",
              }}>
                It might not be too late.
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            01c — SMARTSCREEN WARNING — objection handling
        ═══════════════════════════════════════════════════════════════════ */}
        <section style={{ padding: "5rem 6vw", background: "rgba(255,255,255,0.02)", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <p className="eyebrow-lm" style={{ marginBottom: "1.25rem", textAlign: "center" }}>
              Windows SmartScreen Warning
            </p>
            <h2
              style={{
                fontFamily: SORA, fontWeight: 700, fontSize: "clamp(1.4rem, 2.5vw, 2rem)",
                letterSpacing: "-0.02em", color: C.text, textAlign: "center",
                marginBottom: "0.75rem",
              }}
            >
              "Windows protected your PC" — what that actually means
            </h2>
            <p style={{
              fontFamily: SORA, fontSize: "0.95rem", color: C.textMuted,
              textAlign: "center", maxWidth: "560px", margin: "0 auto 3rem",
              lineHeight: 1.6,
            }}>
              When you download Heirvo, Windows may show a warning. Here's why it happens and what it means.
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1.5rem",
            }}
            className="mobile-stack-lm"
            >
              {/* Column 1 — What Windows Shows */}
              <div className="stagger-lm" style={{
                background: C.pageAlt,
                border: `1px solid rgba(245,158,11,0.25)`,
                borderRadius: "12px",
                padding: "1.75rem",
              }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 40, height: 40, borderRadius: "10px",
                  background: "rgba(245,158,11,0.12)", marginBottom: "1.25rem",
                }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <path d="M10 3L17.5 16.5H2.5L10 3Z" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M10 8v4" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="10" cy="14" r="0.75" fill="#F59E0B" />
                  </svg>
                </div>
                <h3 style={{
                  fontFamily: SORA, fontWeight: 700, fontSize: "1rem",
                  color: C.text, marginBottom: "0.75rem", letterSpacing: "-0.01em",
                }}>
                  What Windows Shows
                </h3>
                <p style={{ fontFamily: MONO, fontSize: "0.72rem", color: C.amber, background: "rgba(245,158,11,0.07)", border: `1px solid rgba(245,158,11,0.18)`, borderRadius: 6, padding: "10px 12px", marginBottom: "0.85rem", lineHeight: 1.6 }}>
                  "Windows protected your PC. Microsoft Defender SmartScreen prevented an unrecognized app from starting."
                </p>
                <p style={{ fontFamily: SORA, fontSize: "0.875rem", color: C.textMuted, lineHeight: 1.65 }}>
                  A blue or grey shield dialog with "More info" and "Run anyway" links.
                </p>
              </div>

              {/* Column 2 — Why This Happens */}
              <div className="stagger-lm" style={{
                background: C.pageAlt,
                border: `1px solid ${C.border}`,
                borderRadius: "12px",
                padding: "1.75rem",
              }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 40, height: 40, borderRadius: "10px",
                  background: C.blueFaint, marginBottom: "1.25rem",
                }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <circle cx="10" cy="10" r="7.5" stroke={C.blue} strokeWidth="1.5" />
                    <path d="M10 9v5" stroke={C.blue} strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="10" cy="6.5" r="0.75" fill={C.blue} />
                  </svg>
                </div>
                <h3 style={{
                  fontFamily: SORA, fontWeight: 700, fontSize: "1rem",
                  color: C.text, marginBottom: "0.75rem", letterSpacing: "-0.01em",
                }}>
                  Why This Happens
                </h3>
                <p style={{ fontFamily: SORA, fontSize: "0.875rem", color: C.textMuted, lineHeight: 1.65, marginBottom: "0.75rem" }}>
                  SmartScreen flags apps that don't yet have a large "reputation score" — meaning not enough Windows users have downloaded and run it. This is purely a count, not a security judgment.
                </p>
                <p style={{ fontFamily: SORA, fontSize: "0.875rem", color: C.textMuted, lineHeight: 1.65 }}>
                  Heirvo is a small, independent app. It hasn't yet been downloaded millions of times. That's the only reason the warning appears.
                </p>
              </div>

              {/* Column 3 — What It Means */}
              <div className="stagger-lm" style={{
                background: C.pageAlt,
                border: `1px solid rgba(52,211,153,0.20)`,
                borderRadius: "12px",
                padding: "1.75rem",
              }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 40, height: 40, borderRadius: "10px",
                  background: "rgba(52,211,153,0.10)", marginBottom: "1.25rem",
                }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <path d="M4 10.5L8 14.5L16 6" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 style={{
                  fontFamily: SORA, fontWeight: 700, fontSize: "1rem",
                  color: C.text, marginBottom: "0.75rem", letterSpacing: "-0.01em",
                }}>
                  What It Means
                </h3>
                <p style={{ fontFamily: SORA, fontSize: "0.875rem", color: C.textMuted, lineHeight: 1.65, marginBottom: "0.75rem" }}>
                  The warning does <em style={{ color: C.text }}>not</em> mean Heirvo contains a virus. Click "More info," then "Run anyway." Heirvo is open-source and code-signed — you can verify the executable yourself.
                </p>
                <p style={{ fontFamily: SORA, fontSize: "0.875rem", color: "#34D399", lineHeight: 1.65 }}>
                  Your antivirus will also scan it on first launch. Heirvo will pass clean.
                </p>
              </div>
            </div>

            {/* Bottom reassurance */}
            <div style={{ marginTop: "2rem", textAlign: "center" }}>
              <p style={{ fontFamily: MONO, fontSize: "0.68rem", color: C.textFaint, letterSpacing: "0.1em" }}>
                OPEN SOURCE · CODE SIGNED · RUNS 100% LOCALLY · NO CLOUD UPLOAD
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            02 — MEMORY LINES (from C) — emotional hook
        ═══════════════════════════════════════════════════════════════════ */}
        <section
          ref={memorySecRef}
          className="warm-section-lm"
          style={{ padding: "8rem 6vw", maxWidth: "860px", margin: "0 auto" }}
        >
          <p className="eyebrow-lm" style={{ marginBottom: "2.5rem" }}>
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
              <div key={i} className="memory-line-lm" style={{ marginBottom: i < 4 ? "0.85rem" : 0 }}>
                <span
                  className="memory-line-inner-lm display-lm"
                  style={{
                    fontSize: "clamp(1.5rem, 3.2vw, 2.5rem)",
                    color: i < 3 ? C.text : C.textMuted,
                  }}
                >
                  {line}
                </span>
              </div>
            ))}
          </div>

          <p style={{ fontFamily: SORA, fontSize: "1.05rem", color: C.textMuted, lineHeight: "1.7", maxWidth: "540px", textWrap: "pretty" }}>
            The voice on that disc may be the last recording you have.
            Not a backup. Not a copy. The original.
          </p>
        </section>

        {/* ── Divider 2 ──────────────────────────────────────────────────────── */}
        <DividerLm label="recovered memories" divRef={div2Ref} />

        {/* ═══════════════════════════════════════════════════════════════════
            03 — POLAROID SECTION (from C) — emotional / warm
        ═══════════════════════════════════════════════════════════════════ */}
        <section
          ref={emotionalSecRef}
          className="warm-section-lm"
          style={{ padding: "8rem 6vw" }}
        >
          <div
            style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: "6vw", alignItems: "center",
              maxWidth: "1100px", margin: "0 auto",
            }}
            className="mobile-stack-lm"
          >
            {/* Left: copy */}
            <div>
              <p className="eyebrow-lm" style={{ marginBottom: "1.25rem" }}>
                03 — Recovered memories
              </p>
              <h2
                className="display-lm section-heading-lm"
                style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)", color: C.text, marginBottom: "1.5rem" }}
              >
                Every recovered disc is a story that almost didn't get told.
              </h2>
              <p style={{ fontSize: "1rem", color: C.textMuted, lineHeight: "1.7", maxWidth: "440px", marginBottom: "1.5rem", textWrap: "pretty" }}>
                Heirvo makes multiple passes over every damaged sector — reading
                forward and backward, at slower speeds, in ways a standard disc copy
                never attempts. Files that other software declares lost, Heirvo finds.
              </p>
              <p style={{
                fontSize: "0.9rem", color: C.sepiaText, lineHeight: "1.6",
                fontStyle: "italic", fontFamily: GARAMOND, maxWidth: "380px",
              }}>
                "You're the one in the family who will actually do this. That's not nothing."
              </p>
            </div>

            {/* Right: polaroids */}
            <div className="hide-mobile-lm" style={{ position: "relative", height: "420px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div
                ref={polaroid1Ref}
                className="polaroid-lm"
                style={{ position: "absolute", width: "180px", top: "20px", left: "10px", transform: "rotate(-4deg)", zIndex: 1 }}
              >
                <img src="/memory-vacation.webp" alt="Recovered family vacation photo" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block", filter: "sepia(0.2)" }} />
                <span className="polaroid-caption-lm">1997 · Family vacation</span>
              </div>
              <div
                ref={polaroid2Ref}
                className="polaroid-lm"
                style={{ position: "absolute", width: "200px", top: "60px", left: "120px", transform: "rotate(1.5deg)", zIndex: 3 }}
              >
                <img src="/memory-wedding.webp" alt="Recovered wedding photo" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block", filter: "sepia(0.15)" }} />
                <span className="polaroid-caption-lm">2003 · Wedding day</span>
              </div>
              <div
                ref={polaroid3Ref}
                className="polaroid-lm"
                style={{ position: "absolute", width: "165px", bottom: "10px", right: "10px", transform: "rotate(3.5deg)", zIndex: 2 }}
              >
                <img src="/memory-christmas.webp" alt="Recovered Christmas photo" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block", filter: "sepia(0.25)" }} />
                <span className="polaroid-caption-lm">1993 · Kodak Photo CD</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Divider 3 ──────────────────────────────────────────────────────── */}
        <DividerLm label="what Heirvo does" divRef={div3Ref} />

        {/* ═══════════════════════════════════════════════════════════════════
            04 — BENTO GRID (from A) — proof / features
        ═══════════════════════════════════════════════════════════════════ */}
        <section id="features" style={{ padding: "8rem 6vw", background: "transparent" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <p className="eyebrow-lm" style={{ marginBottom: "1.25rem" }}>
              04 — How it works under the hood
            </p>
            <h2
              className="section-heading-lm"
              style={{
                fontFamily: SORA, fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
                fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.15,
                color: C.text, maxWidth: "22ch", marginBottom: "3rem",
              }}
            >
              Built for discs nothing else can read.
            </h2>

            {/* Asymmetric bento grid (from A) */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gridTemplateRows: "auto auto auto auto",
              gap: "14px",
            }}>
              {/* Hero tile — 2×2 */}
              <div
                className="bento-tile-lm"
                style={{
                  gridArea: "1 / 1 / 3 / 3",
                  background: C.pageAlt, border: `1px solid ${C.border}`,
                  borderRadius: "16px", padding: "2.5rem",
                  backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                  boxShadow: `0 1px 0 ${C.borderMed} inset, 0 4px 32px rgba(0,0,0,0.35)`,
                  display: "flex", flexDirection: "column", gap: "1.25rem",
                  position: "relative", overflow: "hidden",
                }}
              >
                <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 70% 50% at 30% 60%, rgba(10,132,255,0.06), transparent)" }} />
                <div style={{ width: "100%", height: "3px", borderRadius: "2px", background: C.border, overflow: "hidden", marginBottom: "0.5rem" }}>
                  <div style={{ width: "73%", height: "100%", borderRadius: "2px", background: `linear-gradient(90deg, ${C.blue}, ${C.blueHover})`, boxShadow: `0 0 6px rgba(10,132,255,0.45)` }} />
                </div>
                <div>
                  <p style={{ fontFamily: SORA, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.textFaint, marginBottom: "0.6rem" }}>
                    Sector-by-sector recovery
                  </p>
                  <h3 style={{ fontFamily: SORA, fontWeight: 700, fontSize: "clamp(1.35rem, 2.2vw, 1.9rem)", letterSpacing: "-0.03em", color: C.text, lineHeight: 1.2, marginBottom: "0.75rem" }}>
                    Every readable sector. Up to 9 passes.
                  </h3>
                  <p style={{ fontFamily: SORA, fontSize: "0.9375rem", color: C.textMuted, lineHeight: 1.65 }}>
                    Most disc software stops on first read error. Heirvo retries each damaged
                    sector at multiple speeds — forward and backward — recovering data other
                    tools leave on the disc. Most discs Windows can't open still have
                    80–95% of their data intact.
                  </p>
                </div>
              </div>

              {/* 1×1 — Format support */}
              <div className="bento-tile-lm" style={{
                gridArea: "1 / 3 / 2 / 4",
                background: C.pageAlt, border: `1px solid ${C.border}`,
                borderRadius: "16px", padding: "1.75rem",
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                display: "flex", flexDirection: "column", gap: "0.75rem",
              }}>
                <svg width="22" height="22" viewBox="0 0 64 64" fill="none" aria-hidden>
                  <circle cx="32" cy="32" r="30" stroke={C.sepia} strokeWidth="1.5" opacity="0.4" />
                  <circle cx="32" cy="32" r="18" stroke={C.sepia} strokeWidth="1.5" opacity="0.6" />
                  <circle cx="32" cy="32" r="4"  fill={C.sepia} opacity="0.9" />
                </svg>
                <p style={{ fontFamily: SORA, fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.025em", color: C.text }}>All disc formats</p>
                <p style={{ fontFamily: SORA, fontSize: "0.8125rem", color: C.textMuted, lineHeight: 1.55 }}>DVD · CD · Blu-ray · Kodak Photo CD</p>
              </div>

              {/* 1×1 — Read-only safety */}
              <div className="bento-tile-lm" style={{
                gridArea: "2 / 3 / 3 / 4",
                background: C.pageAlt, border: `1px solid ${C.border}`,
                borderRadius: "16px", padding: "1.75rem",
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                display: "flex", flexDirection: "column", gap: "0.75rem",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 12l2 2 4-4" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p style={{ fontFamily: SORA, fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.025em", color: C.text }}>Read-only.</p>
                <p style={{ fontFamily: SORA, fontSize: "0.8125rem", color: C.textMuted, lineHeight: 1.55 }}>Your disc is never written to. Heirvo only reads.</p>
              </div>

              {/* 1×1 — ~15 min */}
              <div className="bento-tile-lm" style={{
                gridArea: "3 / 1 / 4 / 2",
                background: C.pageAlt, border: `1px solid ${C.border}`,
                borderRadius: "16px", padding: "1.75rem",
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                display: "flex", flexDirection: "column", gap: "0.75rem",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="9" stroke={C.textMuted} strokeWidth="1.4" />
                  <path d="M12 7v5l3 3" stroke={C.textMuted} strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <p style={{ fontFamily: SORA, fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.025em", color: C.text }}>~15 min</p>
                <p style={{ fontFamily: SORA, fontSize: "0.8125rem", color: C.textMuted, lineHeight: 1.55 }}>Average scan for a single-layer DVD</p>
              </div>

              {/* 1×2 — Scan free */}
              <div className="bento-tile-lm" style={{
                gridArea: "3 / 2 / 4 / 4",
                background: C.amberFaint, border: `1px solid ${C.amberBorder}`,
                borderRadius: "16px", padding: "1.75rem",
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                display: "flex", flexDirection: "column", gap: "0.75rem",
              }}>
                <p style={{ fontFamily: SORA, fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.025em", color: C.amber }}>Scan free. Always.</p>
                <p style={{ fontFamily: SORA, fontSize: "0.8125rem", color: C.textMuted, lineHeight: 1.55 }}>See every recoverable file before you pay a cent. No account required.</p>
              </div>

              {/* 1×3 — SHA-256 verification */}
              <div className="bento-tile-lm" style={{
                gridArea: "4 / 1 / 5 / 4",
                background: C.pageAlt, border: `1px solid ${C.border}`,
                borderRadius: "16px", padding: "1.75rem",
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                display: "flex", alignItems: "center", gap: "1.25rem",
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke={C.sepia} strokeWidth="1.4" />
                  <path d="M8 12h8M8 8h8M8 16h5" stroke={C.sepia} strokeWidth="1.4" strokeLinecap="round" />
                  <circle cx="18" cy="18" r="4.5" fill={C.pageAlt} stroke={C.sepia} strokeWidth="1.4" />
                  <path d="M16.5 18l1 1 2-2" stroke={C.sepia} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <p style={{ fontFamily: SORA, fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.025em", color: C.text, marginBottom: "0.25rem" }}>SHA-256 verified. Every sector.</p>
                  <p style={{ fontFamily: SORA, fontSize: "0.8125rem", color: C.textMuted, lineHeight: 1.55 }}>Every recovered sector is hashed the instant it's read. Export a tamper-evident manifest — cryptographic proof your files are exactly what was on the disc.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            05 — PHOTO WIPE TILES (from A) — clip-path "printing up"
        ═══════════════════════════════════════════════════════════════════ */}
        <section style={{ padding: "8rem 6vw", background: C.pageAlt }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <p className="eyebrow-lm" style={{ marginBottom: "1.25rem" }}>
              05 — What comes back
            </p>
            <h2
              className="section-heading-lm"
              style={{
                fontFamily: SORA, fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
                fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.15,
                color: C.text, maxWidth: "24ch", marginBottom: "1rem",
              }}
            >
              Ninety-two photos. Three videos. One wedding.
            </h2>
            <p style={{ fontFamily: SORA, fontSize: "1.0625rem", color: C.textMuted, maxWidth: "50ch", lineHeight: 1.65, marginBottom: "3.5rem" }}>
              What a real Heirvo scan returned from a scratched DVD-R sitting in a shoebox since 2004.
            </p>

            <div id="lm-photo-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              {[
                { span: 2, src: "/recovered/wedding-1987.webp",     label: "DSC_0001.jpg — Parents' wedding, 1987" },
                { span: 1, src: "/recovered/birthday-1994.webp",    label: "BIRTHDAY.jpg — Birthday, 1994" },
                { span: 1, src: "/recovered/first-steps-2003.webp", label: "MOV_0042 — First steps, 2003" },
                { span: 1, src: "/recovered/christmas-1991.webp",   label: "XMAS_91.jpg — Christmas, 1991" },
                { span: 1, src: "/recovered/beach-1991.webp",       label: "VACATION.jpg — Summer, 1991" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="lm-photo-wipe"
                  style={{
                    gridColumn: `span ${item.span}`,
                    aspectRatio: item.span === 2 ? "2 / 1" : "4 / 3",
                    borderRadius: "10px", background: C.pageMid,
                    border: `1px solid ${C.border}`, overflow: "hidden",
                    position: "relative", willChange: "clip-path",
                  }}
                >
                  <img
                    src={item.src}
                    alt={item.label.split(" — ")[1] ?? "Recovered family photo"}
                    loading="lazy"
                    decoding="async"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: C.grain, backgroundSize: "128px 128px", mixBlendMode: "overlay", opacity: 0.45 }} />
                  <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,18,32,0.72), transparent 42%)" }} />
                  <div style={{ position: "absolute", bottom: 8, left: 10, fontFamily: MONO, fontSize: "0.62rem", letterSpacing: "0.1em", color: "rgba(240,237,232,0.7)", textTransform: "uppercase" }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            05b — RECOVERY OUTCOMES — honest results, including a failure (Kitchen Table)
        ═══════════════════════════════════════════════════════════════════ */}
        <section style={{ padding: "8rem 6vw", maxWidth: "1200px", margin: "0 auto" }}>
          <p className="eyebrow-lm" style={{ marginBottom: "1.25rem" }}>
            Recovery outcomes — the honest version
          </p>
          <h2
            className="display-lm section-heading-lm"
            style={{ fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)", color: C.text, maxWidth: "26ch", marginBottom: "1rem" }}
          >
            What people actually found on their discs.
          </h2>
          <p style={{ fontFamily: SORA, fontSize: "1.0625rem", color: C.textMuted, maxWidth: "54ch", lineHeight: 1.65, marginBottom: "3.5rem" }}>
            Real results aren't all perfect — so we don't pretend they are. Here's a fair
            sample, including the disc that couldn't be saved.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {[
              { disc: "DVD-R · 2003", note: "Home videos from my daughter's first year. Found 14 files, recovered 11. Three sectors were gone.", ok: true },
              { disc: "CD-R · 1998", note: "My dad's band recordings. Surface delamination. Heirvo found 8 of 12 tracks. Four were unreadable.", ok: true },
              { disc: "Kodak Photo CD · 1994", note: "My parents' wedding photos. All 72 files recovered at full resolution.", ok: true },
              { disc: "Scratched DVD · 2006", note: "Concert footage, disc cracked near the edge. Partial recovery — 60% of the runtime.", ok: true },
              { disc: "Blu-ray · 2015", note: "Baby's first steps. Disc opened fine. Full recovery in about four minutes.", ok: true },
              { disc: "DVD-R · 2001", note: "Nothing. The disc was too far gone. Refund processed the same day.", ok: false },
            ].map((card) => (
              <div
                key={card.disc}
                className="bento-tile-lm stagger-lm"
                style={{
                  background: card.ok ? C.pageAlt : "rgba(255,255,255,0.02)",
                  border: `1px solid ${card.ok ? C.border : C.amberBorder}`,
                  borderRadius: "14px", padding: "1.6rem",
                  display: "flex", flexDirection: "column", gap: "0.85rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                  <span style={{ fontFamily: MONO, fontSize: "0.66rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.textFaint }}>
                    {card.disc}
                  </span>
                  <span style={{
                    fontFamily: MONO, fontSize: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase",
                    color: card.ok ? "#34D399" : C.amber,
                    border: `1px solid ${card.ok ? "rgba(52,211,153,0.3)" : C.amberBorder}`,
                    background: card.ok ? "rgba(52,211,153,0.08)" : C.amberFaint,
                    padding: "0.15rem 0.5rem", borderRadius: "999px", whiteSpace: "nowrap",
                  }}>
                    {card.ok ? "Recovered" : "Refunded"}
                  </span>
                </div>
                <p style={{ fontFamily: SORA, fontSize: "0.9rem", color: C.textMuted, lineHeight: 1.6 }}>
                  {card.note}
                </p>
              </div>
            ))}
          </div>

          <p style={{ marginTop: "2rem", fontFamily: GARAMOND, fontStyle: "italic", fontSize: "1.05rem", color: C.sepiaText, maxWidth: "48ch", lineHeight: 1.6 }}>
            That last one is here on purpose. Some discs can't be saved — and you'll know
            before you pay, not after.
          </p>
        </section>

        {/* ── Divider 4 ──────────────────────────────────────────────────────── */}
        <DividerLm label="disc degradation" divRef={div4Ref} />

        {/* ═══════════════════════════════════════════════════════════════════
            06 — CLOCK IS TICKING (from C) — urgency section
        ═══════════════════════════════════════════════════════════════════ */}
        <section
          ref={urgencySecRef}
          style={{ padding: "8rem 6vw", maxWidth: "1100px", margin: "0 auto" }}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6vw", alignItems: "center" }}
            className="mobile-stack-lm"
          >
            {/* Left: disc rings */}
            <div className="hide-mobile-lm" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div
                ref={ringsRef}
                style={{ position: "relative", width: "280px", height: "280px", flexShrink: 0 }}
                aria-label="Diagram showing disc degradation — outer rings fade, representing permanent data loss"
              >
                {[
                  { size: 60,  color: C.sepia,     opacity: 0.9,  ring: "1" },
                  { size: 108, color: C.sepia,     opacity: 0.75, ring: "2" },
                  { size: 158, color: C.textMuted, opacity: 0.55, ring: "3" },
                  { size: 208, color: C.textFaint, opacity: 0.4,  ring: "4" },
                  { size: 258, color: C.textFaint, opacity: 0.22, ring: "5" },
                ].map(({ size, color, opacity, ring }) => (
                  <div
                    key={ring}
                    data-ring={ring}
                    className="disc-ring-lm"
                    style={{ width: `${size}px`, height: `${size}px`, borderColor: color, opacity }}
                  />
                ))}
                <div style={{
                  position: "absolute", top: "50%", left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "28px", height: "28px", borderRadius: "50%",
                  border: `1px solid rgba(200,149,108,0.5)`,
                  background: C.warmBg,
                }} />
                <div style={{
                  position: "absolute", bottom: "-2.5rem", left: "50%", transform: "translateX(-50%)",
                  fontFamily: MONO, fontSize: "0.65rem", color: C.textFaint,
                  letterSpacing: "0.1em", whiteSpace: "nowrap", textAlign: "center",
                }}>
                  outer rings → permanently unreadable
                </div>
              </div>
            </div>

            {/* Right: copy */}
            <div>
              <p className="eyebrow-lm" style={{ marginBottom: "1.25rem" }}>
                06 — The clock is ticking
              </p>
              <h2
                className="display-lm section-heading-lm"
                style={{ fontSize: "clamp(1.8rem, 3.5vw, 3rem)", color: C.text, marginBottom: "1.5rem" }}
              >
                Optical disc dye breaks down. Every year you wait, some sectors become permanently unreadable.
              </h2>
              <p style={{ fontSize: "1rem", color: C.textMuted, lineHeight: "1.7", marginBottom: "1rem", textWrap: "pretty" }}>
                This isn't marketing. It's physics. The outer data tracks on a recordable disc are the
                first to go — and they often contain the end of a video, the last photos on a roll.
              </p>
              <p style={{ fontSize: "0.95rem", color: C.textMuted, lineHeight: "1.7", marginBottom: "2rem", textWrap: "pretty" }}>
                Pressed discs (commercial DVDs, audio CDs) last longer — but recordable media
                (DVD-R, CD-R) can start degrading in as little as 10 years under normal storage.
                Most of the discs people bring to us are 15–25 years old.
              </p>
              <a href={DOWNLOAD_URL} className="btn-primary-lm">
                Scan the disc now — it's free
              </a>
              <p style={{ marginTop: "1rem", fontFamily: MONO, fontSize: "0.65rem", color: C.textFaint, letterSpacing: "0.08em" }}>
                You'll never regret checking. You might regret not checking.
              </p>
            </div>
          </div>
        </section>

        {/* ── Divider 5 ──────────────────────────────────────────────────────── */}
        <DividerLm label="simple process" divRef={div5Ref} />

        {/* ═══════════════════════════════════════════════════════════════════
            07 — HOW IT WORKS (from C)
        ═══════════════════════════════════════════════════════════════════ */}
        <section style={{ padding: "8rem 6vw", maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ maxWidth: "680px", marginBottom: "4rem" }}>
            <p className="eyebrow-lm" style={{ marginBottom: "1.25rem" }}>
              07 — Simple process
            </p>
            <h2
              className="display-lm section-heading-lm"
              style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", color: C.text, marginBottom: "1rem" }}
            >
              Three steps. One afternoon. A lifetime of memories back.
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "2.5rem" }}>
            {[
              {
                num: "01", title: "Insert the disc",
                body: "Connect any USB or internal disc drive to your Windows PC. Heirvo detects the disc type automatically — DVD, CD, Blu-ray, or Kodak Photo CD. No configuration needed.",
              },
              {
                num: "02", title: "Run the free scan",
                body: "Heirvo reads every sector multiple times, at varying speeds, forward and backward. The scan is completely free. You see every recoverable file before spending anything.",
              },
              {
                num: "03", title: "Save what was found",
                body: "One-time $59 unlocks everything recovered. No subscription. No account required. Photos at full resolution, video files intact — exactly as they were on disc.",
              },
            ].map((step) => (
              <div key={step.num} className="step-lm stagger-lm">
                <div className="step-num-lm" aria-hidden>{step.num}</div>
                <div>
                  <h3 style={{ fontFamily: SORA, fontSize: "1.05rem", fontWeight: 500, color: C.text, marginBottom: "0.65rem" }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: C.textMuted, lineHeight: "1.65", textWrap: "pretty" }}>
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            08 — GIFT SECTION (from C) — amber warm, first-class CTA
        ═══════════════════════════════════════════════════════════════════ */}
        <section
          id="gift"
          ref={giftSecRef}
          className="warm-section-lm"
          style={{
            padding: "8rem 6vw",
            borderTop: `1px solid ${C.amberBorder}`,
            borderBottom: `1px solid ${C.amberBorder}`,
            background: `linear-gradient(135deg, rgba(245,158,11,0.06) 0%, transparent 50%)`,
          }}
        >
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "4rem", alignItems: "center" }}
              className="mobile-stack-lm"
            >
              <div>
                <p className="eyebrow-lm" style={{ marginBottom: "1.25rem", color: C.amber, opacity: 1 }}>
                  08 — The most personal gift
                </p>
                <h2
                  className="display-lm section-heading-lm"
                  style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)", color: C.text, marginBottom: "1.25rem" }}
                >
                  The most personal gift isn't bought — it's rescued.
                </h2>
                <p style={{ fontSize: "1rem", color: C.textMuted, lineHeight: "1.7", maxWidth: "520px", marginBottom: "2rem", textWrap: "pretty" }}>
                  Recovering your parents' wedding video — or the home movies from when your children
                  were small — is the kind of gift that doesn't have a price tag. It has a story.
                </p>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <Link to="/gift" className="btn-amber-lm">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <rect x="1" y="5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M5.5 5C5.5 3.619 6.619 2.5 8 2.5s2.5 1.119 2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      <path d="M8 5v9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    Doing this as a gift? See the gift guide
                  </Link>
                  <a href={DOWNLOAD_URL} className="btn-ghost-lm">Start with a free scan</a>
                </div>
              </div>

              <div
                className="hide-mobile-lm"
                aria-hidden
                style={{
                  flexShrink: 0, width: "120px", height: "120px", borderRadius: "50%",
                  border: `1px solid ${C.amberBorder}`, background: C.amberFaint,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.amber, opacity: 0.7,
                }}
              >
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect x="4" y="18" width="40" height="26" rx="3" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M14 18C14 12.477 18.477 8 24 8s10 4.477 10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M24 18v26" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M4 26h40" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            09 — PRICING — 3 tiers, Archivist identity naming (from C + A)
        ═══════════════════════════════════════════════════════════════════ */}
        <section id="pricing" style={{ padding: "8rem 6vw", maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ maxWidth: "600px", marginBottom: "4rem" }}>
            <p className="eyebrow-lm" style={{ marginBottom: "1.25rem" }}>
              09 — Pricing
            </p>
            <h2
              className="display-lm section-heading-lm"
              style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", color: C.text, marginBottom: "1rem" }}
            >
              Pay once. Keep everything.
            </h2>
            <p style={{ fontSize: "0.95rem", color: C.textMuted, lineHeight: "1.65" }}>
              No subscription. No account required. The free scan always comes first.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
            {/* Free */}
            <div className="price-card-lm stagger-lm">
              <p className="eyebrow-lm" style={{ marginBottom: "1rem", fontSize: "0.65rem" }}>Free</p>
              <div style={{ fontFamily: MONO, fontSize: "2.2rem", fontWeight: 400, color: C.text, marginBottom: "0.25rem", letterSpacing: "-0.02em" }}>$0</div>
              <p style={{ fontSize: "0.8rem", color: C.textFaint, marginBottom: "1.5rem" }}>always free · for seeing what's on a disc</p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem 0" }}>
                {["Insert any disc", "Full sector-by-sector scan", "File preview — every recoverable file", "Damage report"].map((f) => (
                  <li key={f} style={{ fontSize: "0.875rem", color: C.textMuted, padding: "0.4rem 0", borderBottom: `1px solid ${C.border}`, display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden style={{ flexShrink: 0, marginTop: "2px", color: C.sepia }}>
                      <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href={DOWNLOAD_URL} className="btn-ghost-lm" style={{ width: "100%", justifyContent: "center" }}>Download free</a>
            </div>

            {/* Recover */}
            <div className="price-card-lm stagger-lm">
              <p className="eyebrow-lm" style={{ marginBottom: "1rem", fontSize: "0.65rem" }}>Recover</p>
              <div style={{ fontFamily: MONO, fontSize: "2.2rem", fontWeight: 400, color: C.text, marginBottom: "0.25rem", letterSpacing: "-0.02em" }}>$59</div>
              <p style={{ fontSize: "0.8rem", color: C.textFaint, marginBottom: "1.5rem" }}>one-time · one disc · for rescuing a single disc</p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem 0" }}>
                {[
                  "Everything in Free",
                  "Save all recovered files",
                  "DVD, CD, Blu-ray support",
                  "Auto MP4 conversion for video",
                  "60-day money-back guarantee",
                ].map((f) => (
                  <li key={f} style={{ fontSize: "0.875rem", color: C.textMuted, padding: "0.4rem 0", borderBottom: `1px solid ${C.border}`, display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden style={{ flexShrink: 0, marginTop: "2px", color: C.sepia }}>
                      <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href={RECOVER_URL} className="btn-primary-lm" style={{ width: "100%", justifyContent: "center" }}>Buy Recover — $59</a>
            </div>

            {/* Archivist — identity-based naming, highest tier */}
            <div className="price-card-lm featured-lm stagger-lm">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <p className="eyebrow-lm" style={{ fontSize: "0.65rem" }}>Archivist</p>
                <span style={{
                  fontFamily: MONO, fontSize: "0.6rem", letterSpacing: "0.1em",
                  textTransform: "uppercase", color: C.amber,
                  border: `1px solid rgba(245,158,11,0.25)`, padding: "0.2rem 0.5rem",
                  borderRadius: "999px", background: "rgba(245,158,11,0.07)",
                }}>
                  Most complete
                </span>
              </div>
              <div style={{ fontFamily: MONO, fontSize: "2.2rem", fontWeight: 400, color: C.text, marginBottom: "0.25rem", letterSpacing: "-0.02em" }}>$99</div>
              <p style={{ fontSize: "0.8rem", color: C.textFaint, marginBottom: "1.5rem" }}>
                one-time · unlimited discs · for a whole box of discs
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem 0" }}>
                {[
                  "Everything in Recover",
                  "Kodak Photo CD (.PCD) support",
                  "AI filename tagging by date + faces",
                  "Unlimited discs, one machine",
                  "Metadata preservation (EXIF dates)",
                  "Printed recovery certificate",
                ].map((f) => (
                  <li key={f} style={{ fontSize: "0.875rem", color: C.textMuted, padding: "0.4rem 0", borderBottom: `1px solid ${C.border}`, display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden style={{ flexShrink: 0, marginTop: "2px", color: C.sepia }}>
                      <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href={ARCHIVE_URL} className="btn-primary-lm" style={{ width: "100%", justifyContent: "center" }}>
                Buy Archivist — $99
              </a>
            </div>

            {/* Family — 5 seats */}
            <div className="price-card-lm stagger-lm">
              <p className="eyebrow-lm" style={{ marginBottom: "1rem", fontSize: "0.65rem" }}>Family</p>
              <div style={{ fontFamily: MONO, fontSize: "2.2rem", fontWeight: 400, color: C.text, marginBottom: "0.25rem", letterSpacing: "-0.02em" }}>$149</div>
              <p style={{ fontSize: "0.8rem", color: C.textFaint, marginBottom: "1.5rem" }}>one-time · 5 seats · for the whole family</p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem 0" }}>
                {[
                  "Everything in Archivist",
                  "5 separate licenses — 5 machines",
                  "Share recoveries across the family",
                  "Each person activates independently",
                  "Same-day priority support",
                  "Free updates on all 5 seats",
                ].map((f) => (
                  <li key={f} style={{ fontSize: "0.875rem", color: C.textMuted, padding: "0.4rem 0", borderBottom: `1px solid ${C.border}`, display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden style={{ flexShrink: 0, marginTop: "2px", color: C.sepia }}>
                      <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href={FAMILY_URL} className="btn-primary-lm" style={{ width: "100%", justifyContent: "center" }}>Buy Family — $149</a>
            </div>
          </div>

          {/* Tier-clarity reassurance + honest upgrade path */}
          <div style={{ marginTop: "2.5rem", textAlign: "center" }}>
            <p style={{ fontFamily: MONO, fontSize: "0.7rem", letterSpacing: "0.08em", color: C.textFaint, lineHeight: 1.8 }}>
              ALL TIERS · 100% LOCAL · NO ACCOUNT TO SCAN · ONE-TIME, NOT A SUBSCRIPTION · MONEY-BACK IF NOTHING RECOVERS
            </p>
            <p style={{ fontFamily: SORA, fontSize: "0.9rem", color: C.textMuted, marginTop: "1rem", maxWidth: "52ch", marginLeft: "auto", marginRight: "auto", lineHeight: 1.65 }}>
              Not sure which tier? Start with the free scan — it tells you everything that's
              there. Bought Recover and wish you'd chosen Archivist? Email us and we'll credit
              your $59.
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            10 — FAQ
        ═══════════════════════════════════════════════════════════════════ */}
        <section id="faq" style={{ padding: "8rem 6vw", maxWidth: "860px", margin: "0 auto" }}>
          <p className="eyebrow-lm" style={{ marginBottom: "1.25rem" }}>10 — Common questions</p>
          <h2
            className="display-lm section-heading-lm"
            style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", color: C.text, marginBottom: "3rem" }}
          >
            Questions worth asking before you start.
          </h2>
          <div style={{ borderTop: `1px solid ${C.border}` }}>
            {FAQS.map((faq, i) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} index={i} />
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            11 — FINAL CTA — C's closing line
        ═══════════════════════════════════════════════════════════════════ */}
        <section style={{
          padding: "10rem 6vw",
          background: `radial-gradient(ellipse 70% 60% at 50% 50%, rgba(200,149,108,0.08), transparent), ${C.pageAlt}`,
          borderTop: `1px solid ${C.border}`,
          textAlign: "center",
        }}>
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            {/* Decorative disc */}
            <div aria-hidden style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: "80px", height: "80px", borderRadius: "50%",
              border: `1px solid ${C.sepiaBorder}`,
              boxShadow: `0 0 0 16px rgba(200,149,108,0.04), 0 0 0 32px rgba(200,149,108,0.02)`,
              marginBottom: "2.5rem",
            }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
                <circle cx="16" cy="16" r="14" stroke={C.sepia} strokeWidth="0.8" opacity="0.4" />
                <circle cx="16" cy="16" r="8"  stroke={C.sepia} strokeWidth="0.8" opacity="0.6" />
                <circle cx="16" cy="16" r="2"  fill={C.sepia} opacity="0.9" />
              </svg>
            </div>

            <p className="eyebrow-lm" style={{ marginBottom: "1.5rem" }}>Before it's too late</p>
            <h2
              className="display-lm section-heading-lm"
              style={{ fontSize: "clamp(2.25rem, 5vw, 4rem)", color: C.text, marginBottom: "1.5rem", textWrap: "balance" }}
            >
              The photos are still there.
            </h2>
            <p style={{
              fontFamily: SORA, fontSize: "1.125rem", color: C.textMuted,
              lineHeight: 1.7, maxWidth: "44ch", margin: "0 auto 3rem",
              textWrap: "pretty",
            }}>
              The scan is free and takes under five minutes. You'll know exactly what's
              recoverable before you decide anything.
            </p>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <a href={DOWNLOAD_URL} className="btn-primary-lm">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M8 2v8M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Download Heirvo — free
              </a>
              <Link to="/gift" className="btn-amber-lm">
                Gift a recovery
              </Link>
            </div>

            <p style={{ marginTop: "2rem", fontFamily: MONO, fontSize: "0.68rem", letterSpacing: "0.12em", color: C.textFaint }}>
              Windows 10 / 11 · One-time payment · 60-day money-back guarantee
            </p>

            {/* C's closing line */}
            <p style={{
              marginTop: "4rem", fontFamily: GARAMOND, fontStyle: "italic",
              fontSize: "clamp(1.1rem, 2vw, 1.4rem)", color: C.sepiaText,
              lineHeight: 1.6, maxWidth: "36ch", margin: "4rem auto 0",
            }}>
              You'll never regret checking. You might regret not checking.
            </p>

            <p style={{
              marginTop: "2rem", fontFamily: MONO, fontSize: "0.66rem",
              letterSpacing: "0.12em", color: C.textFaint, textTransform: "uppercase",
            }}>
              Made by one person · Pai, Thailand · Honest pricing · Your data stays yours
            </p>
          </div>
        </section>

      </div>{/* /wrapperRef */}

      <Footer />
    </div>
  );
}
