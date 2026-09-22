#!/usr/bin/env python3
"""
Negative screen - red flags that research ties to weak future returns.

This is a veto, not a buy signal. Tested 22.9.2026 on 480 breakout stocks
(research/negative_screen_2026_09): stocks with 3+ of the 4 tested flags had a
median return of -18% and lagged SPY by ~24 points, and none of the 23 big
winners (+50%) reached 3 flags. 2 flags did NOT separate - it is only a caution.

Flags (latest annual statements + last year of prices):
  DILUTION     shares outstanding up > 10% year over year
  LOSS         operating income < 0 or free cash flow < 0
  ASSET_BLOAT  total assets up > 50% year over year
  LOTTO        beta vs SPY > 2 over 252 days, or a single-day gain > 15% in the last 21 days
  SHORT        short interest > 15% of float - shown only, NOT counted (no free history to test it)

Universe: every ticker in mockData.json, the long-term picks, and scripts/negative_screen_watch.json
(one flat personal list - the repo is public, so owned names are never labeled).
Statements change once a quarter, so they are cached for 7 days and refetched in batches.

Outputs:
  src/lib/negativeScreen.json          what the dashboard shows
  scripts/negative_screen_cache.json   cached statement values per ticker
  scripts/negative_screen_history.json first time each ticker was screened (level, price, SPY) - forward test
"""

from __future__ import annotations

import json
import math
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import yfinance as yf

ROOT = Path(__file__).resolve().parent.parent
MOCK = ROOT / "src/lib/mockData.json"
LONG_TERM = ROOT / "src/lib/longTermData.json"
WATCH = ROOT / "scripts/negative_screen_watch.json"
CACHE = ROOT / "scripts/negative_screen_cache.json"
HISTORY = ROOT / "scripts/negative_screen_history.json"
OUT = ROOT / "src/lib/negativeScreen.json"

CACHE_TTL_DAYS = 7
MAX_FETCH_PER_RUN = 110
TESTED = ["DILUTION", "LOSS", "ASSET_BLOAT", "LOTTO"]
VETO_AT, CAUTION_AT = 3, 2


def today() -> str:
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")


def load(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def num(v):
    if v is None:
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) or math.isinf(f) else f


def universe() -> tuple[list[str], dict]:
    mock = load(MOCK, {})
    lt = load(LONG_TERM, {})
    watch = load(WATCH, {})
    groups = {
        "screener": [t["ticker"] for t in mock.get("tickers", [])],
        "longTerm": [p["ticker"] for p in lt.get("picks", [])],
        "watch": watch.get("watch", []),
    }
    seen, order = set(), []
    for g in groups.values():
        for t in g:
            if t not in seen:
                seen.add(t)
                order.append(t)
    return order, groups


def annual_row(df: pd.DataFrame | None, names: list[str]) -> list[float]:
    """newest-first values of the first matching row"""
    if df is None or df.empty:
        return []
    for n in names:
        if n in df.index:
            s = df.loc[n].dropna().sort_index(ascending=False)
            return [v for v in (num(x) for x in s.values) if v is not None]
    return []


def fetch_statements(sym: str) -> dict:
    t = yf.Ticker(sym)
    shares = annual_row(t.balance_sheet, ["Ordinary Shares Number", "Share Issued"])
    assets = annual_row(t.balance_sheet, ["Total Assets"])
    oper = annual_row(t.income_stmt, ["Operating Income", "EBIT"])
    fcf = annual_row(t.cashflow, ["Free Cash Flow"])
    try:
        info = t.info or {}
    except Exception:
        info = {}
    return {
        "fetchedAt": today(),
        "sharesYoY": shares[0] / shares[1] - 1 if len(shares) >= 2 and shares[1] > 0 else None,
        "assetsYoY": assets[0] / assets[1] - 1 if len(assets) >= 2 and assets[1] > 0 else None,
        "operatingIncome": oper[0] if oper else None,
        "freeCashFlow": fcf[0] if fcf else None,
        "shortPctFloat": num(info.get("shortPercentOfFloat")),
        "companyName": info.get("shortName") or info.get("longName"),
    }


def is_fresh(entry: dict) -> bool:
    try:
        age = datetime.now(tz=timezone.utc).date() - datetime.strptime(entry["fetchedAt"], "%Y-%m-%d").date()
    except (KeyError, ValueError):
        return False
    return age.days < CACHE_TTL_DAYS


def price_flags(syms: list[str]) -> tuple[dict, dict]:
    px = yf.download(syms + ["SPY"], period="14mo", auto_adjust=True, progress=False, threads=True)["Close"]
    if isinstance(px, pd.Series):
        px = px.to_frame()
    px = px.dropna(how="all")
    rets = px.pct_change()
    spy = rets["SPY"].tail(252)
    out, last = {}, {}
    for s in syms:
        if s not in px or px[s].dropna().empty:
            continue
        r = rets[s].tail(252)
        ok = r.notna() & spy.notna()
        beta = float(np.cov(r[ok], spy[ok])[0, 1] / np.var(spy[ok])) if ok.sum() > 120 else None
        maxday = num(rets[s].tail(21).max())
        out[s] = {"beta": beta, "maxDay21": maxday}
        last[s] = num(px[s].dropna().iloc[-1])
    last["SPY"] = num(px["SPY"].dropna().iloc[-1])
    return out, last


