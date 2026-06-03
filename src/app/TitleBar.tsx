import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, Copy, X } from "lucide-react";

/**
 * Custom frameless title bar.
 *
 * The native Windows chrome is disabled (`decorations: false`), so the app owns
 * the whole window — the warm canvas bleeds to the very top edge and the sidebar
 * logo is the sole brand mark (no duplicate OS icon/title).
 *
 * Layout: a flex-1 draggable spacer (`data-tauri-drag-region` — drag to move,
 * double-click to maximize) plus three slim window controls on the right. The
 * controls are siblings OUTSIDE the drag region so their clicks register. All
 * colors come from theme tokens, so it matches both warm-dark and warm-paper.
 */
const TITLEBAR_HEIGHT = 34;

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const win = getCurrentWindow();
    let unlisten: (() => void) | undefined;
    win.isMaximized().then(setMaximized).catch(() => {});
    win
      .onResized(() => {
        win.isMaximized().then(setMaximized).catch(() => {});
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});
    return () => unlisten?.();
  }, []);

  const win = getCurrentWindow();

  return (
    <div
      style={{
        height: TITLEBAR_HEIGHT,
        flexShrink: 0,
        display: "flex",
        alignItems: "stretch",
        background: "transparent",
        position: "relative",
        zIndex: 50,
        userSelect: "none",
      }}
    >
      {/* Draggable region — move the window; double-click toggles maximize. */}
      <div data-tauri-drag-region style={{ flex: 1, height: "100%" }} />

      {/* Window controls — siblings of the drag region, so clicks register. */}
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <WinButton label="Minimize" onClick={() => win.minimize().catch(() => {})}>
          <Minus size={15} strokeWidth={2} />
        </WinButton>
        <WinButton
          label={maximized ? "Restore" : "Maximize"}
          onClick={() => win.toggleMaximize().catch(() => {})}
        >
          {maximized ? <Copy size={12} strokeWidth={2} /> : <Square size={12} strokeWidth={2} />}
        </WinButton>
        <WinButton label="Close" danger onClick={() => win.close().catch(() => {})}>
          <X size={16} strokeWidth={2} />
        </WinButton>
      </div>
    </div>
  );
}

function WinButton({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 46,
        height: "100%",
        display: "grid",
        placeItems: "center",
        border: "none",
        cursor: "default",
        background: hover
          ? danger
            ? "var(--db-red)"
            : "color-mix(in srgb, var(--db-text) 12%, transparent)"
          : "transparent",
        color: hover && danger ? "#FFF8EE" : "var(--db-text-muted)",
        transition: "background 120ms ease, color 120ms ease",
      }}
    >
      {children}
    </button>
  );
}
