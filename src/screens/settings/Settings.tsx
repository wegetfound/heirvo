import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useLicense } from "@/lib/useLicense";
import { useTheme } from "@/lib/theme";
import { Loader2, Check, ExternalLink, LogOut, Sparkles, FolderOpen, FileText, Volume2, Play, Mail, ChevronDown, ChevronRight, Mic, Film, Sun, Moon, Zap, ImageIcon } from "lucide-react";
import { ipc, events } from "@/lib/ipc";
import { audio, type AudioPrefs } from "@/lib/audio";
import type { PreflightStatus, WhisperModelInfo, ImagemagickStatus, InstallProgress } from "@/lib/types";
import { PRICING } from "@/lib/pricing";

const CHECKOUT_RECOVER_URL = "https://heirvo.lemonsqueezy.com/checkout/buy/a98b575c-fe61-48ee-835f-984b590ec4e2";
const CHECKOUT_ARCHIVE_URL = "https://heirvo.lemonsqueezy.com/checkout/buy/61a31119-78f7-4612-ade8-d9897eaf7015";
const CHECKOUT_FAMILY_URL  = "https://heirvo.lemonsqueezy.com/checkout/buy/b7b36e1f-e286-4508-b58b-2ec90ea4a75e";
const SUPPORT_URL = "https://heirvo.com/support";
const MAILIN_URL = "https://heirvo.com/recover";

