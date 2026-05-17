import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import {
  isLemonSqueezyConfigured,
  openLemonCheckout,
} from "../../lib/lemon-squeezy";
import { PRICING } from "../../lib/pricing";

// Swap these to real Lemon Squeezy checkout URLs once SKUs are live.
const LS_RECOVER_URL =
  import.meta.env.VITE_LS_CHECKOUT_URL ||
  "https://heirvo.lemonsqueezy.com/checkout/buy/replace-me";
const LS_ARCHIVE_URL = import.meta.env.VITE_LS_ARCHIVE_URL || "";
const LS_FAMILY_URL = import.meta.env.VITE_LS_FAMILY_URL || "";

const RECOVER_FEATURES = [
  "Unlimited disc recovery (DVD, CD, Blu-ray, Photo CD)",
  "Local AI transcription — search every spoken word",
  "Full-text search across your archive",
  "In-app playback (never leave the app to watch)",
  "1 lifetime MP4 export",
  "All future updates on this version",
];

const ARCHIVE_FEATURES = [
  "Everything in Recover",
  "Unlimited MP4 exports",
  "AI restoration — upscale & denoise footage",
  "Clip-and-share with burned-in captions",
  "Transcript & subtitle (.SRT) export",
  "Hosted private memory pages (shareable link)",
  "Priority email support",
];

const FAMILY_FEATURES = [
  "Everything in Archive",
  "3 seats — you, a sibling, and a parent",
  "Share recoveries across family members",
  "Priority support with same-day response",
];

export default function Pricing() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const cardsRef = useRef<HTMLDivElement | null>(null);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const recoverConfigured = isLemonSqueezyConfigured(LS_RECOVER_URL);
  const archiveConfigured = isLemonSqueezyConfigured(LS_ARCHIVE_URL);
  const familyConfigured = isLemonSqueezyConfigured(LS_FAMILY_URL);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const ctx = gsap.context(() => {
      if (!cardsRef.current) return;
      const cards = Array.from(cardsRef.current.children);
      gsap.set(cards, { opacity: 0, y: 24 });

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              gsap.to(cards, {
                opacity: 1,
                y: 0,
                duration: 0.75,
                stagger: 0.1,
                ease: "power3.out",
              });
              observer.disconnect();
            }
          });
        },
        { threshold: 0.12 }
      );
      observer.observe(cardsRef.current);
      return () => observer.disconnect();
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleBuy = async (tier: string, url: string) => {
    if (loadingTier) return;
    setLoadingTier(tier);
    try {
      await openLemonCheckout(url);
    } finally {
      setTimeout(() => setLoadingTier(null), 600);
    }
  };

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="relative py-20 sm:py-28"
      aria-labelledby="pricing-heading"
    >
      <div className="container-narrow">
        <div className="max-w-2xl mx-auto text-center mb-12 sm:mb-16">
          <div className="micro-label mb-3">Pricing</div>
          <h2
            id="pricing-heading"
            className="font-display font-bold tracking-tightest text-ink-900"
            style={{ fontSize: "clamp(30px,4.2vw,48px)", lineHeight: 1.06 }}
          >
            One-time purchase.{" "}
            <span className="gradient-text">Yours forever.</span>
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-500">
            No subscription, no upsells. Pay once, own it. Every future update
            on your tier is free.
          </p>
        </div>

        {/* Tier cards */}
        <div
          ref={cardsRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start"
          style={{ willChange: "transform, opacity" }}
        >
          {/* ── Tier 1: Recover ── */}
          <TierCard
            badge="Heirvo Recover"
            price={PRICING.recover.label}
            tagline="The full rescue, nothing hidden."
            features={RECOVER_FEATURES}
            highlighted={false}
            cta={
              recoverConfigured ? (
                <button
                  type="button"
                  onClick={() => handleBuy("recover", LS_RECOVER_URL)}
                  disabled={!!loadingTier}
                  aria-label="Buy Heirvo Recover for $59"
                  className="btn btn-secondary w-full !text-[15px] !py-3.5 disabled:opacity-60"
                >
                  {loadingTier === "recover" ? (
                    <><Spinner /> Opening…</>
                  ) : (
                    "Get Recover →"
                  )}
                </button>
              ) : (
                <ComingSoonBtn />
              )
            }
          />

          {/* ── Tier 2: Archive (recommended) ── */}
          <TierCard
            badge="Heirvo Archive"
            price={PRICING.archive.label}
            tagline="Unlimited exports, AI restoration, shareable memories."
            features={ARCHIVE_FEATURES}
            highlighted
            recommended
            cta={
              archiveConfigured ? (
                <button
                  type="button"
                  onClick={() => handleBuy("archive", LS_ARCHIVE_URL)}
                  disabled={!!loadingTier}
                  aria-label="Buy Heirvo Archive for $99"
                  className="btn btn-primary w-full !text-[15px] !py-3.5 disabled:opacity-60"
                >
                  {loadingTier === "archive" ? (
                    <><Spinner /> Opening…</>
                  ) : (
                    "Get Archive →"
                  )}
                </button>
              ) : (
                <ComingSoonBtn />
              )
            }
          />

          {/* ── Tier 3: Family ── */}
          <TierCard
            badge="Heirvo Family"
            price={PRICING.family.label}
            tagline="3 seats — give your siblings access to the same recovery."
            features={FAMILY_FEATURES}
            highlighted={false}
            cta={
              familyConfigured ? (
                <button
                  type="button"
                  onClick={() => handleBuy("family", LS_FAMILY_URL)}
                  disabled={!!loadingTier}
                  aria-label="Buy Heirvo Family for $149"
                  className="btn btn-secondary w-full !text-[15px] !py-3.5 disabled:opacity-60"
                >
                  {loadingTier === "family" ? (
                    <><Spinner /> Opening…</>
                  ) : (
                    "Get Family →"
                  )}
                </button>
              ) : (
                <ComingSoonBtn />
              )
            }
          />
        </div>

        {/* Trust row */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <TrustBadge icon={<ShieldIcon />} label="Secure checkout via Lemon Squeezy" />
          <TrustBadge icon={<BoltIcon />} label="Instant license delivery" />
          <TrustBadge icon={<DevicesIcon />} label="30-day money-back guarantee" />
        </div>

        {/* Fine print */}
        <p className="mt-6 text-center text-[12.5px] text-ink-400 leading-relaxed">
          Already purchased?{" "}
          <Link
            to="/activate"
            className="font-medium text-brand-600 hover:underline underline-offset-4"
          >
            Activate your key →
          </Link>
          {" · "}
          If Heirvo can't produce a playable file from your disc, we'll refund
          you — no questions asked.
        </p>
      </div>
    </section>
  );
}

