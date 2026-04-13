"use client";

import { BarChart3, Target, TrendingUp, TrendingDown, Award, AlertTriangle } from "lucide-react";

/**
 * Trade Statistics Dashboard — Win Rate, Avg R, Expectancy
 * The "report card" for your trading strategy
 *
 * Formulas:
 * - R-Multiple per trade: (current - entry) / (entry - stop)
 * - Win Rate: % of trades with R > 0
 * - Avg Win R: average R of winning trades
 * - Avg Loss R: average R of losing trades (should be close to -1R)
 * - Expectancy: (winRate × avgWinR) + ((1-winRate) × avgLossR)
 *   → positive = profitable system, negative = losing system
 * - Profit Factor: sum(wins) / abs(sum(losses))
 */
export default function TradeStats({ positions, tickers }) {
  if (!positions || positions.length === 0) return null;

  const tickerMap = {};
  for (const t of tickers || []) tickerMap[t.ticker] = t;

  // Calculate R-multiple for each position
  const trades = positions.map(pos => {
    const live = tickerMap[pos.ticker];
    const currentPrice = live?.price ?? pos.entryPrice;
    const riskPerShare = pos.entryPrice - pos.stopLoss;
    const profitPerShare = currentPrice - pos.entryPrice;
    const rMultiple = riskPerShare > 0 ? profitPerShare / riskPerShare : 0;
    const pnl = profitPerShare * pos.shares;
    const isWin = rMultiple > 0;
    const isStopHit = currentPrice <= pos.stopLoss;

    return { ...pos, currentPrice, rMultiple, pnl, isWin, isStopHit, riskPerShare };
  });

  const totalTrades = trades.length;
  const winners = trades.filter(t => t.isWin);
  const losers = trades.filter(t => !t.isWin);
  const stopHits = trades.filter(t => t.isStopHit);
  const targetHits = trades.filter(t => t.rMultiple >= 3);

  // Core metrics
  const winRate = totalTrades > 0 ? (winners.length / totalTrades) * 100 : 0;
  const avgWinR = winners.length > 0
    ? winners.reduce((s, t) => s + t.rMultiple, 0) / winners.length
    : 0;
  const avgLossR = losers.length > 0
    ? losers.reduce((s, t) => s + t.rMultiple, 0) / losers.length
    : 0;

  // Expectancy = (Win% × AvgWin) + (Loss% × AvgLoss)
  const expectancy = totalTrades > 0
    ? (winRate / 100) * avgWinR + ((100 - winRate) / 100) * avgLossR
    : 0;

  // Profit Factor = gross profit / gross loss
  const grossProfit = winners.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losers.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Average R across all trades
  const avgR = totalTrades > 0
    ? trades.reduce((s, t) => s + t.rMultiple, 0) / totalTrades
    : 0;

  // Best and worst trade
  const bestTrade = trades.reduce((best, t) => t.rMultiple > best.rMultiple ? t : best, trades[0]);
  const worstTrade = trades.reduce((worst, t) => t.rMultiple < worst.rMultiple ? t : worst, trades[0]);

  // System verdict
  const verdict = expectancy > 0.5
    ? { label: "Strong System", color: "text-emerald-400", bg: "bg-emerald-950/50 border-emerald-800" }
    : expectancy > 0
    ? { label: "Positive Edge", color: "text-emerald-400", bg: "bg-emerald-950/30 border-emerald-900" }
    : expectancy > -0.3
    ? { label: "Breakeven", color: "text-amber-400", bg: "bg-amber-950/30 border-amber-900" }
    : { label: "Losing System", color: "text-rose-400", bg: "bg-rose-950/30 border-rose-900" };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-slate-300" />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
            Strategy Statistics
          </h2>
        </div>
        <div className={`text-xs font-bold px-3 py-1 rounded-full border ${verdict.bg} ${verdict.color}`}>
          {verdict.label}
        </div>
      </div>

      {/* Main metrics — 2x3 grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {/* Win Rate */}
        <div className="bg-slate-900 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <Target className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">Win Rate</span>
          </div>
          <div className={`text-2xl font-bold font-mono-nums ${winRate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
            {winRate.toFixed(0)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {winners.length}W / {losers.length}L of {totalTrades}
          </div>
        </div>

        {/* Average R */}
        <div className="bg-slate-900 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">Avg R</span>
          </div>
          <div className={`text-2xl font-bold font-mono-nums ${avgR >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {avgR >= 0 ? "+" : ""}{avgR.toFixed(2)}R
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Per trade (all)
          </div>
        </div>

        {/* Expectancy */}
        <div className="bg-slate-900 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <Award className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">Expectancy</span>
          </div>
          <div className={`text-2xl font-bold font-mono-nums ${expectancy >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {expectancy >= 0 ? "+" : ""}{expectancy.toFixed(2)}R
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Expected R per trade
          </div>
        </div>

        {/* Avg Win R */}
        <div className="bg-slate-900 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">Avg Win</span>
          </div>
          <div className="text-lg font-bold font-mono-nums text-emerald-400">
            +{avgWinR.toFixed(2)}R
          </div>
        </div>

        {/* Avg Loss R */}
        <div className="bg-slate-900 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingDown className="w-3 h-3 text-rose-600" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">Avg Loss</span>
          </div>
          <div className="text-lg font-bold font-mono-nums text-rose-400">
            {avgLossR.toFixed(2)}R
          </div>
        </div>

        {/* Profit Factor */}
        <div className="bg-slate-900 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <BarChart3 className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">Profit Factor</span>
          </div>
          <div className={`text-lg font-bold font-mono-nums ${profitFactor >= 1 ? "text-emerald-400" : "text-rose-400"}`}>
            {profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Highlights bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        {targetHits.length > 0 && (
          <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
            🏆 {targetHits.length} hit 3R+ target
          </span>
        )}
        {stopHits.length > 0 && (
          <span className="text-[10px] font-bold px-2 py-1 rounded bg-rose-950 text-rose-400 border border-rose-800">
            🛑 {stopHits.length} stopped out
          </span>
        )}
        {bestTrade && (
          <span className="text-[10px] px-2 py-1 rounded bg-slate-900 text-slate-300 border border-slate-700">
            Best: {bestTrade.ticker} +{bestTrade.rMultiple.toFixed(1)}R
          </span>
        )}
        {worstTrade && worstTrade.rMultiple < 0 && (
          <span className="text-[10px] px-2 py-1 rounded bg-slate-900 text-slate-300 border border-slate-700">
            Worst: {worstTrade.ticker} {worstTrade.rMultiple.toFixed(1)}R
          </span>
        )}
      </div>

      {/* Explainer */}
      <div className="pt-3 border-t border-slate-700 text-[10px] text-slate-500 space-y-0.5">
        <div><strong className="text-slate-400">Expectancy</strong> = (Win% x AvgWinR) + (Loss% x AvgLossR). Positive = profitable system.</div>
        <div><strong className="text-slate-400">Profit Factor</strong> = gross profits / gross losses. Above 1.5 = strong edge.</div>
        <div><strong className="text-slate-400">R-Multiple</strong> = reward / risk. 3R = you made 3x what you risked.</div>
      </div>
    </div>
  );
}
