/**
 * W.D. Gann math — two complementary geometric tools.
 *
 *   calculateGannBoxLevels({ price, swingHigh, swingLow })
 *     The Gann Box: divides a recent swing high/low range into eighths
 *     (0%, 1/8, 1/4, 3/8, 1/2★, 5/8, 3/4, 7/8, 100%) and projects extensions
 *     above the high and below the low. 1/2 is "the killer" — the single
 *     most important Gann level — once price closes above or below 1/2 of a
 *     range, it tends to travel the rest of the way to the next extreme.
 *     USE FOR: chart overlay / setup analysis on the daily timeframe.
 *
 *   calculateGannLevels(price)
 *     The Square of 9: a spiral around a single anchor price. Uses √price
 *     plus 0.5 / 1.0 / 2.0 increments to find levels at 90° / 180° / 360°.
 *     Returns symmetric "up" and "down" levels (resistance/support).
 *     USE FOR: anchoring on a known reference (e.g. an entry price) to find
 *     the nearest geometric support without needing a swing high/low pair.
 *
 * Both treat Gann as confluence — geometric, not statistically validated.
 */

// ─────────────────────────────────────────────────────────────────────────
// Gann Box (range-based)
// ─────────────────────────────────────────────────────────────────────────

const FRACTIONS_IN_BOX = [
  { ratio: 0,     label: "0%",   importance: "edge" },     // swing low
  { ratio: 0.125, label: "1/8",  importance: "minor" },
  { ratio: 0.25,  label: "1/4",  importance: "key" },
  { ratio: 0.375, label: "3/8",  importance: "minor" },
  { ratio: 0.5,   label: "1/2",  importance: "critical" }, // ★ the most important Gann level
  { ratio: 0.625, label: "5/8",  importance: "key" },
  { ratio: 0.75,  label: "3/4",  importance: "key" },
  { ratio: 0.875, label: "7/8",  importance: "minor" },
  { ratio: 1,     label: "100%", importance: "edge" },     // swing high
];

const EXTENSIONS_ABOVE = [
  { ratio: 1.125, label: "112%", importance: "minor" },
  { ratio: 1.25,  label: "125%", importance: "key" },
  { ratio: 1.5,   label: "150%", importance: "key" },
  { ratio: 2,     label: "200%", importance: "key" },
];

const EXTENSIONS_BELOW = [
  { ratio: -0.125, label: "-12%", importance: "minor" },
  { ratio: -0.25,  label: "-25%", importance: "key" },
  { ratio: -0.5,   label: "-50%", importance: "key" },
];

/**
 * Find swing high and low from a price history array, along with the
 * index of each extreme. The indexes are what enable time-projection:
 * we need to know WHEN the high and low occurred, not just the values.
 *
 * For a 30-day series of daily closes this is the 30-day high and
 * 30-day low — the standard "recent swing range" for a daily Gann Box.
 *
 * @param {number[]} priceHistory
 * @returns {{ high: number, low: number, highIdx: number, lowIdx: number } | null}
 */
export function findSwingPoints(priceHistory) {
  if (!Array.isArray(priceHistory) || priceHistory.length === 0) return null;
  let high = -Infinity;
  let low = Infinity;
  let highIdx = -1;
  let lowIdx = -1;
  for (let i = 0; i < priceHistory.length; i++) {
    const p = priceHistory[i];
    if (!Number.isFinite(p) || p <= 0) continue;
    if (p > high) {
      high = p;
      highIdx = i;
    }
    if (p < low) {
      low = p;
      lowIdx = i;
    }
  }
  if (!Number.isFinite(high) || !Number.isFinite(low) || high <= low) return null;
  return { high, low, highIdx, lowIdx };
}

