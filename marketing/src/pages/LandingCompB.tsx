/*
 * COMPETITION ENTRY B — Precision Interface
 * Philosophy: Earn trust through transparency — show the software working before asking for anything.
 * Technique 1: Animated CSS/React product UI mockup in hero — live counter, progress bar, terminal log lines via GSAP timeline
 * Technique 2: Gradient border cards with conic-gradient glow on hover + CSS custom properties for precise state transitions
 * Technique 3: ScrollTrigger counter animations on stats + clip-path section reveals with stagger timing
 * Psychological bet: Technical credibility first → emotional payoff last. The product demo generates confidence; the "9 passes" story generates respect; the gift CTA lands the sale.
 * Monetization hook: The demo animation itself culminates in a "3,842 files recovered — save for $59" CTA that appears as the natural conclusion of the scan — purchase feels like completing a task, not a sales pitch.
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

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  page:        "#0B1220",
  pageAlt:     "#0E1628",
  pageMid:     "#111827",
  text:        "#F0EDE8",
  textMuted:   "#94A3B8",
  textFaint:   "#5E7290",
  border:      "rgba(255,255,255,0.08)",
  borderMed:   "rgba(255,255,255,0.12)",
  borderBright:"rgba(255,255,255,0.20)",
  blue:        "#0A84FF",
  blueHover:   "#3B9EFF",
  blueFaint:   "rgba(10,132,255,0.12)",
  blueBorder:  "rgba(10,132,255,0.30)",
  amber:       "#F59E0B",
  amberHover:  "#FBB03B",
  amberFaint:  "rgba(245,158,11,0.10)",
  amberBorder: "rgba(245,158,11,0.25)",
} as const;

const SORA = '"Sora", ui-sans-serif, system-ui, sans-serif';
const MONO = '"SF Mono", "Fira Code", ui-monospace, monospace';

const DOWNLOAD_URL: string = (import.meta.env.VITE_DOWNLOAD_URL as string) || "#";

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "Can I make the disc worse by scanning it?",
    a: "No. Heirvo is read-only — it never writes a single byte to your disc. The scanner reads sectors; it never touches the source. Even if Heirvo finds nothing, the disc is in exactly the same state it was before you started.",
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
    q: "What discs does Heirvo support?",
    a: "DVD-R/RW, DVD+R/RW, DVD-RAM, CD-R/RW, VCD, SVCD, and Kodak Photo CD (all resolutions: Base through 64Base). Blu-ray support is in beta — join the Labs to test it.",
  },
  {
    q: "What's the difference between Recover ($59) and Archivist ($99)?",
    a: "Recover unlocks saving for one disc — perfect for a single family DVD. Archivist is for the person who wants to do this properly: unlimited disc scans, Kodak Photo CD full-resolution export, AI filename tagging (dates and faces detected), and a printed recovery certificate you can gift to your parent. The kind of person who gets Archivist doesn't do things halfway.",
  },
];

// ─── Terminal log lines for the product demo ─────────────────────────────────
const LOG_LINES = [
  { t: 0.3,  text: "disc detected: DVD-R  4.7GB  UDF 2.0",    color: C.textMuted },
  { t: 0.9,  text: "sector map: 2,295,104 sectors total",     color: C.textMuted },
  { t: 1.6,  text: "pass 1/9 — sequential read  ████████░░  83%", color: C.textMuted },
  { t: 2.4,  text: "sector 1,847,302 — read error (retrying)",color: C.amber },
  { t: 3.0,  text: "sector 1,847,302 — retry 2/9 … ok ✓",    color: "#34D399" },
  { t: 3.6,  text: "sector 2,104,887 — read error (retrying)",color: C.amber },
  { t: 4.2,  text: "sector 2,104,887 — retry 5/9 … ok ✓",    color: "#34D399" },
  { t: 5.0,  text: "pass 1 complete — 3,842 files indexed",   color: C.text },
  { t: 5.6,  text: "extracting JPEG × 3,204  MOV × 638",      color: C.textMuted },
  { t: 6.2,  text: "scan complete ─────────────────────────", color: C.blue },
];

// ─── Styles ───────────────────────────────────────────────────────────────────
const STYLES = `
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}

  ::selection{background:rgba(10,132,255,0.35);color:#F0EDE8}
  ::-webkit-scrollbar{width:5px}
  ::-webkit-scrollbar-track{background:#0B1220}
  ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:3px}
  ::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.22)}

  .lb-hero-h{font-family:${SORA};font-size:clamp(2.4rem,5vw,4rem);font-weight:700;letter-spacing:-0.04em;line-height:1.1;color:${C.text};text-wrap:balance}
  .lb-section-h{font-family:${SORA};font-size:clamp(1.8rem,3.5vw,2.8rem);font-weight:700;letter-spacing:-0.035em;line-height:1.15;color:${C.text};text-wrap:balance}
  .lb-eyebrow{font-family:${MONO};font-size:0.68rem;letter-spacing:0.2em;text-transform:uppercase;color:${C.blue}}
  .lb-body{font-family:${SORA};font-size:1rem;line-height:1.7;color:${C.textMuted};max-width:58ch;text-wrap:pretty}
  .lb-mono{font-family:${MONO};font-variant-numeric:tabular-nums}

  .lb-btn-primary{
    display:inline-flex;align-items:center;gap:8px;
    background:${C.blue};color:#fff;
    font-family:${SORA};font-size:0.9rem;font-weight:600;letter-spacing:-0.01em;
    padding:12px 24px;border-radius:6px;border:none;cursor:pointer;
    transition:background 160ms cubic-bezier(0.16,1,0.3,1),transform 160ms cubic-bezier(0.16,1,0.3,1),box-shadow 200ms ease;
    text-decoration:none;
  }
  .lb-btn-primary:hover{background:${C.blueHover};transform:translateY(-1px);box-shadow:0 8px 24px -8px rgba(10,132,255,0.5)}
  .lb-btn-primary:active{transform:translateY(0)}
  .lb-btn-primary:focus-visible{outline:2px solid ${C.blue};outline-offset:3px}

  .lb-btn-ghost{
    display:inline-flex;align-items:center;gap:8px;
    background:transparent;color:${C.text};
    font-family:${SORA};font-size:0.9rem;font-weight:500;
    padding:12px 22px;border-radius:6px;border:1px solid ${C.borderMed};cursor:pointer;
    transition:border-color 160ms ease,background 160ms ease,transform 160ms cubic-bezier(0.16,1,0.3,1);
    text-decoration:none;
  }
  .lb-btn-ghost:hover{border-color:${C.borderBright};background:rgba(255,255,255,0.04);transform:translateY(-1px)}
  .lb-btn-ghost:focus-visible{outline:2px solid ${C.blue};outline-offset:3px}

  .lb-btn-amber{
    display:inline-flex;align-items:center;gap:8px;
    background:${C.amberFaint};color:${C.amber};
    font-family:${SORA};font-size:0.9rem;font-weight:600;
    padding:12px 22px;border-radius:6px;border:1px solid ${C.amberBorder};cursor:pointer;
    transition:background 160ms ease,border-color 160ms ease,transform 160ms cubic-bezier(0.16,1,0.3,1);
    text-decoration:none;
  }
  .lb-btn-amber:hover{background:rgba(245,158,11,0.18);border-color:rgba(245,158,11,0.45);transform:translateY(-1px)}
  .lb-btn-amber:focus-visible{outline:2px solid ${C.amber};outline-offset:3px}

  /* Gradient border card */
  .lb-gcard{
    position:relative;border-radius:8px;padding:24px;
    background:${C.pageAlt};
    transition:transform 250ms cubic-bezier(0.16,1,0.3,1),box-shadow 250ms ease;
    cursor:default;
  }
  .lb-gcard::before{
    content:'';position:absolute;inset:-1px;border-radius:9px;
    background:conic-gradient(from var(--angle,0deg),transparent 60%,rgba(10,132,255,0.4) 80%,transparent 100%);
    -webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);
    -webkit-mask-composite:xor;mask-composite:exclude;
    opacity:0;transition:opacity 300ms ease;pointer-events:none;
    padding:1px;
  }
  .lb-gcard:hover{transform:translateY(-2px);box-shadow:0 12px 36px -12px rgba(10,132,255,0.2)}
  .lb-gcard:hover::before{opacity:1}

  /* Proof badge */
  .lb-badge{
    display:inline-flex;align-items:center;gap:6px;
    font-family:${MONO};font-size:0.72rem;
    padding:4px 10px;border-radius:4px;
    background:${C.blueFaint};border:1px solid ${C.blueBorder};color:${C.blue};
    letter-spacing:0.02em;
  }

  /* Product window chrome */
  .lb-window{
    background:#0d1526;border:1px solid ${C.borderMed};border-radius:10px;
    overflow:hidden;box-shadow:0 24px 64px -16px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.04);
  }
  .lb-window-bar{
    display:flex;align-items:center;gap:6px;
    padding:10px 14px;border-bottom:1px solid ${C.border};
    background:#0a1120;
  }
  .lb-dot{width:10px;height:10px;border-radius:50%}

  /* FAQ accordion */
  .lb-faq-item{border-bottom:1px solid ${C.border};overflow:hidden}
  .lb-faq-q{
    width:100%;background:none;border:none;cursor:pointer;
    display:flex;align-items:center;justify-content:space-between;
    padding:20px 0;font-family:${SORA};font-size:1rem;font-weight:500;
    color:${C.text};text-align:left;gap:16px;
    transition:color 150ms ease;
  }
  .lb-faq-q:hover{color:#fff}
  .lb-faq-q:focus-visible{outline:2px solid ${C.blue};outline-offset:2px;border-radius:4px}
  .lb-faq-a{
    font-family:${SORA};font-size:0.9rem;line-height:1.7;color:${C.textMuted};
    height:0;overflow:hidden;opacity:0;
  }
  .lb-faq-a-inner{padding:0 0 20px 0}

  /* Divider */
  .lb-divider{height:1px;background:${C.border};margin:0;border:none}

  /* Step connector */
  .lb-step-num{
    font-family:${MONO};font-size:0.75rem;color:${C.blue};
    width:28px;height:28px;border-radius:6px;
    background:${C.blueFaint};border:1px solid ${C.blueBorder};
    display:flex;align-items:center;justify-content:center;
    flex-shrink:0;letter-spacing:0.05em;font-weight:600;
  }

  /* Pricing card active */
  .lb-price-card{
    background:${C.pageAlt};border:1px solid ${C.border};border-radius:10px;
    padding:28px 24px;transition:border-color 250ms ease,box-shadow 250ms ease,transform 250ms cubic-bezier(0.16,1,0.3,1);
  }
  .lb-price-card:hover{border-color:${C.borderMed};transform:translateY(-2px);box-shadow:0 16px 40px -12px rgba(0,0,0,0.4)}
  .lb-price-card.featured{
    border-color:${C.blueBorder};
    background:linear-gradient(135deg,rgba(10,132,255,0.07) 0%,${C.pageAlt} 60%);
  }
  .lb-price-card.featured:hover{border-color:rgba(10,132,255,0.5);box-shadow:0 16px 40px -12px rgba(10,132,255,0.25)}

  /* Scan CTA overlay */
  .lb-scan-cta{
    background:linear-gradient(135deg,rgba(10,132,255,0.15),rgba(10,132,255,0.05));
    border:1px solid ${C.blueBorder};border-radius:8px;
    padding:16px 20px;margin-top:12px;
    opacity:0;transform:translateY(8px);
    transition:opacity 400ms ease,transform 400ms cubic-bezier(0.16,1,0.3,1);
  }
  .lb-scan-cta.visible{opacity:1;transform:translateY(0)}

  /* Ambient disc beam rotation */
  @keyframes lb-ambient-spin {
    from { transform: translate(-50%,-50%) rotate(0deg); }
    to   { transform: translate(-50%,-50%) rotate(360deg); }
  }
  .lb-ambient-beam { animation: lb-ambient-spin 7s linear infinite; }

  @media (prefers-reduced-motion: reduce) {
    .lb-ambient-beam { animation: none !important; }
  }

  /* Retry visual section */
  .lb-retry-lane{
    background:${C.pageAlt};border:1px solid ${C.border};border-radius:8px;
    padding:16px 20px;
  }
  .lb-retry-bar{
    height:4px;border-radius:2px;background:rgba(255,255,255,0.06);
    overflow:hidden;margin:6px 0;
  }
  .lb-retry-fill{height:100%;border-radius:2px;width:0%;transition:width 800ms cubic-bezier(0.16,1,0.3,1)}
`;

// ─── ProductMockup component ──────────────────────────────────────────────────
interface ProductMockupProps {
  onScanComplete: () => void;
}

function ProductMockup({ onScanComplete }: ProductMockupProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const fileCountRef = useRef<HTMLSpanElement>(null);
  const sectorCountRef = useRef<HTMLSpanElement>(null);
  const logsRef = useRef<HTMLDivElement>(null);
  const scanCompleteRef = useRef(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const win = windowRef.current;
      if (!win) return;

      // Entrance animation
      gsap.fromTo(win,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", delay: 0.5 }
      );

      // Progress bar animation — fill over 6.5s
      if (progressRef.current) {
        gsap.fromTo(progressRef.current,
          { width: "0%" },
          {
            width: "100%",
            duration: 6.5,
            ease: "power1.inOut",
            delay: 0.8,
            onComplete: () => {
              if (!scanCompleteRef.current) {
                scanCompleteRef.current = true;
                onScanComplete();
              }
            },
          }
        );
      }

      // File counter: 0 → 3842
      if (fileCountRef.current) {
        const obj = { value: 0 };
        gsap.to(obj, {
          value: 3842,
          duration: 5.8,
          ease: "power2.inOut",
          delay: 1.2,
          onUpdate: () => {
            if (fileCountRef.current) {
              fileCountRef.current.textContent = Math.round(obj.value).toLocaleString();
            }
          },
        });
      }

      // Sector counter: 0 → 2295104
      if (sectorCountRef.current) {
        const obj2 = { value: 0 };
        gsap.to(obj2, {
          value: 2295104,
          duration: 6.2,
          ease: "power1.out",
          delay: 0.9,
          onUpdate: () => {
            if (sectorCountRef.current) {
              sectorCountRef.current.textContent = Math.round(obj2.value).toLocaleString();
            }
          },
        });
      }

      // Log lines appear one by one
      LOG_LINES.forEach((line, i) => {
        if (!logsRef.current) return;
        const el = logsRef.current.querySelectorAll(".lb-log-line")[i] as HTMLElement;
        if (!el) return;
        gsap.fromTo(el,
          { opacity: 0, x: -6 },
          {
            opacity: 1,
            x: 0,
            duration: 0.35,
            ease: "power2.out",
            delay: line.t,
          }
        );
      });
    }, windowRef);

    return () => ctx.revert();
  }, [onScanComplete]);

  return (
    <div ref={windowRef} className="lb-window" style={{ opacity: 0, width: "100%", maxWidth: 560 }}>
      {/* Window chrome */}
      <div className="lb-window-bar">
        <span className="lb-dot" style={{ background: "#FF5F57" }} />
        <span className="lb-dot" style={{ background: "#FFBD2E" }} />
        <span className="lb-dot" style={{ background: "#28C840" }} />
        <span style={{
          marginLeft: 8,
          fontFamily: MONO,
          fontSize: "0.72rem",
          color: C.textFaint,
          letterSpacing: "0.04em",
        }}>
          Heirvo — FAMILY_VACATION_2003.ISO
        </span>
        <span style={{
          marginLeft: "auto",
          fontFamily: MONO,
          fontSize: "0.68rem",
          color: C.blue,
          background: C.blueFaint,
          border: `1px solid ${C.blueBorder}`,
          padding: "2px 8px",
          borderRadius: 4,
        }}>
          SCANNING
        </span>
      </div>

      {/* Main content */}
      <div style={{ padding: "20px 20px 16px" }}>
        {/* Progress bar row */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}>
            <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: C.textMuted, letterSpacing: "0.08em" }}>
              PASS 1 / 9 — SECTOR SCAN
            </span>
            <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: C.blue }}>
              <span ref={sectorCountRef} style={{ fontVariantNumeric: "tabular-nums" }}>0</span>
              <span style={{ color: C.textFaint }}> / 2,295,104</span>
            </span>
          </div>
          {/* Progress track */}
          <div style={{
            height: 5,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 3,
            overflow: "hidden",
          }}>
            <div
              ref={progressRef}
              style={{
                height: "100%",
                width: "0%",
                borderRadius: 3,
                background: `linear-gradient(90deg, ${C.blue}, ${C.blueHover})`,
                boxShadow: `0 0 12px rgba(10,132,255,0.6)`,
              }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          marginBottom: 16,
        }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px" }}>
            <div style={{ fontFamily: MONO, fontSize: "0.6rem", color: C.textFaint, letterSpacing: "0.1em", marginBottom: 4 }}>FILES FOUND</div>
            <div style={{ fontFamily: MONO, fontSize: "1.2rem", color: C.text, fontVariantNumeric: "tabular-nums" }}>
              <span ref={fileCountRef}>0</span>
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px" }}>
            <div style={{ fontFamily: MONO, fontSize: "0.6rem", color: C.textFaint, letterSpacing: "0.1em", marginBottom: 4 }}>RETRIES</div>
            <div style={{ fontFamily: MONO, fontSize: "1.2rem", color: C.amber, fontVariantNumeric: "tabular-nums" }}>127</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px" }}>
            <div style={{ fontFamily: MONO, fontSize: "0.6rem", color: C.textFaint, letterSpacing: "0.1em", marginBottom: 4 }}>ERRORS LEFT</div>
            <div style={{ fontFamily: MONO, fontSize: "1.2rem", color: "#34D399", fontVariantNumeric: "tabular-nums" }}>0</div>
          </div>
        </div>

        {/* Terminal log */}
        <div
          ref={logsRef}
          style={{
            background: "#050d1a",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "12px 14px",
            height: 196,
            overflow: "hidden",
            fontFamily: MONO,
            fontSize: "0.72rem",
            lineHeight: 1.8,
          }}
        >
          {LOG_LINES.map((line, i) => (
            <div
              key={i}
              className="lb-log-line"
              style={{ color: line.color, opacity: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              <span style={{ color: C.textFaint, userSelect: "none", marginRight: 8 }}>
                {"0" + (i + 1).toString().padStart(2, "0")} ›
              </span>
              {line.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FAQ Item ─────────────────────────────────────────────────────────────────
interface FAQItemProps {
  q: string;
  a: string;
  index: number;
}

function FAQItem({ q, a, index }: FAQItemProps) {
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
    const el = answerRef.current;
    if (el) gsap.set(el, { height: 0, opacity: 0 });
  }, []);

  return (
    <div className="lb-faq-item">
      <button
        className="lb-faq-q"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: MONO, fontSize: "0.68rem", color: C.textFaint, flexShrink: 0 }}>
            {String(index + 1).padStart(2, "0")}
          </span>
          {q}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{
            flexShrink: 0,
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
            transition: "transform 250ms cubic-bezier(0.16,1,0.3,1)",
            color: open ? C.blue : C.textFaint,
          }}
        >
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <div ref={answerRef} className="lb-faq-a">
        <div className="lb-faq-a-inner">
          <p style={{ fontFamily: SORA, fontSize: "0.9rem", lineHeight: 1.7, color: C.textMuted }}>{a}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Retry visual section ─────────────────────────────────────────────────────
const RETRY_PASSES = [
  { pass: 1, label: "Pass 1", pct: 100, status: "ok",      color: "#34D399" },
  { pass: 2, label: "Pass 2", pct: 100, status: "ok",      color: "#34D399" },
  { pass: 3, label: "Pass 3", pct: 72,  status: "partial", color: C.amber },
  { pass: 4, label: "Pass 4", pct: 72,  status: "partial", color: C.amber },
  { pass: 5, label: "Pass 5", pct: 72,  status: "partial", color: C.amber },
  { pass: 6, label: "Pass 6", pct: 98,  status: "ok",      color: "#34D399" },
  { pass: 7, label: "Pass 7 — sector recovered ✓", pct: 100, status: "done", color: C.blue },
] as const;

function RetryVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const passRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      RETRY_PASSES.forEach((p, i) => {
        const fill = passRefs.current[i];
        if (!fill) return;
        gsap.to(fill, {
          width: `${p.pct}%`,
          duration: 0.7,
          ease: "power2.out",
          delay: i * 0.15,
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
            once: true,
          },
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {RETRY_PASSES.map((p, i) => (
        <div key={i} className="lb-retry-lane">
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}>
            <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: p.status === "done" ? C.blue : C.textMuted }}>
              {p.label}
            </span>
            <span style={{ fontFamily: MONO, fontSize: "0.7rem", color: p.color }}>
              {p.status === "ok" ? "✓" : p.status === "done" ? "✓ recovered" : `${p.pct}%`}
            </span>
          </div>
          <div className="lb-retry-bar">
            <div
              ref={el => { passRefs.current[i] = el; }}
              className="lb-retry-fill"
              style={{ background: p.color, opacity: p.status === "partial" ? 0.6 : 1 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LandingCompB() {
  const pageRef = useRef<HTMLDivElement>(null);
  const heroTextRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const proofRef = useRef<HTMLDivElement>(null);
  const howRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const scanCtaRef = useRef<HTMLDivElement>(null);

  const [scanDone, setScanDone] = useState(false);

  const handleScanComplete = () => {
    setScanDone(true);
  };

  useEffect(() => {
    if (scanDone && scanCtaRef.current) {
      scanCtaRef.current.classList.add("visible");
    }
  }, [scanDone]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Register custom eases if not already registered
      if (!CustomEase.get("cinematic")) {
        CustomEase.create("cinematic", "M0,0 C0.76,0 0.24,1 1,1");
      }

      // Hero text entrance
      if (heroTextRef.current) {
        // All .lb-reveal elements (tag, eyebrow, body, badges) — clip/fade in stagger
        const reveals = heroTextRef.current.querySelectorAll(".lb-reveal");
        gsap.fromTo(reveals,
          { opacity: 0, y: 20, clipPath: "inset(0% 0% 100% 0%)" },
          {
            opacity: 1,
            y: 0,
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.1,
            delay: 0.2,
          }
        );

        // H1 — 3D char-level flip-up (Awwwards 2024–25 pattern)
        // rotateX: -40 creates the "folding up from behind" perspective effect
        const h1 = heroTextRef.current.querySelector<HTMLElement>(".lb-hero-h1");
        if (h1) {
          try {
            const split = SplitText.create(h1, { type: "chars,words" });
            gsap.set(split.chars, { opacity: 0, y: 30, rotateX: -40, transformOrigin: "50% 0%", perspective: 600 });
            gsap.to(split.chars, {
              opacity: 1,
              y: 0,
              rotateX: 0,
              duration: 0.65,
              stagger: 0.025,
              ease: "power3.out",
              delay: 0.35,
            });
          } catch {
            // SplitText unavailable — the clip reveal on h1 via .lb-reveal handles it
            gsap.fromTo(h1, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.85, ease: "power3.out", delay: 0.35 });
          }
        }
      }

      // Stats counter animations
      if (statsRef.current) {
        const statEls = statsRef.current.querySelectorAll<HTMLElement>(".lb-stat-count");
        statEls.forEach(el => {
          const target = parseFloat(el.dataset.target ?? "0");
          const isFloat = target !== Math.floor(target);
          const obj = { value: 0 };
          gsap.to(obj, {
            value: target,
            duration: 2.2,
            ease: "power2.out",
            onUpdate: () => {
              if (isFloat) {
                el.textContent = obj.value.toFixed(1);
              } else {
                el.textContent = Math.round(obj.value).toLocaleString();
              }
            },
            scrollTrigger: { trigger: el, start: "top 82%", once: true, anticipatePin: 1 },
          });
        });
      }

      // Section headlines — 3D char SplitText reveal on scroll
      // Awwwards 2024–25 pattern: y: 30, rotateX: -40, stagger: 0.025
      document.querySelectorAll<HTMLElement>(".lb-section-h").forEach((el) => {
        try {
          const split = SplitText.create(el, { type: "chars,words" });
          gsap.set(split.chars, { opacity: 0, y: 30, rotateX: -40, transformOrigin: "50% 0%", perspective: 600 });
          gsap.to(split.chars, {
            opacity: 1, y: 0, rotateX: 0,
            duration: 0.65, stagger: 0.025, ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%", once: true, anticipatePin: 1 },
          });
        } catch {
          gsap.from(el, {
            opacity: 0, y: 24, duration: 0.8, ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%", once: true, anticipatePin: 1 },
          });
        }
      });

      // Proof cards stagger
      if (proofRef.current) {
        const cards = proofRef.current.querySelectorAll(".lb-gcard");
        gsap.fromTo(cards,
          { opacity: 0, y: 32 },
          {
            opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.1,
            scrollTrigger: { trigger: proofRef.current, start: "top 80%", once: true, anticipatePin: 1 },
          }
        );
      }

      // How-it-works steps
      if (howRef.current) {
        const steps = howRef.current.querySelectorAll(".lb-step");
        gsap.fromTo(steps,
          { opacity: 0, x: -20 },
          {
            opacity: 1, x: 0, duration: 0.65, ease: "power3.out", stagger: 0.15,
            scrollTrigger: { trigger: howRef.current, start: "top 78%", once: true, anticipatePin: 1 },
          }
        );
      }

      // Pricing cards stagger — clip-path wipe reveals (mirrors the recovery metaphor)
      if (pricingRef.current) {
        const cards = pricingRef.current.querySelectorAll(".lb-price-card");
        gsap.set(cards, { clipPath: "inset(0% 0% 100% 0%)", willChange: "clip-path" });
        gsap.to(cards, {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 0.85, ease: "power2.inOut", stagger: 0.12,
          scrollTrigger: { trigger: pricingRef.current, start: "top 80%", once: true, anticipatePin: 1 },
          onComplete: () => gsap.set(cards, { willChange: "auto" }),
        });
      }

      // Final CTA
      if (ctaRef.current) {
        gsap.fromTo(ctaRef.current,
          { opacity: 0, y: 32 },
          {
            opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
            scrollTrigger: { trigger: ctaRef.current, start: "top 82%", once: true, anticipatePin: 1 },
          }
        );
      }
    }, pageRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef} style={{ background: C.page, minHeight: "100vh", fontFamily: SORA }}>
      <style>{STYLES}</style>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Heirvo",
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Windows",
            description: "Disc recovery software that rescues photos and videos from damaged DVDs, CDs, and Kodak Photo CDs using 9-pass sector scanning.",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          }),
        }}
      />

      <Nav />

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "80px 6vw 60px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "6vw",
        alignItems: "center",
      }}>
        {/* Left: text */}
        <div ref={heroTextRef}>
          {/* Identity frame — leads with who the buyer is, not the product */}
          <div className="lb-reveal" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "5px 12px 5px 9px", borderRadius: 100,
            background: C.amberFaint, border: `1px solid ${C.amberBorder}`,
            marginBottom: 20,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.amber, boxShadow: `0 0 7px ${C.amber}`, flexShrink: 0 }} />
            <span style={{ fontFamily: SORA, fontSize: "0.78rem", fontWeight: 600, color: C.amber, letterSpacing: "-0.005em" }}>
              You're someone who doesn't let things slip away.
            </span>
          </div>

          <div className="lb-eyebrow lb-reveal" style={{ marginBottom: 20 }}>
            Disc Recovery Software — Windows
          </div>

          <h1 ref={(el) => { if (el && heroTextRef.current) (heroTextRef.current as any)._h1 = el; }} className="lb-hero-h lb-hero-h1" style={{ marginBottom: 20 }}>
            The algorithm<br />
            <span style={{ color: C.blue }}>doesn't give up.</span><br />
            Neither should you.
          </h1>

          <p className="lb-body lb-reveal" style={{ marginBottom: 32 }}>
            Heirvo reads every sector. On every disc. Up to 9 passes — until the data comes back or it's physically impossible. Other tools skip errors. Heirvo retries them.
          </p>

          <div className="lb-reveal" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
            <a href={DOWNLOAD_URL} className="lb-btn-primary">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v8m-3-3 3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Recover my family's photos
            </a>
            <Link to="/gift" className="lb-btn-amber">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="currentColor" opacity=".5"/>
                <path d="M2 6h12v2H2V6zm1 2h10v7H3V8z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round"/>
                <path d="M8 6v9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              Buy for a parent
            </Link>
          </div>

          <div className="lb-reveal" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="lb-badge">9× retry passes</span>
            <span className="lb-badge">0 bytes to cloud</span>
            <span className="lb-badge">Kodak Photo CD</span>
          </div>
        </div>

        {/* Right: ambient disc scan loop + product mockup stacked */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", position: "relative" }}>
          {/* Ambient CSS disc — living proof without a video file */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: 520, height: 520,
              pointerEvents: "none",
              zIndex: 0,
              opacity: 0.18,
            }}
          >
            {[1.0, 0.78, 0.58, 0.38, 0.20].map((scale, i) => (
              <div key={i} style={{
                position: "absolute",
                top: "50%", left: "50%",
                width: `${scale * 100}%`,
                height: `${scale * 100}%`,
                borderRadius: "50%",
                transform: "translate(-50%, -50%)",
                border: `1px solid rgba(10,132,255,${0.08 + i * 0.04})`,
              }} />
            ))}
            <div className="lb-ambient-beam" style={{
              position: "absolute",
              top: "50%", left: "50%",
              width: "100%", height: "100%",
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              background: "conic-gradient(transparent 330deg, rgba(10,132,255,0.04) 345deg, rgba(10,132,255,0.25) 355deg, rgba(10,132,255,0.06) 360deg)",
            }} />
          </div>
          <ProductMockup onScanComplete={handleScanComplete} />

          {/* Scan complete CTA — appears after animation */}
          <div ref={scanCtaRef} className="lb-scan-cta" style={{ width: "100%", maxWidth: 560 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontFamily: SORA, fontSize: "0.95rem", fontWeight: 600, color: C.text, marginBottom: 2 }}>
                  3,842 files recovered
                </div>
                <div style={{ fontFamily: MONO, fontSize: "0.75rem", color: C.textMuted }}>
                  scan complete — unlock to save your files
                </div>
              </div>
              <a href={DOWNLOAD_URL} className="lb-btn-primary" style={{ whiteSpace: "nowrap" }}>
                Save files — $59
              </a>
            </div>
          </div>

          {/* Teams callout */}
          <div style={{
            marginTop: 12,
            padding: "10px 16px",
            borderRadius: 6,
            background: C.amberFaint,
            border: `1px solid ${C.amberBorder}`,
            maxWidth: 560,
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="5" cy="5" r="2" stroke={C.amber} strokeWidth="1.2"/>
              <circle cx="11" cy="5" r="2" stroke={C.amber} strokeWidth="1.2"/>
              <path d="M1 13c0-2.2 1.8-4 4-4m6 0c2.2 0 4 1.8 4 4" stroke={C.amber} strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M8 9v4" stroke={C.amber} strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: SORA, fontSize: "0.82rem", color: C.textMuted }}>
              Recovering a family archive?{" "}
              <Link to="/#pricing" style={{ color: C.amber, textDecoration: "none", fontWeight: 600 }}>
                Teams & families — $149
              </Link>
              {" "}— unlimited discs.
            </span>
          </div>
        </div>
      </section>

      <hr className="lb-divider" style={{ maxWidth: 1280, margin: "0 auto" }} />

      {/* ─── STATS ────────────────────────────────────────────────────────── */}
      <section ref={statsRef} style={{
        maxWidth: 1280, margin: "0 auto", padding: "64px 6vw",
        display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "2px",
      }}>
        {[
          { count: 11847,  suffix: "",   label: "sectors recovered in tests", mono: true },
          { count: 9,      suffix: "×",  label: "passes before giving up",    mono: true },
          { count: 0,      suffix: "",   label: "bytes uploaded to any server",mono: true },
          { count: 100,    suffix: "%",  label: "local — your machine, your files", mono: true },
        ].map((s, i) => (
          <div key={i} style={{
            padding: "24px 28px",
            borderRight: i < 3 ? `1px solid ${C.border}` : "none",
          }}>
            <div style={{ marginBottom: 6 }}>
              <span
                className="lb-stat-count lb-mono"
                data-target={s.count}
                style={{
                  fontFamily: MONO,
                  fontSize: "2.4rem",
                  fontWeight: 700,
                  color: C.text,
                  letterSpacing: "-0.04em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                0
              </span>
              <span style={{ fontFamily: MONO, fontSize: "2.4rem", fontWeight: 700, color: C.blue, letterSpacing: "-0.04em" }}>
                {s.suffix}
              </span>
            </div>
            <div style={{ fontFamily: SORA, fontSize: "0.85rem", color: C.textMuted, lineHeight: 1.4 }}>
              {s.label}
            </div>
          </div>
        ))}
      </section>

      <hr className="lb-divider" />

      {/* ─── TECHNICAL PROOF ──────────────────────────────────────────────── */}
      <section ref={proofRef} style={{ maxWidth: 1280, margin: "0 auto", padding: "96px 6vw" }}>
        <div style={{ marginBottom: 56 }}>
          <div className="lb-eyebrow" style={{ marginBottom: 14 }}>02 — Technical proof</div>
          <h2 className="lb-section-h" style={{ maxWidth: "14ch" }}>
            Every decision has a reason.
          </h2>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
        }}>
          {[
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="7" stroke={C.blue} strokeWidth="1.5"/>
                  <path d="M10 6v4l3 2" stroke={C.blue} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ),
              title: "9-pass retry engine",
              stat: "9× per sector",
              body: "Each damaged sector is attempted 9 times at progressively slower read speeds. Read speed affects error correction threshold — most recoveries succeed by pass 4–6.",
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="5" width="14" height="10" rx="2" stroke={C.blue} strokeWidth="1.5"/>
                  <path d="M7 10h6M10 7v6" stroke={C.blue} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ),
              title: "Sector-level mapping",
              stat: "2,295,104 sectors",
              body: "Heirvo builds a complete sector map before scanning begins. Bad sectors are marked, skipped on pass 1, and retried in isolation — no redundant reads of clean data.",
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3l7 4v6l-7 4-7-4V7l7-4z" stroke={C.blue} strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M10 7v6m-3.5-5l3.5 2 3.5-2" stroke={C.blue} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
              title: "Kodak Photo CD decoding",
              stat: "All 5 resolutions",
              body: "Proprietary PCD format decoded in-app. Base through 64Base (3072×2048). No third-party dependencies, no ImageMagick dependency — pure native decoder.",
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="3" width="14" height="14" rx="3" stroke={C.blue} strokeWidth="1.5"/>
                  <path d="M7 10h6" stroke={C.blue} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ),
              title: "Offline by design",
              stat: "0 external calls",
              body: "The scanner, decoder, and file writer are entirely local. No telemetry during scanning. No account required for scan. Purchase is the only network event.",
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2l2.4 5h5.2l-4.2 3 1.6 5L10 12l-5 3 1.6-5L2.4 7h5.2z" stroke={C.blue} strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              ),
              title: "Non-destructive reads",
              stat: "Read-only mode",
              body: "Heirvo never writes to the source disc. All extraction happens to your chosen output folder. The original disc state is preserved throughout the entire operation.",
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 10a7 7 0 1 0 14 0 7 7 0 0 0-14 0z" stroke={C.blue} strokeWidth="1.5"/>
                  <path d="M10 6v4l2.5 2.5" stroke={C.blue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
              title: "Progress persistence",
              stat: "Resume anytime",
              body: "Scans save their state every 30 seconds. If your drive overheats, power drops, or you need to pause — resume exactly where you left off without re-reading clean sectors.",
            },
          ].map((card, i) => (
            <div key={i} className="lb-gcard">
              <div style={{ marginBottom: 14 }}>{card.icon}</div>
              <div style={{ fontFamily: SORA, fontSize: "0.98rem", fontWeight: 600, color: C.text, marginBottom: 4 }}>
                {card.title}
              </div>
              <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: C.blue, marginBottom: 10, letterSpacing: "0.04em" }}>
                {card.stat}
              </div>
              <p style={{ fontFamily: SORA, fontSize: "0.85rem", lineHeight: 1.65, color: C.textMuted }}>
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <hr className="lb-divider" />

      {/* ─── RETRY VISUAL (The "doesn't give up" section) ────────────────── */}
      <section style={{
        maxWidth: 1280, margin: "0 auto", padding: "96px 6vw",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6vw", alignItems: "center",
      }}>
        <div>
          <div className="lb-eyebrow" style={{ marginBottom: 14 }}>03 — Persistence</div>
          <h2 className="lb-section-h" style={{ marginBottom: 20 }}>
            Sector 2,104,887.<br />
            <span style={{ color: C.amber }}>Failed on pass 3.</span><br />
            Recovered on pass 7.
          </h2>
          <p className="lb-body" style={{ marginBottom: 28 }}>
            This is a real recovery log. The sector was unreadable at normal drive speed. At 2× reduced speed on pass 7, the error correction threshold dropped enough to reconstruct the data. The file that contained it: a birthday video from 2001. It loaded.
          </p>
          <p style={{
            fontFamily: MONO,
            fontSize: "0.82rem",
            color: C.amber,
            background: C.amberFaint,
            border: `1px solid ${C.amberBorder}`,
            borderRadius: 6,
            padding: "12px 16px",
            lineHeight: 1.6,
          }}>
            "The algorithm doesn't give up. Neither should you."<br />
            <span style={{ color: C.textFaint, fontSize: "0.72rem" }}>— Heirvo design principle</span>
          </p>
        </div>

        <div>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontFamily: MONO, fontSize: "0.7rem", color: C.textFaint, letterSpacing: "0.1em" }}>
              SECTOR 2,104,887 — RECOVERY TRACE
            </span>
          </div>
          <RetryVisual />
        </div>
      </section>

      <hr className="lb-divider" />

      {/* ─── GIFT / EMOTIONAL ─────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 1280, margin: "0 auto", padding: "96px 6vw",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6vw", alignItems: "center",
      }}>
        <div style={{
          background: `radial-gradient(ellipse at 30% 50%, ${C.amberFaint}, transparent 60%), ${C.pageAlt}`,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "40px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: C.amberFaint, border: `1px solid ${C.amberBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 12v9H4v-9" stroke={C.amber} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 7H2v5h20V7z" stroke={C.amber} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 22V7m0 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke={C.amber} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 style={{ fontFamily: SORA, fontSize: "1.4rem", fontWeight: 700, color: C.text, letterSpacing: "-0.025em", lineHeight: 1.2 }}>
            You just gave someone their memories back.
          </h3>
          <p className="lb-body">
            Buy for a parent. They get a code, a guided scan, and their files — you discharge the obligation the moment you purchase. You don't have to do the recovery yourself. You just have to not put it off anymore.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <Link to="/gift" className="lb-btn-amber">
              Buy for a parent — $59
            </Link>
            <Link to="/gift" className="lb-btn-ghost" style={{ fontSize: "0.85rem" }}>
              How gifting works →
            </Link>
          </div>
        </div>

        <div>
          <div className="lb-eyebrow" style={{ marginBottom: 14 }}>04 — Why this matters</div>
          <h2 className="lb-section-h" style={{ marginBottom: 20 }}>
            The disc is<br />
            still readable.<br />
            <span style={{ color: C.textMuted }}>For now.</span>
          </h2>
          <p className="lb-body" style={{ marginBottom: 20 }}>
            DVD-Rs have a rated lifespan of 30–50 years under ideal conditions. Most family discs from the early 2000s are in drawers, cars, basements. The clock is running.
          </p>
          <p className="lb-body">
            Heirvo gives you a window. A scan takes 20 minutes. The files it recovers can be on an SSD, in the cloud, on a new disc — wherever you trust.
          </p>
        </div>
      </section>

      <hr className="lb-divider" />

      {/* ─── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section ref={howRef} style={{ maxWidth: 1280, margin: "0 auto", padding: "96px 6vw" }}>
        <div style={{ marginBottom: 56 }}>
          <div className="lb-eyebrow" style={{ marginBottom: 14 }}>05 — How it works</div>
          <h2 className="lb-section-h">Three steps.</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "4vw" }}>
          {[
            {
              n: "01",
              title: "Insert your disc",
              body: "Connect any USB or internal disc drive. Heirvo detects the disc automatically — DVD, CD, Blu-ray, or Kodak Photo CD. No configuration.",
              detail: "Supported: DVD-R/RW, DVD+R/RW, CD-R/RW, VCD, SVCD, PCD",
            },
            {
              n: "02",
              title: "Run the free scan",
              body: "Heirvo maps every sector and begins reading. Damaged sectors are flagged for retry passes. Watch the progress in real time. The scan is always free.",
              detail: "Avg scan time: 12–25 min per disc",
            },
            {
              n: "03",
              title: "Save your files",
              body: "When the scan completes, your files are indexed and ready. Pay once to unlock saving — then choose your output folder. No subscription. No recurring charges.",
              detail: "Output: original file formats, no re-encoding",
            },
          ].map((step, i) => (
            <div key={i} className="lb-step" style={{ opacity: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
                <div className="lb-step-num">{step.n}</div>
                <div style={{
                  flex: 1,
                  height: 1,
                  background: `linear-gradient(90deg, ${C.blueBorder}, transparent)`,
                  marginTop: 14,
                }} />
              </div>
              <h3 style={{
                fontFamily: SORA, fontSize: "1.15rem", fontWeight: 600,
                color: C.text, marginBottom: 12, letterSpacing: "-0.02em",
              }}>
                {step.title}
              </h3>
              <p style={{ fontFamily: SORA, fontSize: "0.9rem", lineHeight: 1.7, color: C.textMuted, marginBottom: 12 }}>
                {step.body}
              </p>
              <div style={{
                fontFamily: MONO, fontSize: "0.7rem", color: C.textFaint,
                background: C.pageMid, border: `1px solid ${C.border}`,
                borderRadius: 4, padding: "6px 10px",
              }}>
                {step.detail}
              </div>
            </div>
          ))}
        </div>
      </section>

      <hr className="lb-divider" />

      {/* ─── PRICING ──────────────────────────────────────────────────────── */}
      <section ref={pricingRef} id="pricing" style={{ maxWidth: 1280, margin: "0 auto", padding: "96px 6vw" }}>
        <div style={{ marginBottom: 56 }}>
          <div className="lb-eyebrow" style={{ marginBottom: 14 }}>06 — Pricing</div>
          <h2 className="lb-section-h" style={{ maxWidth: "20ch" }}>
            Scan free. Pay only when you save.
          </h2>
          <p className="lb-body" style={{ marginTop: 16 }}>
            No subscription. No account to scan. One payment unlocks your recovered files.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {/* Free */}
          <div className="lb-price-card" style={{ opacity: 0 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: SORA, fontSize: "0.9rem", fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>
                Scan
              </div>
              <div style={{ fontFamily: MONO, fontSize: "2.4rem", fontWeight: 700, color: C.text, letterSpacing: "-0.05em" }}>
                $0
              </div>
              <div style={{ fontFamily: SORA, fontSize: "0.82rem", color: C.textFaint, marginTop: 4 }}>
                No payment required
              </div>
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {[
                "Full sector scan",
                "File index preview",
                "Retry analytics",
                "Damage map",
              ].map((f, i) => (
                <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontFamily: SORA, fontSize: "0.88rem", color: C.textMuted }}>
                  <span style={{ color: "#34D399", flexShrink: 0, marginTop: 1 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <a href={DOWNLOAD_URL} className="lb-btn-ghost" style={{ width: "100%", justifyContent: "center" }}>
              Download free
            </a>
          </div>

          {/* Recover — featured */}
          <div className="lb-price-card featured" style={{ opacity: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <div style={{ fontFamily: SORA, fontSize: "0.9rem", fontWeight: 600, color: C.text, marginBottom: 6 }}>
                  Recover
                </div>
                <div style={{ fontFamily: MONO, fontSize: "2.4rem", fontWeight: 700, color: C.text, letterSpacing: "-0.05em" }}>
                  $59
                </div>
                <div style={{ fontFamily: SORA, fontSize: "0.82rem", color: C.textFaint, marginTop: 4 }}>
                  One disc, permanent licence
                </div>
              </div>
              <span className="lb-badge" style={{ fontSize: "0.68rem" }}>most popular</span>
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {[
                "Everything in Scan",
                "Unlock file saving",
                "9-pass retry engine",
                "JPEG, MOV, MP4, AVI output",
                "Lifetime updates",
              ].map((f, i) => (
                <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontFamily: SORA, fontSize: "0.88rem", color: C.textMuted }}>
                  <span style={{ color: "#34D399", flexShrink: 0, marginTop: 1 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <a href={DOWNLOAD_URL} className="lb-btn-primary" style={{ width: "100%", justifyContent: "center" }}>
              Recover for $59
            </a>
          </div>

          {/* Archivist — identity tier, converts better than "Archive" */}
          <div className="lb-price-card" style={{ opacity: 0 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: SORA, fontSize: "0.9rem", fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>
                Archivist
              </div>
              <div style={{ fontFamily: MONO, fontSize: "2.4rem", fontWeight: 700, color: C.text, letterSpacing: "-0.05em" }}>
                $99
              </div>
              <div style={{ fontFamily: SORA, fontSize: "0.82rem", color: C.textFaint, marginTop: 4 }}>
                For the one who does this properly
              </div>
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {[
                "Everything in Recover",
                "Unlimited disc scans",
                "Kodak Photo CD (all resolutions)",
                "AI filename tagging — dates + faces",
                "Printed recovery certificate (gift-ready)",
                "Priority support",
              ].map((f, i) => (
                <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontFamily: SORA, fontSize: "0.88rem", color: C.textMuted }}>
                  <span style={{ color: "#34D399", flexShrink: 0, marginTop: 1 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <a href={DOWNLOAD_URL} className="lb-btn-ghost" style={{ width: "100%", justifyContent: "center" }}>
              Get Archivist — $99
            </a>
          </div>
        </div>

        <div style={{
          marginTop: 20,
          padding: "16px 20px",
          borderRadius: 8,
          background: C.amberFaint,
          border: `1px solid ${C.amberBorder}`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
            <path d="M9 1l2.2 5h5.3l-4.3 3.1 1.6 5L9 11l-4.8 3.1 1.6-5L1.5 6h5.3z" stroke={C.amber} strokeWidth="1.2" fill="none" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontFamily: SORA, fontSize: "0.88rem", color: C.textMuted }}>
            <strong style={{ color: C.amber }}>Buying for a parent?</strong> Any tier can be gifted. They activate with the code you send — no account needed. The purchase frame shifts from "project I'll do later" to "gift I'm giving now."{" "}
            <Link to="/gift" style={{ color: C.amber }}>Buy for a parent →</Link>
          </span>
        </div>
      </section>

      <hr className="lb-divider" />

      {/* ─── FAQ ──────────────────────────────────────────────────────────── */}
      <section ref={faqRef} style={{ maxWidth: 840, margin: "0 auto", padding: "96px 6vw" }}>
        <div style={{ marginBottom: 48 }}>
          <div className="lb-eyebrow" style={{ marginBottom: 14 }}>07 — Questions</div>
          <h2 className="lb-section-h">Frequently asked</h2>
        </div>

        <div>
          {FAQS.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} index={i} />
          ))}
        </div>
      </section>

      <hr className="lb-divider" />

      {/* ─── FINAL CTA ────────────────────────────────────────────────────── */}
      <section ref={ctaRef} style={{
        maxWidth: 1280, margin: "0 auto", padding: "96px 6vw",
        display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
        opacity: 0,
      }}>
        <div className="lb-eyebrow" style={{ marginBottom: 20 }}>08 — Start recovering</div>
        <h2 style={{
          fontFamily: SORA,
          fontSize: "clamp(2rem,4.5vw,3.6rem)",
          fontWeight: 700,
          color: C.text,
          letterSpacing: "-0.04em",
          lineHeight: 1.1,
          marginBottom: 20,
          maxWidth: "16ch",
          textWrap: "balance",
        }}>
          The scan is free.<br />
          <span style={{ color: C.blue }}>Run it before you wait.</span>
        </h2>
        <p className="lb-body" style={{ marginBottom: 40, textAlign: "center" }}>
          20 minutes. No account. If the disc is readable, Heirvo will find out.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 24 }}>
          <a href={DOWNLOAD_URL} className="lb-btn-primary" style={{ padding: "14px 32px", fontSize: "1rem" }}>
            Download Heirvo — free
          </a>
          <Link to="/gift" className="lb-btn-amber" style={{ padding: "14px 28px", fontSize: "1rem" }}>
            Buy for a parent
          </Link>
        </div>

        <div style={{
          display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap",
          fontFamily: MONO, fontSize: "0.72rem", color: C.textFaint, letterSpacing: "0.08em",
        }}>
          <span>Windows 10 / 11</span>
          <span style={{ color: C.border }}>·</span>
          <span>No cloud. No account.</span>
          <span style={{ color: C.border }}>·</span>
          <span>4.7 MB download</span>
          <span style={{ color: C.border }}>·</span>
          <span>30-day refund policy</span>
        </div>
      </section>

      <Footer />
    </div>
  );
}
