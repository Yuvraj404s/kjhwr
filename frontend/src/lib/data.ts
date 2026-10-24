// Typed access to the precomputed Elexon BMRS extracts in /public/data/*.json.
// All computation happens offline in backend/scripts/fetch_and_process.py.

export interface ActualPoint {
  startTime: string;
  generation: number;
}
export interface DaPoint {
  startTime: string;
  settlementPeriod: number;
  deliveryDate: string;
  actual: number;
  forecast: number;
  publishTime: string;
  leadHours: number;
}
export interface LeadBucket {
  n: number;
  mae: number;
  rmse: number;
  bias: number;
  biasPct: number;
  mape: number | null;
  r: number;
  r2: number;
  within10Pct: number;
  within20Pct: number;
  within250MW: number;
  meanActual: number;
  meanForecast: number;
  maxOverforecast: number;
  maxUnderforecast: number;
  leadLo: number;
  leadHi: number;
  leadMid: number;
}
export interface DayStat {
  n: number;
  mae: number;
  rmse: number;
  bias: number;
  biasPct: number;
  mape: number | null;
  r: number;
  r2: number;
  within10Pct: number;
  within20Pct: number;
  within250MW: number;
  meanActual: number;
  meanForecast: number;
  maxOverforecast: number;
  maxUnderforecast: number;
  date: string;
  publishTime: string;
  energyErrorMWh: number;
  actualEnergyMWh: number;
  forecastEnergyMWh: number;
}
export interface SpStat {
  n: number;
  mae: number;
  bias: number;
  biasPct: number;
  mape: number | null;
  r: number;
  within20Pct: number;
  settlementPeriod: number;
  hour: number;
  meanActual: number;
  meanForecast: number;
}
export interface HistBin {
  binStart: number;
  binEnd: number;
  binMid: number;
  count: number;
}
export interface WorstMiss {
  startTime: string;
  deliveryDate: string;
  settlementPeriod: number;
  actual: number;
  forecast: number;
  error: number;
  absError: number;
  pctError: number | null;
}
export interface OverallStat {
  n: number;
  mae: number;
  rmse: number;
  bias: number;
  biasPct: number;
  mape: number | null;
  r: number;
  r2: number;
  within10Pct: number;
  within20Pct: number;
  within250MW: number;
  meanActual: number;
  meanForecast: number;
  maxOverforecast: number;
  maxUnderforecast: number;
  p50AbsError: number;
  p80AbsError: number;
  p90AbsError: number;
  p95AbsError: number;
  maxAbsError: number;
  stdError: number;
}
export interface EvolutionRun {
  publishTime: string;
  leadHoursAtStart: number;
  values: number[];
}
export interface EvolutionBand {
  p10: number;
  p50: number;
  p90: number;
  min: number;
  max: number;
}
export interface EvolutionDay {
  deliveryDate: string;
  times: string[];
  actual: (number | null)[];
  nRuns: number;
  runs: EvolutionRun[];
  band: (EvolutionBand | null)[];
}
export interface Metrics {
  overall: OverallStat;
  leadCurve: LeadBucket[];
  perDay: DayStat[];
  perSettlementPeriod: SpStat[];
  errorHistogram: HistBin[];
  worstMisses: WorstMiss[];
  decisionPublishByDay: Record<string, string | null>;
  decisionHourUTC: number;
  evolution: EvolutionDay[];
}
export interface Meta {
  generatedAt: string;
  source: string;
  datasets: {
    actual: { endpoint: string; filter: string; resolution: string; unit: string; url: string };
    forecast: { endpoint: string; filter: string; resolution: string; unit: string; url: string };
  };
  scope: string;
  decisionRule: string;
  nActualPoints: number;
  nForecastRuns: number;
  nDayAheadPoints: number;
  nEvolutionDays: number;
  caveats: string[];
}
export interface LatestForecast {
  publishTime: string;
  nPoints: number;
  horizonStart: string;
  horizonEnd: string;
  usedForDeliveryDate: string;
  points: { startTime: string; forecast: number }[];
}

export interface WindData {
  actuals: ActualPoint[];
  da: DaPoint[];
  metrics: Metrics;
  meta: Meta;
  latest: LatestForecast | null;
}

async function j<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

const dataPath = (snapshotPath: string, apiPath: string) =>
  import.meta.env.VITE_DATA_SOURCE === "api" ? apiPath : snapshotPath;

let cache: Promise<WindData> | null = null;
export function loadData(): Promise<WindData> {
  if (!cache) {
    cache = (async () => {
      const [actuals, da, metrics, meta, latest] = await Promise.all([
        j<ActualPoint[]>(dataPath("/data/actuals.json", "/api/actuals")),
        j<DaPoint[]>(dataPath("/data/forecast_da.json", "/api/forecast-da")),
        j<Metrics>(dataPath("/data/metrics.json", "/api/metrics")),
        j<Meta>(dataPath("/data/meta.json", "/api/meta")),
        j<LatestForecast>(dataPath("/data/latest_forecast.json", "/api/latest")).catch(() => null),
      ]);
      return { actuals, da, metrics, meta, latest };
    })();
  }
  return cache;
}

/* ---------------- formatting helpers ---------------- */
export const fmtMW = (v: number | null | undefined, dp = 0) =>
  v == null || Number.isNaN(v) ? "—" : `${v.toLocaleString("en-GB", { maximumFractionDigits: dp, minimumFractionDigits: dp })} MW`;

export const fmtNum = (v: number | null | undefined, dp = 1) =>
  v == null || Number.isNaN(v) ? "—" : v.toLocaleString("en-GB", { maximumFractionDigits: dp, minimumFractionDigits: dp });


const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDateShort(isoDay: string) {
  const [y, m, d] = isoDay.split("-").map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]}`;
}
export function fmtDateFull(isoDay: string) {
  const [y, m, d] = isoDay.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d));
  return dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
export function fmtClock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}
export function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" })} · ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
}
export function settlementLabel(hourFloat: number) {
  const h = Math.floor(hourFloat);
  const m = hourFloat % 1 === 0.5 ? "30" : "00";
  return `${String(h).padStart(2, "0")}:${m}`;
}


export function signedColor(v: number) {
  if (v > 150) return "#ff8fa3";
  if (v < -150) return "#7fd4ff";
  return "#93a3c4";
}
