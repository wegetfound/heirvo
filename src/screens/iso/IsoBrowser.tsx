import { useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { FileText, FolderOpen, AlertTriangle, Loader2 } from "lucide-react";
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

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function IsoBrowser() {
  const [result, setResult] = useState<IsoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickAndOpen = async () => {
    setError(null);
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
          <div className="rounded-xl border border-ink-200 bg-white p-4">
            <div className="font-mono text-[12px] text-ink-500 break-all">{result.path}</div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-ink-700">
              <span><strong>{result.fileCount}</strong> files</span>
              <span><strong>{result.totalSectors.toLocaleString()}</strong> sectors</span>
              <span>
                Parsed via{" "}
                <span
                  className={
                    result.usedUdf
                      ? "rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800"
                      : "rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800"
                  }
                >
                  {result.usedUdf ? "UDF" : "ISO 9660 fallback"}
                </span>
              </span>
            </div>
          </div>

          {result.entries.length === 0 ? (
            <div className="rounded-xl border border-ink-200 bg-ink-50 p-6 text-center text-[14px] text-ink-500">
              No files found. The image may be empty or its filesystem is too damaged
              to walk. Try the signature scan (coming soon).
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
        </div>
      )}
    </div>
  );
}
