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
 * Find swing high and low from a price history array. We use the simple
 * max/min of the window — for a 30-day series of daily closes this is the
 * 30-day high and 30-day low, which is what most traders mean by
 * "recent swing range" on a daily Gann Box.
 *
 * @param {number[]} priceHistory
 * @returns {{ high: number, low: number } | null}
 */
export function findSwingPoints(priceHistory) {
  if (!Array.isArray(priceHistory) || priceHistory.length === 0) return null;
  const valid = priceHistory.filter((p) => Number.isFinite(p) && p > 0);
  if (valid.length === 0) return null;
  const high = Math.max(...valid);
  const low = Math.min(...valid);
  if (high <= low) return null;
  return { high, low };
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
