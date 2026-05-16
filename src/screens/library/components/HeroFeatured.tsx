import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import type { Disc } from "../data/types";

interface Props {
  disc: Disc;
  onThisDayLabel?: string;
}

export function HeroFeatured({ disc, onThisDayLabel = "On this day · May 16, 1999" }: Props) {
  return (
    <div
      className="lib-hero"
      style={{
        marginTop: 28,
        borderRadius: 24,
        overflow: "hidden",
        position: "relative",
        minHeight: 520,
        background:
          "radial-gradient(120% 100% at 80% 20%, #FFE1B3 0%, transparent 55%), radial-gradient(80% 100% at 10% 90%, #F3C99B 0%, transparent 60%), linear-gradient(135deg, #F6E2C2 0%, #E8B98A 45%, #C9824F 100%)",
        boxShadow: "var(--lib-shadow-card)",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          mixBlendMode: "multiply",
          opacity: 0.18,
          backgroundImage: "radial-gradient(rgba(0,0,0,.5) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />
      <div
        style={{
          position: "relative",
          padding: "56px 64px",
          display: "grid",
          gridTemplateColumns: "1.1fr .9fr",
          gap: 40,
          alignItems: "end",
          minHeight: 520,
        }}
      >
        <div>
          <div
            style={{
              textTransform: "uppercase",
              letterSpacing: ".18em",
              fontSize: 11.5,
              fontWeight: 600,
              color: "rgba(27,23,20,.65)",
              marginBottom: 18,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ width: 24, height: 1, background: "rgba(27,23,20,.5)" }} />
            {onThisDayLabel}
          </div>
          <h1
            style={{
              fontFamily: "var(--lib-serif)",
              fontWeight: 400,
              fontSize: "clamp(40px, 5vw, 64px)",
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              margin: "0 0 22px",
              color: "#2B1E12",
            }}
          >
            Hawaii, <em style={{ fontStyle: "italic", fontWeight: 300, color: "#5A3A1F" }}>
              twenty-seven years ago today.
            </em>
          </h1>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.55,
              maxWidth: 520,
              color: "rgba(27,23,20,.78)",
              margin: "0 0 30px",
            }}
          >
            {disc.about ??
              "The morning you landed on Maui. Mom was already crying at the leis, Dad couldn't find the rental car keys, and Sarah, age 9, asked the flight attendant for one more pretzel, please."}
          </p>
          <div
            style={{
              display: "flex",
              gap: 24,
              alignItems: "center",
              fontSize: 13,
              color: "rgba(27,23,20,.62)",
              marginBottom: 30,
            }}
          >
            <span>{disc.durationFormatted} recovered</span>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(27,23,20,.4)" }} />
            <span>{disc.people.length} people identified</span>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(27,23,20,.4)" }} />
            <span>Transcribed in full</span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Link to={`/watch/${disc.id}`} className="lib-btn lib-btn-primary">
              <Play size={14} fill="currentColor" stroke="none" />
              Play memory
            </Link>
            <Link to={`/disc/${disc.id}`} className="lib-btn lib-btn-ghost">
              View disc
            </Link>
          </div>
        </div>

        {/* Polaroid stack */}
        <div aria-hidden style={{ position: "relative", height: 380 }}>
          <PolaroidScene
            style={{ top: 0, right: 140, transform: "rotate(-6deg)" }}
            imgBg="radial-gradient(80% 60% at 50% 40%, #FFE082 0%, #E89A3C 50%, #8B4513 100%)"
            caption="leis at the gate"
          />
          <PolaroidScene
            style={{ top: 60, right: 0, transform: "rotate(4deg)" }}
            imgBg="linear-gradient(160deg, #4A7BA8 0%, #6FA3CF 40%, #C7E0F0 80%, #FFEBC1 100%)"
            caption="Kā‘anapali, day one"
          />
          <PolaroidScene
            style={{ top: 180, right: 90, transform: "rotate(-2deg)" }}
            imgBg="radial-gradient(60% 80% at 50% 60%, #F4D87B 0%, #C2741F 50%, #5A2A0F 100%)"
            caption="Dad & the rental car"
          />
        </div>
      </div>
    </div>
  );
}

function PolaroidScene({
  style,
  imgBg,
  caption,
}: {
  style: React.CSSProperties;
  imgBg: string;
  caption: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        width: 280,
        height: 180,
        borderRadius: 8,
        boxShadow: "0 12px 40px rgba(40,20,10,.25), 0 2px 6px rgba(40,20,10,.15)",
        background: "#FBF7EE",
        padding: "10px 10px 26px",
        transition: "transform .3s ease",
        ...style,
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: 3, background: imgBg }} />
      <div
        style={{
          position: "absolute",
          bottom: 6,
          left: 12,
          right: 12,
          fontFamily: "var(--lib-serif)",
          fontStyle: "italic",
          fontSize: 11,
          color: "#5A3A1F",
          textAlign: "center",
        }}
      >
        {caption}
      </div>
    </div>
  );
}
