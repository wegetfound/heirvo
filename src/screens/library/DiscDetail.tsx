import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronLeft, Play, Download, Share2, Trash2, Images, Music, FileText } from "lucide-react";
import { getDiscById } from "./data/mockDiscs";
import type { Disc } from "./data/types";
import { GradientArt, gradientCss } from "./components/GradientArt";
import { Monogram } from "./components/Monogram";
import { ipc, events } from "../../lib/ipc";
import { renderDiscHtmlBrowser } from "./data/htmlExport";
import type { TranscriptionJob } from "../../lib/types";

export default function DiscDetail() {
  const { discId } = useParams<{ discId: string }>();
  const nav = useNavigate();
  const [disc, setDisc] = useState<Disc | undefined>(() =>
    discId ? getDiscById(discId) : undefined,
  );
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [activeJob, setActiveJob] = useState<TranscriptionJob | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  // Poll for the latest transcription job for this disc + subscribe to
  // progress events so the status block updates live.
  useEffect(() => {
    if (!discId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const jobs = await ipc.transcription.forDisc(discId);
        if (!cancelled) setActiveJob(jobs[0] ?? null);
      } catch {
        /* dev mode */
      }
    };
    load();
    const unsubs: Array<Promise<() => void>> = [
      events.onTranscriptionProgress((p) => {
        if (p.discId !== discId) return;
        setActiveJob((prev) =>
          prev && prev.id === p.jobId
            ? { ...prev, status: p.status, progress: p.progress }
            : prev,
        );
      }),
      events.onTranscriptionComplete((p) => {
        if (p.discId !== discId) return;
        load();
        // Also refresh the disc to pick up new transcript lines.
        (async () => {
          try {
            const fresh = await ipc.library.get(discId);
            if (fresh) setDisc(fresh);
          } catch {
            /* ignore */
          }
        })();
      }),
      events.onTranscriptionError((p) => {
        if (p.discId !== discId) return;
        load();
      }),
    ];
    return () => {
      cancelled = true;
      unsubs.forEach((u) => u.then((fn) => fn()).catch(() => {}));
    };
  }, [discId]);

  async function retryTranscription() {
    if (!activeJob) return;
    try {
      await ipc.transcription.retry(activeJob.id);
      const jobs = await ipc.transcription.forDisc(activeJob.discId);
      setActiveJob(jobs[0] ?? null);
    } catch {
      /* ignore */
    }
  }

  /** Reveal the disc's recovered file in the OS file manager.
   *  Only called for audio / document discs that have a videoPath.
   *  Gracefully degrades in dev mode (no Tauri shell). */
  async function handleRevealInFolder() {
    if (!disc?.videoPath) return;
    try {
      await ipc.revealInFolder(disc.videoPath);
    } catch (err) {
      console.warn("[Heirvo] revealInFolder unavailable in dev mode:", err);
    }
  }

  /** Remove this disc from the library. Backend handles cascade + vault file. */
  async function handleDelete() {
    if (!discId || deleting) return;
    setDeleting(true);
    setDeleteErr(null);
    try {
      const r = await ipc.library.deleteDisc(discId);
      setDeleteOpen(false);
      // Tiny success cue in the navigated-to library so user knows it worked.
      const note = r.vaultFileRemoved
        ? `Removed “${disc?.title ?? "disc"}” · freed ${(r.bytesFreed / 1024 / 1024 / 1024).toFixed(2)} GB`
        : `Removed “${disc?.title ?? "disc"}” from the library`;
      try {
        sessionStorage.setItem("lib_toast", note);
      } catch {/* private mode → just navigate */}
      nav("/library");
    } catch (e) {
      setDeleteErr(e instanceof Error ? e.message : "Remove failed — please try again.");
      setDeleting(false);
    }
  }

  async function handleExport() {
    if (!disc || exporting) return;
    setExporting(true);
    setExportMsg(null);
    const defaultName = `${disc.title} — Heirvo Archive.html`;
    try {
      // Try the native Tauri save dialog first.
      const dialog = await import("@tauri-apps/plugin-dialog");
      const target = await dialog.save({
        defaultPath: defaultName,
        filters: [{ name: "HTML", extensions: ["html"] }],
      });
      if (!target) {
        setExporting(false);
        return;
      }
      const bytes = await ipc.library.exportHtml(disc.id, target);
      const kb = Math.max(1, Math.round(bytes / 1024));
      setExportMsg(`Saved · ${kb.toLocaleString()} KB`);
    } catch {
      // Dev mode without Tauri shell — fall back to a data-URL download
      // produced from the same TS template as the Rust side.
      try {
        const html = renderDiscHtmlBrowser(disc);
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = defaultName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setExportMsg("Downloaded");
      } catch {
        setExportMsg("Export failed");
      }
    } finally {
      setExporting(false);
      setTimeout(() => setExportMsg(null), 4000);
    }
  }
  useEffect(() => {
    let cancelled = false;
    if (!discId) {
      setDisc(undefined);
      return;
    }
    setDisc(getDiscById(discId));
    (async () => {
      try {
        const real = await ipc.library.get(discId);
        if (!cancelled && real) setDisc(real);
      } catch {
        // mock fallback already shown
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [discId]);

  const isPhoto = disc?.mediaType === "photo";
  const isAudio = disc?.mediaType === "audio";
  const isDocument = disc?.mediaType === "document";
  const isPhotoSet = !!disc?.photos?.length;
  // True only for a video memory with chapters + a spoken transcript — the only
  // case where the Chapters / Full-transcript sections make sense.
  const hasVideoContent = !!disc && !isPhoto && !isAudio && !isDocument;

  if (!disc) {
    return (
      <div className="lib-root">
        <div className="lib-container" style={{ padding: "64px 32px" }}>
          <p style={{ color: "var(--lib-muted)" }}>Disc not found.</p>
          <Link to="/library" style={{ color: "var(--lib-amber)" }}>
            Back to library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="lib-root">
      <div className="lib-container">
        <button
          type="button"
          onClick={() => nav(-1)}
          style={{
            background: "transparent",
            border: 0,
            color: "var(--lib-ink-2)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            fontFamily: "var(--lib-sans)",
            fontSize: 13,
            padding: "20px 0 0",
          }}
        >
          <ChevronLeft size={14} /> Library
        </button>

        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "relative",
              minHeight: 520,
              display: "grid",
              gridTemplateColumns: "360px 1fr",
              gap: 48,
              padding: "48px 0",
              alignItems: "center",
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: "0 -100vw",
                background: `linear-gradient(180deg, var(--lib-paper) 0%, transparent 8%, transparent 92%, var(--lib-paper) 100%), linear-gradient(180deg, rgba(248,244,236,0) 0%, rgba(248,244,236,.7) 60%, var(--lib-paper) 100%), ${gradientCss(disc.gradient)}`,
                zIndex: -1,
              }}
            />

            <div
              style={{
                width: "100%",
                aspectRatio: "3/4",
                borderRadius: 14,
                boxShadow:
                  "0 30px 80px rgba(40,20,10,.35), 0 5px 12px rgba(40,20,10,.18)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <GradientArt
                gradient={disc.gradient}
                style={{ position: "absolute", inset: 0 }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 24,
                  right: 24,
                  bottom: 30,
                  fontFamily: "var(--lib-serif)",
                  fontWeight: 500,
                  color: "#FBF7EE",
                  fontSize: 24,
                  lineHeight: 1.15,
                  letterSpacing: "-0.01em",
                  textShadow: "0 2px 12px rgba(0,0,0,.4)",
                }}
              >
                {disc.title}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 24,
                  bottom: 14,
                  fontFamily: "var(--lib-serif)",
                  fontStyle: "italic",
                  color: "rgba(251,247,238,.8)",
                  fontSize: 13,
                }}
              >
                {disc.year} · {disc.location ?? ""}
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 11.5,
                  color: "var(--lib-muted)",
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Monogram id={disc.monogramId} letter={disc.title[0]} size={22} />
                {disc.source} · recovered {disc.recoveredAt} · {disc.durationFormatted}
              </div>
              <h1
                style={{
                  fontFamily: "var(--lib-serif)",
                  fontWeight: 400,
                  fontSize: "clamp(38px, 4.5vw, 58px)",
                  letterSpacing: "-0.025em",
                  lineHeight: 1.04,
                  margin: "14px 0",
                  color: "var(--lib-ink)",
                }}
              >
                {disc.title}
              </h1>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  fontSize: 13.5,
                  color: "var(--lib-ink-2)",
                  marginBottom: 24,
                  flexWrap: "wrap",
                }}
              >
                {hasVideoContent ? (
                  <>
                    <span className="lib-pill">{disc.scenes.length} chapters</span>
                    <span>{disc.year}</span>
                    <span className="lib-bullet" />
                    <span>{disc.people.length} people identified</span>
                    <span className="lib-bullet" />
                    <span>{disc.phrasesIndexed.toLocaleString()} phrases</span>
                  </>
                ) : (
                  <>
                    <span className="lib-pill">
                      {isPhotoSet
                        ? `${disc.photos!.length} photos`
                        : isPhoto
                        ? "Photo"
                        : isAudio
                        ? "Audio"
                        : "Files"}
                    </span>
                    <span>{disc.year}</span>
                    <span className="lib-bullet" />
                    <span>{disc.source}</span>
                  </>
                )}
              </div>
              {disc.about && (
                <>
                  <div
                    style={{
                      fontFamily: "var(--lib-serif)",
                      fontStyle: "italic",
                      fontSize: 14,
                      color: "var(--lib-amber)",
                      marginBottom: 4,
                    }}
                  >
                    About this memory
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      lineHeight: 1.6,
                      color: "var(--lib-ink-2)",
                      maxWidth: 560,
                      marginBottom: 28,
                    }}
                  >
                    {disc.about}
                  </div>
                </>
              )}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {/* For audio / document discs with a recovered file path, reveal
                    directly in the OS file manager instead of navigating to Watch.
                    When no path exists, fall back to the Watch screen which shows
                    the warm "saved to your computer" message. */}
                {(isAudio || isDocument) && disc.videoPath ? (
                  <button
                    type="button"
                    className="lib-btn lib-btn-primary"
                    onClick={() => { void handleRevealInFolder(); }}
                  >
                    {isAudio ? (
                      <>
                        <Music size={14} />
                        Open music
                      </>
                    ) : (
                      <>
                        <FileText size={14} />
                        Open files
                      </>
                    )}
                  </button>
                ) : (
                <Link to={`/watch/${disc.id}`} className="lib-btn lib-btn-primary">
                  {hasVideoContent ? (
                    <>
                      <Play size={14} fill="currentColor" stroke="none" />
                      Play from start
                    </>
                  ) : isPhotoSet ? (
                    <>
                      <Images size={14} />
                      View {disc.photos!.length} photos
                    </>
                  ) : isPhoto ? (
                    <>
                      <Images size={14} />
                      View photo
                    </>
                  ) : isAudio ? (
                    <>
                      <Music size={14} />
                      Open music
                    </>
                  ) : (
                    <>
                      <FileText size={14} />
                      Open files
                    </>
                  )}
                </Link>
                )}
                <button
                  type="button"
                  className="lib-btn lib-btn-ghost"
                  onClick={handleExport}
                  disabled={exporting}
                  title="Export a single, searchable HTML file you can open in any browser, forever."
                >
                  <Download size={14} />
                  {exporting ? "Exporting…" : "Export this archive"}
                </button>
                {exportMsg && (
                  <span
                    role="status"
                    style={{
                      alignSelf: "center",
                      fontSize: 12.5,
                      color: "var(--lib-amber)",
                      fontFamily: "var(--lib-sans)",
                      fontWeight: 500,
                    }}
                  >
                    {exportMsg}
                  </span>
                )}
                <button
                  type="button"
                  className="lib-btn lib-btn-ghost"
                  onClick={() => setShareOpen(true)}
                >
                  <Share2 size={14} />
                  Share with family
                </button>
                <button
                  type="button"
                  className="lib-btn lib-btn-ghost"
                  onClick={() => setDeleteOpen(true)}
                  title="Remove this disc from your library"
                  style={{ color: "var(--lib-amber, #b45309)" }}
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
              {activeJob &&
                activeJob.status !== "complete" &&
                activeJob.status !== "cancelled" && (
                  <div
                    style={{
                      marginTop: 18,
                      padding: "10px 14px",
                      borderRadius: 10,
                      border:
                        activeJob.status === "error"
                          ? "1px solid #E8B0A6"
                          : "1px solid var(--lib-line)",
                      background:
                        activeJob.status === "error" ? "#FFF1EC" : "#FFFDF7",
                      maxWidth: 560,
                      fontFamily: "var(--lib-sans)",
                      fontSize: 12.5,
                      color: "var(--lib-ink-2)",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    {activeJob.status === "queued" && (
                      <>
                        <span style={{ fontWeight: 600 }}>
                          Queued for transcription
                        </span>
                        <span style={{ color: "var(--lib-muted)" }}>
                          Will start automatically
                        </span>
                      </>
                    )}
                    {(activeJob.status === "extracting" ||
                      activeJob.status === "transcribing") && (
                      <>
                        <span style={{ fontWeight: 600 }}>
                          {activeJob.status === "extracting"
                            ? "Extracting audio…"
                            : `Transcribing… ${Math.round(activeJob.progress * 100)}%`}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: 4,
                            borderRadius: 2,
                            background: "var(--lib-paper-2)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.round(activeJob.progress * 100)}%`,
                              height: "100%",
                              background: "var(--lib-amber)",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                      </>
                    )}
                    {activeJob.status === "error" && (
                      <>
                        <span style={{ fontWeight: 600, color: "#B5483A" }}>
                          Transcription failed
                        </span>
                        <button
                          type="button"
                          onClick={retryTranscription}
                          style={{
                            marginLeft: "auto",
                            border: "1px solid var(--lib-line)",
                            background: "#fff",
                            borderRadius: 6,
                            padding: "3px 10px",
                            fontSize: 12,
                            cursor: "pointer",
                            color: "var(--lib-ink-2)",
                            fontFamily: "var(--lib-sans)",
                          }}
                        >
                          Retry
                        </button>
                      </>
                    )}
                  </div>
                )}
              {activeJob && activeJob.status === "complete" && (
                <div
                  style={{
                    marginTop: 14,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 99,
                    background: "#F1F7EC",
                    color: "#3D6B2D",
                    fontFamily: "var(--lib-sans)",
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}
                >
                  ✓ Transcribed
                </div>
              )}
            </div>
          </div>
        </div>

        {hasVideoContent && (
        <div style={{ marginTop: 64 }}>
          <h2
            style={{
              fontFamily: "var(--lib-serif)",
              fontWeight: 500,
              fontSize: 24,
              letterSpacing: "-0.015em",
              margin: "0 0 20px",
              color: "var(--lib-ink)",
            }}
          >
            Chapters
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 18,
            }}
            className="lib-chapters-grid"
          >
            {disc.scenes.map((scene, i) => (
              <Link
                key={scene.time + scene.title}
                to={`/watch/${disc.id}?t=${scene.time}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <GradientArt
                  gradient={disc.gradient}
                  style={{
                    width: "100%",
                    aspectRatio: "16 / 10",
                    borderRadius: 10,
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: "var(--lib-shadow-soft)",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      fontFamily: "var(--lib-serif)",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "rgba(255,255,255,.9)",
                      background: "rgba(0,0,0,.35)",
                      padding: "2px 8px",
                      borderRadius: 99,
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    style={{
                      position: "absolute",
                      bottom: 8,
                      right: 8,
                      background: "rgba(0,0,0,.55)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 7px",
                      borderRadius: 5,
                    }}
                  >
                    {scene.time}
                  </span>
                </GradientArt>
                <div
                  style={{
                    fontFamily: "var(--lib-serif)",
                    fontWeight: 500,
                    fontSize: 15,
                    letterSpacing: "-0.01em",
                    margin: "10px 2px 3px",
                    color: "var(--lib-ink)",
                  }}
                >
                  {scene.title}
                </div>
                {scene.description && (
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "var(--lib-muted)",
                      lineHeight: 1.4,
                      margin: "0 2px",
                    }}
                  >
                    {scene.description}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
        )}

        {hasVideoContent && (
        <div
          style={{
            marginTop: 64,
            paddingBottom: 80,
            display: "grid",
            gridTemplateColumns: "1fr 280px",
            gap: 48,
          }}
          className="lib-disc-transcript"
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--lib-serif)",
                fontWeight: 500,
                fontSize: 24,
                letterSpacing: "-0.015em",
                margin: "0 0 8px",
                color: "var(--lib-ink)",
              }}
            >
              Full transcript
            </h2>
            <div style={{ color: "var(--lib-muted)", fontSize: 13.5, marginBottom: 24 }}>
              Transcribed locally · {disc.people.length} speakers identified ·{" "}
              {disc.phrasesIndexed.toLocaleString()} phrases
            </div>
            <div className="lib-prose">
              {disc.transcript.map((line) => (
                <p
                  key={`${line.timeSec}-${line.text.slice(0, 12)}`}
                  style={{
                    fontFamily: "var(--lib-serif)",
                    fontWeight: 300,
                    fontSize: 18,
                    lineHeight: 1.7,
                    color: "var(--lib-ink)",
                    margin: "0 0 18px",
                    maxWidth: 680,
                  }}
                >
                  {!line.isStageDirection && line.speaker && (
                    <span
                      style={{
                        display: "block",
                        fontFamily: "var(--lib-sans)",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: ".08em",
                        textTransform: "uppercase",
                        color: "var(--lib-amber)",
                        marginBottom: 6,
                      }}
                    >
                      {line.speaker}{" "}
                      <Link
                        to={`/watch/${disc.id}?t=${line.time}`}
                        style={{
                          fontFamily: "var(--lib-sans)",
                          fontSize: 11,
                          color: "var(--lib-muted)",
                          fontVariantNumeric: "tabular-nums",
                          marginLeft: 6,
                          textDecoration: "none",
                        }}
                      >
                        {line.time}
                      </Link>
                    </span>
                  )}
                  {line.isStageDirection ? (
                    <em style={{ color: "var(--lib-muted)", fontStyle: "italic" }}>
                      {line.text}
                    </em>
                  ) : (
                    line.text
                  )}
                </p>
              ))}
            </div>
          </div>

          <aside
            style={{
              borderLeft: "1px solid var(--lib-line)",
              paddingLeft: 32,
            }}
            className="lib-sidekick"
          >
            <h3
              style={{
                fontFamily: "var(--lib-serif)",
                fontWeight: 500,
                fontSize: 16,
                letterSpacing: "-0.01em",
                margin: "0 0 12px",
                color: "var(--lib-ink)",
              }}
            >
              People in this disc
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {disc.people.map((p, i) => (
                <span
                  key={p.name}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#fff",
                    border: "1px solid var(--lib-line)",
                    padding: "5px 11px 5px 5px",
                    borderRadius: 99,
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: "var(--lib-ink)",
                  }}
                >
                  <Monogram
                    id={(((i % 8) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8)}
                    letter={p.initials}
                    size={22}
                  />
                  {p.name}
                </span>
              ))}
            </div>

            <h3
              style={{
                fontFamily: "var(--lib-serif)",
                fontWeight: 500,
                fontSize: 16,
                letterSpacing: "-0.01em",
                margin: "0 0 12px",
                color: "var(--lib-ink)",
              }}
            >
              Tags &amp; topics
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {disc.topics.map((t) => (
                <span
                  key={t.label}
                  style={{
                    fontSize: 11.5,
                    color: "var(--lib-ink-2)",
                    background: "var(--lib-paper-2)",
                    padding: "4px 9px",
                    borderRadius: 6,
                    fontWeight: 500,
                  }}
                >
                  {t.label}
                  <span style={{ color: "var(--lib-muted)", marginLeft: 4 }}>
                    {t.count}
                  </span>
                </span>
              ))}
            </div>
          </aside>
        </div>
        )}
      </div>

      {/* Remove-from-library confirm modal */}
      {deleteOpen && disc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-disc-title"
        >
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl p-6">
            <h3
              id="delete-disc-title"
              className="font-display text-[18px] font-bold tracking-[-0.01em] text-ink-900"
            >
              Remove “{disc.title}” from your library?
            </h3>
            <p className="mt-2 text-[13.5px] leading-[1.55] text-ink-600">
              The disc entry, transcript, and any vault copy of the imported
              file will be deleted from this device. <span className="font-medium text-ink-900">
              Your original disc and any source file outside the vault are untouched.</span>
            </p>
            {deleteErr && (
              <p className="mt-3 text-[12.5px] text-ios-red">{deleteErr}</p>
            )}
            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setDeleteOpen(false); setDeleteErr(null); }}
                disabled={deleting}
                className="rounded-xl border border-ink-200 px-4 py-2 text-[13px] font-medium text-ink-700 transition hover:bg-ink-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="rounded-xl bg-ios-red px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                {deleting ? "Removing…" : "Remove from library"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share with family modal */}
      {shareOpen && disc && (
        <ShareModal
          disc={disc}
          onExport={() => { setShareOpen(false); handleExport(); }}
          onClose={() => setShareOpen(false)}
          copied={copied}
          onCopy={() => {
            const msg = [
              `I recovered "${disc.title}" from an old ${disc.source} using Heirvo.`,
              ``,
              `I'm sharing it as a single HTML file — open it in any browser to watch the video and read the full searchable transcript. No account needed.`,
              ``,
              `(Made with Heirvo · heirvo.com)`,
            ].join("\n");
            navigator.clipboard.writeText(msg).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            });
          }}
        />
      )}
    </div>
  );
}

