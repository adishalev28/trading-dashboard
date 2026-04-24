#!/usr/bin/env python3
"""
Trading Dashboard — Data Agent (Screener Edition)
===================================================
Stage 2 of the funnel: takes ~200 candidates from Finviz pre-screen
and runs deep technical analysis via yfinance.

Pipeline:
  1. Read candidates from scripts/candidates.json (output of finviz_screen.py)
  2. Download 18 months OHLCV in batches via yf.download()
  3. Calculate Stage 2, RS Score, VCP, Volume Surge, Pivot for each
  4. Filter: keep only Stage 2 + Warning (RS70+) tickers
  5. Write final results to src/lib/mockData.json

Usage:
  python scripts/finviz_screen.py   # Stage 1 — generates candidates.json
  python scripts/fetch_data.py      # Stage 2 — deep analysis + output
"""

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

try:
    import yfinance as yf
    import pandas as pd
    import numpy as np
except ImportError as e:
    print(f"ERROR: Missing dependency: {e}")
    print("Install with: pip install -r scripts/requirements.txt")
    sys.exit(1)

# ─── Configuration ─────────────────────────────────────────────────────────

ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_FILE = ROOT_DIR / "src" / "lib" / "mockData.json"
CANDIDATES_FILE = ROOT_DIR / "scripts" / "candidates.json"

# 11 SPDR sector ETFs
SECTORS = [
    {"symbol": "XLK",  "name": "Technology"},
    {"symbol": "XLV",  "name": "Healthcare"},
    {"symbol": "XLF",  "name": "Financials"},
    {"symbol": "XLE",  "name": "Energy"},
    {"symbol": "XLI",  "name": "Industrials"},
    {"symbol": "XLY",  "name": "Consumer Discretionary"},
    {"symbol": "XLP",  "name": "Consumer Staples"},
    {"symbol": "XLB",  "name": "Materials"},
    {"symbol": "XLU",  "name": "Utilities"},
    {"symbol": "XLRE", "name": "Real Estate"},
    {"symbol": "XLC",  "name": "Communication Services"},
]

BENCHMARK = "SPY"
HISTORY_PERIOD = "18mo"
BATCH_SIZE = 50  # Download this many tickers at once
FX_RATE_USD_ILS_FALLBACK = 3.7
COMMISSION_ROUND_TRIP_USD = 14

# ─── Helpers ───────────────────────────────────────────────────────────────

def load_candidates():
    """Load candidate tickers from Finviz pre-screen output."""
    if not CANDIDATES_FILE.exists():
        print(f"ERROR: {CANDIDATES_FILE} not found. Run finviz_screen.py first.")
        sys.exit(1)

    with open(CANDIDATES_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    candidates = data.get("candidates", [])
    print(f"Loaded {len(candidates)} candidates from Finviz pre-screen")
    print(f"  Generated at: {data.get('generatedAt', '?')}")

    return candidates


def fetch_live_fx_rate():
    """Fetch live USD/ILS exchange rate via yfinance (USDILS=X ticker)."""
    try:
        fx = yf.Ticker("USDILS=X").history(period="5d")
        if not fx.empty:
            rate = float(fx["Close"].iloc[-1])
            if rate > 0:
                return round(rate, 4)
    except Exception as e:
        print(f"  FX fetch via yfinance failed: {e}")
    import urllib.request
    try:
        url = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=ILS"
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read())
            rate = data.get("rates", {}).get("ILS")
            if rate and rate > 0:
                return round(rate, 4)
    except Exception:
        pass
    return None


def download_single(symbol, period=HISTORY_PERIOD):
    """Download a single ticker using Ticker.history (avoids multi-level column issues)."""
    try:
        df = yf.Ticker(symbol).history(period=period, auto_adjust=True)
        if not df.empty and len(df) > 50:
            return df
    except Exception:
        pass
    return None


