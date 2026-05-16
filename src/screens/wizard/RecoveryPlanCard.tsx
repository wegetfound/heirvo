import { useEffect, useState } from "react";
import { ipc } from "@/lib/ipc";
import type { RecoveryPlanBriefing, DriveQuality } from "@/lib/types";
import { CheckCircle2, AlertTriangle, ShieldAlert, Info } from "lucide-react";

/**
 * The Recovery Plan briefing — a transparency feature no other consumer
 * recovery tool ships. Probes the drive and disc via three MMC commands
 * (INQUIRY, GET CONFIGURATION, READ DISC INFORMATION) and surfaces a plain-
 * English summary plus a drive-quality warning before the user commits
 * to a multi-hour scan.
 *
 * Renders only when there's a drive path AND media is present. Silent on
 * failure: any probe error just means we hide the card; the user can still
 * start the scan, they just don't get the briefing.
 */
export function RecoveryPlanCard({ drivePath }: { drivePath: string | null }) {
  const [briefing, setBriefing] = useState<RecoveryPlanBriefing | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!drivePath) {
      setBriefing(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    ipc
      .probeDiscProfile(drivePath)
      .then((b) => {
        if (cancelled) return;
        setBriefing(b);
      })
      .catch(() => {
        if (!cancelled) setBriefing(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [drivePath]);

  if (loading || !briefing) return null;
  if (!briefing.disc.media_present) return null;

  const { disc, drive_assessment } = briefing;
  const tone = qualityTone(drive_assessment.quality);

  return (
    <div
      className="mb-4 rounded-2xl border bg-white/60 p-4 shadow-sm backdrop-blur"
      style={{ borderColor: tone.border }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: tone.bg, color: tone.fg }}
        >
          {tone.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold text-ink-900">Recovery Plan</h3>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ background: tone.bg, color: tone.fg }}
            >
              {drive_assessment.quality === "unknown" ? "Untested" : drive_assessment.quality}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 text-[13px] text-ink-700 sm:grid-cols-2">
            <Row label="Drive">
              <span className="font-medium text-ink-900">
                {disc.vendor} {disc.model}
              </span>
              <span className="text-ink-500"> ({drive_assessment.category})</span>
            </Row>
            <Row label="Disc">
              <span className="font-medium text-ink-900">{disc.profile_name}</span>
              <span className="text-ink-500">
                {" · "}
                {disc.disc_status}
                {disc.num_sessions > 0 ? ` · ${disc.num_sessions} session${disc.num_sessions === 1 ? "" : "s"}` : ""}
                {disc.erasable ? " · erasable" : ""}
              </span>
            </Row>
          </div>

          {drive_assessment.notes && (
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-600">
              {drive_assessment.notes}
            </p>
          )}

          {disc.disc_status === "incomplete" && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
              <strong>Heads up:</strong> this disc was never finalized.
              Standard players often refuse to read it, but the data sectors
              are usually still there. Heirvo will recover what's recorded.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">
        {label}
      </span>
      <span className="truncate">{children}</span>
    </div>
  );
}

function qualityTone(q: DriveQuality): {
  bg: string;
  fg: string;
  border: string;
  icon: React.ReactNode;
} {
  switch (q) {
    case "pro":
    case "good":
      return {
        bg: "rgba(34,197,94,0.12)",
        fg: "#15803d",
        border: "rgba(34,197,94,0.30)",
        icon: <CheckCircle2 className="h-5 w-5" />,
      };
    case "acceptable":
      return {
        bg: "rgba(59,130,246,0.12)",
        fg: "#1d4ed8",
        border: "rgba(59,130,246,0.30)",
        icon: <Info className="h-5 w-5" />,
      };
    case "marginal":
      return {
        bg: "rgba(245,158,11,0.14)",
        fg: "#b45309",
        border: "rgba(245,158,11,0.35)",
        icon: <AlertTriangle className="h-5 w-5" />,
      };
    case "avoid":
      return {
        bg: "rgba(239,68,68,0.14)",
        fg: "#b91c1c",
        border: "rgba(239,68,68,0.35)",
        icon: <ShieldAlert className="h-5 w-5" />,
      };
    case "unknown":
    default:
      return {
        bg: "rgba(148,163,184,0.18)",
        fg: "#475569",
        border: "rgba(148,163,184,0.30)",
        icon: <Info className="h-5 w-5" />,
      };
  }
}
