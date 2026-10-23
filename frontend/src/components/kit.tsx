import type { ReactNode } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ============ Section heading ============ */
export function SectionHead({
  eyebrow,
  title,
  right,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
      <div>
        <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-teal">{eyebrow}</p>
        <h2 className="mt-1 font-display text-lg font-semibold leading-tight text-ink sm:text-xl">{title}</h2>
        {sub && <p className="mt-1 max-w-2xl text-[12px] leading-snug text-dim">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

/* ============ KPI stat card ============ */
export function Stat({
  label,
  value,
  unit,
  icon: Icon,
  tone = "teal",
  foot,
  delta,
  deltaGood,
}: {
  label: string;
  value: string;
  unit?: string;
  icon?: LucideIcon;
  tone?: "teal" | "amber" | "rose" | "sky" | "violet" | "lime";
  foot?: string;
  delta?: string;
  deltaGood?: boolean | null;
}) {
  const tones: Record<string, string> = {
    teal: "text-teal border-teal/30 bg-teal/10",
    amber: "text-amber border-amber/30 bg-amber/10",
    rose: "text-rose border-rose/30 bg-rose/10",
    sky: "text-sky border-sky/30 bg-sky/10",
    violet: "text-violet border-violet/30 bg-violet/10",
    lime: "text-lime border-lime/30 bg-lime/10",
  };
  const iconTone: Record<string, string> = {
    teal: "text-teal",
    amber: "text-amber",
    rose: "text-rose",
    sky: "text-sky",
    violet: "text-violet",
    lime: "text-lime",
  };
  return (
    <div className="card card-hover group p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-[10px] font-medium uppercase leading-relaxed tracking-[0.16em] text-faint">{label}</p>
        {Icon && (
          <span className={`rounded-lg border p-1.5 ${tones[tone]} transition-transform duration-300 group-hover:scale-110`}>
            <Icon className={`h-4 w-4 ${iconTone[tone]}`} strokeWidth={1.75} />
          </span>
        )}
      </div>
      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className="font-display text-[26px] font-semibold leading-none tracking-tight text-ink tabular sm:text-[30px]">
          {value}
        </span>
        {unit && <span className="font-mono text-[11px] font-medium text-dim">{unit}</span>}
      </div>
      <div className="mt-2 flex min-h-[16px] items-center gap-2">
        {delta && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-medium ${
              deltaGood === true
                ? "bg-teal/10 text-teal"
                : deltaGood === false
                  ? "bg-rose/10 text-rose"
                  : "bg-panel-3 text-dim"
            }`}
          >
            {deltaGood === true ? (
              <TrendingDown className="h-3 w-3" />
            ) : deltaGood === false ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {delta}
          </span>
        )}
        {foot && <p className="text-[10.5px] leading-tight text-faint">{foot}</p>}
      </div>
    </div>
  );
}

/* ============ Chart tooltip ============ */
export function ChartTip({ active, payload, label, labelFormatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line-2 bg-[#0d1626]/95 px-3 py-2 shadow-2xl backdrop-blur">
      {label !== undefined && (
        <p className="mb-1.5 border-b border-line pb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-teal">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[11px] text-dim">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.stroke || p.fill || p.color || "#2fe3c0" }} />
              {p.name}
            </span>
            <span className="font-mono text-[11px] font-semibold text-ink tabular">
              {typeof p.value === "number" ? p.value.toLocaleString("en-GB", { maximumFractionDigits: 1 }) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ Legend dot ============ */
export function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-dim">
      <svg width="18" height="8" viewBox="0 0 18 8" aria-hidden>
        <line x1="0" y1="4" x2="18" y2="4" stroke={color} strokeWidth="2.4" strokeDasharray={dashed ? "4 3" : undefined} strokeLinecap="round" />
      </svg>
      {label}
    </span>
  );
}

/* ============ Empty-ish note ============ */
export function Note({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[11.5px] leading-snug ${
        tone === "warn" ? "border-amber/30 bg-amber/5 text-amber/90" : "border-line bg-panel-2/50 text-dim"
      }`}
    >
      {children}
    </div>
  );
}
