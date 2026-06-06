import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Disc3, FolderOpen, Activity, ArrowRight, Mail } from "lucide-react";
import { gsap } from "gsap";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ipc } from "@/lib/ipc";
import type { Session } from "@/lib/types";
import { staggerReveal, headingReveal, prefersReducedMotion } from "@/utils/gsap-fx";

export default function Home() {
  const [active, setActive] = useState<Session | null>(null);
  const scopeRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const bannerRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const tick = async () => {
      try {
        const list = await ipc.listSessions();
        const running = list.find(
          (s) => s.status === "recovering" || s.status === "paused",
        );
        setActive(running ?? null);
      } catch {
        /* ignore until backend ready */
      }
    };
    tick();
    const t = setInterval(tick, 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      headingReveal(headingRef.current);
      staggerReveal(scopeRef, "[data-stagger='subhead']", { delay: 0.25, y: 12 });
      // Testimonial reveals just before the tiles so users read claim → proof → action
      staggerReveal(scopeRef, "[data-stagger='quote']", { delay: 0.38, y: 10 });
      // Primary hero tile
      staggerReveal(scopeRef, "[data-stagger='tile']", { delay: 0.52, stagger: 0.09 });
      // Secondary cards stagger in after primary
      staggerReveal(scopeRef, "[data-stagger='secondary']", { delay: 0.62, stagger: 0.07 });
      // Mail-in nudge last — lowest priority
      staggerReveal(scopeRef, "[data-stagger='mailin']", { delay: 0.80, y: 8 });
    }, scopeRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!active || !bannerRef.current) return;
    if (prefersReducedMotion()) return;
    gsap.fromTo(
      bannerRef.current,
      { y: -16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" },
    );
  }, [active]);

  return (
    <div ref={scopeRef} className="relative">
      <div className="mesh-bg" />
      <div className="relative mx-auto max-w-5xl px-10 pb-8 pt-6">

        {/* ── Active-rescue banner — pinned above everything when a session is live ── */}
        {active && (
          <Link
            ref={bannerRef}
            to={`/session/${active.id}`}
            className="mb-5 flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, color-mix(in srgb, var(--db-amber) 10%, transparent) 0%, color-mix(in srgb, var(--db-amber) 6%, transparent) 100%)",
              borderColor: "color-mix(in srgb, var(--db-amber) 30%, transparent)",
              boxShadow: "0 1px 2px var(--db-shadow), var(--db-amber-glow)",
            }}
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                style={{ background: "var(--db-amber)" }}
              />
              <span
                className="relative inline-flex h-2.5 w-2.5 rounded-full"
                style={{ background: "var(--db-amber)" }}
              />
            </span>
            <Activity className="h-5 w-5 shrink-0" style={{ color: "var(--db-amber)" }} />
            <div className="flex-1">
              <div
                className="text-[14px] font-medium"
                style={{ color: "var(--db-text)", fontFamily: "var(--db-sans)" }}
              >
                Saving in progress: {active.disc_label || "Untitled disc"}
              </div>
              <div
                className="text-[12px]"
                style={{ color: "var(--db-text-muted)", fontFamily: "var(--db-sans)" }}
              >
                Click to see what we've saved so far
              </div>
            </div>
            <ArrowRight className="h-4 w-4" style={{ color: "var(--db-amber)" }} />
          </Link>
        )}

        {/* ── Header ── */}
        <header className="mb-4">
          <span
            className="eyebrow text-[12px] tracking-[0.18em]"
            data-stagger="subhead"
            style={{
              color: "var(--db-text-faint)",
              fontFamily: "var(--db-sans)",
              textTransform: "uppercase",
            }}
          >
            For DVDs, photo CDs, music CDs &amp; more
          </span>
          <h1
            ref={headingRef}
            className="mt-3 text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em]"
            style={{
              color: "var(--db-text)",
              fontFamily: "var(--db-serif)",
              textWrap: "balance",
            } as React.CSSProperties}
          >
            Let's rescue the memories on your old discs.
          </h1>
          <p
            data-stagger="subhead"
            className="mt-3 max-w-xl text-[16px] leading-[1.55]"
            style={{ color: "var(--db-text-muted)", fontFamily: "var(--db-sans)" }}
          >
            Heirvo reads your disc as many times as it takes, rescuing every
            photo, video, and song it possibly can. You don't need to know
            anything about computers — just insert the disc and follow the steps.
          </p>
        </header>

        {/* ── PRIMARY CTA: Start a rescue ──────────────────────────────────────
            Warm amber gradient — the clear focal point of the screen.
            onMouseEnter/Leave handled by GSAP for smooth spring-like motion.
        ─────────────────────────────────────────────────────────────────────── */}
        <Link
          to="/recover"
          data-stagger="tile"
          className="group mb-3 flex items-center gap-5 rounded-2xl px-6 py-5 transition-all duration-200 hover:-translate-y-[3px]"
          style={{
            background: "linear-gradient(135deg, var(--db-amber) 0%, color-mix(in srgb, var(--db-amber) 70%, #fff) 100%)",
            boxShadow: "0 2px 4px var(--db-shadow), var(--db-amber-glow)",
          }}
          onMouseEnter={(e) => {
            if (prefersReducedMotion()) return;
            gsap.to(e.currentTarget, {
              y: -4,
              duration: 0.35,
              ease: "power2.out",
              boxShadow:
                "0 2px 6px var(--db-shadow), 0 24px 56px color-mix(in srgb, var(--db-amber) 45%, transparent)",
            });
          }}
          onMouseLeave={(e) => {
            if (prefersReducedMotion()) return;
            gsap.to(e.currentTarget, {
              y: 0,
              duration: 0.45,
              ease: "power3.out",
              boxShadow: "0 2px 4px var(--db-shadow), var(--db-amber-glow)",
            });
          }}
        >
          {/* Icon in frosted-amber well */}
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "rgba(255,255,255,0.22)" }}
          >
            <Disc3 className="h-5 w-5 text-white" />
          </span>

          <div className="flex-1">
            <div
              className="text-[20px] font-semibold leading-tight tracking-tightish text-white"
              style={{ fontFamily: "var(--db-serif)" }}
            >
              Start a rescue
            </div>
            <div
              className="mt-0.5 text-[13px] leading-snug"
              style={{ color: "rgba(255,255,255,0.80)", fontFamily: "var(--db-sans)" }}
            >
              Insert any disc — DVD, photo CD, music CD, or data disc.
            </div>
          </div>

          {/* Explicit pill CTA */}
          <span
            className="hidden shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-semibold text-white transition group-hover:gap-2.5 sm:flex"
            style={{ background: "rgba(255,255,255,0.22)", fontFamily: "var(--db-sans)" }}
          >
            Begin now
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
          {/* Fallback arrow on very narrow widths */}
          <ArrowRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-0.5 sm:hidden" style={{ color: "rgba(255,255,255,0.80)" }} />
        </Link>

        {/* ── SECONDARY cards: Come back / Your rescued discs ─────────────────── */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <SecondaryCard
            to="/history"
            number="02"
            icon={<FolderOpen className="h-4 w-4" />}
            title="Come back to a disc"
            desc="Pick up where you left off, or start a new rescue from a disc you've already worked on."
            tone="amber"
          />
          <SecondaryCard
            to="/history"
            number="03"
            icon={<FolderOpen className="h-4 w-4" />}
            title="Your rescued discs"
            desc="Browse every disc you've saved. Open one to review files or gently sharpen the picture."
            tone="warm"
          />
        </div>

        {/* ── Mail-in service nudge ─────────────────────────────────────────────
            Distinct amber-warm treatment — different enough from the hero to read
            as "external service" rather than another primary navigation option.
        ─────────────────────────────────────────────────────────────────────── */}
        <button
          type="button"
          data-stagger="mailin"
          onClick={() => openUrl("https://heirvo.com/recover")}
          className="group mt-5 flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: "var(--db-surface)",
            border: "1px solid var(--db-border)",
            boxShadow: "0 1px 2px var(--db-shadow), 0 4px 14px var(--db-shadow)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {/* Warm amber icon well */}
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: "var(--db-amber-light)",
              border: "1px solid color-mix(in srgb, var(--db-amber) 25%, transparent)",
            }}
          >
            <Mail className="h-4 w-4" style={{ color: "var(--db-amber)" }} />
          </span>

          <div className="flex-1 min-w-0">
            <div
              className="text-[14px] font-semibold"
              style={{ color: "var(--db-text)", fontFamily: "var(--db-sans)" }}
            >
              No disc drive? We can still help.
            </div>
            <div
              className="text-[12px] leading-snug"
              style={{ color: "var(--db-text-muted)", fontFamily: "var(--db-sans)" }}
            >
              Mail us your disc — we'll do the rescue and send your files back safely.
            </div>
          </div>

          <ArrowRight
            className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5"
            style={{ color: "var(--db-text-faint)" }}
          />
        </button>

        {/* ── Testimonial — warm, quiet, editorial ── */}
        <figure
          data-stagger="quote"
          className="mt-5 flex items-start gap-3 rounded-2xl px-5 py-4"
          style={{
            background: "var(--db-amber-light)",
            border: "1px solid color-mix(in srgb, var(--db-amber) 18%, transparent)",
          }}
        >
          <span
            aria-hidden="true"
            className="select-none text-[2.4rem] leading-none"
            style={{
              color: "color-mix(in srgb, var(--db-amber) 45%, transparent)",
              fontFamily: "var(--db-serif)",
              marginTop: "-0.2rem",
            }}
          >
            &ldquo;
          </span>
          <div>
            <blockquote
              className="text-[15px] italic leading-[1.55]"
              style={{ color: "var(--db-text-muted)", fontFamily: "var(--db-serif)" }}
            >
              A scratched disc isn&rsquo;t always lost. Reading it again and
              again &mdash; slowly, patiently &mdash; is often what brings a
              faded photo or video back.
            </blockquote>
            <figcaption
              className="mt-2 text-[11px] uppercase tracking-[0.16em]"
              style={{ color: "var(--db-text-faint)", fontFamily: "var(--db-sans)" }}
            >
              — How Heirvo rescues a disc
            </figcaption>
          </div>
        </figure>

      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SecondaryCard
   Horizontal icon + text layout. Lighter visual weight than the hero CTA.
   GSAP hover: lift 3px + soft amber border glow. All colors via CSS tokens.
