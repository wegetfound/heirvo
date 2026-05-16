import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Disc } from "../data/types";
import { DiscCard } from "./DiscCard";

interface Props {
  title: string;
  sub?: string;
  discs: Disc[];
  showStatus?: boolean;
  showSource?: boolean;
  /**
   * Cap the rail at N visible cards. Anything beyond is summarised in the
   * "See all → (M more)" affordance. Default 20 — matches the Apple-style
   * editorial rail. Pass `Infinity` to disable capping.
   */
  maxVisible?: number;
  /**
   * Where the "See all" link routes to. If undefined, the link is rendered
   * but inert (the dedicated "all in this rail" route is not yet built).
   */
  seeAllHref?: string;
}

export function DiscRail({
  title,
  sub,
  discs,
  showStatus,
  showSource,
  maxVisible = 20,
  seeAllHref,
}: Props) {
  const visible = discs.slice(0, maxVisible);
  const extra = Math.max(0, discs.length - visible.length);
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
        <Link
          to={seeAllHref ?? "#"}
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
          See all{extra > 0 ? ` (${extra} more)` : ""} <ChevronRight size={14} />
        </Link>
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
        {visible.map((d) => (
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
