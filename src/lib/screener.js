/**
 * Pure functions for screening & risk calculation
 * No React, no side effects — easy to test
 */
import { COMMISSION_THRESHOLDS, STAGE2_CRITERIA } from "./constants";

// ─── Risk Calculator ─────────────────────────────────────────────────────

/**
 * Calculate Meitav Trade position size and commission risk
 *
 * @param {Object} state
 * @param {number} state.equityIls        — Account equity in ILS
 * @param {number} state.riskPct          — Risk % per trade (e.g. 1)
 * @param {number} state.entryUsd         — Entry price USD
 * @param {number} state.stopUsd          — Stop loss USD
 * @param {number} state.fxRate           — USD → ILS (e.g. 3.7)
 * @param {number} state.commissionRoundTripUsd — Total buy+sell commission USD (default $14)
 */
export function calcRisk({
  equityIls,
  riskPct,
  entryUsd,
  stopUsd,
  fxRate,
  commissionRoundTripUsd,
}) {
  // ─── Invalid input guards ──
  if (
    !Number.isFinite(equityIls) || equityIls <= 0 ||
    !Number.isFinite(riskPct) || riskPct <= 0 ||
    !Number.isFinite(entryUsd) || entryUsd <= 0 ||
    !Number.isFinite(stopUsd) || stopUsd <= 0 ||
    !Number.isFinite(fxRate) || fxRate <= 0 ||
    !Number.isFinite(commissionRoundTripUsd) || commissionRoundTripUsd < 0
  ) {
    return {
      level: "INVALID",
      invalidReason: "Fill all fields with positive numbers",
      riskPerShareUsd: 0, riskAmountIls: 0, riskAmountUsd: 0,
      shares: 0, positionValueUsd: 0, positionValueIls: 0,
      commissionPct: 0,
    };
  }

  if (stopUsd >= entryUsd) {
    return {
      level: "INVALID",
      invalidReason: "Stop loss must be below entry price",
      riskPerShareUsd: 0, riskAmountIls: 0, riskAmountUsd: 0,
      shares: 0, positionValueUsd: 0, positionValueIls: 0,
      commissionPct: 0,
    };
  }

  // ─── Core calculations ──
  const riskPerShareUsd = entryUsd - stopUsd;
  const riskAmountIls   = equityIls * (riskPct / 100);
  const riskAmountUsd   = riskAmountIls / fxRate;
  const shares          = Math.max(0, Math.floor(riskAmountUsd / riskPerShareUsd));
  const positionValueUsd = shares * entryUsd;
  const positionValueIls = positionValueUsd * fxRate;

  const commissionPct = positionValueUsd > 0
    ? (commissionRoundTripUsd / positionValueUsd) * 100
    : Infinity;

  let level;
  if (shares === 0) level = "DANGER";
  else if (commissionPct < COMMISSION_THRESHOLDS.SAFE)    level = "SAFE";
  else if (commissionPct <= COMMISSION_THRESHOLDS.CAUTION) level = "CAUTION";
  else                                                     level = "DANGER";

  return {
    level,
    invalidReason: null,
    riskPerShareUsd,
    riskAmountIls,
    riskAmountUsd,
    shares,
    positionValueUsd,
    positionValueIls,
    commissionPct,
  };
}

// ─── Stage 2 Classification ──────────────────────────────────────────────

/**
 * Returns true if a ticker meets Weinstein Stage 2 criteria
 */
export function isStage2(ticker) {
  if (!ticker) return false;
  const { price, sma150, sma200, rsScore, weekHighDistance } = ticker;

  // Price above both SMAs, SMA 150 above SMA 200 (rising MAs)
  const trendOk = price > sma150 && sma150 > sma200;

  // RS score above threshold
  const rsOk = rsScore >= STAGE2_CRITERIA.MIN_RS_SCORE;

  // Within range of 52-week high
  const proximityOk = weekHighDistance <= STAGE2_CRITERIA.MAX_52W_HIGH_DISTANCE;

  return trendOk && rsOk && proximityOk;
}

/**
 * Classify trend strength for TrendBadge
 * Returns: "stage2" | "warning" | "avoid"
 */
export function trendClassification({ price, sma150, sma200 }) {
  if (price > sma150 && sma150 > sma200) return "stage2";      // Above rising 150 > 200
  if (price > sma200)                     return "warning";    // Above 200 but not full Stage 2
  return "avoid";                                              // Below 200 MA
}

// ─── RS Tier Classification ──────────────────────────────────────────────

/**
 * Map RS score 0-100 to IBD-style tier
 */
export function rsTier(score) {
  if (score >= 90) return { label: "A+", color: "emerald" };
  if (score >= 80) return { label: "A",  color: "emerald" };
  if (score >= 70) return { label: "B",  color: "amber" };
  if (score >= 50) return { label: "C",  color: "amber" };
  return               { label: "D",  color: "rose" };
}

// ─── Sector Sorting ──────────────────────────────────────────────────────

export function sortSectors(sectors, key = "strengthScore", dir = "desc") {
  const arr = [...sectors];
  arr.sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === "string") {
      return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return dir === "asc" ? av - bv : bv - av;
  });
  return arr;
}

// ─── Ticker Sorting ──────────────────────────────────────────────────────

// VCP sort priority: tight (3) > loose (2) > none (1)
const VCP_SORT_ORDER = { tight: 3, loose: 2, none: 1 };

export function sortTickers(tickers, key = "rsScore", dir = "desc") {
  const arr = [...tickers];
  arr.sort((a, b) => {
    let av = a[key];
    let bv = b[key];
    // Special handling for VCP status — sort by priority, not alphabetically
    if (key === "vcpStatus") {
      av = VCP_SORT_ORDER[av] ?? 0;
      bv = VCP_SORT_ORDER[bv] ?? 0;
      return dir === "asc" ? av - bv : bv - av;
    }
    if (typeof av === "string") {
      return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return dir === "asc" ? av - bv : bv - av;
  });
  return arr;
}