// Time-projection fractions. Same eighths as the price box, with two
// extensions (1.5×, 2×) and a "1×" mirror that is the single most
// important time forecast: when price has traveled the full range, it
// often reverses on the day it has "squared" with the range duration.
const TIME_FRACTIONS = [
  { ratio: 0.125, label: "1/8",  importance: "minor" },
  { ratio: 0.25,  label: "1/4",  importance: "key" },
  { ratio: 0.375, label: "3/8",  importance: "minor" },
  { ratio: 0.5,   label: "1/2",  importance: "critical" }, // ★ midpoint forecast
  { ratio: 0.625, label: "5/8",  importance: "key" },
  { ratio: 0.75,  label: "3/4",  importance: "key" },
  { ratio: 0.875, label: "7/8",  importance: "minor" },
  { ratio: 1,     label: "1×",   importance: "critical" }, // ★ full mirror — "time squares price"
  { ratio: 1.5,   label: "1.5×", importance: "key" },
  { ratio: 2,     label: "2×",   importance: "key" },
];

/**
 * Project forward reversal dates from a Gann Box's swing extremes.
 *
 * The "leg" is the time between the swing low and swing high. Gann's
 * "time squares price" doctrine: once price has travelled the full
 * leg's worth of time forward from the most recent extreme, a major
 * reversal is more likely than not. The 1/2 forecast is the inner
 * pivot, the 1× forecast is the headline date, and 1.5×/2× extend
 * the projection if no reversal hits.
 *
 * Time uses calendar days (not trading days) so the dates line up with
 * real-world calendars. The price-history indexes are interpreted as
 * trading days back from `asOfDate`, but the forecast span is converted
 * to calendar days by multiplying by 7/5 (≈1.4) — a standard
 * trading-to-calendar approximation that accounts for weekends.
 *
 * @param {object} args
 * @param {number} args.swingHighIdx   Index of swing high in priceHistory
 * @param {number} args.swingLowIdx    Index of swing low in priceHistory
 * @param {number} args.historyLength  Length of priceHistory (e.g. 30)
 * @param {Date}   [args.asOfDate]     Reference date for the last index (default: today)
 * @returns {Array<{
 *   label: string,           // "1/2", "1×", "2×", etc.
 *   ratio: number,
 *   importance: "critical"|"key"|"minor",
 *   date: Date,
 *   isoDate: string,         // YYYY-MM-DD
 *   daysFromToday: number,
 *   tradingDaysFromAnchor: number,
 * }>}
 *   Sorted soonest → latest.
 */
export function calculateGannTimeProjections({
  swingHighIdx,
  swingLowIdx,
  historyLength,
  asOfDate,
}) {
  if (
    !Number.isFinite(swingHighIdx) ||
    !Number.isFinite(swingLowIdx) ||
    !Number.isFinite(historyLength) ||
    swingHighIdx < 0 ||
    swingLowIdx < 0 ||
    historyLength <= 0
  ) {
    return [];
  }

  const today = asOfDate ? new Date(asOfDate) : new Date();
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(today.getTime())) return [];

  // Each priceHistory index ≈ one trading day. The last index maps to the
  // reference date; earlier indexes map proportionally backward.
  const TRADING_TO_CALENDAR = 7 / 5;
  function indexToDate(idx) {
    const tradingDaysBack = historyLength - 1 - idx;
    const calendarDaysBack = Math.round(tradingDaysBack * TRADING_TO_CALENDAR);
    const d = new Date(today);
    d.setDate(d.getDate() - calendarDaysBack);
    return d;
  }

  const lowDate = indexToDate(swingLowIdx);
  const highDate = indexToDate(swingHighIdx);
  const legCalendarDays =
    Math.abs(highDate.getTime() - lowDate.getTime()) / (1000 * 60 * 60 * 24);
  if (legCalendarDays <= 0) return [];

  // Anchor forward projection on the LATER of the two extremes — that's
  // where the new "leg" of price action begins.
  const anchorDate = highDate > lowDate ? highDate : lowDate;
  const legTradingDays = Math.abs(swingHighIdx - swingLowIdx);

  return TIME_FRACTIONS.map((f) => {
    const calendarDaysForward = Math.round(f.ratio * legCalendarDays);
    const projDate = new Date(anchorDate);
    projDate.setDate(projDate.getDate() + calendarDaysForward);
    const daysFromToday = Math.round(
      (projDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      label: f.label,
      ratio: f.ratio,
      importance: f.importance,
      date: projDate,
      isoDate: projDate.toISOString().slice(0, 10),
      daysFromToday,
      tradingDaysFromAnchor: Math.round(f.ratio * legTradingDays),
    };
  });
}

