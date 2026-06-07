import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ipc } from "@/lib/ipc";
import type {
  RecoveryStats, HealthReport, IsoResult, ExtractedFile, Session,
} from "@/lib/types";
import { EnhancementOffer } from "./EnhancementOffer";
import { RefreshCw, Disc3, Loader2, FileArchive, Files, FolderOpen, ArrowRight, ShieldCheck, LifeBuoy, Save, Upload } from "lucide-react";
import { sectorsToMinutes, sectorsToBytes, bytesToHuman } from "@/lib/human";
import { pulseIn, sparkleBurst } from "@/utils/gsap-fx";
import { useRecoveryMachine } from "./useRecoveryMachine";
import { ProgressWheel } from "./ProgressWheel";
import { RecoveryLayout } from "./RecoveryLayout";
import { LeftSlot } from "./LeftSlot";
import { StalledBanner } from "./StalledBanner";
import { useLicense } from "@/lib/useLicense";
import { ProPaywallModal } from "./ProPaywallModal";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";

/* ─── tiny helpers ─────────────────────────────────────────────────── */
function minsRecovered(stats: RecoveryStats | null) {
  return stats ? sectorsToMinutes(stats.good) : 0;
}
function minsDamaged(stats: RecoveryStats | null) {
  return stats ? sectorsToMinutes(stats.failed + stats.skipped) : 0;
}
function pctRecovered(stats: RecoveryStats | null): number {
  return stats && stats.total > 0 ? Math.round((stats.good / stats.total) * 100) : 0;
}
function gbRecovered(stats: RecoveryStats | null): string {
  return stats ? bytesToHuman(sectorsToBytes(stats.good)) : "";
}

/* ─── CSS-var-aware inline style helpers ───────────────────────────── */
const S = {
  base:      { background: "var(--db-base)" } as React.CSSProperties,
  surface:   { background: "var(--db-surface)", border: "1px solid var(--db-border)", boxShadow: "var(--db-shadow)" } as React.CSSProperties,
  text:      { color: "var(--db-text)" } as React.CSSProperties,
  textMuted: { color: "var(--db-text-muted)" } as React.CSSProperties,
  textFaint: { color: "var(--db-text-faint)" } as React.CSSProperties,
  amber:     { color: "var(--db-amber)" } as React.CSSProperties,
  green:     { color: "var(--db-green)" } as React.CSSProperties,
  serif:     { fontFamily: "var(--db-serif)" } as React.CSSProperties,
  sans:      { fontFamily: "var(--db-sans)" } as React.CSSProperties,
};

/* ──────────────────────────────────────────────────────────────────── */

