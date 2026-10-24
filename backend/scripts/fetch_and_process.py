#!/usr/bin/env python3
"""
ETL pipeline for the WindScope product.

Pulls real, public data from Elexon BMRS (no auth required):

  FUELHH  -> actual metered half-hourly wind generation   (fuelType == "WIND")
  WINDFOR -> national wind power forecasts (multiple publish times per day,
             horizon up to ~72h ahead)

Scope (per product requirement): January 2026, national level UK wind.

The day-ahead purchase decision for delivery day D is made at ~10:00 on D-1,
so we reconstruct the EXACT forecast that would have been available to the
trader at decision time for every delivery period of January 2026. This is
what makes the forecast-vs-actual evaluation honest (no look-ahead bias).

Outputs (written to frontend/public/data/):
  actuals.json         actual 30-min wind generation, Jan 2026
  forecast_da.json     the day-ahead forecast run (decision time) vs actuals
  latest_forecast.json     day-ahead decision-time forecast vs actuals
  metrics.json         full accuracy evaluation (point + probabilistic-ish)
  meta.json            provenance / freshness / caveats

No third-party heavy deps beyond `requests`; analysis is pure Python (stdlib).
"""
import json
import math
import os
import time
import urllib.request
from datetime import datetime, timedelta, timezone

BASE = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
RAW = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "data")
FORCE_REFRESH = os.environ.get("WINDSCOPE_REFRESH_ON_START", "0") == "1"
os.makedirs(RAW, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

UTC = timezone.utc

def http_json(url, cache_name, retries=3):
    cache_path = os.path.join(RAW, cache_name)
    if os.path.exists(cache_path) and not FORCE_REFRESH:
        with open(cache_path) as f:
            return json.load(f)
    last_err = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json",
                                                        "User-Agent": "windscope-etl/1.0"})
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = resp.read().decode()
            parsed = json.loads(data)
            with open(cache_path, "w") as f:
                f.write(data)
            return parsed
        except Exception as e:  # noqa: BLE001
            last_err = e
            print(f"  attempt {attempt+1} failed for {cache_name}: {e}", flush=True)
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url}: {last_err}")

def parse_dt(s):
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=UTC)

def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

# ---------------------------------------------------------------- actuals
def fetch_actuals():
    print("Fetching FUELHH actuals (WIND) for Jan 2026 + tail of Dec 2025 ...")
    url = f"{BASE}/FUELHH/stream?settlementDateFrom=2025-12-25&settlementDateTo=2026-02-01&fuelType=WIND"
    rows = http_json(url, "fuelhh_wind.json")
    out = {}
    for r in rows:
        if r.get("fuelType") != "WIND":
            continue
        st = parse_dt(r["startTime"])
        # keep actuals for delivery periods starting in Jan 2026 (and a little history)
        if st >= datetime(2025, 12, 25, tzinfo=UTC) and st < datetime(2026, 2, 1, tzinfo=UTC):
            out[iso(st)] = r["generation"]
    print(f"  got {len(out)} half-hour actual points")
    return out

# ---------------------------------------------------------------- forecasts
def fetch_forecasts_for_day(day):
    """Fetch all WINDFOR publishes for a single UTC publish date."""
    d0 = day.strftime("%Y-%m-%d")
    d1 = (day + timedelta(days=1)).strftime("%Y-%m-%d")
    url = (f"{BASE}/WINDFOR/stream?publishDateTimeFrom={d0}T00:00:00Z"
           f"&publishDateTimeTo={d1}T00:00:00Z")
    return http_json(url, f"windfor_{d0}.json")

def fetch_all_forecasts():
    # A forecast published on day P covers delivery day P+1.
    # The day-ahead decision for delivery date D is made on D-1.
    # We need publishes from 2025-12-30 (for D=2026-01-01) through 2026-01-31.
    start = datetime(2025, 12, 30, tzinfo=UTC)
    end = datetime(2026, 2, 1, tzinfo=UTC)
    all_rows = []
    day = start
    while day < end:
        print(f"Fetching WINDFOR publishes for {day.strftime('%Y-%m-%d')} ...", flush=True)
        try:
            rows = fetch_forecasts_for_day(day)
            all_rows.extend(rows)
        except Exception as e:  # noqa: BLE001
            if FORCE_REFRESH:
                raise RuntimeError(f"Could not refresh WINDFOR data for {day.date()}") from e
            print(f"  WARNING: could not fetch {day.date()}: {e}", flush=True)
        day += timedelta(days=1)
        time.sleep(0.4)
    print(f"Total WINDFOR rows fetched: {len(all_rows)}")
    return all_rows

