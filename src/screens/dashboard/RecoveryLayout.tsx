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
  // Dim visually but stay CLICKABLE: the cards inside are designed to explain
  // themselves on click ("ready the moment the read finishes" / "insert a disc
  // to begin"). pointerEvents: "none" here used to make the entire left column
  // dead to clicks, silently defeating that design.
  const dimStyle: React.CSSProperties = !saveReady
    ? { opacity: 0.55, filter: "saturate(0.7)", transition: "opacity 0.4s ease, filter 0.4s ease" }
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
