import { ChevronRight } from "lucide-react";
import type { Disc } from "../data/types";
import { DiscCard } from "./DiscCard";

interface Props {
  title: string;
  sub?: string;
  discs: Disc[];
  showStatus?: boolean;
  showSource?: boolean;
}

export function DiscRail({ title, sub, discs, showStatus, showSource }: Props) {
  return (
    <section style={{ marginTop: 64 }}>
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "var(--lib-serif)",
              fontWeight: 500,
              fontSize: 28,
              letterSpacing: "-0.015em",
              margin: 0,
              color: "var(--lib-ink)",
            }}
          >
            {title}
          </h2>
          {sub && (
            <div style={{ fontSize: 13, color: "var(--lib-muted)", marginTop: 4 }}>
              {sub}
            </div>
          )}
        </div>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--lib-amber)",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            textDecoration: "none",
          }}
        >
          See all <ChevronRight size={14} />
        </a>
      </header>
      <div
        className="lib-rail"
        style={{
          display: "flex",
          gap: 18,
          overflowX: "auto",
          overflowY: "hidden",
          scrollSnapType: "x mandatory",
          padding: "8px 32px 24px",
          margin: "0 -32px",
          scrollbarWidth: "none",
        }}
      >
        {discs.map((d) => (
          <DiscCard
            key={d.id + title}
            disc={d}
            showStatus={showStatus}
            showSource={showSource}
          />
        ))}
      </div>
    </section>
  );
}
