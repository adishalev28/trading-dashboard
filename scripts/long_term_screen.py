#!/usr/bin/env python3
"""
Long-Term Quality Screen - the "buy and hold for years" list
============================================================
Separate from the swing screener, which buys breakouts and exits within weeks.
This one looks for durable compounders.

Finviz server-side filters:
  - Market cap over $2B, average volume over 300K
  - Sales growth past 5 years over 15%   (growth that lasted, not one good quarter)
  - ROIC over 15%                         (earns well on the capital it uses)
  - Operating margin positive
  - Debt/Equity under 1                   (survives a bad year without diluting)
  - Price above SMA200                    (the market agrees)
Post-filters:
  - Positive free cash flow (P/FCF present and above 0)
  - PEG at most 3 when analysts publish one (quality, but not at any price)

Free data has no point-in-time fundamentals, so this cannot be backtested.
Instead every ticker that ever enters the list is tracked forward from its first
day, against SPY over the same window.

Outputs:
  src/lib/longTermData.json       - today's list + tracked performance (read by /long-term)
  scripts/long_term_history.json  - first-seen date, entry price, SPY at entry (committed)

Usage:
  python scripts/long_term_screen.py
"""

import json
import math
import statistics
import sys
from datetime import datetime
from pathlib import Path

try:
    import pandas as pd
    import yfinance as yf
    from finvizfinance.screener.financial import Financial
    from finvizfinance.screener.overview import Overview
    from finvizfinance.screener.valuation import Valuation
except ImportError as e:
    print(f"ERROR: missing dependency: {e}")
    sys.exit(1)

from finviz_guard import check_tickers, fail

ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_FILE = ROOT_DIR / "src" / "lib" / "longTermData.json"
HISTORY_FILE = ROOT_DIR / "scripts" / "long_term_history.json"
BENCHMARK = "SPY"
MIN_RESULTS = 10
MAX_PEG = 3.0

FILTERS = {
    "Market Cap.": "+Mid (over $2bln)",
    "Average Volume": "Over 300K",
    "Sales growthpast 5 years": "Over 15%",
    "Return on Investment": "Over +15%",
    "Operating Margin": "Positive (>0%)",
    "Debt/Equity": "Under 1",
    "200-Day Simple Moving Average": "Price above SMA200",
}

CRITERIA = [
    {"label": "Sales growth, past 5 years", "rule": "over 15% a year", "why": "Growth that lasted, not one good quarter"},
    {"label": "ROIC", "rule": "over 15%", "why": "Earns well on every dollar it invests"},
    {"label": "Operating margin", "rule": "positive", "why": "The core business makes money"},
    {"label": "Free cash flow", "rule": "positive", "why": "Funds itself instead of diluting shareholders"},
    {"label": "Debt / Equity", "rule": "under 1", "why": "Survives a bad year"},
    {"label": "PEG", "rule": "3 or less (when available)", "why": "Quality, but not at any price"},
    {"label": "Price vs SMA200", "rule": "above", "why": "The market agrees with the story"},
    {"label": "Size and liquidity", "rule": "over $2B, volume over 300K", "why": "Real companies you can buy and sell"},
]


# ─── Parsing helpers ──────────────────────────────────────────────────────

def num(v):
    """Finviz values arrive as floats, '26.19%' strings, '101.5B' strings or '-'."""
    if v is None:
        return None
    if isinstance(v, str):
        s = v.strip().replace(",", "").replace("%", "")
        if s in ("", "-"):
            return None
        mult = 1.0
        if s[-1:] in ("K", "M", "B", "T"):
            mult = {"K": 1e3, "M": 1e6, "B": 1e9, "T": 1e12}[s[-1]]
            s = s[:-1]
        try:
            v = float(s) * mult
        except ValueError:
            return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f if math.isfinite(f) else None


def percent_values(rows: dict, col: str) -> dict:
    """Normalize a column to percent. Finviz mixes '26.19%' strings with 0.2619
    fractions depending on the column, so detect the scale per column."""
    vals = {t: r.get(col) for t, r in rows.items()}
    has_pct_str = any(isinstance(v, str) and v.strip().endswith("%") for v in vals.values())
    nums = {t: num(v) for t, v in vals.items()}
    present = [abs(x) for x in nums.values() if x is not None]
    scale = 100 if (not has_pct_str and present and max(present) <= 1.5) else 1
    return {t: (round(x * scale, 1) if x is not None else None) for t, x in nums.items()}


