/**
 * Position Health — at-a-glance verdict for an open trade.
 *
 * Combines three lenses:
 *   1. Trend     — where is price relative to SMA 20 / SMA 50 and Stage 2 status
 *   2. Strength  — Relative Strength rank (RS Score)
 *   3. Geometry  — Gann Square-of-9 zones anchored on the entry price
 *
 * Output: { level: 'healthy' | 'caution' | 'exit', reasons[], milestone }
 *
 * Profit milestones (independent of health):
 *   +10%  → "Take 50%"   (Minervini: pay yourself, then ride the rest)
 *   +20%  → "Move stop to breakeven"
 *   +3R   → "Target hit"  (handled separately in PortfolioTable)
 */

import { calculateGannLevels } from "./gann_math";
import { isStage2 } from "./screener";

const HEALTH_LEVELS = {
  healthy: {
    label: "Healthy",
    label_he: "בריא",
    classes: "bg-emerald-950 text-emerald-400 border-emerald-700",
    dotClass: "bg-emerald-400",
  },
  caution: {
    label: "Caution",
    label_he: "להיזהר",
    classes: "bg-amber-950 text-amber-400 border-amber-700",
    dotClass: "bg-amber-400",
  },
  exit: {
    label: "Exit",
    label_he: "לצאת",
    classes: "bg-rose-950 text-rose-400 border-rose-700",
    dotClass: "bg-rose-500 animate-pulse",
  },
};

function nearestGannDown(entryPrice) {
  const levels = calculateGannLevels(entryPrice);
  const downs = levels.filter(l => l.direction === "down").sort((a, b) => b.price - a.price);
  return downs[0] ?? null; // closest down level (90°)
}

export function computePositionHealth(position, liveTicker) {
  if (!position) {
    return { level: "caution", reasons: ["Missing position data"], milestone: null, meta: HEALTH_LEVELS.caution };
  }

  // No live data → cannot evaluate; assume caution.
  if (!liveTicker) {
    return {
      level: "caution",
      reasons: ["No live data — ticker may not be in current screen"],
      milestone: null,
      meta: HEALTH_LEVELS.caution,
    };
  }

  const reasons = [];
  let bad = 0;   // counts EXIT-grade signals
  let warn = 0;  // counts CAUTION-grade signals

  const price = liveTicker.price ?? position.entryPrice;
  const sma20 = liveTicker.sma20;
  const sma50 = liveTicker.sma50 ?? null;
  const sma150 = liveTicker.sma150;
  const sma200 = liveTicker.sma200;
  const rs = liveTicker.rsScore;

  // ── Trend ──────────────────────────────────────────────────────────
  if (sma50 != null && price < sma50) {
    bad++;
    reasons.push(`Below SMA 50 ($${sma50.toFixed(2)})`);
  } else if (sma20 != null && price < sma20) {
    warn++;
    reasons.push(`Below SMA 20 ($${sma20.toFixed(2)}) — momentum slowing`);
  }

  if (!isStage2(liveTicker)) {
    bad++;
    reasons.push("Lost Stage 2");
  }

  // ── Strength ───────────────────────────────────────────────────────
  if (rs != null) {
    if (rs < 60) {
      bad++;
      reasons.push(`RS ${rs} — broken`);
    } else if (rs < 70) {
      warn++;
      reasons.push(`RS ${rs} — softening`);
    }
  }

  // ── Gann geometry (anchored on entry price) ────────────────────────
  const gannDown = nearestGannDown(position.entryPrice);
  if (gannDown) {
    const distFromGannDownPct = ((price - gannDown.price) / gannDown.price) * 100;
    if (price < gannDown.price) {
      bad++;
      reasons.push(`Below 90° Gann support ($${gannDown.price})`);
    } else if (distFromGannDownPct < 2) {
      warn++;
      reasons.push(`At 90° Gann support ($${gannDown.price}) — decision zone`);
    }
  }

  // ── Profit milestones (separate from health) ───────────────────────
  const pnlPct = position.entryPrice > 0
    ? ((price - position.entryPrice) / position.entryPrice) * 100
    : 0;

  let milestone = null;
  if (pnlPct >= 20) {
    milestone = {
      type: "trail",
      label: "+20% — Tighten Stop",
      label_he: "+20% — להדק סטופ",
      hint: "Move stop to breakeven at minimum. Let the runner run.",
      classes: "bg-emerald-900 text-emerald-200 border-emerald-500",
    };
  } else if (pnlPct >= 10) {
    milestone = {
      type: "sell-half",
      label: "+10% — Take 50%",
      label_he: "+10% — מכור חצי",
      hint: "Sell half to lock in profit, ride the rest with a trailing stop.",
      classes: "bg-emerald-900 text-emerald-200 border-emerald-500",
    };
  }

  // ── Verdict ────────────────────────────────────────────────────────
  let level;
  if (bad >= 1) level = "exit";
  else if (warn >= 1) level = "caution";
  else level = "healthy";

  if (level === "healthy" && reasons.length === 0) {
    reasons.push("All signals nominal — let it run");
  }

  return {
    level,
    reasons,
    milestone,
    pnlPct: Math.round(pnlPct * 10) / 10,
    meta: HEALTH_LEVELS[level],
  };
}

export { HEALTH_LEVELS };
