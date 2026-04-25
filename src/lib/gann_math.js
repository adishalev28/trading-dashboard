/**
 * W.D. Gann's Square of 9 — geometric support/resistance levels.
 *
 * The math: take √price, add fractional increments based on angle on the
 * spiral, then square back. Each full rotation (360°) adds 2 to √price.
 *
 *   90°  up:  (√P + 0.5)²
 *   180° up:  (√P + 1.0)²
 *   360° up:  (√P + 2.0)²
 *   (and the mirror-image down levels)
 *
 * Use as confluence with technical/fundamental signals — Gann is geometric,
 * not statistically validated. If a Stage 2 breakout pivot lines up with a
 * Gann angle, that's an extra check, not a primary signal.
 */

const ANGLES = [
  { degrees: 90, increment: 0.5 },
  { degrees: 180, increment: 1.0 },
  { degrees: 360, increment: 2.0 },
];

/**
 * Returns 6 Gann levels around the given price, sorted high → low so the
 * caller can render them as a top-down price ladder.
 *
 *   [{ degrees: 360, direction: "up", price, distancePct },
 *    { degrees: 180, direction: "up", ... },
 *    { degrees: 90,  direction: "up", ... },
 *    { degrees: 90,  direction: "down", ... },
 *    { degrees: 180, direction: "down", ... },
 *    { degrees: 360, direction: "down", ... }]
 */
export function calculateGannLevels(price) {
  if (!Number.isFinite(price) || price <= 0) return [];

  const sqrtPrice = Math.sqrt(price);
  const levels = [];

  for (const { degrees, increment } of ANGLES) {
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

  // Sort high → low
  return levels.sort((a, b) => b.price - a.price);
}

function round(n, decimals = 2) {
  const k = 10 ** decimals;
  return Math.round(n * k) / k;
}
