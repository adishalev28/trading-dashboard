"use client";

import { useState } from "react";
import { Copy, Check, Sparkles } from "lucide-react";
import { calculateGannBoxLevels, findSwingPoints } from "@/lib/gann_math";

/**
 * Vertical price-ladder visualization of Gann Box levels.
 *
 * The Gann Box divides a recent swing high/low range into eighths (0%, 1/8,
 * 1/4, 3/8, 1/2★, 5/8, 3/4, 7/8, 100%) and projects extensions above and
 * below. 1/2 is highlighted as the most critical Gann level — it's where
 * trends usually confirm or reverse.
 *
 * Use as confluence only.
 */

function distanceTone(absDist) {
  if (absDist <= 2)  return "text-rose-300 bg-rose-950/40 border-rose-800";
  if (absDist <= 5)  return "text-amber-300 bg-amber-950/40 border-amber-800";
  if (absDist <= 15) return "text-sky-300 bg-sky-950/30 border-sky-900";
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

export default function GannPanel({ price, ticker, priceHistory }) {
  const [copied, setCopied] = useState(false);
  const swing = findSwingPoints(priceHistory);
  const levels = swing
    ? calculateGannBoxLevels({ price, swingHigh: swing.high, swingLow: swing.low })
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

  // Split into above-current and below-current for the ladder
  const aboveLevels = levels.filter((l) => l.price > price);
  const belowLevels = levels.filter((l) => l.price < price);

  const handleCopy = async () => {
    const lines = [
      `${ticker || "Symbol"} — Gann Box`,
      `Range: $${swing.low.toFixed(2)} → $${swing.high.toFixed(2)}`,
      `Current: $${price.toFixed(2)}`,
      "",
      ...levels.map((l) => {
        const sign = l.distancePct >= 0 ? "+" : "";
        return `${l.label.padEnd(5)}  $${l.price.toFixed(2).padStart(8)}  (${sign}${l.distancePct.toFixed(2)}%)`;
      }),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard might be blocked — fail silently
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
          Swing range divided into eighths. <span className="text-violet-300 font-bold">1/2</span> is the
          critical level. Confluence only.
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

      {/* Ladder */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
        {aboveLevels.map((l) => (
          <LadderRow key={`a-${l.label}`} {...l} />
        ))}

        {/* Current price row */}
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
          <LadderRow key={`b-${l.label}`} {...l} />
        ))}
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
              Copy levels
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function LadderRow({ label, kind, importance, price, distancePct }) {
  const tone = distanceTone(Math.abs(distancePct));
  const sign = distancePct >= 0 ? "+" : "";
  const { ring, chip } = importanceBadge(importance, kind);
  const isHalf = importance === "critical";

  return (
    <div
      className={`flex items-center justify-between px-3 py-1.5 rounded-md border ${tone} ${ring}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${chip}`}
        >
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
