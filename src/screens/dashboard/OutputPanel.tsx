import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ipc } from "@/lib/ipc";
import type { HealthReport, IsoResult, ExtractedFile, StorageDrive, Session, AudioToc, ExtractedAudioFile } from "@/lib/types";
import { FileVideo, Files, Loader2, FileArchive, LifeBuoy, Save, Upload, Usb, HardDrive, Pencil, Music, FolderOpen, ArrowRight, ShieldCheck, Search, Disc3 } from "lucide-react";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { bytesToHuman } from "@/lib/human";
import { useLicense } from "@/lib/useLicense";
import { ProPaywallModal } from "./ProPaywallModal";

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

export function OutputPanel({
  sessionId,
  onMp4Saved,
  recoveryPct: _recoveryPct = 0,
  recoveryDone = false,
  header,
}: {
  sessionId: string;
  /** 0–100: percentage of sectors read so far. Kept for API compatibility with Dashboard. */
  recoveryPct?: number;
  /** True once the backend fires the `complete` event. */
  recoveryDone?: boolean;
  /** Notifies the parent (Dashboard) that a video file is now on disk so it
   *  can offer the optional one-click "make it sharper" follow-up. */
  onMp4Saved?: (outputPath: string) => void;
  /** The wheel rail JSX from Dashboard — rendered as the left column of the
   *  top-frame grid. Never dimmed, even during extraction (holds Pause/Cancel). */
  header?: React.ReactNode;
}) {
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [healthHidden, setHealthHidden] = useState(false);
  const [mp4, setMp4] = useState<Mp4Result | null>(null);
  const [iso, setIso] = useState<IsoResult | null>(null);
  const [extracted, setExtracted] = useState<ExtractedFile[] | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticBundle | null>(null);
  const [rmapExport, setRmapExport] = useState<RmapExport | null>(null);
  const [rmapImport, setRmapImport] = useState<RmapImport | null>(null);
  const [receipt, setReceipt] = useState<ReceiptManifest | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrolledDiscId, setEnrolledDiscId] = useState<string | null>(null);
  const [burnLaunched, setBurnLaunched] = useState(false);
  // Destination free-space check — warns (doesn't block) when the drive may not
  // have room for the full disc image, nudging toward a USB/external drive.
  const [spaceWarn, setSpaceWarn] = useState<{ needed: number; free: number } | null>(null);

  const { status: license, refresh: refreshLicense } = useLicense();
  const navigate = useNavigate();
  const canSave = license.can_save;
  // Archive tier and up. The tamper-evident receipt manifest is an Archive
  // feature; can_import_media is the same Archive+ set today (the backend gates
  // it on its own can_export_manifest, so this is purely a UX hint).
  const canArchive = license.can_import_media;

  // Paywall modal — shown when free user clicks a save action
  const [paywallOpen, setPaywallOpen] = useState(false);
  // Stores the save action (and its busy label) to run after Pro unlock
  const pendingSaveRef = useRef<{ label: string; action: () => Promise<void> } | null>(null);

  // Gate for any EXPORT that leaves Heirvo (MP4, ISO, original files, burn, WAV).
  // Free tier gets 1 lifetime export of any kind; after that this shows the
  // paywall. In-app preview (Watch & search) does NOT go through here — it's free.
  const guardedSave = (label: string, action: () => Promise<void>) => {
    if (canSave) {
      wrap(label, action);
    } else {
      pendingSaveRef.current = { label, action };
      setPaywallOpen(true);
    }
  };

  // Output destination state — fetched and editable mid-recovery
  const [session, setSession] = useState<Session | null>(null);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [storageDrives, setStorageDrives] = useState<StorageDrive[]>([]);

  // Pull session details so we can show + edit output_dir
  useEffect(() => {
    ipc.listSessions()
      .then((all) => setSession(all.find((s) => s.id === sessionId) ?? null))
      .catch(() => {});
  }, [sessionId]);

  // Destination space check — surface a gentle warning if the disc image may not
  // fit on the chosen drive. Re-runs when the output directory changes.
  useEffect(() => {
    let cancelled = false;
    ipc.recoverySpaceCheck(sessionId)
      .then((r) => {
        if (cancelled) return;
        setSpaceWarn(r && !r.fits ? { needed: r.needed_bytes, free: r.free_bytes } : null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [sessionId, session?.output_dir]);

  // Audio CD probe — runs on mount. If READ TOC succeeds with tracks, the
  // panel switches to audio-CD-only mode (WAV extraction).
  const [audioToc, setAudioToc] = useState<AudioToc | null>(null);
  const [audioTracks, setAudioTracks] = useState<ExtractedAudioFile[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    ipc.readAudioToc(sessionId)
      .then((toc) => {
        if (!cancelled && toc.tracks.length > 0) setAudioToc(toc);
      })
      .catch(() => { /* not an audio CD — leave default UI */ });
    return () => { cancelled = true; };
  }, [sessionId]);
  const isAudioCd = audioToc !== null;

  // Auto-fetch disc health on mount — no button needed; the user already
  // read the disc and the data is ready on the backend.
  useEffect(() => {
    let cancelled = false;
    ipc.healthScore(sessionId)
      .then((h) => { if (!cancelled) setHealth(h); })
      .catch(() => { if (!cancelled) setHealthHidden(true); });
    return () => { cancelled = true; };
  }, [sessionId]);

  // Disc-type-aware Save UX. NULL/Unknown -> show everything (graceful fallback).
  const t = session?.disc_type ?? null;
  const isUnknownDisc = !t || t === "Unknown";
  // For audio CDs we hide all data buttons — only WAV extraction makes sense.
  const showVideoSaves = !isAudioCd && (isUnknownDisc || t === "DvdVideo");
  const showFileSaves = !isAudioCd && (isUnknownDisc || t === "Cd" || t === "DvdRom" || t === "DvdAudio");
  const showIso = !isAudioCd; // ISO doesn't apply to CD-DA.

  // ── Save gate ────────────────────────────────────────────────────────────
  // Saving from a half-read disc produces a broken/partial file — e.g. an MP4
  // built from VOBs that are only a few percent recovered, or an .ISO that's
  // mostly zero-fill. Every save/extract/burn action stays DISABLED until the
  // read pass has actually finished. "Finished" = the live `recovery:complete`
  // event (which fires on Completed *and* Cancelled, so stopping early still
  // unlocks saving), OR a persisted terminal session status (covers reopened
  // sessions where no live event fires this mount).
  const sessionFinished =
    session?.status === "completed" ||
    session?.status === "cancelled" ||
    session?.status === "failed";
  const saveReady = recoveryDone || sessionFinished;
  // Convenience: actions are blocked while busy OR before the read is done.
  const lock = busy !== null || !saveReady;

  const refreshDrives = async () => {
    try { setStorageDrives(await ipc.listStorageDrives()); }
    catch { /* ignore */ }
  };

  const useDrive = async (d: StorageDrive) => {
    if (!session) return;
    // Preserve the disc-name leaf folder; rebase onto the new drive root.
    const safeLabel = (session.disc_label || "Untitled disc")
      .replace(/[<>:"/\\|?*]/g, "_")
      .replace(/_+/g, "_")
      .trim() || "Untitled disc";
    const root = d.path.endsWith("\\") || d.path.endsWith("/") ? d.path : d.path + "\\";
    const newDir = `${root}DVD Rescue\\${safeLabel}`;
    try {
      const updated = await ipc.changeOutputDir(sessionId, newDir);
      setSession(updated);
      setShowDrivePicker(false);
    } catch (e) {
      setError(String(e));
    }
  };

  const wrap = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  };

  // Convert to a webview-playable MP4, save it, and enroll into the Library
  // (which also starts transcription so every spoken word becomes searchable).
  // Returns the new Library disc id, or null if enrollment failed.
  const convertAndEnroll = async (): Promise<string | null> => {
    const r = await ipc.saveAsMp4(sessionId);
    setMp4(r);
    onMp4Saved?.(r.output_path);
    refreshLicense().catch(() => {});
    try {
      const label = session?.user_label || session?.disc_label || null;
      const base = r.output_path.split(/[\\/]/).pop() ?? r.output_path;
      const stem = base.replace(/\.[^.]+$/, "");
      const derived = stem.replace(/[_\-]+/g, " ").trim()
        .replace(/\b\w/g, (c) => c.toUpperCase()) || "Recovered disc";
      const title = label ?? derived;
      const enrolled = await ipc.library.importMedia(r.output_path, title);
      if (!enrolled.isDuplicate) {
        await ipc.transcription.enqueue(enrolled.id, r.output_path).catch(() => {});
      }
      setEnrolledDiscId(enrolled.id);
      return enrolled.id;
    } catch {
      return null;
    }
  };

  // ── Layout tokens (using --db-* vars to match the Dashboard theme) ──────
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

  // ── Dim style — applied to action stack and bottom block when !saveReady ──
  // The header (wheel rail) is NEVER dimmed — it holds Pause/Cancel.
  const dimStyle: React.CSSProperties = !saveReady
    ? { opacity: 0.4, filter: "saturate(0.65)", pointerEvents: "none", transition: "opacity 0.4s ease, filter 0.4s ease" }
    : { opacity: 1, filter: "none", transition: "opacity 0.4s ease, filter 0.4s ease" };

  // ── Action stack: primary Save card + free Watch card ───────────────────
  const actionStack = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ══ PRIMARY CARD: Save as video (MP4) ═══════════════════════════
          Matches the mockup's top primary-card exactly:
          icon + title + desc + button on top, destination footer below. */}
      {(showVideoSaves || isAudioCd) && (
        <div style={{
          ...dbSurface,
          borderRadius: 14,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}>
          {/* Top row */}
          <div style={{
            flex: 1,
            padding: "20px 22px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}>
            {/* Icon */}
            <div style={{
              flexShrink: 0,
              width: 42, height: 42,
              borderRadius: 11,
              background: isAudioCd
                ? "rgba(52,199,89,0.12)"
                : "rgba(59,130,246,0.14)",
              border: isAudioCd
                ? "1px solid rgba(52,199,89,0.22)"
                : "1px solid rgba(59,130,246,0.28)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: isAudioCd ? "var(--db-green)" : "var(--db-text-muted)",
            }}>
              {isAudioCd
                ? <Music size={20} />
                : <FileVideo size={20} />}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 15, fontWeight: 600, marginBottom: 4,
                display: "flex", alignItems: "center", gap: 8, ...dbText,
              }}>
                {isAudioCd ? "Save your music" : "Save as video (MP4)"}
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, maxWidth: "60ch", ...dbMuted }}>
                {isAudioCd
                  ? `${audioToc?.tracks.length ?? 0} track${(audioToc?.tracks.length ?? 0) === 1 ? "" : "s"} · 44.1 kHz / 16-bit stereo — saves each track as a WAV file.`
                  : "Plays on any phone, computer, or TV — ideal if you want to share or stream your footage easily. Takes a few minutes to convert."}
              </div>
            </div>

            {/* Action button */}
            {isAudioCd ? (
              <button
                className="btn btn-primary"
                style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                disabled={lock}
                onClick={() =>
                  guardedSave("audio", async () => setAudioTracks(await ipc.extractAudioTracks(sessionId)))
                }
              >
                {busy === "audio" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music className="h-4 w-4" />}
                Save tracks as WAV
              </button>
            ) : (
              <button
                className="btn btn-primary"
                style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                disabled={lock}
                onClick={() => guardedSave("mp4", async () => { await convertAndEnroll(); })}
              >
                {busy === "mp4" && <Loader2 className="h-4 w-4 animate-spin" />}
                <FileVideo className="h-4 w-4" />
                Save as MP4
              </button>
            )}
          </div>

          {/* Audio track list (audio CD only) */}
          {isAudioCd && audioToc && (
            <div style={{
              borderTop: "1px solid var(--db-border)",
              padding: "12px 22px",
            }}>
              <ul style={{
                margin: 0, padding: 0, listStyle: "none",
                maxHeight: 160, overflowY: "auto",
                display: "flex", flexDirection: "column", gap: 2,
              }}>
                {audioToc.tracks.map((track) => (
                  <li key={track.number} style={{
                    display: "flex", justifyContent: "space-between",
                    fontFamily: "monospace", fontSize: 12, ...dbMuted,
                  }}>
                    <span>Track {String(track.number).padStart(2, "0")}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {Math.floor(track.duration_secs / 60)}:
                      {String(Math.floor(track.duration_secs % 60)).padStart(2, "0")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Destination footer (video discs only) */}
          {!isAudioCd && (
            <div style={{
              borderTop: "1px solid var(--db-border)",
              padding: "11px 22px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <span style={{ fontSize: 11.5, flexShrink: 0, ...dbFaint }}>Saving to</span>
              <span style={{
                flex: 1, minWidth: 0,
                fontSize: 12, fontFamily: "monospace",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                ...dbMuted,
              }}>
                {session?.output_dir ?? "—"}
              </span>
              <button
                onClick={async () => {
                  if (!showDrivePicker) await refreshDrives();
                  setShowDrivePicker(!showDrivePicker);
                }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 11px",
                  background: "transparent",
                  border: "1px solid var(--db-border)",
                  borderRadius: 7,
                  fontSize: 11.5, fontWeight: 500, ...dbMuted,
                  cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                }}
              >
                <Pencil size={11} />
                Change folder
              </button>
              <button
                onClick={async () => {
                  await refreshDrives();
                  setShowDrivePicker(true);
                }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 11px",
                  background: "transparent",
                  border: "1px solid var(--db-border)",
                  borderRadius: 7,
                  fontSize: 11.5, fontWeight: 500, ...dbMuted,
                  cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                }}
              >
                <Usb size={11} />
                Save to USB
              </button>
            </div>
          )}

          {/* Space warning */}
          {spaceWarn && (
            <div style={{
              margin: "0 22px 14px",
              borderRadius: 10,
              border: "1px solid rgba(194,116,31,0.28)",
              background: "var(--db-amber-light)",
              padding: "10px 14px",
              fontSize: 11.5, lineHeight: 1.5, ...dbMuted,
            }}>
              <strong style={{ ...dbAmber }}>This drive may be low on space.</strong>{" "}
              Saving everything from this disc can need about {bytesToHuman(spaceWarn.needed)},
              but only {bytesToHuman(spaceWarn.free)} is free here.
              Use <strong>Change folder</strong> or <strong>Save to USB</strong> above to pick a drive with more room.
            </div>
          )}

          {/* Drive picker (shared by both Change folder + Save to USB) */}
          {showDrivePicker && (
            <div style={{ padding: "0 22px 14px" }}>
              {storageDrives.length === 0 ? (
                <p style={{ fontSize: 12, ...dbFaint }}>No drives detected.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[...storageDrives]
                    .sort((a, b) => Number(b.kind === "removable") - Number(a.kind === "removable"))
                    .map((d) => {
                      const isUsb = d.kind === "removable";
                      return (
                        <button
                          key={d.path}
                          type="button"
                          onClick={() => useDrive(d)}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: "1px solid var(--db-border)",
                            background: "var(--db-surface-2)",
                            cursor: "pointer", textAlign: "left",
                          }}
                        >
                          {isUsb
                            ? <Usb size={14} style={{ flexShrink: 0, ...dbAmber }} />
                            : <HardDrive size={14} style={{ flexShrink: 0, ...dbMuted }} />}
                          <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, ...dbText }}>
                            {d.path.replace(/\\$/, "")}
                          </span>
                          {d.label && <span style={{ fontSize: 11, ...dbFaint }}>· {d.label}</span>}
                          <span style={{ marginLeft: "auto", fontSize: 11, ...dbFaint, fontVariantNumeric: "tabular-nums" }}>
                            {bytesToHuman(d.free_bytes)} free
                          </span>
                          {isUsb && (
                            <span style={{
                              padding: "2px 7px", borderRadius: 99,
                              background: "var(--db-amber-light)",
                              fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                              ...dbAmber,
                            }}>USB</span>
                          )}
                        </button>
                      );
                    })
                  }
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ DATA DISC PRIMARY: Save my files ════════════════════════ */}
      {!showVideoSaves && showFileSaves && (
        <div style={{
          ...dbSurface,
          borderRadius: 14,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{
            flex: 1, padding: "20px 22px",
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <div style={{
              flexShrink: 0, width: 42, height: 42, borderRadius: 11,
              background: "rgba(59,130,246,0.14)",
              border: "1px solid rgba(59,130,246,0.28)",
              display: "flex", alignItems: "center", justifyContent: "center",
              ...dbMuted,
            }}>
              <Files size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, ...dbText }}>
                Save your files
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, ...dbMuted }}>
                Your photos, documents, and other files — in a folder. No conversion.
              </div>
            </div>
            <button
              className="btn btn-primary"
              style={{ flexShrink: 0, whiteSpace: "nowrap" }}
              disabled={lock}
              onClick={() => guardedSave("all-files", async () => {
                const result = await ipc.extractAllFiles(sessionId);
                setExtracted(result);
                ipc.library.rescanDiscForSession(sessionId).catch(() => {});
              })}
            >
              {busy === "all-files" && <Loader2 className="h-4 w-4 animate-spin" />}
              <Files className="h-4 w-4" />
              Save my files
            </button>
          </div>

          {/* Destination footer */}
          <div style={{
            borderTop: "1px solid var(--db-border)",
            padding: "11px 22px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 11.5, flexShrink: 0, ...dbFaint }}>Saving to</span>
            <span style={{
              flex: 1, minWidth: 0, fontSize: 12, fontFamily: "monospace",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", ...dbMuted,
            }}>
              {session?.output_dir ?? "—"}
            </span>
            <button
              onClick={async () => {
                if (!showDrivePicker) await refreshDrives();
                setShowDrivePicker(!showDrivePicker);
              }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "6px 11px", background: "transparent",
                border: "1px solid var(--db-border)", borderRadius: 7,
                fontSize: 11.5, fontWeight: 500, ...dbMuted,
                cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
              }}
            >
              <Pencil size={11} />
              Change folder
            </button>
          </div>

          {showDrivePicker && (
            <div style={{ padding: "0 22px 14px" }}>
              {storageDrives.length === 0 ? (
                <p style={{ fontSize: 12, ...dbFaint }}>No drives detected.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[...storageDrives]
                    .sort((a, b) => Number(b.kind === "removable") - Number(a.kind === "removable"))
                    .map((d) => (
                      <button
                        key={d.path}
                        type="button"
                        onClick={() => useDrive(d)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 12px", borderRadius: 10,
                          border: "1px solid var(--db-border)",
                          background: "var(--db-surface-2)",
                          cursor: "pointer", textAlign: "left",
                        }}
                      >
                        {d.kind === "removable"
                          ? <Usb size={14} style={{ flexShrink: 0, ...dbAmber }} />
                          : <HardDrive size={14} style={{ flexShrink: 0, ...dbMuted }} />}
                        <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, ...dbText }}>
                          {d.path.replace(/\\$/, "")}
                        </span>
                        <span style={{ marginLeft: "auto", fontSize: 11, ...dbFaint, fontVariantNumeric: "tabular-nums" }}>
                          {bytesToHuman(d.free_bytes)} free
                        </span>
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ FREE CARD: Watch & search in Heirvo ═════════════════════
          This path never calls save_as_mp4, never shows the paywall.
          Watching is always free — only exporting to disk is paid. */}
      {showVideoSaves && (
        <div style={{
          ...dbSurface,
          borderRadius: 14,
          overflow: "hidden",
        }}>
          <div style={{
            padding: "20px 22px",
            display: "flex", alignItems: "center", gap: 16,
          }}>
            {/* Green icon */}
            <div style={{
              flexShrink: 0, width: 42, height: 42, borderRadius: 11,
              background: "var(--db-green-light)",
              border: "1px solid rgba(26,135,80,0.22)",
              display: "flex", alignItems: "center", justifyContent: "center",
              ...dbGreen,
            }}>
              <Search size={19} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 15, fontWeight: 600, marginBottom: 4,
                display: "flex", alignItems: "center", gap: 8, ...dbText,
              }}>
                Watch &amp; search in Heirvo
                <span style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "2px 8px", borderRadius: 99,
                  background: "var(--db-green-light)",
                  border: "1px solid rgba(26,135,80,0.22)",
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                  ...dbGreen,
                }}>Free</span>
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, ...dbMuted }}>
                Play your footage right here and search every spoken word — no purchase needed.
                Saving a copy to your computer is the paid step.
              </div>
            </div>

            {/* Watch now button */}
            <button
              type="button"
              disabled={lock}
              onClick={() => {
                if (enrolledDiscId) {
                  navigate(`/disc/${enrolledDiscId}`);
                  return;
                }
                // FREE in-app preview — the funnel hook. The recovered disc is
                // already enrolled in the library by recovery's auto-promote, so
                // we just resolve its id and open the player. This path never calls
                // save_as_mp4, does NOT consume the free export, and NEVER shows the
                // paywall. Watching is always free; only exporting the file is paid.
                wrap("watch", async () => {
                  const discId = await ipc.library.rescanDiscForSession(sessionId);
                  if (discId) {
                    setEnrolledDiscId(discId);
                    navigate(`/disc/${discId}`);
                  } else {
                    setError(
                      "Couldn't open the preview just yet — give it a moment and try again, or use a Save option.",
                    );
                  }
                });
              }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "10px 18px",
                background: "transparent",
                border: "1px solid var(--db-border)",
                borderRadius: 9,
                fontSize: 13, fontWeight: 500, ...dbText,
                flexShrink: 0, whiteSpace: "nowrap",
                cursor: lock ? "default" : "pointer",
                opacity: lock ? 0.5 : 1,
              }}
            >
              {busy === "watch"
                ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
              Watch now
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Bottom block: alt-grid + result cards + advanced ────────────────────
  // This entire block dims when !saveReady (same as action stack).
  const bottomBlock = (
    <>
      {/* ══ 3-COL ALT GRID: Exact copy / Original files / New disc ══
          Full-width, below the top-frame grid — matches split-v2 mockup. */}
      {(showIso || showVideoSaves) && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}>
          {/* Exact copy of the disc (.ISO) */}
          {showIso && (
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
          )}

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
          {showIso && (
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
          )}
        </div>
      )}

      {/* Burn launched notice */}
      {burnLaunched && (
        <p style={{ fontSize: 11, ...dbMuted, lineHeight: 1.5 }}>
          Windows' disc burner is opening — take the original disc out, pop in a blank one,
          and click <strong>Burn</strong>.
        </p>
      )}

      {/* ══ RESULT CARDS ════════════════════════════════════════════ */}
      {/* Audio tracks saved */}
      {audioTracks && audioTracks.length > 0 && (
        <ResultCard title={`✓ ${audioTracks.length} track${audioTracks.length === 1 ? "" : "s"} saved as WAV`} tone="green">
          {audioTracks[0] && (
            <button
              onClick={() => ipc.openFolder(audioTracks[0].file_path)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11, ...dbMuted, background: "none", border: "none", cursor: "pointer", padding: 0,
              }}
            >
              <FolderOpen size={12} /> Open folder
            </button>
          )}
        </ResultCard>
      )}

      {/* MP4 saved */}
      {mp4 && (
        <ResultCard title="Video saved" tone="green">
          <div style={{ fontFamily: "monospace", fontSize: 11, ...dbMuted, marginTop: 2 }}>{mp4.output_path}</div>
          <div style={{ fontSize: 11, ...dbFaint, marginTop: 2 }}>
            {bytesToHuman(mp4.bytes_written)} · {mp4.source_files.length} chapter{mp4.source_files.length === 1 ? "" : "s"}
          </div>
          <button
            onClick={() => ipc.openFolder(mp4.output_path)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5, marginTop: 4,
              fontSize: 11, ...dbMuted, background: "none", border: "none", cursor: "pointer", padding: 0,
            }}
          >
            <FolderOpen size={12} /> Show in Explorer
          </button>
        </ResultCard>
      )}

      {/* Enrolled in library */}
      {enrolledDiscId && (
        <Link
          to={`/disc/${enrolledDiscId}`}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            borderRadius: 12, padding: "12px 16px",
            border: "1px solid rgba(194,116,31,0.30)",
            background: "linear-gradient(135deg, #FFF8EC 0%, #FBF1DE 100%)",
            color: "var(--lib-ink, #2C2416)",
            textDecoration: "none",
          }}
        >
          <span style={{ fontSize: 16 }}>📼</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--lib-amber, #C2741F)" }}>
              Added to your Library
            </div>
            <div style={{ fontSize: 11, color: "#7A6F62", marginTop: 2 }}>
              Transcription starting in the background — search every spoken word when done
            </div>
          </div>
          <ArrowRight size={14} style={{ flexShrink: 0, color: "var(--lib-amber, #C2741F)" }} />
        </Link>
      )}

      {/* ISO saved */}
      {iso && (
        <ResultCard title="Disc image saved" tone="neutral">
          <div style={{ fontFamily: "monospace", fontSize: 11, ...dbMuted, marginTop: 2 }}>{iso.path}</div>
          <div style={{ fontSize: 11, ...dbFaint, marginTop: 2 }}>
            {bytesToHuman(iso.bytes_written)} · {iso.good_sectors.toLocaleString()} sections recovered
            {iso.zero_filled_sectors > 0 && `, ${iso.zero_filled_sectors.toLocaleString()} damaged`}
            {iso.good_read_failed_sectors > 0 && (
              <span style={{ color: "var(--db-amber)", marginLeft: 4 }}>
                · {iso.good_read_failed_sectors.toLocaleString()} sectors degraded since scan — re-run the rescue soon
              </span>
            )}
          </div>
          <button
            onClick={() => ipc.openFolder(iso.path)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5, marginTop: 4,
              fontSize: 11, ...dbMuted, background: "none", border: "none", cursor: "pointer", padding: 0,
            }}
          >
            <FolderOpen size={12} /> Show in Explorer
          </button>
        </ResultCard>
      )}

      {/* Extracted files saved */}
      {extracted && (
        <ResultCard title={`${extracted.length} file${extracted.length === 1 ? "" : "s"} saved`} tone="neutral">
          {extracted[0] && (
            <button
              onClick={() => ipc.openFolder(extracted[0].path)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5, marginTop: 2,
                fontSize: 11, ...dbMuted, background: "none", border: "none", cursor: "pointer", padding: 0,
              }}
            >
              <FolderOpen size={12} /> Open folder
            </button>
          )}
          <ul style={{
            margin: "6px 0 0", padding: 0, listStyle: "none",
            maxHeight: 140, overflowY: "auto",
            display: "flex", flexDirection: "column", gap: 2,
          }}>
            {extracted.map((f) => (
              <li key={f.path} style={{
                display: "flex", justifyContent: "space-between",
                fontFamily: "monospace", fontSize: 11,
              }}>
                <span style={{ ...dbMuted }}>{f.name}</span>
                <span style={{ ...dbFaint }}>
                  {bytesToHuman(f.size_bytes)}
                  {f.zero_filled_sectors > 0 && (
                    <span style={{ color: "var(--db-amber)", marginLeft: 6 }}>
                      ({f.zero_filled_sectors} damaged)
                    </span>
                  )}
                  {f.good_read_failed_sectors > 0 && (
                    <span style={{ color: "var(--db-amber)", marginLeft: 6 }}>
                      ({f.good_read_failed_sectors.toLocaleString()} degraded since scan — re-run soon)
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </ResultCard>
      )}

      {/* ══ DISC HEALTH (order-last, below primary actions) ══════════ */}
      {!healthHidden && (
        <div style={{
          ...dbSurface,
          borderRadius: 14,
          padding: "18px 22px",
        }}>
          <div style={{
            fontSize: 10.5, fontWeight: 600, letterSpacing: "0.12em",
            textTransform: "uppercase", ...dbFaint, marginBottom: 12,
          }}>Disc health</div>
          {health ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <HealthArc score={health.score} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13, fontWeight: 500, lineHeight: 1.4, margin: 0,
                    color: health.score >= 90
                      ? "var(--db-green)"
                      : health.score >= 70
                        ? "var(--db-amber)"
                        : "var(--db-red)",
                  }}>
                    {health.score >= 90
                      ? "Excellent — every sector read cleanly."
                      : health.score >= 70
                        ? `Good — ${health.coverage_pct.toFixed(0)}% recovered, ${health.failed_sectors.toLocaleString()} spot${health.failed_sectors === 1 ? "" : "s"} couldn't be read.`
                        : `Some damage — ${health.coverage_pct.toFixed(0)}% recovered, ${health.failed_sectors.toLocaleString()} spot${health.failed_sectors === 1 ? "" : "s"} were unreadable.`}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, lineHeight: 1.5, ...dbMuted }}>
                    {health.summary}
                  </p>
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: "pointer", fontSize: 11, ...dbFaint }}>
                      Details
                    </summary>
                    <dl style={{ margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 2, fontSize: 11, ...dbFaint }}>
                      <div>Coverage: {health.coverage_pct.toFixed(1)}%</div>
                      <div>Critical files: {health.critical_intact ? "intact" : "damaged"}</div>
                      <div>Largest unreadable run: {health.largest_failed_run.toLocaleString()} sections</div>
                    </dl>
                  </details>
                </div>
              </div>

              {/* Mail-in handoff for severely damaged discs */}
              {health.score < 50 && (
                <div style={{
                  marginTop: 16, borderRadius: 12,
                  border: "1px solid rgba(194,116,31,0.30)",
                  background: "linear-gradient(135deg, rgba(194,116,31,0.10) 0%, rgba(194,116,31,0.04) 100%)",
                  padding: "12px 16px",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, ...dbText, marginBottom: 4 }}>
                    Some damage is beyond what software can fix.
                  </div>
                  <p style={{ fontSize: 11, lineHeight: 1.5, ...dbMuted, margin: "0 0 10px" }}>
                    Our lab reads discs with specialised optical equipment — including ones that score this low.
                    Recovery starts at $89, and your Heirvo purchase counts toward it.
                  </p>
                  <a
                    href="https://heirvo.com/recover"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "6px 12px", borderRadius: 8,
                      background: "var(--db-amber-light)",
                      fontSize: 12, fontWeight: 500, ...dbAmber,
                      textDecoration: "none",
                    }}
                  >
                    Get a lab estimate
                    <ArrowRight size={12} aria-hidden />
                  </a>
                </div>
              )}
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, ...dbFaint }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              Checking…
            </div>
          )}
        </div>
      )}

      {/* ══ ADVANCED — diagnostics & archive ════════════════════════ */}
      <details style={{
        ...dbSurface,
        borderRadius: 14,
        overflow: "hidden",
      }}>
        <summary style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 18px",
          cursor: "pointer",
          listStyle: "none",
          userSelect: "none",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--db-text-faint)", flexShrink: 0 }}>
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.07 4.93A10 10 0 0 0 12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10"/>
          </svg>
          <span style={{ fontSize: 12.5, fontWeight: 500, ...dbMuted, flex: 1 }}>
            Advanced — diagnostics &amp; archive
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: "var(--db-text-faint)" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </summary>

        <div style={{
          borderTop: "1px solid var(--db-border)",
          padding: "16px 18px",
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          {/* Recovery map section */}
          <div>
            <p style={{ fontSize: 11, ...dbFaint, lineHeight: 1.55, margin: "0 0 10px" }}>
              The recovery map records which sections of the disc we read
              successfully. Save it to continue this rescue on another
              computer or with GNU ddrescue. Compatible with ddrescue's
              mapfile format.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button
                className="btn btn-ghost"
                disabled={busy !== null}
                onClick={() =>
                  wrap("rmap-export", async () => {
                    const target = await saveDialog({
                      defaultPath: `recovery-${sessionId.slice(0, 8)}.rmap`,
                      filters: [
                        { name: "Recovery map", extensions: ["rmap"] },
                        { name: "All files", extensions: ["*"] },
                      ],
                    });
                    if (typeof target === "string") {
                      setRmapExport(await ipc.exportRmap(sessionId, target));
                    }
                  })
                }
              >
                {busy === "rmap-export"
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Save className="h-3 w-3" />}
                Save recovery map
              </button>
              <button
                className="btn btn-ghost"
                disabled={busy !== null}
                onClick={() =>
                  wrap("rmap-import", async () => {
                    const picked = await openDialog({
                      multiple: false,
                      filters: [
                        { name: "Recovery map", extensions: ["rmap", "map"] },
                        { name: "All files", extensions: ["*"] },
                      ],
                    });
                    if (typeof picked === "string") {
                      setRmapImport(await ipc.importRmap(sessionId, picked));
                    }
                  })
                }
              >
                {busy === "rmap-import"
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Upload className="h-3 w-3" />}
                Load recovery map
              </button>
            </div>
            {rmapExport && (
              <div style={{ fontFamily: "monospace", fontSize: 10, ...dbFaint, marginTop: 6 }}>
                Saved {rmapExport.path} ({bytesToHuman(rmapExport.bytes_written)})
              </div>
            )}
            {rmapImport && (
              <div style={{ fontSize: 11, ...dbMuted, marginTop: 6 }}>
                Loaded — {rmapImport.good_sectors.toLocaleString()} recovered,{" "}
                {rmapImport.failed_sectors.toLocaleString()} damaged,{" "}
                {rmapImport.unknown_sectors.toLocaleString()} pending
              </div>
            )}
          </div>

          {/* Receipt manifest section */}
          <div style={{ borderTop: "1px solid var(--db-border)", paddingTop: 12 }}>
            <p style={{ fontSize: 11, ...dbFaint, lineHeight: 1.55, margin: "0 0 10px" }}>
              The tamper-evident recovery manifest is a SHA-256 chain-of-custody
              record — one line per recovered sector, plus a self-verifying
              manifest digest. Useful for archival / legal verification.{" "}
              <span style={{ color: "var(--db-amber)" }}>Archive feature.</span>
            </p>
            {canArchive ? (
              <button
                className="btn btn-ghost"
                disabled={busy !== null}
                onClick={() =>
                  wrap("receipt", async () => {
                    const target = await saveDialog({
                      defaultPath: `receipt-${sessionId.slice(0, 8)}.txt`,
                      filters: [
                        { name: "Receipt manifest", extensions: ["txt"] },
                        { name: "All files", extensions: ["*"] },
                      ],
                    });
                    if (typeof target === "string") {
                      setReceipt(await ipc.exportReceiptManifest(sessionId, target));
                    }
                  })
                }
              >
                {busy === "receipt"
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <ShieldCheck className="h-3 w-3" />}
                Save SHA-256 receipt manifest
              </button>
            ) : (
              <button
                className="btn btn-ghost opacity-50"
                disabled
                title="Available on the Archive plan"
              >
                <ShieldCheck className="h-3 w-3" />
                Save SHA-256 receipt manifest — Archive
              </button>
            )}
            {receipt && (
              <div style={{ marginTop: 6, fontSize: 10, ...dbFaint }}>
                {receipt.sector_count.toLocaleString()} sectors verified
              </div>
            )}
          </div>

          {/* Diagnostic bundle */}
          <div style={{ borderTop: "1px solid var(--db-border)", paddingTop: 12 }}>
            <button
              style={{ fontSize: 11, ...dbFaint, background: "none", border: "none", cursor: busy !== null ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 6, padding: 0 }}
              disabled={busy !== null}
              onClick={() =>
                wrap("diag", async () =>
                  setDiagnostic(await ipc.exportDiagnosticBundle(sessionId)),
                )
              }
            >
              {busy === "diag"
                ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                : <LifeBuoy size={12} />}
              Export diagnostic bundle for support
            </button>
            {diagnostic && (
              <div style={{ fontFamily: "monospace", fontSize: 10, ...dbFaint, marginTop: 6 }}>
                {diagnostic.zip_path} ({bytesToHuman(diagnostic.bytes)})
              </div>
            )}
          </div>
        </div>
      </details>
    </>
  );

  return (
    <div className="output-panel-root" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ══ TOP FRAME: wheel rail (header, left) + action stack (right) ══
          The header is NEVER dimmed — it holds Pause/Cancel during extraction.
          The action stack dims when !saveReady. */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(206px, 0.52fr) 2.48fr",
        gap: 14,
        alignItems: "flex-start",
      }}>
        {/* Left column: wheel rail passed in from Dashboard */}
        {header}

        {/* Right column: primary save card + free Watch card — dims during extraction */}
        <div style={dimStyle}>
          {actionStack}
        </div>
      </div>

      {/* ══ FULL-WIDTH BOTTOM: alt-grid + results + advanced ══════════
          These are siblings of the top-frame grid, NOT inside the right column.
          They also dim when !saveReady. */}
      <div style={dimStyle}>
        {bottomBlock}
      </div>

      {/* Error display — always visible, outside dim */}
      {error && (
        <p style={{ fontSize: 13, color: "var(--db-red)", margin: 0 }}>{error}</p>
      )}

      <ProPaywallModal
        open={paywallOpen}
        exportsUsed={license.exports_used}
        onClose={() => {
          setPaywallOpen(false);
          pendingSaveRef.current = null;
        }}
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