export function Dashboard() {
  const { id } = useParams<{ id?: string }>();

  const {
    state,
    actions,
    resumeError,
    reconnectElapsed,
    holesAtCompletion,
    realRuntimeMin,
    resumeMode,
    setResumeMode,
    resuming,
    reconnecting,
    drives,
    stalledElapsedSecs,
  } = useRecoveryMachine(id);

  const doneBannerRef = useRef<HTMLDivElement>(null);

  const [savedVideoPath, setSavedVideoPath] = useState<string | null>(null);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [driveSwitchMsg, setDriveSwitchMsg] = useState<string | null>(null);
  const [drivesForSwitch, setDrivesForSwitch] = useState(drives);

  // Keep drivesForSwitch in sync with drive list from hook
  useEffect(() => { setDrivesForSwitch(drives); }, [drives]);

  // Extract shared values from state
  const sessionId = "sessionId" in state ? state.sessionId : null;
  const session = "session" in state ? state.session : null;
  const stats = "stats" in state ? state.stats : null;
  const recoveryDone = state.phase === "complete";
  const saveReady = recoveryDone;
  const stalled = state.phase === "stalled";

  // Derived display values
  const pct = stats && stats.total > 0 ? Math.round((stats.good / stats.total) * 100) : 0;
  const idle = state.phase === "paused" || state.phase === "stalled";
  const isActive = state.phase === "recovering";
  const damaged = minsDamaged(stats);
  const noDamage = damaged === 0;

  // Headline / subline based on phase
  const savedGb = gbRecovered(stats);
  const videoNote = realRuntimeMin != null ? ` · about ${realRuntimeMin} min of video` : "";

  const headline = recoveryDone
    ? (savedGb ? `Disc fully recovered — ${savedGb} read` : "Disc fully recovered")
    : state.phase === "idle" && !state.drive
    ? "Ready when you are."
    : state.phase === "idle" && state.drive
    ? "Slide a disc in."
    : state.phase === "discovering"
    ? "Found a disc. Taking a look…"
    : state.phase === "ready"
    ? "We found your disc."
    : state.phase === "unreadable"
    ? "This disc is having a hard time."
    : state.phase === "starting"
    ? "Getting started…"
    : idle && !stats
    ? "Ready when you are."
    : idle && stats && pct === 0
    ? "Getting started…"
    : idle
    ? "Taking a short break."
    : "We're saving your video.";

  const subline = recoveryDone
    ? (savedGb
      ? `Every readable byte is safe${videoNote}. Now choose how you'd like to keep it.`
      : "Every readable byte is safe. Now choose how you'd like to keep it.")
    : state.phase === "idle" && !state.drive
    ? "Insert your disc and click Start — we'll begin reading right away."
    : state.phase === "idle" && state.drive
    ? "Pop in your disc — we'll spot it and start right away."
    : state.phase === "discovering"
    ? "This usually takes a few seconds. Please don't remove the disc."
    : state.phase === "ready"
    ? "Nothing on the disc will be changed."
    : state.phase === "unreadable"
    ? "We can see the disc, but we can't read it yet."
    : state.phase === "starting"
    ? "Drive detected. Click Resume to begin reading your disc."
    : stats && savedGb
    ? `Recovered ${savedGb} so far.`
    : "Getting ready — listening for your disc…";

  /* ── Done-banner sparkle ─────────────────────────────────────────── */
  useEffect(() => {
    if (!recoveryDone || !stats) return;
    pulseIn(doneBannerRef.current);
    if (minsDamaged(stats) === 0) {
      const t = window.setTimeout(() => sparkleBurst(doneBannerRef.current, 16), 220);
      return () => window.clearTimeout(t);
    }
  }, [recoveryDone, stats]);

  // Show three boxes in "ready" phase (even without sessionId yet) and during/after recovery
  const showBottomBlock = sessionId || state.phase === "ready";
  const bottomBlock = showBottomBlock ? (
    <SaveExtras sessionId={sessionId ?? ""} session={session} saveReady={saveReady} />
  ) : null;

  return (
    <div
      style={{
        flex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        scrollbarWidth: "thin",
        ...S.base,
      }}
    >
      <div style={{
        width: "100%",
        maxWidth: 1060,
        margin: "0 auto",
        padding: "20px 32px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}>

        <RecoveryLayout
          saveReady={saveReady}
          leftSlot={
            <LeftSlot
              state={state}
              actions={actions}
              sessionId={sessionId ?? ""}
              session={session}
              saveReady={saveReady}
              lock={!saveReady}
              onMp4Saved={setSavedVideoPath}
            />
          }
          rightSlot={
            <ProgressWheel
              phase={state.phase}
              pct={pct}
              headline={headline}
              subline={subline}
              isActive={isActive}
              noDamage={noDamage}
              damaged={damaged}
              reconnecting={reconnecting}
              reconnectElapsed={reconnectElapsed}
              resuming={resuming}
              resumeError={resumeError}
              resumeMode={resumeMode}
              onResumeMode={setResumeMode}
              onStart={actions.start}
              onPause={actions.pause}
              onResume={() => actions.resume(resumeMode)}
              onCancel={actions.cancel}
              onReconnect={actions.reconnect}
              onRecoverAnother={actions.recoverAnother}
              doneBannerRef={doneBannerRef}
              stats={stats}
              idle={idle}
              recoveryDone={recoveryDone}
              sessionId={sessionId}
              stalled={stalled}
              stalledElapsedSecs={stalledElapsedSecs}
            />
          }
          bottomBlock={bottomBlock}
        />

        {/* STALLED BANNER — recovery appears stuck, show recovery options */}
        {stalled && (
          <StalledBanner
            stalledElapsedSecs={stalledElapsedSecs}
            resumeMode={resumeMode}
            onReconnect={actions.reconnect}
            onPatientMode={async () => {
              setResumeMode("overnight");
              await actions.resume("overnight").catch(() => {});
            }}
            onChangeDrive={() => setShowDrivePicker(true)}
            onPause={actions.pause}
            reconnecting={reconnecting}
            resuming={resuming}
          />
        )}

        {/* DONE BANNER (partial recoveries only) */}
        {recoveryDone && pct < 100 && <DoneBanner stats={stats} realMinutes={realRuntimeMin} />}

        {/* OVERNIGHT OFFER */}
        {recoveryDone && holesAtCompletion !== null && holesAtCompletion > 0 && (
          <OvernightOfferCard
            stats={stats}
            holesAtCompletion={holesAtCompletion}
            onStart={actions.startOvernight}
            starting={resuming}
            error={resumeError}
          />
        )}

        {/* ENHANCEMENT OFFER */}
        {recoveryDone && (
          <EnhancementOffer
            savedVideoPath={savedVideoPath}
            onAccepted={(p) => setSavedVideoPath(p)}
          />
        )}

        {/* DRIVE SWITCH */}
        {(idle || recoveryDone) && (
          <div>
            <button
              onClick={async () => {
                setDriveSwitchMsg(null);
                if (!showDrivePicker) {
                  try { setDrivesForSwitch(await ipc.listDrives()); }
                  catch (e) { setDriveSwitchMsg(String(e)); }
                }
                setShowDrivePicker(!showDrivePicker);
              }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, ...S.textMuted, display: "flex", alignItems: "center", gap: 6 }}
            >
              <RefreshCw size={12} />
              {showDrivePicker ? "Hide" : "Try a different drive"}
            </button>
            {showDrivePicker && sessionId && (
              <div style={{ ...S.surface, borderRadius: 14, padding: "16px", marginTop: 10 }}>
                <p style={{ fontSize: 12, ...S.textMuted, marginBottom: 12 }}>
                  Different drives have different read tolerances — a second drive often rescues what the first couldn't.
                </p>
                {drivesForSwitch.length === 0
                  ? <p style={{ fontSize: 12, ...S.textMuted }}>No other drives detected.</p>
                  : drivesForSwitch.map((d) => {
                    const label = [d.vendor, d.model].map(s => s.trim()).filter(s => s && s.toLowerCase() !== "unknown").join(" ");
                    return (
                      <button key={d.path}
                        onClick={async () => {
                          try {
                            await actions.changeDrive(d.path);
                            setDriveSwitchMsg(`Switched to ${label || d.letter}. Click Resume to retry.`);
                            setShowDrivePicker(false);
                          } catch (e) { setDriveSwitchMsg(String(e)); }
                        }}
                        style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "8px 10px", borderRadius: 8, fontSize: 13, ...S.text, display: "flex", justifyContent: "space-between" }}
                      >
                        <span>{label || `Drive ${d.letter}`}</span>
                        <span style={{ ...S.textFaint, fontSize: 12 }}>{d.has_media ? "disc inserted" : "empty"}</span>
                      </button>
                    );
                  })
                }
              </div>
            )}
            {driveSwitchMsg && <p style={{ fontSize: 12, color: "var(--db-green)", marginTop: 8 }}>{driveSwitchMsg}</p>}
          </div>
        )}

        {/* LOCK HINT STRIP */}
        {!saveReady && sessionId && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            background: "var(--db-amber-light)", border: "1px solid var(--db-amber-glow)",
            borderRadius: 14, padding: "12px 18px", fontSize: 12.5, color: "var(--db-amber)",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>
              Your save options unlock the moment the disc finishes — or press <strong>Cancel</strong> to stop and keep what's recovered so far.
            </span>
          </div>
        )}

      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes db-breathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.02); }
        }
        @keyframes db-ripple {
          0%   { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes db-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.82); }
        }
      `}</style>
    </div>
  );
}

/* ─── SaveExtras: bottom block (alt-grid + results + disc health + advanced) ── */

type RmapExportT = { path: string; bytes_written: number; run_count: number };
type RmapImportT = { good_sectors: number; failed_sectors: number; skipped_sectors: number; unknown_sectors: number };

function SaveExtras({ sessionId, session, saveReady }: { sessionId: string; session: Session | null; saveReady: boolean }) {
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [healthHidden, setHealthHidden] = useState(false);
  const [iso, setIso] = useState<IsoResult | null>(null);
  const [extracted, setExtracted] = useState<ExtractedFile[] | null>(null);
  const [burnLaunched, setBurnLaunched] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rmapExport, setRmapExport] = useState<RmapExportT | null>(null);
  const [rmapImport, setRmapImport] = useState<RmapImportT | null>(null);
  const [receipt, setReceipt] = useState<{ manifest: string; sector_count: number } | null>(null);

  const { status: license, refresh: refreshLicense } = useLicense();
  const canSave = license.can_save;
  const canArchive = license.can_import_media;
  const [paywallOpen, setPaywallOpen] = useState(false);
  const pendingSaveRef = useRef<{ label: string; action: () => Promise<void> } | null>(null);

  const lock = busy !== null || !saveReady;

  const t = session?.disc_type ?? null;
  const isUnknownDisc = !t || t === "Unknown";
  const showVideoSaves = isUnknownDisc || t === "DvdVideo";

  useEffect(() => {
    let cancelled = false;
    ipc.healthScore(sessionId)
      .then((h) => { if (!cancelled) setHealth(h); })
      .catch(() => { if (!cancelled) setHealthHidden(true); });
    return () => { cancelled = true; };
  }, [sessionId]);

  const wrap = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try { await fn(); } catch (e) { setError(String(e)); } finally { setBusy(null); }
  };

  const guardedSave = (label: string, action: () => Promise<void>) => {
    if (canSave) { wrap(label, action); }
    else { pendingSaveRef.current = { label, action }; setPaywallOpen(true); }
  };

  const dbSurface2: React.CSSProperties = { background: "var(--db-surface)", border: "1px solid var(--db-border)", boxShadow: "var(--db-shadow)" };
  const dbText2: React.CSSProperties = { color: "var(--db-text)" };
  const dbMuted2: React.CSSProperties = { color: "var(--db-text-muted)" };
  const dbFaint2: React.CSSProperties = { color: "var(--db-text-faint)" };
  const dbAmber2: React.CSSProperties = { color: "var(--db-amber)" };

  return (
    <>
      {/* 3-COL ALT GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {/* Exact copy */}
        <AltCard
          icon={<Disc3 size={18} />}
          title="Exact copy of the disc"
          badge="Instant"
          desc=".ISO image — a perfect replica of the original disc, ready to mount or burn."
          loading={busy === "iso"}
          disabled={lock}
          onClick={() => guardedSave("iso", async () => {
            const result = await ipc.createIso(sessionId);
            setIso(result);
            ipc.library.rescanDiscForSession(sessionId).catch(() => {});
          })}
        />
        {/* Original files (video discs) */}
        {showVideoSaves && (
          <AltCard
            icon={<Files size={18} />}
            title="Original files"
            badge="Instant"
            desc="A folder with every file exactly as it was on the disc, no conversion."
            loading={busy === "all-files"}
            disabled={lock}
            onClick={() => guardedSave("all-files", async () => {
              const result = await ipc.extractAllFiles(sessionId);
              setExtracted(result);
              ipc.library.rescanDiscForSession(sessionId).catch(() => {});
            })}
          />
        )}
        {/* Make a new disc */}
        <AltCard
          icon={<FileArchive size={18} />}
          title="Make a new disc"
          desc="Burn a backup DVD or CD — a physical copy you can store or give away."
          loading={busy === "burn"}
          disabled={lock}
          onClick={() => guardedSave("burn", async () => {
            await ipc.burnImageToDisc(sessionId);
            setBurnLaunched(true);
          })}
        />
      </div>

      {burnLaunched && <p style={{ fontSize: 11, color: "var(--db-text-muted)", lineHeight: 1.5 }}>Windows' disc burner is opening — take the original disc out, pop in a blank one, and click <strong>Burn</strong>.</p>}

      {/* ISO result */}
      {iso && (
        <div style={{ borderRadius: 12, padding: "12px 16px", background: "var(--db-surface-2)", border: "1px solid var(--db-border)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, ...dbText2, marginBottom: 4 }}>Disc image saved</div>
          <div style={{ fontFamily: "monospace", fontSize: 11, ...dbMuted2, marginTop: 2 }}>{iso.path}</div>
          <div style={{ fontSize: 11, ...dbFaint2, marginTop: 2 }}>{bytesToHuman(iso.bytes_written)} · {iso.good_sectors.toLocaleString()} sections recovered{iso.zero_filled_sectors > 0 && `, ${iso.zero_filled_sectors.toLocaleString()} damaged`}</div>
          <button onClick={() => ipc.openFolder(iso.path)} style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 4, fontSize: 11, ...dbMuted2, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <FolderOpen size={12} /> Show in Explorer
          </button>
        </div>
      )}

      {/* Extracted files result */}
      {extracted && (
        <div style={{ borderRadius: 12, padding: "12px 16px", background: "var(--db-surface-2)", border: "1px solid var(--db-border)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, ...dbText2, marginBottom: 4 }}>{extracted.length} file{extracted.length === 1 ? "" : "s"} saved</div>
          {extracted[0] && (
            <button onClick={() => ipc.openFolder(extracted[0].path)} style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 2, fontSize: 11, ...dbMuted2, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <FolderOpen size={12} /> Open folder
            </button>
          )}
        </div>
      )}

      {/* DISC HEALTH */}
      {!healthHidden && (
        <div style={{ ...dbSurface2, borderRadius: 14, padding: "18px 22px" }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", ...dbFaint2, marginBottom: 12 }}>Disc health</div>
          {health ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <HealthArc score={health.score} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, margin: 0, color: health.score >= 90 ? "var(--db-green)" : health.score >= 70 ? "var(--db-amber)" : "var(--db-red)" }}>
                    {health.score >= 90
                      ? "Excellent — every sector read cleanly."
                      : health.score >= 70
                      ? `Good — ${health.coverage_pct.toFixed(0)}% recovered, ${health.failed_sectors.toLocaleString()} spot${health.failed_sectors === 1 ? "" : "s"} couldn't be read.`
                      : `Some damage — ${health.coverage_pct.toFixed(0)}% recovered, ${health.failed_sectors.toLocaleString()} spot${health.failed_sectors === 1 ? "" : "s"} were unreadable.`}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, lineHeight: 1.5, ...dbMuted2 }}>{health.summary}</p>
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: "pointer", fontSize: 11, ...dbFaint2 }}>Details</summary>
                    <dl style={{ margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 2, fontSize: 11, ...dbFaint2 }}>
                      <div>Coverage: {health.coverage_pct.toFixed(1)}%</div>
                      <div>Critical files: {health.critical_intact ? "intact" : "damaged"}</div>
                      <div>Largest unreadable run: {health.largest_failed_run.toLocaleString()} sections</div>
                    </dl>
                  </details>
                </div>
              </div>
              {health.score < 50 && (
                <div style={{ marginTop: 16, borderRadius: 12, border: "1px solid rgba(194,116,31,0.30)", background: "linear-gradient(135deg, rgba(194,116,31,0.10) 0%, rgba(194,116,31,0.04) 100%)", padding: "12px 16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, ...dbText2, marginBottom: 4 }}>Some damage is beyond what software can fix.</div>
                  <p style={{ fontSize: 11, lineHeight: 1.5, ...dbMuted2, margin: "0 0 10px" }}>Our lab reads discs with specialised optical equipment — including ones that score this low. Recovery starts at $89, and your Heirvo purchase counts toward it.</p>
                  <a href="https://heirvo.com/recover" target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "var(--db-amber-light)", fontSize: 12, fontWeight: 500, ...dbAmber2, textDecoration: "none" }}>
                    Get a lab estimate <ArrowRight size={12} aria-hidden />
                  </a>
                </div>
              )}
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, ...dbFaint2 }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Checking…
            </div>
          )}
        </div>
      )}

      {/* ADVANCED */}
      <details style={{ ...dbSurface2, borderRadius: 14, overflow: "hidden", marginTop: 8 }}>
        <summary style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", cursor: "pointer", listStyle: "none", userSelect: "none" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--db-text-faint)", flexShrink: 0 }}>
            <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0 0 12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10"/>
          </svg>
          <span style={{ fontSize: 12.5, fontWeight: 500, ...dbMuted2, flex: 1 }}>Advanced — diagnostics &amp; archive</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: "var(--db-text-faint)" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </summary>
        <div style={{ borderTop: "1px solid var(--db-border)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <p style={{ fontSize: 11, ...dbFaint2, lineHeight: 1.55, margin: "0 0 10px" }}>
              The recovery map records which sections of the disc we read successfully. Save it to continue this rescue on another computer or with GNU ddrescue.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button className="btn btn-ghost" disabled={busy !== null}
                onClick={() => wrap("rmap-export", async () => {
                  const target = await saveDialog({ defaultPath: `recovery-${sessionId.slice(0, 8)}.rmap`, filters: [{ name: "Recovery map", extensions: ["rmap"] }, { name: "All files", extensions: ["*"] }] });
                  if (typeof target === "string") setRmapExport(await ipc.exportRmap(sessionId, target));
                })}>
                {busy === "rmap-export" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save recovery map
              </button>
              <button className="btn btn-ghost" disabled={busy !== null}
                onClick={() => wrap("rmap-import", async () => {
                  const picked = await openDialog({ multiple: false, filters: [{ name: "Recovery map", extensions: ["rmap", "map"] }, { name: "All files", extensions: ["*"] }] });
                  if (typeof picked === "string") setRmapImport(await ipc.importRmap(sessionId, picked));
                })}>
                {busy === "rmap-import" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                Load recovery map
              </button>
            </div>
            {rmapExport && <div style={{ fontFamily: "monospace", fontSize: 10, ...dbFaint2, marginTop: 6 }}>Saved {rmapExport.path} ({bytesToHuman(rmapExport.bytes_written)})</div>}
            {rmapImport && <div style={{ fontSize: 11, ...dbMuted2, marginTop: 6 }}>{rmapImport.good_sectors.toLocaleString()} recovered, {rmapImport.failed_sectors.toLocaleString()} damaged, {rmapImport.unknown_sectors.toLocaleString()} pending</div>}
          </div>

          <div style={{ borderTop: "1px solid var(--db-border)", paddingTop: 12 }}>
            <p style={{ fontSize: 11, ...dbFaint2, lineHeight: 1.55, margin: "0 0 10px" }}>
              The tamper-evident recovery manifest is a SHA-256 chain-of-custody record. <span style={{ color: "var(--db-amber)" }}>Archive feature.</span>
            </p>
            {canArchive ? (
              <button className="btn btn-ghost" disabled={busy !== null}
                onClick={() => wrap("receipt", async () => {
                  const target = await saveDialog({ defaultPath: `receipt-${sessionId.slice(0, 8)}.txt`, filters: [{ name: "Receipt manifest", extensions: ["txt"] }, { name: "All files", extensions: ["*"] }] });
                  if (typeof target === "string") setReceipt(await ipc.exportReceiptManifest(sessionId, target));
                })}>
                {busy === "receipt" ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                Save SHA-256 receipt manifest
              </button>
            ) : (
              <button className="btn btn-ghost opacity-50" disabled title="Available on the Archive plan">
                <ShieldCheck className="h-3 w-3" /> Save SHA-256 receipt manifest — Archive
              </button>
            )}
            {receipt && <div style={{ marginTop: 6, fontSize: 10, ...dbFaint2 }}>{receipt.sector_count.toLocaleString()} sectors verified</div>}
          </div>

          <div style={{ borderTop: "1px solid var(--db-border)", paddingTop: 12 }}>
            <button
              style={{ fontSize: 11, ...dbFaint2, background: "none", border: "none", cursor: busy !== null ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 6, padding: 0 }}
              disabled={busy !== null}
              onClick={() => wrap("diag", async () => { await ipc.exportDiagnosticBundle(sessionId); })}>
              {busy === "diag" ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <LifeBuoy size={12} />}
              Export diagnostic bundle for support
            </button>
          </div>
        </div>
      </details>

      {error && <p style={{ fontSize: 13, color: "var(--db-red)", margin: 0 }}>{error}</p>}

      <ProPaywallModal
        open={paywallOpen}
        exportsUsed={license.exports_used}
        onClose={() => { setPaywallOpen(false); pendingSaveRef.current = null; }}
        onUnlocked={() => {
          setPaywallOpen(false);
          refreshLicense().catch(() => {});
          const pending = pendingSaveRef.current;
          pendingSaveRef.current = null;
          if (pending) wrap(pending.label, pending.action);
        }}
      />
    </>
  );
}

/* ─── AltCard ───────────────────────────────────────────────────────── */
function AltCard({ icon, title, badge, desc, loading, disabled, onClick }: {
  icon: React.ReactNode; title: string; badge?: string; desc: string;
  loading?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      style={{ display: "flex", flexDirection: "column", gap: 7, minHeight: 118, padding: "18px 18px 16px", borderRadius: 14, background: "var(--db-surface)", border: "1px solid var(--db-border)", textAlign: "left", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, transition: "border-color 150ms ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "var(--db-text-faint)" }}>
          {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : icon}
        </span>
        {badge && (
          <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 99, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.22)", fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", color: "var(--db-text-muted)" }}>{badge}</span>
        )}
      </div>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--db-text)" }}>{title}</span>
      <span style={{ fontSize: 12, color: "var(--db-text-faint)", lineHeight: 1.5 }}>{desc}</span>
    </button>
  );
}

/* ─── HealthArc ─────────────────────────────────────────────────────── */
function HealthArc({ score }: { score: number }) {
  const size = 64;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * c;
  const color = clamped >= 90 ? "#34C759" : clamped >= 70 ? "#5AC8FA" : clamped >= 50 ? "#FF9500" : "#FF3B30";
  return (
    <div style={{ position: "relative", flexShrink: 0, width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--db-border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--db-serif)", fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", color: "var(--db-text)" }}>
        {Math.round(clamped)}
      </div>
    </div>
  );
}

