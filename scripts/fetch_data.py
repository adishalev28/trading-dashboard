#!/usr/bin/env python3
"""
Trading Dashboard — Data Agent
===============================
Fetches live market data via yfinance and writes to src/lib/mockData.json.

Metrics calculated per ticker:
  • Price (latest close)
  • SMA 150 & SMA 200
  • 52-week high and distance from it (%)
  • IBD-style Relative Strength score (weighted 3/6/9/12-month return vs SPY)
  • Volume % vs 50-day average (Minervini volume contraction clue)
  • Auto-detected VCP status (tight / loose / none)
  • Market cap (from yfinance info)

Metrics calculated per sector:
  • Today's % change (close vs prior close)
  • Strength Score (63-day outperformance vs SPY, mapped 1-99)
  • Market cap

Usage:
  pip install -r scripts/requirements.txt
  python scripts/fetch_data.py

Output:
  Overwrites src/lib/mockData.json with fresh data.

Author: Trading Command Center
"""

import json
import sys
from datetime import datetime
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

# 19 watchlist tickers (matches MVP mockData)
TICKERS = [
    {"symbol": "NVDA", "sector": "Technology"},
    {"symbol": "META", "sector": "Communication Services"},
    {"symbol": "AVGO", "sector": "Technology"},
    {"symbol": "TSM",  "sector": "Technology"},
    {"symbol": "CRM",  "sector": "Technology"},
    {"symbol": "ANET", "sector": "Technology"},
    {"symbol": "PLTR", "sector": "Technology"},
    {"symbol": "NFLX", "sector": "Communication Services"},
    {"symbol": "COST", "sector": "Consumer Staples"},
    {"symbol": "LLY",  "sector": "Healthcare"},
    {"symbol": "AXON", "sector": "Industrials"},
    {"symbol": "CEG",  "sector": "Utilities"},
    {"symbol": "VST",  "sector": "Utilities"},
    {"symbol": "SHOP", "sector": "Technology"},
    {"symbol": "AMD",  "sector": "Technology"},
    {"symbol": "IBKR", "sector": "Financials"},
    {"symbol": "SMCI", "sector": "Technology"},
    {"symbol": "HIMS", "sector": "Healthcare"},
    {"symbol": "MSTR", "sector": "Technology"},
]

BENCHMARK = "SPY"  # Used for Relative Strength calculation

# Amount of history to fetch (need ≥252 days for 52-week high + SMA 200)
HISTORY_PERIOD = "18mo"

FX_RATE_USD_ILS_FALLBACK = 3.7  # Fallback if live FX fetch fails
COMMISSION_ROUND_TRIP_USD = 14  # Meitav Trade: $7 buy + $7 sell

# ─── Helpers ───────────────────────────────────────────────────────────────

def fetch_live_fx_rate():
    """Fetch live USD/ILS exchange rate via yfinance (USDILS=X ticker)."""
    try:
        fx = yf.Ticker("USDILS=X").history(period="5d")
        if not fx.empty:
            rate = float(fx["Close"].iloc[-1])
            if rate > 0:
                return round(rate, 4)
    except Exception as e:
        print(f"  ⚠️  FX fetch via yfinance failed: {e}")
    # Fallback: try frankfurter.dev
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


def download_history(symbol, period=HISTORY_PERIOD):
    """Download historical OHLCV for a symbol. Returns DataFrame or None on failure."""
    try:
        df = yf.Ticker(symbol).history(period=period, auto_adjust=True)
        if df.empty:
            print(f"  ⚠️  {symbol}: no data returned")
            return None
        return df
    except Exception as e:
        print(f"  ❌ {symbol}: {e}")
        return None


def get_market_cap(symbol):
    """Fetch market cap in billions USD via yfinance info. Returns None on failure."""
    try:
        info = yf.Ticker(symbol).info
        mc = info.get("marketCap")
        if mc and mc > 0:
            return round(mc / 1e9, 1)  # billions
    except Exception:
        pass
    return None


def calculate_sma(df, window):
    """Simple Moving Average of Close prices over `window` days."""
    if len(df) < window:
        return None
    return float(df["Close"].rolling(window=window).mean().iloc[-1])


def calculate_52w_high_distance(df):
    """Percent distance below 52-week high (0 = at high, 25 = 25% below)."""
    if len(df) < 20:
        return None
    recent = df.tail(252)  # 1 trading year
    high_52w = float(recent["Close"].max())
    latest = float(df["Close"].iloc[-1])
    if high_52w == 0:
        return None
    return round(((high_52w - latest) / high_52w) * 100, 2)


