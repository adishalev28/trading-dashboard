/**
 * Number/currency/percent formatters
 * All Intl-based for locale-aware formatting
 */

export const fmtUsd = (value) => {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
};

export const fmtIls = (value) => {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
};

export const fmtPct = (value, decimals = 2) => {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
};

export const fmtNum = (value, decimals = 0) => {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: decimals,
  }).format(value);
};

// Market cap: 18400 (billions) → "$18.4T", 840 → "$840B", 45 → "$45B"
export const fmtMarketCap = (valueBillions) => {
  if (valueBillions == null || !Number.isFinite(valueBillions)) return "—";
  if (valueBillions >= 1000) {
    return `$${(valueBillions / 1000).toFixed(1)}T`;
  }
  return `$${valueBillions.toFixed(0)}B`;
};