/* ─── DoneBanner ────────────────────────────────────────────────────── */
const DoneBanner = React.forwardRef<HTMLDivElement, { stats: RecoveryStats | null; realMinutes?: number | null } & React.HTMLAttributes<HTMLDivElement>>(
({ stats, realMinutes, ...props }, ref) => {
  const pct = pctRecovered(stats);
  const gb = gbRecovered(stats);
  const videoNote = realMinutes != null ? ` · about ${realMinutes} min of video` : "";

  let bg = "var(--db-surface-2)";
  let border = "var(--db-border)";
  let headline2 = "Recovery complete.";
  let detail = "Use the Save buttons to keep an exact copy, the original files, or convert to a video.";

  if (stats) {
    if (pct >= 100) {
      bg = "linear-gradient(135deg, rgba(26,135,80,0.10), rgba(26,135,80,0.05))";
      border = "rgba(26,135,80,0.30)";
      headline2 = `We saved everything — ${gb}${videoNote}.`;
      detail = "Use the Save buttons below to keep an exact copy of the disc, the original files, or convert to a video (MP4).";
    } else if (pct >= 75) {
      bg = "linear-gradient(135deg, rgba(194,116,31,0.10), rgba(194,116,31,0.05))";
      border = "rgba(194,116,31,0.30)";
      headline2 = `We saved ${pct}% of the disc — ${gb}.`;
      detail = `The other ${100 - pct}% had damage we couldn't read. A second drive sometimes helps.`;
    } else {
      headline2 = pct > 0 ? `This disc is heavily damaged — we saved ${pct}% (${gb}).` : "We weren't able to read this disc.";
      detail = pct > 0
        ? "A different disc drive sometimes recovers more. Physical damage this severe is often beyond what any software can fix — a professional data recovery lab with specialized equipment may be able to help."
        : "This happens with older or physically damaged media — it's not your fault. Try cleaning the disc gently (wipe from centre outward, not in circles), or try a different disc drive. If those don't work, a professional data recovery lab may be able to help.";
    }
  }

  return (
    <div ref={ref} style={{ borderRadius: 16, padding: "18px 24px", background: bg, border: `1px solid ${border}` }} {...props}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <Disc3 size={18} style={{ flexShrink: 0, marginTop: 2, color: "var(--db-amber)" }} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--db-text)", fontFamily: "var(--db-serif)" }}>{headline2}</div>
          <div style={{ fontSize: 13, color: "var(--db-text-muted)", marginTop: 4, lineHeight: 1.5 }}>{detail}</div>
        </div>
      </div>
    </div>
  );
});
DoneBanner.displayName = "DoneBanner";