───────────────────────────────────────────────────────────────────────────── */
function SecondaryCard({
  to,
  number,
  icon,
  title,
  desc,
  tone = "amber",
}: {
  to: string;
  number: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  tone?: "amber" | "warm";
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  // Both tones pull from amber tokens — "warm" is slightly more muted
  const accentColor = "var(--db-amber)";
  const iconBg = "var(--db-amber-light)";
  const borderHoverColor =
    tone === "amber"
      ? "color-mix(in srgb, var(--db-amber) 35%, transparent)"
      : "color-mix(in srgb, var(--db-amber) 25%, transparent)";
  const glowHover =
    tone === "amber"
      ? "0 1px 2px var(--db-shadow), 0 16px 36px color-mix(in srgb, var(--db-amber) 18%, transparent)"
      : "0 1px 2px var(--db-shadow), 0 16px 36px color-mix(in srgb, var(--db-amber) 12%, transparent)";

  const onEnter = () => {
    if (prefersReducedMotion() || !ref.current) return;
    gsap.to(ref.current, {
      y: -3,
      duration: 0.35,
      ease: "power2.out",
      borderColor: borderHoverColor,
      boxShadow: glowHover,
    });
  };

  const onLeave = () => {
    if (prefersReducedMotion() || !ref.current) return;
    gsap.to(ref.current, {
      y: 0,
      duration: 0.45,
      ease: "power3.out",
      borderColor: "var(--db-border)",
      boxShadow: "0 1px 2px var(--db-shadow), 0 6px 18px var(--db-shadow)",
    });
  };

  return (
    <Link
      ref={ref}
      to={to}
      data-stagger="secondary"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="group flex items-start gap-4 rounded-2xl p-5"
      style={{
        background: "var(--db-surface)",
        border: "1px solid var(--db-border)",
        boxShadow: "0 1px 2px var(--db-shadow), 0 6px 18px var(--db-shadow)",
      }}
    >
      {/* Icon well — amber-tinted background */}
      <span
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: iconBg, color: accentColor }}
      >
        {icon}
      </span>

      <div className="flex-1 min-w-0">
        {/* Number label */}
        <span
          className="mb-1 block text-[11px] font-semibold tabular-nums tracking-[0.06em]"
          style={{ color: accentColor, fontFamily: "var(--db-serif)" }}
        >
          {number}
        </span>
        <h3
          className="text-[15px] font-semibold leading-tight tracking-tightish"
          style={{ color: "var(--db-text)", fontFamily: "var(--db-serif)" }}
        >
          {title}
        </h3>
        <p
          className="mt-1 text-[13px] leading-relaxed"
          style={{ color: "var(--db-text-muted)", fontFamily: "var(--db-sans)" }}
        >
          {desc}
        </p>
      </div>

      <ArrowRight
        className="mt-1 h-4 w-4 shrink-0 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
        style={{ color: "var(--db-text-faint)" }}
      />
    </Link>
  );
}