# ---------------------------------------------------------------- model
def build_model(actuals, fc_rows):
    # index forecasts: publish_time -> {start_time: gen}
    publishes = {}
    for r in fc_rows:
        pub = parse_dt(r["publishTime"])
        st = parse_dt(r["startTime"])
        publishes.setdefault(pub, {})[iso(st)] = r["generation"]
    pub_times = sorted(publishes.keys())

    from bisect import bisect_left
    import math as _math

    def make_interpolator(fc_dict):
        """Linear interpolation of an hourly WINDFOR run onto arbitrary timestamps.

        WINDFOR publishes hourly values; actuals are half-hourly. Half-hourly
        targets are placed halfway between the two bracketing hourly forecasts.
        Extrapolation outside the published horizon clamps to the nearest value.
        """
        keys = sorted(fc_dict.keys())
        times = [parse_dt(k).timestamp() for k in keys]
        vals = [fc_dict[k] for k in keys]

        def interp(t):
            ts = t.timestamp()
            i = bisect_left(times, ts)
            if i == 0:
                return vals[0]
            if i >= len(times):
                return vals[-1]
            t_lo, t_hi = times[i - 1], times[i]
            v_lo, v_hi = vals[i - 1], vals[i]
            if t_hi == t_lo:
                return v_hi
            frac = (ts - t_lo) / (t_hi - t_lo)
            return v_lo + frac * (v_hi - v_lo)
        return interp
    print(f"Distinct publish runs: {len(pub_times)}")

    jan_start = datetime(2026, 1, 1, tzinfo=UTC)
    jan_end = datetime(2026, 2, 1, tzinfo=UTC)

    # Day-ahead decision time: 10:00 UTC on D-1 (gate closure for the GB
    # day-ahead auction is 11:00 London / 10:00 UTC; we use 10:00 UTC).
    DECISION_HOUR = 10

    def decision_time_for(delivery_date):
        return datetime(delivery_date.year, delivery_date.month, delivery_date.day,
                        DECISION_HOUR, tzinfo=UTC) - timedelta(days=1)

    def latest_publish_before(t):
        # latest publish <= t
        best = None
        for p in pub_times:
            if p <= t:
                best = p
            else:
                break
        return best

    # Build the day-ahead (decision-time) forecast series for delivery periods in Jan 2026
    da_points = []  # dicts: start, actual, forecast, publishTime, leadHours, runType
    delivery_days = []
    d = jan_start
    while d < jan_end:
        delivery_days.append(d)
        d += timedelta(days=1)

    used_pub_by_day = {}
    for dd in delivery_days:
        dt_time = decision_time_for(dd)
        pub = latest_publish_before(dt_time)
        used_pub_by_day[dd.date().isoformat()] = iso(pub) if pub else None
        if pub is None:
            continue
        interp = make_interpolator(publishes[pub])
        # settlement periods for day dd: 00:00..23:30 UTC
        for sp in range(48):
            st = datetime(dd.year, dd.month, dd.day, tzinfo=UTC) + timedelta(minutes=30 * sp)
            key = iso(st)
            if key in actuals:
                lead = (st - pub).total_seconds() / 3600.0
                da_points.append({
                    "startTime": key,
                    "settlementPeriod": sp + 1,
                    "deliveryDate": dd.date().isoformat(),
                    "actual": actuals[key],
                    "forecast": round(interp(st), 1),
                    "publishTime": iso(pub),
                    "leadHours": round(lead, 2),
                })
    print(f"Day-ahead decision-time points: {len(da_points)}")

    # ------------------------------------------------ metrics
    def err_stats(points):  # noqa: E306
        errs = [p["forecast"] - p["actual"] for p in points]
        abserr = [abs(e) for e in errs]
        n = len(errs)
        if n == 0:
            return {}
        mae = sum(abserr) / n
        rmse = math.sqrt(sum(e * e for e in errs) / n)
        bias = sum(errs) / n
        mape_vals = [abs(e) / p["actual"] for p, e in zip(points, errs) if p["actual"] > 200]
        mape = 100 * sum(mape_vals) / len(mape_vals) if mape_vals else None
        mbe_pct = 100 * bias / (sum(p["actual"] for p in points) / n)
        within10 = sum(1 for p in points if p["actual"] > 200 and abs(p["forecast"] - p["actual"]) / p["actual"] <= 0.10) / max(1, sum(1 for p in points if p["actual"] > 200))
        within20 = sum(1 for p in points if p["actual"] > 200 and abs(p["forecast"] - p["actual"]) / p["actual"] <= 0.20) / max(1, sum(1 for p in points if p["actual"] > 200))
        exact_half = sum(1 for p in points if abs(p["forecast"] - p["actual"]) <= 250) / n  # within 250 MW
        # correlation
        ma = sum(p["actual"] for p in points) / n
        mf = sum(p["forecast"] for p in points) / n
        cov = sum((p["actual"] - ma) * (p["forecast"] - mf) for p in points) / n
        va = sum((p["actual"] - ma) ** 2 for p in points) / n
        vf = sum((p["forecast"] - mf) ** 2 for p in points) / n
        r = cov / math.sqrt(va * vf) if va > 0 and vf > 0 else 0.0
        r2 = r * r
        return {
            "n": n, "mae": round(mae, 1), "rmse": round(rmse, 1), "bias": round(bias, 1),
            "biasPct": round(mbe_pct, 2), "mape": round(mape, 2) if mape else None,
            "r": round(r, 4), "r2": round(r2, 4),
            "within10Pct": round(100 * within10, 1), "within20Pct": round(100 * within20, 1),
            "within250MW": round(100 * exact_half, 1),
            "meanActual": round(ma, 1), "meanForecast": round(mf, 1),
            "maxOverforecast": round(max(errs), 1), "maxUnderforecast": round(min(errs), 1),
        }


    # --- lead-time (horizon) error curve, computed on the settlements grid.
    # For every publish run, interpolate to settlement periods and pair with actuals.
    # Uses ALL runs (264) — shows how error grows with lead time.
    lead_buckets = [(0, 6), (6, 12), (12, 18), (18, 24), (24, 30), (30, 36), (36, 48), (48, 72)]
    lead_curve = []
    all_pairs = []
    for p in pub_times:
        interp = make_interpolator(publishes[p])
        t = jan_start - timedelta(hours=6)
        end = jan_end + timedelta(hours=6)
        while t < end:
            key = iso(t)
            a = actuals.get(key)
            if a is not None:
                lead = (t - p).total_seconds() / 3600.0
                if 0 <= lead < 72:
                    all_pairs.append({"actual": a, "forecast": interp(t), "leadHours": lead})
            t += timedelta(hours=2)  # sub-sample to keep memory small but statistically solid
    for lo, hi in lead_buckets:
        pts = [p for p in all_pairs if lo <= p["leadHours"] < hi]
        if pts:
            s = err_stats(pts)
            s["leadLo"] = lo
            s["leadHi"] = hi
            s["leadMid"] = (lo + hi) / 2
            lead_curve.append(s)

    # --- forecast evolution per delivery day (for the "spaghetti / consensus" view)
    # For each delivery day D in Jan 2026, collect every publish that contained D
    # in its horizon. Frontend renders these as thin lines vs. the actual profile.
    evolution = []
    d = jan_start
    while d < jan_end:
        day_key = d.date().isoformat()
        day_end = d + timedelta(days=1)
        # half-hourly timestamps for the day
        ts_list = []
        t = d
        while t < day_end:
            ts_list.append(t)
            t += timedelta(minutes=30)
        day_actual = [actuals.get(iso(t)) for t in ts_list]
        runs = []
        for p in pub_times:
            # only runs published BEFORE the delivery day starts (that's the decision-relevant history)
            if p >= day_end:
                continue
            interp = make_interpolator(publishes[p])
            vals = [round(interp(t), 1) for t in ts_list]
            lead0 = (d - p).total_seconds() / 3600.0
            # keep runs published within 3.5 days before delivery day starts (plenty of history)
            if lead0 > 24 * 3.5:
                continue
            runs.append({"publishTime": iso(p), "leadHoursAtStart": round(lead0, 1),
                         "values": vals})
        # cross-run summary bands at each settlement period
        band = []
        for i in range(len(ts_list)):
            col = sorted(r["values"][i] for r in runs)
            if col:
                def q(qq):
                    idx = (len(col) - 1) * qq
                    lo_i = int(math.floor(idx)); hi_i = int(math.ceil(idx))
                    if lo_i == hi_i:
                        return round(col[lo_i], 1)
                    frac = idx - lo_i
                    return round(col[lo_i] + frac * (col[hi_i] - col[lo_i]), 1)
                band.append({"p10": q(0.1), "p50": q(0.5), "p90": q(0.9),
                             "min": round(col[0], 1), "max": round(col[-1], 1)})
            else:
                band.append(None)
        evolution.append({"deliveryDate": day_key,
                          "times": [iso(t) for t in ts_list],
                          "actual": day_actual,
                          "nRuns": len(runs),
                          "runs": runs,
                          "band": band})
        d += timedelta(days=1)

    overall = err_stats(da_points)
    per_day = []
    by_date = {}
    for p in da_points:
        by_date.setdefault(p["deliveryDate"], []).append(p)
    for date_key in sorted(by_date):
        s = err_stats(by_date[date_key])
        s["date"] = date_key
        s["publishTime"] = by_date[date_key][0]["publishTime"]
        # daily total energy error in MWh (sum of MW over half hours = MWh/2)
        day_err_mwh = sum(p["forecast"] - p["actual"] for p in by_date[date_key]) * 0.5
        s["energyErrorMWh"] = round(day_err_mwh, 1)
        s["actualEnergyMWh"] = round(sum(p["actual"] for p in by_date[date_key]) * 0.5, 1)
        s["forecastEnergyMWh"] = round(sum(p["forecast"] for p in by_date[date_key]) * 0.5, 1)
        per_day.append(s)

    # by settlement period (intra-day profile of error)
    per_sp = []
    for sp in range(1, 49):
        pts = [p for p in da_points if p["settlementPeriod"] == sp]
        if pts:
            s = err_stats(pts)
            s["settlementPeriod"] = sp
            s["hour"] = (sp - 1) * 0.5
            per_sp.append(s)

    # error distribution histogram (day-ahead)
    errs = [p["forecast"] - p["actual"] for p in da_points]
    if errs:
        lo, hi = min(errs), max(errs)
        nbins = 25
        width = (hi - lo) / nbins if hi > lo else 1
        hist = []
        for i in range(nbins):
            a = lo + i * width
            b = a + width
            cnt = sum(1 for e in errs if (a <= e < b) or (i == nbins - 1 and e == b))
            hist.append({"binStart": round(a, 1), "binEnd": round(b, 1),
                         "binMid": round((a + b) / 2, 1), "count": cnt})
    else:
        hist = []

    # extremes table (worst 12 day-ahead misses)
    worst = sorted(da_points, key=lambda p: abs(p["forecast"] - p["actual"]), reverse=True)[:12]
    worst = [{"startTime": p["startTime"], "deliveryDate": p["deliveryDate"],
              "settlementPeriod": p["settlementPeriod"],
              "actual": p["actual"], "forecast": p["forecast"],
              "error": p["forecast"] - p["actual"],
              "absError": abs(p["forecast"] - p["actual"]),
              "pctError": round(100 * (p["forecast"] - p["actual"]) / p["actual"], 1) if p["actual"] else None}
             for p in worst]

    # p90 / p95 absolute error for day-ahead (useful for risk margins)
    abs_sorted = sorted(abs(e) for e in errs)
    def pctile(sorted_vals, q):
        if not sorted_vals:
            return None
        idx = (len(sorted_vals) - 1) * q
        lo_i = int(math.floor(idx))
        hi_i = int(math.ceil(idx))
        if lo_i == hi_i:
            return sorted_vals[lo_i]
        frac = idx - lo_i
        return sorted_vals[lo_i] * (1 - frac) + sorted_vals[hi_i] * frac
    overall["p50AbsError"] = round(pctile(abs_sorted, 0.50), 1)
    overall["p80AbsError"] = round(pctile(abs_sorted, 0.80), 1)
    overall["p90AbsError"] = round(pctile(abs_sorted, 0.90), 1)
    overall["p95AbsError"] = round(pctile(abs_sorted, 0.95), 1)
    overall["maxAbsError"] = round(max(abs_sorted), 1) if abs_sorted else None
    overall["stdError"] = round(math.sqrt(sum((e - overall["bias"]) ** 2 for e in errs) / len(errs)), 1)

    return {
        "overall": overall,
        "leadCurve": lead_curve,
        "perDay": per_day,
        "perSettlementPeriod": per_sp,
        "errorHistogram": hist,
        "worstMisses": worst,
        "decisionPublishByDay": used_pub_by_day,
        "decisionHourUTC": DECISION_HOUR,
        "evolution": evolution,
    }


