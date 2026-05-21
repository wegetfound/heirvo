import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { useMeta } from "../lib/useMeta";

// Airtable config — set in .env (see .env.example).
// PAT should be scoped to data.records:write on this base only.
const AIRTABLE_PAT = (import.meta.env.VITE_AIRTABLE_PAT as string) || "";
const AIRTABLE_BASE_ID = (import.meta.env.VITE_AIRTABLE_BASE_ID as string) || "";
const AIRTABLE_TABLE = "Operators";

const METROS = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Dallas–Fort Worth",
  "Houston",
  "Atlanta",
  "Phoenix",
  "Miami",
  "Washington DC",
  "Seattle",
  "Other",
];

const TOOLS = [
  "ddrescue",
  "IsoBuster",
  "Exact Audio Copy",
  "VLC",
  "HandBrake",
  "CDCheck",
  "Never used these",
  "Other",
];

const STEPS = [
  { id: "identity",    label: "About you"     },
  { id: "workspace",   label: "Workspace"     },
  { id: "experience",  label: "Experience"    },
  { id: "temperament", label: "Your approach" },
  { id: "confirm",     label: "Confirm"       },
];

interface FormData {
  name: string;
  email: string;
  phone: string;
  metro: string;
  zip: string;
  over18: boolean;

  workspaceDesc: string;
  workspaceLockable: string;
  workspaceShared: string;

  opticalExperience: string;
  toolsUsed: string[];
  drivesOwned: string;
  willingToBuyGear: string;
  computerOs: string;

  irreplaceableScenario: string;
  damageScenario: string;
  hopelessScenario: string;
  detailScenario: string;

  hoursPerWeek: string;
  duration: string;
  whyThisWork: string;
  hearAbout: string;

  consentBackgroundCheck: boolean;
  consentIC: boolean;
  consentTerritory: boolean;
}

const EMPTY: FormData = {
  name: "", email: "", phone: "", metro: "", zip: "", over18: false,
  workspaceDesc: "", workspaceLockable: "", workspaceShared: "",
  opticalExperience: "", toolsUsed: [], drivesOwned: "", willingToBuyGear: "", computerOs: "",
  irreplaceableScenario: "", damageScenario: "", hopelessScenario: "", detailScenario: "",
  hoursPerWeek: "", duration: "", whyThisWork: "", hearAbout: "",
  consentBackgroundCheck: false, consentIC: false, consentTerritory: false,
};

type Errors = Partial<Record<keyof FormData, string>>;

