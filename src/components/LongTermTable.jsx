"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import TradingViewModal from "./TradingViewModal";

const fmtPct = (v, digits = 0) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(digits)}%`);
const fmtNum = (v, digits = 1) => (v == null ? "—" : v.toFixed(digits));
const fmtUsd = (v) => (v == null ? "—" : `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`);
const fmtCap = (b) => (b == null ? "—" : b >= 1000 ? `$${(b / 1000).toFixed(1)}T` : `$${b.toFixed(0)}B`);

/** Thresholds only color the cell — every row already passed the hard filters */
const tone = (good, warn) => (good ? "text-emerald-400" : warn ? "text-amber-400" : "text-slate-200");

function sortBy(rows, key, dir) {
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string") return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return dir === "asc" ? av - bv : bv - av;
  });
}

function useSort(initialKey, initialDir = "desc") {
  const [sortKey, setSortKey] = useState(initialKey);
  const [sortDir, setSortDir] = useState(initialDir);
  const toggle = (key, defaultDir = "desc") => {
    if (key === sortKey) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else {
      setSortKey(key);
      setSortDir(defaultDir);
    }
  };
  return { sortKey, sortDir, toggle };
}

function HeaderRow({ columns, sort }) {
  return (
    <thead className="bg-slate-950 sticky top-0">
      <tr>
        {columns.map((col) => (
          <th
            key={col.key}
            onClick={() => sort.toggle(col.key, col.dir ?? "desc")}
            title={col.title}
            className={`px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 cursor-pointer hover:text-slate-200 whitespace-nowrap ${
              col.align === "right" ? "text-right" : "text-left"
            }`}
          >
            <span className="inline-flex items-center gap-1">
              {col.label}
              {sort.sortKey === col.key &&
                (sort.sortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
            </span>
          </th>
        ))}
      </tr>
    </thead>
  );
}

function TickerCell({ row, onOpen }) {
  return (
    <button onClick={() => onOpen(row)} className="text-left group cursor-pointer" title="Open TradingView chart">
      <div className="font-bold font-mono-nums text-slate-100 group-hover:text-emerald-400 transition-colors">
        {row.ticker}
      </div>
      <div className="text-[10px] text-slate-500 group-hover:text-slate-300 transition-colors max-w-[160px] truncate">
        {row.companyName}
      </div>
    </button>
  );
}

const PICK_COLUMNS = [
  { key: "ticker", label: "Ticker", dir: "asc" },
  { key: "score", label: "Score", align: "right", title: "Ranking inside the list: growth 45, quality 35, price 20" },
  { key: "sector", label: "Sector", dir: "asc" },
  { key: "marketCapB", label: "Mkt Cap", align: "right" },
  { key: "salesGrowth5y", label: "Sales 5Y", align: "right", title: "Average yearly sales growth, past 5 years" },
  { key: "epsGrowthNext5y", label: "EPS Next 5Y", align: "right", title: "Analyst estimate for yearly EPS growth, next 5 years" },
  { key: "roic", label: "ROIC", align: "right", title: "Return on invested capital" },
  { key: "grossMargin", label: "Gross M", align: "right" },
  { key: "debtEq", label: "Debt/Eq", align: "right", dir: "asc" },
  { key: "peg", label: "PEG", align: "right", dir: "asc", title: "P/E divided by expected growth. Under 1.5 is cheap for the growth" },
  { key: "pFcf", label: "P/FCF", align: "right", dir: "asc", title: "Price / free cash flow" },
  { key: "price", label: "Price", align: "right" },
  { key: "firstSeen", label: "In list since", dir: "asc" },
];

export default function LongTermTable({ picks }) {
  const sort = useSort("score");
  const [sector, setSector] = useState("all");
  const [chart, setChart] = useState(null);

  const sectors = useMemo(() => [...new Set(picks.map((p) => p.sector))].sort(), [picks]);
  const rows = useMemo(
    () => sortBy(sector === "all" ? picks : picks.filter((p) => p.sector === sector), sort.sortKey, sort.sortDir),
    [picks, sector, sort.sortKey, sort.sortDir]
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">All Sectors ({picks.length})</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s} ({picks.filter((p) => p.sector === s).length})
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto scrollbar-thin rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <HeaderRow columns={PICK_COLUMNS} sort={sort} />
          <tbody>
            {rows.map((p, i) => (
              <tr
                key={p.ticker}
                className={`${i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/60"} hover:bg-slate-800/60 transition-colors`}
              >
                <td className="px-3 py-3">
                  <TickerCell row={p} onOpen={setChart} />
                </td>
                <td className="px-3 py-3 text-right font-mono-nums font-bold">
                  <span className={p.score >= 70 ? "text-emerald-400" : p.score >= 50 ? "text-slate-100" : "text-slate-400"}>
                    {p.score}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">{p.sector}</td>
                <td className="px-3 py-3 text-right font-mono-nums text-slate-300">{fmtCap(p.marketCapB)}</td>
                <td className={`px-3 py-3 text-right font-mono-nums ${tone(p.salesGrowth5y >= 25)}`}>{fmtPct(p.salesGrowth5y)}</td>
                <td className={`px-3 py-3 text-right font-mono-nums ${tone(p.epsGrowthNext5y >= 20, p.epsGrowthNext5y != null && p.epsGrowthNext5y < 8)}`}>
                  {fmtPct(p.epsGrowthNext5y)}
                </td>
                <td className={`px-3 py-3 text-right font-mono-nums ${tone(p.roic >= 30)}`}>{fmtPct(p.roic)}</td>
                <td className={`px-3 py-3 text-right font-mono-nums ${tone(p.grossMargin >= 60)}`}>{fmtPct(p.grossMargin)}</td>
                <td className="px-3 py-3 text-right font-mono-nums text-slate-300">{fmtNum(p.debtEq, 2)}</td>
                <td className={`px-3 py-3 text-right font-mono-nums ${tone(p.peg != null && p.peg <= 1.5, p.peg > 2.5)}`}>
                  {fmtNum(p.peg, 2)}
                </td>
                <td className={`px-3 py-3 text-right font-mono-nums ${tone(p.pFcf <= 25, p.pFcf > 50)}`}>{fmtNum(p.pFcf, 0)}</td>
                <td className="px-3 py-3 text-right font-mono-nums text-slate-200">{fmtUsd(p.price)}</td>
                <td className="px-3 py-3 font-mono-nums text-xs text-slate-400 whitespace-nowrap">{p.firstSeen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TradingViewModal
        ticker={chart?.ticker ?? null}
        companyName={chart?.companyName ?? null}
        price={chart?.price ?? null}
        onClose={() => setChart(null)}
      />
    </div>
  );
}