def build_latest_forecast(actuals):
    """Extract the most recent WINDFOR publish (decision-relevant tip) and the
    settlement periods it targets, plus its day-ahead decision framing."""
    start = datetime(2026, 1, 29, tzinfo=UTC)
    end = datetime(2026, 2, 3, tzinfo=UTC)
    all_rows = []
    day = start
    while day < end:
        d0 = day.strftime("%Y-%m-%d")
        d1 = (day + timedelta(days=1)).strftime("%Y-%m-%d")
        url = (f"{BASE}/WINDFOR/stream?publishDateTimeFrom={d0}T00:00:00Z"
               f"&publishDateTimeTo={d1}T00:00:00Z")
        try:
            all_rows.extend(http_json(url, f"windfor_latest_{d0}.json"))
        except Exception as e:
            if FORCE_REFRESH:
                raise RuntimeError(f"Could not refresh latest WINDFOR data for {d0}") from e
            print(f"  WARNING: latest-forecast fetch failed for {d0}: {e}", flush=True)
        day += timedelta(days=1)
        time.sleep(0.3)
    if not all_rows and FORCE_REFRESH:
        raise RuntimeError("Could not refresh latest WINDFOR data: Elexon returned no rows")
    if not all_rows:
        return None
    pubs = {}
    for r in all_rows:
        pubs.setdefault(parse_dt(r["publishTime"]), []).append(r)
    latest_pub = max(pubs)
    pts = []
    for r in pubs[latest_pub]:
        pts.append({"startTime": iso(parse_dt(r["startTime"])), "forecast": r["generation"]})
    pts.sort(key=lambda x: x["startTime"])
    # decision context: this run was published at latest_pub; it informs the
    # day-ahead decision for delivery (latest_pub + 1 day)
    delivery = (latest_pub + timedelta(days=1)).date().isoformat()
    return {
        "publishTime": iso(latest_pub),
        "nPoints": len(pts),
        "horizonStart": pts[0]["startTime"],
        "horizonEnd": pts[-1]["startTime"],
        "usedForDeliveryDate": delivery,
        "points": pts,
    }