def lin(x, lo, hi):
    """Linear 0..1 between lo and hi. Missing data gets half credit."""
    if x is None:
        return 0.5
    return max(0.0, min(1.0, (x - lo) / (hi - lo)))


def quality_score(p: dict) -> int:
    """0-100 ranking inside the list. Everyone here already passed the filters;
    this only orders them. Weights: growth 45, quality 35, price 20."""
    s = 25 * lin(p["salesGrowth5y"], 15, 40)
    s += 20 * lin(p["epsGrowthNext5y"], 5, 30)
    s += 20 * lin(p["roic"], 15, 40)
    s += 15 * lin(p["grossMargin"], 20, 80)
    s += 10 * (1 - lin(p["peg"], 1, 3)) if p["peg"] is not None else 5
    s += 10 * (1 - lin(p["pFcf"], 20, 60))
    return round(s)


# ─── Data fetching ────────────────────────────────────────────────────────

def screener_rows(cls, name: str) -> dict:
    screen = cls()
    screen.set_filter(filters_dict=FILTERS)
    df = screen.screener_view(verbose=0)
    if df is None or df.empty:
        fail(f"Finviz {name} view returned no rows - keeping previous output")
    print(f"  {name:10s} {len(df)} rows")
    return {str(r["Ticker"]).strip().upper(): r for r in df.to_dict("records")}


def last_closes(symbols: list[str]) -> dict:
    out = {}
    if not symbols:
        return out
    try:
        close = yf.download(symbols, period="7d", auto_adjust=True, progress=False, threads=True)["Close"]
    except Exception as e:
        print(f"  WARNING: yfinance price fetch failed: {e}")
        return out
    if isinstance(close, pd.Series):
        close = close.to_frame(symbols[0])
    for s in symbols:
        if s in close.columns:
            col = close[s].dropna()
            if len(col):
                out[s] = round(float(col.iloc[-1]), 2)
    return out


def days_between(a: str, b: str) -> int:
    return (datetime.strptime(b, "%Y-%m-%d") - datetime.strptime(a, "%Y-%m-%d")).days


