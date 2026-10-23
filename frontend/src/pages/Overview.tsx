import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  Wind,
  Target,
  Sigma,
  Activity,
  Gauge,
  ArrowRight,
  Zap,
  AlertTriangle,
  TrendingUp,
  FileDown,
  ChevronRight,
  CheckCircle2,
  Radio,
  CalendarDays,
  Layers,
  Crosshair,
} from "lucide-react";
import { useWind } from "../lib/useData";
import { fmtNum, fmtDateShort, fmtClock } from "../lib/data";
import { Stat, SectionHead, ChartTip, LegendDot } from "../components/kit";
import { useState } from "react";

const DEMO_MISSION = [
  {
    n: "01",
    title: "See the latest forecast, decision-ready",
    body: "The exact WINDFOR run the desk holds at gate closure — every settlement period, every publish — rendered against what the meter actually delivered.",
    to: "/decision-desk",
    cta: "Open the Decision Desk",
    icon: Wind,
  },
  {
    n: "02",
    title: "Quantify the error before you bid",
    body: "MAE, RMSE, bias, MAPE, R², P90/P95 error bands, error growth with lead time, per-day and per-settlement-period anatomy — the full accuracy contract for January 2026.",
    to: "/accuracy-lab",
    cta: "Open the Accuracy Lab",
    icon: Gauge,
  },
];

