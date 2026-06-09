import { Routes, Route, Link, Outlet, useLocation, useNavigate, Navigate } from "react-router-dom";
import { TitleBar } from "./TitleBar";
import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import {
  Home,
  Clapperboard,
  Send,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Dashboard } from "@/screens/dashboard/Dashboard";
import { SessionHistory } from "@/screens/history/SessionHistory";
import { Transcode } from "@/screens/transcode/Transcode";
import { Settings } from "@/screens/settings/Settings";
import Preflight from "@/screens/preflight/Preflight";
import Library from "@/screens/library/Library";
import Memories from "@/screens/library/Memories";
import LibraryAll from "@/screens/library/LibraryAll";
import LibrarySearch from "@/screens/library/Search";
import LibraryWatch from "@/screens/library/Watch";
import LibraryDiscDetail from "@/screens/library/DiscDetail";
import LibraryAlbumDetail from "@/screens/library/AlbumDetail";
import IsoBrowser from "@/screens/iso/IsoBrowser";
// UpdateBanner disabled until signing keypair is generated.
// import UpdateBanner from "@/components/UpdateBanner";
import { ipc, events } from "@/lib/ipc";
import { cn } from "@/lib/cn";
import { prefersReducedMotion } from "@/utils/gsap-fx";
import { useLicense } from "@/lib/useLicense";
import { useRecoveryPromotion } from "@/lib/useRecoveryPromotion";
import { useTheme } from "@/lib/theme";

// ─── constants ────────────────────────────────────────────────────────────────

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const DUR = 0.42;
const W_FULL = 160;   // light persistent / dark revealed
const W_SLIVER = 44;  // dark receded

/** Mail-in lab service landing page (same URL used by Settings' mail-in panels). */
const MAILIN_URL = "https://heirvo.com/recover";

interface NavItemDef {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: React.ComponentType<any>;
  /** Internal route (rendered as a Link). */
  to?: string;
  /** External URL (rendered as a button that opens the browser). */
  href?: string;
  /** Active-state predicate for internal items (covers child routes). */
  match?: (path: string) => boolean;
}

