import { useLocation } from "react-router-dom";
import { TranscodePanel } from "./TranscodePanel";

export function Transcode() {
  // A per-disc "Save as MP4" action navigates here with the disc's file path in
  // router state so the panel opens pre-filled (skips the file picker).
  const loc = useLocation();
  const initialInput = (loc.state as { inputPath?: string } | null)?.inputPath;

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-2 font-display text-[2rem] font-semibold tracking-[-0.02em] text-ink-900">
        Save a video
      </h1>
      <p className="mb-6 max-w-2xl text-[15px] leading-[1.55] text-ink-600">
        Already rescued a disc? Save it as a standard MP4 file you can play on
        any phone, TV, or computer.
      </p>
      <TranscodePanel initialInput={initialInput} />
    </div>
  );
}