/* ─── OvernightOfferCard ────────────────────────────────────────────── */
function OvernightOfferCard({ stats, holesAtCompletion, onStart, starting, error }: {
  stats: RecoveryStats | null;
  holesAtCompletion: number;
  onStart: () => void;
  starting: boolean;
  error: string | null;
}) {
  const recoveredMin = minsRecovered(stats);
  const holeMin = Math.max(1, sectorsToMinutes(holesAtCompletion));

  return (
    <div style={{ borderRadius: 20, padding: "28px 32px", background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(99,102,241,0.06) 100%)", border: "1px solid rgba(99,102,241,0.22)", display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.018em", lineHeight: 1.25, fontFamily: "var(--db-serif)", color: "var(--db-text)" }}>We rescued most of it.</div>
        <p style={{ fontSize: 15, fontWeight: 500, color: "var(--db-text-muted)", marginTop: 8, lineHeight: 1.55 }}>
          {recoveredMin} minute{recoveredMin !== 1 ? "s" : ""} are safe.{" "}
          {holesAtCompletion.toLocaleString()} spot{holesAtCompletion === 1 ? "" : "s"} ({holeMin} min) {holesAtCompletion === 1 ? "is" : "are"} damaged and need more time.
          Overnight mode tries much harder — slower re-reads, cool-downs, reading from both directions.
        </p>
      </div>
      <p style={{ fontSize: 12, color: "var(--db-text-faint)", lineHeight: 1.55, borderTop: "1px solid rgba(99,102,241,0.14)", paddingTop: 12 }}>
        Some damage is physical and can't be recovered by any software. Overnight mode simply tries harder on the sectors that Quick pass gave up on — it won't always win.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <button onClick={onStart} disabled={starting}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 12, background: "var(--db-amber)", color: "#FFF", border: "none", cursor: starting ? "default" : "pointer", opacity: starting ? 0.7 : 1, fontSize: 14, fontWeight: 600, boxShadow: "0 3px 12px var(--db-amber-glow)" }}>
          {starting ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {starting ? "Starting…" : "Try Overnight ▸"}
        </button>
        <span style={{ fontSize: 12, color: "var(--db-text-faint)" }}>You can pause or stop at any time — nothing already recovered will be lost.</span>
      </div>
      {error && (
        <div style={{ borderRadius: 10, padding: "10px 14px", background: "rgba(197,48,48,0.06)", border: "1px solid rgba(197,48,48,0.25)", fontSize: 13, fontWeight: 600, color: "var(--db-text)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
