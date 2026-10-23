import { type ReactNode } from "react";
import { DataProvider, useDataReady } from "../lib/useData";
import { Zap, AlertTriangle } from "lucide-react";

function LoadingState() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 py-20">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border border-line border-t-teal" style={{ borderTopColor: "#2fe3c0", borderColor: "#1c2946" }} />
        <Zap className="h-6 w-6 text-teal" strokeWidth={1.75} />
      </div>
      <div className="text-center">
        <p className="font-display text-sm tracking-wide text-ink">Loading Elexon BMRS extract…</p>
        <p className="mt-1 font-mono text-[11px] text-faint">FUELHH · WINDFOR · Jan 2026 (1,488 settlement periods)</p>
      </div>
      <div className="grid w-full max-w-3xl grid-cols-3 gap-3 px-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton h-20 w-full" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: Error }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20 text-center">
      <AlertTriangle className="h-8 w-8 text-amber" />
      <p className="font-display text-lg text-ink">Couldn&rsquo;t load the precomputed dataset</p>
      <p className="max-w-md font-mono text-xs text-dim">{error.message}</p>
    </div>
  );
}

function Ready({ children }: { children: ReactNode }) {
  const { data, error } = useDataReady();
  if (error) return <ErrorState error={error} />;
  if (!data) return <LoadingState />;
  return <>{children}</>;
}

/** Wrap a page element with the data provider + loading boundary */
export function Gate({ children }: { children: ReactNode }) {
  return (
    <DataProvider>
      <Ready>{children}</Ready>
    </DataProvider>
  );
}

