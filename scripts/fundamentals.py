#!/usr/bin/env python3
"""
Fundamentals fetcher with on-disk caching.

Quarterly earnings are reported once every ~90 days, so we cache for 30
days by default and force a re-fetch if the cached entry is older than
that. The cache file is committed to git so a fresh checkout doesn't pay
the yfinance bill from scratch — only deltas are refetched per run.

Returns YoY growth (current quarter vs same quarter prior year), which is
the "C" in CANSLIM that Minervini requires (>25% ideal, >0% required).
"""

from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import yfinance as yf
    import pandas as pd
except ImportError as e:
    print(f"ERROR: missing dependency for fundamentals: {e}", file=sys.stderr)
    raise

CACHE_FILE = Path(__file__).resolve().parent / "fundamentals_cache.json"
CACHE_TTL_DAYS = 30


def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")


def _is_fresh(entry: dict) -> bool:
    fetched = entry.get("fetchedAt")
    if not fetched:
        return False
    try:
        dt = datetime.strptime(fetched, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        return False
    age_days = (datetime.now(tz=timezone.utc) - dt).days
    return age_days < CACHE_TTL_DAYS


def load_cache() -> dict:
    if not CACHE_FILE.exists():
        return {}
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def save_cache(cache: dict) -> None:
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False, sort_keys=True)


def _yoy_growth(current: float, year_ago: float) -> float | None:
    """Return YoY growth as a percentage. Handles the prior-period-zero
    edge case (return None) and the prior-period-negative case (flip sign
    so a swing from -1 to +1 reads as a positive number, not a misleading
    -200%)."""
    if year_ago is None or current is None:
        return None
    if not math.isfinite(year_ago) or not math.isfinite(current):
        return None
    if year_ago == 0:
        return None
    return round(((current - year_ago) / abs(year_ago)) * 100, 1)


def _fetch_one(symbol: str) -> dict | None:
    """Live yfinance call. Returns dict with epsGrowthYoY, salesGrowthYoY,
    lastReportDate — or None if the data isn't usable."""
    try:
        qi = yf.Ticker(symbol).quarterly_income_stmt
    except Exception:
        return None

    if qi is None or qi.empty or qi.shape[1] < 5:
        # Need at least 5 quarters: current + same-quarter-prior-year
        return None

    cols = list(qi.columns)  # already sorted newest-first
    current_col, year_ago_col = cols[0], cols[4]

    def _get(row_keys: list[str], col):
        for k in row_keys:
            if k in qi.index:
                v = qi.loc[k, col]
                try:
                    fv = float(v)
                    if math.isfinite(fv):
                        return fv
                except (TypeError, ValueError):
                    pass
        return None

    eps_now = _get(["Diluted EPS", "Basic EPS"], current_col)
    eps_yago = _get(["Diluted EPS", "Basic EPS"], year_ago_col)
    rev_now = _get(["Total Revenue"], current_col)
    rev_yago = _get(["Total Revenue"], year_ago_col)

    eps_growth = _yoy_growth(eps_now, eps_yago)
    sales_growth = _yoy_growth(rev_now, rev_yago)

    if eps_growth is None and sales_growth is None:
        return None

    last_report = current_col.strftime("%Y-%m-%d") if hasattr(current_col, "strftime") else None

    return {
        "epsGrowthYoY": eps_growth,
        "salesGrowthYoY": sales_growth,
        "lastReportDate": last_report,
        "fetchedAt": _now_iso(),
    }


def get_fundamentals(symbol: str, cache: dict) -> dict | None:
    """Return fundamentals for a symbol, using cache when fresh.
    Mutates `cache` in place when a new entry is fetched."""
    cached = cache.get(symbol)
    if cached and _is_fresh(cached):
        return cached

    result = _fetch_one(symbol)
    if result is not None:
        cache[symbol] = result
    elif cached:
        # Keep the stale entry as a fallback rather than dropping it
        return cached
    return result


def fetch_for_universe(symbols: list[str], cache: dict | None = None,
                       progress_every: int = 25) -> dict:
    """Fetch fundamentals for many symbols, persisting cache to disk.
    Returns the populated cache dict."""
    if cache is None:
        cache = load_cache()

    fresh_count = sum(1 for s in symbols if (cache.get(s) and _is_fresh(cache[s])))
    fetch_list = [s for s in symbols if not (cache.get(s) and _is_fresh(cache[s]))]
    print(f"  Fundamentals: {fresh_count} cached, {len(fetch_list)} to fetch")

    fetched_ok = 0
    for i, sym in enumerate(fetch_list, 1):
        result = _fetch_one(sym)
        if result is not None:
            cache[sym] = result
            fetched_ok += 1
        if i % progress_every == 0 or i == len(fetch_list):
            print(f"  ...fetched {i}/{len(fetch_list)} (ok: {fetched_ok})")

    save_cache(cache)
    print(f"  Fundamentals cache saved: {len(cache)} total entries")
    return cache


if __name__ == "__main__":
    # Manual testing: python scripts/fundamentals.py AAPL MSFT NVDA
    syms = sys.argv[1:] or ["AAPL", "MSFT", "NVDA"]
    cache = load_cache()
    for s in syms:
        result = get_fundamentals(s, cache)
        print(f"{s}: {result}")
    save_cache(cache)