def flags_for(st: dict, pr: dict) -> dict:
    def f(on, value, rule):
        return {"on": on, "value": value, "rule": rule}

    dil = st.get("sharesYoY")
    ab = st.get("assetsYoY")
    oi, fcf = st.get("operatingIncome"), st.get("freeCashFlow")
    beta, maxday = pr.get("beta"), pr.get("maxDay21")
    loss_on = None
    if oi is not None or fcf is not None:
        loss_on = bool((oi is not None and oi < 0) or (fcf is not None and fcf < 0))
    lotto_on = None
    if beta is not None or maxday is not None:
        lotto_on = bool((beta or 0) > 2 or (maxday or 0) > 0.15)
    short = st.get("shortPctFloat")
    return {
        "DILUTION": f(None if dil is None else dil > 0.10, dil, "shares +10% in a year"),
        "LOSS": f(loss_on, {"operatingIncome": oi, "freeCashFlow": fcf}, "operating loss or negative free cash flow"),
        "ASSET_BLOAT": f(None if ab is None else ab > 0.50, ab, "assets +50% in a year"),
        "LOTTO": f(lotto_on, {"beta": beta, "maxDay21": maxday}, "beta > 2 or a +15% day in the last month"),
        "SHORT": f(None if short is None else short > 0.15, short, "short > 15% of float (info only, not counted)"),
    }


def main() -> int:
    syms, groups = universe()
    print(f"Negative screen: {len(syms)} tickers")
    cache = load(CACHE, {})

    # the personal list first - those are the names Adi asks about
    priority = groups["watch"]
    ordered = priority + [s for s in syms if s not in priority]
    stale = [s for s in ordered if not is_fresh(cache.get(s, {}))]
    fetched = 0
    for s in stale[:MAX_FETCH_PER_RUN]:
        try:
            cache[s] = fetch_statements(s)
            fetched += 1
        except Exception as e:  # keep the old entry if the refetch fails
            print(f"  {s}: statements failed ({e})", file=sys.stderr)
        if fetched % 25 == 0:
            time.sleep(1)
    print(f"  statements fetched {fetched}, still stale {max(0, len(stale) - fetched)}")
    CACHE.write_text(json.dumps(cache, indent=1, sort_keys=True), encoding="utf-8")

    prices, last = price_flags(syms)
    history = load(HISTORY, {})
    rows = {}
    for s in syms:
        st = cache.get(s)
        if not st and s not in prices:
            continue
        fl = flags_for(st or {}, prices.get(s, {}))
        count = sum(1 for k in TESTED if fl[k]["on"])
        known = sum(1 for k in TESTED if fl[k]["on"] is not None)
        if known < 3:
            level = "unknown"   # not enough data to judge - never shown as clean
        else:
            level = "veto" if count >= VETO_AT else "caution" if count >= CAUTION_AT else "clean"
        rows[s] = {
            "companyName": (st or {}).get("companyName"),
            "count": count,
            "known": known,
            "level": level,
            "flags": fl,
            "asOf": (st or {}).get("fetchedAt"),
        }
        if s not in history and known >= 3 and last.get(s) and last.get("SPY"):
            history[s] = {"firstSeen": today(), "level": level, "count": count,
                          "price": last[s], "spy": last["SPY"]}

    # forward test: how each level has done since it was first screened
    tracked = {}
    for lvl in ("veto", "caution", "clean"):
        r = [(last[s] / h["price"] - 1, last["SPY"] / h["spy"] - 1)
             for s, h in history.items() if h["level"] == lvl and last.get(s) and h["firstSeen"] < today()]
        tracked[lvl] = {
            "n": len(r),
            "avgReturn": round(100 * float(np.mean([a for a, _ in r])), 1) if r else None,
            "avgExcess": round(100 * float(np.mean([a - b for a, b in r])), 1) if r else None,
        }

    HISTORY.write_text(json.dumps(history, indent=1, sort_keys=True), encoding="utf-8")
    out = {
        "meta": {
            "generatedAt": datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M"),
            "asOf": today(),
            "vetoAt": VETO_AT,
            "cautionAt": CAUTION_AT,
            "tested": TESTED,
            "trackingSince": min((h["firstSeen"] for h in history.values()), default=today()),
        },
        "groups": {"watch": groups["watch"]},
        "tracked": tracked,
        "tickers": rows,
    }
    OUT.write_text(json.dumps(out, indent=1, sort_keys=True), encoding="utf-8")
    levels = pd.Series([r["level"] for r in rows.values()]).value_counts().to_dict()
    print(f"  wrote {len(rows)} tickers: {levels}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
