import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import {
  Gauge,
  Sigma,
  Crosshair,
  TrendingUp,
  Target,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Download,
  BookOpenCheck,
} from "lucide-react";
import { useWind } from "../lib/useData";
import {
  fmtNum,
  fmtMW,
  fmtDateShort,
  fmtDateFull,
  fmtClock,
  settlementLabel,
  signedColor,
} from "../lib/data";
import { SectionHead, Stat, ChartTip, LegendDot } from "../components/kit";

type SortKey = "date" | "mae" | "bias" | "rmse" | "mape" | "r2" | "energyErrorMWh";

export default function AccuracyLab() {
  const { da, metrics } = useWind();
  const o = metrics.overall;
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [hoverDay, setHoverDay] = useState<string | null>(null);

  // scatter: actual vs forecast, colored by error magnitude
  const scatter = useMemo(
    () =>
      da.map((p) => ({
        actual: p.actual,
        forecast: p.forecast,
        error: Math.round(p.forecast - p.actual),
        absErr: Math.abs(p.forecast - p.actual),
        date: p.deliveryDate,
      })),
    [da]
  );

  // histogram of signed errors
  const hist = metrics.errorHistogram.map((b) => ({ ...b, label: fmtNum(b.binMid, 0) }));

  // lead-time curve
  const lead = metrics.leadCurve.map((l) => ({
    label: `${l.leadLo}–${l.leadHi}h`,
    mae: l.mae,
    bias: l.bias,
    r: l.r,
    r2: l.r2,
    mape: l.mape,
    leadMid: l.leadMid,
  }));

  // per-day sorted table
  const days = useMemo(() => {
    const rows = [...metrics.perDay];
    rows.sort((a, b) => {
      const va = a[sortKey as keyof typeof a] as number | string;
      const vb = b[sortKey as keyof typeof b] as number | string;
      if (typeof va === "string") return sortDir * va.localeCompare(vb as string);
      return sortDir * (((va as number) ?? 0) - ((vb as number) ?? 0));
    });
    return rows;
  }, [metrics.perDay, sortKey, sortDir]);

  const worstAbs = Math.max(...metrics.perDay.map((d) => Math.abs(d.bias)));

  // settlement-period profile
  const spSeries = metrics.perSettlementPeriod.map((s) => ({
    sp: s.settlementPeriod,
    label: settlementLabel((s.settlementPeriod - 1) * 0.5),
    mae: s.mae,
    bias: s.bias,
    meanActual: s.meanActual,
    meanForecast: s.meanForecast,
  }));

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(k);
      setSortDir(k === "date" ? 1 : -1);
    }
  }
  const SortIcon = ({ k }: { k: SortKey }) =>
    k !== sortKey ? <ArrowUpDown className="h-3 w-3 opacity-40" /> : sortDir === 1 ? <ArrowUp className="h-3 w-3 text-teal" /> : <ArrowDown className="h-3 w-3 text-teal" />;

  function exportCsv() {
    const header = "date,decisionPublishUTC,nPeriods,actualEnergyGWh,forecastEnergyGWh,energyErrorGWh,MAE_MW,RMSE_MW,bias_MW,biasPct,MAPE_pct,R2,within10Pct,within20Pct";
    const rows = metrics.perDay.map((d) =>
      [d.date, d.publishTime, d.n, (d.actualEnergyMWh / 1000).toFixed(2), (d.forecastEnergyMWh / 1000).toFixed(2), (d.energyErrorMWh / 1000).toFixed(2),
       d.mae.toFixed(1), d.rmse.toFixed(1), d.bias.toFixed(1), d.biasPct.toFixed(2), d.mape?.toFixed(2) ?? "", d.r2.toFixed(4), d.within10Pct.toFixed(1), d.within20Pct.toFixed(1)].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "windscope_dayahead_daily_metrics_jan2026.csv";
    a.click();
    URL.revokeObjectURL(url);
  }


  return (
    <div className="relative mx-auto max-w-7xl space-y-6 px-4 pb-16 pt-24 sm:px-6 lg:pt-28">
      {/* ============ masthead ============ */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.24em] text-teal"><Gauge className="h-4 w-4" /> Accuracy Lab · Forecast vs. Meter</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">The error,<br className="hidden sm:block" /> <span className="text-teal">quantified.</span></h1>
          <p className="mt-1.5 max-w-xl text-[13px] leading-snug text-dim">Every number below is computed on the decision-time (day-ahead) forecast for January 2026 vs. FUELHH metered wind — no hindsight, no cherry-picking.</p>
        </div>
        <button onClick={exportCsv} className="flex items-center gap-2 rounded-xl border border-line-2 bg-panel-2 px-4 py-2.5 font-display text-[12px] font-semibold text-ink transition-all hover:border-teal/50 hover:text-teal">
          <Download className="h-4 w-4" /> Daily metrics CSV
        </button>
      </div>

      {/* ============ headline stat strip ============ */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Stat label="MAE" value={fmtNum(o.mae, 0)} unit="MW" icon={Crosshair} tone="amber" foot="mean abs error" />
        <Stat label="RMSE" value={fmtNum(o.rmse, 0)} unit="MW" icon={Sigma} tone="violet" foot="penalises big misses" />
        <Stat label="Bias" value={`+${fmtNum(o.bias, 0)}`} unit="MW" icon={TrendingUp} tone="rose" foot={`+${fmtNum(o.biasPct, 1)}% of mean`} />
        <Stat label="MAPE" value={fmtNum(o.mape ?? 0, 1)} unit="%" icon={Target} tone="sky" foot="mean abs % error" />
        <Stat label="R²" value={fmtNum(o.r2, 3)} unit="" icon={BookOpenCheck} tone="lime" foot={`r = ${fmtNum(o.r, 3)}`} />
        <Stat label="P50 |err|" value={fmtNum(o.p50AbsError, 0)} unit="MW" icon={Gauge} tone="teal" foot="median miss" />
        <Stat label="P90 |err|" value={fmtNum(o.p90AbsError, 0)} unit="MW" icon={Gauge} tone="amber" foot="1-in-10 stress" />
        <Stat label="P95 |err|" value={fmtNum(o.p95AbsError, 0)} unit="MW" icon={Gauge} tone="rose" foot="1-in-20 tail" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* ============ lead-time decay curve ============ */}
        <section className="card p-5">
          <SectionHead
            eyebrow="Error growth with lead time"
            title="Forecast skill decays with horizon"
            sub="MAE and bias per lead-time bucket across all 264 publish runs. The day-ahead auction sits at 14–38h — squarely in the degraded region."
          />
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lead} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="2 6" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 9.5 }} />
                <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 9.5 }} />
                <Tooltip content={<ChartTip labelFormatter={(l: any) => `Lead time ${l}`} />} />
                <ReferenceLine x="18–24h" stroke="#ffb454" strokeOpacity={0.55} strokeDasharray="4 4" label={{ value: "auction gate", position: "insideTopRight", fill: "#ffb454", fontSize: 9 }} />
                <Line type="monotone" dataKey="mae" name="MAE (MW)" stroke="#ffb454" strokeWidth={2.4} dot={{ r: 3, fill: "#ffb454" }} isAnimationActive={false} />
                <Line type="monotone" dataKey="bias" name="Bias (MW)" stroke="#ff6b81" strokeWidth={1.6} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-line pt-3">
            <LegendDot color="#ffb454" label="MAE by lead bucket" />
            <LegendDot color="#ff6b81" label="Bias by lead bucket" dashed />
            <span className="ml-auto font-mono text-[9.5px] text-faint">n = 748–2,926 points per bucket · sub-sampled 2-hourly</span>
          </div>
        </section>

        {/* ============ scatter actual vs forecast ============ */}
        <section className="card p-5">
          <SectionHead
            eyebrow="Shape skill · all 1,488 periods"
            title="Forecast vs. actual, one dot per settlement period"
            sub={`Perfect foresight lies on the diagonal. The cloud sits ABOVE it — classic over-forecast. R² = ${fmtNum(o.r2, 3)}.`}
          />
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 6" />
                <XAxis type="number" dataKey="actual" name="Actual" tickLine={false} axisLine={false} domain={[0, 22000]} tick={{ fontSize: 9.5 }} label={{ value: "Actual (MW)", position: "insideBottom", offset: -2, fontSize: 9, fill: "#5d6f92" }} />
                <YAxis type="number" dataKey="forecast" name="Forecast" tickLine={false} axisLine={false} width={44} domain={[0, 22000]} tick={{ fontSize: 9.5 }} />
                <ZAxis type="number" dataKey="absErr" range={[14, 14]} />
                <Tooltip cursor={{ strokeDasharray: "4 4" }} content={<ChartTip labelFormatter={() => ""} />} />
                <Scatter data={scatter} fill="#5cc8ff" fillOpacity={0.32} isAnimationActive={false} name="Settlement periods" />
                {/* perfect-foresight diagonal */}
                <Scatter data={[{ actual: 0, forecast: 0, absErr: 999 }, { actual: 22000, forecast: 22000, absErr: 999 }]} line={{ stroke: "#2fe3c0", strokeOpacity: 0.55, strokeDasharray: "5 4", strokeWidth: 1.6 }} fill="transparent" isAnimationActive={false} legendType="none" name="Perfect forecast" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 border-t border-line pt-3">
            <p className="font-mono text-[9.5px] leading-relaxed text-faint">Color intensity = error magnitude · the vertical offset of the cloud <span className="text-rose">above</span> the diagonal is the +1,839 MW systematic bias</p>
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        {/* ============ error distribution histogram ============ */}
        <section className="card p-5 xl:col-span-3">
          <SectionHead
            eyebrow="Error distribution · day-ahead run"
            title="Signed error, all 1,488 periods"
            sub="The distribution is right-shifted and wide-tailed: the mean miss is +1.84 GW, and ~1 in 20 periods misses by more than 5.4 GW."
          />
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hist} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="2 6" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={3} tick={{ fontSize: 9 }} />
                <YAxis tickLine={false} axisLine={false} width={36} tick={{ fontSize: 9.5 }} />
                <Tooltip cursor={{ fill: "rgba(47,227,192,0.06)" }} content={<ChartTip labelFormatter={(l: any, ) => `Error bin centred ${l} MW`} />} />
                <ReferenceLine x="0" stroke="#e8eefc" strokeOpacity={0.4} strokeDasharray="3 3" />
                <Bar dataKey="count" name="Periods" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {hist.map((b, i) => (
                    <Cell key={i} fill={b.binMid >= 0 ? "#ffb454" : "#5cc8ff"} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 font-mono text-[9.5px] text-faint">
            <span>Mean <span className="text-amber">+{fmtNum(o.bias, 0)} MW</span> · Std dev <span className="text-dim">{fmtNum(o.stdError, 0)} MW</span></span>
            <span>Skew: <span className="text-amber">84.7% of periods over-forecast</span></span>
          </div>
        </section>

        {/* ============ settlement-period profile ============ */}
        <section className="card p-5 xl:col-span-2">
          <SectionHead
            eyebrow="Intra-day anatomy"
            title="Bias by settlement period"
            sub="Where in the day does the forecast lie? Overnight & pre-dawn periods carry the largest systematic over-forecast."
          />
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spSeries} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="2 6" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={11} tick={{ fontSize: 9 }} />
                <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 9 }} />
                <Tooltip cursor={{ fill: "rgba(255,107,129,0.08)" }} content={<ChartTip labelFormatter={(l: any) => `Settlement ${l}`} />} />
                <ReferenceLine y={0} stroke="#2b3b61" />
                <Bar dataKey="bias" name="Bias (MW)" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                  {spSeries.map((s, i) => (
                    <Cell key={i} fill={s.bias >= 0 ? "#ff8fa3" : "#5cc8ff"} fillOpacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 border-t border-line pt-3 font-mono text-[9.5px] uppercase tracking-wider text-faint">Averaged across all 31 delivery days · SP1 = 00:00, SP48 = 23:30</p>
        </section>
      </div>

      {/* ============ per-day scorecard table ============ */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-teal">Day-by-day scorecard · sortable</p>
            <h2 className="mt-0.5 font-display text-[15px] font-semibold text-ink">31 delivery days, ranked your way</h2>
          </div>
          <p className="font-mono text-[10px] text-faint">click column headers to sort</p>
        </div>
        <div className="max-h-[430px] overflow-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th><button className="flex items-center gap-1" onClick={() => toggleSort("date")}>Delivery <SortIcon k="date" /></button></th>
                <th>Publish (D−1)</th>
                <th><button className="flex items-center gap-1" onClick={() => toggleSort("mae")}>MAE MW <SortIcon k="mae" /></button></th>
                <th><button className="flex items-center gap-1" onClick={() => toggleSort("rmse")}>RMSE MW <SortIcon k="rmse" /></button></th>
                <th><button className="flex items-center gap-1" onClick={() => toggleSort("bias")}>Bias MW <SortIcon k="bias" /></button></th>
                <th>Bias %</th>
                <th><button className="flex items-center gap-1" onClick={() => toggleSort("mape")}>MAPE % <SortIcon k="mape" /></button></th>
                <th><button className="flex items-center gap-1" onClick={() => toggleSort("r2")}>R² <SortIcon k="r2" /></button></th>
                <th>≤20%</th>
                <th><button className="flex items-center gap-1" onClick={() => toggleSort("energyErrorMWh")}>Energy err. GWh <SortIcon k="energyErrorMWh" /></button></th>
              </tr>
            </thead>
            <tbody className="tabular">
              {days.map((d) => {
                const isHover = hoverDay === d.date;
                return (
                  <tr key={d.date} onMouseEnter={() => setHoverDay(d.date)} onMouseLeave={() => setHoverDay(null)} className={isHover ? "bg-teal/5" : ""}>
                    <td className="font-medium text-ink">{fmtDateShort(d.date)} <span className="text-faint">Jan</span></td>
                    <td className="text-dim">{fmtClock(d.publishTime)}</td>
                    <td className="text-amber">{fmtNum(d.mae, 0)}</td>
                    <td className="text-dim">{fmtNum(d.rmse, 0)}</td>
                    <td style={{ color: signedColor(d.bias) }}>{d.bias >= 0 ? "+" : ""}{fmtNum(d.bias, 0)}</td>
                    <td className="text-dim">{d.biasPct >= 0 ? "+" : ""}{fmtNum(d.biasPct, 1)}%</td>
                    <td className="text-dim">{fmtNum(d.mape ?? 0, 1)}</td>
                    <td className="text-dim">{fmtNum(d.r2, 3)}</td>
                    <td className="text-dim">{fmtNum(d.within20Pct, 0)}%</td>
                    <td style={{ color: signedColor(d.energyErrorMWh) }}>{d.energyErrorMWh >= 0 ? "+" : ""}{fmtNum(d.energyErrorMWh / 1000, 2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============ worst misses + error ladder ============ */}
      <div className="grid gap-5 xl:grid-cols-5">
        <section className="card overflow-hidden xl:col-span-3">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <div>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-rose">Where it broke · 12 worst half-hours</p>
              <h2 className="mt-0.5 font-display text-[15px] font-semibold text-ink">The day-ahead forecast&rsquo;s worst misses</h2>
            </div>
            <span className="chip border-rose/40 bg-rose/10 text-rose">all over-forecasts</span>
          </div>
          <div className="max-h-[330px] overflow-auto">
            <table className="data-table">
              <thead>
                <tr><th>Delivery period</th><th>SP</th><th>Actual MW</th><th>Forecast MW</th><th>Error MW</th><th>Error %</th></tr>
              </thead>
              <tbody className="tabular">
                {metrics.worstMisses.map((w, i) => (
                  <tr key={i}>
                    <td className="font-medium text-ink">{fmtDateShort(w.deliveryDate)} · {fmtClock(w.startTime)}</td>
                    <td className="text-dim">{w.settlementPeriod}</td>
                    <td className="text-teal">{w.actual.toLocaleString("en-GB")}</td>
                    <td className="text-amber">{Math.round(w.forecast).toLocaleString("en-GB")}</td>
                    <td className="font-semibold text-rose">+{fmtNum(w.error, 0)}</td>
                    <td className="text-rose">+{fmtNum(w.pctError ?? 0, 1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- absolute-error ladder ---- */}
        <section className="card p-5 xl:col-span-2">
          <SectionHead
            eyebrow="Risk margins for the buy"
            title="Absolute-error ladder"
            sub="Use these as symmetric margins when sizing thermal backstop volume."
          />
          <div className="space-y-2.5">
            {[
              { l: "P50 — median", v: o.p50AbsError, pct: 50, tone: "#2fe3c0" },
              { l: "P80 — common stress", v: o.p80AbsError, pct: 80, tone: "#5cc8ff" },
              { l: "P90 — 1-in-10 tail", v: o.p90AbsError, pct: 90, tone: "#ffb454" },
              { l: "P95 — 1-in-20 tail", v: o.p95AbsError, pct: 95, tone: "#ff8fa3" },
              { l: "Max — January worst", v: o.maxAbsError, pct: 100, tone: "#ff6b81" },
            ].map((r) => (
              <div key={r.l}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-dim">{r.l}</span>
                  <span className="font-mono text-[12px] font-semibold text-ink tabular">±{fmtNum(r.v, 0)} MW</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-panel-3">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (r.v / o.maxAbsError) * 100)}%`, background: r.tone, boxShadow: `0 0 10px ${r.tone}55` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-line bg-panel-2/60 p-3.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">Reading the month as a desk</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-dim">
              January 2026 closed <span className="text-ink">+15.9% above reality</span> across {o.n.toLocaleString("en-GB")} half-hours.
              A desk that de-rated the day-ahead signal by the measured bias would have recovered ≈ <span className="text-teal">1,368 GWh</span> of
              over-procured energy — roughly <span className="text-ink">£100M+ at typical January peak power prices</span>. This is the case for making bias-correction a standing step in the buy.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