export function Settings() {
  const { status, loaded, activate, deactivate } = useLicense();
  const [key, setKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const submit = async () => {
    if (!key.trim()) return;
    setSubmitting(true);
    setErr(null);
    try {
      await activate(key);
      setKey("");
    } catch (e) {
      setErr(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirmDeactivate) {
      setConfirmDeactivate(true);
      setTimeout(() => setConfirmDeactivate(false), 5000);
      return;
    }
    await deactivate();
    setConfirmDeactivate(false);
  };

  const isPaid = status.plan !== "free";

  if (!loaded) {
    return (
      <div className="mx-auto max-w-2xl px-8 py-12">
        <Loader2 className="h-5 w-5 animate-spin text-ink-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-6">
      {/* Header — status-aware */}
      <header className="mb-5">
        <span className="micro-label">Settings</span>
        <h1 className="mt-1.5 font-display text-[24px] font-semibold tracking-[-0.025em] text-ink-900">
          Your Heirvo
        </h1>
        <p className="mt-1 text-[13px] text-ink-500">
          {isPaid
            ? "Everything set up and ready to go."
            : "You're using the free version. Upgrade when you're ready — your memories are worth it."}
        </p>
      </header>

      {/* Paid — active tier + mail-in side by side */}
      {isPaid && (
        <div className="grid grid-cols-2 gap-5">
          <ActiveTierPanel
            plan={status.plan}
            holder={status.holder ?? null}
            confirmDeactivate={confirmDeactivate}
            onDeactivate={handleDeactivate}
          />
          <MailInPanel />
        </div>
      )}

      {/* Free — 3-tier pricing grid + mail-in strip */}
      {!isPaid && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <TierCard
              badge="Recover"
              title="Save every rescued disc."
              subtitle="One payment — export everything you recover."
              features={["Save as MP4 or ISO", "Chapter extract", "All-files export", "Voice search on discs"]}
              price={PRICING.recover.label}
              cta="Get Recover"
              url={CHECKOUT_RECOVER_URL}
              gradient="linear-gradient(160deg, #1a3fa8 0%, #0f276e 55%, #091850 100%)"
              borderColor="rgba(110,150,255,0.35)"
              glowColor="#6ea8ff"
            />
            <TierCard
              badge="Archive"
              title="Discs + your memories."
              subtitle="Recover discs AND build a personal media vault."
              features={["Everything in Recover", "Import photos, video & audio", "Albums & folder drops", "Voice search on imports"]}
              price={PRICING.archive.label}
              cta="Get Archive"
              url={CHECKOUT_ARCHIVE_URL}
              gradient="linear-gradient(160deg, #2e1065 0%, #1e0a45 55%, #0f0530 100%)"
              borderColor="rgba(167,139,250,0.45)"
              glowColor="#a78bfa"
              highlight
            />
            <TierCard
              badge="Family"
              title="Built for families."
              subtitle="Archive for the whole household — on every computer you own."
              features={["Everything in Archive", "Use on up to 5 of your devices", "Priority support"]}
              price={PRICING.family.label}
              cta="Get Family"
              url={CHECKOUT_FAMILY_URL}
              gradient="linear-gradient(160deg, #1c1917 0%, #0f0a07 55%, #080503 100%)"
              borderColor="rgba(251,191,36,0.35)"
              glowColor="#fbbf24"
            />
          </div>
          <MailInStrip />
        </div>
      )}

      {/* Already purchased — full width below the pricing section */}
      {!isPaid && (
        <div className="mt-4 rounded-2xl border border-ink-200/70 bg-white/60 p-5">
          <span className="micro-label">Already purchased?</span>
          <p className="mt-1 text-[12px] text-ink-500">
            Enter the code from your purchase email to unlock all features.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              className="input flex-1 font-mono text-[13px]"
              placeholder="Paste your code here"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={submitting}
            />
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={!key.trim() || submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate"}
            </button>
          </div>
          {err && <p className="mt-2 text-[12px] text-ios-red">{err}</p>}
        </div>
      )}

      {/* Sound */}
      <SoundPanel />

      {/* AutoPlay */}
      <AutoPlayPanel />

      {/* Appearance */}
      <AppearancePanel />

      {/* System status */}
      <SystemStatusPanel />

      {/* Vault storage — imported media disk usage */}
      <VaultStoragePanel />

      {/* Transcription model */}
      <TranscriptionModelPanel />

      {/* Need help? — promoted above footer */}
      <div className="mt-6 flex items-center justify-between rounded-2xl border border-ink-200/70 bg-white/60 px-5 py-4">
        <p className="text-[13px] text-ink-700">
          Need help? Our support team is here.
        </p>
        <button
          onClick={() => { void openUrl(SUPPORT_URL); }}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white/80 px-3 py-1.5 text-[12px] font-medium text-ink-700 hover:border-brand-300 hover:text-brand-600 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Contact support
        </button>
      </div>

      {/* Privacy */}
      <div className="mt-4 rounded-2xl border border-ink-200/70 bg-white/60 p-5">
        <span className="micro-label">Privacy</span>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-700">
          Heirvo runs entirely on your computer. We never upload your videos,
          photos, or recovered files anywhere. License validation only sends
          your key — never your media — and only when you activate or once a
          week to check for refunds.
        </p>
      </div>

      {/* Advanced & troubleshooting — collapsed by default */}
      <DiagnosticLogsPanel />

      {/* Footer — version + build stamp (tells you exactly which build is running) */}
      <div className="mt-4 flex items-center gap-2 text-[12px] text-ink-400">
        <span>Heirvo v1.1.0</span>
        <span className="font-mono text-[11px] text-ink-300">
          · build {__BUILD_HASH__} · {__BUILD_TIME__.replace("T", " ").slice(0, 16)} UTC
        </span>
      </div>
    </div>
  );
}

// ─── Active tier panel (any paid plan) ───────────────────────────────────────

function tierDisplayName(plan: string): string {
  if (plan === "recover") return "Recover";
  if (plan === "family") return "Family";
  return "Archive"; // archive + pro (legacy)
}

function ActiveTierPanel({
  plan,
  holder,
  confirmDeactivate,
  onDeactivate,
}: {
  plan: string;
  holder: string | null;
  confirmDeactivate: boolean;
  onDeactivate: () => void;
}) {
  const tierName = tierDisplayName(plan);
  return (
    <div
      className="mb-5 rounded-2xl border p-5"
      style={{
        background: "linear-gradient(135deg, rgba(52,199,89,0.10) 0%, rgba(52,199,89,0.04) 100%)",
        borderColor: "rgba(52,199,89,0.30)",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/90">
          <Check className="h-4 w-4 text-ios-green" />
        </div>
        <div className="flex-1">
          <div className="text-[16px] font-semibold text-ink-900">You're all set.</div>
          <div className="text-[12px] text-ink-600">
            {holder ? `Licensed to ${holder}` : "Active on this device."}
          </div>
        </div>
        <span className="rounded-full bg-ios-green/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-ios-green">
          {tierName}
        </span>
      </div>

      <p className="mt-4 text-[13px] leading-relaxed text-ink-600">
        Thank you for trusting us with something this important.
      </p>

      <div className="mt-5 border-t border-ios-green/20 pt-4">
        <button
          onClick={onDeactivate}
          className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white/80 px-3 py-1.5 text-[12px] font-medium text-ink-600 hover:border-ios-red/40 hover:text-ios-red transition-colors"
        >
          <LogOut className="h-3 w-3" />
          {confirmDeactivate ? "Confirm deactivate" : "Deactivate license"}
        </button>
        <p className="mt-2 text-[11px] text-ink-500">
          Removes the license from this device only. You can reactivate
          later with the same key.
        </p>
      </div>
    </div>
  );
}

// ─── Tier pricing card (used in free state) ───────────────────────────────────

function TierCard({
  badge,
  title,
  subtitle,
  features,
  price,
  cta,
  url,
  gradient,
  borderColor,
  glowColor,
  highlight = false,
}: {
  badge: string;
  title: string;
  subtitle: string;
  features: string[];
  price: string;
  cta: string;
  url: string;
  gradient: string;
  borderColor: string;
  glowColor: string;
  highlight?: boolean;
}) {
  const buy = () => { void openUrl(url); };
  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl"
      style={{
        background: gradient,
        borderColor,
        boxShadow: highlight ? `0 4px 28px rgba(120,80,255,0.35)` : `0 4px 20px rgba(0,0,0,0.30)`,
      }}
      onClick={buy}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-2xl"
        style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
      />

      {/* Most popular badge */}
      {highlight && (
        <div className="relative flex justify-center pt-3">
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
            style={{ background: "rgba(167,139,250,0.25)", color: "#c4b5fd" }}
          >
            Most popular
          </span>
        </div>
      )}

      <div className={`relative flex flex-col flex-1 p-4 ${highlight ? "pt-2" : ""}`}>
        {/* Badge + icon */}
        <div className="flex items-start justify-between mb-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
            style={{
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.16)",
            }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
            style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.80)" }}
          >
            {badge}
          </span>
        </div>

        {/* Title */}
        <h2 className="font-display text-[15px] font-bold leading-tight tracking-[-0.02em] text-white">
          {title}
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.50)" }}>
          {subtitle}
        </p>

        {/* Feature list */}
        <ul className="mt-3 space-y-1.5">
          {features.map((text) => (
            <li key={text} className="flex items-start gap-2">
              <div
                className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full"
                style={{ background: "rgba(74,222,128,0.20)" }}
              >
                <Check className="h-2 w-2" style={{ color: "#4ade80" }} />
              </div>
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.75)" }}>
                {text}
              </span>
            </li>
          ))}
        </ul>

        {/* Price + CTA */}
        <div className="mt-auto pt-4">
          <div className="flex items-baseline gap-1 mb-2.5">
            <span className="font-display text-[26px] font-bold tabular-nums leading-none text-white">
              {price}
            </span>
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>
              one-time
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); buy(); }}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
            style={{
              background: highlight
                ? "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)"
                : "linear-gradient(135deg, #4f7fff 0%, #2d5fe8 100%)",
              boxShadow: highlight
                ? "0 2px 14px rgba(124,58,237,0.55)"
                : "0 2px 12px rgba(45,95,232,0.50)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {cta}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mail-in strip (compact — used in free state below the 3 tier cards) ──────

function MailInStrip() {
  return (
    <div
      className="flex items-center justify-between rounded-2xl border px-5 py-4 cursor-pointer transition-colors hover:border-amber-500/50"
      style={{
        background: "linear-gradient(90deg, rgba(122,56,0,0.18) 0%, rgba(77,34,0,0.10) 100%)",
        borderColor: "rgba(255,159,10,0.28)",
      }}
      onClick={() => { void openUrl(MAILIN_URL); }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "rgba(255,159,10,0.18)", border: "1px solid rgba(255,159,10,0.28)" }}
        >
          <Mail className="h-4 w-4" style={{ color: "#FFB830" }} />
        </div>
        <div>
          <span className="text-[13px] font-semibold text-ink-900">Disc too damaged?</span>
          <span className="ml-2 text-[12px] text-ink-500">Mail it to us — professional tools, real people.</span>
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); void openUrl(MAILIN_URL); }}
        className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors hover:brightness-110"
        style={{
          background: "linear-gradient(135deg, #ff9f0a 0%, #d45f00 100%)",
          borderColor: "transparent",
          color: "white",
        }}
      >
        <Mail className="h-3 w-3" />
        Mail us your disc
        <ExternalLink className="h-3 w-3 opacity-75" />
      </button>
    </div>
  );
}

