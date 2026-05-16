import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem("heirvo-theme") as Theme | null;
      return stored === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem("heirvo-theme", theme); } catch { /* private mode */ }
  }, [theme]);

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
    applyTheme(stored === "dark" ? "dark" : "light");
  } catch { /* ignore */ }
}
