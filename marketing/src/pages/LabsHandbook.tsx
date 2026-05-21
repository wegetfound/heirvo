import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { useMeta } from "../lib/useMeta";

// TODO: replace with per-operator codes once the lab UI exists.
const LAB_ACCESS_CODE = "heirvo-labs-2026";
const UNLOCK_KEY = "heirvo-labs-unlocked";

// Mirror the safeSessionGet/safeSessionSet pattern from src/main.tsx.
function safeSessionGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function safeSessionSet(key: string, val: string): void {
  try { sessionStorage.setItem(key, val); } catch { /* private mode */ }
}

export default function LabsHandbook() {
  useMeta(
    "Heirvo Lab Network — Operator Handbook",
    "Internal operator handbook for the Heirvo Lab Network. Access restricted.",
    "https://heirvo.com/labs/handbook"
  );

  const [unlocked, setUnlocked] = useState(() => safeSessionGet(UNLOCK_KEY) === "1");

  if (!unlocked) {
    return <Gate onUnlock={() => { safeSessionSet(UNLOCK_KEY, "1"); setUnlocked(true); }} />;
  }
  return <Handbook />;
}

/* ── Password gate ──────────────────────────────────────────── */
function Gate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() === LAB_ACCESS_CODE) {
      onUnlock();
    } else {
      setError(true);
    }
  };

  return (
    <div className="relative">
      <meta name="robots" content="noindex, nofollow" />
      <Nav />
      <main className="relative">
        <div className="mesh-bg absolute inset-0 -z-10" />
        <div className="container-narrow pt-24 pb-32 flex justify-center">
          <div className="card w-full max-w-md p-8 sm:p-10">
            <span className="micro-label">Heirvo Lab Network</span>
            <h1
              className="mt-3 font-display font-bold text-ink-900"
              style={{ fontSize: "clamp(24px, 4vw, 30px)", letterSpacing: "-0.025em" }}
            >
              Operator handbook
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-500">
              Restricted to accepted operators. Enter your access code to continue.
            </p>
            <form onSubmit={submit} className="mt-6">
              <label className="micro-label block mb-2" htmlFor="lab-code">Access code</label>
              <input
                id="lab-code"
                type="password"
                autoFocus
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(false); }}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-ink-200 bg-white/80 px-4 py-3 text-[15px] font-mono text-ink-900 outline-none transition focus-visible:ring-4 focus-visible:ring-brand-500/25 focus-visible:border-brand-400"
                aria-invalid={error}
              />
              {error && (
                <p className="mt-2 text-[13px] text-ios-red">That code didn't match. Check with your network contact.</p>
              )}
              <button type="submit" className="btn btn-primary w-full mt-5">Unlock handbook</button>
            </form>
            <p className="mt-5 text-[12px] text-ink-400 font-mono">labs@heirvo.com</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

/* ── Section heading helper ─────────────────────────────────── */
function SectionHead({ n, id, title, kicker }: { n: string; id: string; title: string; kicker?: string }) {
  return (
    <div id={id} className="scroll-mt-24" data-reveal>
      <span className="micro-label text-brand-600">§{n}{kicker ? ` · ${kicker}` : ""}</span>
      <h2
        className="mt-2 font-display font-bold text-ink-900"
        style={{ fontSize: "clamp(22px, 3vw, 30px)", letterSpacing: "-0.025em", textWrap: "balance" }}
      >
        {title}
      </h2>
    </div>
  );
}

