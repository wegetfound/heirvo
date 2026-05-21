import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { useMeta } from "../lib/useMeta";

// Gated like Beta.tsx gates DOWNLOAD_URL — fill in once the intake form exists.
const APPLY_URL = "/labs/apply";
const APPLY_MAILTO =
  "mailto:labs@heirvo.com?subject=Lab%20Operator%20Application&body=Tell%20us%3A%20your%20metro%2C%20your%20optical-drive%20experience%2C%20and%20a%20photo%20of%20your%20dedicated%20lockable%20workspace.";

// Phase-1 founding metros (docs/lab-network.md §12). One customer-facing lab per city.
const FOUNDING_METROS: { city: string; status: "open" | "claimed" }[] = [
  { city: "New York", status: "open" },
  { city: "Los Angeles", status: "open" },
  { city: "Chicago", status: "open" },
  { city: "Dallas–Fort Worth", status: "open" },
  { city: "Houston", status: "open" },
  { city: "Atlanta", status: "open" },
  { city: "Phoenix", status: "open" },
  { city: "Miami", status: "open" },
  { city: "Washington DC", status: "open" },
  { city: "Seattle", status: "open" },
];

export default function Labs() {
  useMeta(
    "Heirvo Lab Network — Run a Regional Disc-Recovery Lab",
    "Become a licensed Heirvo lab operator. Recover damaged DVDs, CDs and Photo CDs from home on a Pioneer + LiteOn rig. ~$60–78/hr take-home, secondhand gear OK (~$140–200 to start). One protected lab per metro.",
    "https://heirvo.com/labs"
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

  const Apply = ({ className = "" }: { className?: string }) =>
    APPLY_URL ? (
      <a href={APPLY_URL} className={`btn btn-primary ${className}`} target="_blank" rel="noopener noreferrer">
        Apply to operate a lab →
      </a>
    ) : (
      <a href={APPLY_MAILTO} className={`btn btn-primary ${className}`}>
        Apply to operate a lab →
      </a>
    );

  return (
    <div className="relative">
      {/* noindex — recruitment funnel, not for search yet */}
      <meta name="robots" content="noindex, nofollow" />
      <Nav />
      <main ref={scopeRef} className="relative">
        <div className="mesh-bg absolute inset-0 -z-10" />

        <div className="container-narrow pt-16 pb-32 sm:pt-24">

          {/* ── Hero ─────────────────────────────────────────────── */}
          <div className="max-w-3xl mb-16" data-reveal>
            <span className="micro-label">Heirvo Lab Network · Operator intake</span>
            <h1
              className="mt-3 font-display font-bold tracking-tightest text-ink-900"
              style={{ fontSize: "clamp(34px, 5vw, 56px)", lineHeight: 1.05, letterSpacing: "-0.03em", textWrap: "balance" }}
            >
              Run a precision disc-recovery rig from home.
            </h1>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-500 max-w-2xl">
              Heirvo runs a nationwide mail-in service for damaged DVDs, CDs and Kodak Photo CDs.
              Licensed lab operators do the extraction — a two-engine optical rig running Heirvo's
              multi-pass software, your secured workspace, careful hands. We bring the brand,
              customers, routing, payment and QC. You get one protected metro of your own.
            </p>
            <div className="mt-7 grid gap-x-8 gap-y-2.5 sm:grid-cols-2 max-w-xl font-mono text-[13px] text-ink-600">
              {[
                ["Take-home", "~$60–78/hr active"],
                ["Workspace", "Your home — no driving"],
                ["Gear to start", "~$140–200 (secondhand OK)"],
                ["Territory", "Granted, not sold"],
              ].map(([k, v]) => (
                <span key={k} className="flex items-baseline justify-between gap-3 border-b border-ink-200/70 pb-1.5">
                  <span className="text-ink-400 uppercase tracking-[0.1em] text-[11px]">{k}</span>
                  <span className="text-ink-800">{v}</span>
                </span>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3 items-center">
              <Apply />
              <a href="#hardware" className="btn btn-ghost">See the rig spec</a>
              <span className="text-[13px] text-ink-400">Background-verified network · Insured shipping</span>
            </div>
          </div>

          {/* ── The premise ──────────────────────────────────────── */}
          <div className="max-w-2xl mb-16 pl-5 border-l-2 border-amber-400/60 space-y-4" data-reveal>
            <p className="text-[16px] leading-relaxed text-ink-600">
              Consumer playback <em>interpolates</em> — it guesses across an unreadable spot so a movie
              keeps playing. Recovery needs the exact opposite: a drive that reports errors honestly
              (C2 error pointers), exposes raw read commands, and retries without giving up. A single
              bad sector can take <span className="font-mono text-ink-800">10,000+</span> retries.
            </p>
            <p className="text-[16px] leading-relaxed text-ink-600">
              If you already love optical drives — Redump, disc preservation, the r/DataHoarder world —
              this is that craft, paid by the disc. We hold a high bar, and we tell you exactly what it is.
            </p>
          </div>

          {/* ── Founding metros (the opportunity hook) ───────────── */}
          <div className="mb-16" data-reveal>
            <span className="micro-label text-brand-600">Phase 1 · Founding labs (8–12 metros)</span>
            <h2
              className="mt-3 font-display font-bold text-ink-900"
              style={{ fontSize: "clamp(22px, 3vw, 32px)", letterSpacing: "-0.025em", textWrap: "balance" }}
            >
              Claim your metro. One lab per city.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-500 max-w-2xl">
              Each metro holds exactly one customer-facing lab — so "your local lab" maps to a customer's
              city, and the work routed to you is yours. Founding operators get favorable lease terms and
              become the proof-of-concept and overflow backbone of the network.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FOUNDING_METROS.map((m) => (
                <div
                  key={m.city}
                  className="flex items-center justify-between rounded-xl border border-ink-200 bg-white/60 backdrop-blur px-4 py-3.5"
                >
                  <span className="font-display font-semibold text-[15px] text-ink-900">{m.city}</span>
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-wide text-ios-green">
                    <span className="h-1.5 w-1.5 rounded-full bg-ios-green inline-block" />
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12px] text-ink-400">
              Phase 2 adds the top 25 (Philadelphia, Boston, SF, Denver, and more); Phase 3 covers the
              top 50 + secondary markets.
            </p>
          </div>

          {/* ── What the work is ─────────────────────────────────── */}
          <div className="mb-16" data-reveal>
            <span className="micro-label">What the work actually is</span>
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              {[
                {
                  title: "Receive & document",
                  body: "A customer's disc arrives by insured, tracked mail. You scan it in, photograph its condition on arrival, and log every step — the chain of custody protects you and them.",
                },
                {
                  title: "Clean & extract",
                  body: "Radial-wipe cleaning where needed, then a two-drive multi-pass read: PureRead on the Pioneer, then the LiteOn's different laser fills what the first couldn't. Verify checksums, confirm files open.",
                },
                {
                  title: "Report & return",
                  body: "Package verified files + ISO + checksum + before/after photos + a short recovery report. Heirvo QCs before anything ships to the customer. You ship the original back, tracked.",
                },
              ].map((card) => (
                <div key={card.title} className="rounded-xl border border-ink-200 bg-white/60 backdrop-blur p-6">
                  <div className="font-display font-semibold text-[15px] text-ink-900 mb-2">{card.title}</div>
                  <p className="text-[14px] leading-relaxed text-ink-500">{card.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Hardware / spec section (the centerpiece) ────────── */}
          <div id="hardware" className="mb-16 scroll-mt-24" data-reveal>
            <span className="micro-label text-brand-600">The rig · two independent reading engines</span>
            <h2
              className="mt-3 font-display font-bold text-ink-900"
              style={{ fontSize: "clamp(22px, 3vw, 32px)", letterSpacing: "-0.025em", textWrap: "balance" }}
            >
              Why two drives beat one.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-600 max-w-2xl">
              A sector one drive can't read, the other often can — different lasers, optics and firmware.
              Run a disc through both and merge the recovered sectors and you push recovery from ~90% to
              <span className="font-mono text-ink-800"> 97%+</span>. That merge is the whole game.
            </p>

            {/* Two engine cards */}
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl border border-ink-200 bg-white/70 backdrop-blur p-6">
                <div className="flex items-baseline justify-between">
                  <div className="font-display font-semibold text-[15px] text-ink-900">Pioneer — primary</div>
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand-600">Engine 1</span>
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
                  Killer feature is <strong className="text-ink-700">PureRead</strong>, set to
                  <strong className="text-ink-700"> Master mode</strong> — re-reads on error, interpolates
                  only as a last resort.
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-amber-700 font-medium">
                  Never use Perfect mode on damaged discs — it aborts on the first hard error.
                </p>
                <p className="mt-3 font-mono text-[12px] text-ink-500 leading-relaxed">
                  BDR-2213 · BDR-S13U-X (PureRead 4+) · BDR-XD05 ext.
                  <br />
                  Pioneer exited optical — trending secondhand-only. Buy while available.
                </p>
              </div>

              <div className="rounded-2xl border border-ink-200 bg-white/70 backdrop-blur p-6">
                <div className="flex items-baseline justify-between">
                  <div className="font-display font-semibold text-[15px] text-ink-900">LiteOn — secondary</div>
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand-600">Engine 2</span>
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
                  The <strong className="text-ink-700">iHAS124</strong> is cheap, still in production, and a
                  genuinely <em>different</em> reading engine — also strong for C2 quality scanning.
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
                  Run the same bad-sector map on it so its laser fills what the Pioneer couldn't reach.
                </p>
                <p className="mt-3 font-mono text-[12px] text-ink-500 leading-relaxed">
                  iHAS124 (~$45) · second optic + C2 scanning.
                  <br />
                  Plextor caveat: PX-891SAF is a rebadged LiteOn — don't pay a premium.
                </p>
              </div>
            </div>

            {/* Shopping list table */}
            <div className="mt-6 overflow-x-auto rounded-2xl border border-ink-200 bg-white/60 backdrop-blur">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-ink-200 text-ink-400 uppercase tracking-[0.1em] text-[11px]">
                    <th className="px-5 py-3 font-medium">Tier</th>
                    <th className="px-5 py-3 font-medium">Kit</th>
                    <th className="px-5 py-3 font-medium text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="text-ink-600">
                  <tr className="border-b border-ink-200/60">
                    <td className="px-5 py-4 font-display font-semibold text-ink-900 align-top">Starter<br /><span className="text-[11px] font-normal text-ink-400">secondhand OK</span></td>
                    <td className="px-5 py-4 align-top">Pioneer BDR-2213 or used XD05 (~$80–130) + LiteOn iHAS124 (~$45) + USB enclosure/adapter (~$15–25)</td>
                    <td className="px-5 py-4 align-top text-right font-mono text-ink-900 font-semibold whitespace-nowrap">~$140–200</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-display font-semibold text-ink-900 align-top">Ideal</td>
                    <td className="px-5 py-4 align-top">Pioneer BDR-S13U-X (~$175) + LiteOn iHAS124 (~$45) + genuine vintage Plextor + PATA adapter (~$60–170)</td>
                    <td className="px-5 py-4 align-top text-right font-mono text-ink-900 font-semibold whitespace-nowrap">~$280–390</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[12px] text-ink-400 max-w-2xl leading-relaxed font-mono">
              You buy your own gear from independent sellers (Amazon, Best Buy, the manufacturer) at market
              price. Heirvo never sells the kit and takes no vendor cut — this is what keeps you an
              independent operator, not a franchisee. First-month gear cost is recovered inside a 30-disc month.
            </p>
          </div>

          {/* ── Positioning vs. the conveyor belt ────────────────── */}
          <div className="mb-16 rounded-2xl border border-ink-200 bg-white/60 backdrop-blur p-8 sm:p-10" data-reveal>
            <span className="micro-label">Why this is different work</span>
            <h2
              className="mt-3 font-display font-bold text-ink-900"
              style={{ fontSize: "clamp(22px, 3vw, 30px)", letterSpacing: "-0.02em", textWrap: "balance" }}
            >
              Not a warehouse a thousand miles away.
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <div className="micro-label text-ink-400 mb-2">The incumbents</div>
                <ul className="space-y-2.5 text-[14px] leading-relaxed text-ink-500">
                  <li>Legacybox: 1.6–2.5★, an <em>Inside Edition</em> investigation over lost media, turnaround that slips from "4–6 weeks" to "three to five months."</li>
                  <li>Your originals vanish into an anonymous pile no one is accountable for.</li>
                  <li>They digitize <em>working</em> media. They don't recover the disc you thought was dead.</li>
                </ul>
              </div>
              <div>
                <div className="micro-label text-amber-700 mb-2">The Heirvo lab</div>
                <ul className="space-y-2.5 text-[14px] leading-relaxed text-ink-600">
                  <li>A named human handles <strong>your</strong> disc — logged, photographed, tracked door to door.</li>
                  <li>We recover <strong>damaged and unreadable</strong> media — the capability, not the commodity.</li>
                  <li>Days, not months. The local-lab promise, backed by a central guarantee: <strong>no recovery, no charge.</strong></li>
                </ul>
              </div>
            </div>
          </div>

          {/* ── How acceptance works ─────────────────────────────── */}
          <div className="mb-16" data-reveal>
            <span className="micro-label">How acceptance works</span>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["01", "Apply", "Temperament over résumé. Photo of your dedicated, lockable workspace required."],
                ["02", "Integrity screen", "A conscientiousness-based instrument. This is a gate, not a tiebreaker."],
                ["03", "PAID trial disc", "We mail a known-condition disc we've already graded. You're paid for the work — never charged. Honest reporting of the seeded defect is mandatory."],
                ["04", "Background check", "SSN trace, criminal + sex-offender search. Items enter your home; non-negotiable."],
                ["05", "Territory granted", "Pass everything and your metro is granted as a revocable performance lease."],
                ["06", "Probation → autonomy", "First ~25 jobs are 100% QC'd before files ship. Autonomy is earned in tiers."],
              ].map(([n, t, b]) => (
                <div key={n} className="rounded-xl border border-ink-200 bg-white/50 backdrop-blur p-5">
                  <div className="font-mono text-[12px] text-brand-600">{n}</div>
                  <div className="mt-1 font-display font-semibold text-[15px] text-ink-900">{t}</div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">{b}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[13px] text-ink-500 max-w-2xl leading-relaxed">
              The bar is exacting on purpose. Trial disc requires <strong className="text-ink-700">100% output fidelity</strong>{" "}
              (a single lost file is a fail), handling/custody ≥ 95%, and honest reporting of what you couldn't get.
              Hiding a failure is an instant reject — every time.
            </p>
          </div>

          {/* ── Pay table ────────────────────────────────────────── */}
          <div className="mb-16" data-reveal>
            <span className="micro-label text-brand-600">Pay · piece-rate by difficulty</span>
            <h2
              className="mt-3 font-display font-bold text-ink-900"
              style={{ fontSize: "clamp(22px, 3vw, 30px)", letterSpacing: "-0.02em" }}
            >
              The careful, thorough path pays the most.
            </h2>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-ink-200 bg-white/60 backdrop-blur">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-ink-200 text-ink-400 uppercase tracking-[0.1em] text-[11px]">
                    <th className="px-5 py-3 font-medium">Item</th>
                    <th className="px-5 py-3 font-medium text-right">Pay</th>
                    <th className="px-5 py-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-ink-600">
                  {[
                    ["Tier 1 — clean read, single pass", "$22", "~15 min active labor"],
                    ["Tier 2 — cleaning + multi-pass", "$34", "the volume center, ~25–35 min"],
                    ["Tier 3 — severe damage, heroic recovery", "$52", "40+ min; pays more than a clean disc → kills cherry-picking"],
                    ["Attempt fee — real attempt on a no-recovery disc", "$9", "keeps you fighting hopeless discs even when Heirvo earns $0"],
                    ["Monthly quality bonus", "+8%", "of the month's piece earnings · QC ≥ 97% AND on-time ≥ 95%"],
                    ["Volume step-down (orders of 20+)", "T1 $19 / T2 $29 / T3 $44", "protects margin where per-disc price drops"],
                  ].map(([item, pay, note]) => (
                    <tr key={item} className="border-b border-ink-200/60 last:border-0">
                      <td className="px-5 py-3.5 align-top text-ink-800">{item}</td>
                      <td className="px-5 py-3.5 align-top text-right font-mono font-semibold text-ink-900 whitespace-nowrap">{pay}</td>
                      <td className="px-5 py-3.5 align-top text-ink-500">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* earnings strip */}
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {[
                ["30 discs/mo", "~$1,066", "14 active hrs · ~$76/hr"],
                ["80 discs/mo", "~$2,876", "37 active hrs · ~$78/hr"],
                ["150 discs/mo", "~$5,375", "70 active hrs · ~$77/hr"],
              ].map(([head, gross, sub]) => (
                <div key={head} className="rounded-xl border border-ink-200 bg-white/50 p-5">
                  <div className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-400">{head}</div>
                  <div className="mt-1 font-display font-bold text-[24px] text-ink-900">{gross}</div>
                  <div className="mt-0.5 font-mono text-[12px] text-ink-500">{sub}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-ink-400 leading-relaxed">
              Mix: 35% T1 / 50% T2 / 15% T3, bonus earned, ~28 min active/disc. Net of self-employment tax +
              consumables ≈ <span className="font-mono text-ink-600">$60–64/hr</span> take-home — well above the
              ~$37/hr 1099 median, with no driving and parallel machine time.
            </p>
          </div>

          {/* ── FAQ ──────────────────────────────────────────────── */}
          <div className="mb-16" data-reveal>
            <span className="micro-label">Short FAQ</span>
            <div className="mt-6 space-y-5 max-w-2xl">
              {[
                ["Do I have to buy gear from Heirvo?", "No — and we won't sell it to you. You source your own drives from independent sellers at market price. Secondhand is fine and recommended to start."],
                ["Is this a franchise? Is there a fee?", "No franchise fee, no deposit, no purchase from us. Territory is granted by passing a paid trial and held as a revocable performance lease — earned, never sold."],
                ["What if my metro is at capacity?", "Each metro has exactly one customer-facing lab. If yours is full, Heirvo silently reroutes spillover to nearby capacity — the customer never sees it, and your 'one lab per city' status is intact. We also keep 2–3 pre-qualified bench operators per region so the network never has a single point of failure."],
                ["What predicts whether I'm accepted?", "Conscientiousness and integrity, not a coding test. The failure mode that matters is losing or damaging someone's irreplaceable original — everything we screen for guards against that."],
                ["How fast do I get paid the trial?", "The trial disc is paid work, not a test you pay for. You're compensated at a reduced rate for the trial job itself."],
                ["What gets me removed?", "Dishonesty of any kind, working outside your secured workspace, or any privacy breach are instant. Quality and SLA misses escalate as documented strikes."],
              ].map(([q, a]) => (
                <div key={q} className="border-b border-ink-200/70 pb-5">
                  <div className="font-display font-semibold text-[15px] text-ink-900">{q}</div>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-500">{a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Application CTA ──────────────────────────────────── */}
          <div
            className="rounded-2xl border border-brand-200 bg-brand-gradient-soft backdrop-blur p-8 sm:p-10"
            data-reveal
          >
            <span className="micro-label text-brand-600">Operator intake</span>
            <h2
              className="mt-3 font-display font-bold text-ink-900"
              style={{ fontSize: "clamp(22px, 3vw, 30px)", letterSpacing: "-0.02em", textWrap: "balance" }}
            >
              Be the named human who handles your region's discs.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-600 max-w-lg">
              Tell us your metro, your optical-drive experience, and send a photo of your dedicated,
              lockable workspace. If the bench in your region is open, we'll send you a paid trial disc.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 items-center">
              <Apply />
              <span className="text-[13px] text-ink-400 font-mono">labs@heirvo.com</span>
            </div>
            <p className="mt-4 text-[12px] text-ink-400">
              Licensed independent lab operators. Territory is granted and earned, never sold — there is no
              franchise fee.
            </p>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