export default function Overview() {
  const { actuals, da, metrics } = useWind();
  const o = metrics.overall;
  const [range, setRange] = useState<"full" | "7d">("full");

  // chart series: actuals + day-ahead decision forecast
  const fullSeries = da.map((p) => ({
    t: p.startTime,
    label: `${fmtDateShort(p.deliveryDate)} ${fmtClock(p.startTime)}`,
    actual: p.actual,
    forecast: p.forecast,
    error: Math.round(p.forecast - p.actual),
  }));
  const series = range === "7d" ? fullSeries.slice(-7 * 48) : fullSeries;

  // monthly generation profile (daily sums)
  const daily = metrics.perDay.map((d) => ({
    date: fmtDateShort(d.date),
    actualGWh: +(d.actualEnergyMWh / 1000).toFixed(1),
    forecastGWh: +(d.forecastEnergyMWh / 1000).toFixed(1),
  }));

  // error split for donut
  const over = da.filter((p) => p.forecast > p.actual).length;
  const under = da.length - over;
  const within20 = Math.round((o.within20Pct / 100) * o.n);

  const monthlyAvgMW = o.meanActual;
  const peak = Math.max(...actuals.map((a) => a.generation));
  const actualEnergyGWh = o.meanActual * o.n * 0.5 / 1000;
  const biasEnergyGWh = o.bias * o.n * 0.5 / 1000;

  const tickInterval = range === "7d" ? 24 : 144;

  return (
    <div className="relative">
      {/* ================= HERO ================= */}
      <section className="relative flex min-h-[92vh] w-full flex-col justify-end overflow-hidden lg:min-h-[96vh]">
        <img
          src="/images/hero-wind.jpg"
          alt="Offshore wind farm in the North Sea at dusk"
          className="absolute inset-0 h-full w-full object-cover object-[68%_28%]"
        />
        {/* cinematic gradient stack */}
        <div className="absolute inset-0 bg-gradient-to-r from-abyss via-abyss/78 to-abyss/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/30 to-abyss/55" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(6,11,20,0.55)_100%)]" />

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-32 sm:px-6 lg:pb-14">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip border-teal/40 bg-teal/10 text-teal">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-teal" /> Live product · v0.1
              </span>
              <span className="chip">UK Day-Ahead Procurement</span>
              <span className="chip">GB National Wind</span>
            </div>

            <h1 className="mt-5 font-display text-[40px] font-bold leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-[64px]">
              Bid the wind<br />
              <span className="text-teal text-glow">you can trust.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[#c3cfe8] sm:text-base">
              WindScope DA gives your procurement desk the two things the day-ahead auction
              actually needs — the <span className="text-ink font-medium">latest decision-grade wind forecast</span> for every
              settlement period of January 2026, and <span className="text-ink font-medium">a quantified error contract</span> so
              every thermal MWh you buy is bought with eyes open.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/decision-desk"
                className="group flex items-center gap-2 rounded-xl bg-teal px-5 py-3 font-display text-[13.5px] font-semibold text-abyss transition-all hover:bg-teal-deep hover:shadow-[0_0_30px_-6px_rgba(47,227,192,0.55)]"
              >
                Open the Decision Desk
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
              </Link>
              <Link
                to="/accuracy-lab"
                className="flex items-center gap-2 rounded-xl border border-line-2 bg-abyss/60 px-5 py-3 font-display text-[13.5px] font-semibold text-ink backdrop-blur transition-colors hover:border-teal/50 hover:text-teal"
              >
                <Gauge className="h-4 w-4" /> See the error, quantified
              </Link>
            </div>
          </motion.div>

          {/* ===== ticker strip of live KPIs ===== */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="mt-9 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line-2 bg-line-2 shadow-2xl sm:grid-cols-4"
          >
            {[
              { v: fmtNum(o.mae, 0), u: "MW", l: "Day-ahead MAE" },
              { v: fmtNum(o.biasPct, 1), u: "%", l: "Systematic bias" },
              { v: fmtNum(o.r2, 2), u: "", l: "Forecast R²" },
              { v: fmtNum(o.p90AbsError, 0), u: "MW", l: "P90 abs. error" },
            ].map((k, i) => (
              <div key={i} className="bg-[#0a111f]/92 px-4 py-3 backdrop-blur">
                <p className="font-display text-xl font-semibold text-ink tabular sm:text-2xl">
                  {k.v}
                  {k.u && <span className="ml-1 text-[11px] font-medium text-teal">{k.u}</span>}
                </p>
                <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-faint">{k.l}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ================= BODY ================= */}
      <div className="relative mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:py-16">

        {/* ---------- mission strip ---------- */}
        <div className="grid gap-4 md:grid-cols-2">
          {DEMO_MISSION.map((m) => (
            <Link
              key={m.n}
              to={m.to}
              className="card card-hover group flex items-start gap-5 p-6"
            >
              <span className="font-display text-4xl font-bold text-panel-3 transition-colors duration-300 group-hover:text-teal/70">{m.n}</span>
              <span className="flex-1">
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-teal">
                  <m.icon className="h-3.5 w-3.5" /> Mission {m.n}</span>
                <span className="mt-1.5 block font-display text-lg font-semibold text-ink">{m.title}</span>
                <span className="mt-1.5 block text-[12.5px] leading-relaxed text-dim">{m.body}</span>
                <span className="mt-3 inline-flex items-center gap-1.5 font-display text-[12px] font-semibold text-teal">
                  {m.cta} <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </span>
            </Link>
          ))}
        </div>

        {/* ---------- headline numbers ---------- */}
        <section>
          <SectionHead
            eyebrow="January 2026 · settled against the meter"
            title="The month at a glance"
            sub="1,488 half-hourly settlement periods, day-ahead decision-time forecasts vs. FUELHH metered wind actuals."
            right={
              <Link to="/methodology" className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider text-dim hover:text-teal">
                Methodology <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Stat label="Mean wind output" value={fmtNum(monthlyAvgMW / 1000, 2)} unit="GW" icon={Wind} tone="teal" foot={`${fmtNum(actualEnergyGWh, 1)} GWh generated`} />
            <Stat label="Peak half-hour" value={fmtNum(peak / 1000, 2)} unit="GW" icon={Zap} tone="sky" foot="24 Jan · 18:00 UTC" />
            <Stat label="Day-ahead MAE" value={fmtNum(o.mae, 0)} unit="MW" icon={Crosshair} tone="amber" foot={`${fmtNum(o.mape ?? 0, 1)}% of mean actual`} delta="error" deltaGood={null} />
            <Stat label="Bias (mean err)" value={`+${fmtNum(o.bias, 0)}`} unit="MW" icon={TrendingUp} tone="rose" foot="Over-forecast in 84.7% of periods" delta="+15.9%" deltaGood={false} />
            <Stat label="RMSE" value={fmtNum(o.rmse, 0)} unit="MW" icon={Sigma} tone="violet" foot={`σ = ${fmtNum(o.stdError, 0)} MW around the bias`} />
            <Stat label="Correlation R²" value={fmtNum(o.r2, 3)} unit="" icon={Activity} tone="lime" foot={`r = ${fmtNum(o.r, 3)} · shape tracks well`} />
          </div>
        </section>

        {/* ---------- full-width feature chart ---------- */}
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-teal">Decision vs. delivery · all of January 2026</p>
              <h3 className="mt-0.5 font-display text-base font-semibold text-ink">Day-ahead forecast against metered wind, settlement period by settlement period</h3>
            </div>
            <div className="flex items-center gap-3">
              <LegendDot color="#2fe3c0" label="Actual (FUELHH)" />
              <LegendDot color="#ffb454" label="Day-ahead forecast (WINDFOR)" dashed />
              <div className="flex overflow-hidden rounded-lg border border-line">
                {(["full", "7d"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wider transition-colors ${range === r ? "bg-teal text-abyss" : "text-dim hover:text-ink"}`}
                  >
                    {r === "full" ? "Jan" : "Last 7d"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full px-2 pb-2 pt-4 sm:h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2fe3c0" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#2fe3c0" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="2 6" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                  interval={tickInterval}
                />
                <YAxis tickLine={false} axisLine={false} width={52} unit="" tickFormatter={(v: number) => `${Math.round(v / 1000)}GW`} domain={[0, 22]} />
                <Tooltip content={<ChartTip labelFormatter={(l: string) => l} />} cursor={{ stroke: "#2fe3c0", strokeOpacity: 0.35 }} />
                <Area type="monotone" dataKey="actual" name="Actual (MW)" stroke="#2fe3c0" strokeWidth={1.8} fill="url(#gActual)" isAnimationActive={false} />
                <Line type="monotone" dataKey="forecast" name="Day-ahead forecast (MW)" stroke="#ffb454" strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-panel-2/30 px-5 py-2.5">
            <p className="font-mono text-[10.5px] text-faint">
              <span className="text-amber">▲ The forecast line sits consistently ABOVE the metered line — a +{fmtNum(o.bias, 0)} MW ({fmtNum(o.biasPct, 1)}%) structural over-forecast across the month.</span>
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-faint">1,488 settlement periods · 31 delivery days</p>
          </div>
        </section>

        {/* ---------- two up: daily energy + error anatomy ---------- */}
        <div className="grid gap-4 xl:grid-cols-5">
          <section className="card p-5 xl:col-span-3">
            <SectionHead
              eyebrow="Energy delivered vs. forecast, by day"
              title="Where the MWh actually landed"
              right={<CalendarDays className="h-4 w-4 text-faint" />}
            />
            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={1}>
                  <CartesianGrid vertical={false} strokeDasharray="2 6" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} interval={2} tick={{ fontSize: 9 }} />
                  <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => `${v}`} />
                  <Tooltip cursor={{ fill: "rgba(47,227,192,0.06)" }} content={<ChartTip labelFormatter={(l: string) => `${l} Jan 2026 · GWh`} />} />
                  <Bar dataKey="actualGWh" name="Actual GWh" fill="#2fe3c0" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="forecastGWh" name="Forecast GWh" fill="#ffb454" fillOpacity={0.75} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 font-mono text-[9.5px] uppercase tracking-wider text-faint">GWh per delivery day · day-ahead decision forecast vs settled actual</p>
          </section>

          {/* error anatomy donut + over/under */}
          <section className="card flex flex-col p-5 xl:col-span-2">
            <SectionHead
              eyebrow="Direction of error"
              title="Over vs. under-forecast"
              right={<AlertTriangle className="h-4 w-4 text-amber" />}
            />
            <div className="flex flex-1 items-center gap-4">
              <div className="relative h-[150px] w-[150px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ name: "Over", value: over }, { name: "Under", value: under }]} dataKey="value" innerRadius={52} outerRadius={72} paddingAngle={3} strokeWidth={0} startAngle={90} endAngle={-270}>
                      <Cell fill="#ffb454" />
                      <Cell fill="#5cc8ff" />
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-2xl font-bold text-ink tabular">{Math.round((over / da.length) * 100)}%</span>
                  <span className="font-mono text-[8.5px] uppercase tracking-widest text-faint">over-fcst</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2.5 text-[12px]">
                <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
                  <span className="flex items-center gap-2 text-dim"><span className="h-2.5 w-2.5 rounded-sm bg-amber" />Over-forecast</span>
                  <span className="font-mono font-semibold text-ink tabular">{over.toLocaleString("en-GB")} periods</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
                  <span className="flex items-center gap-2 text-dim"><span className="h-2.5 w-2.5 rounded-sm bg-sky" />Under-forecast</span>
                  <span className="font-mono font-semibold text-ink tabular">{under.toLocaleString("en-GB")} periods</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-dim"><CheckCircle2 className="h-4 w-4 text-teal" />Within ±20%</span>
                  <span className="font-mono font-semibold text-teal tabular">{within20.toLocaleString("en-GB")} / {o.n.toLocaleString("en-GB")}</span>
                </div>
              </div>
            </div>
            <p className="mt-3 rounded-xl border border-amber/25 bg-amber/5 px-3 py-2 text-[11px] leading-snug text-amber/90">
              <strong className="font-semibold">Trading implication:</strong> systematic over-forecast → the desk under-buys thermal cover and gets short into scarcity. De-rate the day-ahead signal or stage tranches.
            </p>
          </section>
        </div>

        {/* ---------- pain / gain framing strip ---------- */}
        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: AlertTriangle,
              tone: "text-rose",
              title: "The pain today",
              points: [
                "Day-ahead wind signal is +1,839 MW (+15.9%) optimistic on average",
                "Worst single period miss: +6,857 MW on 12 Jan 01:00",
                "Error compounds +61% from 0–6h to 48–72h lead time",
              ],
            },
            {
              icon: Target,
              tone: "text-teal",
              title: "What WindScope gives you",
              points: [
                "The exact decision-time forecast for every settlement period of Jan 2026",
                "P50/P80/P90/P95 absolute-error bands for risk margins",
                "Lead-time error curve and per-day error anatomy",
              ],
            },
            {
              icon: Layers,
              tone: "text-sky",
              title: "How to use it in the auction",
              points: [
                "Size thermal procurement off P50 with P90 stress case",
                "De-rate day-ahead volume by the measured bias (−15.9%)",
                "Flag days where forecast evolution band is wide → buy options",
              ],
            },
          ].map((c, i) => (
            <div key={i} className="card p-6">
              <c.icon className={`h-6 w-6 ${c.tone}`} strokeWidth={1.75} />
              <h3 className="mt-3 font-display text-base font-semibold text-ink">{c.title}</h3>
              <ul className="mt-3 space-y-2">
                {c.points.map((p, j) => (
                  <li key={j} className="flex items-start gap-2 text-[12px] leading-snug text-dim">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-faint" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
