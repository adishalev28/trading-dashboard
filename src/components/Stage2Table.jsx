"use client";

import { useState, useMemo } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import TrendBadge from "./TrendBadge";
import VCPBadge from "./VCPBadge";
import VolSurgeBadge from "./VolSurgeBadge";
import RSBar from "./RSBar";
import Sparkline from "./Sparkline";
import Tooltip from "./Tooltip";
import { fmtUsd, fmtPct } from "@/lib/formatters";
import { sortTickers } from "@/lib/screener";

const columns = [
  { key: "ticker",           label: "Ticker",    align: "left" },
  { key: "chart",            label: "30D",       align: "center", sortable: false },
  { key: "price",            label: "Price",     align: "right" },
  { key: "distToPivotPct",   label: "Pivot",     align: "right",  tooltip: "pivot" },
  { key: "trend",            label: "Trend",     align: "center", sortable: false, tooltip: "stage2" },
  { key: "rsScore",          label: "RS Score",  align: "left",   tooltip: "rs" },
  { key: "volumePctAvg",     label: "Vol %",     align: "right" },
  { key: "volumeSurge",      label: "Surge",     align: "center", sortable: false },
  { key: "vcpStatus",        label: "VCP",       align: "center", tooltip: "vcp" },
  { key: "weekHighDistance", label: "Dist 52W",  align: "right" },
];

/**
 * Professional sortable table of Stage 2 candidates
 */
export default function Stage2Table({ tickers, limit }) {
  const [sortKey, setSortKey] = useState("rsScore");
  const [sortDir, setSortDir] = useState("desc");

  const sorted = useMemo(() => {
    const arr = sortTickers(tickers, sortKey, sortDir);
    return limit ? arr.slice(0, limit) : arr;
  }, [tickers, sortKey, sortDir, limit]);

  const toggleSort = (key) => {
    const col = columns.find((c) => c.key === key);
    if (!col || col.sortable === false) return;
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="overflow-x-auto scrollbar-thin rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-950 sticky top-0">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 ${
                  col.align === "right" ? "text-right" :
                  col.align === "center" ? "text-center" : "text-left"
                } ${
                  col.sortable !== false ? "cursor-pointer hover:text-slate-200" : ""
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.tooltip && <Tooltip id={col.tooltip} inline />}
                  {sortKey === col.key && (
                    sortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, i) => (
            <tr
              key={t.ticker}
              className={`${i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/60"} hover:bg-slate-800/60 transition-colors`}
            >
              <td className="px-4 py-3">
                <div className="font-bold font-mono-nums text-slate-100">{t.ticker}</div>
                <div className="text-[10px] text-slate-500">{t.companyName}</div>
              </td>
              <td className="px-2 py-3">
                <Sparkline data={t.priceHistory30d} width={90} height={28} />
              </td>
              <td className="px-4 py-3 text-right font-mono-nums text-slate-200">
                {fmtUsd(t.price)}
              </td>
              <td className="px-3 py-3 text-right">
                {(() => {
                  const dist = t.distToPivotPct ?? 0;
                  const pivot = t.pivotPrice ?? t.price;
                  // Color: ≤0% = at/above pivot (breakout!), ≤2% = near pivot, ≤5% = approaching, >5% = far
                  const colorClass = dist <= 0
                    ? "text-emerald-400"
                    : dist <= 2
                    ? "text-emerald-400"
                    : dist <= 5
                    ? "text-amber-400"
                    : "text-slate-400";
                  const label = dist <= 0 ? "BREAKOUT" : null;
                  return (
                    <div>
                      <div className="text-[10px] text-slate-500 font-mono-nums">{fmtUsd(pivot)}</div>
                      <div className={`text-xs font-bold font-mono-nums ${colorClass}`}>
                        {label || `${dist.toFixed(1)}% away`}
                      </div>
                    </div>
                  );
                })()}
              </td>
              <td className="px-4 py-3 text-center">
                <TrendBadge price={t.price} sma150={t.sma150} sma200={t.sma200} />
              </td>
              <td className="px-4 py-3">
                <RSBar score={t.rsScore} compact />
              </td>
              <td className={`px-4 py-3 text-right font-mono-nums ${
                // Volume color coding:
                // >120% = breakout volume (emerald)
                // 80-120% = normal/healthy (slate)
                // <80% = contraction (amber — good for VCP, neutral signal)
                (t.volumePctAvg ?? 100) > 120 ? "text-emerald-400" :
                (t.volumePctAvg ?? 100) < 80 ? "text-amber-400" : "text-slate-300"
              }`}>
                {Math.round(t.volumePctAvg ?? 100)}%
              </td>
              <td className="px-4 py-3 text-center">
                <VolSurgeBadge status={t.volumeSurge} />
              </td>
              <td className="px-4 py-3 text-center">
                <VCPBadge status={t.vcpStatus} />
              </td>
              <td className={`px-4 py-3 text-right font-mono-nums ${
                t.weekHighDistance <= 5 ? "text-emerald-400" :
                t.weekHighDistance <= 15 ? "text-amber-400" : "text-rose-400"
              }`}>
                -{t.weekHighDistance.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
