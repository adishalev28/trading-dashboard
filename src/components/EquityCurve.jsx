"use client";

import { TrendingUp } from "lucide-react";
import { fmtUsd } from "@/lib/formatters";

/**
 * Equity Curve — "The Wealth Line"
 * Reconstructs portfolio value over the last 30 days using priceHistory30d
 *
 * For each of the 30 days:
 *   portfolio_value = sum( position.shares × ticker.priceHistory30d[day_index] )
 *   only includes positions whose entryDate <= that day
 */
export default function EquityCurve({ positions, tickers }) {
  if (!positions || positions.length === 0) return null;

  // Build ticker lookup with price history
  const tickerMap = {};
  for (const t of tickers || []) {
    if (t.priceHistory30d && t.priceHistory30d.length > 0) {
      tickerMap[t.ticker] = t;
    }
  }

  // Generate 30 dates (today back to 30 days ago)
  const today = new Date();
  const dates = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  // Calculate portfolio value for each day
  const curveData = dates.map((dateStr, dayIdx) => {
    let totalValue = 0;
    let hasAnyPosition = false;

    for (const pos of positions) {
      const live = tickerMap[pos.ticker];
      if (!live || !live.priceHistory30d) continue;

      // Only count if position existed on this day
      if (pos.entryDate && pos.entryDate > dateStr) continue;

      hasAnyPosition = true;

      // Map dayIdx (0-29) to priceHistory index
      const histLen = live.priceHistory30d.length;
      const histIdx = Math.round((dayIdx / 29) * (histLen - 1));
      const price = live.priceHistory30d[Math.min(histIdx, histLen - 1)];

      totalValue += pos.shares * price;
    }

    return { date: dateStr, value: hasAnyPosition ? totalValue : null };
  });

  // Filter out days with no positions
  const validData = curveData.filter(d => d.value !== null);
  if (validData.length < 2) return null;

  const values = validData.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const startVal = values[0];
  const endVal = values[values.length - 1];
  const pnl = endVal - startVal;
  const pnlPct = startVal > 0 ? (pnl / startVal) * 100 : 0;
  const trending = endVal >= startVal;

  // SVG dimensions
  const W = 600;
  const H = 160;
  const PAD_TOP = 10;
  const PAD_BOT = 25;
  const PAD_LEFT = 0;
  const PAD_RIGHT = 0;
  const chartH = H - PAD_TOP - PAD_BOT;
  const chartW = W - PAD_LEFT - PAD_RIGHT;

  // Map values to SVG coordinates
  const points = validData.map((d, i) => {
    const x = PAD_LEFT + (i / (validData.length - 1)) * chartW;
    const y = PAD_TOP + chartH - ((d.value - min) / range) * chartH;
    return { x, y, date: d.date, value: d.value };
  });

  const polylinePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const fillPoints = `${PAD_LEFT},${H - PAD_BOT} ${polylinePoints} ${PAD_LEFT + chartW},${H - PAD_BOT}`;
  const lineColor = trending ? "#10b981" : "#f43f5e";

  // X-axis labels (first, middle, last date)
  const fmtDate = (d) => {
    const parts = d.split("-");
    return `${parts[2]}/${parts[1]}`;
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-slate-300" />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
            Equity Curve
          </h2>
        </div>
        <div className={`flex items-baseline gap-2 ${trending ? "text-emerald-400" : "text-rose-400"}`}>
          <span className="text-lg font-bold font-mono-nums">
            {trending ? "+" : ""}{fmtUsd(pnl)}
          </span>
          <span className="text-xs font-mono-nums">
            ({trending ? "+" : ""}{pnlPct.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Y-axis labels + Chart */}
      <div className="flex gap-2">
        {/* Y labels */}
        <div className="flex flex-col justify-between text-[9px] text-slate-500 font-mono-nums py-[10px] shrink-0 w-14 text-right">
          <span>{fmtUsd(max)}</span>
          <span>{fmtUsd((max + min) / 2)}</span>
          <span>{fmtUsd(min)}</span>
        </div>

        {/* SVG Chart */}
        <div className="flex-1">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            preserveAspectRatio="none"
            style={{ height: `${H}px`, maxHeight: "160px" }}
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const y = PAD_TOP + chartH * (1 - pct);
              return (
                <line
                  key={pct}
                  x1={PAD_LEFT}
                  y1={y}
                  x2={PAD_LEFT + chartW}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="0.5"
                  strokeDasharray="4,4"
                />
              );
            })}

            {/* Gradient fill */}
            <defs>
              <linearGradient id="equity-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
              </linearGradient>
            </defs>

            <polygon points={fillPoints} fill="url(#equity-grad)" />

            {/* Line */}
            <polyline
              points={polylinePoints}
              fill="none"
              stroke={lineColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Start dot */}
            <circle cx={points[0].x} cy={points[0].y} r="3" fill={lineColor} />

            {/* End dot */}
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="4"
              fill={lineColor}
              stroke="#0f172a"
              strokeWidth="2"
            />
          </svg>

          {/* X-axis labels */}
          <div className="flex justify-between text-[9px] text-slate-500 font-mono-nums mt-1 px-1">
            <span>{fmtDate(validData[0].date)}</span>
            <span>{fmtDate(validData[Math.floor(validData.length / 2)].date)}</span>
            <span>{fmtDate(validData[validData.length - 1].date)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-slate-700 flex justify-between text-[10px] text-slate-500">
        <span>Start: {fmtUsd(startVal)}</span>
        <span>Current: {fmtUsd(endVal)}</span>
        <span>30-day period</span>
      </div>
    </div>
  );
}
