import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { useMeta } from "../lib/useMeta";
import { PRICING } from "../lib/pricing";

const DOWNLOAD_URL = (import.meta.env.VITE_DOWNLOAD_URL as string) || "";
const GITHUB_ISSUES = "https://github.com/heirvo/heirvo/issues";
const BETA_SPOTS = 50;

export default function Beta() {
  useMeta(
    "Heirvo Beta — Early Access for Disc Recovery",
    "Heirvo is DVD and optical disc recovery software built in Rust. Free scan. Pay once to save. First 50 people who scan a real disc get Archive free.",
    "https://heirvo.com/beta"
  );

  const scopeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-reveal]", {
        y: 28,
        opacity: 0,
        duration: 0.9,
        stagger: 0.13,
        ease: "expo.out",
        delay: 0.1,
      });
    }, scopeRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="relative">
      {/* noindex — beta page, not for search */}
      <meta name="robots" content="noindex, nofollow" />
      <Nav />
      <main ref={scopeRef} className="relative">
        <div className="mesh-bg absolute inset-0 -z-10" />

        <div className="container-narrow pt-16 pb-32 sm:pt-24">

          {/* ── Hero ───────────────────────────────────────────────── */}
          <div className="max-w-2xl mb-16" data-reveal>
            <span className="micro-label">Early access · {BETA_SPOTS} spots</span>
            <h1
              className="mt-3 font-display font-bold tracking-tightest text-ink-900"
              style={{
                fontSize: "clamp(34px, 5vw, 54px)",
                lineHeight: 1.06,
                letterSpacing: "-0.03em",
              }}
            >
              DVD recovery rebuilt in Rust.
              Shipped in 9 days.
              Help us find what we missed.
            </h1>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-500 max-w-xl">
              Heirvo reads sectors other software skips — multi-pass, fully local,
              no cloud. Free scan shows every recoverable file before you pay a cent.
              Now in early access.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 items-center">
              {DOWNLOAD_URL ? (
                <a
                  href={DOWNLOAD_URL}
                  className="btn btn-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download Free — Windows 10 / 11
                </a>
              ) : (
                <span className="btn btn-primary opacity-50 cursor-not-allowed">
                  Download coming soon
                </span>
              )}
              <span className="text-[13px] text-ink-400">No account · No subscription</span>
            </div>
          </div>

          {/* ── Origin story ───────────────────────────────────────── */}
          <div
            className="max-w-xl mb-16 pl-5 border-l-2 border-amber-400/60 space-y-4"
            data-reveal
          >
            <p className="text-[16px] leading-relaxed text-ink-600">
              I'm a borosilicate glassblower. I have DVDs going back to 2004 —
              documentation of twenty years of work I want to sell on{" "}
              <a
                href="https://boromastery.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-900 underline underline-offset-2 hover:no-underline"
              >
                boromastery.com
              </a>
              . Last year I pulled out a box and found a third of them were unreadable.
              The existing recovery software is either abandonware or a $500 lab quote.
            </p>
            <p className="text-[16px] leading-relaxed text-ink-600">
              So I used Claude Code — Anthropic's AI coding CLI — and built Heirvo in
              9 days in Pai, northern Thailand. Quiet jungle, no distractions, simple
              outdoor living. The tool held the complexity I couldn't: Rust memory
              safety, Tauri IPC, multi-pass error correction logic.
            </p>
            <p className="text-[16px] leading-relaxed text-ink-600">
              Heirvo recovered my discs. Now I want to know what it does on yours.
            </p>
          </div>

          {/* ── What makes it different ────────────────────────────── */}
          <div className="mb-16" data-reveal>
            <span className="micro-label">What makes it different</span>
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              {[
                {
                  title: "Multi-pass Rust engine",
                  body: "Reads every sector multiple times at different speeds — forward and backward. Reconstructs data that a standard file copy gives up on entirely.",
                },
                {
                  title: "Free scan, always",
                  body: "See exactly what's recoverable before you pay anything. No paywall on the scan. No time limit. You only pay when you have something worth saving.",
                },
                {
                  title: "100% local",
                  body: "Your discs and files never leave your machine. No cloud processing. No account required. Whisper transcription and AI upscaling run entirely on your hardware.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-xl border border-ink-200 bg-white/60 backdrop-blur p-6"
                >
                  <div className="font-display font-semibold text-[15px] text-ink-900 mb-2">
                    {card.title}
                  </div>
                  <p className="text-[14px] leading-relaxed text-ink-500">{card.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Beta offer ─────────────────────────────────────────── */}
          <div
            className="mb-16 rounded-2xl border border-amber-300/60 bg-amber-50/60 backdrop-blur p-8 sm:p-10"
            data-reveal
          >
            <span className="micro-label text-amber-700">Beta cohort — {BETA_SPOTS} spots</span>
            <h2
              className="mt-3 font-display font-bold text-ink-900"
              style={{ fontSize: "clamp(22px, 3vw, 30px)", letterSpacing: "-0.02em" }}
            >
              Scan a real disc. Share what you found.
              <br />
              Get Archive free.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-600 max-w-lg">
              Download Heirvo, insert a disc — damaged, scratched, or perfectly fine —
              and run the free scan. Then share your result: what it recovered, what it
              missed, and what system you're on. That's the whole deal.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-500 max-w-lg">
              First {BETA_SPOTS} people who do get{" "}
              <strong className="text-ink-700">Heirvo Archive</strong> ({PRICING.archive.label} normally)
              free permanently. Not a trial. Not a discount code. Free.
            </p>

            <div className="mt-8 flex flex-wrap gap-4 items-start">
              {DOWNLOAD_URL ? (
                <a
                  href={DOWNLOAD_URL}
                  className="btn btn-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download and scan a disc →
                </a>
              ) : (
                <span className="btn btn-primary opacity-50 cursor-not-allowed">
                  Download coming soon
                </span>
              )}
              <a
                href={GITHUB_ISSUES}
                className="btn btn-secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Share your result on GitHub →
              </a>
            </div>
            <p className="mt-4 text-[12px] text-ink-400">
              Report format: disc type · what was recovered · any errors · your OS and drive.
              One sentence is fine.
            </p>
          </div>

          {/* ── Key facts ──────────────────────────────────────────── */}
          <div className="mb-16" data-reveal>
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-[13px] text-ink-500 font-mono">
              {[
                "Windows 10 & 11",
                "Mac coming soon",
                "Rust + Tauri · React frontend",
                "No cloud · No account",
                "Free scan",
                `Pay once to save — from ${PRICING.recover.label}`,
                "Full refund if recovery fails",
              ].map((fact) => (
                <span key={fact} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-400 inline-block" />
                  {fact}
                </span>
              ))}
            </div>
          </div>

          {/* ── Pricing quick ref ──────────────────────────────────── */}
          <div className="mb-16 grid gap-4 sm:grid-cols-3 max-w-2xl" data-reveal>
            {[
              {
                name: "Recover",
                price: PRICING.recover.label,
                desc: "Unlimited recovery · MP4 export · transcription · playback",
              },
              {
                name: "Archive",
                price: PRICING.archive.label,
                desc: "Everything + personal media vault · bulk import · AI restoration · albums",
                highlight: true,
              },
              {
                name: "Family",
                price: PRICING.family.label,
                desc: "Everything + 3 seats · shared recoveries · priority support",
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`rounded-xl p-5 border text-[13px] ${
                  tier.highlight
                    ? "border-amber-400/60 bg-amber-50/40"
                    : "border-ink-200 bg-white/40"
                }`}
              >
                <div className="font-display font-semibold text-ink-900 text-[15px]">
                  {tier.name}
                </div>
                <div className="font-mono text-ink-700 mt-0.5">{tier.price} one-time</div>
                <p className="text-ink-500 mt-2 leading-snug">{tier.desc}</p>
              </div>
            ))}
          </div>

          {/* ── Claude Camp callout ────────────────────────────────── */}
          <div
            className="border-t border-ink-200 pt-8 text-[13px] text-ink-400"
            data-reveal
          >
            Heirvo was built in 9 days at{" "}
            <a
              href="https://claudecamp.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-600 hover:text-ink-900 underline underline-offset-2 transition"
            >
              Claude Camp
            </a>{" "}
            — a 7-day residential AI coding bootcamp in Pai, Thailand. The quiet jungle
            and simple outdoor living made it possible. Applications open now.
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
