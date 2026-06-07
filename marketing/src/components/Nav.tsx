import { Link } from "react-router-dom";
import { BrandMark } from "./BrandMark";

/**
 * Site navigation. Defaults to the light theme used across most marketing
 * pages; pass `theme="dark"` on the dark Landing page so the glass bar and
 * text match the surrounding dark hero instead of clashing with it.
 */
export function Nav({ theme = "light" }: { theme?: "light" | "dark" }) {
  const dark = theme === "dark";

  const linkClass = dark
    ? "transition-colors duration-200 text-slate-300 hover:text-white"
    : "transition-colors duration-200 text-ink-500 hover:text-ink-900";

  return (
    <header className="sticky top-0 z-40 w-full">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: dark ? "rgba(11,18,32,0.66)" : "rgba(244,246,250,0.72)",
          backdropFilter: "blur(20px) saturate(1.2)",
          WebkitBackdropFilter: "blur(20px) saturate(1.2)",
          borderBottom: dark
            ? "1px solid rgba(255,255,255,0.08)"
            : "1px solid rgba(225,230,238,0.7)",
        }}
      />
      <nav className="container-narrow flex h-[64px] items-center">
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <BrandMark size={36} />
          <span
            className="font-display text-[17px] font-semibold tracking-tightish"
            style={{ color: dark ? "#F0EDE8" : undefined }}
          >
            Heirvo
          </span>
        </Link>
        <div className="hidden md:flex flex-1 justify-center items-center gap-8 text-[14px]">
          <a href="/#how" className={linkClass}>How it works</a>
          <a href="/#rescue" className={linkClass}>What it rescues</a>
          <Link to="/guides" className={linkClass}>Guides</Link>
          <Link to="/recover" className={linkClass}>Mail-in service</Link>
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/download" className="btn btn-primary !py-2 !px-4 !text-[14px]">
            Try for free
          </Link>
        </div>
      </nav>
    </header>
  );
}
