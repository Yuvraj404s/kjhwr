import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loadData, type WindData } from "./data";

const Ctx = createContext<WindData | null>(null);
const ErrCtx = createContext<Error | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WindData | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    loadData()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e as Error));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <ErrCtx.Provider value={error}>
      <Ctx.Provider value={data}>{children}</Ctx.Provider>
    </ErrCtx.Provider>
  );
}

export function useWind(): WindData {
  const d = useContext(Ctx);
  const err = useContext(ErrCtx);
  if (err) throw err;
  if (!d) throw new Error("Data not ready — render inside <Gate>");
  return d;
}

export function useDataReady() {
  return { data: useContext(Ctx), error: useContext(ErrCtx) };
}