def batch_download(symbols, period=HISTORY_PERIOD):
    """
    Download historical data for multiple symbols.
    Uses yf.download() in batches for speed, falls back to single download.
    Returns dict: {symbol: DataFrame}.
    """
    if not symbols:
        return {}

    # Single symbol: use Ticker.history directly (avoids column issues)
    if len(symbols) == 1:
        sym = symbols[0]
        df = download_single(sym, period)
        return {sym: df} if df is not None else {}

    result = {}
    for i in range(0, len(symbols), BATCH_SIZE):
        batch = symbols[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(symbols) + BATCH_SIZE - 1) // BATCH_SIZE
        print(f"  Batch {batch_num}/{total_batches}: {len(batch)} tickers...", end=" ")

        try:
            df = yf.download(
                batch,
                period=period,
                auto_adjust=True,
                group_by="ticker",
                threads=True,
                progress=False,
            )

            if df.empty:
                print("empty")
                continue

            # Single ticker in batch: yf.download returns flat columns
            if len(batch) == 1:
                sym = batch[0]
                # Flatten multi-level if needed
                if isinstance(df.columns, pd.MultiIndex):
                    try:
                        ticker_df = df[sym].dropna(how="all")
                        if not ticker_df.empty and len(ticker_df) > 50:
                            result[sym] = ticker_df
                    except (KeyError, TypeError):
                        pass
                else:
                    if not df.empty and len(df) > 50:
                        result[sym] = df
            else:
                for sym in batch:
                    try:
                        ticker_df = df[sym].dropna(how="all")
                        if not ticker_df.empty and len(ticker_df) > 50:
                            result[sym] = ticker_df
                    except (KeyError, TypeError):
                        pass

            ok_count = sum(1 for s in batch if s in result)
            print(f"{ok_count}/{len(batch)} OK")

        except Exception as e:
            print(f"error: {e}")

        # Small delay between batches to be nice to Yahoo
        if i + BATCH_SIZE < len(symbols):
            time.sleep(1)

    return result


def calculate_sma(df, window):
    if len(df) < window:
        return None
    return float(df["Close"].rolling(window=window).mean().iloc[-1])


def calculate_52w_high_distance(df):
    if len(df) < 20:
        return None
    recent = df.tail(252)
    high_52w = float(recent["Close"].max())
    latest = float(df["Close"].iloc[-1])
    if high_52w == 0:
        return None
    return round(((high_52w - latest) / high_52w) * 100, 2)


def calculate_volume_pct(df, window=50):
    if len(df) < window + 1:
        return None
    avg_vol = float(df["Volume"].tail(window).mean())
    today_vol = float(df["Volume"].iloc[-1])
    if avg_vol == 0:
        return None
    return round((today_vol / avg_vol) * 100, 1)


def weighted_return(df, periods=[63, 126, 189, 252], weights=[0.4, 0.2, 0.2, 0.2]):
    if len(df) < max(periods):
        return None
    close = df["Close"]
    total = 0.0
    for period, weight in zip(periods, weights):
        ret = (close.iloc[-1] / close.iloc[-period] - 1) * 100
        total += weight * ret
    return total


def calculate_rs_raw(ticker_df, spy_df):
    t_ret = weighted_return(ticker_df)
    s_ret = weighted_return(spy_df)
    if t_ret is None or s_ret is None:
        return None
    return t_ret - s_ret


def normalize_rs_to_score(rs_raws):
    """Map raw RS values to 1-99 percentile rank across the full universe."""
    valid = [(i, v) for i, v in enumerate(rs_raws) if v is not None]
    if not valid:
        return {i: 50 for i in range(len(rs_raws))}

    sorted_pairs = sorted(valid, key=lambda x: x[1])
    n = len(sorted_pairs)
    scores = {}
    for rank, (idx, _) in enumerate(sorted_pairs):
        scores[idx] = int(round((rank / max(n - 1, 1)) * 98 + 1))

    # Fill missing with 50
    for i in range(len(rs_raws)):
        if i not in scores:
            scores[i] = 50
    return scores


def detect_vcp(df):
    if len(df) < 25:
        return "none"
    recent = df.tail(252)
    high_52w = float(recent["Close"].max())
    latest = float(df["Close"].iloc[-1])
    dist_high_pct = (high_52w - latest) / high_52w * 100

    if dist_high_pct > 15:
        return "none"

    vol_10 = df["Volume"].tail(10).mean()
    vol_20 = df["Volume"].tail(20).mean()
    range_10 = (df["High"].tail(10).max() - df["Low"].tail(10).min()) / df["Close"].iloc[-1]
    range_20 = (df["High"].tail(20).max() - df["Low"].tail(20).min()) / df["Close"].iloc[-1]

    vol_contracting = vol_10 < vol_20
    range_contracting = range_10 < range_20 * 0.6

    if dist_high_pct <= 5 and vol_contracting and range_contracting:
        return "tight"
    elif dist_high_pct <= 15 and (vol_contracting or range_contracting):
        return "loose"
    else:
        return "none"


