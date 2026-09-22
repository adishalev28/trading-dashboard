#!/usr/bin/env python3
"""
Monthly learning report - what the dashboard's lists actually did, measured forward.

Runs on the 2nd of every month (monthly-review.yml) and writes research/monthly/YYYY-MM.md.
Nothing here trades or recommends: it measures every list against SPY so each month
we can see what works, what doesn't, and adjust. Buy-and-hold from the first day a
ticker appeared, to the latest close.

Sections:
  1. Red flags forward test - veto / caution / clean since first screened
  2. Top Picks cohorts by the month they first appeared
  3. Potential Breakouts cohorts by the month they first appeared
  4. Long-term list since it was first tracked
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import yfinance as yf

ROOT = Path(__file__).resolve().parent.parent
PERF = ROOT / "scripts/performance_data.json"
LT_HIST = ROOT / "scripts/long_term_history.json"
RF_HIST = ROOT / "scripts/negative_screen_history.json"
OUT_DIR = ROOT / "research/monthly"


def load(p: Path, default):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def main() -> int:
    perf = load(PERF, {}).get("tickers", {})
    lt = load(LT_HIST, {}).get("tickers", {})
    rf = load(RF_HIST, {})

    entries = []  # (group, cohort, sym, date)
    for s, v in perf.items():
        tp = sorted(h["date"] for h in v.get("topPicksHistory", []))
        if tp:
            entries.append(("Top Picks", tp[0][:7], s, tp[0]))
        bo = sorted(a["date"] for a in v.get("appearances", []) if "breakout" in a["lists"])
        if bo:
            entries.append(("Breakouts", bo[0][:7], s, bo[0]))
    for s, v in lt.items():
        entries.append(("Long term", v["firstSeen"][:7], s, v["firstSeen"]))
    for s, v in rf.items():
        entries.append((f"Red flags: {v['level']}", v["firstSeen"][:7], s, v["firstSeen"]))

    syms = sorted({e[2] for e in entries})
    start = min(e[3] for e in entries)
    start = (datetime.strptime(start, "%Y-%m-%d") - timedelta(days=10)).strftime("%Y-%m-%d")
    px = yf.download(syms + ["SPY"], start=start, auto_adjust=True, progress=False, threads=True)["Close"]
    px = px.dropna(how="all")
    last_day = px.index[-1]

    def at(sym, d):
        s = px[sym].dropna() if sym in px else pd.Series(dtype=float)
        s = s[s.index <= pd.Timestamp(d)]
        return s.iloc[-1] if len(s) else None

    rows = []
    for group, cohort, s, d in entries:
        p0, p1 = at(s, d), (px[s].dropna().iloc[-1] if s in px and px[s].notna().any() else None)
        s0, s1 = at("SPY", d), px["SPY"].dropna().iloc[-1]
        if p0 is None or p1 is None or s0 is None or pd.Timestamp(d) >= last_day:
            continue
        r, spy = p1 / p0 - 1, s1 / s0 - 1
        rows.append(dict(group=group, cohort=cohort, sym=s, ret=r, excess=r - spy))
    df = pd.DataFrame(rows)

    def table(g: pd.DataFrame, by: str) -> str:
        lines = ["| | n | avg return | median | avg vs SPY | median vs SPY | beat SPY | lost 30%+ |",
                 "|---|---|---|---|---|---|---|---|"]
        for k, x in g.groupby(by):
            lines.append(f"| {k} | {len(x)} | {100*x.ret.mean():+.1f}% | {100*x.ret.median():+.1f}% | "
                         f"{100*x.excess.mean():+.1f} | {100*x.excess.median():+.1f} | "
                         f"{100*(x.excess > 0).mean():.0f}% | {int((x.ret <= -0.3).sum())} |")
        return "\n".join(lines)

    month = datetime.now(tz=timezone.utc).strftime("%Y-%m")
    parts = [f"# Monthly learning report - {month}",
             f"Prices to {last_day.date()}. Buy and hold from each ticker's first appearance, vs SPY over the same days.",
             "Measurement only - no trades, no recommendations. Read it together, then decide what to change.", ""]
    for title, key in [("1. Red flags - forward test", "Red flags"), ("2. Top Picks by cohort", "Top Picks"),
                       ("3. Potential Breakouts by cohort", "Breakouts"), ("4. Long-term list", "Long term")]:
        g = df[df.group.str.startswith(key)]
        parts.append(f"## {title}")
        if g.empty:
            parts.append("_no data yet_\n")
            continue
        parts.append(table(g, "group" if key == "Red flags" else "cohort"))
        parts.append("")
    parts += ["## Questions for the review",
              "- Is the veto group still lagging the clean group? (the 3-flag rule was tested on spring-summer 2026 only)",
              "- Do any cohorts beat SPY after ~25% tax and commissions? If not, nothing to act on.",
              "- Anything that changed sign since last month?"]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{month}.md"
    out.write_text("\n".join(parts) + "\n", encoding="utf-8")
    df.to_csv(OUT_DIR / f"{month}.csv", index=False)
    print(f"wrote {out} ({len(df)} rows)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