# ─── Main ─────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("Long-Term Quality Screen")
    print("=" * 60)

    ov = screener_rows(Overview, "overview")
    va = screener_rows(Valuation, "valuation")
    fi = screener_rows(Financial, "financial")

    tickers = list(ov.keys())
    check_tickers(tickers, source="Long-term screen")

    sales5 = percent_values(va, "Sales Past 5Y")
    eps_next5 = percent_values(va, "EPS Next 5Y")
    eps_past5 = percent_values(va, "EPS Past 5Y")
    roic = percent_values(fi, "ROIC")
    gross = percent_values(fi, "Gross M")
    oper = percent_values(fi, "Oper M")

    picks = []
    dropped = {"noFreeCashFlow": 0, "pegTooHigh": 0}
    for t in tickers:
        o, v, f = ov[t], va.get(t, {}), fi.get(t, {})
        p_fcf = num(v.get("P/FCF"))
        peg = num(v.get("PEG"))
        if p_fcf is None or p_fcf <= 0:
            dropped["noFreeCashFlow"] += 1
            continue
        if peg is not None and peg > MAX_PEG:
            dropped["pegTooHigh"] += 1
            continue
        cap = num(o.get("Market Cap"))
        p = {
            "ticker": t,
            "companyName": o.get("Company") or t,
            "sector": o.get("Sector") or "—",
            "industry": o.get("Industry") or "",
            "marketCapB": round(cap / 1e9, 1) if cap else None,
            "price": num(o.get("Price")),
            "salesGrowth5y": sales5.get(t),
            "epsGrowth5y": eps_past5.get(t),
            "epsGrowthNext5y": eps_next5.get(t),
            "roic": roic.get(t),
            "grossMargin": gross.get(t),
            "operMargin": oper.get(t),
            "debtEq": num(f.get("Debt/Eq")),
            "peg": peg,
            "pFcf": p_fcf,
            "forwardPe": num(v.get("Forward P/E")),
        }
        p["score"] = quality_score(p)
        picks.append(p)

    picks.sort(key=lambda p: (-p["score"], p["ticker"]))
    print(f"\n  Passed Finviz filters: {len(tickers)}")
    print(f"  Dropped: {dropped['noFreeCashFlow']} without positive FCF, {dropped['pegTooHigh']} with PEG over {MAX_PEG:g}")
    print(f"  Final list: {len(picks)}")
    if len(picks) < MIN_RESULTS:
        fail(f"only {len(picks)} long-term picks (expected at least {MIN_RESULTS}) - keeping previous output")

    # ─── Forward tracking ──
    today = datetime.now().strftime("%Y-%m-%d")
    history = {"tickers": {}}
    if HISTORY_FILE.exists():
        try:
            history = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as e:
            fail(f"could not read {HISTORY_FILE.name}: {e} - refusing to overwrite tracking history")
    hist = history.setdefault("tickers", {})

    in_list = {p["ticker"] for p in picks}
    need = sorted({BENCHMARK} | {t for t in hist if t not in in_list})
    live = last_closes(need)
    spy_now = live.get(BENCHMARK)
    if spy_now is None:
        fail("no SPY price from yfinance - cannot track performance")

    price_now = {p["ticker"]: p["price"] for p in picks}
    price_now.update({t: px for t, px in live.items() if t != BENCHMARK})

    for p in picks:
        h = hist.setdefault(p["ticker"], {"firstSeen": today, "entryPrice": p["price"], "spyEntry": spy_now})
        if h.get("entryPrice") is None and p["price"] is not None:
            h["entryPrice"] = p["price"]
        h["lastSeen"] = today
        h["companyName"] = p["companyName"]
        h["sector"] = p["sector"]
        p["firstSeen"] = h["firstSeen"]

    tracked = []
    for t, h in hist.items():
        cur, entry, spy_entry = price_now.get(t), h.get("entryPrice"), h.get("spyEntry")
        tracked.append({
            "ticker": t,
            "companyName": h.get("companyName", t),
            "sector": h.get("sector", "—"),
            "firstSeen": h["firstSeen"],
            "lastSeen": h.get("lastSeen", h["firstSeen"]),
            "inList": t in in_list,
            "daysTracked": days_between(h["firstSeen"], today),
            "entryPrice": entry,
            "currentPrice": cur,
            "returnPct": round((cur / entry - 1) * 100, 1) if cur and entry else None,
            "spyReturnPct": round((spy_now / spy_entry - 1) * 100, 1) if spy_entry else None,
        })
    tracked.sort(key=lambda r: (r["firstSeen"], r["ticker"]))

    valid = [r for r in tracked if r["daysTracked"] > 0 and r["returnPct"] is not None and r["spyReturnPct"] is not None]
    if valid:
        rets = [r["returnPct"] for r in valid]
        spys = [r["spyReturnPct"] for r in valid]
        summary = {
            "count": len(valid),
            "avgReturn": round(statistics.mean(rets), 1),
            "medianReturn": round(statistics.median(rets), 1),
            "avgSpyReturn": round(statistics.mean(spys), 1),
            "beatSpyPct": round(100 * sum(r > s for r, s in zip(rets, spys)) / len(valid)),
        }
    else:
        summary = {"count": 0}

    history["lastUpdate"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    HISTORY_FILE.write_text(json.dumps(history, indent=2, ensure_ascii=False, sort_keys=True), encoding="utf-8")

    output = {
        "meta": {
            "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "asOf": today,
            "trackingSince": min(h["firstSeen"] for h in hist.values()),
            "passedFinviz": len(tickers),
            "dropped": dropped,
            "benchmark": {"symbol": BENCHMARK, "price": spy_now},
        },
        "criteria": CRITERIA,
        "summary": summary,
        "picks": picks,
        "tracked": tracked,
    }
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"\n  Tracked since {output['meta']['trackingSince']}: {len(hist)} tickers")
    if summary["count"]:
        print(f"  Avg return {summary['avgReturn']:+.1f}% vs SPY {summary['avgSpyReturn']:+.1f}% · beat SPY {summary['beatSpyPct']}%")
    print("\n  Top 10:")
    for p in picks[:10]:
        print(f"    {p['score']:3d} {p['ticker']:6s} {p['companyName'][:34]:34s} sales5y={p['salesGrowth5y']} roic={p['roic']} peg={p['peg']}")
    print(f"\n  Output: {OUTPUT_FILE}")
    print("=" * 60)


if __name__ == "__main__":
    main()
