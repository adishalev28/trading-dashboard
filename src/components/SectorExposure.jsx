"use client";

import { PieChart, AlertTriangle } from "lucide-react";
import { fmtUsd, fmtPct } from "@/lib/formatters";

const SECTOR_COLORS = {
  "Technology":             { ring: "#3b82f6", bg: "bg-blue-500" },
  "Communication Services": { ring: "#8b5cf6", bg: "bg-violet-500" },
  "Healthcare":             { ring: "#10b981", bg: "bg-emerald-500" },
  "Financials":             { ring: "#f59e0b", bg: "bg-amber-500" },
  "Energy":                 { ring: "#ef4444", bg: "bg-red-500" },
  "Industrials":            { ring: "#6366f1", bg: "bg-indigo-500" },
  "Consumer Discretionary": { ring: "#ec4899", bg: "bg-pink-500" },
  "Consumer Staples":       { ring: "#14b8a6", bg: "bg-teal-500" },
  "Materials":              { ring: "#f97316", bg: "bg-orange-500" },
  "Utilities":              { ring: "#84cc16", bg: "bg-lime-500" },
  "Real Estate":            { ring: "#06b6d4", bg: "bg-cyan-500" },
};
const DEFAULT_COLOR = { ring: "#64748b", bg: "bg-slate-500" };
const CONCENTRATION_THRESHOLD = 30; // warn if any sector > 30%

/**
 * SVG Donut Chart — pure SVG, no library
 */
function DonutChart({ segments, size = 160 }) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 12;
  const strokeWidth = 24;

  let currentAngle = -90; // start at top

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg, i) => {
        const angle = (seg.pct / 100) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle = endAngle;

        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        const x1 = cx + radius * Math.cos(startRad);
        const y1 = cy + radius * Math.sin(startRad);
        const x2 = cx + radius * Math.cos(endRad);
        const y2 = cy + radius * Math.sin(endRad);
        const largeArc = angle > 180 ? 1 : 0;

        // For single segment (100%), draw full circle
        if (segments.length === 1) {
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
            />
          );
        }

        return (
          <path
            key={i}
            d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        );
      })}
      {/* Center text */}
      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-slate-100 text-lg font-bold">
        {segments.length}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="fill-slate-400 text-[10px]">
        sectors
      </text>
    </svg>
  );
}

export default function SectorExposure({ positions, tickers }) {
  if (!positions || positions.length === 0) return null;

  const tickerMap = {};
  for (const t of tickers || []) tickerMap[t.ticker] = t;

  // Aggregate value by sector
  const sectorValues = {};
  let totalValue = 0;

  for (const pos of positions) {
    const live = tickerMap[pos.ticker];
    const price = live?.price ?? pos.entryPrice;
    const value = price * pos.shares;
    const sector = live?.sector ?? "Unknown";
    sectorValues[sector] = (sectorValues[sector] || 0) + value;
    totalValue += value;
  }

  // Build segments sorted by value desc
  const segments = Object.entries(sectorValues)
    .map(([sector, value]) => ({
      sector,
      value,
      pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
      color: (SECTOR_COLORS[sector] || DEFAULT_COLOR).ring,
      bgClass: (SECTOR_COLORS[sector] || DEFAULT_COLOR).bg,
    }))
    .sort((a, b) => b.value - a.value);

  // Concentration warnings
  const concentrated = segments.filter(s => s.pct > CONCENTRATION_THRESHOLD);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="w-5 h-5 text-slate-300" />
        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
          Sector Exposure
        </h2>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Donut chart */}
        <div className="shrink-0">
          <DonutChart segments={segments} size={140} />
        </div>

        {/* Legend + values */}
        <div className="flex-1 w-full space-y-2">
          {segments.map((seg) => (
            <div key={seg.sector} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-sm shrink-0 ${seg.bgClass}`} />
              <span className="text-xs text-slate-300 flex-1 truncate">{seg.sector}</span>
              <span className="text-xs font-mono-nums text-slate-400">{fmtUsd(seg.value)}</span>
              <span className={`text-xs font-bold font-mono-nums min-w-[3rem] text-right ${
                seg.pct > CONCENTRATION_THRESHOLD ? "text-amber-400" : "text-slate-300"
              }`}>
                {seg.pct.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Concentration warnings */}
      {concentrated.length > 0 && (
        <div className="mt-4 p-3 bg-amber-950/30 border border-amber-800 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-300">
            <span className="font-bold">High Concentration:</span>{" "}
            {concentrated.map(s => `${s.sector} (${s.pct.toFixed(0)}%)`).join(", ")}
            {" "} exceeds {CONCENTRATION_THRESHOLD}% threshold.
            Consider diversifying to reduce sector risk.
          </div>
        </div>
      )}
    </div>
  );
}
