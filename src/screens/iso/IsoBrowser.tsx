import { useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { FileText, FolderOpen, AlertTriangle, Loader2, ScanSearch, Image, Film, FileType, FileArchive, Music } from "lucide-react";
import { ipc } from "@/lib/ipc";

type IsoEntry = {
  path: string;
  sizeBytes: number;
  startLba: number;
  isDamaged: boolean;
};

type IsoResult = {
  path: string;
  totalSectors: number;
  fileCount: number;
  usedUdf: boolean;
  entries: IsoEntry[];
};

type SigHit = {
  file_type: string;
  start_lba: number;
  extension: string;
};

type SigResult = {
  hits: SigHit[];
  damagedSectors: number;
  totalSectors: number;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

const FILE_TYPE_LABELS: Record<string, string> = {
  jpeg: "JPEG image",
  png: "PNG image",
  mp4: "MP4 / MOV video",
  avi: "AVI video",
  wav: "WAV audio",
  zip: "ZIP / Office doc",
  pdf: "PDF document",
  bmp: "BMP image",
  tiff: "TIFF image",
  gif: "GIF image",
  iso9660: "ISO 9660 volume",
  udf_avdp: "UDF anchor",
  unknown: "Unknown",
};

function fileTypeIcon(ft: string) {
  if (ft === "jpeg" || ft === "png" || ft === "bmp" || ft === "tiff" || ft === "gif")
    return <Image className="h-3.5 w-3.5 text-blue-500" />;
  if (ft === "mp4" || ft === "avi")
    return <Film className="h-3.5 w-3.5 text-purple-500" />;
  if (ft === "wav")
    return <Music className="h-3.5 w-3.5 text-pink-500" />;
  if (ft === "zip")
    return <FileArchive className="h-3.5 w-3.5 text-amber-500" />;
  if (ft === "pdf")
    return <FileType className="h-3.5 w-3.5 text-red-500" />;
  return <FileText className="h-3.5 w-3.5 text-ink-400" />;
}

export default function IsoBrowser() {
  const [result, setResult] = useState<IsoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sigResult, setSigResult] = useState<SigResult | null>(null);
  const [sigLoading, setSigLoading] = useState(false);
  const [sigError, setSigError] = useState<string | null>(null);
  const [sigExpanded, setSigExpanded] = useState(false);

  const currentPath = result?.path ?? null;

  const pickAndOpen = async () => {
    setError(null);
    setSigResult(null);
    setSigError(null);
    const picked = await openDialog({
      multiple: false,
      title: "Open ISO file",
      filters: [{ name: "Disc image", extensions: ["iso", "img", "bin"] }],
    });
    if (typeof picked !== "string") return;

    setLoading(true);
    setResult(null);
    try {
      const res = await ipc.listFilesInIso(picked);
      setResult(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const runSigScan = async () => {
    if (!currentPath) return;
    setSigError(null);
    setSigResult(null);
    setSigLoading(true);
    try {
      const res = await ipc.scanIsoSignatures(currentPath);
      setSigResult(res);
      setSigExpanded(true);
    } catch (e) {
      setSigError(String(e));
    } finally {
      setSigLoading(false);
    }
  };

  // Group sig hits by file type for summary display
  const sigGroups = sigResult
    ? sigResult.hits.reduce<Record<string, SigHit[]>>((acc, h) => {
        (acc[h.file_type] ??= []).push(h);
        return acc;
      }, {})
    : null;

  const SIG_DISPLAY_LIMIT = 200;

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-2 font-display text-[2rem] font-semibold tracking-[-0.02em] text-ink-900">
        Browse ISO file
      </h1>
      <p className="mb-6 max-w-2xl text-[15px] leading-[1.55] text-ink-600">
        Open a local <code className="rounded bg-ink-100 px-1.5 py-0.5 text-[13px]">.iso</code> file
        and see every file inside — without involving a physical drive. Useful for
        already-recovered disc images, ddrescue dumps, or anything you've got on disk.
      </p>

      <button
        onClick={pickAndOpen}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-[14px] font-medium text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}
        {loading ? "Reading…" : "Open ISO…"}
      </button>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">Couldn't read this image.</div>
            <div className="font-mono text-[12px] opacity-80">{error}</div>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          {/* Summary bar */}
          <div className="rounded-xl border border-ink-200 bg-white p-4">
            <div className="font-mono text-[12px] text-ink-500 break-all">{result.path}</div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-ink-700">
              <span><strong>{result.fileCount}</strong> files</span>
              <span><strong>{result.totalSectors.toLocaleString()}</strong> sectors</span>
              <span>
                Parsed via{" "}
                <span className={
                  result.usedUdf
                    ? "rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800"
                    : "rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800"
                }>
                  {result.usedUdf ? "UDF" : "ISO 9660 fallback"}
                </span>
              </span>
            </div>
          </div>

          {/* File table or empty state */}
          {result.entries.length === 0 ? (
            <div className="rounded-xl border border-ink-200 bg-ink-50 p-6 text-center">
              <p className="text-[14px] text-ink-500 mb-4">
                No files found via filesystem walk. The directory tree may be damaged.
              </p>
              <button
                onClick={runSigScan}
                disabled={sigLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-[14px] font-medium text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
              >
                {sigLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
                {sigLoading ? "Scanning raw sectors…" : "Scan for recoverable files"}
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
              <table className="w-full text-[13px]">
                <thead className="bg-ink-50 text-left text-[11px] uppercase tracking-wider text-ink-500">
                  <tr>
                    <th className="px-4 py-2">Path</th>
                    <th className="px-4 py-2 text-right">Size</th>
                    <th className="px-4 py-2 text-right">LBA</th>
                  </tr>
                </thead>
                <tbody>
                  {result.entries.map((e, i) => (
                    <tr
                      key={i}
                      className={
                        "border-t border-ink-100 " +
                        (e.isDamaged ? "bg-red-50/50" : "hover:bg-ink-50/60")
                      }
                    >
                      <td className="px-4 py-2 font-mono text-[12px]">
                        <span className="inline-flex items-center gap-2">
                          {e.isDamaged ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                          ) : (
                            <FileText className="h-3.5 w-3.5 text-ink-400" />
                          )}
                          {e.path}
                          {e.isDamaged && (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                              damaged
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-ink-600">
                        {e.isDamaged ? "—" : formatBytes(e.sizeBytes)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-mono text-[12px] text-ink-500">
                        {e.startLba.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signature scan — always available as secondary action */}
          {result.entries.length > 0 && (
            <div className="rounded-xl border border-ink-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-semibold text-ink-900">Signature scan</div>
                  <div className="mt-0.5 text-[12px] text-ink-500">
                    Sweeps raw sectors for JPEG, PNG, MP4, PDF, ZIP and other formats —
                    finds files that survive even when the directory tree is gone.
                  </div>
                </div>
                <button
                  onClick={runSigScan}
                  disabled={sigLoading}
                  className="ml-4 inline-flex shrink-0 items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-[13px] font-medium text-ink-700 transition hover:bg-ink-100 disabled:opacity-60"
                >
                  {sigLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanSearch className="h-3.5 w-3.5" />}
                  {sigLoading ? "Scanning…" : sigResult ? "Re-scan" : "Run scan"}
                </button>
              </div>
            </div>
          )}

          {/* Sig scan error */}
          {sigError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-medium">Signature scan failed.</div>
                <div className="font-mono text-[12px] opacity-80">{sigError}</div>
              </div>
            </div>
          )}

          {/* Sig scan results */}
          {sigResult && sigGroups && (
            <div className="rounded-xl border border-ink-200 bg-white">
              <button
                onClick={() => setSigExpanded((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div className="text-[13px] font-semibold text-ink-900">
                  Signature scan — {sigResult.hits.length} hits
                  {sigResult.damagedSectors > 0 && (
                    <span className="ml-2 text-[11px] font-normal text-ink-500">
                      ({sigResult.damagedSectors.toLocaleString()} unreadable sectors)
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {Object.entries(sigGroups)
                    .filter(([ft]) => ft !== "iso9660" && ft !== "udf_avdp")
                    .slice(0, 5)
                    .map(([ft, hits]) => (
                      <span key={ft} className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-700">
                        {hits.length} {ft.toUpperCase()}
                      </span>
                    ))}
                </div>
              </button>

              {sigExpanded && (
                <div className="border-t border-ink-100">
                  {/* Group summary */}
                  <div className="flex flex-wrap gap-2 px-4 py-3 bg-ink-50/60">
                    {Object.entries(sigGroups).map(([ft, hits]) => (
                      <span key={ft} className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[12px] text-ink-700">
                        {fileTypeIcon(ft)}
                        <span className="font-medium">{hits.length}</span>
                        <span className="text-ink-500">{FILE_TYPE_LABELS[ft] ?? ft}</span>
                      </span>
                    ))}
                  </div>

                  {/* Hit table */}
                  <table className="w-full text-[12px]">
                    <thead className="bg-ink-50 text-left text-[11px] uppercase tracking-wider text-ink-500">
                      <tr>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2 text-right">LBA</th>
                        <th className="px-4 py-2">Extension</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sigResult.hits.slice(0, SIG_DISPLAY_LIMIT).map((h, i) => (
                        <tr key={i} className="border-t border-ink-100 hover:bg-ink-50/60">
                          <td className="px-4 py-1.5">
                            <span className="inline-flex items-center gap-1.5">
                              {fileTypeIcon(h.file_type)}
                              <span className="text-ink-700">{FILE_TYPE_LABELS[h.file_type] ?? h.file_type}</span>
                            </span>
                          </td>
                          <td className="px-4 py-1.5 text-right tabular-nums font-mono text-ink-500">
                            {h.start_lba.toLocaleString()}
                          </td>
                          <td className="px-4 py-1.5 font-mono text-ink-500">.{h.extension}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sigResult.hits.length > SIG_DISPLAY_LIMIT && (
                    <div className="px-4 py-3 text-[12px] text-ink-500 text-center border-t border-ink-100">
                      Showing first {SIG_DISPLAY_LIMIT} of {sigResult.hits.length} hits
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
