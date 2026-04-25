"use client";

import { useState } from "react";
import { Copy, Check, Sparkles } from "lucide-react";
import { calculateGannLevels } from "@/lib/gann_math";

/**
 * Vertical price-ladder visualization of Gann Square of 9 levels.
 *
 * Center row is the current price; each Gann level is rendered above/below
 * with its distance %. Color escalates as price approaches a level — a
 * level within 2% goes red because that's where the trader has to decide
 * (bounce or break).
 *
 * Use as confluence only — Gann's geometric levels have no proven edge,
 * but if a Minervini breakout pivot happens to land on a Gann angle, that
 * adds a second source of agreement.
 */

function distanceTone(absDist) {
  if (absDist <= 2) return "text-rose-300 bg-rose-950/40 border-rose-800";
  if (absDist <= 5) return "text-amber-300 bg-amber-950/40 border-amber-800";
  if (absDist <= 15) return "text-sky-300 bg-sky-950/30 border-sky-900";
  return "text-slate-400 bg-slate-900 border-slate-800";
}

export default function GannPanel({ price, ticker }) {
  const [copied, setCopied] = useState(false);
  const levels = calculateGannLevels(price);

  if (!price || levels.length === 0) {
    return (
      <div className="p-4 text-xs text-slate-500 italic">
        No price available — Gann levels need a current price.
      </div>
    );
  }

  const handleCopy = async () => {
    const lines = [
      `${ticker || "Symbol"} — Gann Square of 9 Levels`,
      `Current: $${price.toFixed(2)}`,
      "",
      ...levels.map(
        (l) =>
          `${l.degrees}° ${l.direction.toUpperCase().padEnd(4)}  $${l.price.toFixed(
            2
          )}  (${l.distancePct >= 0 ? "+" : ""}${l.distancePct.toFixed(2)}%)`
      ),
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
            Gann Square of 9
          </h3>
        </div>
        <div className="text-[10px] text-slate-500 mt-1 leading-snug">
          Geometric support/resistance — use only as confluence with
          technical/fundamental signals.
        </div>
      </div>

      {/* Ladder */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {levels
          .filter((l) => l.direction === "up")
          .map((l) => (
            <LadderRow key={`up-${l.degrees}`} {...l} />
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

        {levels
          .filter((l) => l.direction === "down")
          .map((l) => (
            <LadderRow key={`down-${l.degrees}`} {...l} />
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

function LadderRow({ degrees, direction, price, distancePct }) {
  const tone = distanceTone(Math.abs(distancePct));
  const sign = distancePct >= 0 ? "+" : "";

  return (
    <div
      className={`flex items-center justify-between px-3 py-1.5 rounded-md border ${tone}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wide opacity-80 shrink-0">
          {degrees}° {direction}
        </span>
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
