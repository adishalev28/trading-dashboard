"use client";

import { useState } from "react";
import PageShell from "@/components/PageShell";
import PortfolioTable from "@/components/PortfolioTable";
import TradeStats from "@/components/TradeStats";
import EquityCurve from "@/components/EquityCurve";
import SectorExposure from "@/components/SectorExposure";
import ExportCSV from "@/components/ExportCSV";
import usePortfolio from "@/hooks/usePortfolio";
import mockData from "@/lib/mockData.json";
import { fmtUsd } from "@/lib/formatters";
import { Trash2, Briefcase, FlaskConical, LogIn, Cloud } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

function SummaryCards({ positions, tickers }) {
  const tickerMap = {};
  for (const t of tickers) tickerMap[t.ticker] = t;

  let totalValue = 0;
  let totalPnl = 0;
  let dangerCount = 0;

  for (const pos of positions) {
    const live = tickerMap[pos.ticker];
    const current = live?.price ?? pos.entryPrice;
    totalValue += current * pos.shares;
    totalPnl += (current - pos.entryPrice) * pos.shares;
    if (live && (live.rsScore < 70 || current <= pos.stopLoss)) {
      dangerCount++;
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="text-[10px] text-slate-500 uppercase tracking-wide">Total Value</div>
        <div className="text-xl font-bold font-mono-nums text-slate-100 mt-1">{fmtUsd(totalValue)}</div>
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="text-[10px] text-slate-500 uppercase tracking-wide">Total P&L</div>
        <div className={`text-xl font-bold font-mono-nums mt-1 ${totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {totalPnl >= 0 ? "+" : ""}{fmtUsd(totalPnl)}
        </div>
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="text-[10px] text-slate-500 uppercase tracking-wide">Alerts</div>
        <div className={`text-xl font-bold font-mono-nums mt-1 ${dangerCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
          {dangerCount > 0 ? `${dangerCount} WARNING` : "ALL CLEAR"}
        </div>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const {
    positions, loaded, removePosition, clearAll,
    simPositions, removeSimulation, clearSimulations,
    isCloud,
  } = usePortfolio();
  const { user, loading: authLoading, signIn } = useAuth();
  const { tickers } = mockData;
  const [tab, setTab] = useState("real"); // "real" | "sim"

  if (!loaded) {
    return (
      <PageShell title="Portfolio" subtitle="Loading...">
        <div className="text-slate-500 text-center py-20">Loading positions...</div>
      </PageShell>
    );
  }

  const activePositions = tab === "real" ? positions : simPositions;
  const activeRemove    = tab === "real" ? removePosition : removeSimulation;
  const activeClear     = tab === "real" ? clearAll : clearSimulations;

  return (
    <PageShell
      title="Portfolio"
      subtitle={`${activePositions.length} ${tab === "sim" ? "simulated" : "active"} position${activePositions.length !== 1 ? "s" : ""}`}
      actions={
        activePositions.length > 0 && (
          <div className="flex items-center gap-2">
            <ExportCSV
              positions={activePositions}
              tickers={tickers}
              label={tab === "sim" ? "Export Sims" : "Export CSV"}
            />
            <button
              onClick={() => {
                const msg = tab === "sim" ? "Reset all simulations?" : "Clear all positions?";
                if (window.confirm(msg)) activeClear();
              }}
              className="text-xs text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              {tab === "sim" ? "Reset" : "Clear"}
            </button>
          </div>
        )
      }
    >
      {/* Cloud sync banner */}
      {!authLoading && !user && (
        <button
          onClick={signIn}
          className="w-full mb-4 p-3 bg-slate-800 border border-slate-700 rounded-lg flex items-center gap-3 hover:border-emerald-600 transition-colors group"
        >
          <LogIn className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 shrink-0" />
          <div className="text-left">
            <div className="text-sm font-semibold text-slate-200">Sign in for cloud sync</div>
            <div className="text-xs text-slate-500">Sync trades across devices with Google account</div>
          </div>
        </button>
      )}
      {isCloud && (
        <div className="mb-4 flex items-center gap-2 text-xs text-emerald-400">
          <Cloud className="w-3 h-3" />
          <span>Cloud sync active — trades saved to Supabase</span>
        </div>
      )}

      {/* Tabs: Real / Simulations */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("real")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            tab === "real"
              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-700"
              : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Real Trades
          {positions.length > 0 && (
            <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded-full">{positions.length}</span>
          )}
        </button>

        <button
          onClick={() => setTab("sim")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            tab === "sim"
              ? "bg-amber-950/60 text-amber-400 border border-amber-700"
              : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200"
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          Simulations
          {simPositions.length > 0 && (
            <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded-full">{simPositions.length}</span>
          )}
        </button>
      </div>

      {/* Simulation banner */}
      {tab === "sim" && (
        <div className="mb-4 p-3 bg-amber-950/30 border border-amber-800 rounded-lg flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="text-xs text-amber-300">
            <span className="font-bold">Paper Trading Mode</span> — these trades use simulated money. Test your strategy before risking real capital.
          </div>
        </div>
      )}

      {/* Summary cards */}
      {activePositions.length > 0 && (
        <SummaryCards positions={activePositions} tickers={tickers} />
      )}

      {/* Equity Curve + Strategy Statistics */}
      {activePositions.length >= 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <EquityCurve positions={activePositions} tickers={tickers} />
          <TradeStats positions={activePositions} tickers={tickers} />
        </div>
      )}

      {/* Sector Exposure */}
      {activePositions.length >= 1 && (
        <div className="mb-6">
          <SectorExposure positions={activePositions} tickers={tickers} />
        </div>
      )}

      {/* Positions table */}
      <PortfolioTable
        positions={activePositions}
        tickers={tickers}
        onRemove={activeRemove}
        isSimulation={tab === "sim"}
      />

      {/* Instructions */}
      <div className="mt-6 p-4 bg-slate-800/50 border border-slate-800 rounded-xl">
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-2 font-semibold">
          {tab === "sim" ? "Simulation Mode" : "How to use"}
        </div>
        <ul className="text-xs text-slate-400 space-y-1">
          {tab === "sim" ? (
            <>
              <li>1. Go to <strong>Risk Calc</strong> and click <strong>"Simulate Trade"</strong> (amber button)</li>
              <li>2. Track your paper trades here with live P&L</li>
              <li>3. <span className="text-rose-400 font-bold">STOP HIT</span> = price hit your stop loss (trade failed)</li>
              <li>4. <span className="text-emerald-400 font-bold">3R+ TARGET</span> = profit reached 3x your risk (winner!)</li>
              <li>5. Click <strong>Reset Simulations</strong> to start a new testing season</li>
            </>
          ) : (
            <>
              <li>1. Go to <strong>Risk Calc</strong> and click <strong>"Save to Portfolio"</strong></li>
              <li>2. Monitor your positions here with live P&L and sell signals</li>
              <li>3. <strong>Trail Stop</strong> = SMA 20 (updates daily)</li>
              <li>4. <span className="text-rose-400 font-bold">Red badges</span> = consider selling</li>
            </>
          )}
        </ul>
      </div>
    </PageShell>
  );
}
