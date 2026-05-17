import { useEffect, useRef, useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { useLicense } from "@/lib/useLicense";

interface Props {
  open: boolean;
  onClose: () => void;
  /** After a successful key activation the parent can proceed with the save. */
  onUnlocked: () => void;
  /** How many exports the free user has already made (drives copy). */
  exportsUsed?: number;
}

const BUY_URL = "https://heirvo.com/download";

/**
 * Paywall modal triggered when a free user clicks "Save as MP4".
 *
 * Pattern: Raycast / Granola "pro tease via real result" — show the user that
 * their video is ready, run a fake progress bar to 94%, then freeze it there.
 * The wall feels earned, not hostile.
 */
export function ProPaywallModal({ open, onClose, onUnlocked, exportsUsed = 0 }: Props) {
  const [progress, setProgress] = useState(0);
  const [frozen, setFrozen] = useState(false);
  const [showActivate, setShowActivate] = useState(false);
  const [key, setKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const { activate } = useLicense();

  // Animate progress to 94 % over ~2.5 s, then freeze.
  useEffect(() => {
    if (!open) {
      setProgress(0);
      setFrozen(false);
      setShowActivate(false);
      setKey("");
      setErr(null);
      return;
    }

    const TARGET = 94;
    const DURATION_MS = 2400;

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      // Ease-out curve so it slows near 94 %
      const t = Math.min(elapsed / DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const pct = Math.round(eased * TARGET);
      setProgress(pct);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setFrozen(true);
      }
    };

    startRef.current = null;
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      startRef.current = null;
    };
  }, [open]);

  const handleClose = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    onClose();
  };

  const handleActivate = async () => {
    if (!key.trim()) return;
    setSubmitting(true);
    setErr(null);
    try {
      await activate(key.trim());
      onUnlocked();
      onClose();
    } catch (e) {
      setErr("Invalid key — check it and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-400 transition hover:bg-ink-100 hover:text-ink-900"
          aria-label="Close"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <div className="px-8 pb-8 pt-8">
          {/* Icon */}
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Sparkles className="h-6 w-6" aria-hidden />
          </div>

          <h2
            id="paywall-title"
            className="font-display text-[22px] font-bold tracking-[-0.02em] text-ink-900"
          >
            {exportsUsed === 0
              ? "Your video is ready to save."
              : "You've used your free export."}
          </h2>
          <p className="mt-2 text-[15px] leading-[1.55] text-ink-600">
            {exportsUsed === 0
              ? "Heirvo finished processing. Unlock Pro once to download your recovered video — MP4, disc image, all files. No subscription, ever."
              : "Free plan includes 1 lifetime export — yours is already saved. Upgrade once to recover and export as many discs as you like, forever."}
          </p>

          {/* Fake progress bar — frozen at 94 % */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-[12px] text-ink-500 mb-1.5">
              <span>Saving video…</span>
              <span className="font-mono tabular-nums">{progress}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
            {frozen && (
              <p className="mt-2 text-[12px] text-ink-400">
                Waiting for Pro unlock to complete the save…
              </p>
            )}
          </div>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={() => window.open(BUY_URL, "_blank")}
            className="mt-6 w-full rounded-2xl bg-brand-600 px-5 py-3.5 text-[15px] font-semibold text-white shadow-glow-blue transition hover:bg-brand-500 active:scale-[0.98]"
          >
            Unlock Heirvo Pro — $49
          </button>

          <p className="mt-2 text-center text-[12px] text-ink-400">
            One-time purchase · No subscription · Works on this machine forever
          </p>

          {/* License key fallback */}
          <div className="mt-4 border-t border-ink-100 pt-4">
            <button
              type="button"
              onClick={() => setShowActivate((v) => !v)}
              className="text-[13px] font-medium text-brand-600 transition hover:text-brand-700"
            >
              {showActivate ? "Hide" : "Already have a license key?"}
            </button>

            {showActivate && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  className="flex-1 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 font-mono text-[13px] placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="HEIRVO-XXXX-XXXX"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleActivate()}
                  disabled={submitting}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleActivate}
                  disabled={!key.trim() || submitting}
                  className="rounded-xl bg-ink-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-ink-800 disabled:opacity-40"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate"}
                </button>
              </div>
            )}
            {err && <p className="mt-1.5 text-[12px] text-ios-red">{err}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
