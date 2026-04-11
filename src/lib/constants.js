// Design tokens — Bloomberg-inspired dark theme
// Used for programmatic inline styles (gradient bars, framer-motion variants)
// Tailwind classes use standard slate/emerald/rose/amber directly.
export const C = {
  bg:        "#0f172a",   // slate-900 — main background
  bgElev:    "#1e293b",   // slate-800 — cards
  bgDeep:    "#020617",   // slate-950 — sidebar
  border:    "#334155",   // slate-700
  text:      "#f1f5f9",   // slate-100
  textDim:   "#94a3b8",   // slate-400
  gain:      "#10b981",   // emerald-500
  gainSoft:  "#064e3b",   // emerald-900 (bg for gain pills)
  loss:      "#f43f5e",   // rose-500
  lossSoft:  "#4c0519",   // rose-950
  warn:      "#fbbf24",   // amber-400
  warnSoft:  "#451a03",   // amber-950
};

export const DEFAULT_FX_RATE = 3.7;            // USD → ILS
export const DEFAULT_COMMISSION_RT_USD = 14;   // Meitav Trade $7 × 2 (buy + sell)
export const DEFAULT_RISK_PCT = 1;             // Minervini's conservative 1% risk

// Commission warning thresholds (round-trip % of position value)
export const COMMISSION_THRESHOLDS = {
  SAFE:    0.5,   // < 0.5% = SAFE (green)
  CAUTION: 1.0,   // 0.5–1% = CAUTION (amber), > 1% = DANGER (red)
};

// Stage 2 criteria (Weinstein + Minervini hybrid)
export const STAGE2_CRITERIA = {
  MIN_RS_SCORE: 70,             // IBD-style RS rank ≥ 70
  MAX_52W_HIGH_DISTANCE: 25,    // within 25% of 52-week high
  // Trend: price > sma150 > sma200 AND both rising
};
