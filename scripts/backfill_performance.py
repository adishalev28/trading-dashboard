#!/usr/bin/env python3
"""
One-time backfill: read breadth_history.json, fetch yfinance close prices for
each ticker on its first-seen date, and build the initial
scripts/performance_data.json.

Run once after deploying the Performance Tracker. From then on, fetch_data.py
keeps performance_data.json updated daily.

Usage:
    python scripts/backfill_performance.py
"""

import json
import sys
from pathlib import Path
from datetime import datetime, timedelta

try:
    import yfinance as yf
    import pandas as pd
except ImportError as e:
    print(f"ERROR: {e}. Install with: pip install -r scripts/requirements.txt")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
HISTORY_FILE = ROOT / "scripts" / "breadth_history.json"
OUTPUT_FILE = ROOT / "scripts" / "performance_data.json"


def load_history():
    if not HISTORY_FILE.exists():
        print(f"FATAL: {HISTORY_FILE} not found.")
        sys.exit(1)
    with open(HISTORY_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def build_first_seen_map(history):
    """Walk all snapshots in chronological order, record the first date each
    ticker appears in the breakouts list and which dates it appeared."""
    snapshots = sorted(history["snapshots"], key=lambda s: s["date"])
    tickers = {}
    for snap in snapshots:
        date = snap["date"]
        for t in snap.get("breakoutTickers", []):
            if t not in tickers:
                tickers[t] = {
                    "firstSeen": date,
                    "appearances": [],
                    "topPicksHistory": [],
                    "lastSeen": date,
                }
            tickers[t]["appearances"].append({"date": date, "lists": ["breakout"]})
            tickers[t]["lastSeen"] = date
    return tickers


def fetch_entry_prices(tickers):
    """Bulk download history covering all firstSeen dates, then look up the
    close on (or after) each ticker's firstSeen date."""
    if not tickers:
        return

    symbols = list(tickers.keys())
    earliest = min(t["firstSeen"] for t in tickers.values())
    start = (datetime.strptime(earliest, "%Y-%m-%d") - timedelta(days=2)).strftime("%Y-%m-%d")

    print(f"Fetching {len(symbols)} tickers from {start}...")
    data = yf.download(
        symbols,
        start=start,
        auto_adjust=True,
        group_by="ticker",
        progress=False,
        threads=True,
    )

    filled = 0
    for sym, info in tickers.items():
        try:
            df = data[sym].dropna(how="all") if len(symbols) > 1 else data
            if df.index.tz is not None:
                df.index = df.index.tz_localize(None)
            first_dt = pd.Timestamp(info["firstSeen"])
            valid = df[df.index >= first_dt]
            if valid.empty:
                continue
            entry = float(valid["Close"].iloc[0])
            info["entryPrice"] = round(entry, 2)
            filled += 1
        except Exception as e:
            print(f"  WARN {sym}: {e}")

    print(f"  Filled entry prices for {filled}/{len(symbols)} tickers")


def main():
    print("=" * 60)
    print("Backfill Performance Data")
    print("=" * 60)

    history = load_history()
    print(f"History snapshots: {len(history['snapshots'])}")
    print(f"Date range: {history['snapshots'][0]['date']} -> {history['snapshots'][-1]['date']}")
    print()

    tickers = build_first_seen_map(history)
    print(f"Unique tickers ever in breakouts: {len(tickers)}")
    print()

    fetch_entry_prices(tickers)

    # Drop any tickers we couldn't price (probably delisted/renamed)
    valid = {k: v for k, v in tickers.items() if "entryPrice" in v}
    dropped = len(tickers) - len(valid)
    if dropped:
        print(f"\nDropped {dropped} tickers with no usable price data")

    output = {
        "lastUpdate": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "tickers": valid,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\nWrote {len(valid)} tickers to {OUTPUT_FILE}")
    print("=" * 60)


if __name__ == "__main__":
    main()
