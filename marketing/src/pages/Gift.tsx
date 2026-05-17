import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { useMeta } from "../lib/useMeta";

gsap.registerPlugin(ScrollTrigger);

const DOWNLOAD_URL: string =
  (import.meta.env.VITE_DOWNLOAD_URL as string) || "#";

const SORA = '"Sora", ui-sans-serif, system-ui, sans-serif';

// Match LandingMin1 palette so brand visual language stays consistent.
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
  blueBorder:   "rgba(10,132,255,0.30)",
  amber:        "#F59E0B",
  amberHover:   "#FBB03B",
  amberFaint:   "rgba(245,158,11,0.10)",
  amberBorder:  "rgba(245,158,11,0.25)",
  grain:        "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
} as const;

const GIFT_SCHEMA = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Heirvo — The gift of recovered home videos",
  description:
    "Heirvo turns your parents' shoebox of damaged DVDs and CDs into a searchable archive of family memories. The most personal gift you can give for Mother's Day, Father's Day, birthdays, and Christmas.",
  brand: { "@type": "Brand", name: "Heirvo" },
  offers: {
    "@type": "Offer",
    price: "39.00",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: "https://heirvo.com/gift",
  },
});

export default function Gift() {
  useMeta(
    "The gift of recovered home videos — Heirvo for Mom, Dad, and grandparents",
    "Give your parents their wedding video back. Heirvo recovers damaged DVDs and CDs and turns them into a searchable archive of family memories. The most personal gift for Mother's Day, Father's Day, birthdays, and Christmas.",
    "https://heirvo.com/gift"
  );

  const heroRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<HTMLElement>(null);
  const seasonRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = GIFT_SCHEMA;
    document.head.appendChild(script);
    return () => { script.parentNode?.removeChild(script); };
  }, []);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      if (heroRef.current) {
        gsap.from(heroRef.current.querySelectorAll(".gift-hero-stagger"), {
          y: 24, opacity: 0, duration: 0.9, stagger: 0.1, ease: "power3.out",
        });
      }
      [storyRef, stepsRef, seasonRef, ctaRef].forEach((r) => {
        if (!r.current) return;
        gsap.from(r.current, {
          y: 32, opacity: 0, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: r.current, start: "top 82%", once: true },
        });
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div style={{
      background: C.page, color: C.text, fontFamily: SORA,
      overflowX: "hidden", position: "relative", minHeight: "100vh",
      display: "flex", flexDirection: "column",
    }}>
      <div aria-hidden style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999,
        backgroundImage: C.grain, backgroundSize: "200px 200px",
        opacity: 0.3, mixBlendMode: "overlay",
      }} />

      <Nav />

      <main style={{ flex: 1 }}>
        {/* ═══════════════════════════════════════════════════════════════
            HERO
            ═══════════════════════════════════════════════════════════════ */}
        <section
          aria-labelledby="gift-hero-heading"
          style={{
            padding: "100px 32px 80px",
            position: "relative" as const,
            overflow: "hidden",
          }}
        >
          <div aria-hidden style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(ellipse 65% 60% at 50% 30%, rgba(245,158,11,0.08) 0%, transparent 65%)",
          }} />

          <div ref={heroRef} style={{
            maxWidth: 880, margin: "0 auto", textAlign: "center" as const,
            position: "relative" as const,
          }}>
            <div className="gift-hero-stagger" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 14px", borderRadius: 100,
              background: C.amberFaint, border: `1px solid ${C.amberBorder}`,
              fontFamily: SORA, fontSize: 11, fontWeight: 700,
              color: C.amber, letterSpacing: "0.14em",
              textTransform: "uppercase" as const, marginBottom: 28,
            }}>
              <span aria-hidden style={{ fontSize: 13 }}>🎁</span>
              The gift guide · For Mom, Dad, and grandparents
            </div>

            <h1
              id="gift-hero-heading"
              className="gift-hero-stagger"
              style={{
                fontFamily: SORA, fontWeight: 700,
                fontSize: "clamp(2.4rem, 5.5vw, 4rem)",
                lineHeight: 1.06, letterSpacing: "-0.035em",
                color: C.text, marginBottom: 28,
              }}
            >
              The most personal gift{" "}
              <span style={{ color: C.amber }}>
                you can give them.
              </span>
            </h1>

            <p className="gift-hero-stagger" style={{
              fontFamily: SORA, fontSize: "clamp(16px, 1.8vw, 19px)",
              color: C.textMuted, lineHeight: 1.65,
              maxWidth: 620, margin: "0 auto 44px",
            }}>
              You can't buy your parents another wedding day. But you can give
              them back the one they had — the tape that's been sitting in
              the attic, scratched, unwatched, half-forgotten. Heirvo turns
              that shoebox of damaged DVDs into a searchable family archive
              they'll cry over and watch a hundred times.
            </p>

            <div className="gift-hero-stagger" style={{
              display: "flex", gap: 14, flexWrap: "wrap" as const,
              justifyContent: "center", alignItems: "center", marginBottom: 22,
            }}>
              <a
                href={DOWNLOAD_URL}
                aria-label="Download Heirvo free to start recovering your parents' discs"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 9,
                  padding: "15px 26px", borderRadius: 10,
                  background: C.amber, color: "#0B0800",
                  fontFamily: SORA, fontSize: 14, fontWeight: 700,
                  letterSpacing: "-0.01em", textDecoration: "none",
                  transition: "background 0.18s ease, box-shadow 0.18s ease",
                  boxShadow: "0 4px 24px rgba(245,158,11,0.35)",
                  whiteSpace: "nowrap" as const,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = C.amberHover;
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 36px rgba(245,158,11,0.5)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = C.amber;
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(245,158,11,0.35)";
                }}
              >
                Download Heirvo Free
              </a>
              <Link
                to="/recover"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "14px 22px", borderRadius: 10,
                  background: "transparent", color: C.text,
                  fontFamily: SORA, fontSize: 14, fontWeight: 500,
                  letterSpacing: "-0.01em", textDecoration: "none",
                  border: `1.5px solid ${C.borderMed}`,
                  transition: "border-color 0.18s ease, color 0.18s ease",
                  whiteSpace: "nowrap" as const,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = C.borderBright;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = C.borderMed;
                }}
              >
                Or mail us the discs
              </Link>
            </div>

            <p className="gift-hero-stagger" style={{
              fontFamily: SORA, fontSize: 12, color: C.textFaint,
              maxWidth: 480, margin: "0 auto",
            }}>
              Free to scan · $59 one-time to save · Works on Windows 10 / 11 · No subscription, ever
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            STORY — what's actually in the shoebox
            ═══════════════════════════════════════════════════════════════ */}
        <section ref={storyRef} style={{ padding: "60px 32px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{
              background: `linear-gradient(135deg, rgba(245,158,11,0.06) 0%, ${C.pageAlt} 60%)`,
              border: `1px solid ${C.amberBorder}`,
              borderRadius: 20,
              padding: "clamp(40px, 5vw, 72px)",
            }}>
              <div style={{
                fontFamily: SORA, fontSize: 10, fontWeight: 700,
                letterSpacing: "0.16em", textTransform: "uppercase" as const,
                color: C.amber, marginBottom: 18,
              }}>
                The shoebox in the attic
              </div>

              <h2 style={{
                fontFamily: SORA, fontWeight: 700,
                fontSize: "clamp(1.7rem, 3.2vw, 2.5rem)",
                lineHeight: 1.12, letterSpacing: "-0.03em",
                color: C.text, marginBottom: 28, maxWidth: 760,
              }}>
                The gift they never knew to ask for.
              </h2>

              <div style={{
                display: "grid", gap: 28,
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                marginBottom: 8,
              }}>
                {[
                  {
                    emoji: "💍",
                    title: "The wedding tape",
                    body: "Mom's wedding video sat in a Tupperware box since 2003. The disc is scratched, the player is broken, and she never sees it. You hand her a thumb drive on Mother's Day with the whole thing restored — and the moment her dad walked her down the aisle, indexed and searchable.",
                  },
                  {
                    emoji: "👶",
                    title: "The first words",
                    body: "Your dad recorded every kid's first words on the camcorder, burned them to DVDs, labeled them with a Sharpie that's faded off. Heirvo pulls them all back. You search 'Daddy' across 14 tapes and watch the moment each of you said it for the first time.",
                  },
                  {
                    emoji: "🕯️",
                    title: "The voice you forgot",
                    body: "After a parent passes, the hardest thing isn't forgetting their face — it's forgetting their voice. The home videos in the cabinet are the last recordings that exist. Heirvo recovers them and makes every word searchable, so grandkids can hear them tell the story of the day they were born.",
                  },
                ].map((v) => (
                  <div key={v.title}>
                    <div aria-hidden style={{ fontSize: 28, marginBottom: 14 }}>{v.emoji}</div>
                    <h3 style={{
                      fontFamily: SORA, fontWeight: 600, fontSize: 17,
                      color: C.text, marginBottom: 10, letterSpacing: "-0.015em",
                    }}>
                      {v.title}
                    </h3>
                    <p style={{
                      fontFamily: SORA, fontSize: 14, color: C.textMuted,
                      lineHeight: 1.7,
                    }}>
                      {v.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            HOW IT WORKS — 3 steps for the gift-giver
            ═══════════════════════════════════════════════════════════════ */}
        <section ref={stepsRef} style={{ padding: "60px 32px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{
              fontFamily: SORA, fontSize: 10, fontWeight: 700,
              letterSpacing: "0.16em", textTransform: "uppercase" as const,
              color: C.amber, marginBottom: 14, textAlign: "center" as const,
            }}>
              How to give it
            </div>
            <h2 style={{
              fontFamily: SORA, fontWeight: 700,
              fontSize: "clamp(1.7rem, 3.2vw, 2.5rem)",
              lineHeight: 1.1, letterSpacing: "-0.03em",
              color: C.text, marginBottom: 48,
              textAlign: "center" as const, maxWidth: 720, margin: "0 auto 48px",
            }}>
              Three weekends. One thumb drive. A reaction you'll never forget.
            </h2>

            <div style={{
              display: "grid", gap: 24,
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}>
              {[
                {
                  n: "01",
                  title: "Quietly borrow the box",
                  body: "Next time you visit, ask if you can take the old discs home. Tell them you want to digitise a few. Don't promise anything specific — let it be a surprise.",
                },
                {
                  n: "02",
                  title: "Run Heirvo over a weekend",
                  body: "Plug a USB DVD drive into your laptop. Feed in one disc at a time. Heirvo recovers, transcribes, and indexes everything in the background — even the discs your computer says are dead.",
                },
                {
                  n: "03",
                  title: "Hand them the thumb drive",
                  body: "Load every recovered video onto a thumb drive (or a tablet they already know how to use). Watch them search 'birthday' and jump straight to a moment they haven't seen in 22 years.",
                },
              ].map((s) => (
                <div key={s.n} style={{
                  padding: 32, borderRadius: 16,
                  background: C.pageAlt,
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{
                    fontFamily: SORA, fontWeight: 800, fontSize: 32,
                    color: C.amber, letterSpacing: "-0.04em",
                    marginBottom: 18, lineHeight: 1,
                  }}>
                    {s.n}
                  </div>
                  <h3 style={{
                    fontFamily: SORA, fontWeight: 600, fontSize: 17,
                    color: C.text, marginBottom: 12, letterSpacing: "-0.015em",
                  }}>
                    {s.title}
                  </h3>
                  <p style={{
                    fontFamily: SORA, fontSize: 14, color: C.textMuted,
                    lineHeight: 1.65,
                  }}>
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            SEASONAL OCCASIONS — Mother's Day, Father's Day, Christmas
            ═══════════════════════════════════════════════════════════════ */}
        <section ref={seasonRef} style={{ padding: "60px 32px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{
              padding: "clamp(36px, 4vw, 56px)",
              borderRadius: 20,
              background: `linear-gradient(135deg, rgba(10,132,255,0.05) 0%, ${C.pageAlt} 70%)`,
              border: `1px solid ${C.border}`,
            }}>
              <div style={{
                display: "grid", gap: 32,
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                alignItems: "start",
              }}>
                <div>
                  <div style={{
                    fontFamily: SORA, fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.16em", textTransform: "uppercase" as const,
                    color: C.amber, marginBottom: 14,
                  }}>
                    The right occasion
                  </div>
                  <h2 style={{
                    fontFamily: SORA, fontWeight: 700,
                    fontSize: "clamp(1.5rem, 2.6vw, 2rem)",
                    lineHeight: 1.15, letterSpacing: "-0.03em",
                    color: C.text, marginBottom: 16,
                  }}>
                    Better than any flowers, any sweater, any restaurant.
                  </h2>
                  <p style={{
                    fontFamily: SORA, fontSize: 15, color: C.textMuted,
                    lineHeight: 1.7,
                  }}>
                    The gifts that land hardest are the ones nobody could
                    have bought. A recovered home video isn't a thing on a
                    shelf — it's a moment they'd given up on ever seeing
                    again. Plan ahead for the occasions where this lands
                    loudest.
                  </p>
                </div>

                <div>
                  {[
                    { season: "Mother's Day", note: "Start in late March — recovery takes a weekend per box." },
                    { season: "Father's Day", note: "Dad's old camcorder tapes are the highest-emotional payoff." },
                    { season: "Milestone birthday (60, 70, 80)", note: "Pair with a memory book printed from transcript highlights." },
                    { season: "Christmas / Hanukkah", note: "The whole family sees the reaction. Bring tissues." },
                    { season: "After a loss", note: "The gentlest way to bring back someone's voice. Take it slow." },
                  ].map((o, i, arr) => (
                    <div key={o.season} style={{
                      paddingTop: i === 0 ? 0 : 14,
                      paddingBottom: 14,
                      borderBottom: i === arr.length - 1 ? "none" : `1px solid ${C.border}`,
                    }}>
                      <div style={{
                        fontFamily: SORA, fontSize: 14, fontWeight: 600,
                        color: C.text, marginBottom: 4, letterSpacing: "-0.01em",
                      }}>
                        {o.season}
                      </div>
                      <div style={{
                        fontFamily: SORA, fontSize: 13, color: C.textMuted,
                        lineHeight: 1.55,
                      }}>
                        {o.note}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            FINAL CTA
            ═══════════════════════════════════════════════════════════════ */}
        <section ref={ctaRef} style={{ padding: "80px 32px 120px" }}>
          <div style={{
            maxWidth: 760, margin: "0 auto", textAlign: "center" as const,
          }}>
            <h2 style={{
              fontFamily: SORA, fontWeight: 700,
              fontSize: "clamp(1.7rem, 3.2vw, 2.5rem)",
              lineHeight: 1.1, letterSpacing: "-0.03em",
              color: C.text, marginBottom: 18,
            }}>
              Start with one disc tonight.
            </h2>
            <p style={{
              fontFamily: SORA, fontSize: 16, color: C.textMuted,
              lineHeight: 1.65, marginBottom: 36,
              maxWidth: 540, margin: "0 auto 36px",
            }}>
              You don't have to commit to the whole shoebox. Pick the one
              that means the most, run Heirvo over coffee, see what it pulls
              back. The first surprise is on the house — scanning is always
              free.
            </p>

            <div style={{
              display: "flex", gap: 14, flexWrap: "wrap" as const,
              justifyContent: "center", alignItems: "center", marginBottom: 18,
            }}>
              <a
                href={DOWNLOAD_URL}
                aria-label="Download Heirvo free and start with one disc"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 9,
                  padding: "15px 28px", borderRadius: 10,
                  background: C.amber, color: "#0B0800",
                  fontFamily: SORA, fontSize: 14, fontWeight: 700,
                  letterSpacing: "-0.01em", textDecoration: "none",
                  transition: "background 0.18s ease, box-shadow 0.18s ease",
                  boxShadow: "0 4px 24px rgba(245,158,11,0.35)",
                  whiteSpace: "nowrap" as const,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = C.amberHover;
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 36px rgba(245,158,11,0.5)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = C.amber;
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(245,158,11,0.35)";
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 3v13M6 11l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Download Heirvo Free
              </a>
              <Link
                to="/"
                style={{
                  fontFamily: SORA, fontSize: 13, fontWeight: 500,
                  color: C.textMuted, textDecoration: "none",
                  borderBottom: `1px solid ${C.border}`,
                  paddingBottom: 1,
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.text; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
              >
                ← Back to homepage
              </Link>
            </div>

            <p style={{
              fontFamily: SORA, fontSize: 12, color: C.textFaint,
              lineHeight: 1.6,
            }}>
              Free forever to scan and preview. $59 one-time unlocks save
              + AI restoration. If your disc is too damaged for software,
              we offer mail-in recovery from $89 — and credit your Heirvo
              purchase toward it.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
