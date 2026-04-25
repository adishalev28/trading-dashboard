/**
 * Market Breadth Scoring — the "Green Light Indicator"
 *
 * Computes a Go/No-Go signal from 3 components:
 *   1. Index Trend     — SPY & QQQ vs their SMA 50
 *   2. Stage 2 Density — is the qualified-tickers count rising or falling?
 *   3. Breakout Health — % of recent breakouts still above entry (proxy: count trend)
 *
 * History-dependent components (#2, #3) gracefully degrade when there is
 * insufficient history. With only #1 active the score still works — it's
 * the highest-weight signal anyway.
 */

const COMPONENT_AVAILABLE = "available";
const COMPONENT_COLLECTING = "collecting";

function scoreIndexTrend(indices) {
  if (!indices?.spy || !indices?.qqq) {
    return { points: 0, status: COMPONENT_COLLECTING, label: "no data" };
  }
  const spyOK = indices.spy.aboveSma50;
  const qqqOK = indices.qqq.aboveSma50;
  const both = spyOK && qqqOK;
  const either = spyOK || qqqOK;

  return {
    points: both ? 2 : either ? 1 : 0,
    status: COMPONENT_AVAILABLE,
    label: both
      ? "SPY + QQQ both above SMA 50"
      : either
        ? `Only ${spyOK ? "SPY" : "QQQ"} above SMA 50 — divergence`
        : "Both indices below SMA 50",
    spy: indices.spy,
    qqq: indices.qqq,
  };
}

function scoreStage2Density(stage2) {
  if (!stage2 || stage2.current == null || stage2.prev5d == null) {
    return {
      points: 0,
      status: COMPONENT_COLLECTING,
      label: "Collecting (need 5+ days of history)",
      current: stage2?.current ?? null,
    };
  }
  const changePct = stage2.changePct ?? 0;
  let points = 0;
  let label = "";
  if (changePct > 5) {
    points = 1;
    label = `Stage 2 expanding (+${changePct.toFixed(1)}% vs 5d ago)`;
  } else if (changePct < -5) {
    points = -1;
    label = `Stage 2 shrinking (${changePct.toFixed(1)}% vs 5d ago)`;
  } else {
    points = 0;
    label = `Stage 2 stable (${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}% vs 5d ago)`;
  }
  return { points, status: COMPONENT_AVAILABLE, label, ...stage2 };
}

function scoreBreakoutHealth(breakouts) {
  if (!breakouts || breakouts.current == null || breakouts.prev5d == null) {
    return {
      points: 0,
      status: COMPONENT_COLLECTING,
      label: "Collecting (need 5+ days of history)",
      current: breakouts?.current ?? null,
    };
  }
  // Proxy: if the breakout list is growing, momentum is healthy.
  // True success rate (held entry for N days) requires per-ticker tracking;
  // the history file collects breakoutTickers so a v2 can compute it.
  const change = breakouts.current - breakouts.prev5d;
  let points = 0;
  let label = "";
  if (change > 2) {
    points = 1;
    label = `Breakout pool growing (+${change} vs 5d ago)`;
  } else if (change < -2) {
    points = -1;
    label = `Breakout pool shrinking (${change} vs 5d ago)`;
  } else {
    points = 0;
    label = `Breakout pool steady (${change >= 0 ? "+" : ""}${change} vs 5d ago)`;
  }
  return { points, status: COMPONENT_AVAILABLE, label, ...breakouts };
}

function levelFromTotal(total, indexPoints, availableHistoricals) {
  // Bootstrap period: with no history yet, we lean entirely on the index trend.
  // Two indices above SMA 50 is a genuine all-clear; one is mixed; none is hostile.
  if (availableHistoricals === 0) {
    if (indexPoints === 2) return "green";
    if (indexPoints === 1) return "yellow";
    return "red";
  }
  // Once history is online, the combined score decides.
  if (total >= 3) return "green";
  if (total >= 1) return "yellow";
  if (total <= -1) return "red";
  if (indexPoints === 2) return "yellow";
  return "red";
}

const LEVEL_META = {
  green: {
    label: "GREEN LIGHT",
    headline: "Market is giving — press the gas",
    advice: "Full risk per trade (1% of account). Take A+ setups aggressively.",
    advice_he: "סיכון מלא 1% לטרייד. השוק תומך — קח את הסטאפים החזקים בלי להסס.",
    classes: {
      container: "border-emerald-500/60 bg-gradient-to-br from-emerald-950/80 to-emerald-900/40",
      circle: "bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.6)]",
      ring: "ring-emerald-400/50",
      text: "text-emerald-300",
      mutedText: "text-emerald-200/70",
    },
  },
  yellow: {
    label: "YELLOW — CAUTION",
    headline: "Mixed signals — half throttle",
    advice: "Half size (0.5% per trade). Only take the strongest setups.",
    advice_he: "חצי גודל פוזיציה (0.5%). רק הסטאפים הכי חזקים — בלי להתפזר.",
    classes: {
      container: "border-amber-500/60 bg-gradient-to-br from-amber-950/80 to-amber-900/40",
      circle: "bg-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.6)]",
      ring: "ring-amber-400/50",
      text: "text-amber-300",
      mutedText: "text-amber-200/70",
    },
  },
  red: {
    label: "RED — STAND DOWN",
    headline: "Market is hostile — stay in cash",
    advice: "No new long entries. Tighten stops on existing positions.",
    advice_he: "אין כניסות חדשות. להדק סטופים על פוזיציות קיימות. לשמור על הקופה.",
    classes: {
      container: "border-rose-500/60 bg-gradient-to-br from-rose-950/80 to-rose-900/40",
      circle: "bg-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.6)]",
      ring: "ring-rose-400/50",
      text: "text-rose-300",
      mutedText: "text-rose-200/70",
    },
  },
};

export function computeMarketBreadth(breadth) {
  const indexTrend = scoreIndexTrend(breadth?.indices);
  const stage2Density = scoreStage2Density(breadth?.stage2);
  const breakoutHealth = scoreBreakoutHealth(breadth?.breakouts);

  const total = indexTrend.points + stage2Density.points + breakoutHealth.points;
  const availableHistoricals =
    (stage2Density.status === COMPONENT_AVAILABLE ? 1 : 0) +
    (breakoutHealth.status === COMPONENT_AVAILABLE ? 1 : 0);
  const level = levelFromTotal(total, indexTrend.points, availableHistoricals);
  const meta = LEVEL_META[level];

  return {
    level,
    total,
    meta,
    components: {
      indexTrend,
      stage2Density,
      breakoutHealth,
    },
    asOf: breadth?.asOf ?? null,
  };
}

export { COMPONENT_AVAILABLE, COMPONENT_COLLECTING };