def calculate_volume_pct(df, window=50):
    """Current day's volume as % of 50-day average (100 = matches avg)."""
    if len(df) < window + 1:
        return None
    avg_vol = float(df["Volume"].tail(window).mean())
    today_vol = float(df["Volume"].iloc[-1])
    if avg_vol == 0:
        return None
    return round((today_vol / avg_vol) * 100, 1)


def weighted_return(df, periods=[63, 126, 189, 252], weights=[0.4, 0.2, 0.2, 0.2]):
    """
    IBD-style weighted return over multiple periods.
    Returns a single weighted percentage change.
    """
    if len(df) < max(periods):
        return None
    close = df["Close"]
    total = 0.0
    for period, weight in zip(periods, weights):
        ret = (close.iloc[-1] / close.iloc[-period] - 1) * 100
        total += weight * ret
    return total


def calculate_rs_raw(ticker_df, spy_df):
    """
    Raw Relative Strength: ticker's weighted return minus SPY's.
    Positive = outperforming SPY.
    """
    t_ret = weighted_return(ticker_df)
    s_ret = weighted_return(spy_df)
    if t_ret is None or s_ret is None:
        return None
    return t_ret - s_ret  # outperformance in percentage points


def normalize_rs_to_score(rs_raws):
    """
    Map raw RS values (can be any real number) to 1-99 percentile rank.
    Returns a dict { original_index: score }.
    Higher raw RS → higher rank → higher score.
    """
    # Filter out None values for ranking
    valid_indices = [i for i, v in enumerate(rs_raws) if v is not None]
    valid_values = [rs_raws[i] for i in valid_indices]

    if not valid_values:
        return {i: 50 for i in range(len(rs_raws))}

    # Sort ascending and rank
    sorted_pairs = sorted(enumerate(valid_values), key=lambda x: x[1])
    rank_map = {valid_indices[orig_i]: rank for rank, (orig_i, _) in enumerate(sorted_pairs)}

    n = len(valid_values)
    scores = {}
    for i in range(len(rs_raws)):
        if i in rank_map:
            # Map rank 0..n-1 to score 1..99
            score = int(round((rank_map[i] / max(n - 1, 1)) * 98 + 1))
            scores[i] = score
        else:
            scores[i] = 50  # Fallback for missing data
    return scores


def detect_vcp(df):
    """
    Simple VCP (Volatility Contraction Pattern) heuristic:
      - Price within 10% of 52-week high
      - Recent 10-day avg volume < 20-day avg volume (volume contraction)
      - Recent 10-day price range < 20-day price range (volatility contraction)

    Returns 'tight' | 'loose' | 'none'
    """
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
    range_contracting = range_10 < range_20 * 0.6  # <60% of 20-day range = tight

    if dist_high_pct <= 5 and vol_contracting and range_contracting:
        return "tight"
    elif dist_high_pct <= 15 and (vol_contracting or range_contracting):
        return "loose"
    else:
        return "none"


def detect_volume_surge(df):
    """
    Detect abnormal volume increase on a green (up) day.
      - surge:  vol > 150% of 50-day avg AND close > open (green candle)
      - rising: vol > 120% of 50-day avg AND close > open
      - none:   normal volume or red day
    """
    if len(df) < 51:
        return "none"
    vol_today = float(df["Volume"].iloc[-1])
    vol_avg_50 = float(df["Volume"].tail(51).iloc[:-1].mean())  # 50 days before today
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
    """
    Find the Pivot / Buy Point — highest close in the last N trading days.
    This is the resistance level at the top of the VCP contraction.
    When price breaks above this on volume, it's a Minervini buy signal.
    """
    if len(df) < lookback:
        return None
    return round(float(df["Close"].tail(lookback).max()), 2)


def extract_price_history(df, days=30):
    """Extract last N days of close prices as a list of rounded floats (for sparklines)."""
    if len(df) < days:
        return [round(float(x), 2) for x in df["Close"].tolist()]
    return [round(float(x), 2) for x in df["Close"].tail(days).tolist()]


def calculate_today_change_pct(df):
    """Today's % change (latest close vs previous close)."""
    if len(df) < 2:
        return None
    latest = float(df["Close"].iloc[-1])
    prior = float(df["Close"].iloc[-2])
    if prior == 0:
        return None
    return round(((latest - prior) / prior) * 100, 2)


