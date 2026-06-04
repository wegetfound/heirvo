import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const THEME_EVENT = "heirvo:theme-changed";

function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem("heirvo-theme") as Theme | null;
      // Warm cinematic dark is Heirvo's signature — default to it unless the
      // user explicitly chose light.
      return stored === "light" ? "light" : "dark";
    } catch {
      return "light";
    }
  });

  // Apply to DOM + persist + notify sibling useTheme() instances.
  // React's useState bails out if the value hasn't changed, so the broadcast
  // below terminates naturally: once every instance is in sync, setTheme with
  // the same value is a no-op and no further effects fire.
  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem("heirvo-theme", theme); } catch { /* private mode */ }
    window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
  }, [theme]);

  // Sync when a sibling instance (e.g. Settings toggle) changes the theme.
  useEffect(() => {
    const handler = (e: Event) => {
      setTheme((e as CustomEvent<Theme>).detail);
    };
    window.addEventListener(THEME_EVENT, handler);
    return () => window.removeEventListener(THEME_EVENT, handler);
  }, []);

  const toggle = useCallback(
    () => setTheme((t) => (t === "light" ? "dark" : "light")),
    [],
  );

  return { theme, toggle, isDark: theme === "dark" };
}

/** Call once at app startup to restore the saved theme before first paint. */
export function initTheme() {
  try {
    const stored = localStorage.getItem("heirvo-theme") as Theme | null;
    applyTheme(stored === "light" ? "light" : "dark");
  } catch { /* ignore */ }
}
