import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import { initTheme } from "./lib/theme";

// Self-hosted fonts (Fontsource) — bundled into the app, NOT fetched from
// Google. A desktop app pinging fonts.googleapis.com on every launch leaks the
// user's IP to Google and makes first paint depend on the network. These import
// the exact families/weights the UI uses (family names "Inter" / "Fraunces"),
// so rendering is unchanged. Must precede index.css so @font-face is registered
// before the cascade.
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/fraunces/300.css";
import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/700.css";
// Sora is the primary UI family (see index.css), Manrope its fallback.
import "@fontsource/sora/300.css";
import "@fontsource/sora/400.css";
import "@fontsource/sora/500.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";

import "./index.css";

initTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

// ── Load-splash dismissal ────────────────────────────────────────────────────
// The splash markup lives in index.html so it paints before any JS (no cold-start
// flash). Fade it out once the app is ready, with a short minimum hold so it never
// merely blinks on a fast launch. Fast launches stay fast; slow ones stay covered.
(() => {
  const splash = document.getElementById("splash");
  if (!splash) return;
  const MIN_MS = 850;
  const start = performance.now();
  const dismiss = () => {
    const wait = Math.max(0, MIN_MS - (performance.now() - start));
    window.setTimeout(() => {
      splash.classList.add("heirvo-splash-hide");
      window.setTimeout(() => splash.remove(), 520);
    }, wait);
  };
  if (document.readyState === "complete") dismiss();
  else window.addEventListener("load", dismiss, { once: true });
})();