// ─── Mail-in disc service ─────────────────────────────────────────────────────

function MailInPanel() {
  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl"
      style={{
        background: "linear-gradient(160deg, #7a3800 0%, #4d2200 55%, #2e1500 100%)",
        borderColor: "rgba(255,159,10,0.38)",
        boxShadow: "0 4px 28px rgba(100,50,0,0.45)",
      }}
      onClick={() => { void openUrl(MAILIN_URL); }}
    >
      {/* Ambient glow — top right */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-2xl"
        style={{ background: "radial-gradient(circle, #ff9f0a 0%, transparent 70%)" }}
      />

      {/* Card body */}
      <div className="relative flex flex-col flex-1 p-5">
        {/* Icon + badge row */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
            style={{
              background: "rgba(255,159,10,0.18)",
              border: "1px solid rgba(255,159,10,0.30)",
            }}
          >
            <Mail className="h-5 w-5" style={{ color: "#FFB830" }} />
          </div>
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
            style={{ background: "rgba(255,159,10,0.18)", color: "rgba(255,185,80,0.90)" }}
          >
            Service
          </span>
        </div>

        {/* Title */}
        <h2 className="font-display text-[19px] font-bold leading-tight tracking-[-0.02em] text-white">
          Disc too damaged?
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
          Mail it to us — professional tools, real people.
        </p>

        {/* Feature list — amber checkmarks */}
        <ul className="mt-4 space-y-2">
          {[
            "No disc drive needed on your end",
            "Specialist tools for badly scratched discs",
            "Safe return — your disc comes back too",
          ].map((text) => (
            <li key={text} className="flex items-start gap-2.5">
              <div
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                style={{ background: "rgba(255,159,10,0.22)" }}
              >
                <Check className="h-2.5 w-2.5" style={{ color: "#FF9F0A" }} />
              </div>
              <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.75)" }}>
                {text}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA — pinned to bottom, full-width */}
        <div className="mt-auto pt-5">
          <button
            onClick={(e) => { e.stopPropagation(); void openUrl(MAILIN_URL); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #ff9f0a 0%, #d45f00 100%)",
              boxShadow: "0 2px 14px rgba(200,90,0,0.55)",
            }}
          >
            <Mail className="h-4 w-4" />
            Mail us your disc
            <ExternalLink className="h-3.5 w-3.5 opacity-75" />
          </button>
          <p className="mt-2 text-center text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>
            Separate paid service — pricing on the page
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── AutoPlay panel ───────────────────────────────────────────────────────────

function AutoPlayPanel() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    ipc.autoplayGetEnabled()
      .then(setEnabled)
      .catch(() => { /* non-fatal */ });
  }, []);

  const toggle = async () => {
    if (enabled === null) return;
    const next = !enabled;
    setEnabled(next); // optimistic
    setErr(null);
    try {
      await ipc.autoplaySetEnabled(next);
    } catch (e) {
      setEnabled(!next); // revert
      setErr(String(e));
    }
  };

  // Don't render the row at all if the backend command is unavailable
  if (enabled === null) return null;

  return (
    <div className="mt-4 rounded-2xl border border-ink-200/70 bg-white/60 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-100">
          {/* Simple disc icon — no extra import */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-ink-600">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
            <path d="M12 9V5" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <span className="micro-label">Disc insertion</span>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-ink-800">
                Open Heirvo when I insert a disc
              </p>
              <p className="mt-0.5 text-[12px] text-ink-500">
                When on, you can choose Heirvo to launch automatically as soon as a disc goes in — no more Windows pop-up asking what to do.
              </p>
              {err && (
                <p className="mt-1 text-[11px] text-ios-red">{err}</p>
              )}
            </div>
            {/* Toggle pill — same pattern as AppearancePanel */}
            <button
              onClick={() => void toggle()}
              aria-label={enabled ? "Disable open on disc insert" : "Enable open on disc insert"}
              className="relative ml-4 h-7 w-12 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              style={{
                background: enabled ? "#0A84FF" : "#E2DDD6",
              }}
            >
              <span
                className="absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200"
                style={{ transform: enabled ? "translateX(20px)" : "translateX(2px)" }}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Appearance panel ─────────────────────────────────────────────────────────

function AppearancePanel() {
  const { isDark, toggle } = useTheme();

  return (
    <div className="mt-4 rounded-2xl border border-ink-200/70 bg-white/60 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-100">
          {isDark ? (
            <Moon className="h-4 w-4 text-ink-600" />
          ) : (
            <Sun className="h-4 w-4 text-ink-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="micro-label">Appearance</span>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-ink-800">
                {isDark ? "Dark mode" : "Light mode"}
              </p>
              <p className="mt-0.5 text-[12px] text-ink-500">
                {isDark
                  ? "Cinematic dark theme — easier on the eyes at night."
                  : "Clean light theme — works great in any room."}
              </p>
            </div>
            {/* Toggle pill */}
            <button
              onClick={toggle}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="relative ml-4 h-7 w-12 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              style={{
                background: isDark ? "#C2741F" : "#E2DDD6",
              }}
            >
              <span
                className="absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200"
                style={{ transform: isDark ? "translateX(20px)" : "translateX(2px)" }}
              >
                {isDark ? (
                  <Moon className="h-3 w-3 text-ink-500" />
                ) : (
                  <Sun className="h-3 w-3 text-amber-500" />
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sound panel ──────────────────────────────────────────────────────────────

function SoundPanel() {
  const [prefs, setPrefsState] = useState<AudioPrefs>(() => audio.getPrefs());
  const [pendingVolume, setPendingVolume] = useState<number | null>(null);

  useEffect(() => {
    if (pendingVolume === null) return;
    const t = window.setTimeout(() => {
      audio.setPrefs({ volume: pendingVolume });
      setPrefsState(audio.getPrefs());
      setPendingVolume(null);
    }, 200);
    return () => window.clearTimeout(t);
  }, [pendingVolume]);

  const toggle = () => {
    const next = !prefs.enabled;
    audio.setPrefs({ enabled: next });
    setPrefsState(audio.getPrefs());
    if (next) audio.play("milestone");
  };

  const onVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value) / 100;
    setPrefsState((p) => ({ ...p, volume: v }));
    setPendingVolume(v);
  };

  const test = () => audio.play("recovery_done");
  const displayVolume = Math.round((pendingVolume ?? prefs.volume) * 100);

  return (
    <div className="mt-4 rounded-2xl border border-ink-200/70 bg-white/60 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-100">
          <Volume2 className="h-4 w-4 text-ink-600" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="micro-label">Sound</span>

          <label className="mt-3 flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={prefs.enabled}
              onChange={toggle}
              className="h-4 w-4 shrink-0 cursor-pointer accent-brand-500"
            />
            <span className="text-[13px] font-medium text-ink-800">
              Play a sound when recovery finishes
            </span>
          </label>
          <p className="mt-1.5 pl-7 text-[12px] text-ink-500">
            A gentle chime lets you know it's done — handy if you step away
            while Heirvo is working.
          </p>

          <div
            className={`mt-4 flex items-center gap-3 transition-opacity ${
              prefs.enabled ? "opacity-100" : "opacity-40 pointer-events-none"
            }`}
          >
            <span className="text-[11px] uppercase tracking-wider font-medium text-ink-500 w-14">
              Volume
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={displayVolume}
              onChange={onVolume}
              disabled={!prefs.enabled}
              className="flex-1 accent-brand-500 cursor-pointer"
              aria-label="Audio cue volume"
            />
            <span className="w-10 text-right tabular-nums text-[12px] text-ink-600">
              {displayVolume}%
            </span>
            <button
              onClick={test}
              disabled={!prefs.enabled}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white/80 px-3 py-1.5 text-[12px] font-medium text-ink-700 hover:border-brand-300 hover:text-brand-600 disabled:opacity-50 transition-colors"
            >
              <Play className="h-3 w-3" />
              Play a sample
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Diagnostic logs — collapsed under Advanced ───────────────────────────────

function DiagnosticLogsPanel() {
  const [expanded, setExpanded] = useState(false);
  const [path, setPath] = useState<string | null>(null);
  const [showPath, setShowPath] = useState(false);
  const [opening, setOpening] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    ipc.getLogPath()
      .then(setPath)
      .catch((e) => setErr(String(e)));
  }, []);

  const open = async () => {
    setOpening(true);
    setErr(null);
    try {
      await ipc.openLogFolder();
    } catch (e) {
      setErr(String(e));
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-ink-200/70 bg-white/60">
      {/* Collapsed trigger */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-5 py-3.5 text-left text-[13px] font-medium text-ink-600 hover:text-ink-900 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-400" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" />
        )}
        Advanced & troubleshooting
      </button>

      {expanded && (
        <div className="border-t border-ink-200/70 px-5 pb-5 pt-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-100">
              <FileText className="h-4 w-4 text-ink-600" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="micro-label">If something goes wrong</span>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-700">
                Heirvo quietly keeps a record of what it does behind the
                scenes. If you contact support, they may ask you to share this
                file — it helps them understand exactly what happened with
                your disc.
              </p>

              <button
                onClick={open}
                disabled={opening}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white/80 px-3 py-1.5 text-[12px] font-medium text-ink-700 hover:border-brand-300 hover:text-brand-600 disabled:opacity-50 transition-colors"
              >
                {opening ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <FolderOpen className="h-3 w-3" />
                )}
                Send activity log to support
              </button>

              {/* Raw path — hidden by default, revealed on request */}
              <button
                onClick={() => setShowPath((v) => !v)}
                className="mt-2 ml-0.5 text-[11px] text-ink-400 hover:text-ink-600 transition-colors underline underline-offset-2"
              >
                {showPath ? "Hide file location" : "Where is this file on my computer?"}
              </button>
              {showPath && path && (
                <p className="mt-1.5 break-all font-mono text-[11px] text-ink-500">
                  {path}
                </p>
              )}
              {err && <p className="mt-2 text-[11px] text-ios-red">{err}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Vault storage ────────────────────────────────────────────────────────────

function VaultStoragePanel() {
  const [stats, setStats] = useState<import("@/lib/types").VaultStats | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const s = await ipc.library.getVaultStats();
      setStats(s);
      setLoadErr(null);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const openVault = async () => {
    if (!stats?.vaultPath) return;
    try {
      await ipc.openFolder(stats.vaultPath);
    } catch {/* ignore — backend may not have access */}
  };

  return (
    <div className="mt-4 rounded-2xl border border-ink-200/70 bg-white/60 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-100">
          <FolderOpen className="h-4 w-4 text-ink-600" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="micro-label">Vault storage</span>
          {!stats && !loadErr && (
            <p className="mt-2 text-[13px] text-ink-500">Loading…</p>
          )}
          {loadErr && (
            <p className="mt-2 text-[13px] text-ios-red">Couldn't read vault: {loadErr}</p>
          )}
          {stats && (
            <>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-700">
                Your imported videos and audio live in a dedicated vault on this
                device. Removing a disc from your library frees the space.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <Stat label="Files" value={stats.fileCount.toLocaleString()} />
                <Stat label="Used" value={stats.bytesUsedDisplay} />
                <Stat label="Free on drive" value={stats.bytesFreeDisplay ?? "—"} />
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => void openVault()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white/80 px-3 py-1.5 text-[12px] font-medium text-ink-700 hover:border-brand-300 hover:text-brand-600 transition-colors"
                >
                  <FolderOpen className="h-3 w-3" />
                  Open vault folder
                </button>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white/80 px-3 py-1.5 text-[12px] font-medium text-ink-700 hover:border-brand-300 hover:text-brand-600 transition-colors"
                >
                  Refresh
                </button>
                <span className="text-[11px] text-ink-400 truncate" title={stats.vaultPath}>
                  {stats.vaultPath}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-medium">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-[14px] font-semibold text-ink-900 tabular-nums">
        {value}
      </div>
    </div>
  );
}

// ─── System status ────────────────────────────────────────────────────────────

function SystemStatusPanel() {
  const [pf, setPf] = useState<PreflightStatus | null>(null);
  const [imStatus, setImStatus] = useState<ImagemagickStatus | null>(null);
  const [installingIm, setInstallingIm] = useState(false);
  const [imProgress, setImProgress] = useState<InstallProgress | null>(null);
  const [imError, setImError] = useState<string | null>(null);

  useEffect(() => {
    ipc.getPreflightStatus().then(setPf).catch(() => {});
    ipc.imagemagickStatus().then(setImStatus).catch(() => {});

    const sub = events.onImagemagickInstallProgress((p) => {
      setImProgress(p);
      if (p.stage === "installed") {
        setInstallingIm(false);
        setImProgress(null);
        ipc.imagemagickStatus().then(setImStatus).catch(() => {});
      } else if (p.stage === "failed") {
        setInstallingIm(false);
        setImError(p.message);
      }
    });
    return () => {
      sub.then((unsub) => unsub());
    };
  }, []);

  const installIm = async () => {
    setInstallingIm(true);
    setImError(null);
    try {
      await ipc.installImagemagick();
    } catch (e) {
      setInstallingIm(false);
      setImError(String(e));
    }
  };

  const find = (id: string) => pf?.checks.find((c) => c.id === id);
  const whisper = find("whisper");
  const ffmpeg  = find("ffmpeg");

  const imDetail = imStatus === null
    ? "Checking…"
    : imStatus.available
    ? (imStatus.version ?? imStatus.path ?? "Available")
    : "Not installed — required for Kodak Photo CD (.pcd) images";

  return (
    <div className="mt-6 rounded-2xl border border-ink-200/70 bg-white/60 p-5">
      <span className="micro-label">System status</span>
      <div className="mt-3 space-y-3">
        <StatusRow
          icon={<Mic className="h-4 w-4" />}
          label="Voice search engine"
          ok={whisper?.ok ?? null}
          detail={whisper?.detail ?? "Checking…"}
        />
        <StatusRow
          icon={<Film className="h-4 w-4" />}
          label="Video tools (FFmpeg)"
          ok={ffmpeg?.ok ?? null}
          detail={ffmpeg?.detail ?? "Checking…"}
        />
        <StatusRow
          icon={<ImageIcon className="h-4 w-4" />}
          label="Photo CD decoder (ImageMagick)"
          ok={imStatus === null ? null : imStatus.available}
          detail={imDetail}
        >
          {imStatus !== null && !imStatus.available && (
            <div className="mt-2">
              {imError && (
                <p className="mb-1.5 text-[11px] text-ios-red">{imError}</p>
              )}
              <button
                onClick={installIm}
                disabled={installingIm}
                className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-[12px] font-medium text-ink-700 transition hover:bg-ink-100 disabled:opacity-50"
              >
                {installingIm ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : null}
                {installingIm
                  ? (imProgress?.message ?? "Installing…")
                  : "Install Photo CD decoder (~20 MB)"}
              </button>
            </div>
          )}
        </StatusRow>
      </div>
    </div>
  );
}

function StatusRow({
  icon,
  label,
  ok,
  detail,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  ok: boolean | null;
  detail: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{
          background:
            ok === true
              ? "rgba(52,199,89,0.12)"
              : ok === false
              ? "rgba(255,59,48,0.10)"
              : "rgba(0,0,0,0.05)",
          color:
            ok === true
              ? "#34C759"
              : ok === false
              ? "#FF3B30"
              : "#8E8E93",
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-ink-900">{label}</span>
          {ok === true && (
            <span className="rounded-full bg-ios-green/15 px-1.5 py-0.5 text-[10px] font-semibold text-ios-green">
              Active
            </span>
          )}
          {ok === false && (
            <span className="rounded-full bg-ios-red/10 px-1.5 py-0.5 text-[10px] font-semibold text-ios-red">
              Not installed
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11.5px] text-ink-500">{detail}</p>
        {children}
      </div>
    </div>
  );
}

// ─── Transcription model panel ────────────────────────────────────────────────

function TranscriptionModelPanel() {
  const [info, setInfo] = useState<WhisperModelInfo | null>(null);
  const [switching, setSwitching] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    ipc.transcription.getModelInfo().then(setInfo).catch(() => {});
  }, []);

  const switchModel = async (model: "tiny.en" | "base.en") => {
    setSwitching(true);
    setErr(null);
    try {
      const next = await ipc.transcription.setModel(model);
      setInfo(next);
    } catch (e) {
      setErr(String(e));
    } finally {
      setSwitching(false);
    }
  };

  const isTiny = info?.current.includes("tiny");
  const isBase = !isTiny;

  return (
    <div className="mt-4 rounded-2xl border border-ink-200/70 bg-white/60 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-100">
          <Zap className="h-4 w-4 text-ink-600" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="micro-label">Transcription quality</span>
          <p className="mt-1 text-[12px] text-ink-500">
            Choose between faster (tiny) and more accurate (base) voice search.
            Both models run entirely on your computer — nothing leaves this machine.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {/* tiny.en option */}
            <button
              disabled={switching || isTiny}
              onClick={() => switchModel("tiny.en")}
              className="rounded-xl border p-3 text-left transition"
              style={{
                borderColor: isTiny ? "rgba(0,122,255,0.40)" : "rgba(0,0,0,0.10)",
                background: isTiny ? "rgba(0,122,255,0.06)" : "white",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-semibold text-ink-900">Tiny</span>
                {isTiny && (
                  <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                    Active
                  </span>
                )}
                {!isTiny && !info?.tiny_en_present && (
                  <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-500">
                    75 MB
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink-500 leading-relaxed">
                Fast · smaller installer · works on any PC
              </p>
            </button>

            {/* base.en option */}
            <button
              disabled={switching || isBase}
              onClick={() => switchModel("base.en")}
              className="rounded-xl border p-3 text-left transition"
              style={{
                borderColor: isBase ? "rgba(0,122,255,0.40)" : "rgba(0,0,0,0.10)",
                background: isBase ? "rgba(0,122,255,0.06)" : "white",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-semibold text-ink-900">Base</span>
                {isBase && (
                  <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                    Active
                  </span>
                )}
                {!isBase && !info?.base_en_present && (
                  <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-500">
                    142 MB
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink-500 leading-relaxed">
                More accurate · better names & dates
              </p>
            </button>
          </div>

          {switching && (
            <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Switching model…
            </p>
          )}
          {err && <p className="mt-2 text-[12px] text-ios-red">{err}</p>}
          <p className="mt-3 text-[11px] text-ink-400">
            Takes effect on the next transcription job — already-running jobs finish with the current model.
          </p>
        </div>
      </div>
    </div>
  );
}