export default function LabsApply() {
  useMeta(
    "Apply — Heirvo Lab Network",
    "Apply to operate a Heirvo disc-recovery lab in your metro. Temperament over résumé. Five short sections, ~15 minutes.",
    "https://heirvo.com/labs/apply"
  );

  const scopeRef  = useRef<HTMLDivElement>(null);
  const stepRef   = useRef<HTMLDivElement>(null);

  const [step,        setStep]        = useState(0);
  const [form,        setForm]        = useState<FormData>(EMPTY);
  const [errors,      setErrors]      = useState<Errors>({});
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-reveal]", {
        y: 28, opacity: 0, duration: 0.9, stagger: 0.13, ease: "expo.out", delay: 0.1,
      });
    }, scopeRef);
    return () => ctx.revert();
  }, []);

  const goToStep = (n: number) => {
    const el = stepRef.current;
    if (!el) { setStep(n); return; }
    gsap.to(el, {
      opacity: 0, y: 12, duration: 0.18, ease: "power2.in",
      onComplete: () => {
        setStep(n);
        window.scrollTo({ top: 0, behavior: "smooth" });
        gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.32, ease: "expo.out" });
      },
    });
  };

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => {
    setForm(prev => ({ ...prev, [k]: v }));
    setErrors(prev => ({ ...prev, [k]: undefined }));
  };

  const toggleTool = (tool: string) => {
    setForm(prev => ({
      ...prev,
      toolsUsed: prev.toolsUsed.includes(tool)
        ? prev.toolsUsed.filter(t => t !== tool)
        : [...prev.toolsUsed, tool],
    }));
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (step === 0) {
      if (!form.name.trim())                               e.name = "Required";
      if (!/\S+@\S+\.\S+/.test(form.email))               e.email = "Valid email required";
      if (!form.metro)                                     e.metro = "Select your metro";
      if (!form.over18)                                    e.over18 = "Required to proceed";
    }
    if (step === 1) {
      if (!form.workspaceDesc.trim())                      e.workspaceDesc = "Required";
      if (!form.workspaceLockable)                         e.workspaceLockable = "Required";
    }
    if (step === 2) {
      if (!form.opticalExperience.trim())                  e.opticalExperience = "Required";
      if (!form.willingToBuyGear)                          e.willingToBuyGear = "Required";
    }
    if (step === 3) {
      if (!form.irreplaceableScenario.trim())              e.irreplaceableScenario = "Required";
      if (!form.damageScenario.trim())                     e.damageScenario = "Required";
    }
    if (step === 4) {
      if (!form.hoursPerWeek)                              e.hoursPerWeek = "Required";
      if (!form.whyThisWork.trim())                        e.whyThisWork = "Required";
      if (!form.consentBackgroundCheck)                    e.consentBackgroundCheck = "Required";
      if (!form.consentIC)                                 e.consentIC = "Required";
      if (!form.consentTerritory)                          e.consentTerritory = "Required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) goToStep(step + 1); };
  const back = () => goToStep(step - 1);

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
        throw new Error("Airtable is not configured. Please email labs@heirvo.com directly.");
      }
      const fields: Record<string, unknown> = {
        "Full name":                             form.name,
        "Email":                                 form.email,
        "Phone":                                 form.phone,
        "Metro":                                 form.metro,
        "ZIP":                                   form.zip,
        "Over 18 / eligible to work":            form.over18,
        "Workspace description":                 form.workspaceDesc,
        "Is workspace lockable?":                form.workspaceLockable,
        "Others share the space?":               form.workspaceShared,
        "Optical/recovery experience":           form.opticalExperience,
        "Tools used":                            form.toolsUsed,
        "Drives currently owned":                form.drivesOwned,
        "Willing to buy ~$140–200 own gear?":    form.willingToBuyGear,
        "Computer & OS":                         form.computerOs,
        "Irreplaceable item scenario":           form.irreplaceableScenario,
        "Damage scenario":                       form.damageScenario,
        "Hopeless disc scenario":                form.hopelessScenario,
        "Detail/repetition scenario":            form.detailScenario,
        "Hours/week available":                  form.hoursPerWeek,
        "How long looking to do this?":          form.duration,
        "Why this work specifically?":           form.whyThisWork,
        "How did you hear?":                     form.hearAbout,
        "Willing to complete background check":  form.consentBackgroundCheck,
        "Understand IC work":                    form.consentIC,
        "Understand territory model":            form.consentTerritory,
        "Status":                                "Applied",
        "Source":                                "/labs/apply",
      };
      const resp = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${AIRTABLE_PAT}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fields }),
        }
      );
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error((body as { error?: { message?: string } }).error?.message ?? `HTTP ${resp.status}`);
      }
      setSubmitted(true);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Submission failed. Email labs@heirvo.com directly."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Shared style helpers ────────────────────────────────────────────────────

  const inputCls = (err?: string) =>
    `w-full rounded-xl border px-4 py-3 text-[14px] text-ink-900 bg-white/80 backdrop-blur placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-400/50 transition-all duration-150 ${err ? "border-red-400" : "border-ink-200"}`;

  const textareaCls = (err?: string) =>
    `w-full rounded-xl border px-4 py-3 text-[14px] text-ink-900 bg-white/80 backdrop-blur placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-400/50 transition-all duration-150 resize-none ${err ? "border-red-400" : "border-ink-200"}`;

  const selectCls = (err?: string) =>
    `w-full rounded-xl border px-4 py-3 text-[14px] text-ink-900 bg-white/80 backdrop-blur focus:outline-none focus:ring-2 focus:ring-brand-400/50 transition-all duration-150 appearance-none ${err ? "border-red-400" : "border-ink-200"}`;

  const ErrMsg = ({ msg }: { msg?: string }) =>
    msg ? <p className="mt-1.5 text-[12px] text-red-500">{msg}</p> : null;

  const Label = ({ text, required }: { text: string; required?: boolean }) => (
    <label className="block text-[13px] font-medium text-ink-700 mb-1.5">
      {text}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );

  const RadioGroup = ({
    name, options, value, onChange, err,
  }: {
    name: string; options: string[]; value: string;
    onChange: (v: string) => void; err?: string;
  }) => (
    <div>
      <div className="space-y-2.5 mt-1">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-3 cursor-pointer group">
            <input
              type="radio" name={name} value={opt} checked={value === opt}
              onChange={e => onChange(e.target.value)}
              className="text-brand-600 focus:ring-brand-400/50"
            />
            <span className="text-[14px] text-ink-700 group-hover:text-ink-900 transition-colors">{opt}</span>
          </label>
        ))}
      </div>
      <ErrMsg msg={err} />
    </div>
  );

  // ── Success screen ──────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="relative">
        <meta name="robots" content="noindex, nofollow" />
        <Nav />
        <main ref={scopeRef} className="relative">
          <div className="mesh-bg absolute inset-0 -z-10" />
          <div className="container-narrow pt-16 pb-32 sm:pt-24">
            <div className="max-w-2xl" data-reveal>
              <span className="micro-label" style={{ color: "#30d158" }}>Application received</span>
              <h1
                className="mt-3 font-display font-bold text-ink-900"
                style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.1, letterSpacing: "-0.03em", textWrap: "balance" }}
              >
                We have your application.
              </h1>
              <p className="mt-5 text-[17px] leading-relaxed text-ink-500 max-w-xl">
                If the bench in{" "}
                <strong className="text-ink-700">{form.metro || "your metro"}</strong> is open and your
                application passes an initial read, we'll be in touch at{" "}
                <strong className="text-ink-700">{form.email}</strong> within 5–7 business days.
              </p>
              <div className="mt-6 rounded-2xl border border-amber-300/60 bg-amber-50/60 backdrop-blur p-6 space-y-3">
                <p className="text-[14px] leading-relaxed text-amber-800">
                  <strong>One thing left:</strong> email a photo of your dedicated workspace to{" "}
                  <a
                    href="mailto:labs@heirvo.com?subject=Workspace%20photo%20%E2%80%94%20Lab%20application"
                    className="underline underline-offset-2 hover:no-underline"
                  >
                    labs@heirvo.com
                  </a>{" "}
                  with subject line{" "}
                  <span className="font-mono text-[13px]">Workspace photo — Lab application</span>.
                  Applications without a photo are not advanced.
                </p>
              </div>
              <div className="mt-8">
                <a href="/labs" className="btn btn-ghost">← Back to Lab Network</a>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      <meta name="robots" content="noindex, nofollow" />
      <Nav />
      <main ref={scopeRef} className="relative">
        <div className="mesh-bg absolute inset-0 -z-10" />
        <div className="container-narrow pt-16 pb-32 sm:pt-24">

          {/* Header */}
          <div className="max-w-2xl mb-10" data-reveal>
            <span className="micro-label">Heirvo Lab Network · Operator application</span>
            <h1
              className="mt-3 font-display font-bold text-ink-900"
              style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.1, letterSpacing: "-0.03em", textWrap: "balance" }}
            >
              Apply to operate a lab.
            </h1>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-500 max-w-xl">
              Temperament over résumé. Five short sections — about 15 minutes. We read every application personally.
            </p>
          </div>

          {/* Progress stepper */}
          <div className="mb-10 max-w-2xl" data-reveal>
            <div className="flex items-center">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold transition-all duration-300 ${
                        i < step
                          ? "bg-brand-600 text-white"
                          : i === step
                            ? "bg-brand-100 text-brand-700 ring-2 ring-brand-400/40"
                            : "bg-ink-100 text-ink-400"
                      }`}
                    >
                      {i < step ? "✓" : i + 1}
                    </div>
                    <span
                      className={`text-[12px] font-medium hidden sm:block transition-colors duration-200 ${
                        i === step ? "text-ink-800" : i < step ? "text-brand-600" : "text-ink-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`h-px mx-3 flex-1 transition-all duration-300 ${
                        i < step ? "bg-brand-400" : "bg-ink-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step panel */}
          <div ref={stepRef} className="max-w-2xl">

            {/* ── Step 0: Identity ─────────────────────────────────────────── */}
            {step === 0 && (
              <div className="rounded-2xl border border-ink-200 bg-white/60 backdrop-blur p-6 sm:p-8 space-y-5">
                <div>
                  <span className="micro-label">Section A</span>
                  <h2 className="mt-2 font-display font-bold text-ink-900 text-[22px]">About you</h2>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label text="Full name" required />
                    <input
                      type="text" autoComplete="name" value={form.name}
                      onChange={e => set("name", e.target.value)}
                      className={inputCls(errors.name)} placeholder="Your full name"
                    />
                    <ErrMsg msg={errors.name} />
                  </div>

                  <div>
                    <Label text="Email" required />
                    <input
                      type="email" autoComplete="email" value={form.email}
                      onChange={e => set("email", e.target.value)}
                      className={inputCls(errors.email)} placeholder="you@example.com"
                    />
                    <ErrMsg msg={errors.email} />
                  </div>

                  <div>
                    <Label text="Phone" />
                    <input
                      type="tel" autoComplete="tel" value={form.phone}
                      onChange={e => set("phone", e.target.value)}
                      className={inputCls()} placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <div>
                    <Label text="Metro / city" required />
                    <div className="relative">
                      <select
                        value={form.metro} onChange={e => set("metro", e.target.value)}
                        className={selectCls(errors.metro)}
                      >
                        <option value="">Select your metro</option>
                        {METROS.map(m => <option key={m}>{m}</option>)}
                      </select>
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 text-[12px]">▾</span>
                    </div>
                    <ErrMsg msg={errors.metro} />
                  </div>

                  <div>
                    <Label text="ZIP code" />
                    <input
                      type="text" value={form.zip} maxLength={10}
                      onChange={e => set("zip", e.target.value)}
                      className={inputCls()} placeholder="10001"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox" checked={form.over18}
                      onChange={e => set("over18", e.target.checked)}
                      className="mt-0.5 rounded border-ink-300 text-brand-600 focus:ring-brand-400/50"
                    />
                    <span className="text-[14px] text-ink-700">
                      I am 18 or older and legally able to work in the United States
                      <span className="text-red-400 ml-0.5">*</span>
                    </span>
                  </label>
                  <ErrMsg msg={errors.over18} />
                </div>
              </div>
            )}

            {/* ── Step 1: Workspace ────────────────────────────────────────── */}
            {step === 1 && (
              <div className="rounded-2xl border border-ink-200 bg-white/60 backdrop-blur p-6 sm:p-8 space-y-6">
                <div>
                  <span className="micro-label">Section B</span>
                  <h2 className="mt-2 font-display font-bold text-ink-900 text-[22px]">Your workspace</h2>
                  <p className="mt-2 text-[14px] text-ink-500 leading-relaxed">
                    Customer discs enter your home. The workspace is the foundation of the chain of custody — it's not optional.
                  </p>
                </div>

                <div>
                  <Label text="Describe your dedicated work area" required />
                  <textarea
                    value={form.workspaceDesc}
                    onChange={e => set("workspaceDesc", e.target.value)}
                    className={textareaCls(errors.workspaceDesc)}
                    placeholder="Where is it, what makes it dedicated, is it used for anything else..."
                    rows={4}
                  />
                  <ErrMsg msg={errors.workspaceDesc} />
                </div>

                <div>
                  <Label text="Is your workspace lockable / can you restrict access to it?" required />
                  <RadioGroup
                    name="workspaceLockable"
                    options={["Yes — it locks now", "No — but I can make it so", "No"]}
                    value={form.workspaceLockable}
                    onChange={v => set("workspaceLockable", v)}
                    err={errors.workspaceLockable}
                  />
                </div>

                <div>
                  <Label text="Do others have access to this space?" />
                  <RadioGroup
                    name="workspaceShared"
                    options={["No — it's mine alone", "Sometimes (family, housemates)", "Yes, regularly"]}
                    value={form.workspaceShared}
                    onChange={v => set("workspaceShared", v)}
                  />
                </div>

                <div className="rounded-xl border border-amber-300/60 bg-amber-50/60 p-4">
                  <p className="text-[13px] leading-relaxed text-amber-800">
                    <strong>Workspace photo required.</strong> After submitting, email a photo to{" "}
                    <a
                      href="mailto:labs@heirvo.com?subject=Workspace%20photo%20%E2%80%94%20Lab%20application"
                      className="underline underline-offset-2 hover:no-underline"
                    >
                      labs@heirvo.com
                    </a>{" "}
                    with subject{" "}
                    <span className="font-mono text-[12px]">Workspace photo — Lab application</span>.
                    Applications without a photo are not advanced to screening.
                  </p>
                </div>
              </div>
            )}

            {/* ── Step 2: Experience ───────────────────────────────────────── */}
            {step === 2 && (
              <div className="rounded-2xl border border-ink-200 bg-white/60 backdrop-blur p-6 sm:p-8 space-y-6">
                <div>
                  <span className="micro-label">Section C</span>
                  <h2 className="mt-2 font-display font-bold text-ink-900 text-[22px]">Experience & setup</h2>
                  <p className="mt-2 text-[14px] text-ink-500 leading-relaxed">
                    Experience is context, not a gate. A careful person new to optical drives beats a careless veteran.
                  </p>
                </div>

                <div>
                  <Label text="Optical drive or data-recovery experience" required />
                  <textarea
                    value={form.opticalExperience}
                    onChange={e => set("opticalExperience", e.target.value)}
                    className={textareaCls(errors.opticalExperience)}
                    placeholder="Any disc-ripping, recovery software, or optical drive experience — or none at all. Be direct."
                    rows={4}
                  />
                  <ErrMsg msg={errors.opticalExperience} />
                </div>

                <div>
                  <Label text="Tools you've used (select all that apply)" />
                  <div className="flex flex-wrap gap-2 mt-1">
                    {TOOLS.map(tool => (
                      <button
                        key={tool} type="button" onClick={() => toggleTool(tool)}
                        className={`rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-all duration-150 ${
                          form.toolsUsed.includes(tool)
                            ? "border-brand-400 bg-brand-50 text-brand-700"
                            : "border-ink-200 bg-white/70 text-ink-600 hover:border-ink-300"
                        }`}
                      >
                        {tool}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label text="Drives you currently own (if any)" />
                  <input
                    type="text" value={form.drivesOwned}
                    onChange={e => set("drivesOwned", e.target.value)}
                    className={inputCls()} placeholder="e.g. Pioneer BDR-2213, LiteOn iHAS, none yet…"
                  />
                </div>

                <div>
                  <Label text="Comfortable buying ~$140–200 of your own gear from third-party sellers?" required />
                  <RadioGroup
                    name="willingToBuyGear"
                    options={["Yes", "Need to learn more before deciding", "No"]}
                    value={form.willingToBuyGear}
                    onChange={v => set("willingToBuyGear", v)}
                    err={errors.willingToBuyGear}
                  />
                </div>

                <div>
                  <Label text="Computer and OS you'd use" />
                  <input
                    type="text" value={form.computerOs}
                    onChange={e => set("computerOs", e.target.value)}
                    className={inputCls()} placeholder="e.g. Windows 11, custom AMD Ryzen build…"
                  />
                </div>
              </div>
            )}

            {/* ── Step 3: Temperament ──────────────────────────────────────── */}
            {step === 3 && (
              <div className="rounded-2xl border border-ink-200 bg-white/60 backdrop-blur p-6 sm:p-8 space-y-6">
                <div>
                  <span className="micro-label">Section D</span>
                  <h2 className="mt-2 font-display font-bold text-ink-900 text-[22px]">Your approach</h2>
                  <p className="mt-2 text-[14px] text-ink-500 leading-relaxed">
                    These four questions carry more weight than everything else combined. Take your time — we read every answer.
                  </p>
                </div>

                <div className="pl-5 border-l-2 border-brand-200 space-y-6">
                  <div>
                    <Label
                      text="Describe a time you were responsible for something irreplaceable that belonged to someone else."
                      required
                    />
                    <textarea
                      value={form.irreplaceableScenario}
                      onChange={e => set("irreplaceableScenario", e.target.value)}
                      className={textareaCls(errors.irreplaceableScenario)}
                      placeholder="What was it, what did you do, what were the stakes…"
                      rows={5}
                    />
                    <ErrMsg msg={errors.irreplaceableScenario} />
                  </div>

                  <div>
                    <Label
                      text="Walk through exactly what you'd do if you realized you just damaged a customer's only disc."
                      required
                    />
                    <textarea
                      value={form.damageScenario}
                      onChange={e => set("damageScenario", e.target.value)}
                      className={textareaCls(errors.damageScenario)}
                      placeholder="Step by step — what do you do, who do you contact, what do you say…"
                      rows={5}
                    />
                    <ErrMsg msg={errors.damageScenario} />
                  </div>
                </div>

                <div>
                  <Label text="A disc seems genuinely hopeless after hours of effort. What do you do?" />
                  <textarea
                    value={form.hopelessScenario}
                    onChange={e => set("hopelessScenario", e.target.value)}
                    className={textareaCls()}
                    placeholder="Do you keep going? Stop and report honestly? Something else?"
                    rows={4}
                  />
                </div>

                <div>
                  <Label text="How do you keep track of small, detailed, repetitive steps so nothing slips?" />
                  <textarea
                    value={form.detailScenario}
                    onChange={e => set("detailScenario", e.target.value)}
                    className={textareaCls()}
                    placeholder="Your actual system — checklists, notes, habits, whatever works for you…"
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* ── Step 4: Confirm ──────────────────────────────────────────── */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-ink-200 bg-white/60 backdrop-blur p-6 sm:p-8 space-y-5">
                  <div>
                    <span className="micro-label">Section E</span>
                    <h2 className="mt-2 font-display font-bold text-ink-900 text-[22px]">Availability</h2>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <Label text="Hours/week you can commit" required />
                      <div className="relative">
                        <select
                          value={form.hoursPerWeek} onChange={e => set("hoursPerWeek", e.target.value)}
                          className={selectCls(errors.hoursPerWeek)}
                        >
                          <option value="">Select</option>
                          {["2–5 hrs/week", "5–10 hrs/week", "10–20 hrs/week", "20+ hrs/week"].map(o => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 text-[12px]">▾</span>
                      </div>
                      <ErrMsg msg={errors.hoursPerWeek} />
                    </div>

                    <div>
                      <Label text="How long are you looking to do this?" />
                      <div className="relative">
                        <select
                          value={form.duration} onChange={e => set("duration", e.target.value)}
                          className={selectCls()}
                        >
                          <option value="">Select</option>
                          {["Just trying it out", "6 months+", "1 year+", "Long term"].map(o => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 text-[12px]">▾</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label text="Why this work specifically?" required />
                    <textarea
                      value={form.whyThisWork}
                      onChange={e => set("whyThisWork", e.target.value)}
                      className={textareaCls(errors.whyThisWork)}
                      placeholder="Disc preservation, the craft, the income model, the mission — what draws you to it specifically…"
                      rows={4}
                    />
                    <ErrMsg msg={errors.whyThisWork} />
                  </div>

                  <div>
                    <Label text="How did you hear about Heirvo Labs?" />
                    <input
                      type="text" value={form.hearAbout}
                      onChange={e => set("hearAbout", e.target.value)}
                      className={inputCls()} placeholder="Reddit, word of mouth, social media…"
                    />
                  </div>
                </div>

                {/* Consents */}
                <div className="rounded-2xl border border-ink-200 bg-white/60 backdrop-blur p-6 sm:p-8 space-y-4">
                  <div>
                    <span className="micro-label">Section F</span>
                    <h2 className="mt-2 font-display font-bold text-ink-900 text-[18px]">Acknowledgments</h2>
                  </div>
                  {([
                    { key: "consentBackgroundCheck" as const, text: "I'm willing to complete a background check if my application is advanced." },
                    { key: "consentIC"              as const, text: "I understand this is independent-contractor work — my own hours, my own gear, my own taxes." },
                    { key: "consentTerritory"       as const, text: "I understand territory is earned via a paid trial and granted as a revocable performance lease — never purchased." },
                  ]).map(({ key, text }) => (
                    <div key={key}>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox" checked={form[key] as boolean}
                          onChange={e => set(key, e.target.checked)}
                          className="mt-0.5 rounded border-ink-300 text-brand-600 focus:ring-brand-400/50"
                        />
                        <span className="text-[14px] text-ink-700">
                          {text}<span className="text-red-400 ml-0.5">*</span>
                        </span>
                      </label>
                      <ErrMsg msg={errors[key]} />
                    </div>
                  ))}
                </div>

                {submitError && (
                  <div className="rounded-xl border border-red-200 bg-red-50/80 px-5 py-4 text-[14px] text-red-700">
                    {submitError}
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between gap-4">
              {step > 0 ? (
                <button type="button" onClick={back} className="btn btn-ghost">← Back</button>
              ) : (
                <a href="/labs" className="btn btn-ghost">← Back to Lab Network</a>
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={next} className="btn btn-primary">
                  Continue →
                </button>
              ) : (
                <button
                  type="button" onClick={submit}
                  disabled={submitting}
                  className="btn btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting…" : "Submit application →"}
                </button>
              )}
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
