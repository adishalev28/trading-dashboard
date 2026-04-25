"use client";

/**
 * Fundamentals cell — quarterly EPS + Sales growth, year-over-year.
 *
 * The "C" in CANSLIM. Minervini wants ideally 25%+ YoY EPS growth,
 * and Sales growth should support the EPS (i.e. growth is real, not from
 * one-time gains or buybacks).
 *
 *   25%+  emerald  — Minervini-grade
 *   10-25 amber    — decent, watch
 *   0-10  slate    — weak, skip
 *   <0    rose     — red flag, avoid new entry
 */

function tone(v) {
  if (v == null || !Number.isFinite(v)) return "text-slate-600";
  if (v >= 25) return "text-emerald-400";
  if (v >= 10) return "text-amber-400";
  if (v >= 0) return "text-slate-400";
  return "text-rose-400";
}

function fmt(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  // Compact >= 1000% as "1.0kx"
  if (Math.abs(v) >= 1000) return `${sign}${(v / 100).toFixed(1)}kx`;
  return `${sign}${Math.round(v)}%`;
}

export default function FundamentalsCell({
  epsGrowth,
  salesGrowth,
  lastReportDate,
}) {
  const both = epsGrowth == null && salesGrowth == null;
  if (both) {
    return <span className="text-[10px] text-slate-600">—</span>;
  }
  return (
    <div
      className="font-mono-nums text-right leading-tight"
      title={lastReportDate ? `Last report: ${lastReportDate}` : undefined}
    >
      <div className={`text-xs font-bold ${tone(epsGrowth)}`}>
        EPS {fmt(epsGrowth)}
      </div>
      <div className={`text-[10px] ${tone(salesGrowth)}`}>
        Rev {fmt(salesGrowth)}
      </div>
    </div>
  );
}
