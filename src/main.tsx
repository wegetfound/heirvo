import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import { initTheme } from "./lib/theme";
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
