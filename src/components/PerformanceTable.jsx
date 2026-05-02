"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, Crosshair, TrendingUp, Target } from "lucide-react";
import { fmtUsd } from "@/lib/formatters";
import { sortRows } from "@/lib/performanceTracker";

const FILTER_OPTIONS = {
  all:        { label: "All",          predicate: () => true },
  topPicks:   { label: "Top Picks only", predicate: r => r.wasTopPick },
  breakouts:  { label: "Breakouts only", predicate: r => r.wasBreakout && !r.wasTopPick },
  winners:    { label: "Winners (≥5%)",  predicate: r => (r.changePct ?? 0) >= 5 },
  losers:     { label: "Losers (≤−5%)",  predicate: r => (r.changePct ?? 0) <= -5 },
};

const GRADE_COLOR = {
  "A+": "bg-emerald-500 text-white",
  "A":  "bg-emerald-600 text-white",
  "B+": "bg-amber-500 text-white",
  "B":  "bg-amber-600 text-white",
  "C":  "bg-slate-600 text-white",
};

function ChangeCell({ value }) {
  if (value == null) {
    return <span className="text-slate-600">—</span>;
  }
  const positive = value >= 0;
  const big = Math.abs(value) >= 5;
  return (
    <span className={`font-mono-nums font-bold ${
      big && positive  ? "text-emerald-300" :
      positive          ? "text-emerald-400" :
      big && !positive ? "text-rose-300" :
      "text-rose-400"
    }`}>
      {positive ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

function SortHeader({ label, sortKey, currentKey, currentDir, onSort, align = "left" }) {
  const active = sortKey === currentKey;
  const Arrow = currentDir === "asc" ? ChevronUp : ChevronDown;
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide cursor-pointer hover:text-slate-200 ${alignClass} ${
        active ? "text-emerald-400" : "text-slate-400"
      }`}
      onClick={() => onSort(sortKey)}
    >
      <div className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
        {label}
        {active && <Arrow className="w-3 h-3" />}
      </div>
    </th>
  );
}

export default function PerformanceTable({ rows, summary }) {
  const [sortKey, setSortKey] = useState("changePct");
  const [sortDir, setSortDir] = useState("desc");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    const pred = FILTER_OPTIONS[filter].predicate;
    return rows.filter(pred);
  }, [rows, filter]);

  const sorted = useMemo(() => sortRows(filtered, sortKey, sortDir), [filtered, sortKey, sortDir]);

  function onSort(key) {
    if (key === sortKey) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(["ticker", "firstSeen"].includes(key) ? "asc" : "desc");
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(FILTER_OPTIONS).map(([key, opt]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
              filter === key
                ? "bg-emerald-950/60 text-emerald-300 border-emerald-700"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
          >
            {opt.label}
            <span className="ml-1.5 text-[10px] text-slate-500 font-normal">
              {rows.filter(FILTER_OPTIONS[key].predicate).length}
            </span>
          </button>
        ))}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
          <div className="text-[10px] text-slate-500 uppercase">Tracked</div>
          <div className="text-lg font-bold text-slate-100 font-mono-nums">{summary.count}</div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
          <div className="text-[10px] text-slate-500 uppercase">Win rate</div>
          <div className="text-lg font-bold text-emerald-400 font-mono-nums">
            {summary.count > 0 ? `${summary.winnersPct.toFixed(0)}%` : "—"}
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
          <div className="text-[10px] text-slate-500 uppercase">Avg return</div>
          <div className={`text-lg font-bold font-mono-nums ${
            summary.avgReturn >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}>
            {summary.avgReturn >= 0 ? "+" : ""}{summary.avgReturn.toFixed(2)}%
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
          <div className="text-[10px] text-slate-500 uppercase">Median</div>
          <div className={`text-lg font-bold font-mono-nums ${
            summary.medianReturn >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}>
            {summary.medianReturn >= 0 ? "+" : ""}{summary.medianReturn.toFixed(2)}%
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
          <div className="text-[10px] text-slate-500 uppercase">Big wins ≥5%</div>
          <div className="text-lg font-bold text-emerald-400 font-mono-nums">{summary.bigWinners}</div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
          <div className="text-[10px] text-slate-500 uppercase">Big losses ≤−5%</div>
          <div className="text-lg font-bold text-rose-400 font-mono-nums">{summary.bigLosers}</div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-950">
            <tr>
              <SortHeader label="Ticker"      sortKey="ticker"           currentKey={sortKey} currentDir={sortDir} onSort={onSort} />
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-center text-slate-400">Tags</th>
              <SortHeader label="First seen"  sortKey="firstSeen"        currentKey={sortKey} currentDir={sortDir} onSort={onSort} />
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-right text-slate-400">Entry</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-right text-slate-400">Current</th>
              <SortHeader label="Δ %"         sortKey="changePct"        currentKey={sortKey} currentDir={sortDir} onSort={onSort} align="right" />
              <SortHeader label="Score"       sortKey="bestTopPickScore" currentKey={sortKey} currentDir={sortDir} onSort={onSort} align="right" />
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-left text-slate-400">Sector</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center text-slate-500 py-8 text-xs">
                  No tickers match this filter.
                </td>
              </tr>
            )}
            {sorted.map((r, i) => (
              <tr key={r.ticker} className={`${i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/60"} hover:bg-slate-800/60 transition-colors`}>
                <td className="px-3 py-2.5">
                  <div className="font-bold text-slate-100 font-mono">{r.ticker}</div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{r.companyName}</div>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <div className="flex flex-col items-center gap-1">
                    {r.wasTopPick && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold"
                        title={`Top Pick on ${r.bestTopPickDate ?? "?"}, score ${r.bestTopPickScore}`}
                      >
                        <Crosshair className="w-3 h-3" />
                        TOP PICK
                      </span>
                    )}
                    {r.wasBreakout && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        <Target className="w-3 h-3" />
                        BREAKOUT × {r.breakoutCount}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-400">
                  {r.firstSeen}
                  <div className="text-[10px] text-slate-600">{r.daysHeld}d ago</div>
                </td>
                <td className="px-3 py-2.5 text-right font-mono-nums text-slate-400 text-xs">
                  {r.entryPrice != null ? fmtUsd(r.entryPrice) : "—"}
                </td>
                <td className="px-3 py-2.5 text-right font-mono-nums text-slate-200 text-xs">
                  {r.currentPrice != null ? fmtUsd(r.currentPrice) : "—"}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <ChangeCell value={r.changePct} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  {r.bestTopPickScore != null ? (
                    <div className="inline-flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${GRADE_COLOR[r.bestTopPickGrade] ?? GRADE_COLOR.C}`}>
                        {r.bestTopPickGrade}
                      </span>
                      <span className="font-mono-nums text-slate-300 text-xs">{r.bestTopPickScore}</span>
                    </div>
                  ) : (
                    <span className="text-slate-600 text-xs">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-400 truncate max-w-[100px]">{r.sector}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
