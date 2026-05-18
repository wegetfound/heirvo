interface Props {
  size?: number;
  className?: string;
}

/**
 * Heirvo brand mark — the v1.1.0 disc-with-arrow icon that ships in the
 * desktop app, NSIS installer, and Windows taskbar. Single source of truth
 * for the visual brand: `marketing/public/brand/mark.png` (256×256, mirrored
 * from `src-tauri/icons/128x128@2x.png`).
 *
 * Renders as a plain <img>. No gradient wrapper, no shadow — the artwork
 * already has its own ground and depth. Adding chrome makes it look like
 * a button.
 */
export function BrandMark({ size = 36, className = "" }: Props) {
  return (
    <img
      src="/brand/mark.png"
      width={size}
      height={size}
      alt="Heirvo"
      decoding="async"
      loading="eager"
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
      }}
    />
  );
}