# ─── Main flow ─────────────────────────────────────────────────────────────

def main():
    print("═" * 60)
    print("🚀 Trading Dashboard — Data Agent")
    print("═" * 60)
    print(f"Fetching {len(TICKERS)} tickers + {len(SECTORS)} sectors + {BENCHMARK} benchmark")
    print(f"Output: {OUTPUT_FILE}\n")

    # ─── Step 0: Fetch live FX rate ──
    print("💱 Fetching live USD/ILS exchange rate...")
    live_fx = fetch_live_fx_rate()
    if live_fx:
        fx_rate = live_fx
        print(f"   ✓ Live FX rate: {fx_rate} ILS/USD (from frankfurter.dev)")
    else:
        fx_rate = FX_RATE_USD_ILS_FALLBACK
        print(f"   ⚠️  Using fallback FX rate: {fx_rate} ILS/USD")
    print()

    # ─── Step 1: Fetch benchmark ──
    print(f"📊 Downloading {BENCHMARK} (benchmark)...")
    spy_df = download_history(BENCHMARK)
    if spy_df is None or spy_df.empty:
        print("❌ Failed to fetch SPY — aborting")
        sys.exit(1)
    print(f"   ✓ {len(spy_df)} days of {BENCHMARK} data")

    # Extract SPY benchmark data for System Health checks
    spy_price       = round(float(spy_df["Close"].iloc[-1]), 2)
    spy_sma200      = calculate_sma(spy_df, 200)
    spy_change_pct  = calculate_today_change_pct(spy_df)
    spy_sma50       = calculate_sma(spy_df, 50)
    spy_above_200   = spy_price > spy_sma200 if spy_sma200 else None
    print(f"   SPY: ${spy_price} | SMA200: ${round(spy_sma200, 2) if spy_sma200 else '?'} | Above 200: {'✓' if spy_above_200 else '✗'}\n")

    # ─── Step 2: Fetch tickers ──
    print(f"📊 Downloading {len(TICKERS)} tickers...")
    ticker_data = []
    ticker_rs_raws = []

    for t in TICKERS:
        symbol = t["symbol"]
        print(f"  · {symbol}...", end=" ")
        df = download_history(symbol)
        if df is None or df.empty:
            ticker_rs_raws.append(None)
            continue

        price           = float(df["Close"].iloc[-1])
        sma150          = calculate_sma(df, 150)
        sma200          = calculate_sma(df, 200)
        week_high_dist  = calculate_52w_high_distance(df)
        volume_pct_avg  = calculate_volume_pct(df, 50)
        rs_raw          = calculate_rs_raw(df, spy_df)
        vcp_status      = detect_vcp(df)
        vol_surge       = detect_volume_surge(df)
        market_cap      = get_market_cap(symbol)
        history_30d     = extract_price_history(df, 30)
        pivot_price     = calculate_pivot_price(df, 20)
        dist_to_pivot   = round(((pivot_price - price) / pivot_price) * 100, 2) if pivot_price and pivot_price > 0 else 0.0
        sma20           = calculate_sma(df, 20)

        ticker_rs_raws.append(rs_raw)

        ticker_data.append({
            "ticker": symbol,
            "companyName": t.get("name", symbol),
            "price": round(price, 2),
            "sma150": round(sma150, 2) if sma150 else price,
            "sma200": round(sma200, 2) if sma200 else price,
            "rsScore": None,
            "vcpStatus": vcp_status,
            "volumeSurge": vol_surge,
            "weekHighDistance": week_high_dist if week_high_dist is not None else 0.0,
            "volumePctAvg": volume_pct_avg if volume_pct_avg is not None else 100.0,
            "sma20": round(sma20, 2) if sma20 else price,
            "pivotPrice": pivot_price if pivot_price else price,
            "distToPivotPct": dist_to_pivot,
            "priceHistory30d": history_30d,
            "marketCap": market_cap if market_cap is not None else 0,
            "sector": t["sector"],
        })
        print("✓")

    # ─── Step 2b: Fetch company names via info (best effort) ──
    print("\n🏷️  Fetching company names...")
    for td in ticker_data:
        try:
            info = yf.Ticker(td["ticker"]).info
            name = info.get("shortName") or info.get("longName") or td["ticker"]
            td["companyName"] = name.split(",")[0].strip()[:30]
        except Exception:
            td["companyName"] = td["ticker"]

    # ─── Step 3: Normalize RS scores within ticker universe ──
    print("\n📈 Normalizing RS scores (1-99 percentile rank)...")
    rs_scores = normalize_rs_to_score(ticker_rs_raws)
    valid_idx = 0
    for i, td in enumerate(ticker_data):
        # Skip tickers that failed download (not in ticker_data)
        while valid_idx < len(ticker_rs_raws) and ticker_rs_raws[valid_idx] is None:
            valid_idx += 1
        if valid_idx < len(ticker_rs_raws):
            td["rsScore"] = rs_scores.get(valid_idx, 50)
            valid_idx += 1
        else:
            td["rsScore"] = 50

    # ─── Step 4: Fetch sectors ──
    print(f"\n🌐 Downloading {len(SECTORS)} sector ETFs...")
    sector_data = []
    spy_63d_return = weighted_return(spy_df, periods=[63], weights=[1.0])

    for s in SECTORS:
        symbol = s["symbol"]
        print(f"  · {symbol}...", end=" ")
        df = download_history(symbol)
        if df is None or df.empty:
            print("⚠️ skipped")
            continue

        change_pct  = calculate_today_change_pct(df)
        market_cap  = get_market_cap(symbol)
        history_30d = extract_price_history(df, 30)

        # Strength Score = 63-day outperformance vs SPY, mapped to 1-99
        sector_63d = weighted_return(df, periods=[63], weights=[1.0])
        if sector_63d is not None and spy_63d_return is not None:
            outperf = sector_63d - spy_63d_return  # percentage points
            strength_raw = 50 + outperf * 3  # each 1% outperformance = +3 points
            strength_score = max(1, min(99, int(round(strength_raw))))
        else:
            strength_score = 50

        sector_data.append({
            "symbol": symbol,
            "name": s["name"],
            "changePct": change_pct if change_pct is not None else 0.0,
            "strengthScore": strength_score,
            "priceHistory30d": history_30d,
            "marketCap": market_cap if market_cap is not None else 0,
        })
        print(f"✓ strength={strength_score}")

    # ─── Step 5: Build output JSON ──
    output = {
        "meta": {
            "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "source": "yfinance (live)",
            "fxSource": "frankfurter.dev" if live_fx else "fallback",
            "note": f"Fresh data from yfinance. Benchmark: {BENCHMARK}.",
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
        "tickers": ticker_data,
    }

    # ─── Step 6: Write to mockData.json ──
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    # ─── Summary ──
    print("\n" + "═" * 60)
    print("✅ Data refresh complete")
    print("═" * 60)
    print(f"📂 Wrote:     {OUTPUT_FILE}")
    print(f"🌐 Sectors:   {len(sector_data)}/{len(SECTORS)}")
    print(f"📊 Tickers:   {len(ticker_data)}/{len(TICKERS)}")
    print(f"💵 FX rate:   {fx_rate} ILS/USD {'(live)' if live_fx else '(fallback)'}")
    print(f"📈 SPY:       ${spy_price} | {'Above' if spy_above_200 else 'Below'} SMA200")

    # Top 3 by RS
    if ticker_data:
        top3 = sorted(ticker_data, key=lambda x: x["rsScore"], reverse=True)[:3]
        print(f"\n🏆 Top 3 by RS Score:")
        for t in top3:
            print(f"   {t['ticker']:6s} RS={t['rsScore']:3d} · ${t['price']:>8.2f} · {t['companyName']}")

    # Stage 2 count
    stage2 = [t for t in ticker_data if (
        t["price"] > t["sma150"] > t["sma200"] and
        t["rsScore"] >= 70 and
        t["weekHighDistance"] <= 25
    )]
    print(f"\n🎯 Stage 2 count: {len(stage2)}/{len(ticker_data)}")

    # Top sector
    if sector_data:
        top_sector = max(sector_data, key=lambda x: x["strengthScore"])
        print(f"🥇 Top Sector: {top_sector['symbol']} ({top_sector['name']}) — strength {top_sector['strengthScore']}")

    print("\n💡 Next steps:")
    print("   • npm run dev                    — view locally")
    print("   • git add src/lib/mockData.json")
    print("   • git commit -m 'data: refresh from yfinance'")
    print("   • git push                       — auto-deploy")
    print("═" * 60)


if __name__ == "__main__":
    main()