// ─── Share modal ──────────────────────────────────────────────────────────────

function ShareModal({
  disc,
  onExport,
  onClose,
  copied,
  onCopy,
}: {
  disc: import("./data/types").Disc;
  onExport: () => void;
  onClose: () => void;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(30,20,10,0.55)",
        backdropFilter: "blur(6px)",
        padding: 24,
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share with family"
    >
      <div
        style={{
          background: "var(--lib-paper)",
          borderRadius: 20,
          width: "100%",
          maxWidth: 440,
          padding: "32px 28px",
          boxShadow: "0 32px 80px rgba(30,20,10,0.30)",
          border: "1px solid var(--lib-line)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "transparent",
            border: 0,
            cursor: "pointer",
            color: "var(--lib-muted)",
            fontSize: 20,
            lineHeight: 1,
            padding: 4,
          }}
          aria-label="Close"
        >
          ×
        </button>

        <h2
          style={{
            fontFamily: "var(--lib-serif)",
            fontWeight: 500,
            fontSize: 22,
            letterSpacing: "-0.015em",
            color: "var(--lib-ink)",
            margin: "0 0 6px",
          }}
        >
          Share with family
        </h2>
        <p
          style={{
            fontFamily: "var(--lib-sans)",
            fontSize: 13.5,
            color: "var(--lib-ink-2)",
            lineHeight: 1.5,
            margin: "0 0 24px",
          }}
        >
          Send <em>{disc.title}</em> to siblings or parents — they can open it
          in any browser with no account, no app, and no cloud storage.
        </p>

        {/* Option 1 — export HTML */}
        <button
          type="button"
          onClick={onExport}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            width: "100%",
            background: "rgba(0,0,0,0.03)",
            border: "1px solid var(--lib-line)",
            borderRadius: 12,
            padding: "14px 16px",
            cursor: "pointer",
            marginBottom: 10,
            textAlign: "left",
          }}
        >
          <Download size={18} style={{ color: "var(--lib-amber)", flexShrink: 0, marginTop: 1 }} />
          <div>
            <div
              style={{
                fontFamily: "var(--lib-sans)",
                fontWeight: 600,
                fontSize: 13.5,
                color: "var(--lib-ink)",
                marginBottom: 2,
              }}
            >
              Export standalone page
            </div>
            <div style={{ fontFamily: "var(--lib-sans)", fontSize: 12.5, color: "var(--lib-muted)", lineHeight: 1.45 }}>
              One self-contained HTML file. They can open it in Chrome, Safari,
              or Edge — offline, forever.
            </div>
          </div>
        </button>

        {/* Option 2 — copy message */}
        <button
          type="button"
          onClick={onCopy}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            width: "100%",
            background: copied ? "rgba(52,199,89,0.07)" : "rgba(0,0,0,0.03)",
            border: `1px solid ${copied ? "rgba(52,199,89,0.35)" : "var(--lib-line)"}`,
            borderRadius: 12,
            padding: "14px 16px",
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.2s",
          }}
        >
          <Share2 size={18} style={{ color: copied ? "#34C759" : "var(--lib-amber)", flexShrink: 0, marginTop: 1 }} />
          <div>
            <div
              style={{
                fontFamily: "var(--lib-sans)",
                fontWeight: 600,
                fontSize: 13.5,
                color: "var(--lib-ink)",
                marginBottom: 2,
              }}
            >
              {copied ? "Message copied!" : "Copy a share message"}
            </div>
            <div style={{ fontFamily: "var(--lib-sans)", fontSize: 12.5, color: "var(--lib-muted)", lineHeight: 1.45 }}>
              Paste into email, WhatsApp, or iMessage — explains what the file
              is and how to open it.
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
