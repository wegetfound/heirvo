import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { useMeta } from "../lib/useMeta";
import GUIDES from "../data/guides";

export default function GuideIndex() {
  useMeta(
    "Disc Recovery Guides — Heirvo",
    "Step-by-step guides for recovering files from scratched DVDs, damaged CDs, Kodak Photo CDs, and Blu-ray discs on Windows 10 and 11.",
    "https://heirvo.com/guides"
  );

  return (
    <div className="relative min-h-screen flex flex-col bg-white">
      <Nav />
      <main className="flex-1">
        <div style={{ background: "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)", borderBottom: "1px solid #E8ECF0" }}>
          <div className="container-narrow py-14 sm:py-20 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-[11px] font-semibold tracking-wider uppercase text-brand-600 mb-5">
              Recovery Guides
            </div>
            <h1
              className="font-display font-bold text-ink-900 tracking-tightest mb-4"
              style={{ fontSize: "clamp(30px, 5vw, 52px)", lineHeight: 1.06, letterSpacing: "-0.03em" }}
            >
              How-to guides for disc recovery
            </h1>
            <p className="text-[17px] sm:text-[18px] text-ink-500 leading-relaxed max-w-[560px]">
              Step-by-step instructions for recovering files from scratched DVDs, damaged CDs, Kodak Photo CDs, and Blu-ray discs on Windows.
            </p>
          </div>
        </div>

        <div className="container-narrow py-12 sm:py-16 max-w-3xl">
          <div className="space-y-5">
            {GUIDES.map((guide) => (
              <Link
                key={guide.slug}
                to={`/guides/${guide.slug}`}
                className="group block rounded-2xl border border-ink-150 bg-white hover:border-brand-300 hover:shadow-sm p-6 sm:p-7 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-brand-500 bg-brand-50 border border-brand-200 rounded-full px-2.5 py-0.5">
                        {guide.category}
                      </span>
                      <span className="text-[12px] text-ink-400">{guide.readTime}</span>
                    </div>
                    <h2 className="font-display font-bold text-ink-900 text-[18px] sm:text-[20px] leading-snug mb-2 group-hover:text-brand-600 transition-colors"
                      style={{ letterSpacing: "-0.02em" }}>
                      {guide.title}
                    </h2>
                    <p className="text-[14px] sm:text-[15px] text-ink-500 leading-relaxed line-clamp-2">
                      {guide.intro}
                    </p>
                  </div>
                  <div className="flex-shrink-0 mt-1 text-ink-300 group-hover:text-brand-400 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-14 rounded-2xl overflow-hidden">
            <div style={{ background: "linear-gradient(135deg, #0B1220 0%, #0E1A2E 100%)", padding: "36px 32px" }}>
              <h2 className="font-display font-bold text-white text-[20px] sm:text-[24px] mb-2" style={{ letterSpacing: "-0.025em" }}>
                Disc too damaged for software?
              </h2>
              <p className="text-[15px] text-slate-300 leading-relaxed mb-6 max-w-[440px]">
                Our mail-in service uses professional optical recovery equipment. No recovery, no charge.
              </p>
              <Link
                to="/recover"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 text-white hover:bg-white/10 font-medium text-[14px] px-5 py-3 transition-colors"
              >
                Learn about mail-in recovery →
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
