"use client";

import { useState } from "react";
import { Copy, Check, Sparkles, Calendar } from "lucide-react";
import {
  calculateGannBoxLevels,
  calculateGannTimeProjections,
  findSwingPoints,
} from "@/lib/gann_math";

/**
 * Gann Box panel — price ladder + time-projection dates.
 *
 * Price: eighths-of-range divisions of the swing high/low, plus extensions.
 * Time:  forward dates at the same fractions of the leg duration. "1×" is
 *        the headline forecast ("time squares price"); "1/2" is the inner
 *        pivot. Use as confluence only.
 */

const SHORT_MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(d) {
  return `${SHORT_MONTH[d.getMonth()]} ${d.getDate()}`;
}

function fmtDelta(daysFromToday) {
  if (daysFromToday === 0) return "today";
  if (daysFromToday > 0) return `in ${daysFromToday}d`;
  return `${Math.abs(daysFromToday)}d ago`;
}

function distanceTone(absDist) {
  if (absDist <= 2)  return "text-rose-300 bg-rose-950/40 border-rose-800";
  if (absDist <= 5)  return "text-amber-300 bg-amber-950/40 border-amber-800";
  if (absDist <= 15) return "text-sky-300 bg-sky-950/30 border-sky-900";
  return "text-slate-400 bg-slate-900 border-slate-800";
}

function timeTone(daysFromToday, importance) {
  if (importance === "critical") {
    return "text-violet-200 bg-violet-950/50 border-violet-700";
  }
  const abs = Math.abs(daysFromToday);
  if (abs <= 3)  return "text-amber-300 bg-amber-950/40 border-amber-800";
  if (abs <= 14) return "text-sky-300 bg-sky-950/30 border-sky-900";
  return "text-slate-400 bg-slate-900 border-slate-800";
}

function importanceBadge(importance, kind) {
  if (importance === "critical") {
    return { ring: "ring-2 ring-violet-500", chip: "bg-violet-900/60 text-violet-200" };
  }
  if (kind === "edge") {
    return { ring: "ring-1 ring-emerald-700", chip: "bg-emerald-900/40 text-emerald-300" };
  }
  if (importance === "key") {
    return { ring: "", chip: "bg-slate-800 text-slate-300" };
  }
  return { ring: "", chip: "bg-slate-800/60 text-slate-500" };
}

