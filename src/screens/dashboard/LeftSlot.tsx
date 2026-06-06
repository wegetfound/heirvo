import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2, Disc3, ArrowRight, FolderOpen, FileVideo, Files,
  Save, Upload, LifeBuoy, ShieldCheck, Search, Music,
  Pencil, Usb, HardDrive,
} from "lucide-react";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { ipc } from "@/lib/ipc";
import type { RecoveryPhase, RecoveryActions } from "./useRecoveryMachine";
import type {
  StorageDrive, Session, AudioToc, ExtractedAudioFile, ExtractedFile,
} from "@/lib/types";
import { bytesToHuman } from "@/lib/human";
import { useLicense } from "@/lib/useLicense";
import { ProPaywallModal } from "./ProPaywallModal";
import { RecoveryPlanCard } from "../wizard/RecoveryPlanCard";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mp4Result = { output_path: string; bytes_written: number; source_files: string[] };
type DiagnosticBundle = { zip_path: string; bytes: number; session_id: string };
type RmapExport = { path: string; bytes_written: number; run_count: number };
type RmapImport = {
  good_sectors: number;
  failed_sectors: number;
  skipped_sectors: number;
  unknown_sectors: number;
};
type ReceiptManifest = { manifest: string; sector_count: number };

export interface LeftSlotProps {
  state: RecoveryPhase;
  actions: RecoveryActions;
  sessionId: string;
  session: Session | null;
  saveReady: boolean;
  lock: boolean;
  onMp4Saved?: (path: string) => void;
}

// ─── Style tokens ─────────────────────────────────────────────────────────────

const dbSurface: React.CSSProperties = {
  background: "var(--db-surface)",
  border: "1px solid var(--db-border)",
  boxShadow: "var(--db-shadow)",
};
const dbText: React.CSSProperties = { color: "var(--db-text)" };
const dbMuted: React.CSSProperties = { color: "var(--db-text-muted)" };
const dbFaint: React.CSSProperties = { color: "var(--db-text-faint)" };
const dbAmber: React.CSSProperties = { color: "var(--db-amber)" };
const dbGreen: React.CSSProperties = { color: "var(--db-green)" };

// ─── LeftSlot: phase router ───────────────────────────────────────────────────

export function LeftSlot({ sessionId, session, saveReady, lock, onMp4Saved }: LeftSlotProps) {
  // Always show SaveActions (recovery screen layout). The pre-session phase
  // rendering (PreSessionLeft) is intentionally bypassed for the streamlined
  // single-screen UX — the ProgressWheel/right slot drives the ready→start flow.
  void PreSessionLeft; // retained for reference; not rendered in the unified screen
  return (
    <SaveActions
      sessionId={sessionId}
      session={session}
      saveReady={saveReady}
      lock={lock}
      onMp4Saved={onMp4Saved}
    />
  );
}

// ─── Pre-session phase rendering (from Wizard) ────────────────────────────────

function PreSessionLeft({
  state,
  actions,
}: {
  state: RecoveryPhase;
  actions: RecoveryActions;
}) {
  const { phase } = state;

  if (phase === "idle" && !state.drive) return <PhaseNoDrive />;
  if (phase === "idle" && state.drive) return <PhaseNoDisc drive={state.drive} />;
  if (phase === "discovering") return <PhaseIdentifying />;
  if (phase === "ready") {
    return (
      <div style={{
        ...dbSurface,
        borderRadius: 18,
        padding: "24px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        height: "100%",
        boxSizing: "border-box",
      }}>
        <RecoveryPlanCard drivePath={state.drive.path} />
        <PhaseReady
          disc={state.disc}
          outputDir={state.outputDir}
          onBrowse={actions.browseDest}
          onStart={actions.start}
        />
      </div>
    );
  }
  if (phase === "unreadable") {
    return <PhaseUnreadable error={state.error} onRetry={actions.retry} />;
  }
  return null;
}

