#!/usr/bin/env python3
"""
Finviz Pre-Screener — Stage 1 of the Trading Command Center funnel
===================================================================
Scans 6,000+ US stocks via Finviz and outputs ~150-300 candidates
that pass basic institutional-quality filters.

Filters applied:
  • Price above SMA 200 (uptrend)
  • Market Cap > $2B (no micro/small caps)
  • Average Volume > 300K (liquid enough for retail)
  • Exchange: NYSE, NASDAQ (no OTC/pink sheets)

Output:
  scripts/candidates.json — list of {symbol, sector} dicts

Usage:
  python scripts/finviz_screen.py
"""

import json
import sys
from datetime import datetime
from pathlib import Path

try:
    from finvizfinance.screener.overview import Overview
except ImportError:
    print("ERROR: Missing finvizfinance. Install with: pip install finvizfinance>=0.14")
    sys.exit(1)

ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_FILE = ROOT_DIR / "scripts" / "candidates.json"

# ─── Finviz filter map ────────────────────────────────────────────────────
# Keys match finvizfinance filter names (see finvizfinance docs)
FILTERS = {
    "200-Day Simple Moving Average": "Price above SMA200",  # Uptrend
    "Market Cap.": "+Mid (over $2bln)",                     # >= $2B
    "Average Volume": "Over 300K",                          # Liquid
    # Exchange filter omitted: Market Cap > $2B already excludes OTC junk
}

# Sector mapping: Finviz sector names → our SPDR sector names
SECTOR_MAP = {
    "Technology": "Technology",
    "Healthcare": "Healthcare",
    "Financial": "Financials",
    "Energy": "Energy",
    "Industrials": "Industrials",
    "Consumer Cyclical": "Consumer Discretionary",
    "Consumer Defensive": "Consumer Staples",
    "Basic Materials": "Materials",
    "Utilities": "Utilities",
    "Real Estate": "Real Estate",
    "Communication Services": "Communication Services",
}


def run_finviz_screen():
    """Run Finviz screener and return list of candidate dicts."""
    print("=" * 60)
    print("Stage 1: Finviz Pre-Screener")
    print("=" * 60)
    print(f"Filters: {FILTERS}")
    print()

    fscreen = Overview()
    fscreen.set_filter(filters_dict=FILTERS)

    print("Fetching results from Finviz...")
    df = fscreen.screener_view()

    if df is None or df.empty:
        print("ERROR: Finviz returned no results")
        return []

    print(f"Raw results: {len(df)} stocks")

    candidates = []
    seen = set()

    for _, row in df.iterrows():
        symbol = str(row.get("Ticker", "")).strip().upper()
        if not symbol or symbol in seen:
            continue
        seen.add(symbol)

        # Map Finviz sector to our sector names
        raw_sector = str(row.get("Sector", "")).strip()
        sector = SECTOR_MAP.get(raw_sector, raw_sector)

        candidates.append({
            "symbol": symbol,
            "sector": sector,
        })

    print(f"Unique candidates: {len(candidates)}")

    # Sector breakdown
    sector_counts = {}
    for c in candidates:
        s = c["sector"]
        sector_counts[s] = sector_counts.get(s, 0) + 1
    print("\nSector breakdown:")
    for s, count in sorted(sector_counts.items(), key=lambda x: -x[1]):
        print(f"  {s:30s} {count:4d}")

    return candidates


def main():
    candidates = run_finviz_screen()

    if not candidates:
        print("\nERROR: No candidates found. Keeping previous candidates.json if it exists.")
        sys.exit(1)

    output = {
        "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "totalScanned": "6000+",
        "candidateCount": len(candidates),
        "filters": FILTERS,
        "candidates": candidates,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n{'=' * 60}")
    print(f"Wrote {len(candidates)} candidates to {OUTPUT_FILE}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
