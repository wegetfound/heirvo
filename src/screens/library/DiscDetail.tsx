import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronLeft, Play, Download, Share2 } from "lucide-react";
import { getDiscById } from "./data/mockDiscs";
import type { Disc } from "./data/types";
import { GradientArt, gradientCss } from "./components/GradientArt";
import { Monogram } from "./components/Monogram";
import { ipc } from "../../lib/ipc";
import { renderDiscHtmlBrowser } from "./data/htmlExport";

export default function DiscDetail() {
  const { discId } = useParams<{ discId: string }>();
  const nav = useNavigate();
  const [disc, setDisc] = useState<Disc | undefined>(() =>
    discId ? getDiscById(discId) : undefined,
  );
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

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
                <span className="lib-pill">{disc.scenes.length} chapters</span>
                <span>{disc.year}</span>
                <span className="lib-bullet" />
                <span>{disc.people.length} people identified</span>
                <span className="lib-bullet" />
                <span>{disc.phrasesIndexed.toLocaleString()} phrases</span>
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
                <Link to={`/watch/${disc.id}`} className="lib-btn lib-btn-primary">
                  <Play size={14} fill="currentColor" stroke="none" />
                  Play from start
                </Link>
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
                <button type="button" className="lib-btn lib-btn-ghost">
                  <Share2 size={14} />
                  Share with family
                </button>
              </div>
            </div>
          </div>
        </div>

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
      </div>
    </div>
  );
}
