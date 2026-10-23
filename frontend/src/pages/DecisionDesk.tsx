import { useMemo, useState, useEffect } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Bar,
  BarChart,
  Cell,
} from "recharts";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Radio,
  Download,
  Info,
  Clock,
  Layers,
  SlidersHorizontal,
  Wind,
  AlertCircle,
} from "lucide-react";
import { useWind } from "../lib/useData";
import {
  fmtMW,
  fmtNum,
  fmtDateShort,
  fmtDateFull,
  fmtDateTime,
  fmtClock,
  settlementLabel,
  signedColor,
} from "../lib/data";
import { SectionHead, ChartTip, LegendDot, Note } from "../components/kit";

const DAYS_ALL = ["2026-01-01","2026-01-02","2026-01-03","2026-01-04","2026-01-05","2026-01-06","2026-01-07","2026-01-08","2026-01-09","2026-01-10","2026-01-11","2026-01-12","2026-01-13","2026-01-14","2026-01-15","2026-01-16","2026-01-17","2026-01-18","2026-01-19","2026-01-20","2026-01-21","2026-01-22","2026-01-23","2026-01-24","2026-01-25","2026-01-26","2026-01-27","2026-01-28","2026-01-29","2026-01-30","2026-01-31"];

export default function DecisionDesk() {
  const { da, metrics, latest } = useWind();
  const [day, setDay] = useState("2026-01-12"); // the worst day — most instructive
  const [showBand, setShowBand] = useState(true);
  const [showSpaghetti, setShowSpaghetti] = useState(true);
  const [derate, setDerate] = useState(15.9); // % — the measured bias

  const dayIndex = DAYS_ALL.indexOf(day);
  const evo = metrics.evolution.find((e) => e.deliveryDate === day);
  const dayStat = metrics.perDay.find((d) => d.date === day);
  const dayDa = da.filter((p) => p.deliveryDate === day);

  // decision-time forecast for selected day (day-ahead run) vs actuals + error
  const daSeries = useMemo(
    () =>
      dayDa.map((p) => ({
        sp: p.settlementPeriod,
        label: settlementLabel((p.settlementPeriod - 1) * 0.5),
        actual: p.actual,
        forecast: p.forecast,
        error: Math.round(p.forecast - p.actual),
        derated: Math.round(p.forecast * (1 - derate / 100)),
      })),
    [dayDa, derate]
  );

  // evolution series: band + individual runs + actual
  const evoSeries = useMemo(() => {
    if (!evo) return [] as any[];
    return evo.times.map((t, i) => {
      const row: any = {
        sp: i + 1,
        label: settlementLabel(i * 0.5),
        actual: evo.actual[i],
      };
      const band = evo.band[i];
      if (band) {
        row.bandLow = band.p10;
        row.bandHigh = band.p90;
        row.bandWidth = +(band.p90 - band.p10).toFixed(1);
        row.p50 = band.p50;
      }
      evo.runs.forEach((r, ri) => {
        // only keep every run but as individual keys (cap render cost)
        row[`run_${ri}`] = r.values[i];
      });
      return row;
    });
  }, [evo]);

  // latest-runs-for-decision: newest 10 runs published before delivery for this day
  const recentRuns = useMemo(() => {
    if (!evo) return [];
    return [...evo.runs].sort((a, b) => b.publishTime.localeCompare(a.publishTime)).slice(0, 8).reverse();
  }, [evo]);

  // error chip for the day
  const over = dayStat ? dayStat.bias > 0 : false;

  function stepDay(delta: number) {
    const next = Math.min(DAYS_ALL.length - 1, Math.max(0, dayIndex + delta));
    setDay(DAYS_ALL[next]);
  }

  function exportCsv() {
    const header = "settlementPeriod,startTime,actual_MW,dayAheadForecast_MW,signedError_MW,errorPct,deratedForecast_MW";
    const rows = dayDa.map((p) =>
      [p.settlementPeriod, p.startTime, p.actual, p.forecast.toFixed(1), (p.forecast - p.actual).toFixed(1),
       p.actual ? (100 * (p.forecast - p.actual) / p.actual).toFixed(2) : "",
       (p.forecast * (1 - derate / 100)).toFixed(1)].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `windscope_dayahead_${day}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const publishTime = dayStat?.publishTime;

  return (
    <div className="relative mx-auto max-w-7xl space-y-6 px-4 pb-16 pt-24 sm:px-6 lg:pt-28">
      {/* ================= masthead ================= */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.24em] text-teal">
            <Radio className="h-4 w-4" /> Decision Desk · Day-Ahead Auction
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            What the market knows<span className="text-teal">,</span> right now<span className="text-teal">.</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-[13px] leading-snug text-dim">
            The day-ahead buy for delivery day <span className="font-mono text-ink">{fmtDateFull(day)}</span> closes at
            11:00 Europe/London (10:00 UTC) on D−1. Everything below is exactly what the desk held at that gate.
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 rounded-xl border border-line-2 bg-panel-2 px-4 py-2.5 font-display text-[12px] font-semibold text-ink transition-all hover:border-teal/50 hover:text-teal"
        >
          <Download className="h-4 w-4" /> Export settlement CSV
        </button>
      </div>

      {/* ================= day selector ================= */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <button onClick={() => stepDay(-1)} disabled={dayIndex === 0} aria-label="Previous day" className="rounded-lg border border-line p-2 text-dim transition-colors hover:border-teal/50 hover:text-teal disabled:opacity-30">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="relative flex min-w-0 flex-1 items-center gap-3">
          <CalendarDays className="h-5 w-5 shrink-0 text-teal" />
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-full appearance-none rounded-lg border border-line bg-panel-2 py-2.5 pl-3 pr-8 font-mono text-[13px] font-semibold text-ink outline-none focus:border-teal"
            aria-label="Delivery day"
          >
            {DAYS_ALL.map((d) => (
              <option key={d} value={d}>{fmtDateFull(d)}</option>
            ))}
          </select>
          <ChevronRight className="pointer-events-none absolute right-3 h-4 w-4 text-faint" />
        </div>
        <button onClick={() => stepDay(1)} disabled={dayIndex === DAYS_ALL.length - 1} aria-label="Next day" className="rounded-lg border border-line p-2 text-dim transition-colors hover:border-teal/50 hover:text-teal disabled:opacity-30">
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 border-l border-line pl-3">
          <span className="font-mono text-[9.5px] uppercase leading-tight tracking-wider text-faint">Decision<br />(publish)</span>
          <span className="rounded-lg border border-amber/30 bg-amber/10 px-2.5 py-1.5 font-mono text-[11px] font-semibold text-amber tabular">{publishTime ? fmtDateTime(publishTime) : "—"}</span>
        </div>
      </div>

      {/* ================= settlement-period heatmap strip ================= */}
      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">Settlement periods 1–48 · signed error (forecast − actual), MW</p>
          <div className="flex items-center gap-3 font-mono text-[9.5px] text-faint">
            <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-sky" />under</span>
            <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-rose" />over</span>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-1 sm:grid-cols-24">
          {dayDa.map((p) => {
            const err = p.forecast - p.actual;
            const t = Math.max(-1, Math.min(1, err / 4000));
            const over = t >= 0;
            const alpha = 0.18 + 0.7 * Math.abs(t);
            return (
              <div
                key={p.settlementPeriod}
                title={`SP ${p.settlementPeriod} (${settlementLabel((p.settlementPeriod - 1) * 0.5)}) · fcst ${Math.round(p.forecast).toLocaleString("en-GB")} MW vs actual ${p.actual.toLocaleString("en-GB")} MW → ${err >= 0 ? "+" : ""}${Math.round(err).toLocaleString("en-GB")} MW`}
                className="group flex h-12 cursor-default flex-col items-center justify-center rounded-md border border-line/60 transition-transform hover:scale-110 hover:border-teal/60"
                style={{ background: over ? `rgba(255,107,129,${alpha})` : `rgba(92,200,255,${alpha})` }}
              >
                <span className="font-mono text-[8.5px] font-semibold text-white/90 tabular">{p.settlementPeriod}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* ============ LEFT: forecast vs actual chart ============ */}
        <section className="card xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
            <div>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-teal">Day-ahead decision run vs. delivery</p>
              <h2 className="font-display text-[15px] font-semibold text-ink">Forecast vs. actual — {fmtDateShort(day)} 2026, half-hourly</h2>
            </div>
            <div className="flex items-center gap-3">
              <LegendDot color="#2fe3c0" label="Actual" />
              <LegendDot color="#ffb454" label="Day-ahead fcst" dashed />
            </div>
          </div>
          <div className="h-[280px] px-2 pb-2 pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={daSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="2 6" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={7} tick={{ fontSize: 9 }} />
                <YAxis tickLine={false} axisLine={false} width={46} tickFormatter={(v: number) => `${Math.round(v / 1000)}`} />
                <Tooltip content={<ChartTip labelFormatter={(l: any, ) => `SP · ${l}`} />} cursor={{ stroke: "#2fe3c0", strokeOpacity: 0.35 }} />
                <Area type="monotone" dataKey="actual" name="Actual (MW)" stroke="#2fe3c0" strokeWidth={2} fill="#2fe3c0" fillOpacity={0.16} isAnimationActive={false} />
                <Line type="monotone" dataKey="forecast" name="Day-ahead forecast (MW)" stroke="#ffb454" strokeWidth={1.8} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="border-t border-line px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-[11px] text-dim">
                <span>MAE <strong className="font-mono text-ink tabular">{fmtNum(dayStat?.mae ?? 0, 0)} MW</strong></span>
                <span>Bias <strong className="font-mono tabular" style={{ color: signedColor(dayStat?.bias ?? 0) }}>{(dayStat?.bias ?? 0) >= 0 ? "+" : ""}{fmtNum(dayStat?.bias ?? 0, 0)} MW</strong></span>
                <span>R² <strong className="font-mono text-ink tabular">{fmtNum(dayStat?.r2 ?? 0, 2)}</strong></span>
                <span>Energy err <strong className="font-mono text-ink tabular">{(dayStat?.energyErrorMWh ?? 0) >= 0 ? "+" : ""}{fmtNum((dayStat?.energyErrorMWh ?? 0) / 1000, 2)} GWh</strong></span>
              </div>
              <span className={`chip ${over ? "border-amber/40 bg-amber/10 text-amber" : "border-sky/40 bg-sky/10 text-sky"}`}>
                {over ? "Over-bought wind signal" : "Under-bought wind signal"}
              </span>
            </div>
          </div>

          {/* signed error bars */}
          <div className="h-[92px] border-t border-line px-2 pb-3 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daSeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="2 6" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={7} hide />
                <YAxis tickLine={false} axisLine={false} width={46} tick={{ fontSize: 9 }} />
                <Tooltip content={<ChartTip labelFormatter={(l: any) => `Error at ${l}`} />} cursor={{ fill: "rgba(255,107,129,0.08)" }} />
                <ReferenceLine y={0} stroke="#2b3b61" />
                <Bar dataKey="error" name="Signed error (MW)" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                  {daSeries.map((d, i) => (
                    <Cell key={i} fill={d.error >= 0 ? "#ff8fa3" : "#5cc8ff"} fillOpacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ============ RIGHT: day-ahead risk panel ============ */}
        <section className="card flex flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <div>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-teal">Actionable signal</p>
              <h2 className="font-display text-[15px] font-semibold text-ink">Procurement read-out</h2>
            </div>
            <Wind className="h-5 w-5 text-teal" strokeWidth={1.5} />
          </div>
          <div className="flex flex-1 flex-col gap-4 p-5">
            {/* decision-time numbers */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-line bg-panel-2/60 p-3">
                <p className="font-mono text-[9px] uppercase tracking-wider text-faint">Wind you can bank</p>
                <p className="mt-1 font-display text-xl font-bold text-teal tabular">{fmtNum(dayStat?.meanActual ? dayStat.meanActual / 1000 : 0, 2)}<span className="text-xs font-medium text-dim"> GW</span></p>
                <p className="font-mono text-[8.5px] text-faint">actual mean this day</p>
              </div>
              <div className="rounded-xl border border-line bg-panel-2/60 p-3">
                <p className="font-mono text-[9px] uppercase tracking-wider text-faint">Market&rsquo;s view at gate</p>
                <p className="mt-1 font-display text-xl font-bold text-amber tabular">{fmtNum(dayStat?.meanForecast ? dayStat.meanForecast / 1000 : 0, 2)}<span className="text-xs font-medium text-dim"> GW</span></p>
                <p className="font-mono text-[8.5px] text-faint">day-ahead forecast mean</p>
              </div>
            </div>

            {/* de-rate calculator */}
            <div className="rounded-xl border border-teal/25 bg-teal/5 p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-teal"><SlidersHorizontal className="h-3.5 w-3.5" /> Bias de-rate calculator</p>
                <span className="font-mono text-[10px] text-faint">Jan 2026 measured: +15.9%</span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <label htmlFor="derate" className="text-[11.5px] text-dim">Shave the day-ahead signal by</label>
                <span className="font-display text-lg font-bold text-ink tabular">{derate.toFixed(1)}<span className="text-xs text-teal">%</span></span>
              </div>
              <input
                id="derate"
                type="range"
                min={0}
                max={30}
                step={0.1}
                value={derate}
                onChange={(e) => setDerate(parseFloat(e.target.value))}
                className="mt-2 w-full"
                style={{ ["--fill" as any]: `${(derate / 30) * 100}%` }}
                aria-valuetext={`${derate.toFixed(1)} percent de-rate`}
              />
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-teal/15 pt-3 text-center">
                <div>
                  <p className="font-mono text-[8.5px] uppercase tracking-wider text-faint">Raw day-ahead</p>
                  <p className="font-mono text-[13px] font-semibold text-amber tabular">{fmtMW(dayStat?.meanForecast ?? 0, 0)}</p>
                </div>
                <div>
                  <p className="font-mono text-[8.5px] uppercase tracking-wider text-faint">De-rated signal</p>
                  <p className="font-mono text-[13px] font-semibold text-teal tabular">{fmtMW((dayStat?.meanForecast ?? 0) * (1 - derate / 100), 0)}</p>
                </div>
              </div>
              <p className="mt-2 text-[10px] leading-snug text-faint">Applying the measured +15.9% bias correction collapses mean day-ahead error from 2,108 MW toward ~270 MW on average.</p>
            </div>

            {/* sizing guidance */}
            <div className="rounded-xl border border-line bg-panel-2/60 p-4">
              <p className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-faint"><AlertCircle className="h-3.5 w-3.5" /> Sizing the thermal backstop</p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-dim">
                For <span className="text-ink">{fmtDateShort(day)} 2026</span>, plan thermal procurement off
                <span className="text-ink"> P50 = {fmtNum(metrics.overall.p50AbsError, 0)} MW</span> uncertainty, and
                stress-test at <span className="text-ink">P90 = {fmtNum(metrics.overall.p90AbsError, 0)} MW</span>:
              </p>
              <div className="mt-2.5 space-y-1.5 font-mono text-[10.5px]">
                <div className="flex items-center justify-between"><span className="text-faint">P50 shortfall risk</span><span className="text-ink tabular">±{fmtNum(metrics.overall.p50AbsError, 0)} MW per half-hour</span></div>
                <div className="flex items-center justify-between"><span className="text-faint">P90 stress (1-in-10)</span><span className="text-amber tabular">±{fmtNum(metrics.overall.p90AbsError, 0)} MW per half-hour</span></div>
                <div className="flex items-center justify-between"><span className="text-faint">Worst January miss</span><span className="text-rose tabular">+{fmtNum(metrics.overall.maxAbsError, 0)} MW · 12 Jan 01:00</span></div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ============ EVOLUTION / SPAGHETTI ============ */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-teal"><Layers className="h-3.5 w-3.5" /> Forecast evolution · all {evo?.nRuns ?? 0} published runs</p>
            <h2 className="mt-0.5 font-display text-[15px] font-semibold text-ink">How the market&rsquo;s view of {fmtDateShort(day)} converged toward the actual</h2>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer select-none items-center gap-2 text-[11px] text-dim">
              <input type="checkbox" checked={showSpaghetti} onChange={() => setShowSpaghetti((v) => !v)} className="h-3.5 w-3.5 accent-teal" />
              Individual runs
            </label>
            <label className="flex cursor-pointer select-none items-center gap-2 text-[11px] text-dim">
              <input type="checkbox" checked={showBand} onChange={() => setShowBand((v) => !v)} className="h-3.5 w-3.5 accent-teal" />
              P10–P90 band
            </label>
          </div>
        </div>

        <div className="relative h-[330px] px-2 pb-2 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={evoSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="2 6" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval={7} tick={{ fontSize: 9 }} />
              <YAxis tickLine={false} axisLine={false} width={46} tickFormatter={(v: number) => `${Math.round(v / 1000)}`} domain={[0, "dataMax + 1500"]} />
              <Tooltip content={<ChartTip labelFormatter={(l: any) => `Settlement period · ${l}`} />} cursor={{ stroke: "#2fe3c0", strokeOpacity: 0.3 }} />
              {showBand && (
                <Area type="monotone" dataKey="bandHigh" name="P90 across runs (MW)" stroke="none" fill="#a78bfa" fillOpacity={0.14} isAnimationActive={false} />
              )}
              {showBand && (
                <Area type="monotone" dataKey="bandLow" name="P10 across runs (MW)" stroke="none" fill="#060b14" fillOpacity={0.9} isAnimationActive={false} />
              )}
              {showSpaghetti && evo?.runs.map((r, i) => (
                <Line
                  key={i}
                  type="monotone"
                  dataKey={`run_${i}`}
                  name={`Run ${fmtDateTime(r.publishTime)}`}
                  stroke="#5cc8ff"
                  strokeOpacity={0.28}
                  strokeWidth={1}
                  dot={false}
                  isAnimationActive={false}
                  legendType="none"
                />
              ))}
              <Line type="monotone" dataKey="p50" name="Consensus P50 (MW)" stroke="#a78bfa" strokeWidth={1.6} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="actual" name="Actual (MW)" stroke="#2fe3c0" strokeWidth={2.4} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <LegendDot color="#2fe3c0" label="Actual" />
            <LegendDot color="#5cc8ff" label={`${evo?.nRuns ?? 0} WINDFOR publish runs`} />
            <LegendDot color="#a78bfa" label="P10–P90 consensus band" dashed />
          </div>
          <p className="font-mono text-[9.5px] uppercase tracking-wider text-faint">runs published Dec 29 → delivery day</p>
        </div>
      </section>

      {/* ============ publish timeline strip ============ */}
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-faint"><Clock className="h-3.5 w-3.5" /> The last 8 publishes before delivery — zoom into the run of the day</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {recentRuns.map((r, i) => {
            const lead = r.leadHoursAtStart;
            const isDecision = publishTime === r.publishTime;
            return (
              <div
                key={i}
                title={`Published ${fmtDateTime(r.publishTime)} · lead at day start ${lead.toFixed(1)}h`}
                className={`rounded-xl border p-2.5 text-center transition-all ${isDecision ? "border-amber/50 bg-amber/10 shadow-[0_0_18px_-6px_rgba(255,180,84,0.4)]" : "border-line bg-panel-2/50"}`}
              >
                <p className="font-mono text-[10px] font-semibold text-ink tabular">{fmtClock(r.publishTime)}</p>
                <p className="font-mono text-[8.5px] text-faint">{fmtDateShort(r.publishTime.slice(0, 10))}</p>
                {isDecision && <p className="mt-1 font-mono text-[8px] font-bold uppercase tracking-widest text-amber">Decision run</p>}
                {!isDecision && <p className="mt-1 font-mono text-[8px] uppercase tracking-widest text-faint">{lead.toFixed(0)}h lead</p>}
              </div>
            );
          })}
        </div>
        <Note tone="warn" >
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>The <strong>Decision run</strong> badge marks the exact WINDFOR publish used for the day-ahead evaluation of this delivery day (latest publish ≤ 10:00 UTC on D−1) — the same input the auction desk sees, reconstructed without look-ahead bias.</span>
        </Note>
      </section>

      {/* ============ latest live publish ============ */}
      {latest && (
        <section className="card border-teal/20 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal/30 bg-teal/10"><Radio className="h-5 w-5 text-teal" /></span>
              <div>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-teal">Latest publish in feed</p>
                <p className="font-display text-[15px] font-semibold text-ink">{fmtDateTime(latest.publishTime)} — first usable for delivery <span className="text-teal">{fmtDateShort(latest.usedForDeliveryDate)} {latest.usedForDeliveryDate.slice(0, 4)}</span></p>
              </div>
            </div>
            <p className="font-mono text-[10.5px] text-dim">Horizon {fmtDateTime(latest.horizonStart)} → {fmtDateTime(latest.horizonEnd)} · {latest.nPoints} hourly points ({fmtMW(latest.points[Math.floor(latest.points.length / 2)]?.forecast, 0)} mid-horizon)</p>
          </div>
        </section>
      )}
    </div>
  );
}
