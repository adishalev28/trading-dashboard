"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, TrendingDown, ShieldCheck } from "lucide-react";
import { fmtUsd, fmtPct } from "@/lib/formatters";
import { isStage2 } from "@/lib/screener";
import Sparkline from "./Sparkline";

/**
 * Active Positions Table — shows open trades with live P&L
 *
 * For each position, cross-references with live mockData tickers to show:
 * - Current price + P&L ($ and %)
 * - Trailing Stop (SMA 20)
 * - Sell Signals: drops out of Stage 2 or RS < 70
 */
export default function PortfolioTable({ positions, tickers, onRemove }) {
  const [confirmDelete, setConfirmDelete] = useState(null);

  if (!positions || positions.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
        <div className="text-slate-500 text-sm mb-2">No active positions</div>
        <div className="text-slate-600 text-xs">
          Use the Risk Calculator to size a trade, then click "Save to Portfolio"
        </div>
      </div>
    );
  }

  // Build ticker lookup
  const tickerMap = {};
  for (const t of tickers || []) {
    tickerMap[t.ticker] = t;
  }

  return (
    <div className="overflow-x-auto scrollbar-thin rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-950">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Position</th>
            <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">30D</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Entry</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Current</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">P&L</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Trail Stop</th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Signals</th>
            <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400"></th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos, i) => {
            const live = tickerMap[pos.ticker];
            const currentPrice = live?.price ?? pos.entryPrice;
            const pnlPerShare = currentPrice - pos.entryPrice;
            const pnlTotal = pnlPerShare * pos.shares;
            const pnlPct = pos.entryPrice > 0 ? (pnlPerShare / pos.entryPrice) * 100 : 0;
            const isProfit = pnlTotal >= 0;

            // Trailing stop = SMA 20 (if available)
            const trailingStop = live?.sma20 ?? pos.stopLoss;
            const stopDistPct = currentPrice > 0 ? ((currentPrice - trailingStop) / currentPrice) * 100 : 0;

            // Sell signals
            const signals = [];
            if (live) {
              if (!isStage2(live)) {
                signals.push({ label: "Left Stage 2", severity: "danger" });
              }
              if (live.rsScore < 70) {
                signals.push({ label: `RS ${live.rsScore}`, severity: "danger" });
              }
              if (currentPrice < trailingStop) {
                signals.push({ label: "Below Stop", severity: "danger" });
              }
              if (live.rsScore >= 70 && live.rsScore < 80) {
                signals.push({ label: `RS ${live.rsScore}`, severity: "warn" });
              }
            }
            const hasDanger = signals.some((s) => s.severity === "danger");

            return (
              <tr
                key={pos.id}
                className={`${i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/60"} ${
                  hasDanger ? "border-l-2 border-rose-500" : ""
                } hover:bg-slate-800/60 transition-colors`}
              >
                {/* Position info */}
                <td className="px-4 py-3">
                  <div className="font-bold font-mono-nums text-slate-100">{pos.ticker}</div>
                  <div className="text-[10px] text-slate-500">
                    {pos.shares} shares - {pos.entryDate}
                  </div>
                </td>

                {/* Sparkline */}
                <td className="px-2 py-3">
                  <Sparkline data={live?.priceHistory30d} width={70} height={24} />
                </td>

                {/* Entry price */}
                <td className="px-4 py-3 text-right font-mono-nums text-slate-400">
                  {fmtUsd(pos.entryPrice)}
                </td>

                {/* Current price */}
                <td className="px-4 py-3 text-right font-mono-nums text-slate-200">
                  {fmtUsd(currentPrice)}
                </td>

                {/* P&L */}
                <td className={`px-4 py-3 text-right font-mono-nums font-bold ${
                  isProfit ? "text-emerald-400" : "text-rose-400"
                }`}>
                  <div>{isProfit ? "+" : ""}{fmtUsd(pnlTotal)}</div>
                  <div className="text-[10px]">{isProfit ? "+" : ""}{pnlPct.toFixed(1)}%</div>
                </td>

                {/* Trailing Stop (SMA 20) */}
                <td className="px-4 py-3 text-right">
                  <div className="font-mono-nums text-slate-300 text-xs">{fmtUsd(trailingStop)}</div>
                  <div className={`text-[10px] font-mono-nums ${
                    stopDistPct > 5 ? "text-emerald-400" :
                    stopDistPct > 0 ? "text-amber-400" : "text-rose-400"
                  }`}>
                    {stopDistPct > 0 ? `${stopDistPct.toFixed(1)}% above` : "HIT"}
                  </div>
                </td>

                {/* Sell Signals */}
                <td className="px-4 py-3 text-center">
                  {signals.length === 0 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                      <ShieldCheck className="w-3 h-3" /> HOLD
                    </span>
                  ) : (
                    <div className="flex flex-col gap-1 items-center">
                      {signals.map((s, si) => (
                        <span
                          key={si}
                          className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-bold ${
                            s.severity === "danger"
                              ? "bg-rose-950 text-rose-400 border-rose-800"
                              : "bg-amber-950 text-amber-400 border-amber-800"
                          }`}
                        >
                          {s.severity === "danger" ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {s.label}
                        </span>
                      ))}
                    </div>
                  )}
                </td>

                {/* Delete */}
                <td className="px-3 py-3 text-center">
                  {confirmDelete === pos.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => { onRemove(pos.id); setConfirmDelete(null); }}
                        className="text-[10px] px-2 py-1 bg-rose-900 text-rose-300 rounded border border-rose-700"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-[10px] px-2 py-1 bg-slate-800 text-slate-400 rounded border border-slate-700"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(pos.id)}
                      className="text-slate-600 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Portfolio summary */}
      {positions.length > 0 && (() => {
        let totalPnl = 0;
        let totalValue = 0;
        for (const pos of positions) {
          const live = tickerMap[pos.ticker];
          const current = live?.price ?? pos.entryPrice;
          totalPnl += (current - pos.entryPrice) * pos.shares;
          totalValue += current * pos.shares;
        }
        const isProfit = totalPnl >= 0;
        return (
          <div className="bg-slate-950 px-4 py-3 flex items-center justify-between border-t border-slate-800">
            <span className="text-xs text-slate-500 uppercase tracking-wide">
              {positions.length} position{positions.length !== 1 ? "s" : ""} - Total Value: {fmtUsd(totalValue)}
            </span>
            <span className={`font-bold font-mono-nums ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
              Total P&L: {isProfit ? "+" : ""}{fmtUsd(totalPnl)}
            </span>
          </div>
        );
      })()}
    </div>
  );
}