def detect_volume_surge(df):
    if len(df) < 51:
        return "none"
    vol_today = float(df["Volume"].iloc[-1])
    vol_avg_50 = float(df["Volume"].tail(51).iloc[:-1].mean())
    if vol_avg_50 <= 0:
        return "none"
    vol_pct = (vol_today / vol_avg_50) * 100
    green_day = float(df["Close"].iloc[-1]) > float(df["Open"].iloc[-1])
    if vol_pct >= 150 and green_day:
        return "surge"
    elif vol_pct >= 120 and green_day:
        return "rising"
    return "none"


def calculate_pivot_price(df, lookback=20):
    if len(df) < lookback:
        return None
    return round(float(df["Close"].tail(lookback).max()), 2)


def extract_price_history(df, days=30):
    if len(df) < days:
        return [round(float(x), 2) for x in df["Close"].tolist()]
    return [round(float(x), 2) for x in df["Close"].tail(days).tolist()]


def calculate_today_change_pct(df):
    if len(df) < 2:
        return None
    latest = float(df["Close"].iloc[-1])
    prior = float(df["Close"].iloc[-2])
    if prior == 0:
        return None
    return round(((latest - prior) / prior) * 100, 2)


def is_stage2(price, sma150, sma200, rs_score, week_high_dist):
    """Check if ticker meets Stage 2 criteria."""
    if sma150 is None or sma200 is None:
        return False
    trend_ok = price > sma150 and sma150 > sma200
    rs_ok = rs_score >= 70
    proximity_ok = week_high_dist is not None and week_high_dist <= 25
    return trend_ok and rs_ok and proximity_ok


def is_warning(price, sma150, sma200):
    """Price above SMA200 but not full Stage 2."""
    if sma200 is None:
        return False
    return price > sma200


