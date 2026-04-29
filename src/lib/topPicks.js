/**
 * Today's Top 3 Picks — strict A+ filter on top of findPotentialBreakouts.
 *
 * The funnel:
 *   findPotentialBreakouts (~30 stocks)
 *     ↓ require volume confirmation + earnings safety
 *     ↓ score remaining stocks 0-100 across 7 factors
 *     ↓ keep only those scoring ≥50
 *     ↓ take top 3 by score
 *   = up to 3 A+ setups for the day, sometimes zero.
 *
 * Zero picks is a feature, not a bug. Disciplined trading means
 * waiting for high-quality setups instead of forcing trades.
 */

import { findPotentialBreakouts } from "./screener";

const MIN_SCORE = 50;
const MAX_PICKS = 3;
const EARNINGS_BLACKOUT_DAYS = 7;

function daysUntilEarnings(earningsDate) {
  if (!earningsDate) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ed = new Date(earningsDate);
  return Math.round((ed - today) / (1000 * 60 * 60 * 24));
}

function scoreVolumeSurge(volumeSurge) {
  if (volumeSurge === "surge") return { points: 20, label: "SURGE volume" };
  if (volumeSurge === "rising") return { points: 10, label: "Rising volume" };
  return { points: 0, label: "No volume confirmation" };
}

function scoreRS(rsScore) {
  if (rsScore >= 90) return { points: 25, label: `RS ${rsScore} (A+)` };
  if (rsScore >= 85) return { points: 20, label: `RS ${rsScore} (A)` };
  return { points: 10, label: `RS ${rsScore}` };
}

function scoreSector(strengthScore) {
  if (strengthScore == null) return { points: 0, label: "Sector unknown" };
  if (strengthScore >= 80) return { points: 15, label: `Sector ${strengthScore} (leading)` };
  if (strengthScore >= 60) return { points: 10, label: `Sector ${strengthScore} (strong)` };
  if (strengthScore >= 40) return { points: 5, label: `Sector ${strengthScore} (mid)` };
  return { points: 0, label: `Sector ${strengthScore} (weak)` };
}

function scoreEPS(epsGrowth) {
  if (epsGrowth == null) return { points: 0, label: "EPS unknown" };
  if (epsGrowth >= 40) return { points: 15, label: `EPS +${Math.round(epsGrowth)}% (explosive)` };
  if (epsGrowth >= 25) return { points: 8, label: `EPS +${Math.round(epsGrowth)}% (strong)` };
  if (epsGrowth > 0) return { points: 3, label: `EPS +${Math.round(epsGrowth)}%` };
  return { points: 0, label: `EPS ${Math.round(epsGrowth)}% (weak)` };
}

function scoreSales(salesGrowth) {
  if (salesGrowth == null) return { points: 0, label: "Sales unknown" };
  if (salesGrowth >= 40) return { points: 10, label: `Sales +${Math.round(salesGrowth)}%` };
  if (salesGrowth >= 25) return { points: 5, label: `Sales +${Math.round(salesGrowth)}%` };
  if (salesGrowth > 0) return { points: 2, label: `Sales +${Math.round(salesGrowth)}%` };
  return { points: 0, label: `Sales ${Math.round(salesGrowth)}% (weak)` };
}

function scorePivot(distToPivotPct) {
  if (distToPivotPct == null) return { points: 0, label: "Pivot unknown" };
  if (distToPivotPct <= 0.5) return { points: 10, label: `${distToPivotPct.toFixed(1)}% to pivot (imminent)` };
  if (distToPivotPct <= 1) return { points: 7, label: `${distToPivotPct.toFixed(1)}% to pivot (close)` };
  return { points: 4, label: `${distToPivotPct.toFixed(1)}% to pivot` };
}

function scoreVCP(vcpStatus) {
  if (vcpStatus === "tight") return { points: 5, label: "VCP tight" };
  if (vcpStatus === "loose") return { points: 2, label: "VCP loose" };
  return { points: 0, label: null };
}

/**
 * Score a single ticker 0-100 across all factors.
 * Returns { score, breakdown: [...{points, label}], grade }.
 */
export function computeSetupScore(ticker, sectorMap) {
  const sectorStrength = sectorMap[ticker.sector]?.strengthScore;

  const breakdown = {
    rs: scoreRS(ticker.rsScore),
    volume: scoreVolumeSurge(ticker.volumeSurge),
    sector: scoreSector(sectorStrength),
    eps: scoreEPS(ticker.epsGrowthYoY),
    sales: scoreSales(ticker.salesGrowthYoY),
    pivot: scorePivot(ticker.distToPivotPct),
    vcp: scoreVCP(ticker.vcpStatus),
  };

  const score = Object.values(breakdown).reduce((sum, b) => sum + b.points, 0);

  let grade;
  if (score >= 80) grade = "A+";
  else if (score >= 65) grade = "A";
  else if (score >= 50) grade = "B+";
  else if (score >= 35) grade = "B";
  else grade = "C";

  return { score, grade, breakdown };
}

/**
 * Find today's top picks — strictest filter of all.
 *
 * @param {Array} tickers — full ticker list from mockData
 * @param {Array} sectors — sector list (for strength lookup)
 * @returns {{ picks: Array, totalCandidates: number, rejectedReasons: Object }}
 *   picks: array of { ticker, score, grade, breakdown, daysToEarnings }
 *   totalCandidates: # of stocks in initial Potential Breakouts pool
 *   rejectedReasons: counts of why candidates were filtered out
 */
export function findTopPicks(tickers, sectors) {
  const sectorMap = {};
  for (const s of sectors || []) {
    sectorMap[s.name] = s;
  }

  // Step 1: start with the existing Potential Breakouts list
  const candidates = findPotentialBreakouts(tickers);

  const rejectedReasons = {
    noVolumeConfirmation: 0,
    earningsTooSoon: 0,
    scoreTooLow: 0,
  };

  // Step 2: apply hard filters
  const eligible = [];
  for (const t of candidates) {
    if (!t.volumeSurge || t.volumeSurge === "none") {
      rejectedReasons.noVolumeConfirmation++;
      continue;
    }
    const dte = daysUntilEarnings(t.earningsDate);
    if (dte < EARNINGS_BLACKOUT_DAYS) {
      rejectedReasons.earningsTooSoon++;
      continue;
    }
    eligible.push({ ticker: t, daysToEarnings: dte });
  }

  // Step 3: score and rank
  const scored = eligible.map(({ ticker, daysToEarnings }) => {
    const { score, grade, breakdown } = computeSetupScore(ticker, sectorMap);
    return { ticker, score, grade, breakdown, daysToEarnings };
  });

  // Step 4: minimum score gate
  const passed = scored.filter(s => {
    if (s.score < MIN_SCORE) {
      rejectedReasons.scoreTooLow++;
      return false;
    }
    return true;
  });

  // Step 5: top N by score
  passed.sort((a, b) => b.score - a.score);
  const picks = passed.slice(0, MAX_PICKS);

  return {
    picks,
    totalCandidates: candidates.length,
    rejectedReasons,
  };
}

export { MIN_SCORE, MAX_PICKS, EARNINGS_BLACKOUT_DAYS };
