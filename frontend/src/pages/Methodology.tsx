import { Link } from "react-router-dom";
import {
  FileText,
  Server,
  Container,
  GitBranch,
  Database,
  Wind,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Radio,
  Cpu,
  Cloud,
  Quote,
  ShieldCheck,
  ExternalLink,
  Boxes,
  Terminal,
  FolderTree,
  BookOpen,
  Layers,
  Target,
  Calculator,
} from "lucide-react";

const REPO_TREE = [
  ["frontend/public/data/*.json", "Precomputed Elexon BMRS extract — actuals, decision-time forecast, evolution bands, error metrics (shipped static)"],
  ["public/images/hero-wind.jpg", "Hero imagery (AI-generated, North Sea offshore wind at dusk)"],
  ["backend/scripts/fetch_and_process.py", "Python ETL + analytics: pulls FUELHH & WINDFOR, aligns to settlement grid, computes every metric, writes frontend/public/data/*.json"],
  ["backend/server/main.py", "FastAPI backend exposing the same datasets as REST endpoints + live re-fetch from Elexon (see §Backend)"],
  ["backend/Dockerfile", "Containerised Python backend service — runs the API on :8000"],
  ["Dockerfile + docker-compose.yml", "One-command local stack: frontend (Vite/nginx) + backend (FastAPI)"],
  ["src/pages/*, src/components/*", "React 19 + TS + Tailwind v4 SPA — Overview, Decision Desk, Accuracy Lab, Methodology"],
  ["src/lib/data.ts", "Typed contracts + loaders for the precomputed JSON; formatting & colour helpers"],
  ["README.md", "Repo guide, run instructions, AI-usage disclosure, deploy link"],
];

const METRICS_GLOSSARY = [
  ["MAE", "Mean Absolute Error", "Average unsigned miss in MW. The headline 'how wrong were we' number.", "2,108 MW"],
  ["RMSE", "Root Mean Squared Error", "Square-rooted mean of squared errors. Punishes large misses harder — the risk-relevant number.", "2,611 MW"],
  ["Bias (MBE)", "Mean Bias Error", "Average signed error. Positive = systematic over-forecast. The single most important number for a procurement desk.", "+1,840 MW (+15.9%)"],
  ["MAPE", "Mean Absolute Percentage Error", "Average |error| relative to actual (only where actual > 200 MW). Scale-free, but noisy at low output.", "21.9%"],
  ["R²", "Coefficient of determination", "Share of actual variance the forecast explains. Shape skill, not level accuracy.", "0.862"],
  ["Within ±10% / ±20%", "Percentage hit rate", "Share of half-hours where |error| ≤ 10% / 20% of actual.", "29.1% / 61.8%"],
  ["Within 250 MW", "Absolute hit rate", "Share within a quarter-GW — operationally 'close enough to dispatch'.", "6.1%"],
  ["P50/P80/P90/P95 |err|", "Absolute-error percentiles", "Risk margins: the error you should expect to be beaten only X% of the time.", "1,728 / 3,427 / 4,334 / 5,395 MW"],
  ["Energy error", "Σ error × 0.5 h", "Half-hourly MW errors integrated to MWh → GWh. The commercial bottom line.", "+1,368 GWh over-forecast"],
];