/* ── AltCard: compact 3-col "other ways to save" tile ──────────── */
function AltCard({
  icon, title, badge, desc, loading, disabled, onClick,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  desc: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        minHeight: 118,
        padding: "18px 18px 16px",
        borderRadius: 14,
        background: "var(--db-surface)",
        border: "1px solid var(--db-border)",
        textAlign: "left",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "border-color 150ms ease",
      }}
    >
      {/* Top row: icon + badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "var(--db-text-faint)" }}>
          {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : icon}
        </span>
        {badge && (
          <span style={{
            display: "inline-flex", alignItems: "center",
            padding: "2px 8px", borderRadius: 99,
            background: "rgba(59,130,246,0.12)",
            border: "1px solid rgba(59,130,246,0.22)",
            fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
            color: "var(--db-text-muted)",
          }}>{badge}</span>
        )}
      </div>
      {/* Title */}
      <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--db-text)" }}>{title}</span>
      {/* Desc */}
      <span style={{ fontSize: 12, color: "var(--db-text-faint)", lineHeight: 1.5 }}>{desc}</span>
    </button>
  );
}

/* ── ResultCard: success/info result display ───────────────────── */
function ResultCard({
  title, tone, children,
}: {
  title: string;
  tone: "green" | "neutral";
  children?: React.ReactNode;
}) {
  const styles: React.CSSProperties = tone === "green"
    ? {
        borderRadius: 12, padding: "12px 16px",
        background: "linear-gradient(135deg, rgba(26,135,80,0.10) 0%, rgba(26,135,80,0.04) 100%)",
        border: "1px solid rgba(26,135,80,0.30)",
      }
    : {
        borderRadius: 12, padding: "12px 16px",
        background: "var(--db-surface-2)",
        border: "1px solid var(--db-border)",
      };
  return (
    <div style={styles}>
      <div style={{
        fontSize: 13, fontWeight: 600,
        color: tone === "green" ? "var(--db-green)" : "var(--db-text)",
        marginBottom: children ? 4 : 0,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function HealthArc({ score }: { score: number }) {
  const size = 64;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * c;
  const color =
    clamped >= 90
      ? "#34C759"
      : clamped >= 70
        ? "#5AC8FA"
        : clamped >= 50
          ? "#FF9500"
          : "#FF3B30";
  return (
    <div style={{ position: "relative", flexShrink: 0, width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--db-border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--db-serif)", fontSize: 15, fontWeight: 600,
        fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
        color: "var(--db-text)",
      }}>
        {Math.round(clamped)}
      </div>
    </div>
  );
}