/* ─── TierCard ─────────────────────────────────────────────────────────────── */

function TierCard({
  badge,
  price,
  tagline,
  features,
  highlighted,
  recommended,
  cta,
}: {
  badge: string;
  price: string;
  tagline: string;
  features: string[];
  highlighted: boolean;
  recommended?: boolean;
  cta: React.ReactNode;
}) {
  return (
    <div
      className="relative rounded-[24px] p-7"
      style={{
        background: highlighted ? "#fff" : "rgba(255,255,255,0.55)",
        border: highlighted
          ? "1.5px solid rgba(10,132,255,0.35)"
          : "1px solid rgba(0,0,0,0.08)",
        boxShadow: highlighted
          ? "0 8px 40px rgba(10,132,255,0.12), 0 1px 0 rgba(10,132,255,0.08) inset"
          : "0 2px 12px rgba(0,0,0,0.05)",
      }}
    >
      {/* Gradient top border for highlighted */}
      {highlighted && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px rounded-t-[24px]"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(10,132,255,0.7) 50%, transparent)",
          }}
        />
      )}

      {/* Recommended badge */}
      {recommended && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-gradient px-4 py-1 text-[11px] font-bold uppercase tracking-widest text-white shadow-sm">
          Most popular
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500 mb-3">
          {badge}
        </div>
        <div
          className="font-display font-bold tabular-nums tracking-tightest leading-none gradient-text"
          style={{ fontSize: "clamp(48px,7vw,64px)" }}
        >
          {price}
        </div>
        <div className="text-[12px] text-ink-500 mt-1">one-time · no subscription</div>
        <p className="mt-3 text-[14px] text-ink-600 leading-snug">{tagline}</p>
      </div>

      <div className="h-px bg-ink-100 mb-5" />

      {/* Features */}
      <ul className="space-y-3 mb-7">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-ink-700">
            <span className="mt-0.5 shrink-0 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-ios-green/12">
              <CheckIcon />
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {cta}
    </div>
  );
}

function ComingSoonBtn() {
  return (
    <button
      type="button"
      disabled
      className="w-full rounded-xl border border-ink-200 bg-ink-50 py-3.5 text-[14px] font-medium text-ink-400 cursor-default"
    >
      Coming soon
    </button>
  );
}

/* ─── Sub-components ────────────────────────────────────────────────────────── */

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 rounded-2xl bg-white/60 border border-ink-200/70 backdrop-blur px-4 py-3 text-[13px] text-ink-700">
      <span className="text-brand-600 shrink-0">{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

/* ─── Icons ─────────────────────────────────────────────────────────────────── */

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path
        d="M2 5.5L4 7.5L8 3"
        stroke="#34C759"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 1.5l5.5 2v4.2c0 3.4-2.4 6.2-5.5 6.8-3.1-.6-5.5-3.4-5.5-6.8V3.5L8 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5.75 8.25L7.25 9.75L10.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M9 1.5L3 9h4l-1 5.5L13 7H9l1-5.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function DevicesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="3" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9.5" y="6.5" width="5" height="7.5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="#fff" />
    </svg>
  );
}