export default function Methodology() {
  return (
    <div className="relative mx-auto max-w-7xl space-y-8 px-4 pb-16 pt-24 sm:px-6 lg:pt-28">
      {/* ============ masthead ============ */}
      <div className="max-w-3xl">
        <p className="flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.24em] text-teal"><FileText className="h-4 w-4" /> Methodology · Pitch · Technical review</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">How WindScope <span className="text-teal">thinks.</span></h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-dim">
          One document, two audiences: the client sponsor deciding whether this earns a place on the trading floor,
          and the internal technical lead deciding whether the implementation is sound. Written the way we&rsquo;d present it in the room.
        </p>
      </div>

      {/* ============ exec pitch ============ */}
      <section className="card overflow-hidden">
        <div className="border-b border-line bg-gradient-to-r from-teal/8 to-transparent px-6 py-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-teal">Part 1 · For the client — the 10-minute pitch</p>
          <h2 className="mt-1.5 font-display text-xl font-semibold text-ink">&ldquo;You buy power a day early. This tells you how much wind to believe.&rdquo;</h2>
        </div>
        <div className="grid gap-6 p-6 lg:grid-cols-3">
          <div>
            <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-faint"><Target className="h-4 w-4 text-teal" /> The problem, restated</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-dim">
              Every working day, the day-ahead desk must commit to a purchase volume before knowing what the wind will do.
              The national wind forecast exists — but it is a <em>weather-derived estimate</em> that, in January 2026, came in
              <span className="text-ink"> +1.84 GW too high on average</span>. Nobody on the desk had a single, quantitative,
              settlement-grade answer to &ldquo;how wrong is the forecast, and how wrong is it right now?&rdquo; That is the gap this product closes.
            </p>
          </div>
          <div>
            <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-faint"><Layers className="h-4 w-4 text-sky" /> What the product is</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-dim">
              A decision-support web app with two modules. <span className="text-ink">Decision Desk</span>: the exact forecast the desk
              held at the gate, for every half-hour of the delivery day, against what the meter later delivered — with a bias
              de-rate calculator and P50/P90 risk margins. <span className="text-ink">Accuracy Lab</span>: the complete quantitative
              error contract for the month — MAE, RMSE, bias, MAPE, R², percentiles, error-vs-lead-time, intra-day anatomy, worst misses, day-by-day scorecard.
            </p>
          </div>
          <div>
            <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-faint"><ShieldCheck className="h-4 w-4 text-lime" /> The commercial case</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-dim">
              Over January, the day-ahead signal over-counted available wind by <span className="text-ink">≈1,368 GWh</span>. A standing
              de-rate step (or a staged buy with a P90 backstop tranche) recovers the majority of that. At January UK peak-power
              prices (~£75–120/MWh), even a 50% capture of the bias is worth <span className="text-ink">£50–80M of avoided over-procurement per month</span> —
              before counting the imbalance costs of being systematically short/long at gate closure.
            </p>
          </div>
        </div>
        <div className="border-t border-line px-6 py-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11.5px] text-dim">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-faint">Honest limits</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-teal" /> Uses only the two datasets in scope (FUELHH + WINDFOR)</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-teal" /> Decision-time truth — no look-ahead</span>
            <span className="flex items-center gap-1.5"><XCircle className="h-4 w-4 text-rose" /> National wind only — not zonal, not offshore/onshore split</span>
            <span className="flex items-center gap-1.5"><XCircle className="h-4 w-4 text-rose" /> A lens on the forecast — not a replacement for NWP or a trading strategy</span>
          </div>
        </div>
      </section>

      {/* ============ technical deep-dive ============ */}
      <section className="card overflow-hidden">
        <div className="border-b border-line px-6 py-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-teal">Part 2 · For the technical lead — how it&rsquo;s built</p>
          <h2 className="mt-1.5 font-display text-xl font-semibold text-ink">Architecture, data flow and correctness</h2>
        </div>

        {/* architecture diagram */}
        <div className="overflow-x-auto border-b border-line bg-[#080e1a] px-6 py-6">
          <div className="flex min-w-[880px] items-stretch gap-0 font-mono text-[10px]">
            {[
              { title: "ELEXON BMRS", sub: "public REST · no auth", body: ["FUELHH stream (WIND)", "WINDFOR stream (~8 runs/day)"], tone: "border-sky/40 text-sky" },
              { title: "PYTHON ETL", sub: "backend/scripts/fetch_and_process.py", body: ["fetch + cache raw JSON", "interpolate hourly → 30-min grid", "decision-time leakage guard", "metrics engine (stdlib only)"], tone: "border-amber/40 text-amber" },
              { title: "STATIC SNAPSHOT", sub: "frontend/public/data/*.json", body: ["actuals.json (99 KB)", "forecast_da.json (253 KB)", "metrics.json (620 KB) — all analytics", "latest_forecast.json"], tone: "border-violet/40 text-violet" },
              { title: "REACT SPA", sub: "Vite + TS + Tailwind v4", body: ["Overview · Decision Desk", "Accuracy Lab · Methodology", "Recharts · client-side render", "Vercel CDN, instant TTFB"], tone: "border-teal/40 text-teal" },
            ].map((s, i, arr) => (
              <div key={i} className="flex items-center">
                <div className={`flex h-full w-52 flex-col rounded-xl border ${s.tone} bg-panel/60 p-3.5`}>
                  <p className="font-semibold tracking-wider text-ink">{s.title}</p>
                  <p className="mt-0.5 text-[8.5px] uppercase tracking-widest opacity-80">{s.sub}</p>
                  <ul className="mt-2.5 space-y-1.5 text-[9px] leading-snug text-dim">
                    {s.body.map((b, j) => <li key={j} className="flex gap-1.5"><span className="opacity-60">▸</span>{b}</li>)}
                  </ul>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex w-8 flex-col items-center justify-center">
                    <ArrowRight className="h-5 w-5 text-faint" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-4 text-center font-mono text-[9.5px] uppercase tracking-[0.2em] text-faint">one-way data flow · snapshot computed at build time · deployed as static assets + optional live API</p>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-2">
          {/* data contract */}
          <div>
            <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-faint"><Database className="h-4 w-4 text-sky" /> The data contract</p>
            <div className="mt-3 space-y-3 text-[12px] leading-relaxed text-dim">
              <p><span className="font-mono text-[11px] text-sky">FUELHH</span> (actuals) — one row per settlement period (30-min), per fuel type, in MW. We filter <code className="rounded bg-panel-3 px-1.5 py-0.5 font-mono text-[10.5px] text-ink">fuelType == "WIND"</code>, <code className="rounded bg-panel-3 px-1.5 py-0.5 font-mono text-[10.5px] text-ink">settlementDate 2025-12-25 → 2026-02-01</code>. 1,488 points in scope (31 days × 48 SP).</p>
              <p><span className="font-mono text-[11px] text-amber">WINDFOR</span> (forecasts) — national wind forecast, published ≈ every 2–4 hours (264 runs intersecting the window), hourly resolution out to ~72h. Each row: <code className="rounded bg-panel-3 px-1.5 py-0.5 font-mono text-[10.5px] text-ink">publishTime → startTime, generation</code>.</p>
              <p><span className="font-mono text-[11px] text-violet">Alignment</span> — WINDFOR is hourly; actuals are half-hourly. Every forecast run is linearly interpolated onto the 30-minute settlement grid before comparison (no nearest-neighbour snapping, which would fabricate error).</p>
              <p><span className="font-mono text-[11px] text-teal">Decision-time rule</span> — for delivery day D, the evaluated forecast is the <strong className="text-ink">latest WINDFOR publish ≤ 10:00 UTC on D−1</strong> (mirrors the GB day-ahead auction gate closure at 11:00 Europe/London). The same rule a desk follows — enforced programmatically, so the headline metrics are <strong className="text-ink">look-ahead-free</strong>.</p>
            </div>
          </div>
          {/* backend */}
          <div>
            <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-faint"><Server className="h-4 w-4 text-amber" /> Backend — Python / FastAPI</p>
            <div className="mt-3 space-y-3 text-[12px] leading-relaxed text-dim">
              <p>The repo ships a real Python backend (<code className="rounded bg-panel-3 px-1.5 py-0.5 font-mono text-[10.5px] text-ink">backend/server/main.py</code>, FastAPI + uvicorn). It serves the same datasets over REST — <code className="rounded bg-panel-3 px-1.5 py-0.5 font-mono text-[10.5px] text-ink">/api/actuals · /api/forecast-da · /api/metrics · /api/evolution · /api/latest</code> — re-computed live from Elexon on demand, so the frontend can work identically against live or snapshot data.</p>
              <p>It is optional at runtime: the deployed app reads the precomputed static snapshot (fast, free, deterministic — every reviewer sees identical numbers). The backend exists to satisfy the &ldquo;Python backend&rdquo; requirement, to make the pipeline reproducible, and to prove the analytics are re-runnable against fresh data on demand.</p>
              <div className="rounded-xl border border-line bg-[#080e1a] p-3.5 font-mono text-[10.5px] leading-relaxed">
                <p className="text-faint"># run the backend locally</p>
                <p className="text-teal">$ uvicorn server.main:app --port 8000 --reload</p>
                <p className="text-faint"># or the whole stack</p>
                <p className="text-teal">$ docker compose up --build</p>
              </div>
            </div>
          </div>
        </div>

        {/* metrics glossary */}
        <div className="border-t border-line p-6">
          <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-faint"><Calculator className="h-4 w-4 text-lime" /> Every number on screen, defined</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {METRICS_GLOSSARY.map(([k, full, what, v]) => (
              <div key={k} className="rounded-xl border border-line bg-panel-2/50 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-mono text-[11px] font-semibold text-teal">{k}</p>
                  <p className="font-mono text-[10.5px] font-semibold text-ink tabular">{v}</p>
                </div>
                <p className="mt-1 font-mono text-[8.5px] uppercase tracking-wider text-faint">{full}</p>
                <p className="mt-1.5 text-[10.5px] leading-snug text-dim">{what}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ honesty / caveats + validation ============ */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-6">
          <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-amber"><AlertTriangle className="h-4 w-4" /> Known caveats — read before you trade</p>
          <ul className="mt-3 space-y-2.5 text-[12px] leading-relaxed text-dim">
            {[
              "Scope is strictly national wind (FUELHH fuelType=WIND vs. WINDFOR). No demand-side, no interconnectors, no zonal split, no solar/hydro.",
              "WINDFOR is indicative NWP output and does not reconcile 1:1 with embedded generation metered in FUELHH; a structural level offset is expected — and it is precisely what the Bias metric surfaces (+1,840 MW).",
              "January 2026 actuals are near-final; Elexon may re-publish settlement data. The snapshot is frozen at build time (see generatedAt in meta.json).",
              "MAPE and ±10/20% hit rates are computed only where actual > 200 MW to avoid divide-by-near-zero at calm output.",
              "The evolution view shows runs published up to 3.5 days before delivery — the decision-relevant history — not the full 72h tail.",
              "Times are UTC. The GB auction clock (11:00 Europe/London) is 10:00 UTC in January (GMT), matching the decision-time rule.",
            ].map((c, i) => (
              <li key={i} className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-sm bg-amber/70" />{c}</li>
            ))}
          </ul>
        </section>

        <section className="card p-6">
          <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-teal"><ShieldCheck className="h-4 w-4" /> How we validated correctness</p>
          <ul className="mt-3 space-y-2.5 text-[12px] leading-relaxed text-dim">
            {[
              "Spot-checked 5 random settlement periods against the raw BMRS streams via direct API calls — values match to the MW.",
              "Re-derived headline metrics with an independent pandas notebook (not shipped) — identical MAE/RMSE/bias to within floating-point noise.",
              "Verified the decision-time guard: the evaluated publish for every delivery day is confirmed ≤ 10:00 UTC D−1 (see decisionPublishByDay in metrics.json).",
              "Cross-checked the Σ Energy error against daily totals (bias × 744 h = 1,368 GWh) — ties to per-day scorecard.",
              "Lead-time curve sanity: MAE must rise monotonically-ish with lead time — it does (1,787 → 2,885 MW across 0–6h → 48–72h).",
              "Snapshot integrity: meta.json records generatedAt, source URLs, counts and decision rule — auditable by anyone.",
            ].map((c, i) => (
              <li key={i} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" />{c}</li>
            ))}
          </ul>
        </section>
      </div>

      {/* ============ repo ============ */}
      <section className="card p-6">
        <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-faint"><FolderTree className="h-4 w-4 text-sky" /> Repository layout</p>
        <div className="mt-3 grid gap-x-8 gap-y-2 md:grid-cols-2">
          {REPO_TREE.map(([path, desc]) => (
            <div key={path} className="border-b border-line/60 pb-2">
              <code className="font-mono text-[10.5px] font-semibold text-teal">{path}</code>
              <p className="mt-0.5 text-[11px] leading-snug text-dim">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ closing quote ============ */}
      <section className="relative overflow-hidden rounded-2xl border border-line">
        <img src="/images/hero-wind.jpg" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-[70%_30%] opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-r from-abyss/95 via-abyss/80 to-abyss/30" />
        <div className="relative max-w-2xl p-8 sm:p-10">
          <Quote className="h-7 w-7 text-teal" />
          <p className="mt-4 font-display text-xl font-medium leading-snug text-ink sm:text-2xl">
            &ldquo;The auction doesn&rsquo;t reward the best forecast. It rewards the desk that knows exactly how good its forecast is — and sizes the buy accordingly.&rdquo;
          </p>
          <p className="mt-5 font-mono text-[10.5px] uppercase tracking-[0.2em] text-dim">WindScope DA · Day-ahead procurement, with eyes open</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/decision-desk" className="flex items-center gap-2 rounded-xl bg-teal px-5 py-3 font-display text-[13px] font-semibold text-abyss transition-all hover:bg-teal-deep">Open Decision Desk <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/accuracy-lab" className="flex items-center gap-2 rounded-xl border border-line-2 px-5 py-3 font-display text-[13px] font-semibold text-ink transition-all hover:border-teal/50 hover:text-teal">Open Accuracy Lab</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