// Four honest destinations: the recovery front door, everything you've saved,
// the mail-in lab service, and settings. "Export" and "Browse ISO" moved into
// context (per-disc action + Settings → Advanced); the cinematic "Memories"
// room folds into "My Discs". Their routes still exist for deep links.
const NAV_ITEMS: NavItemDef[] = [
  {
    to: "/",
    label: "Home",
    Icon: Home,
    match: (p) => p === "/" || p.startsWith("/recover") || p.startsWith("/session"),
  },
  {
    to: "/library/browse",
    label: "My Discs",
    Icon: Clapperboard,
    match: (p) =>
      p.startsWith("/library") ||
      p.startsWith("/disc") ||
      p.startsWith("/watch") ||
      p.startsWith("/album") ||
      p.startsWith("/search") ||
      p.startsWith("/history"),
  },
  { href: MAILIN_URL, label: "Send us", Icon: Send },
  { to: "/settings", label: "Settings", Icon: SettingsIcon, match: (p) => p.startsWith("/settings") },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Scrollable wrapper for all non-Dashboard routes. */
function ScrollLayout() {
  return (
    <div className="flex-1 overflow-y-auto">
      <Outlet />
    </div>
  );
}

// ─── AutoPlayManager ──────────────────────────────────────────────────────────

/**
 * Handles two disc-insertion paths:
 * 1. Cold launch — Windows launched Heirvo via AutoPlay, backend stored the
 *    drive path in `get_pending_disc`. We consume it and navigate straight in.
 * 2. Hot event — Heirvo is already running and a disc goes in while it's open.
 *    We subscribe to `autoplay:open-disc` and navigate when it fires.
 *
 * Both paths are non-fatal: if the IPC command or event subscription fails,
 * the app just stays on whatever screen it was on.
 */
function AutoPlayManager() {
  const nav = useNavigate();

  useEffect(() => {
    let cancelled = false;

    // Cold launch
    ipc.getPendingDisc()
      .then((path) => {
        if (!cancelled && path != null) {
          nav("/recover", { replace: true });
        }
      })
      .catch(() => { /* non-fatal */ });

    // Hot event — disc inserted while already running
    const unlistenPromise = events.onAutoplayOpenDisc(() => {
      if (!cancelled) nav("/recover");
    }).catch(() => undefined as unknown as () => void);

    return () => {
      cancelled = true;
      unlistenPromise.then((unlisten) => unlisten?.());
    };
  // nav is stable — intentionally omit from deps to run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// ─── AutoPlayPrompt ───────────────────────────────────────────────────────────

const AUTOPLAY_PROMPTED_KEY = "heirvo.autoplayPrompted";

/**
 * One-time opt-in prompt for the "open on disc insert" feature.
 * Shown only if: (a) the feature is currently off, AND (b) the user has not
 * yet been asked (localStorage flag not set).
 *
 * Follows the iTunes "ask, don't hijack" pattern — never enables silently.
 */
function AutoPlayPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const alreadyPrompted = localStorage.getItem(AUTOPLAY_PROMPTED_KEY) === "1";
    if (alreadyPrompted) return;

    ipc.autoplayGetEnabled()
      .then((enabled) => {
        if (!enabled) setVisible(true);
      })
      .catch(() => { /* non-fatal — don't show if backend unavailable */ });
  }, []);

  const dismiss = () => {
    localStorage.setItem(AUTOPLAY_PROMPTED_KEY, "1");
    setVisible(false);
  };

  const enable = () => {
    ipc.autoplaySetEnabled(true).catch(() => { /* non-fatal */ });
    dismiss();
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Open Heirvo when you insert a disc"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        width: "min(480px, calc(100vw - 48px))",
        borderRadius: 16,
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: "1px solid rgba(225,230,238,0.85)",
        boxShadow: "0 8px 32px rgba(10,23,41,0.13), 0 1.5px 4px rgba(10,23,41,0.07)",
        padding: "20px 20px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Disc icon */}
        <div
          style={{
            flexShrink: 0,
            width: 38,
            height: 38,
            borderRadius: 10,
            background: "rgba(10,132,255,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Simple inline disc SVG — no extra import needed */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A84FF" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
            <path d="M12 9V5" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: "#0A1729",
              lineHeight: 1.35,
              letterSpacing: "-0.01em",
            }}
          >
            Open Heirvo when you insert a disc?
          </p>
          <p
            style={{
              margin: "5px 0 0",
              fontSize: 12.5,
              color: "#5C6B82",
              lineHeight: 1.55,
            }}
          >
            We can launch Heirvo automatically the moment you put a disc in,
            so you skip the Windows pop-up. You can change this anytime in Settings.
          </p>
        </div>
        {/* Dismiss X */}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            flexShrink: 0,
            width: 22,
            height: 22,
            borderRadius: 99,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "#8A95A3",
            fontSize: 16,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            marginTop: -2,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={dismiss}
          style={{
            padding: "7px 14px",
            borderRadius: 99,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "white",
            fontSize: 12.5,
            fontWeight: 500,
            color: "#5C6B82",
            cursor: "pointer",
            transition: "border-color 0.15s",
          }}
        >
          Not now
        </button>
        <button
          onClick={enable}
          style={{
            padding: "7px 16px",
            borderRadius: 99,
            border: "none",
            background: "linear-gradient(135deg, #0A84FF 0%, #5AC8FA 100%)",
            boxShadow: "0 2px 10px rgba(10,132,255,0.35)",
            fontSize: 12.5,
            fontWeight: 600,
            color: "white",
            cursor: "pointer",
          }}
        >
          Yes, do that
        </button>
      </div>
    </div>
  );
}

// ─── RecoveryPromotionManager ─────────────────────────────────────────────────

/**
 * Mounts the recovery→library bridge exactly once at app level.
 * Subscribes to `library:disc_added`, triggers normalization when needed,
 * and dispatches `heirvo:library-changed` so library screens can refresh.
 * Renders nothing — pure side-effect component.
 */
function RecoveryPromotionManager() {
  useRecoveryPromotion();
  return null;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--chrome-bg)" }}>
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <RecoveryPromotionManager />
        <AutoPlayManager />
        <AutoPlayPrompt />
        <PreflightGate />
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Routes>
          {/* Recovery screen — default route + optional :id param; owns its full height. */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/recover/:id?" element={<Dashboard />} />
          {/* Legacy session/:id redirect */}
          <Route path="/session/:id" element={<Dashboard />} />
          {/* All other screens are wrapped in a scrollable container. */}
          <Route element={<ScrollLayout />}>
            <Route path="/preflight" element={<Preflight />} />
            {/* /wizard redirects to /recover for old links / bookmarks */}
            <Route path="/wizard" element={<Navigate to="/recover" replace />} />
            <Route path="/history" element={<SessionHistory />} />
            <Route path="/transcode" element={<Transcode />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/library" element={<Memories />} />
            <Route path="/library/browse" element={<Library />} />
            <Route path="/library/all" element={<LibraryAll />} />
            <Route path="/search" element={<LibrarySearch />} />
            <Route path="/watch/:discId" element={<LibraryWatch />} />
            <Route path="/disc/:discId" element={<LibraryDiscDetail />} />
            <Route path="/album/:albumId" element={<LibraryAlbumDetail />} />
            <Route path="/iso" element={<IsoBrowser />} />
            <Route path="*" element={<Navigate to="/recover" replace />} />
          </Route>
        </Routes>
        </main>
      </div>
    </div>
  );
}

// ─── PreflightGate ────────────────────────────────────────────────────────────

/**
 * On first launch, redirects to /preflight. Renders nothing once the user has
 * already seen the preflight screen. Failure to read status is non-fatal.
 */
function PreflightGate() {
  const nav = useNavigate();
  const loc = useLocation();
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (checked) return;
    let cancelled = false;
    ipc
      .getPreflightStatus()
      .then((s) => {
        if (cancelled) return;
        if (!s.seen && loc.pathname !== "/preflight") {
          nav("/preflight", { replace: true });
        }
      })
      .catch(() => { /* non-fatal */ })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [checked, loc.pathname, nav]);
  return null;
}

