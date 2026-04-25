"use client";

import { useState } from "react";
import { Crosshair, Zap, AlertTriangle } from "lucide-react";
import { fmtUsd } from "@/lib/formatters";
import Explainer from "./Explainer";
import TradingViewModal from "./TradingViewModal";
import EarningsBadge from "./EarningsBadge";

function daysUntilEarnings(isoDate) {
  if (!isoDate) return null;
  const target = new Date(isoDate + "T00:00:00Z");
  if (Number.isNaN(target.getTime())) return null;
  const ms = target.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * Potential Breakouts — tickers in Stage 2, RS > 80, within 2% of Pivot
 * The "money zone" — these are the actionable buy candidates RIGHT NOW
 */
export default function PotentialBreakouts({ candidates }) {
  const [chartTicker, setChartTicker] = useState(null);

  const earningsRiskTickers = (candidates ?? []).slice(0, 3).filter((t) => {
    const d = daysUntilEarnings(t.earningsDate);
    return d != null && d >= 0 && d <= 7;
  });

  if (!candidates || candidates.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Crosshair className="w-5 h-5 text-slate-500" />
          <Explainer id="breakouts" className="text-sm font-bold text-slate-400 uppercase tracking-wide">
            Potential Breakouts
          </Explainer>
        </div>
        <div className="text-xs text-slate-500 italic">
          No tickers within 2% of their Pivot right now. Check back after data refresh.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-emerald-800 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-emerald-400" />
          <Explainer id="breakouts" className="text-sm font-bold text-emerald-400 uppercase tracking-wide">
            Potential Breakouts
          </Explainer>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
          {Math.min(candidates.length, 3)} of {candidates.length} setup{candidates.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="text-[10px] text-slate-500 mb-3">
        <Explainer id="stage2" className="text-[10px] text-slate-500">Stage 2</Explainer>
        {" + "}
        <Explainer id="rs" className="text-[10px] text-slate-500">RS &gt; 80</Explainer>
        {" + within 2% of "}
        <Explainer id="pivot" className="text-[10px] text-slate-500">Pivot Price</Explainer>
      </div>

      {/* Candidate cards */}
      <div className="space-y-2">
        {candidates.slice(0, 3).map((t) => {
          const dist = t.distToPivotPct ?? 0;
          const isImminent = dist <= 0.5;
          const isBreakout = dist <= 0;

          return (
            <button
              key={t.ticker}
              onClick={() => setChartTicker(t)}
              className={`w-full text-left flex items-center gap-4 p-3.5 rounded-lg border transition-all cursor-pointer hover:brightness-110 ${
                isBreakout
                  ? "bg-emerald-950/50 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : isImminent
                  ? "bg-emerald-950/30 border-emerald-600 animate-pulse-border"
                  : "bg-slate-900 border-slate-700 hover:border-slate-500"
              }`}
              title="Open TradingView chart"
            >
              {/* Ticker + Company */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold font-mono-nums text-lg text-slate-100">
                    {t.ticker}
                  </span>
                  <EarningsBadge earningsDate={t.earningsDate} compact />
                  {isBreakout && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white">
                      <Zap className="w-3 h-3" /> BREAKOUT
                    </span>
                  )}
                  {isImminent && !isBreakout && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700">
                      IMMINENT
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 truncate">{t.companyName}</div>
              </div>

              {/* Price → Pivot */}
              <div className="text-right shrink-0">
                <div className="text-sm font-mono-nums text-slate-200">
                  {fmtUsd(t.price)}
                </div>
                <div className="text-[10px] text-slate-500 font-mono-nums">
                  Pivot {fmtUsd(t.pivotPrice)}
                </div>
              </div>

              {/* Distance badge */}
              <Explainer id="breakoutStatus" className={`shrink-0 text-right font-mono-nums font-bold text-sm min-w-[4rem] ${
                isBreakout ? "text-emerald-400" :
                isImminent ? "text-emerald-400" :
                "text-amber-400"
              }`}>
                {isBreakout
                  ? "AT PIVOT"
                  : `${dist.toFixed(1)}%`
                }
              </Explainer>
            </button>
          );
        })}
      </div>

      {/* Earnings landmine warning */}
      {earningsRiskTickers.length > 0 && (
        <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-rose-200 leading-snug">
            <span className="font-bold text-rose-300">Earnings landmine:</span>{" "}
            {earningsRiskTickers
              .map((t) => `${t.ticker} (${daysUntilEarnings(t.earningsDate)}d)`)
              .join(", ")}{" "}
            — Minervini's rule: never enter within ~3 days of earnings. Wait
            for the report or skip these.
          </div>
        </div>
      )}

      {/* Action hint */}
      <div className="mt-3 pt-3 border-t border-slate-700 text-[10px] text-slate-500">
        <span className="text-emerald-400 font-bold">Action:</span> Cross-reference with Vol % &gt; 120% for confirmation. Place limit order at Pivot price in Meitav Trade.
      </div>

      <TradingViewModal
        ticker={chartTicker?.ticker ?? null}
        companyName={chartTicker?.companyName ?? null}
        price={chartTicker?.price ?? null}
        pivotPrice={chartTicker?.pivotPrice ?? null}
        onClose={() => setChartTicker(null)}
      />
    </div>
  );
}
