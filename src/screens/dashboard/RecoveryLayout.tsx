import React from "react";

/**
 * 2-col grid shell for the recovery screen.
 * Lifted from OutputPanel so neither Dashboard nor OutputPanel
 * needs to pass a `header` prop across the tree.
 *
 * Left slot dims when !saveReady (action stack not yet available).
 * Right slot (ProgressWheel) is NEVER dimmed — it holds Pause/Cancel.
 */
export function RecoveryLayout({
  leftSlot,
  rightSlot,
  saveReady,
  bottomBlock,
}: {
  leftSlot: React.ReactNode;
  rightSlot: React.ReactNode;
  saveReady: boolean;
  bottomBlock: React.ReactNode;
}) {
  const dimStyle: React.CSSProperties = !saveReady
    ? { opacity: 0.4, filter: "saturate(0.65)", pointerEvents: "none", transition: "opacity 0.4s ease, filter 0.4s ease" }
    : { opacity: 1, filter: "none", transition: "opacity 0.4s ease, filter 0.4s ease" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* TOP FRAME: 2-col grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        gap: 16,
        alignItems: "stretch",
      }}>
        {/* LEFT: dims when !saveReady */}
        <div style={saveReady ? {} : dimStyle}>
          {leftSlot}
        </div>

        {/* RIGHT: wheel — NEVER dimmed */}
        {rightSlot}
      </div>

      {/* BOTTOM: alt-grid + results + advanced — dims when !saveReady */}
      <div style={saveReady ? {} : dimStyle}>
        {bottomBlock}
      </div>
    </div>
  );
}
