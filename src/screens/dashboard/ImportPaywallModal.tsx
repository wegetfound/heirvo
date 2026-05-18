import { useState } from "react";
import { X, FolderHeart, Loader2, Check } from "lucide-react";
import { useLicense } from "@/lib/useLicense";
import { PRICING } from "@/lib/pricing";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after a successful key activation so the parent can resume the
   * import flow it was about to start. */
  onUnlocked: () => void;
  /** Friendly description of the file the user was trying to import — used in
   * the headline ("Add **Sunset_hawaii.mp4** to your vault…"). */
  fileName?: string;
  /** Optional pre-computed size string ("4.2 GB") for extra context. */
  fileSizeDisplay?: string;
}

const BUY_URL = "https://heirvo.com/download#archive";

/**
 * Paywall modal for the personal-media import flow.
 *
 * Distinct from the SAVE-tier paywall (ProPaywallModal) because:
 *   - Different price point (Archive $99 vs Recover $59)
 *   - Different value story ("vault for your memories" vs "save this one disc")
 *   - No fake-progress-bar tease — import hasn't started yet, so there's
 *     nothing to "freeze". The tease here is the *file the user just picked*.
 */
export function ImportPaywallModal({
  open,
  onClose,
  onUnlocked,
  fileName,
  fileSizeDisplay,
}: Props) {
  const [showActivate, setShowActivate] = useState(false);
  const [key, setKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { activate } = useLicense();

  const handleActivate = async () => {
    if (!key.trim()) return;
    setSubmitting(true);
    setErr(null);
    try {
      const next = await activate(key.trim());
      if (!next.can_import_media) {
        // Activated key was a lower tier (e.g. Recover) — not enough.
        setErr("That key unlocks Save but not Import. Upgrade to Archive to import personal media.");
        return;
      }
      onUnlocked();
      onClose();
    } catch {
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
      aria-labelledby="import-paywall-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-400 transition hover:bg-ink-100 hover:text-ink-900"
          aria-label="Close"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <div className="px-8 pb-8 pt-8">
          {/* Icon */}
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <FolderHeart className="h-6 w-6" aria-hidden />
          </div>

          <h2
            id="import-paywall-title"
            className="font-display text-[22px] font-bold tracking-[-0.02em] text-ink-900"
          >
            {fileName ? "Build a vault for your memories." : "Build your family vault."}
          </h2>
          <p className="mt-2 text-[15px] leading-[1.55] text-ink-600">
            {fileName ? (
              <>
                You picked <span className="font-medium text-ink-900">{fileName}</span>
                {fileSizeDisplay ? ` (${fileSizeDisplay})` : ""}. Heirvo Archive copies it
                into a permanent vault — videos and audio get every spoken word
                indexed alongside your recovered discs.
              </>
            ) : (
              <>
                Heirvo Archive adds your existing home videos, audio, and photos
                to the same vault as your recovered discs. Every spoken word
                indexed, every memory in one place — forever, no subscription.
              </>
            )}
          </p>

          {/* Value bullets — concrete, scannable */}
          <ul className="mt-5 space-y-2.5">
            {[
              "Import unlimited video, audio, and photo files",
              "Whisper transcription — search every spoken word",
              "Files copied into a safe vault (originals untouched)",
            ].map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-[13.5px] text-ink-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={() => window.open(BUY_URL, "_blank")}
            className="mt-6 w-full rounded-2xl bg-brand-600 px-5 py-3.5 text-[15px] font-semibold text-white shadow-glow-blue transition hover:bg-brand-500 active:scale-[0.98]"
          >
            Unlock Heirvo Archive — {PRICING.archive.label}
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
