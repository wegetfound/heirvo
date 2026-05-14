import { useEffect } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { useMeta } from "../lib/useMeta";
import GUIDES, { getGuide, type Guide, type GuideSection } from "../data/guides";

const DOWNLOAD_URL = (import.meta.env.VITE_DOWNLOAD_URL as string) || "/download";

export default function GuidePost() {
  const { slug } = useParams<{ slug: string }>();
  const guide = slug ? getGuide(slug) : undefined;

  if (!guide) return <Navigate to="/guides" replace />;

  return <GuideContent guide={guide} />;
}

function GuideContent({ guide }: { guide: Guide }) {
  useMeta(guide.metaTitle, guide.metaDescription, `https://heirvo.com/guides/${guide.slug}`);

  useEffect(() => {
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": guide.title,
      "description": guide.metaDescription,
      "datePublished": guide.datePublished,
      "dateModified": guide.dateModified,
      "author": {
        "@type": "Organization",
        "@id": "https://heirvo.com/#organization",
        "name": "Heirvo",
        "url": "https://heirvo.com",
      },
      "publisher": {
        "@type": "Organization",
        "@id": "https://heirvo.com/#organization",
        "name": "Heirvo",
        "url": "https://heirvo.com",
        "logo": { "@type": "ImageObject", "url": "https://heirvo.com/assets/Icon.png", "width": 512, "height": 512 },
      },
      "mainEntityOfPage": { "@type": "WebPage", "@id": `https://heirvo.com/guides/${guide.slug}` },
      "image": "https://heirvo.com/assets/hero.png",
      "inLanguage": "en-US",
      "isPartOf": { "@type": "WebSite", "@id": "https://heirvo.com/#website", "name": "Heirvo" },
      "about": { "@type": "SoftwareApplication", "@id": "https://heirvo.com/#software" },
      "keywords": "disc recovery, DVD recovery, CD recovery, optical disc, scratched disc, data recovery",
    };
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": guide.faq.map((item) => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": { "@type": "Answer", "text": item.a },
      })),
    };
    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://heirvo.com/" },
        { "@type": "ListItem", "position": 2, "name": "Guides", "item": "https://heirvo.com/guides" },
        { "@type": "ListItem", "position": 3, "name": guide.title, "item": `https://heirvo.com/guides/${guide.slug}` },
      ],
    };
    const scripts = [articleSchema, faqSchema, breadcrumb].map((schema) => {
      const el = document.createElement("script");
      el.type = "application/ld+json";
      el.textContent = JSON.stringify(schema);
      document.head.appendChild(el);
      return el;
    });
    return () => scripts.forEach((el) => el.parentNode?.removeChild(el));
  }, [guide]);

  const calloutBg: Record<string, string> = {
    blue: "rgba(10,132,255,0.06)",
    amber: "rgba(245,158,11,0.06)",
    green: "rgba(52,199,89,0.06)",
  };
  const calloutBorder: Record<string, string> = {
    blue: "rgba(10,132,255,0.25)",
    amber: "rgba(245,158,11,0.25)",
    green: "rgba(52,199,89,0.25)",
  };
  const calloutLabel: Record<string, string> = {
    blue: "#0A84FF",
    amber: "#B45309",
    green: "#16A34A",
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-white">
      <Nav />
      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div
          style={{
            background: "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
            borderBottom: "1px solid #E8ECF0",
          }}
        >
          <div className="container-narrow py-12 sm:py-16 max-w-3xl">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-[13px] text-ink-400">
              <Link to="/" className="hover:text-ink-700 transition">Home</Link>
              <span aria-hidden>/</span>
              <Link to="/guides" className="hover:text-ink-700 transition">Guides</Link>
              <span aria-hidden>/</span>
              <span className="text-ink-600 truncate max-w-[240px]">{guide.title}</span>
            </nav>

            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-[11px] font-semibold tracking-wider uppercase text-brand-600 mb-5">
              {guide.category}
            </div>
            <h1
              className="font-display font-bold text-ink-900 tracking-tightest mb-5"
              style={{ fontSize: "clamp(26px, 4vw, 44px)", lineHeight: 1.08, letterSpacing: "-0.03em" }}
            >
              {guide.title}
            </h1>
            <p className="text-[17px] sm:text-[18px] leading-relaxed text-ink-500 max-w-[600px] mb-6">
              {guide.intro}
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-ink-400">
              <span>Updated {new Date(guide.dateModified).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
              <span aria-hidden>·</span>
              <span>{guide.readTime}</span>
              <span aria-hidden>·</span>
              <span>By Heirvo</span>
            </div>
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div className="container-narrow py-12 sm:py-16 max-w-3xl">
          <div className="prose-guide">

            {guide.sections.map((section) => (
              <SectionBlock
                key={section.id}
                section={section}
                calloutBg={calloutBg}
                calloutBorder={calloutBorder}
                calloutLabel={calloutLabel}
              />
            ))}

            {/* ── FAQ ───────────────────────────────────────────────────── */}
            <section id="faq" className="mt-14 scroll-mt-24">
              <h2 className="font-display font-bold text-ink-900 mb-8"
                style={{ fontSize: "clamp(22px, 3vw, 30px)", letterSpacing: "-0.025em" }}>
                Frequently asked questions
              </h2>
              <div className="space-y-5">
                {guide.faq.map((item, i) => (
                  <div key={i} className="rounded-xl border border-ink-150 bg-ink-50/50 p-5 sm:p-6">
                    <h3 className="font-display font-semibold text-ink-900 text-[16px] mb-2 leading-snug">
                      {item.q}
                    </h3>
                    <p className="text-[15px] text-ink-600 leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── CTA ───────────────────────────────────────────────────── */}
            <section className="mt-14 rounded-2xl overflow-hidden">
              <div
                style={{
                  background: "linear-gradient(135deg, #0B1220 0%, #0E1A2E 100%)",
                  padding: "40px 36px",
                }}
              >
                <h2
                  className="font-display font-bold text-white mb-3"
                  style={{ fontSize: "clamp(20px, 3vw, 28px)", letterSpacing: "-0.025em" }}
                >
                  {guide.cta.heading}
                </h2>
                <p className="text-[15px] text-slate-300 leading-relaxed mb-7 max-w-[480px]">
                  {guide.cta.body}
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={guide.cta.primaryHref === "/download" ? DOWNLOAD_URL : guide.cta.primaryHref}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-[14px] px-5 py-3 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M8 1.5v9m0 0L4.5 7m3.5 3.5L11.5 7M2 13h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {guide.cta.primaryLabel}
                  </a>
                  {guide.cta.secondaryLabel && guide.cta.secondaryHref && (
                    <Link
                      to={guide.cta.secondaryHref}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 text-slate-300 hover:text-white hover:border-white/40 font-medium text-[14px] px-5 py-3 transition-colors"
                    >
                      {guide.cta.secondaryLabel}
                      <span aria-hidden>→</span>
                    </Link>
                  )}
                </div>
              </div>
            </section>

          </div>

          {/* Related guides */}
          <div className="mt-16 pt-10 border-t border-ink-100">
            <p className="text-[12px] uppercase tracking-[0.14em] text-ink-400 font-semibold mb-5">More guides</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 2).map((g) => (
                <Link
                  key={g.slug}
                  to={`/guides/${g.slug}`}
                  className="group block rounded-xl border border-ink-150 bg-white hover:border-brand-300 hover:bg-brand-50/30 p-5 transition-colors"
                >
                  <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-brand-500 mb-2">
                    {g.category}
                  </div>
                  <div className="font-display font-semibold text-ink-900 text-[15px] leading-snug group-hover:text-brand-600 transition-colors">
                    {g.title}
                  </div>
                  <div className="mt-1.5 text-[13px] text-ink-400">{g.readTime}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function SectionBlock({
  section,
  calloutBg,
  calloutBorder,
  calloutLabel,
}: {
  section: GuideSection;
  calloutBg: Record<string, string>;
  calloutBorder: Record<string, string>;
  calloutLabel: Record<string, string>;
}) {
  const HeadingTag = (section.level === 3 ? "h3" : "h2") as "h2" | "h3";
  const headingStyle = section.level === 3
    ? { fontSize: "clamp(16px, 2vw, 19px)", letterSpacing: "-0.018em" }
    : { fontSize: "clamp(20px, 2.5vw, 26px)", letterSpacing: "-0.025em" };

  return (
    <section id={section.id} className="mt-12 scroll-mt-24 first:mt-0">
      {section.heading && (
        <HeadingTag
          className="font-display font-bold text-ink-900 mb-4"
          style={headingStyle}
        >
          {section.heading}
        </HeadingTag>
      )}

      {section.paragraphs?.map((p, i) => (
        <p key={i} className="text-[16px] leading-relaxed text-ink-600 mb-4">
          {p}
        </p>
      ))}

      {section.items && section.numbered && (
        <ol className="space-y-3 my-5">
          {section.items.map((item, i) => (
            <li key={i} className="flex gap-4">
              <span
                className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-bold text-white mt-0.5"
                style={{ background: "#0A84FF", minWidth: 28 }}
              >
                {i + 1}
              </span>
              <span className="text-[16px] leading-relaxed text-ink-700 pt-0.5">{item}</span>
            </li>
          ))}
        </ol>
      )}

      {section.items && !section.numbered && (
        <ul className="space-y-2.5 my-5">
          {section.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-[16px] leading-relaxed text-ink-700">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="flex-shrink-0 mt-1">
                <path d="M3 8.5L6.5 12L13 4" stroke="#0A84FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      )}

      {section.callout && (
        <div
          className="rounded-xl my-6 p-5"
          style={{
            background: calloutBg[section.callout.color ?? "blue"],
            border: `1px solid ${calloutBorder[section.callout.color ?? "blue"]}`,
          }}
        >
          <div
            className="text-[11px] font-bold uppercase tracking-[0.14em] mb-1.5"
            style={{ color: calloutLabel[section.callout.color ?? "blue"] }}
          >
            {section.callout.label}
          </div>
          <p className="text-[15px] leading-relaxed text-ink-700">{section.callout.text}</p>
        </div>
      )}

      {section.table && (
        <div className="overflow-x-auto my-6 rounded-xl border border-ink-150">
          {section.table.caption && (
            <p className="text-[12px] text-ink-400 px-4 pt-3 pb-1">{section.table.caption}</p>
          )}
          <table className="w-full text-[14px]">
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E8ECF0" }}>
                {section.table.headers.map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-ink-700 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: ri < section.table!.rows.length - 1 ? "1px solid #F0F2F5" : "none" }}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-3 text-ink-600 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
