import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Wind,
  LayoutDashboard,
  Gauge,
  FileText,
  ExternalLink,
  Github,
  Menu,
  X,
  Radio,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/decision-desk", label: "Decision Desk", icon: Wind },
  { to: "/accuracy-lab", label: "Accuracy Lab", icon: Gauge },
  { to: "/methodology", label: "Methodology", icon: FileText },
];

function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal/40 bg-teal/10 transition-shadow duration-300 group-hover:shadow-[0_0_18px_-2px_rgba(47,227,192,0.5)]">
        <svg viewBox="0 0 64 64" className="h-6 w-6" fill="none" aria-hidden>
          <g stroke="#2fe3c0" strokeWidth="5" strokeLinecap="round">
            <path d="M32 31 L32 56" opacity="0.95" />
            <path d="M32 31 L13 14" />
            <path d="M32 31 L53 20" />
            <path d="M32 31 L30 6" />
          </g>
          <circle cx="32" cy="31" r="5.4" fill="#2fe3c0" />
        </svg>
      </span>
      <span className="leading-none">
        <span className="block font-display text-[17px] font-bold tracking-tight text-ink">
          WindScope<span className="text-teal"> DA</span>
        </span>
        <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.28em] text-faint">
          Day-Ahead Wind Intelligence
        </span>
      </span>
    </Link>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-abyss text-ink">
      {/* ============ top bar ============ */}
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
          scrolled ? "border-line bg-abyss/85 backdrop-blur-xl" : "border-transparent bg-transparent"
        }`}
      >
        {/* data freshness strip */}
        <div className="hidden border-b border-line/60 bg-panel/60 md:block">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-1 font-mono text-[10px] tracking-wide text-faint">
            <span className="flex items-center gap-2">
              <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-teal" />
              ELEXON BMRS EXTRACT · <span className="text-dim">FUELHH (actuals) + WINDFOR (forecasts)</span>
            </span>
            <span className="flex items-center gap-4">
              <span>SCOPE: <span className="text-dim">GB NATIONAL WIND · DELIVERY 1–31 JAN 2026 · 30-MIN SETTLEMENT</span></span>
              <span className="text-teal">DECISION GATE: D-1 10:00 UTC</span>
            </span>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end as boolean | undefined}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors ${
                    isActive ? "bg-teal/10 text-teal" : "text-dim hover:bg-panel-2 hover:text-ink"
                  }`
                }
              >
                <item.icon className="h-3.5 w-3.5" strokeWidth={2} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <a
              href="https://bmrs.elexon.co.uk"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[11px] font-medium text-dim transition-colors hover:border-line-2 hover:text-ink"
            >
              BMRS API <ExternalLink className="h-3 w-3" />
            </a>
            <Link
              to="/decision-desk"
              className="flex items-center gap-1.5 rounded-lg bg-teal px-3.5 py-2 font-display text-[12px] font-semibold text-abyss transition-all hover:bg-teal-deep hover:shadow-[0_0_22px_-6px_rgba(47,227,192,0.6)]"
            >
              <Zap className="h-3.5 w-3.5" strokeWidth={2.5} /> Open Desk
            </Link>
          </div>

          <button
            className="rounded-lg border border-line p-2 text-dim lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* mobile nav */}
        {open && (
          <div className="border-t border-line bg-abyss/97 backdrop-blur-xl lg:hidden">
            <nav className="mx-auto max-w-7xl space-y-1 px-4 py-4" aria-label="Mobile">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end as boolean | undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                      isActive ? "bg-teal/10 text-teal" : "text-dim"
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" /> {item.label}
                </NavLink>
              ))}
              <Link to="/decision-desk" className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-teal px-4 py-3 font-display text-sm font-semibold text-abyss">
                <Zap className="h-4 w-4" strokeWidth={2.5} /> Open the Decision Desk
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main className="relative">{children}</main>

      {/* ============ footer ============ */}
      <footer className="relative border-t border-line bg-[#070d18]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-4">
              <Logo />
              <p className="mt-4 max-w-xs text-[12px] leading-relaxed text-dim">
                Decision-grade visibility of GB national wind generation for the day-ahead
                procurement desk — what the market knows, what the meter says, and how far
                apart those two are.
              </p>
              <p className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                <Radio className="h-3.5 w-3.5 text-teal" /> Powered by Elexon BMRS Insights
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">Product</p>
              <ul className="mt-3 space-y-2 text-[12px]">
                <li><Link to="/decision-desk" className="text-dim hover:text-teal">Decision Desk</Link></li>
                <li><Link to="/accuracy-lab" className="text-dim hover:text-teal">Accuracy Lab</Link></li>
                <li><Link to="/methodology" className="text-dim hover:text-teal">Methodology</Link></li>
              </ul>
            </div>
            <div className="md:col-span-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">Data sources</p>
              <ul className="mt-3 space-y-2 text-[12px] text-dim">
                <li>FUELHH — metered half-hourly generation by fuel type <span className="text-faint">(WIND)</span></li>
                <li>WINDFOR — national wind generation forecasts, ~8 runs/day</li>
                <li><a className="hover:text-teal" href="https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream" target="_blank" rel="noreferrer">FUELHH stream ↗</a></li>
                <li><a className="hover:text-teal" href="https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream" target="_blank" rel="noreferrer">WINDFOR stream ↗</a></li>
              </ul>
            </div>
            <div className="md:col-span-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">Engagement</p>
              <ul className="mt-3 space-y-2 text-[12px] text-dim">
                <li>Built for: <span className="text-ink">UK energy utility — Day-Ahead Procurement</span></li>
                <li>Version: <span className="text-ink">0.1.0 (v1)</span></li>
                <li className="flex items-center gap-1.5 pt-1">
                  <Github className="h-3.5 w-3.5" />
                  <span className="text-faint">Public repo — see README</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-line pt-5 text-[10.5px] leading-relaxed text-faint">
            <p>
              WindScope DA is an analytical aid, not trading advice. Forecast error statistics are computed on national
              WINDFOR/FUELHH data for delivery periods 1–31 January 2026 (UTC). Actuals are near-final metered values as
              published by Elexon. Contains Elexon BMRS data — © Elexon Limited. WINDFOR values are indicative and are not
              the same as embedded-wind estimates; see <Link to="/methodology" className="text-dim underline underline-offset-2 hover:text-teal">Methodology &amp; caveats</Link>.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