/* ── The handbook ───────────────────────────────────────────── */
function Handbook() {
  const scopeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-reveal]", {
        y: 22,
        opacity: 0,
        duration: 0.8,
        stagger: 0.08,
        ease: "expo.out",
        delay: 0.05,
      });
    }, scopeRef);
    return () => ctx.revert();
  }, []);

  const toc = [
    ["lifecycle", "1 · Operator lifecycle"],
    ["screening", "2 · Screening & acceptance bar"],
    ["booted", "3 · What gets you booted"],
    ["pay", "4 · Pay & how you get paid"],
    ["equipment", "5 · Equipment shopping lists"],
    ["sop", "6 · Cleaning & extraction SOP"],
    ["custody", "7 · Chain of custody & QC"],
  ];

  return (
    <div className="relative">
      <meta name="robots" content="noindex, nofollow" />
      <Nav />
      <main ref={scopeRef} className="relative">
        <div className="mesh-bg absolute inset-0 -z-10" />
        <div className="container-narrow pt-16 pb-32 sm:pt-20">

          {/* ── Title + TOC ──────────────────────────────────── */}
          <div className="mb-12" data-reveal>
            <span className="micro-label">Internal · accepted operators only</span>
            <h1
              className="mt-3 font-display font-bold tracking-tightest text-ink-900"
              style={{ fontSize: "clamp(30px, 4.5vw, 46px)", lineHeight: 1.06, letterSpacing: "-0.03em" }}
            >
              Operator handbook
            </h1>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-500 max-w-2xl">
              The working reference for running a Heirvo regional lab: lifecycle, the bar you're held to,
              how you get paid, the gear, and the protocols that protect you and the customer's irreplaceable
              originals. The core principle: <strong className="text-ink-700">an irreplaceable original is sacred</strong> —
              every rule below exists to prevent its loss.
            </p>
            <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-mono">
              {toc.map(([id, label]) => (
                <a key={id} href={`#${id}`} className="text-ink-500 hover:text-brand-600 transition underline-offset-2 hover:underline">
                  {label}
                </a>
              ))}
            </nav>
          </div>

          <div className="space-y-16">

            {/* ── 1 · Lifecycle ──────────────────────────────── */}
            <section>
              <SectionHead n="1" id="lifecycle" title="Operator lifecycle" />
              <p className="mt-4 text-[15px] leading-relaxed text-ink-600 max-w-2xl" data-reveal>
                Each stage is cheaper than letting a bad actor through the next one. No operator ships files
                to a customer unreviewed during probation.
              </p>
              <pre
                className="mt-5 overflow-x-auto rounded-xl border border-ink-200 bg-ink-900 p-5 text-[12px] leading-relaxed text-brand-200 font-mono"
                data-reveal
              >{`Apply  →  Integrity / conscientiousness screen  →  PAID trial disc
      →  Background check  →  Acceptance + territory granted
      →  Probation (100% QC)  →  Graduated autonomy
      →  Ongoing (sampling QC + blind re-test discs + monthly bonus)
      →  [strikes → revocation]`}</pre>
              <p className="mt-4 text-[14px] leading-relaxed text-ink-500 max-w-2xl" data-reveal>
                Autonomy is earned in tiers: <span className="font-mono text-ink-700">100% review → 50% → 20% sampling → trusted-tier</span>,
                with a permanent random QC floor that never goes to zero.
              </p>
            </section>

            {/* ── 2 · Screening & acceptance ─────────────────── */}
            <section>
              <SectionHead n="2" id="screening" title="Screening & acceptance bar" />
              <p className="mt-4 text-[15px] leading-relaxed text-ink-600 max-w-2xl" data-reveal>
                What predicts success here is <strong className="text-ink-700">conscientiousness + integrity</strong>,
                not raw competence — the standardized hardware + software flattens the technical curve. The five-stage funnel:
              </p>
              <ol className="mt-5 space-y-3 max-w-2xl" data-reveal>
                {[
                  ["Application + self-selection", "Temperament questions, not résumé. A photo of your dedicated, lockable workspace is required."],
                  ["Integrity / conscientiousness screen", "A personality-based instrument, harder to game than an overt honesty test. This is a gate, not a tiebreaker."],
                  ["The PAID trial disc", "A known-condition disc we've graded internally, seeded with realistic defects. You're paid for the work — never charged. Graded on output fidelity, handling, custody discipline, and honesty."],
                  ["Background check", "SSN trace, county + federal + nationwide criminal, sex-offender search. Items enter your home and leave with personal data — non-negotiable."],
                  ["Probation, then graduated autonomy", "The first ~25 real jobs are 100% re-verified by HQ before files ship."],
                ].map(([t, b], i) => (
                  <li key={t} className="flex gap-4 rounded-xl border border-ink-200 bg-white/50 p-4">
                    <span className="font-mono text-[13px] text-brand-600 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <span className="font-display font-semibold text-[14px] text-ink-900">{t}</span>
                      <span className="block mt-1 text-[13px] leading-relaxed text-ink-500">{b}</span>
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-6 rounded-2xl border border-amber-300/60 bg-amber-50/60 backdrop-blur p-6 max-w-2xl" data-reveal>
                <div className="micro-label text-amber-700">Acceptance bar — all required</div>
                <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-ink-700">
                  {[
                    "Passed the integrity / conscientiousness screen above threshold.",
                    "Trial disc: 100% output fidelity (a single lost or corrupted file = fail), handling/custody ≥ 95%, AND honest reporting of the seeded defect.",
                    "Clean background check.",
                    "A dedicated, lockable, single-purpose workspace (photo-verified) — no shared kitchen tables, no roommates with access.",
                    "Owns both required drives; passes the hardware/software calibration check.",
                    "Signs the operator agreement — custody protocol, “originals are sacred” handling, NDA, and acknowledgment that territory is a revocable performance lease, not property.",
                  ].map((li) => (
                    <li key={li} className="flex gap-2.5">
                      <span className="mt-2 w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                      <span>{li}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* ── 3 · What gets you booted ───────────────────── */}
            <section>
              <SectionHead n="3" id="booted" title="What gets you booted" />
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-ios-red/40 bg-white/60 backdrop-blur p-6" data-reveal>
                  <div className="font-display font-semibold text-[15px] text-ios-red">Instant termination</div>
                  <p className="text-[12px] text-ink-400 mt-0.5">territory revoked immediately</p>
                  <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-600">
                    {[
                      "Dishonesty of any kind — concealing damage/loss, faking custody logs, falsifying results.",
                      "Loss or destruction of an original through protocol breach.",
                      "Working outside the secured workspace; letting an unauthorized person handle items.",
                      "Exfiltrating or retaining customer data; any privacy breach.",
                      "A background-disqualifying event during tenure.",
                    ].map((li) => (
                      <li key={li} className="flex gap-2.5">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-ios-red shrink-0" />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white/60 backdrop-blur p-6" data-reveal>
                  <div className="font-display font-semibold text-[15px] text-ink-900">Escalating strikes</div>
                  <p className="text-[12px] text-ink-400 mt-0.5">quality / SLA, not integrity</p>
                  <ul className="mt-3 space-y-3 text-[13px] leading-relaxed text-ink-600">
                    {[
                      ["Strike 1 — Coaching", "Missed SLA, sloppy log, minor handling lapse caught in QC. Documented warning + retraining."],
                      ["Strike 2 — Probation", "Sampling snaps back to 100% review (at your own time cost); written improvement plan."],
                      ["Strike 3 — Revocation", "Three quality strikes in a rolling window, or a quality score below the network floor."],
                    ].map(([t, b]) => (
                      <li key={t}>
                        <span className="font-display font-semibold text-ink-900">{t}.</span>{" "}
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-[12px] leading-relaxed text-ink-400">
                    Strikes tie to a visible <strong className="text-ink-600">Operator Score</strong> — a predictive
                    composite of custody compliance %, re-verify pass rate, SLA hit rate and feedback — not raw stars.
                  </p>
                </div>
              </div>
            </section>

            {/* ── 4 · Pay ────────────────────────────────────── */}
            <section>
              <SectionHead n="4" id="pay" title="Pay & how you get paid" kicker="piece-rate by difficulty" />
              <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-gradient-soft p-6 max-w-2xl" data-reveal>
                <div className="micro-label text-brand-600">How you get paid — plain version</div>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                  You're paid per disc, by how hard it was: <strong>easy $22, medium $34, hard $52.</strong> Our software
                  sets the difficulty from your recovery log — you never have to argue for it. Couldn't recover a disc?
                  You still get <strong>$9</strong>, as long as your log shows a real full attempt. Monthly bonus:
                  <strong> +8% on everything</strong> if you pass quality checks on 97%+ of discs and hit turnaround 95%+
                  of the time. Careful and on-time = more money. (Orders of 20+ discs pay slightly lower per-disc rates
                  because you run more per machine cycle.)
                </p>
              </div>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-ink-200 bg-white/60 backdrop-blur" data-reveal>
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
                      ["Tier 2 — cleaning + multi-pass", "$34", "the volume center of gravity, ~25–35 min"],
                      ["Tier 3 — severe damage, heroic recovery", "$52", "40+ min; pays more than a clean disc earns → kills cherry-picking"],
                      ["Attempt fee — QC-confirmed real multi-pass on a no-recovery disc", "$9", "keeps operators fighting hopeless discs even though Heirvo earns $0 there"],
                      ["Monthly quality bonus", "+8%", "of month's piece earnings · requires QC pass-rate ≥ 97% AND on-time ≥ 95%"],
                      ["Volume step-down (orders of 20+ discs)", "T1 $19 / T2 $29 / T3 $44", "protects margin where per-disc price drops"],
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

              <div className="mt-5 overflow-x-auto rounded-2xl border border-ink-200 bg-white/40" data-reveal>
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-ink-200 text-ink-400 uppercase tracking-[0.1em] text-[11px]">
                      <th className="px-5 py-3 font-medium">Discs / mo</th>
                      <th className="px-5 py-3 font-medium text-right">Gross</th>
                      <th className="px-5 py-3 font-medium text-right">~Active hrs</th>
                      <th className="px-5 py-3 font-medium text-right">~Gross/hr</th>
                    </tr>
                  </thead>
                  <tbody className="text-ink-600 font-mono">
                    {[
                      ["30", "~$1,066", "14", "~$76"],
                      ["80", "~$2,876", "37", "~$78"],
                      ["150", "~$5,375", "70", "~$77"],
                    ].map(([d, g, h, r]) => (
                      <tr key={d} className="border-b border-ink-200/60 last:border-0">
                        <td className="px-5 py-3 text-ink-800">{d}</td>
                        <td className="px-5 py-3 text-right text-ink-900 font-semibold">{g}</td>
                        <td className="px-5 py-3 text-right">{h}</td>
                        <td className="px-5 py-3 text-right">{r}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[12px] text-ink-400 leading-relaxed max-w-2xl">
                Mix: 35% T1 / 50% T2 / 15% T3, bonus earned, ~28 min active/disc. Net of self-employment tax +
                consumables ≈ <span className="font-mono text-ink-600">$60–64/hr</span> take-home. First-month
                equipment cost is recovered inside the first 30-disc month.
              </p>
            </section>

            {/* ── 5 · Equipment ──────────────────────────────── */}
            <section>
              <SectionHead n="5" id="equipment" title="Equipment shopping lists" />
              <p className="mt-4 text-[15px] leading-relaxed text-ink-600 max-w-2xl" data-reveal>
                Buy your own gear from independent third parties (Amazon, Best Buy, the manufacturer) at market
                price. Heirvo never sells or supplies the kit and takes no vendor cut. Secondhand is fine to start.
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-500 max-w-2xl" data-reveal>
                <strong className="text-ink-700">Why drive choice matters:</strong> consumer playback interpolates
                (guesses) over unreadable spots; recovery needs the opposite — a drive that reports errors honestly
                (C2 error pointers), exposes raw read commands, and retries aggressively (no riplock). A single bad
                sector can need <span className="font-mono text-ink-700">10,000+</span> retries. The two-drive logic:
                the Pioneer + LiteOn pair gives two independent reading engines, pushing recovery from ~90% to 97%+.
              </p>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-ink-200 bg-white/60 backdrop-blur" data-reveal>
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

              <div className="mt-5 grid gap-4 sm:grid-cols-2" data-reveal>
                <div className="rounded-xl border border-ink-200 bg-white/50 p-5 text-[13px] leading-relaxed text-ink-600">
                  <div className="font-display font-semibold text-[14px] text-ink-900">Drive notes</div>
                  <p className="mt-2"><strong className="text-ink-700">Pioneer:</strong> use PureRead in <strong className="text-ink-700">Master mode</strong> — never Perfect mode on damaged discs (it aborts on the first hard error). Pioneer has exited optical; buy secondhand while available.</p>
                  <p className="mt-2"><strong className="text-ink-700">LiteOn iHAS124:</strong> cheap, still produced, a different reading engine + good for C2 scanning.</p>
                  <p className="mt-2"><strong className="text-ink-700">Plextor caveat:</strong> the PX-891SAF is a rebadged LiteOn — don't pay a premium. The accurate dumpers are vintage Plextors (PX-760A/716A/712/Premium, IDE + PATA adapter, ~$30–150).</p>
                </div>
                <div className="rounded-xl border border-ink-200 bg-white/50 p-5 text-[13px] leading-relaxed text-ink-600">
                  <div className="font-display font-semibold text-[14px] text-ink-900">Cleaning kit</div>
                  <ul className="mt-2 space-y-1.5 font-mono text-[12px]">
                    <li>99% IPA — ~$8</li>
                    <li>Distilled water — ~$2</li>
                    <li>Microfiber cloth — ~$8</li>
                    <li>Nitrile gloves — ~$10</li>
                    <li>Cotton swabs — ~$3</li>
                  </ul>
                  <p className="mt-3">Basic kit <span className="font-mono text-ink-800">~$30</span>; with a JFJ Easy Pro resurfacer <span className="font-mono text-ink-800">~$230</span>.</p>
                </div>
              </div>
            </section>

            {/* ── 6 · SOP ────────────────────────────────────── */}
            <section>
              <SectionHead n="6" id="sop" title="Cleaning & extraction SOP" />
              <div className="mt-5 grid gap-4 sm:grid-cols-3" data-reveal>
                <div className="rounded-xl border border-ink-200 bg-white/50 p-5 text-[13px] leading-relaxed text-ink-600">
                  <div className="font-display font-semibold text-[14px] text-ink-900">Cleaning solution</div>
                  <p className="mt-2">~70%+ isopropyl alcohol ~1:1 with distilled water (never tap — mineral deposits).</p>
                </div>
                <div className="rounded-xl border border-amber-300/60 bg-amber-50/50 p-5 text-[13px] leading-relaxed text-ink-700">
                  <div className="font-display font-semibold text-[14px] text-amber-700">Wipe direction is critical</div>
                  <p className="mt-2">Wipe in straight radial lines, center outward — <strong>never in circles.</strong> Error correction tolerates radial scratches but is defeated by a circular scratch following the data track. Air-dry fully.</p>
                </div>
                <div className="rounded-xl border border-ink-200 bg-white/50 p-5 text-[13px] leading-relaxed text-ink-600">
                  <div className="font-display font-semibold text-[14px] text-ios-red">Never use</div>
                  <p className="mt-2">Paper towels/tissues, abrasive cloths, ammonia/window cleaner, acetone, or toothpaste/baking-soda “hacks” on irreplaceable discs.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3" data-reveal>
                {[
                  ["Mold / fungus", "Nitrile/vinyl gloves (not cotton); lift growth with an IPA cotton swab, dabbing not scrubbing; clean promptly (fungus etches), store separately in controlled humidity."],
                  ["Disc rot", "Bronzing, pinholes, transparent patches = chemical failure; cleaning won't fix it. Go straight to careful multi-drive multi-pass extraction."],
                  ["Resurfacing", "JFJ Easy Pro for deep read-side scratches only — last resort, after cleaning fails. NEVER resurface the label/top side; the data layer sits just under the label and is destroyed instantly."],
                ].map(([t, b]) => (
                  <div key={t} className="rounded-xl border border-ink-200 bg-white/50 p-5 text-[13px] leading-relaxed text-ink-600">
                    <div className="font-display font-semibold text-[14px] text-ink-900">{t}</div>
                    <p className="mt-2">{b}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6" data-reveal>
                <div className="micro-label">Extraction protocol — per disc</div>
                <ol className="mt-4 space-y-3">
                  {[
                    ["Receive & log", "Assign job ID; gloves on; handle by edges + center hole only."],
                    ["Inspect & photograph", "Both sides under good light — scratches (radial vs circular), fingerprints, mold, label flaking, bronzing/pinholes, disc type (CD/DVD/Photo CD)."],
                    ["Assess & route", "Surface dirt → clean; mold → mold protocol; deep read-side scratches → flag for resurfacing; rot or label damage → skip cleaning, handle as fragile."],
                    ["Clean appropriately", "Radial wipes; mold protocol if needed. Document before/after."],
                    ["Resurface only if needed", "JFJ, read side only; re-clean after."],
                    ["Mount in Pioneer", "PureRead in Master mode."],
                    ["First pass", "Grab all easily-readable sectors fast and build a bad-sector map (ddrescue -n -b 2048 /dev/srX out.iso map.log, or IsoBuster on Windows). For Photo CDs, extract the full ISO; recover the .PCD images from inside afterward."],
                    ["Targeted retry passes", "On bad sectors only (ddrescue -r3 ...). Accept hours/days on heavily damaged discs."],
                    ["Swap to LiteOn", "Run the same map so its different laser fills sectors the Pioneer couldn't. (Optional third drive — genuine Plextor — for irreplaceable Photo/audio CDs.)"],
                    ["Persistent bad sectors", "Re-clean, re-seat, slow read speed, re-run. Track recovered % per attempt."],
                    ["Verify integrity", "Record MD5/SHA-256; mount the image and confirm files actually open. Note exactly which files (if any) are affected by remaining bad areas."],
                    ["Decide recoverable vs. not", "If multiple drives over multiple passes plateau, declare affected files unrecoverable — and report the specific % and which files recovered. Partial recovery is still a win."],
                    ["Package results", "Verified files + ISO + checksum + before/after photos + a short condition/recovery report (drives, passes, % recovered, lost files). Store the physical disc safely until return."],
                  ].map(([t, b], i) => (
                    <li key={t} className="flex gap-4 rounded-xl border border-ink-200 bg-white/50 p-4">
                      <span className="font-mono text-[13px] text-brand-600 shrink-0 w-6">{String(i + 1).padStart(2, "0")}</span>
                      <span>
                        <span className="font-display font-semibold text-[14px] text-ink-900">{t}.</span>{" "}
                        <span className="text-[13px] leading-relaxed text-ink-500">{b}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            {/* ── 7 · Chain of custody & QC ──────────────────── */}
            <section>
              <SectionHead n="7" id="custody" title="Chain of custody & QC" />
              <p className="mt-4 text-[15px] leading-relaxed text-ink-600 max-w-2xl" data-reveal>
                A mandatory, timestamped chain of custody is logged in the lab UI on every job. Insured + tracked
                shipping on <strong className="text-ink-700">every</strong> leg, with bar-coded door-to-door tracking
                and a GPS/AirTag-style tracker in shipments — including the return package.
              </p>
              <ol className="mt-5 space-y-2.5 max-w-2xl" data-reveal>
                {[
                  ["Scan-in on receipt", "+ photo of disc condition on arrival — protects operator and customer; pre-existing damage is documented."],
                  ["Log each processing step", "Every step timestamped and labeled in the lab UI."],
                  ["Scan-out on return", "With tracking #. Originals never leave handling undocumented."],
                ].map(([t, b], i) => (
                  <li key={t} className="flex gap-4 rounded-xl border border-ink-200 bg-white/50 p-4">
                    <span className="font-mono text-[13px] text-brand-600 shrink-0">{i + 1}</span>
                    <span className="text-[14px] leading-relaxed text-ink-600">
                      <strong className="text-ink-900">{t}</strong> {b}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-6 rounded-2xl border border-ink-200 bg-white/60 backdrop-blur p-6 max-w-2xl" data-reveal>
                <div className="micro-label">QC mechanisms</div>
                <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-ink-600">
                  {[
                    "Sampling that scales with trust: 100% during probation → 50% → 20% → trusted-tier, with a permanent random floor (5–10%) that never goes to zero.",
                    "Photo/video verification of unboxing and re-packing on every job.",
                    "Output spot-checks against ground truth where Heirvo has reference data (byte/file compare).",
                    "Blind re-test discs: a known-condition disc disguised as a real customer job — the single best detector of an operator who quietly started cutting corners.",
                  ].map((li) => (
                    <li key={li} className="flex gap-2.5">
                      <span className="mt-2 w-1 h-1 rounded-full bg-brand-500 shrink-0" />
                      <span>{li}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 rounded-2xl border border-amber-300/60 bg-amber-50/60 p-6 max-w-2xl" data-reveal>
                <div className="micro-label text-amber-700">The irreplaceability rule — protocol step #1</div>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-700">
                  Wherever feasible, originals are imaged/photographed <em>before</em> any recovery attempt, so a
                  “lost” original is never truly the only copy. This is the ultimate backstop against the one
                  failure mode that matters.
                </p>
              </div>
            </section>

          </div>

          <div className="mt-16 border-t border-ink-200 pt-8 text-[13px] text-ink-400 font-mono" data-reveal>
            Heirvo Lab Network · operator handbook · internal use only · labs@heirvo.com
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