// ─── BrandMark ────────────────────────────────────────────────────────────────

/**
 * Custom wordmark mark: a circle (the disc) with a single bright radial
 * track cut through it — quiet, intentional, unique to this app.
 */
function BrandMark({ size = 26, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <img
      src="/brand/mark.png"
      alt=""
      aria-hidden
      width={size}
      height={size}
      style={{
        display: "block",
        objectFit: "contain",
        flexShrink: 0,
        filter: dark
          ? "drop-shadow(0 0 6px rgba(194,116,31,0.35)) brightness(0.95)"
          : "drop-shadow(0 1px 1px rgba(0,0,0,0.08))",
      }}
    />
  );
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

interface NavItemProps {
  to?: string;
  href?: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: React.ComponentType<any>;
  active: boolean;
  isDark: boolean;
  isSliver: boolean;
}

function NavItem({ to, href, label, Icon, active, isDark, isSliver }: NavItemProps) {
  const [hovered, setHovered] = useState(false);

  const iconColor = isDark
    ? active
      ? "#E9B97A"
      : hovered
      ? "rgba(233,185,122,0.72)"
      : "rgba(255,255,255,0.42)"
    : active
    ? "#0A84FF"
    : hovered
    ? "#334155"
    : "#5C6B82";

  const itemBg = isDark
    ? active
      ? "rgba(194,116,31,0.16)"
      : hovered
      ? "rgba(255,255,255,0.06)"
      : "transparent"
    : active
    ? "rgba(10,132,255,0.09)"
    : hovered
    ? "rgba(10,23,41,0.04)"
    : "transparent";

  const itemBorder = isDark
    ? active
      ? "1px solid rgba(194,116,31,0.28)"
      : "1px solid transparent"
    : active
    ? "1px solid rgba(10,132,255,0.14)"
    : "1px solid transparent";

  const labelColor = isDark
    ? active
      ? "#E9B97A"
      : hovered
      ? "rgba(255,255,255,0.82)"
      : "rgba(255,255,255,0.55)"
    : active
    ? "#0A84FF"
    : hovered
    ? "#0A1729"
    : "#5C6B82";

  const sharedStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: isSliver ? "center" : "flex-start",
    gap: 9,
    width: "100%",
    padding: isSliver ? "9px 0" : "8px 10px",
    borderRadius: 10,
    background: itemBg,
    border: itemBorder,
    position: "relative",
    overflow: "hidden",
    textDecoration: "none",
    cursor: "pointer",
    transition: prefersReducedMotion()
      ? "none"
      : `background 0.15s ease, border-color 0.15s ease, padding ${DUR}s ${EASE}`,
  };

  const inner = (
    <>
      {/* Active indicator bar on left */}
      {active && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: 2.5,
            height: "60%",
            borderRadius: "0 2px 2px 0",
            background: isDark
              ? "linear-gradient(180deg, #E9B97A 0%, #C2741F 100%)"
              : "linear-gradient(180deg, #0A84FF 0%, #5AC8FA 100%)",
            boxShadow: isDark
              ? "0 0 8px rgba(194,116,31,0.55)"
              : "0 0 8px rgba(10,132,255,0.35)",
          }}
        />
      )}

      <Icon
        size={16}
        style={{
          flexShrink: 0,
          color: iconColor,
          transition: prefersReducedMotion() ? "none" : "color 0.15s ease",
        }}
      />

      {/* Label — fades out when sliver */}
      <span
        style={{
          fontSize: 13,
          fontWeight: active ? 600 : 500,
          color: labelColor,
          fontFamily: "system-ui, -apple-system, sans-serif",
          letterSpacing: "-0.01em",
          whiteSpace: "nowrap",
          overflow: "hidden",
          opacity: isSliver ? 0 : 1,
          transition: prefersReducedMotion() ? "none" : "opacity 0.15s ease, color 0.15s ease",
          lineHeight: 1,
          pointerEvents: "none",
        }}
      >
        {label}
      </span>
    </>
  );

  // External items (e.g. "Send us your disc") open the browser; internal items
  // are router Links.
  if (href) {
    return (
      <button
        type="button"
        title={isSliver ? label : undefined}
        aria-label={label}
        onClick={() => { void openUrl(href); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ ...sharedStyle, textAlign: "left", font: "inherit" }}
      >
        {inner}
      </button>
    );
  }

  return (
    <Link
      to={to ?? "/"}
      title={isSliver ? label : undefined}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={sharedStyle}
    >
      {inner}
    </Link>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar() {
  const loc = useLocation();
  const { status: license } = useLicense();
  const { isDark: themeDark } = useTheme();

  // Slim pull-out rail (hover-to-reveal, no manual toggle) — gives the disc-
  // browsing screens MAXIMUM content space. Applies to My Discs (/library/browse)
  // and the Memories cinematic room (/library). Every OTHER screen (Home, Send
  // us, Settings) keeps the regular static sidebar.
  const isDark =
    loc.pathname === "/library" || loc.pathname === "/library/browse";

  // ── Collapse toggle (light world only) ────────────────────────────────────
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "1"
  );
  const toggle = () =>
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      return next;
    });

  // ── Dark-world reveal (proximity / hover) ─────────────────────────────────
  const [revealed, setRevealed] = useState(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = useCallback(() => {
    if (!isDark) return;
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => setRevealed(false), 220);
  }, [isDark]);

  const cancelHide = useCallback(() => {
    if (revealTimer.current) clearTimeout(revealTimer.current);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDark) return;
      const nearLeft = e.clientX <= W_SLIVER + 20;
      if (nearLeft && !revealed) {
        if (revealTimer.current) clearTimeout(revealTimer.current);
        setRevealed(true);
      }
    },
    [isDark, revealed]
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  // When theme switches to light, reset revealed state
  useEffect(() => {
    if (!isDark) setRevealed(false);
  }, [isDark]);

  useEffect(() => {
    return () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
    };
  }, []);

  // ── Drive status ───────────────────────────────────────────────────────────
  const [driveReady, setDriveReady] = useState(false);
  const ringRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const drives = await ipc.listDrives();
        if (!cancelled) setDriveReady(drives.length > 0);
      } catch {
        if (!cancelled) setDriveReady(false);
      }
    };
    tick();
    const t = setInterval(tick, 4000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  useEffect(() => {
    if (!ringRef.current) return;
    if (prefersReducedMotion() || !driveReady) {
      gsap.set(ringRef.current, { scale: 1, opacity: 0 });
      return;
    }
    const tween = gsap.fromTo(
      ringRef.current,
      { scale: 0.6, opacity: 0.7 },
      { scale: 2.4, opacity: 0, duration: 1.6, ease: "power2.out", repeat: -1 },
    );
    return () => { tween.kill(); };
  }, [driveReady]);

  // ── Rail refs for GSAP width/opacity animation ────────────────────────────
  const railRef = useRef<HTMLElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLSpanElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);

  // ── Entrance animation on mount ───────────────────────────────────────────
  useEffect(() => {
    if (prefersReducedMotion() || !railRef.current) return;
    gsap.fromTo(
      railRef.current,
      { x: -24, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.65, ease: EASE, delay: 0.05, clearProps: "x,opacity" }
    );
  }, []);

  // ── Width / label animation when isDark / revealed changes ────────────────
  useEffect(() => {
    if (!railRef.current) return;

    // Light world: collapsed state supersedes; on dark: sliver unless revealed
    const targetW = isDark
      ? revealed ? W_FULL : W_SLIVER
      : collapsed ? 48 : W_FULL;

    if (prefersReducedMotion()) {
      gsap.set(railRef.current, { width: targetW });
      if (labelsRef.current)  gsap.set(labelsRef.current,  { opacity: targetW === W_SLIVER || (collapsed && !isDark) ? 0 : 1 });
      if (wordmarkRef.current) gsap.set(wordmarkRef.current, { opacity: targetW === W_SLIVER || (collapsed && !isDark) ? 0 : 1 });
      return;
    }

    const showLabels = isDark ? revealed : !collapsed;

    gsap.to(railRef.current, { width: targetW, duration: DUR, ease: EASE });

    if (labelsRef.current) {
      gsap.to(labelsRef.current, {
        opacity: showLabels ? 1 : 0,
        duration: showLabels ? 0.22 : 0.12,
        delay: showLabels ? 0.18 : 0,
        ease: "power2.out",
      });
    }
    if (wordmarkRef.current) {
      gsap.to(wordmarkRef.current, {
        opacity: showLabels ? 1 : 0,
        duration: showLabels ? 0.22 : 0.12,
        delay: showLabels ? 0.20 : 0,
        ease: "power2.out",
      });
    }

    if (haloRef.current) {
      gsap.to(haloRef.current, {
        opacity: isDark && !revealed ? 0.55 : 0,
        duration: 0.5,
        ease: "power2.out",
      });
    }
  }, [isDark, revealed, collapsed]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const isSliver = isDark && !revealed;
  // In light world, treat collapsed (48px) the same as sliver for icon-only layout
  const isIconOnly = isSliver || (!isDark && collapsed);

  // Chrome color driven by the THEME hook (reactive to toggle) + the immersive
  // Memories room override. Previously read dataset.theme directly which didn't
  // re-render on toggle — useTheme() subscribes correctly.
  const chromeDark = isDark || themeDark;

  // ── Styles ────────────────────────────────────────────────────────────────
  const railBg = chromeDark ? "rgba(18,24,38,0.82)" : "rgba(255,255,255,0.62)";
  const railBorder = chromeDark
    ? "1px solid rgba(255,255,255,0.09)"
    : "1px solid rgba(225,230,238,0.80)";
  const railBackdrop = "blur(22px)";

  return (
    <aside
      ref={railRef}
      onMouseEnter={isDark ? cancelHide : undefined}
      onMouseLeave={isDark ? scheduleHide : undefined}
      style={{
        position: "relative",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        // Initial width — GSAP animates on subsequent changes
        width: isDark ? W_SLIVER : collapsed ? 48 : W_FULL,
        background: railBg,
        backdropFilter: railBackdrop,
        WebkitBackdropFilter: railBackdrop,
        borderRight: railBorder,
        overflow: "hidden",
        zIndex: 20,
        transition: prefersReducedMotion()
          ? "none"
          : `background ${DUR}s ease, border-color ${DUR}s ease`,
        boxShadow: chromeDark
          ? "4px 0 32px rgba(245,166,35,0.08), inset -1px 0 0 rgba(245,166,35,0.06)"
          : "none",
      }}
    >
      {/* Top highlight line */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: "0 0 auto 0",
          height: 1,
          background: chromeDark
            ? "linear-gradient(90deg, transparent, rgba(245,166,35,0.20), transparent)"
            : "linear-gradient(90deg, transparent, rgba(255,255,255,0.90), transparent)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      {/* Ambient halo — glows on the sliver in dark mode */}
      <div
        ref={haloRef}
        aria-hidden
        style={{
          position: "absolute",
          right: -1,
          top: "20%",
          width: 2,
          height: "60%",
          borderRadius: 1,
          background: "rgba(194,116,31,0.45)",
          filter: "blur(6px)",
          opacity: 0,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* ── Brand row ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: isIconOnly ? "18px 0 16px" : "18px 14px 16px",
          justifyContent: isIconOnly ? "center" : "flex-start",
          flexShrink: 0,
          transition: prefersReducedMotion() ? "none" : `padding ${DUR}s ${EASE}`,
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <BrandMark size={28} dark={chromeDark} />
        <span
          ref={wordmarkRef}
          style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: chromeDark ? "rgba(255,255,255,0.92)" : "#0A1729",
            whiteSpace: "nowrap",
            opacity: isIconOnly ? 0 : 1, // initial; GSAP takes over
            transition: prefersReducedMotion() ? "none" : `color ${DUR}s ease`,
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          Heirvo
          {/* Pro badge — shown when expanded and licensed */}
          {license.plan === "pro" && (
            <span
              style={{
                marginLeft: 6,
                borderRadius: 99,
                padding: "1px 6px",
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "white",
                background: chromeDark
                  ? "linear-gradient(135deg, #C2741F 0%, #E9B97A 100%)"
                  : "linear-gradient(135deg, #0A84FF 0%, #5AC8FA 100%)",
                verticalAlign: "middle",
              }}
            >
              Pro
            </span>
          )}
        </span>
      </div>

      {/* ── Nav items ─────────────────────────────────────────────────────── */}
      <nav
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          padding: isIconOnly ? "0 6px" : "0 8px",
          overflow: "hidden",
          transition: prefersReducedMotion() ? "none" : `padding ${DUR}s ${EASE}`,
        }}
        aria-label="Main navigation"
      >
        {NAV_ITEMS.map((item) => {
          const active = item.match ? item.match(loc.pathname) : false;
          return (
            <NavItem
              key={item.label}
              to={item.to}
              href={item.href}
              label={item.label}
              Icon={item.Icon}
              active={active}
              isDark={chromeDark}
              isSliver={isIconOnly}
            />
          );
        })}
      </nav>

      {/* ── Footer — drive status + collapse toggle ────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          padding: isIconOnly ? "10px 0 16px" : "10px 10px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          overflow: "hidden",
          transition: prefersReducedMotion() ? "none" : `padding ${DUR}s ${EASE}`,
        }}
      >
        {/* Drive status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isIconOnly ? "center" : "flex-start",
            gap: 7,
          }}
        >
          <span className={cn("status-dot", driveReady ? "status-dot-ready" : "status-dot-idle")}>
            <span className="status-dot-core" />
            {driveReady && <span ref={ringRef} className="status-dot-ring" />}
          </span>
          <div
            ref={labelsRef}
            style={{
              opacity: isIconOnly ? 0 : 1, // initial; GSAP takes over
              overflow: "hidden",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: chromeDark ? "rgba(255,255,255,0.38)" : "#5C6B82",
                fontFamily: "system-ui, -apple-system, sans-serif",
                letterSpacing: "0.01em",
                transition: prefersReducedMotion() ? "none" : `color ${DUR}s ease`,
              }}
            >
              {driveReady ? "Drive ready" : "No drive"}
            </span>
          </div>
        </div>

        {/* Collapse toggle — light world only */}
        {!isDark && (
          <button
            onClick={toggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-ink-400 hover:bg-ink-100/60 hover:text-ink-600 transition-colors",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed
              ? <ChevronRightIcon className="h-3.5 w-3.5" />
              : <><ChevronLeft className="h-3.5 w-3.5" /><span>Collapse</span></>}
          </button>
        )}
      </div>

      {/* Dark-mode: faint "hover to expand" affordance line on right edge */}
      {isDark && !revealed && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: 0,
            top: "30%",
            width: 2,
            height: "40%",
            background: "rgba(194,116,31,0.18)",
            borderRadius: 1,
            pointerEvents: "none",
          }}
        />
      )}
    </aside>
  );
}