const TRACKED_COLUMNS = [
  { key: "ticker", label: "Ticker", dir: "asc" },
  { key: "firstSeen", label: "First seen", dir: "asc" },
  { key: "daysTracked", label: "Days", align: "right" },
  { key: "entryPrice", label: "Entry", align: "right" },
  { key: "currentPrice", label: "Now", align: "right" },
  { key: "returnPct", label: "Return", align: "right" },
  { key: "spyReturnPct", label: "SPY same days", align: "right" },
  { key: "vsSpy", label: "vs SPY", align: "right" },
  { key: "inList", label: "Status" },
];

export function LongTermTracked({ tracked }) {
  const sort = useSort("vsSpy");
  const [chart, setChart] = useState(null);
  const rows = useMemo(
    () =>
      sortBy(
        tracked.map((r) => ({
          ...r,
          vsSpy: r.returnPct != null && r.spyReturnPct != null ? r.returnPct - r.spyReturnPct : null,
        })),
        sort.sortKey,
        sort.sortDir
      ),
    [tracked, sort.sortKey, sort.sortDir]
  );

  return (
    <div className="overflow-x-auto scrollbar-thin rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <HeaderRow columns={TRACKED_COLUMNS} sort={sort} />
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.ticker} className={`${i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/60"} hover:bg-slate-800/60`}>
              <td className="px-3 py-3">
                <TickerCell row={{ ...r, price: r.currentPrice }} onOpen={setChart} />
              </td>
              <td className="px-3 py-3 font-mono-nums text-xs text-slate-400 whitespace-nowrap">{r.firstSeen}</td>
              <td className="px-3 py-3 text-right font-mono-nums text-slate-300">{r.daysTracked}</td>
              <td className="px-3 py-3 text-right font-mono-nums text-slate-300">{fmtUsd(r.entryPrice)}</td>
              <td className="px-3 py-3 text-right font-mono-nums text-slate-200">{fmtUsd(r.currentPrice)}</td>
              <td className={`px-3 py-3 text-right font-mono-nums font-bold ${r.returnPct > 0 ? "text-emerald-400" : r.returnPct < 0 ? "text-rose-400" : "text-slate-300"}`}>
                {fmtPct(r.returnPct, 1)}
              </td>
              <td className="px-3 py-3 text-right font-mono-nums text-slate-400">{fmtPct(r.spyReturnPct, 1)}</td>
              <td className={`px-3 py-3 text-right font-mono-nums ${r.vsSpy > 0 ? "text-emerald-400" : r.vsSpy < 0 ? "text-rose-400" : "text-slate-300"}`}>
                {fmtPct(r.vsSpy, 1)}
              </td>
              <td className="px-3 py-3 text-xs whitespace-nowrap">
                {r.inList ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">In list</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">Dropped {r.lastSeen}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <TradingViewModal
        ticker={chart?.ticker ?? null}
        companyName={chart?.companyName ?? null}
        price={chart?.price ?? null}
        onClose={() => setChart(null)}
      />
    </div>
  );
}
