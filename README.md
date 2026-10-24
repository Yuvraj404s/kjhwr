# WindScope DA — GB Day-Ahead Wind Intelligence

An app for a UK utility's **Day-Ahead Power Procurement Desk**: it shows the **latest decision-grade national wind forecast** for every settlement period of **January 2026**, and quantifies **how wrong that forecast was** against metered reality.

Data source (public, no auth) — **Elexon BMRS**:
- `FUELHH` — metered half-hourly wind generation (`fuelType == "WIND"`)
- `WINDFOR` — national wind forecasts, published ~8× per day, 72h horizon, hourly

**Live app:** https://windscope-da.vercel.app

---

## Run it locally

### Option A — Web app only (React + TypeScript + Tailwind v4 + Vite)
```bash
cd frontend
npm install
npm run build        # production build → frontend/dist/
npm run preview     # serve the build locally
```

### Option B — Full stack with Docker (frontend + Python API)
```bash
docker compose up --build
# Web app  → http://localhost:8080   (nginx SPA; loads data through the API)
# Python API → http://localhost:8000/api/health   (FastAPI)
# Backend refreshes the Elexon inputs and recomputes the dataset before serving requests.
```
The refresh re-fetches the app's fixed January 2026 analysis period; it is not a continuously updated forecast for the current day.

### Option C — Python backend only - REST API (FastAPI)
```bash
pip install -r backend/server/requirements.txt
cd backend
uvicorn server.main:app --port 8000
# try: curl localhost:8000/api/meta
```
Endpoints: `/api/health` · `/api/meta` · `/api/actuals` · `/api/forecast-da?date=2026-01-12` · `/api/metrics` · `/api/evolution?date=2026-01-12` · `/api/latest`

### Regenerate the data manually - Python ETL / analytics (stdlib + urllib only — no pandas/numpy needed)
The app ships with a precomputed snapshot in `frontend/public/data/*.json` for frontend-only use. To rebuild it from Elexon manually:
```bash
python3 backend/scripts/fetch_and_process.py
# pulls FUELHH + WINDFOR from Elexon (caches raw JSON in backend/data/raw/),
# interpolates hourly forecasts onto the 30-min settlement grid,
# applies the decision-time rule (latest publish ≤ 10:00 UTC on D−1),
# computes every metric and writes frontend/public/data/*.json
```
In Docker Compose full-stack mode, this ETL runs automatically on backend startup and refreshes the Elexon inputs rather than using the ETL raw-data cache.

## What's inside
- **Overview** — January 2026 at a glance: 8.62 TWh metered, +1.84 GW (+15.9%) day-ahead over-forecast, R² = 0.86, P90 |err| = 4,334 MW.
- **Decision Desk** — the forecast the desk held at gate closure for each delivery day, vs. what the meter delivered; error heatmap, forecast-evolution "spaghetti", bias de-rate calculator, P50/P90 backstop sizing, CSV export.
- **Accuracy Lab** — the full error contract: MAE 2,108 MW · RMSE 2,610 MW · bias +1,840 MW · MAPE 21.9% · R² 0.862 · day-by-day scorecard · worst misses · lead-time error decay. All decision-time, look-ahead-free.
- **Methodology** — the client pitch, the technical deep-dive, validation evidence and caveats.

## Key method (short version)
For each delivery day **D**, the evaluated forecast is the **latest WINDFOR publish ≤ 10:00 UTC on D−1** (the GB day-ahead gate closure). Hourly forecasts are linearly interpolated onto the 30-minute settlement grid — never nearest-neighbour — and every metric is computed on that decision-time signal vs. metered actuals.

**Caveats:** WINDFOR is indicative and does not reconcile 1:1 with embedded generation (that offset *is* the measured bias). National wind only. Times UTC. January 2026 actuals near-final. Analytical aid, not trading advice.

---

## Repository layout
```
docker-compose.yml               full stack: :8080 web + :8000 api
backend/
  scripts/                       Python ETL + analytics engine (stdlib only)
  server/                        FastAPI REST API and dependencies
  data/                          ETL raw-data cache
  Dockerfile                     containerised Python backend
frontend/
  index.html                     app shell (title, favicon, fonts)
  nginx.conf                     SPA + gzip + cache headers
  Dockerfile                     frontend build (node → nginx)
  src/                           React 19 + TypeScript + Tailwind v4 SPA
    App.tsx                      routes (Overview · Decision Desk · Accuracy Lab · Methodology)
    main.tsx, index.css          entry + theme
    lib/data.ts                  typed data contracts + loaders/formatters
    lib/useData.tsx              data context + loading gate
    components/                  Layout (nav shell), kit (Stat/chart primitives), ui (loading gate)
    pages/                       Overview · DecisionDesk · AccuracyLab · Methodology
  public/
    images/                      hero image assets
    favicon.svg                  WindScope logo
    data/*.json                  precomputed Elexon extract (actuals, decision-time forecast, metrics, evolution, latest)
```

## AI tools used
Yes — AI assistance was used, as explicitly allowed by the brief: **Perplexity** for Elexon BMRS API reconnaissance, domain research (day-ahead gate closure, settlement periods, WINDFOR/FUELHH semantics), product framing and copy; **OpenAI gpt-image-1.5** for the hero image; AI code generation for the React/TypeScript/Python implementation, which was then reviewed and validated by hand (decision-time leakage guard, hourly→settlement interpolation, spot-checks against the raw BMRS API). All statistics are computed from real, reproducible data — none are LLM-generated.

Contains public data from **Elexon BMRS** (© Elexon Limited).

Built for the UK day-ahead power procurement use-case · v0.1.0
