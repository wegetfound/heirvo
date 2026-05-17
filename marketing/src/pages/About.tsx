import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { useMeta } from "../lib/useMeta";

export default function About() {
  useMeta(
    "About Heirvo — Who We Are & Why We Built This",
    "Heirvo is a Windows disc recovery tool built to rescue damaged home-video DVDs. Learn about our mission, methodology, and the people behind the software.",
    "https://heirvo.com/about"
  );

  useEffect(() => {
    const orgSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": "https://heirvo.com/#organization",
      "name": "Heirvo",
      "url": "https://heirvo.com",
      "logo": { "@type": "ImageObject", "url": "https://heirvo.com/assets/Icon.png", "width": 512, "height": 512 },
      "contactPoint": { "@type": "ContactPoint", "email": "hello@heirvo.com", "contactType": "customer support" },
      "description": "Heirvo builds Windows software for recovering damaged DVDs and CDs, with a focus on home video archives and family memories.",
      "knowsAbout": ["DVD recovery", "CD recovery", "optical disc data recovery", "video restoration", "disc rot"],
      "foundingDate": "2024",
    };
    const personSchema = {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": "Sasha Goldsmith",
      "jobTitle": "Founder",
      "worksFor": { "@id": "https://heirvo.com/#organization" },
      "knowsAbout": ["disc recovery", "Windows software development", "optical media", "video restoration"],
      "url": "https://heirvo.com/about",
    };
    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://heirvo.com/" },
        { "@type": "ListItem", "position": 2, "name": "About", "item": "https://heirvo.com/about" },
      ],
    };
    const scripts = [orgSchema, personSchema, breadcrumb].map((schema) => {
      const el = document.createElement("script");
      el.type = "application/ld+json";
      el.textContent = JSON.stringify(schema);
      document.head.appendChild(el);
      return el;
    });
    return () => scripts.forEach((el) => el.parentNode?.removeChild(el));
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col bg-white">
      <Nav />
      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div style={{ background: "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)", borderBottom: "1px solid #E8ECF0" }}>
          <div className="container-narrow py-14 sm:py-20 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-[11px] font-semibold tracking-wider uppercase text-brand-600 mb-5">
              About
            </div>
            <h1
              className="font-display font-bold text-ink-900 mb-5"
              style={{ fontSize: "clamp(28px, 4.5vw, 48px)", lineHeight: 1.07, letterSpacing: "-0.03em" }}
            >
              We build tools that rescue memories, not just data
            </h1>
            <p className="text-[17px] sm:text-[18px] leading-relaxed text-ink-500 max-w-[580px]">
              Heirvo is a small, independent Windows software company. Our focus is optical disc recovery — specifically the scratched, degraded, and unreadable DVDs and CDs that hold irreplaceable home video, family photos, and personal archives.
            </p>
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div className="container-narrow py-14 sm:py-18 max-w-3xl">
          <div className="prose-guide space-y-14">

            {/* Origin */}
            <section>
              <h2 className="font-display font-bold text-ink-900 mb-4" style={{ fontSize: "clamp(20px, 2.8vw, 28px)", letterSpacing: "-0.025em" }}>
                Why we built this
              </h2>
              <p className="text-[16px] leading-relaxed text-ink-600 mb-4">
                The idea for Heirvo came from a problem that turns out to be universal: a drawer full of DVDs that won't play anymore. Wedding videos. A child's first steps. A grandmother's last birthday. The discs look fine, but Windows won't read them, and every tool you try either crashes, asks you to pay $69 upfront with no idea if it'll work, or produces a corrupted file with no explanation.
              </p>
              <p className="text-[16px] leading-relaxed text-ink-600 mb-4">
                The existing tools — IsoBuster, CDRoller, DVDisaster — were built for IT professionals and data forensics engineers. They are powerful, but they were never designed for a non-technical person sitting at a kitchen table, anxious about losing footage of someone they loved.
              </p>
              <p className="text-[16px] leading-relaxed text-ink-600">
                Heirvo is built around a different premise: show the user whether their disc is recoverable <em>before</em> they pay anything, speak in plain language throughout, and never leave them wondering what's happening or whether there is still hope.
              </p>
            </section>

            {/* How it works */}
            <section>
              <h2 className="font-display font-bold text-ink-900 mb-4" style={{ fontSize: "clamp(20px, 2.8vw, 28px)", letterSpacing: "-0.025em" }}>
                How our recovery engine works
              </h2>
              <p className="text-[16px] leading-relaxed text-ink-600 mb-4">
                Most disc-reading software sends one read command per sector and moves on when it fails. Heirvo's recovery engine retries each failing sector dozens of times — at variable read speeds, forwards and backwards — building a persistent sector map that survives crashes and disc-swaps. If the disc is partially readable, it will find and extract everything it can.
              </p>
              <p className="text-[16px] leading-relaxed text-ink-600 mb-4">
                For video content, a second pipeline reconstructs playable output from whatever sectors were recovered. Even a badly damaged disc usually yields a watchable video — the goal is always a result you can show on a television, not just a folder of raw sector dumps.
              </p>
              <p className="text-[16px] leading-relaxed text-ink-600">
                When software alone isn't enough — deep gouges, delamination, severe disc rot — our mail-in service uses professional optical recovery equipment in a controlled environment. The same engine, with better hardware, and a real human examining the disc.
              </p>
            </section>

            {/* Who writes the guides */}
            <section>
              <h2 className="font-display font-bold text-ink-900 mb-4" style={{ fontSize: "clamp(20px, 2.8vw, 28px)", letterSpacing: "-0.025em" }}>
                Who writes the guides
              </h2>
              <p className="text-[16px] leading-relaxed text-ink-600 mb-4">
                The <Link to="/guides" className="text-brand-600 hover:text-brand-700 underline underline-offset-2">recovery guides on this site</Link> are written and maintained by <strong className="text-ink-800">Sasha Goldsmith</strong>, Heirvo's founder. Every procedure is tested on real discs — commercially pressed DVDs, home-burned DVD-R and DVD+R, Kodak Photo CDs, and discs with deliberate damage. We don't publish advice we haven't verified ourselves.
              </p>
              <p className="text-[16px] leading-relaxed text-ink-600">
                Where a guide references another tool — IsoBuster, DVDisaster, CDRoller — we have actually used that tool and are reporting what it does, not what its marketing page says.
              </p>
            </section>

            {/* Principles */}
            <section>
              <h2 className="font-display font-bold text-ink-900 mb-5" style={{ fontSize: "clamp(20px, 2.8vw, 28px)", letterSpacing: "-0.025em" }}>
                What we believe
              </h2>
              <div className="space-y-4">
                {[
                  { label: "Never fail the whole job for one bad sector", body: "A partial result is almost always better than an abort. Our engine always produces the most complete output the disc allows." },
                  { label: "Show the result before you ask for payment", body: "You should know whether your disc is recoverable before spending a single dollar. The free scan is real — not a preview of a preview." },
                  { label: "No technical jargon in the UI", body: "Nobody outside a lab needs to know what UDF, VOB, or sector LBA means. We translate everything into plain English." },
                  { label: "Local-first, always", body: "Your family's memories don't leave your machine. No cloud upload, no account required, no subscription. One-time purchase, runs offline." },
                ].map(({ label, body }) => (
                  <div key={label} className="rounded-xl border border-ink-150 bg-ink-50/40 p-5 sm:p-6">
                    <div className="font-display font-semibold text-ink-900 text-[15px] mb-1.5">{label}</div>
                    <p className="text-[14px] sm:text-[15px] text-ink-600 leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Contact */}
            <section>
              <h2 className="font-display font-bold text-ink-900 mb-4" style={{ fontSize: "clamp(20px, 2.8vw, 28px)", letterSpacing: "-0.025em" }}>
                Get in touch
              </h2>
              <p className="text-[16px] leading-relaxed text-ink-600 mb-4">
                Questions about the software, a specific disc problem, or the mail-in service — email us at{" "}
                <a href="mailto:hello@heirvo.com" className="text-brand-600 hover:text-brand-700 underline underline-offset-2">hello@heirvo.com</a>.
                We read everything and reply personally.
              </p>
            </section>

            {/* CTA */}
            <section className="rounded-2xl overflow-hidden">
              <div style={{ background: "linear-gradient(135deg, #0B1220 0%, #0E1A2E 100%)", padding: "40px 36px" }}>
                <h2 className="font-display font-bold text-white mb-3" style={{ fontSize: "clamp(20px, 3vw, 28px)", letterSpacing: "-0.025em" }}>
                  Try Heirvo free — no risk
                </h2>
                <p className="text-[15px] text-slate-300 leading-relaxed mb-7 max-w-[480px]">
                  Scan your disc at no cost. See exactly which files are recoverable before you decide to pay anything.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/download"
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-[14px] px-5 py-3 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M8 1.5v9m0 0L4.5 7m3.5 3.5L11.5 7M2 13h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Download Free — Windows
                  </Link>
                  <Link
                    to="/recover"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 text-slate-300 hover:text-white hover:border-white/40 font-medium text-[14px] px-5 py-3 transition-colors"
                  >
                    Mail-in recovery service →
                  </Link>
                </div>
              </div>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
