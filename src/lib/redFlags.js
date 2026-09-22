import data from "./negativeScreen.json";

/**
 * Negative screen (red flags). A veto, not a buy signal - see scripts/negative_screen.py
 * and research/negative_screen_2026_09 for the test behind the 3-flag threshold.
 */

export const FLAG_ORDER = ["DILUTION", "LOSS", "ASSET_BLOAT", "LOTTO", "SHORT"];

export const FLAG_LABELS = {
  DILUTION: { en: "Dilution", he: "דילול - מספר המניות גדל ביותר מ-10% בשנה" },
  LOSS: { en: "Loss", he: "הפסד תפעולי או תזרים מזומנים שלילי" },
  ASSET_BLOAT: { en: "Asset bloat", he: "ניפוח נכסים - הנכסים גדלו ביותר מ-50% בשנה" },
  LOTTO: { en: "Lotto", he: "כרטיס לוטו - תנודתיות פי 2 מהשוק, או זינוק של 15% ביום בחודש האחרון" },
  SHORT: { en: "Short", he: "שורט מעל 15% מהמניות הצפות - מידע בלבד, לא נספר" },
};

export const LEVELS = {
  veto: { label: "ODDS AGAINST", cls: "bg-red-600 text-white border-red-500" },
  caution: { label: "CAUTION", cls: "bg-amber-950 text-amber-300 border-amber-700" },
  clean: { label: "CLEAN", cls: "bg-slate-800 text-slate-400 border-slate-700" },
  unknown: { label: "NO DATA", cls: "bg-slate-900 text-slate-500 border-slate-800" },
};

export const screenMeta = data.meta;
export const screenGroups = data.groups;
export const screenTracked = data.tracked;
export const screenTickers = data.tickers;

export function getRedFlags(ticker) {
  return data.tickers?.[ticker] ?? null;
}

export function fmtFlagValue(key, value) {
  if (value == null) return "—";
  const pct = (v) => (v == null ? "—" : `${v > 0 ? "+" : ""}${(v * 100).toFixed(0)}%`);
  const money = (v) => {
    if (v == null) return "—";
    const a = Math.abs(v);
    const s = a >= 1e9 ? `${(a / 1e9).toFixed(1)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(0)}M` : `${a.toFixed(0)}`;
    return `${v < 0 ? "-" : ""}$${s}`;
  };
  switch (key) {
    case "DILUTION":
    case "ASSET_BLOAT":
      return pct(value);
    case "SHORT":
      return `${(value * 100).toFixed(0)}%`;
    case "LOSS":
      return `op ${money(value.operatingIncome)} · FCF ${money(value.freeCashFlow)}`;
    case "LOTTO":
      return `beta ${value.beta == null ? "—" : value.beta.toFixed(1)} · max day ${pct(value.maxDay21)}`;
    default:
      return String(value);
  }
}

/** one-line text for a native tooltip */
export function flagsTooltip(rf) {
  if (!rf) return "";
  const on = FLAG_ORDER.filter((k) => rf.flags?.[k]?.on).map((k) => FLAG_LABELS[k].he);
  return `${rf.count}/4 דגלים${on.length ? ": " + on.join(" · ") : ""}`;
}
