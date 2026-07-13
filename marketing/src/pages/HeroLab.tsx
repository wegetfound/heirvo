/*
 * HERO LAB — live side-by-side review of the 5 competing hero animations.
 *
 * Why this exists: the automated judge panel ran across a split filesystem
 * (two repo copies), so its scores are unreliable. This page renders every
 * concept LIVE so the human can pick the winner with their own eyes.
 *
 * Reachable at /hero-lab. Review-only — does NOT touch Landing.tsx.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMeta } from "../lib/useMeta";

import Concept1_TheLastRead from "../components/hero-concepts/Concept1_TheLastRead";
import Concept2_Resurfacing from "../components/hero-concepts/Concept2_Resurfacing";
import Concept3_DegradationReversed from "../components/hero-concepts/Concept3_DegradationReversed";
import Concept4_RescueBeam from "../components/hero-concepts/Concept4_RescueBeam";
import Concept5_FragmentsReassemble from "../components/hero-concepts/Concept5_FragmentsReassemble";

const C = {
  page: "#0B1220",
  pageAlt: "#0E1628",
  text: "#F0EDE8",
  textMuted: "#94A3B8",
  textFaint: "#5E7290",
  border: "rgba(255,255,255,0.08)",
  blue: "#0A84FF",
  amber: "#F59E0B",
  sepia: "#C8956C",
} as const;

const SORA = '"Sora", ui-sans-serif, system-ui, sans-serif';
const GARAMOND = '"Cormorant Garamond", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

type ConceptComponent = (props: { reducedMotion?: boolean }) => JSX.Element;

interface Entry {
  id: number;
  title: string;
  tagline: string;
  Component: ConceptComponent;
}

const CONCEPTS: Entry[] = [
  {
    id: 1,
    title: "The Last Read — Recovery Radar",
    tagline: "Sonar sweep ignites dead sectors into memory thumbnails. Clearest 'what Heirvo does' demo.",
    Component: Concept1_TheLastRead,
  },
  {
    id: 2,
    title: "Resurfacing — Memories Bloom From The Surface",
    tagline: "Tilted disc; memories rise out of the surface like developing polaroids. Depth & warmth.",
    Component: Concept2_Resurfacing,
  },
  {
    id: 3,
    title: "Entropy Run Backward — Loss-Aversion",
    tagline: "Opens on a disc actively rotting, then reverses the decay into a sealed archive. Strongest fear→relief.",
    Component: Concept3_DegradationReversed,
  },
  {
    id: 4,
    title: "The Rescue Beam — Editorial Minimal",
    tagline: "Linear/Arc-tier restraint. One elegant arc, warm-gold sectors, calm readout. Premium feel.",
    Component: Concept4_RescueBeam,
  },
  {
    id: 5,
    title: "Fragments Reassemble — Moonshot",
    tagline: "Canvas particle shards magnetically reassemble into one luminous memory. Most ambitious visual.",
    Component: Concept5_FragmentsReassemble,
  },
];

function ConceptCard({ entry }: { entry: Entry }) {
  const [reduced, setReduced] = useState(false);
  // remount key forces the GSAP timeline to re-run when toggled or replayed
  const [nonce, setNonce] = useState(0);
  const { Component } = entry;

  return (
    <div
      style={{
        background: C.pageAlt,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: "0.7rem", letterSpacing: "0.18em", color: C.sepia, textTransform: "uppercase" }}>
            Concept {entry.id}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setNonce((n) => n + 1)}
              style={btnStyle}
              title="Replay animation"
            >
              ↻ Replay
            </button>
            <button
              onClick={() => { setReduced((r) => !r); setNonce((n) => n + 1); }}
              style={{ ...btnStyle, color: reduced ? C.amber : C.textMuted, borderColor: reduced ? "rgba(245,158,11,0.4)" : C.border }}
              title="Toggle reduced-motion (static final frame)"
            >
              {reduced ? "● Reduced-motion ON" : "○ Reduced-motion"}
            </button>
          </div>
        </div>
        <h2 style={{ fontFamily: GARAMOND, fontStyle: "italic", fontWeight: 400, fontSize: "1.5rem", color: C.text, lineHeight: 1.15, marginBottom: 6 }}>
          {entry.title}
        </h2>
        <p style={{ fontFamily: SORA, fontSize: "0.82rem", color: C.textMuted, lineHeight: 1.5 }}>
          {entry.tagline}
        </p>
      </div>

      {/* Live stage */}
      <div
        style={{
          flex: 1,
          minHeight: 420,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.5rem",
          background: "radial-gradient(700px 400px at 70% 30%, rgba(10,132,255,0.06), transparent 60%)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 560 }}>
          <Component key={nonce} reducedMotion={reduced} />
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: "0.66rem",
  letterSpacing: "0.05em",
  color: C.textMuted,
  background: "transparent",
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "5px 10px",
  cursor: "pointer",
};

export default function HeroLab() {
  // Internal design-review page — must not be indexed.
  useMeta(
    "Hero Lab — Internal Review",
    "Internal side-by-side review of hero animation concepts.",
    "https://heirvo.com/hero-lab",
    "noindex, nofollow"
  );

  return (
    <div style={{ background: C.page, minHeight: "100vh", color: C.text, fontFamily: SORA }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,400&family=Sora:wght@400;600&family=JetBrains+Mono:wght@400&display=swap');`}</style>

      {/* Header */}
      <header style={{ maxWidth: 1400, margin: "0 auto", padding: "3rem 4vw 1.5rem" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontFamily: MONO, fontSize: "0.7rem", letterSpacing: "0.2em", color: C.sepia, textTransform: "uppercase", marginBottom: 10 }}>
              Hero Animation Competition · Live Review
            </p>
            <h1 style={{ fontFamily: GARAMOND, fontStyle: "italic", fontWeight: 400, fontSize: "clamp(2rem,4vw,3rem)", color: C.text, lineHeight: 1.1 }}>
              Pick the hero that makes you fear losing your memories — and feel the rescue.
            </h1>
          </div>
          <Link to="/" style={{ fontFamily: MONO, fontSize: "0.72rem", color: C.blue, textDecoration: "none", whiteSpace: "nowrap" }}>
            ← back to landing
          </Link>
        </div>
        <p style={{ fontFamily: SORA, fontSize: "0.9rem", color: C.textMuted, maxWidth: 720, lineHeight: 1.6, marginTop: 16 }}>
          All five concepts render live below. Use <strong style={{ color: C.text }}>Replay</strong> to re-watch the
          full sequence and <strong style={{ color: C.text }}>Reduced-motion</strong> to preview the accessible static
          frame. The automated judges scored across a split filesystem, so trust your eyes here — whichever one lands
          hardest wins and goes into the live hero.
        </p>
      </header>

      {/* Grid */}
      <main
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "1.5rem 4vw 5rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))",
          gap: "1.75rem",
        }}
      >
        {CONCEPTS.map((entry) => (
          <ConceptCard key={entry.id} entry={entry} />
        ))}
      </main>
    </div>
  );
}