# ─── Main flow ─────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("Trading Command Center — Screener (Stage 2)")
    print("=" * 60)

    # ─── Step 0: Load candidates from Finviz ──
    candidates = load_candidates()
    all_symbols = [c["symbol"] for c in candidates]
    sector_map = {c["symbol"]: c["sector"] for c in candidates}
    total_candidates = len(all_symbols)

    print(f"\nTotal candidates to analyze: {total_candidates}")
    print()

    # ─── Step 1: Fetch live FX rate ──
    print("Fetching live USD/ILS exchange rate...")
    live_fx = fetch_live_fx_rate()
    if live_fx:
        fx_rate = live_fx
        print(f"  Live FX rate: {fx_rate} ILS/USD")
    else:
        fx_rate = FX_RATE_USD_ILS_FALLBACK
        print(f"  Using fallback FX rate: {fx_rate} ILS/USD")
    print()

    # ─── Step 2: Fetch benchmark ──
    print(f"Downloading {BENCHMARK} (benchmark)...")
    spy_df = list(batch_download([BENCHMARK]).values())
    if not spy_df:
        print("FATAL: Failed to fetch SPY — aborting")
        sys.exit(1)
    spy_df = spy_df[0]
    print(f"  {len(spy_df)} days of {BENCHMARK} data")

    spy_price = round(float(spy_df["Close"].iloc[-1]), 2)
    spy_sma200 = calculate_sma(spy_df, 200)
    spy_change_pct = calculate_today_change_pct(spy_df)
    spy_sma50 = calculate_sma(spy_df, 50)
    spy_above_200 = spy_price > spy_sma200 if spy_sma200 else None
    print(f"  SPY: ${spy_price} | SMA200: ${round(spy_sma200, 2) if spy_sma200 else '?'} | Above 200: {'Y' if spy_above_200 else 'N'}")
    print()

    # ─── Step 3: Batch download all candidates ──
    print(f"Downloading {total_candidates} candidates in batches of {BATCH_SIZE}...")
    start_time = time.time()
    all_data = batch_download(all_symbols)
    elapsed = time.time() - start_time
    print(f"\n  Downloaded {len(all_data)}/{total_candidates} successfully in {elapsed:.0f}s")
    print()

    # ─── Step 4: Calculate metrics for each ticker ──
    print("Calculating technical metrics...")
    ticker_entries = []  # (symbol, sector, metrics_dict, rs_raw)
    rs_raws = []

    for sym in all_symbols:
        if sym not in all_data:
            rs_raws.append(None)
            continue

        df = all_data[sym]
        try:
            price = float(df["Close"].iloc[-1])
            sma150 = calculate_sma(df, 150)
            sma200 = calculate_sma(df, 200)
            week_high_dist = calculate_52w_high_distance(df)
            volume_pct = calculate_volume_pct(df, 50)
            rs_raw = calculate_rs_raw(df, spy_df)
            vcp = detect_vcp(df)
            vol_surge = detect_volume_surge(df)
            history_30d = extract_price_history(df, 30)
            pivot = calculate_pivot_price(df, 20)
            dist_to_pivot = round(((pivot - price) / pivot) * 100, 2) if pivot and pivot > 0 else 0.0
            sma20 = calculate_sma(df, 20)

            rs_raws.append(rs_raw)

            ticker_entries.append({
                "symbol": sym,
                "sector": sector_map.get(sym, ""),
                "data": {
                    "ticker": sym,
                    "companyName": sym,
                    "price": round(price, 2),
                    "sma150": round(sma150, 2) if sma150 else price,
                    "sma200": round(sma200, 2) if sma200 else price,
                    "rsScore": None,  # filled after normalization
                    "vcpStatus": vcp,
                    "volumeSurge": vol_surge,
                    "weekHighDistance": week_high_dist if week_high_dist is not None else 0.0,
                    "volumePctAvg": volume_pct if volume_pct is not None else 100.0,
                    "sma20": round(sma20, 2) if sma20 else price,
                    "pivotPrice": pivot if pivot else price,
                    "distToPivotPct": dist_to_pivot,
                    "priceHistory30d": history_30d,
                    "marketCap": 0,  # filled later
                    "sector": sector_map.get(sym, ""),
                },
                "_rs_index": len(rs_raws) - 1,
                "_sma150": sma150,
                "_sma200": sma200,
                "_week_high_dist": week_high_dist,
            })
        except Exception as e:
            rs_raws.append(None)
            print(f"  ERROR processing {sym}: {e}")

    print(f"  Calculated metrics for {len(ticker_entries)} tickers")

    # ─── Step 5: Normalize RS scores across FULL universe ──
    print("Normalizing RS scores across full universe...")
    rs_scores = normalize_rs_to_score(rs_raws)
    for entry in ticker_entries:
        idx = entry["_rs_index"]
        entry["data"]["rsScore"] = rs_scores.get(idx, 50)

    # ─── Step 6: Filter — keep Stage 2, Warning, and ALWAYS_INCLUDE ──
    print("Filtering results...")
    final_tickers = []
    stage2_count = 0
    warning_count = 0

    for entry in ticker_entries:
        d = entry["data"]
        rs = d["rsScore"]
        price = d["price"]
        sma150 = entry["_sma150"]
        sma200 = entry["_sma200"]
        whd = entry["_week_high_dist"]

        in_stage2 = is_stage2(price, sma150, sma200, rs, whd)
        in_warning = not in_stage2 and is_warning(price, sma150, sma200)

        if in_stage2:
            stage2_count += 1
            final_tickers.append(d)
        elif in_warning and rs >= 70:
            warning_count += 1
            final_tickers.append(d)

    print(f"  Stage 2:        {stage2_count}")
    print(f"  Warning (RS70+): {warning_count}")
    print(f"  TOTAL OUTPUT:   {len(final_tickers)}")

    # ─── Step 6b: Fetch per-ticker info (name, market cap, earnings date) ──
    print(f"\nFetching ticker info for {len(final_tickers)} tickers...")
    now_utc = datetime.now(tz=timezone.utc)
    earnings_flagged = 0

    for td in final_tickers:
        td["companyName"] = td["ticker"]
        try:
            info = yf.Ticker(td["ticker"]).info
        except Exception:
            continue

        name = info.get("shortName") or info.get("longName")
        if name:
            td["companyName"] = name.split(",")[0].strip()[:30]

        mc = info.get("marketCap")
        if mc and mc > 0:
            td["marketCap"] = round(mc / 1e9, 1)

        # Upcoming earnings date — check several yfinance fields, take the
        # soonest future timestamp. Stored as ISO date string; the frontend
        # computes days-until at render time so the badge auto-ages.
        candidates_ts = []
        for key in ("earningsTimestampStart", "earningsTimestamp"):
            v = info.get(key)
            if isinstance(v, (int, float)) and v > 0:
                candidates_ts.append(v)

        ed = info.get("earningsDate")
        if isinstance(ed, (list, tuple)):
            for v in ed:
                if isinstance(v, (int, float)) and v > 0:
                    candidates_ts.append(v)
        elif isinstance(ed, (int, float)) and ed > 0:
            candidates_ts.append(ed)

        future_ts = [t for t in candidates_ts
                     if datetime.fromtimestamp(t, tz=timezone.utc) > now_utc]
        if future_ts:
            soonest = min(future_ts)
            dt = datetime.fromtimestamp(soonest, tz=timezone.utc)
            td["earningsDate"] = dt.strftime("%Y-%m-%d")
            earnings_flagged += 1

    print(f"  earnings dates attached: {earnings_flagged}/{len(final_tickers)}")

    # ─── Step 7: Fetch sectors ──
    print(f"\nDownloading {len(SECTORS)} sector ETFs...")
    sector_data_map = batch_download([s["symbol"] for s in SECTORS])
    spy_63d_return = weighted_return(spy_df, periods=[63], weights=[1.0])

    sector_data = []
    for s in SECTORS:
        symbol = s["symbol"]
        if symbol not in sector_data_map:
            print(f"  {symbol}: skipped")
            continue

        df = sector_data_map[symbol]
        change_pct = calculate_today_change_pct(df)
        history_30d = extract_price_history(df, 30)

        sector_63d = weighted_return(df, periods=[63], weights=[1.0])
        if sector_63d is not None and spy_63d_return is not None:
            outperf = sector_63d - spy_63d_return
            strength_raw = 50 + outperf * 3
            strength_score = max(1, min(99, int(round(strength_raw))))
        else:
            strength_score = 50

        # Fetch market cap for sector ETF
        mc = 0
        try:
            info = yf.Ticker(symbol).info
            mc_val = info.get("marketCap") or info.get("totalAssets")
            if mc_val and mc_val > 0:
                mc = round(mc_val / 1e9, 1)
        except Exception:
            pass

        sector_data.append({
            "symbol": symbol,
            "name": s["name"],
            "changePct": change_pct if change_pct is not None else 0.0,
            "strengthScore": strength_score,
            "priceHistory30d": history_30d,
            "marketCap": mc,
        })
        print(f"  {symbol}: strength={strength_score}")

    # ─── Step 8: Build output JSON ──
    output = {
        "meta": {
            "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "source": "yfinance (live) + Finviz pre-screen",
            "fxSource": "frankfurter.dev" if live_fx else "fallback",
            "totalScanned": total_candidates,
            "passedFinviz": total_candidates,
            "finalCount": len(final_tickers),
            "note": f"Screened {total_candidates} stocks. {len(final_tickers)} passed Stage 2 / Warning filters.",
        },
        "fxRate": fx_rate,
        "commissionRoundTripUsd": COMMISSION_ROUND_TRIP_USD,
        "benchmark": {
            "symbol": BENCHMARK,
            "price": spy_price,
            "sma200": round(spy_sma200, 2) if spy_sma200 else None,
            "sma50": round(spy_sma50, 2) if spy_sma50 else None,
            "changePct": spy_change_pct if spy_change_pct is not None else 0.0,
            "aboveSma200": spy_above_200,
        },
        "sectors": sector_data,
        "tickers": final_tickers,
    }

    # ─── Step 9: Write to mockData.json ──
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    # ─── Summary ──
    print("\n" + "=" * 60)
    print("SCREENER COMPLETE")
    print("=" * 60)
    print(f"  Candidates scanned:  {total_candidates}")
    print(f"  Downloaded OK:       {len(all_data)}")
    print(f"  Stage 2 passed:      {stage2_count}")
    print(f"  Warning (RS70+):     {warning_count}")
    print(f"  TOTAL in output:     {len(final_tickers)}")
    print(f"  Sectors:             {len(sector_data)}/{len(SECTORS)}")
    print(f"  FX rate:             {fx_rate} ILS/USD {'(live)' if live_fx else '(fallback)'}")
    print(f"  SPY:                 ${spy_price} | {'Above' if spy_above_200 else 'Below'} SMA200")
    print(f"  Output:              {OUTPUT_FILE}")

    # Top 5 by RS
    if final_tickers:
        top5 = sorted(final_tickers, key=lambda x: x["rsScore"], reverse=True)[:5]
        print(f"\n  Top 5 by RS Score:")
        for t in top5:
            print(f"    {t['ticker']:6s} RS={t['rsScore']:3d} ${t['price']:>8.2f} {t['companyName']}")

    print("=" * 60)


if __name__ == "__main__":
    main()