/**
 * Compute all Gann Box price levels for a given swing range.
 *
 * @param {object} args
 * @param {number} args.price       Current price (used for distance %)
 * @param {number} args.swingHigh   Range top (100% line)
 * @param {number} args.swingLow    Range bottom (0% line)
 * @returns {Array<{
 *   label: string,         // "1/2", "112%", "-25%", etc.
 *   ratio: number,         // 0–1 within box, >1 above, <0 below
 *   kind: "box"|"extension",
 *   importance: "critical"|"key"|"minor"|"edge",
 *   price: number,
 *   distancePct: number,   // signed %, positive = above current
 * }>}
 *   Sorted high → low so a price ladder can render them top-down.
 */
export function calculateGannBoxLevels({ price, swingHigh, swingLow }) {
  if (
    !Number.isFinite(price) ||
    !Number.isFinite(swingHigh) ||
    !Number.isFinite(swingLow) ||
    swingHigh <= swingLow
  ) {
    return [];
  }

  const range = swingHigh - swingLow;
  const levels = [];

  const allFractions = [
    ...EXTENSIONS_ABOVE.map((f) => ({ ...f, kind: "extension" })),
    ...FRACTIONS_IN_BOX.map((f) => ({ ...f, kind: "box" })),
    ...EXTENSIONS_BELOW.map((f) => ({ ...f, kind: "extension" })),
  ];

  for (const f of allFractions) {
    const levelPrice = swingLow + f.ratio * range;
    if (levelPrice <= 0) continue;
    const distancePct = ((levelPrice - price) / price) * 100;
    levels.push({
      label: f.label,
      ratio: f.ratio,
      kind: f.kind,
      importance: f.importance,
      price: round(levelPrice),
      distancePct: round(distancePct, 2),
    });
  }

  return levels.sort((a, b) => b.price - a.price);
}

// ─────────────────────────────────────────────────────────────────────────
// Square of 9 (single-anchor spiral) — kept for positionHealth.
//   The Square of 9 anchors on ONE price (e.g. a trade's entry) and finds
//   the nearest geometric support below it without needing a paired swing
//   high/low. The Gann Box can't do that — it needs a range.
// ─────────────────────────────────────────────────────────────────────────

const SQ9_ANGLES = [
  { degrees: 90, increment: 0.5 },
  { degrees: 180, increment: 1.0 },
  { degrees: 360, increment: 2.0 },
];

/**
 * Returns symmetric Gann Square-of-9 levels around the given anchor price,
 * sorted high → low. Each level has { degrees, direction: 'up'|'down',
 * price, distancePct }.
 *
 * Kept primarily for positionHealth, which uses the closest "down" level
 * as a geometric support reference anchored on a trade's entry price.
 */
export function calculateGannLevels(price) {
  if (!Number.isFinite(price) || price <= 0) return [];

  const sqrtPrice = Math.sqrt(price);
  const levels = [];

  for (const { degrees, increment } of SQ9_ANGLES) {
    const upPrice = (sqrtPrice + increment) ** 2;
    const downPrice = (sqrtPrice - increment) ** 2;

    levels.push({
      degrees,
      direction: "up",
      price: round(upPrice),
      distancePct: round(((upPrice - price) / price) * 100, 2),
    });

    if (downPrice > 0) {
      levels.push({
        degrees,
        direction: "down",
        price: round(downPrice),
        distancePct: round(((downPrice - price) / price) * 100, 2),
      });
    }
  }

  return levels.sort((a, b) => b.price - a.price);
}

function round(n, decimals = 2) {
  const k = 10 ** decimals;
  return Math.round(n * k) / k;
}
