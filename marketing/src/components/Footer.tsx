import { Link } from "react-router-dom";
import { BrandMark } from "./BrandMark";

export function Footer() {
  return (
    <footer className="relative border-t border-ink-200/70 mt-24">
      <div className="container-narrow py-14 sm:py-16">
        {/* Trust signals row */}
        <div className="mb-12 pb-12 border-b border-ink-200/60">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            <div>
              <div className="text-[18px] sm:text-[20px] font-display font-semibold text-ink-900 mb-1">47K+</div>
              <div className="text-[13px] text-ink-500">Active users</div>
            </div>
            <div>
              <div className="text-[18px] sm:text-[20px] font-display font-semibold text-ink-900 mb-1">3.2M+</div>
              <div className="text-[13px] text-ink-500">Files recovered</div>
            </div>
            <div>
              <div className="text-[18px] sm:text-[20px] font-display font-semibold text-ink-900 mb-1">99.2%</div>
              <div className="text-[13px] text-ink-500">Uptime since launch</div>
            </div>
            <div>
              <div className="text-[18px] sm:text-[20px] font-display font-semibold text-ink-900 mb-1">30-day</div>
              <div className="text-[13px] text-ink-500">Money-back guarantee</div>
            </div>
          </div>
        </div>

        {/* Main content row */}
        <div className="grid gap-12 sm:gap-10 md:grid-cols-3">
          {/* Brand column */}
          <div className="md:max-w-xs">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-4 group">
              <BrandMark size={48} />
              <span className="font-display text-[18px] font-semibold tracking-tightish text-ink-900">
                Heirvo
              </span>
            </Link>
            <p className="text-[14px] leading-relaxed text-ink-500 mb-6">
              Retrieving memories before they are lost forever.
            </p>

            {/* Trust badges */}
            <div className="space-y-2 mb-4">
              <div className="inline-flex items-center gap-2 rounded-lg bg-white/50 backdrop-blur border border-ink-200 px-3 py-2 text-[12px] text-ink-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" stroke="currentColor" strokeWidth="1.6" fill="none" />
                </svg>
                Your data stays private
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-white/50 backdrop-blur border border-ink-200 px-3 py-2 text-[12px] text-ink-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" fill="none" />
                </svg>
                No subscription required
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-white/50 backdrop-blur border border-ink-200 px-3 py-2 text-[12px] text-ink-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="3" y="4" width="18" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M8 21h8M12 18v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                Windows 10 / 11
              </div>
            </div>
          </div>

          {/* Product column */}
          <div>
            <div className="micro-label mb-4">Product</div>
            <ul className="space-y-3 text-[14px]">
              <FooterLink href="/#pricing">Pricing</FooterLink>
              <FooterLink to="/activate">Manage license</FooterLink>
              <FooterLink href="/#how">How it works</FooterLink>
              <FooterLink href="/#faq">FAQ</FooterLink>
            </ul>
          </div>

          {/* Help column */}
          <div>
            <div className="micro-label mb-4">Help &amp; legal</div>
            <ul className="space-y-3 text-[14px]">
              <FooterLink to="/about">About Heirvo</FooterLink>
              <FooterLink to="/support">Support</FooterLink>
              <FooterLink to="/privacy">Privacy policy</FooterLink>
              <FooterLink to="/terms">Terms of service</FooterLink>
              <FooterLink to="/refund">Refund policy</FooterLink>
              <FooterLink to="/acceptable-use">Acceptable use</FooterLink>
              <FooterLink href="mailto:info@heirvo.com">info@heirvo.com</FooterLink>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-ink-200/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[13px] text-ink-500">
          <span>&copy; {new Date().getFullYear()} Heirvo. All rights reserved.</span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-ios-green" />
            Made with care for family memories.
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  to,
  children,
}: {
  href?: string;
  to?: string;
  children: React.ReactNode;
}) {
  const className =
    "text-ink-500 hover:text-ink-900 transition inline-flex items-center gap-1.5 group";
  const arrow = (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition"
      aria-hidden
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
  return (
    <li>
      {to ? (
        <Link to={to} className={className}>
          {children}
          {arrow}
        </Link>
      ) : (
        <a href={href} className={className}>
          {children}
          {arrow}
        </a>
      )}
    </li>
  );
}
