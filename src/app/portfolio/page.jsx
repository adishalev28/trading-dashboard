"use client";

import PageShell from "@/components/PageShell";
import PortfolioTable from "@/components/PortfolioTable";
import usePortfolio from "@/hooks/usePortfolio";
import mockData from "@/lib/mockData.json";
import { fmtUsd } from "@/lib/formatters";
import { Trash2 } from "lucide-react";

export default function PortfolioPage() {
  const { positions, loaded, removePosition, clearAll } = usePortfolio();
  const { tickers } = mockData;

  if (!loaded) {
    return (
      <PageShell title="Portfolio" subtitle="Loading...">
        <div className="text-slate-500 text-center py-20">Loading positions...</div>
      </PageShell>
    );
  }

  // Build ticker map for summary
  const tickerMap = {};
  for (const t of tickers) tickerMap[t.ticker] = t;

  // Summary stats
  let totalValue = 0;
  let totalPnl = 0;
  let dangerCount = 0;

  for (const pos of positions) {
    const live = tickerMap[pos.ticker];
    const current = live?.price ?? pos.entryPrice;
    totalValue += current * pos.shares;
    totalPnl += (current - pos.entryPrice) * pos.shares;
    // Check for danger signals
    if (live && (live.rsScore < 70 || current < (live.sma20 ?? pos.stopLoss))) {
      dangerCount++;
    }
  }

  return (
    <PageShell
      title="Portfolio"
      subtitle={positions.length > 0
        ? `${positions.length} active position${positions.length !== 1 ? "s" : ""} - ${fmtUsd(totalValue)}`
        : "No active positions"
      }
      actions={
        positions.length > 0 && (
          <button
            onClick={() => { if (window.confirm("Clear all positions?")) clearAll(); }}
            className="text-xs text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear All
          </button>
        )
      }
    >
      {/* Summary cards */}
      {positions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Total Value</div>
            <div className="text-xl font-bold font-mono-nums text-slate-100 mt-1">
              {fmtUsd(totalValue)}
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Total P&L</div>
            <div className={`text-xl font-bold font-mono-nums mt-1 ${
              totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              {totalPnl >= 0 ? "+" : ""}{fmtUsd(totalPnl)}
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Sell Signals</div>
            <div className={`text-xl font-bold font-mono-nums mt-1 ${
              dangerCount > 0 ? "text-rose-400" : "text-emerald-400"
            }`}>
              {dangerCount > 0 ? `${dangerCount} WARNING` : "ALL CLEAR"}
            </div>
          </div>
        </div>
      )}

      {/* Positions table */}
      <PortfolioTable
        positions={positions}
        tickers={tickers}
        onRemove={removePosition}
      />

      {/* Instructions */}
      <div className="mt-6 p-4 bg-slate-800/50 border border-slate-800 rounded-xl">
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-2 font-semibold">
          How to use
        </div>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>1. Go to <strong>Risk Calc</strong> and calculate your trade</li>
          <li>2. Enter the <strong>ticker symbol</strong> and click <strong>Save to Portfolio</strong></li>
          <li>3. Monitor your positions here with live P&L and sell signals</li>
          <li>4. <strong>Trail Stop</strong> = SMA 20 (updates daily with data refresh)</li>
          <li>5. <span className="text-rose-400 font-bold">Red badges</span> = consider selling (RS &lt; 70 or left Stage 2)</li>
        </ul>
      </div>
    </PageShell>
  );
}