def main():
    t0 = time.time()
    actuals = fetch_actuals()
    fc_rows = fetch_all_forecasts()

    # serialise actuals (only Jan 2026 + a few days history for context)
    actuals_out = [{"startTime": k, "generation": v} for k, v in sorted(actuals.items())]

    model = build_model(actuals, fc_rows)

    # rebuild da_points for the forecast_da.json file
    # (repeat the same logic cheaply using metrics' day info) — instead re-derive here
    # We recompute to write the file.
    # --- (kept simple: reconstruct from publishes again)
    publishes = {}
    for r in fc_rows:
        pub = parse_dt(r["publishTime"])
        st = parse_dt(r["startTime"])
        publishes.setdefault(pub, {})[iso(st)] = r["generation"]
    pub_times = sorted(publishes.keys())

    def latest_publish_before(t):
        best = None
        for p in pub_times:
            if p <= t:
                best = p
            else:
                break
        return best

    jan_start = datetime(2026, 1, 1, tzinfo=UTC)
    jan_end = datetime(2026, 2, 1, tzinfo=UTC)
    from bisect import bisect_left

    def make_interpolator2(fc_dict):
        keys = sorted(fc_dict.keys())
        times = [parse_dt(k).timestamp() for k in keys]
        vals = [fc_dict[k] for k in keys]

        def interp(t):
            ts = t.timestamp()
            i = bisect_left(times, ts)
            if i == 0:
                return vals[0]
            if i >= len(times):
                return vals[-1]
            t_lo, t_hi = times[i - 1], times[i]
            if t_hi == t_lo:
                return vals[i]
            frac = (ts - t_lo) / (t_hi - t_lo)
            return vals[i - 1] + frac * (vals[i] - vals[i - 1])
        return interp

    da_points = []
    d = jan_start
    while d < jan_end:
        dt_time = datetime(d.year, d.month, d.day, 10, tzinfo=UTC) - timedelta(days=1)
        pub = latest_publish_before(dt_time)
        if pub:
            interp = make_interpolator2(publishes[pub])
            for sp in range(48):
                st = datetime(d.year, d.month, d.day, tzinfo=UTC) + timedelta(minutes=30 * sp)
                key = iso(st)
                if key in actuals:
                    da_points.append({
                        "startTime": key, "settlementPeriod": sp + 1,
                        "deliveryDate": d.date().isoformat(),
                        "actual": actuals[key], "forecast": round(interp(st), 1),
                        "publishTime": iso(pub),
                        "leadHours": round((st - pub).total_seconds() / 3600.0, 2),
                    })
        d += timedelta(days=1)

    n_runs = len(pub_times)

    meta = {
        "generatedAt": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "Elexon BMRS Insights Solution (public, no-auth)",
        "datasets": {
            "actual": {"endpoint": "FUELHH", "filter": "fuelType == 'WIND'",
                       "resolution": "30 minutes", "unit": "MW",
                       "url": "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream"},
            "forecast": {"endpoint": "WINDFOR", "filter": "national wind power forecast",
                         "resolution": "hourly (interpolated to settlement periods)", "unit": "MW",
                         "url": "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream"},
        },
        "scope": "GB national wind generation, delivery periods starting 2026-01-01 to 2026-01-31 (UTC)",
        "decisionRule": "Day-ahead forecast = latest WINDFOR publish at or before 10:00 UTC on D-1 (mirrors GB day-ahead auction gate closure at 11:00 Europe/London).",
        "nActualPoints": len(actuals_out),
        "nForecastRuns": n_runs,
        "nDayAheadPoints": len(da_points),
        "nEvolutionDays": len(model.get("evolution", [])),
        "caveats": [
            "WINDFOR is published ~8 times per day and covers roughly the following 72 hours at hourly resolution; FUELHH is metered half-hourly. Hourly forecasts are linearly interpolated onto the half-hourly settlement grid for like-for-like comparison.",
            "January 2026 actuals are final/near-final metered values as published by Elexon at time of extraction.",
            "WINDFOR national forecasts are indicative and do not sum embedded wind exactly; small structural differences vs FUELHH metered totals are expected.",
            "Error metrics use MW (power). Energy error in MWh = sum(MW error over 30-min periods) x 0.5.",
        ],
    }

    def dump(name, obj):
        path = os.path.join(OUT, name)
        with open(path, "w") as f:
            json.dump(obj, f, separators=(",", ":"))
        print(f"  wrote {name} ({os.path.getsize(path)/1024:.0f} KB)")

    dump("actuals.json", actuals_out)
    dump("forecast_da.json", da_points)
    latest = build_latest_forecast(actuals)
    if latest:
        dump("latest_forecast.json", latest)
    dump("metrics.json", model)
    dump("meta.json", meta)
    print(f"Done in {time.time()-t0:.1f}s")

if __name__ == "__main__":
    main()
