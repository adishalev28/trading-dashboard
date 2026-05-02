/**
 * Performance Tracker — compute return-since-first-seen for every ticker
 * that ever appeared in Potential Breakouts or Top Picks.
 *
 * Inputs:
 *   - performanceData.tickers: { [sym]: { firstSeen, entryPrice, appearances[],
 *                                          topPicksHistory[], bestTopPickScore } }
 *   - mockTickers: today's full ticker list (used for current price + sector)
 *
 * Output:
 *   Array of rows { ticker, sector, firstSeen, lastSeen, entryPrice,
 *                   currentPrice, changePct, daysHeld, wasBreakout, wasTopPick,
 *                   bestTopPickScore, bestTopPickGrade, bestTopPickDate,
 *                   appearancesCount, topPicksCount }
 */

function dateDiffDays(a, b) {
  const aDate = new Date(a);
  const bDate = new Date(b);
  return Math.max(0, Math.round((bDate - aDate) / (1000 * 60 * 60 * 24)));
}

function gradeFromScore(score) {
  if (score == null) return null;
  if (score >= 80) return "A+";
  if (score >= 65) return "A";
  if (score >= 50) return "B+";
  if (score >= 35) return "B";
  return "C";
}

export function buildPerformanceRows(performanceData, mockTickers) {
  const today = new Date().toISOString().slice(0, 10);
  const liveMap = {};
  for (const t of mockTickers || []) {
    liveMap[t.ticker] = t;
  }

  const rows = [];
  const trackedTickers = performanceData?.tickers ?? {};

  for (const [sym, data] of Object.entries(trackedTickers)) {
    const live = liveMap[sym];
    const currentPrice = live?.price ?? null;
    const entryPrice = data.entryPrice ?? null;

    const changePct = (entryPrice && currentPrice && entryPrice > 0)
      ? ((currentPrice - entryPrice) / entryPrice) * 100
      : null;

    const wasTopPick = (data.topPicksHistory?.length ?? 0) > 0;
    const wasBreakout = (data.appearances?.length ?? 0) > 0;
    const topPicksCount = data.topPicksHistory?.length ?? 0;
    const breakoutCount = data.appearances?.length ?? 0;
    const bestScore = data.bestTopPickScore ?? null;

    // Earliest topPick appearance (the day it first hit A+ filter)
    let bestTopPickDate = null;
    let bestTopPickGrade = null;
    if (wasTopPick) {
      const sortedByScore = [...data.topPicksHistory].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      const winner = sortedByScore[0];
      bestTopPickDate = winner?.date ?? null;
      bestTopPickGrade = winner?.grade ?? gradeFromScore(winner?.score);
    }

    rows.push({
      ticker: sym,
      companyName: live?.companyName ?? sym,
      sector: live?.sector ?? "—",
      firstSeen: data.firstSeen,
      lastSeen: data.lastSeen ?? data.firstSeen,
      daysHeld: dateDiffDays(data.firstSeen, today),
      entryPrice,
      currentPrice,
      changePct,
      wasBreakout,
      wasTopPick,
      breakoutCount,
      topPicksCount,
      bestTopPickScore: bestScore,
      bestTopPickGrade,
      bestTopPickDate,
      // Latest live signal data
      rsScore: live?.rsScore,
      volumeSurge: live?.volumeSurge,
    });
  }

  return rows;
}

export function summarizeRows(rows) {
  const valid = rows.filter(r => r.changePct != null);
  const n = valid.length;
  if (n === 0) {
    return { count: 0, winners: 0, winnersPct: 0, avgReturn: 0, medianReturn: 0, bigWinners: 0, bigLosers: 0 };
  }
  const winners = valid.filter(r => r.changePct > 0);
  const bigWinners = valid.filter(r => r.changePct >= 5);
  const bigLosers = valid.filter(r => r.changePct <= -5);
  const sum = valid.reduce((acc, r) => acc + r.changePct, 0);
  const sortedReturns = valid.map(r => r.changePct).sort((a, b) => a - b);
  const median = sortedReturns[Math.floor(n / 2)];
  return {
    count: n,
    winners: winners.length,
    winnersPct: (winners.length / n) * 100,
    avgReturn: sum / n,
    medianReturn: median,
    bigWinners: bigWinners.length,
    bigLosers: bigLosers.length,
  };
}

export const SORT_KEYS = {
  changePct: { label: "Return %", default: "desc" },
  firstSeen: { label: "First seen", default: "desc" },
  ticker:    { label: "Ticker",     default: "asc"  },
  bestTopPickScore: { label: "Best Score", default: "desc" },
};

export function sortRows(rows, key, dir) {
  const out = [...rows];
  out.sort((a, b) => {
    let av = a[key];
    let bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string") {
      return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return dir === "asc" ? av - bv : bv - av;
  });
  return out;
}
