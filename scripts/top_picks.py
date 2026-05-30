"""
Python port of src/lib/topPicks.js — strict A+ filter on top of Potential Breakouts.

Used by fetch_data.py to record which tickers qualified as Top Picks each day,
so the Performance Tracker can compare Top Picks vs. broader Breakouts over time.

Hard filters (must pass):
  - Volume confirmation (surge / rising)
  - No earnings within 7 days

Score (0-100):
  - RS:        25 (≥90), 20 (≥85), 10 (≥80)
  - Volume:    20 (surge), 10 (rising)
  - Sector:    15 (≥80), 10 (≥60), 5 (≥40)
  - EPS YoY:   15 (≥40%), 8 (≥25%), 3 (>0)
  - Sales YoY: 10 (≥40%), 5 (≥25%), 2 (>0)
  - Pivot:     10 (≤0.5%), 7 (≤1%), 4 (≤2%)
  - VCP:       5 (tight), 2 (loose)

Min score 50 to qualify; up to 3 picks per day.
"""

from datetime import datetime, timezone

MIN_SCORE = 50
MAX_PICKS = 3
EARNINGS_BLACKOUT_DAYS = 7


def days_until_earnings(earnings_date_str):
    if not earnings_date_str:
        return float("inf")
    try:
        ed = datetime.strptime(earnings_date_str, "%Y-%m-%d")
        today = datetime.utcnow()
        return (ed - today).days
    except Exception:
        return float("inf")


def score_volume(volume_surge):
    if volume_surge == "surge":  return 20
    if volume_surge == "rising": return 10
    return 0


def score_rs(rs):
    if rs is None:    return 0
    if rs >= 90:      return 25
    if rs >= 85:      return 20
    return 10


def score_sector(strength):
    if strength is None: return 0
    if strength >= 80:   return 15
    if strength >= 60:   return 10
    if strength >= 40:   return 5
    return 0


def score_eps(eps):
    if eps is None: return 0
    if eps >= 40:   return 15
    if eps >= 25:   return 8
    if eps > 0:     return 3
    return 0


def score_sales(sales):
    if sales is None: return 0
    if sales >= 40:   return 10
    if sales >= 25:   return 5
    if sales > 0:     return 2
    return 0


def score_pivot(dist_pct):
    if dist_pct is None: return 0
    if dist_pct <= 0.5:  return 10
    if dist_pct <= 1:    return 7
    return 4


def score_vcp(vcp):
    if vcp == "tight": return 5
    if vcp == "loose": return 2
    return 0


def grade_from_score(score):
    if score >= 80: return "A+"
    if score >= 65: return "A"
    if score >= 50: return "B+"
    if score >= 35: return "B"
    return "C"


def compute_tags(ticker):
    """Non-blocking observation tags — mirror of computeTags() in
    src/lib/topPicks.js. These do NOT affect the score; they're recorded in
    performance_data.json so we can later measure whether picks carrying a
    given trait outperform or underperform.

      extended    — price stretched >=15% above its 20-day MA
      eps_extreme — EPS YoY > 300% (likely low-base / one-time — verify quality)
    """
    tags = []
    sma20 = ticker.get("sma20")
    price = ticker.get("price")
    if sma20 and sma20 > 0 and price:
        ext = (price - sma20) / sma20 * 100
        if ext >= 15:
            tags.append("extended")
    eps = ticker.get("epsGrowthYoY")
    if eps is not None and eps > 300:
        tags.append("eps_extreme")
    return tags


def is_potential_breakout(ticker):
    """Mirror of src/lib/screener.js findPotentialBreakouts gate.
    Stage 2 is already enforced by the upstream filter, so we only check
    the additional RS≥80 + within 2% of pivot rules here."""
    rs = ticker.get("rsScore", 0)
    if rs < 80:
        return False
    dist = ticker.get("distToPivotPct")
    if dist is None or dist > 2:
        return False
    return True


def compute_top_picks(tickers, sectors):
    """Returns list of dicts: { ticker, score, grade, days_to_earnings }
    sorted by score descending, up to MAX_PICKS entries."""
    sector_strength = {s["name"]: s.get("strengthScore") for s in (sectors or [])}

    candidates = [t for t in tickers if is_potential_breakout(t)]

    eligible = []
    for t in candidates:
        if score_volume(t.get("volumeSurge", "none")) == 0:
            continue
        dte = days_until_earnings(t.get("earningsDate"))
        if dte < EARNINGS_BLACKOUT_DAYS:
            continue
        eligible.append((t, dte))

    scored = []
    for t, dte in eligible:
        score = (
            score_rs(t.get("rsScore"))
            + score_volume(t.get("volumeSurge"))
            + score_sector(sector_strength.get(t.get("sector")))
            + score_eps(t.get("epsGrowthYoY"))
            + score_sales(t.get("salesGrowthYoY"))
            + score_pivot(t.get("distToPivotPct"))
            + score_vcp(t.get("vcpStatus"))
        )
        if score >= MIN_SCORE:
            scored.append({
                "ticker": t["ticker"],
                "price": t.get("price"),
                "score": score,
                "grade": grade_from_score(score),
                "daysToEarnings": dte if dte != float("inf") else None,
                "tags": compute_tags(t),
            })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:MAX_PICKS]
