"use client";

import { ShieldCheck, AlertTriangle, TrendingUp, Activity, Target, Zap } from "lucide-react";
import { isStage2 } from "@/lib/screener";
import Explainer from "./Explainer";

/**
 * Daily Trading Checklist — "System Health" checks
 * Shows 4 quick yes/no indicators for trading readiness
 */
export default function SystemHealth({ benchmark, sectors, tickers }) {
  // Check 1: Is SPY above SMA 200?
  const spyAbove200 = benchmark?.aboveSma200 ?? false;

  // Check 2: Is the top sector green (positive change)?
  const topSector = sectors?.length
    ? sectors.reduce((best, s) => s.strengthScore > best.strengthScore ? s : best, sectors[0])
    : null;
  const topSectorGreen = topSector ? topSector.changePct > 0 : false;

  // Check 3: Are there VCP Tight setups?
  const vcpTightCount = tickers?.filter(t => t.vcpStatus === "tight").length ?? 0;
  const hasVcpTight = vcpTightCount > 0;

  // Check 4: How many tickers pass Stage 2?
  const stage2Count = tickers?.filter(isStage2).length ?? 0;
  const healthyBreadth = stage2Count >= 5;

  const checks = [
    {
      label: "SPY Trend",
      question: "SPY above SMA 200?",
      passed: spyAbove200,
      detail: benchmark
        ? `$${benchmark.price} ${spyAbove200 ? ">" : "<"} SMA200 $${benchmark.sma200 ?? "?"}`
        : "No data",
      Icon: TrendingUp,
      explainId: "spyTrend",
    },
    {
      label: "Lead Sector",
      question: "Top sector positive today?",
      passed: topSectorGreen,
      detail: topSector
        ? `${topSector.symbol} (${topSector.name}): ${topSector.changePct >= 0 ? "+" : ""}${topSector.changePct?.toFixed(2)}%`
        : "No data",
      Icon: Activity,
      explainId: "leadSector",
    },
    {
      label: "VCP Tight",
      question: "Any VCP Tight setups?",
      passed: hasVcpTight,
      detail: `${vcpTightCount} tight setup${vcpTightCount !== 1 ? "s" : ""} found`,
      Icon: Target,
      explainId: "vcpTightCheck",
    },
    {
      label: "Breadth",
      question: "5+ tickers in Stage 2?",
      passed: healthyBreadth,
      detail: `${stage2Count}/${tickers?.length ?? 0} meeting all criteria`,
      Icon: Zap,
      explainId: "breadthCheck",
    },
  ];

  const passedCount = checks.filter(c => c.passed).length;
  const allGreen = passedCount === checks.length;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {allGreen ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          )}
          <Explainer id="systemHealth" className="text-sm font-bold text-slate-100 uppercase tracking-wide">
            System Health
          </Explainer>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
          passedCount === 4 ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
          passedCount >= 2 ? "bg-amber-950 text-amber-400 border border-amber-800" :
          "bg-rose-950 text-rose-400 border border-rose-800"
        }`}>
          {passedCount}/{checks.length}
        </span>
      </div>

      {/* Checks grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {checks.map((check) => {
          const Icon = check.Icon;
          return (
            <div
              key={check.label}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                check.passed
                  ? "bg-emerald-950/30 border-emerald-900"
                  : "bg-rose-950/20 border-rose-900/50"
              }`}
            >
              <div className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                check.passed ? "bg-emerald-900 text-emerald-400" : "bg-rose-900/60 text-rose-400"
              }`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${
                    check.passed ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {check.passed ? "YES" : "NO"}
                  </span>
                  <Explainer id={check.explainId} className="text-xs text-slate-400 truncate">{check.question}</Explainer>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-mono-nums truncate">
                  {check.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall verdict */}
      <div className={`mt-4 pt-3 border-t border-slate-700 text-xs ${
        allGreen ? "text-emerald-400" :
        passedCount >= 2 ? "text-amber-400" : "text-rose-400"
      }`}>
        {allGreen
          ? "All systems go. Environment favors new entries."
          : passedCount >= 2
          ? "Caution. Selective entries only -- tighten stops."
          : "Hostile environment. Avoid new positions. Protect capital."
        }
      </div>
    </div>
  );
}