// ─── Wizard phase components ──────────────────────────────────────────────────

function Centered({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      ...dbSurface,
      borderRadius: 18,
      padding: "40px 32px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      height: "100%",
      boxSizing: "border-box",
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 24, marginBottom: 20,
        background: "var(--db-amber-light)", color: "var(--db-amber)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      {children}
    </div>
  );
}

function PhaseNoDrive() {
  return (
    <Centered icon={<Disc3 size={28} />}>
      <h1 style={{ color: "var(--db-text)", fontFamily: "var(--db-serif)", fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: 0, textWrap: "balance" } as React.CSSProperties}>
        Ready when you are.
      </h1>
      <p style={{ color: "var(--db-text-muted)", marginTop: 12, fontSize: 15, lineHeight: 1.55 }}>
        Plug in your CD or DVD drive — we'll spot it as soon as it's connected.
      </p>
      <p style={{ color: "var(--db-text-faint)", marginTop: 8, display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <Loader2 size={14} className="animate-spin" />
        Looking for a drive…
      </p>
    </Centered>
  );
}

function PhaseNoDisc({ drive }: { drive: import("@/lib/types").DriveInfo }) {
  const label = [drive.vendor, drive.model].map(s => s.trim()).filter(s => s && s.toLowerCase() !== "unknown").join(" ") || `Drive ${drive.letter}`;
  return (
    <Centered icon={<Disc3 size={28} />}>
      <h1 style={{ color: "var(--db-text)", fontFamily: "var(--db-serif)", fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: 0, textWrap: "balance" } as React.CSSProperties}>
        Slide a disc in.
      </h1>
      <p style={{ color: "var(--db-text-muted)", marginTop: 12, fontSize: 15, lineHeight: 1.55 }}>
        We're listening on your {label}. Pop in any DVD, CD, photo CD, or data disc — we'll take it from there.
      </p>
      <p style={{ color: "var(--db-text-faint)", marginTop: 8, display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <Loader2 size={14} className="animate-spin" />
        Waiting for a disc…
      </p>
    </Centered>
  );
}

function PhaseIdentifying() {
  return (
    <Centered icon={<Disc3 size={28} className="animate-pulse" />}>
      <h1 style={{ color: "var(--db-text)", fontFamily: "var(--db-serif)", fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: 0, textWrap: "balance" } as React.CSSProperties}>
        Found a disc. Taking a look…
      </h1>
      <p style={{ color: "var(--db-text-muted)", marginTop: 12, fontSize: 15, lineHeight: 1.55 }}>
        This usually takes a few seconds. Please don't remove the disc.
      </p>
      <p style={{ color: "var(--db-text-faint)", marginTop: 8, display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <Loader2 size={14} className="animate-spin" />
        Reading…
      </p>
    </Centered>
  );
}

function PhaseUnreadable({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div style={{
      ...dbSurface,
      borderRadius: 18,
      padding: "32px 28px",
      height: "100%",
      boxSizing: "border-box",
    }}>
      <h1 style={{ color: "var(--db-text)", fontFamily: "var(--db-serif)", fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: 0, textWrap: "balance" } as React.CSSProperties}>
        This disc is having a hard time.
      </h1>
      <p style={{ color: "var(--db-text-muted)", marginTop: 12, fontSize: 15, lineHeight: 1.55 }}>
        We can see the disc, but we can't read it yet. This sometimes happens with older discs or ones with scratches. It's usually not the end of the road.
      </p>
      <div style={{ marginTop: 20, borderRadius: 16, padding: 20, background: "var(--db-amber-light)", border: "1px solid var(--db-border-soft)" }}>
        <p style={{ fontSize: 14, fontWeight: 500, ...dbText }}>Try this:</p>
        <ol style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6, fontSize: 14, lineHeight: 1.55, ...dbMuted }}>
          <li>Take the disc out.</li>
          <li>Gently wipe it with a soft cloth, from the centre outward (not in circles).</li>
          <li>Put it back in.</li>
        </ol>
      </div>
      <button
        type="button"
        onClick={onRetry}
        style={{
          marginTop: 24,
          display: "inline-flex", alignItems: "center", gap: 8,
          borderRadius: 16, padding: "12px 24px",
          fontSize: 15, fontWeight: 600,
          background: "var(--db-amber)", color: "#FFF8EE",
          border: "none", cursor: "pointer",
          boxShadow: "var(--db-amber-glow)",
        }}
      >
        Try again
        <ArrowRight size={16} />
      </button>
      <details style={{ marginTop: 16, fontSize: 11, ...dbFaint }}>
        <summary style={{ cursor: "pointer" }}>Technical details</summary>
        <pre style={{ marginTop: 8, padding: 12, borderRadius: 10, background: "var(--db-surface-2)", ...dbMuted, fontSize: 10, overflowX: "auto", whiteSpace: "pre-wrap" }}>
          {error}
        </pre>
      </details>
    </div>
  );
}

function PhaseReady({
  disc,
  outputDir,
  onBrowse,
  onStart,
}: {
  disc: import("@/lib/types").DiscInfo;
  outputDir: string;
  onBrowse: () => void;
  onStart: () => Promise<void>;
}) {
  const [starting, setStarting] = useState(false);
  const discLabel = disc.label.trim();
  const hasLabel = discLabel && discLabel.toLowerCase() !== "untitled disc";
  const lastTwo = outputDir.replace(/[\\/]+$/, "").split(/[\\/]/).slice(-2).join(" › ");

  const handleStart = async () => {
    setStarting(true);
    try { await onStart(); } finally { setStarting(false); }
  };

  return (
    <div>
      <h1 style={{ color: "var(--db-text)", fontFamily: "var(--db-serif)", fontSize: 28, fontWeight: 600, lineHeight: 1.2, letterSpacing: "-0.02em", margin: 0, textWrap: "balance" } as React.CSSProperties}>
        {hasLabel ? (
          <>We found <span style={{ color: "var(--db-amber)" }}>"{discLabel}"</span>.</>
        ) : (
          <>We found your disc.</>
        )}
      </h1>
      <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.55, ...dbMuted }}>
        Nothing on the disc will be changed.
      </p>

      <div style={{ marginTop: 24, borderRadius: 16, padding: 16, background: "var(--db-surface-2)", border: "1px solid var(--db-border-soft)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", ...dbFaint }}>Saving to</p>
            <p style={{ marginTop: 4, fontSize: 14, ...dbMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={outputDir}>
              {lastTwo || outputDir || "Documents › Heirvo"}
            </p>
          </div>
          <button
            type="button"
            onClick={onBrowse}
            style={{
              flexShrink: 0,
              display: "inline-flex", alignItems: "center", gap: 6,
              borderRadius: 10, padding: "6px 12px",
              background: "var(--db-surface)", border: "1px solid var(--db-border)",
              fontSize: 12, fontWeight: 500, cursor: "pointer", ...dbMuted,
            }}
          >
            <FolderOpen size={14} />
            Change…
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleStart}
        disabled={starting || !outputDir}
        style={{
          marginTop: 28,
          display: "inline-flex", alignItems: "center", gap: 8,
          borderRadius: 16, padding: "14px 28px",
          fontSize: 16, fontWeight: 600,
          background: starting || !outputDir ? "var(--db-surface-2)" : "var(--db-amber)",
          color: starting || !outputDir ? "var(--db-text-faint)" : "#FFF8EE",
          border: starting || !outputDir ? "1px solid var(--db-border)" : "none",
          cursor: starting || !outputDir ? "not-allowed" : "pointer",
          boxShadow: starting || !outputDir ? "none" : "var(--db-amber-glow)",
        }}
      >
        {starting && <Loader2 size={16} className="animate-spin" />}
        {starting ? "Starting…" : "Rescue this disc"}
        {!starting && <ArrowRight size={16} />}
      </button>
      <p style={{ marginTop: 8, fontSize: 12, ...dbFaint }}>
        This usually takes 10–40 minutes. You can leave it running.
      </p>
    </div>
  );
}

// ─── SaveActions (formerly OutputPanel.actionStack) ───────────────────────────

function SaveActions({
  sessionId,
  session,
  saveReady,
  lock,
  onMp4Saved,
}: {
  sessionId: string;
  session: Session | null;
  saveReady: boolean;
  lock: boolean;
  onMp4Saved?: (path: string) => void;
}) {
  const [mp4, setMp4] = useState<Mp4Result | null>(null);
  const [extracted, setExtracted] = useState<ExtractedFile[] | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticBundle | null>(null);
  const [rmapExport, setRmapExport] = useState<RmapExport | null>(null);
  const [rmapImport, setRmapImport] = useState<RmapImport | null>(null);
  const [receipt, setReceipt] = useState<ReceiptManifest | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrolledDiscId, setEnrolledDiscId] = useState<string | null>(null);
  const [spaceWarn, setSpaceWarn] = useState<{ needed: number; free: number } | null>(null);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [storageDrives, setStorageDrives] = useState<StorageDrive[]>([]);
  const [audioToc, setAudioToc] = useState<AudioToc | null>(null);
  const [audioTracks, setAudioTracks] = useState<ExtractedAudioFile[] | null>(null);

  const { status: license, refresh: refreshLicense } = useLicense();
  const navigate = useNavigate();
  const canSave = license.can_save;
  const canArchive = license.can_import_media;
  const [paywallOpen, setPaywallOpen] = useState(false);
  const pendingSaveRef = React.useRef<{ label: string; action: () => Promise<void> } | null>(null);

  // Space check
  React.useEffect(() => {
    let cancelled = false;
    ipc.recoverySpaceCheck(sessionId)
      .then((r) => { if (cancelled) return; setSpaceWarn(r && !r.fits ? { needed: r.needed_bytes, free: r.free_bytes } : null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [sessionId, session?.output_dir]);

  // Audio TOC probe
  React.useEffect(() => {
    let cancelled = false;
    ipc.readAudioToc(sessionId)
      .then((toc) => { if (!cancelled && toc.tracks.length > 0) setAudioToc(toc); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [sessionId]);

  const isAudioCd = audioToc !== null;
  const t = session?.disc_type ?? null;
  const isUnknownDisc = !t || t === "Unknown";
  const showVideoSaves = !isAudioCd && (isUnknownDisc || t === "DvdVideo");
  const showFileSaves = !isAudioCd && (isUnknownDisc || t === "Cd" || t === "DvdRom" || t === "DvdAudio");

  const effectiveLock = busy !== null || !saveReady || lock;

  const wrap = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try { await fn(); } catch (e) { setError(String(e)); } finally { setBusy(null); }
  };

  const guardedSave = (label: string, action: () => Promise<void>) => {
    if (canSave) { wrap(label, action); }
    else { pendingSaveRef.current = { label, action }; setPaywallOpen(true); }
  };

  const refreshDrives = async () => {
    try { setStorageDrives(await ipc.listStorageDrives()); } catch { /* ignore */ }
  };

  const useDrive = async (d: StorageDrive) => {
    if (!session) return;
    const safeLabel = (session.disc_label || "Untitled disc")
      .replace(/[<>:"/\\|?*]/g, "_").replace(/_+/g, "_").trim() || "Untitled disc";
    const root = d.path.endsWith("\\") || d.path.endsWith("/") ? d.path : d.path + "\\";
    const newDir = `${root}DVD Rescue\\${safeLabel}`;
    try {
      const updated = await ipc.changeOutputDir(sessionId, newDir);
      // session update propagates from parent via prop
      void updated;
      setShowDrivePicker(false);
    } catch (e) { setError(String(e)); }
  };

  const convertAndEnroll = async (): Promise<string | null> => {
    const r = await ipc.saveAsMp4(sessionId);
    setMp4(r);
    onMp4Saved?.(r.output_path);
    refreshLicense().catch(() => {});
    try {
      const label = session?.user_label || session?.disc_label || null;
      const base = r.output_path.split(/[\\/]/).pop() ?? r.output_path;
      const stem = base.replace(/\.[^.]+$/, "");
      const derived = stem.replace(/[_\-]+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase()) || "Recovered disc";
      const title = label ?? derived;
      const enrolled = await ipc.library.importMedia(r.output_path, title);
      if (!enrolled.isDuplicate) await ipc.transcription.enqueue(enrolled.id, r.output_path).catch(() => {});
      setEnrolledDiscId(enrolled.id);
      return enrolled.id;
    } catch { return null; }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* PRIMARY CARD: Video save or audio */}
      {(showVideoSaves || isAudioCd) && (
        <div style={{ ...dbSurface, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, padding: "20px 22px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              flexShrink: 0, width: 42, height: 42, borderRadius: 11,
              background: isAudioCd ? "rgba(52,199,89,0.12)" : "rgba(59,130,246,0.14)",
              border: isAudioCd ? "1px solid rgba(52,199,89,0.22)" : "1px solid rgba(59,130,246,0.28)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: isAudioCd ? "var(--db-green)" : "var(--db-text-muted)",
            }}>
              {isAudioCd ? <Music size={20} /> : <FileVideo size={20} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 8, ...dbText }}>
                {isAudioCd ? "Save your music" : "Save as video (MP4)"}
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, maxWidth: "60ch", ...dbMuted }}>
                {isAudioCd
                  ? `${audioToc?.tracks.length ?? 0} track${(audioToc?.tracks.length ?? 0) === 1 ? "" : "s"} · 44.1 kHz / 16-bit stereo — saves each track as a WAV file.`
                  : "Plays on any phone, computer, or TV — ideal if you want to share or stream your footage easily. Takes a few minutes to convert."}
              </div>
            </div>
            {isAudioCd ? (
              <button className="btn btn-primary" style={{ flexShrink: 0, whiteSpace: "nowrap" }} disabled={effectiveLock}
                onClick={() => guardedSave("audio", async () => setAudioTracks(await ipc.extractAudioTracks(sessionId)))}>
                {busy === "audio" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music className="h-4 w-4" />}
                Save tracks as WAV
              </button>
            ) : (
              <button className="btn btn-primary" style={{ flexShrink: 0, whiteSpace: "nowrap" }} disabled={effectiveLock}
                onClick={() => guardedSave("mp4", async () => { await convertAndEnroll(); })}>
                {busy === "mp4" && <Loader2 className="h-4 w-4 animate-spin" />}
                <FileVideo className="h-4 w-4" />
                Save as MP4
              </button>
            )}
          </div>

          {/* Audio track list */}
          {isAudioCd && audioToc && (
            <div style={{ borderTop: "1px solid var(--db-border)", padding: "12px 22px" }}>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                {audioToc.tracks.map((track) => (
                  <li key={track.number} style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 12, ...dbMuted }}>
                    <span>Track {String(track.number).padStart(2, "0")}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {Math.floor(track.duration_secs / 60)}:{String(Math.floor(track.duration_secs % 60)).padStart(2, "0")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Destination footer */}
          {!isAudioCd && (
            <div style={{ borderTop: "1px solid var(--db-border)", padding: "11px 22px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11.5, flexShrink: 0, ...dbFaint }}>Saving to</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", ...dbMuted }}>
                {session?.output_dir ?? "—"}
              </span>
              <button onClick={async () => { if (!showDrivePicker) await refreshDrives(); setShowDrivePicker(!showDrivePicker); }}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", background: "transparent", border: "1px solid var(--db-border)", borderRadius: 7, fontSize: 11.5, fontWeight: 500, ...dbMuted, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
                <Pencil size={11} /> Change folder
              </button>
              <button onClick={async () => { await refreshDrives(); setShowDrivePicker(true); }}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", background: "transparent", border: "1px solid var(--db-border)", borderRadius: 7, fontSize: 11.5, fontWeight: 500, ...dbMuted, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
                <Usb size={11} /> Save to USB
              </button>
            </div>
          )}

          {/* Space warning */}
          {spaceWarn && (
            <div style={{ margin: "0 22px 14px", borderRadius: 10, border: "1px solid rgba(194,116,31,0.28)", background: "var(--db-amber-light)", padding: "10px 14px", fontSize: 11.5, lineHeight: 1.5, ...dbMuted }}>
              <strong style={{ ...dbAmber }}>This drive may be low on space.</strong>{" "}
              Saving everything from this disc can need about {bytesToHuman(spaceWarn.needed)},
              but only {bytesToHuman(spaceWarn.free)} is free here.
              Use <strong>Change folder</strong> or <strong>Save to USB</strong> above to pick a drive with more room.
            </div>
          )}

          {/* Drive picker */}
          {showDrivePicker && (
            <div style={{ padding: "0 22px 14px" }}>
              {storageDrives.length === 0 ? (
                <p style={{ fontSize: 12, ...dbFaint }}>No drives detected.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[...storageDrives].sort((a, b) => Number(b.kind === "removable") - Number(a.kind === "removable")).map((d) => {
                    const isUsb = d.kind === "removable";
                    return (
                      <button key={d.path} type="button" onClick={() => useDrive(d)}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--db-border)", background: "var(--db-surface-2)", cursor: "pointer", textAlign: "left" }}>
                        {isUsb ? <Usb size={14} style={{ flexShrink: 0, ...dbAmber }} /> : <HardDrive size={14} style={{ flexShrink: 0, ...dbMuted }} />}
                        <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, ...dbText }}>{d.path.replace(/\\$/, "")}</span>
                        {d.label && <span style={{ fontSize: 11, ...dbFaint }}>· {d.label}</span>}
                        <span style={{ marginLeft: "auto", fontSize: 11, ...dbFaint, fontVariantNumeric: "tabular-nums" }}>{bytesToHuman(d.free_bytes)} free</span>
                        {isUsb && <span style={{ padding: "2px 7px", borderRadius: 99, background: "var(--db-amber-light)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", ...dbAmber }}>USB</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* DATA DISC PRIMARY: Save my files */}
      {!showVideoSaves && showFileSaves && (
        <div style={{ ...dbSurface, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, padding: "20px 22px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 11, background: "rgba(59,130,246,0.14)", border: "1px solid rgba(59,130,246,0.28)", display: "flex", alignItems: "center", justifyContent: "center", ...dbMuted }}>
              <Files size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, ...dbText }}>Save your files</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, ...dbMuted }}>Your photos, documents, and other files — in a folder. No conversion.</div>
            </div>
            <button className="btn btn-primary" style={{ flexShrink: 0, whiteSpace: "nowrap" }} disabled={effectiveLock}
              onClick={() => guardedSave("all-files", async () => {
                const result = await ipc.extractAllFiles(sessionId);
                setExtracted(result);
                ipc.library.rescanDiscForSession(sessionId).catch(() => {});
              })}>
              {busy === "all-files" && <Loader2 className="h-4 w-4 animate-spin" />}
              <Files className="h-4 w-4" /> Save my files
            </button>
          </div>
          <div style={{ borderTop: "1px solid var(--db-border)", padding: "11px 22px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11.5, flexShrink: 0, ...dbFaint }}>Saving to</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", ...dbMuted }}>{session?.output_dir ?? "—"}</span>
            <button onClick={async () => { if (!showDrivePicker) await refreshDrives(); setShowDrivePicker(!showDrivePicker); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", background: "transparent", border: "1px solid var(--db-border)", borderRadius: 7, fontSize: 11.5, fontWeight: 500, ...dbMuted, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
              <Pencil size={11} /> Change folder
            </button>
          </div>
          {showDrivePicker && (
            <div style={{ padding: "0 22px 14px" }}>
              {storageDrives.length === 0 ? <p style={{ fontSize: 12, ...dbFaint }}>No drives detected.</p> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[...storageDrives].sort((a, b) => Number(b.kind === "removable") - Number(a.kind === "removable")).map((d) => (
                    <button key={d.path} type="button" onClick={() => useDrive(d)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--db-border)", background: "var(--db-surface-2)", cursor: "pointer", textAlign: "left" }}>
                      {d.kind === "removable" ? <Usb size={14} style={{ flexShrink: 0, ...dbAmber }} /> : <HardDrive size={14} style={{ flexShrink: 0, ...dbMuted }} />}
                      <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, ...dbText }}>{d.path.replace(/\\$/, "")}</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, ...dbFaint, fontVariantNumeric: "tabular-nums" }}>{bytesToHuman(d.free_bytes)} free</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FREE CARD: Watch & search */}
      {showVideoSaves && (
        <div style={{ ...dbSurface, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "20px 22px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 11, background: "var(--db-green-light)", border: "1px solid rgba(26,135,80,0.22)", display: "flex", alignItems: "center", justifyContent: "center", ...dbGreen }}>
              <Search size={19} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 8, ...dbText }}>
                Watch &amp; search in Heirvo
                <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 99, background: "var(--db-green-light)", border: "1px solid rgba(26,135,80,0.22)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", ...dbGreen }}>Free</span>
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, ...dbMuted }}>
                Play your footage right here and search every spoken word — no purchase needed.
              </div>
            </div>
            <button type="button" disabled={effectiveLock}
              onClick={() => {
                if (enrolledDiscId) { navigate(`/disc/${enrolledDiscId}`); return; }
                wrap("watch", async () => {
                  const discId = await ipc.library.rescanDiscForSession(sessionId);
                  if (discId) { setEnrolledDiscId(discId); navigate(`/disc/${discId}`); }
                  else { setError("Couldn't open the preview just yet — give it a moment and try again, or use a Save option."); }
                });
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", background: "transparent", border: "1px solid var(--db-border)", borderRadius: 9, fontSize: 13, fontWeight: 500, ...dbText, flexShrink: 0, whiteSpace: "nowrap", cursor: effectiveLock ? "default" : "pointer", opacity: effectiveLock ? 0.5 : 1 }}>
              {busy === "watch"
                ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>}
              Watch now
            </button>
          </div>
        </div>
      )}

      {/* Result cards */}
      {audioTracks && audioTracks.length > 0 && (
        <ResultCard title={`✓ ${audioTracks.length} track${audioTracks.length === 1 ? "" : "s"} saved as WAV`} tone="green">
          {audioTracks[0] && (
            <button onClick={() => ipc.openFolder(audioTracks[0].file_path)}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, ...dbMuted, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <FolderOpen size={12} /> Open folder
            </button>
          )}
        </ResultCard>
      )}

      {mp4 && (
        <ResultCard title="Video saved" tone="green">
          <div style={{ fontFamily: "monospace", fontSize: 11, ...dbMuted, marginTop: 2 }}>{mp4.output_path}</div>
          <div style={{ fontSize: 11, ...dbFaint, marginTop: 2 }}>{bytesToHuman(mp4.bytes_written)} · {mp4.source_files.length} chapter{mp4.source_files.length === 1 ? "" : "s"}</div>
          <button onClick={() => ipc.openFolder(mp4.output_path)} style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 4, fontSize: 11, ...dbMuted, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <FolderOpen size={12} /> Show in Explorer
          </button>
        </ResultCard>
      )}

      {extracted && (
        <ResultCard title={`${extracted.length} file${extracted.length === 1 ? "" : "s"} saved`} tone="neutral">
          {extracted[0] && (
            <button onClick={() => ipc.openFolder(extracted[0].path)} style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 2, fontSize: 11, ...dbMuted, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <FolderOpen size={12} /> Open folder
            </button>
          )}
        </ResultCard>
      )}

      {/* Advanced diagnostics */}
      <details style={{ ...dbSurface, borderRadius: 14, overflow: "hidden" }}>
        <summary style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", cursor: "pointer", listStyle: "none", userSelect: "none" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--db-text-faint)", flexShrink: 0 }}>
            <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0 0 12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10"/>
          </svg>
          <span style={{ fontSize: 12.5, fontWeight: 500, ...dbMuted, flex: 1 }}>Advanced — diagnostics &amp; archive</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: "var(--db-text-faint)" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </summary>
        <div style={{ borderTop: "1px solid var(--db-border)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <p style={{ fontSize: 11, ...dbFaint, lineHeight: 1.55, margin: "0 0 10px" }}>
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
            {rmapExport && <div style={{ fontFamily: "monospace", fontSize: 10, ...dbFaint, marginTop: 6 }}>Saved {rmapExport.path} ({bytesToHuman(rmapExport.bytes_written)})</div>}
            {rmapImport && <div style={{ fontSize: 11, ...dbMuted, marginTop: 6 }}>{rmapImport.good_sectors.toLocaleString()} recovered, {rmapImport.failed_sectors.toLocaleString()} damaged, {rmapImport.unknown_sectors.toLocaleString()} pending</div>}
          </div>

          <div style={{ borderTop: "1px solid var(--db-border)", paddingTop: 12 }}>
            <p style={{ fontSize: 11, ...dbFaint, lineHeight: 1.55, margin: "0 0 10px" }}>
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
            {receipt && <div style={{ marginTop: 6, fontSize: 10, ...dbFaint }}>{receipt.sector_count.toLocaleString()} sectors verified</div>}
          </div>

          <div style={{ borderTop: "1px solid var(--db-border)", paddingTop: 12 }}>
            <button
              style={{ fontSize: 11, ...dbFaint, background: "none", border: "none", cursor: busy !== null ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 6, padding: 0 }}
              disabled={busy !== null}
              onClick={() => wrap("diag", async () => setDiagnostic(await ipc.exportDiagnosticBundle(sessionId)))}>
              {busy === "diag" ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <LifeBuoy size={12} />}
              Export diagnostic bundle for support
            </button>
            {diagnostic && <div style={{ fontFamily: "monospace", fontSize: 10, ...dbFaint, marginTop: 6 }}>{diagnostic.zip_path} ({bytesToHuman(diagnostic.bytes)})</div>}
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
    </div>
  );
}

// ─── ResultCard ───────────────────────────────────────────────────────────────

function ResultCard({ title, tone, children }: { title: string; tone: "green" | "neutral"; children?: React.ReactNode }) {
  const styles: React.CSSProperties = tone === "green"
    ? { borderRadius: 12, padding: "12px 16px", background: "linear-gradient(135deg, rgba(26,135,80,0.10) 0%, rgba(26,135,80,0.04) 100%)", border: "1px solid rgba(26,135,80,0.30)" }
    : { borderRadius: 12, padding: "12px 16px", background: "var(--db-surface-2)", border: "1px solid var(--db-border)" };
  return (
    <div style={styles}>
      <div style={{ fontSize: 13, fontWeight: 600, color: tone === "green" ? "var(--db-green)" : "var(--db-text)", marginBottom: children ? 4 : 0 }}>{title}</div>
      {children}
    </div>
  );
}