export default function GannPanel({ price, ticker, priceHistory, asOfDate }) {
  const [copied, setCopied] = useState(false);
  const swing = findSwingPoints(priceHistory);
  const levels = swing
    ? calculateGannBoxLevels({ price, swingHigh: swing.high, swingLow: swing.low })
    : [];
  const timeProjections = swing
    ? calculateGannTimeProjections({
        swingHighIdx: swing.highIdx,
        swingLowIdx: swing.lowIdx,
        historyLength: priceHistory?.length ?? 30,
        asOfDate,
      })
    : [];

  if (!price || !swing || levels.length === 0) {
    return (
      <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700">
        <div className="px-4 py-3 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-bold text-violet-300 uppercase tracking-wide">
              Gann Box
            </h3>
          </div>
        </div>
        <div className="p-4 text-xs text-slate-500 italic">
          Not enough price history to build a Gann Box for this ticker.
        </div>
      </div>
    );
  }

  const aboveLevels = levels.filter((l) => l.price > price);
  const belowLevels = levels.filter((l) => l.price < price);

  const handleCopy = async () => {
    const priceLines = levels.map((l) => {
      const sign = l.distancePct >= 0 ? "+" : "";
      return `${l.label.padEnd(5)}  $${l.price.toFixed(2).padStart(8)}  (${sign}${l.distancePct.toFixed(2)}%)`;
    });
    const timeLines = timeProjections.map((t) => {
      const tail = t.importance === "critical" ? "  ★" : "";
      return `${t.label.padEnd(5)}  ${t.isoDate}  (${fmtDelta(t.daysFromToday)})${tail}`;
    });
    const text = [
      `${ticker || "Symbol"} — Gann Box`,
      `Range: $${swing.low.toFixed(2)} → $${swing.high.toFixed(2)}`,
      `Current: $${price.toFixed(2)}`,
      "",
      "PRICE LEVELS",
      ...priceLines,
      "",
      "TIME FORECAST (calendar days)",
      ...timeLines,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — fail silently
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-bold text-violet-300 uppercase tracking-wide">
            Gann Box
          </h3>
        </div>
        <div className="text-[10px] text-slate-500 mt-1 leading-snug">
          Range divided in eighths.{" "}
          <span className="text-violet-300 font-bold">1/2</span> is the critical
          price level; <span className="text-violet-300 font-bold">1×</span> is
          the headline reversal date. Confluence only.
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
          <div className="bg-slate-950 border border-slate-700 rounded px-2 py-1">
            <div className="text-slate-500 uppercase tracking-wide">Swing High (100%)</div>
            <div className="font-mono-nums text-emerald-300 font-bold">${swing.high.toFixed(2)}</div>
          </div>
          <div className="bg-slate-950 border border-slate-700 rounded px-2 py-1">
            <div className="text-slate-500 uppercase tracking-wide">Swing Low (0%)</div>
            <div className="font-mono-nums text-rose-300 font-bold">${swing.low.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
        {/* — Price section — */}
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold pb-1">
          Price Levels
        </div>

        {aboveLevels.map((l) => (
          <PriceRow key={`a-${l.label}`} {...l} />
        ))}

        <div className="my-2 px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-700">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wide text-emerald-300 font-bold">
              Current Price
            </span>
            <span className="font-mono-nums text-base font-bold text-emerald-300">
              ${price.toFixed(2)}
            </span>
          </div>
        </div>

        {belowLevels.map((l) => (
          <PriceRow key={`b-${l.label}`} {...l} />
        ))}

        {/* — Time section — */}
        {timeProjections.length > 0 && (
          <>
            <div className="mt-5 mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              <Calendar className="w-3 h-3" />
              Forecast Reversal Dates
            </div>
            <div className="text-[10px] text-slate-500 leading-snug pb-2">
              Forward dates at Gann fractions of the swing-to-swing leg.{" "}
              <span className="text-violet-300 font-bold">1×</span> is when time
              "squares" price — the highest-conviction reversal window.
            </div>
            {timeProjections.map((t) => (
              <TimeRow key={`t-${t.label}`} {...t} />
            ))}
          </>
        )}
      </div>

      {/* Copy footer */}
      <div className="border-t border-slate-700 p-3 shrink-0">
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-violet-500 text-slate-200 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Copied — paste in TradingView to draw lines
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy box (price + dates)
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function PriceRow({ label, kind, importance, price, distancePct }) {
  const tone = distanceTone(Math.abs(distancePct));
  const sign = distancePct >= 0 ? "+" : "";
  const { ring, chip } = importanceBadge(importance, kind);
  const isHalf = importance === "critical";

  return (
    <div className={`flex items-center justify-between px-3 py-1.5 rounded-md border ${tone} ${ring}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${chip}`}>
          {label}
          {isHalf && <span className="ml-1">★</span>}
        </span>
        {kind === "extension" && (
          <span className="text-[9px] text-slate-500 uppercase tracking-wider">ext</span>
        )}
      </div>
      <div className="flex items-center gap-2 font-mono-nums shrink-0">
        <span className="text-sm font-bold">${price.toFixed(2)}</span>
        <span className="text-[10px] opacity-70">
          ({sign}
          {distancePct.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}

function TimeRow({ label, importance, date, daysFromToday }) {
  const tone = timeTone(daysFromToday, importance);
  const ring = importance === "critical" ? "ring-2 ring-violet-500" : "";
  const chip =
    importance === "critical"
      ? "bg-violet-900/60 text-violet-200"
      : importance === "key"
      ? "bg-slate-800 text-slate-300"
      : "bg-slate-800/60 text-slate-500";
  const isHeadline = importance === "critical";

  return (
    <div className={`flex items-center justify-between px-3 py-1.5 rounded-md border ${tone} ${ring}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${chip}`}>
          {label}
          {isHeadline && <span className="ml-1">★</span>}
        </span>
      </div>
      <div className="flex items-center gap-2 font-mono-nums shrink-0">
        <span className="text-sm font-bold">{fmtDate(date)}</span>
        <span className="text-[10px] opacity-70">{fmtDelta(daysFromToday)}</span>
      </div>
    </div>
  );
}
