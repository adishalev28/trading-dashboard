"use client";

import { motion } from "framer-motion";
import { fmtPct, fmtMarketCap } from "@/lib/formatters";
import RSBar from "./RSBar";

/**
 * Single sector tile — symbol pill, % change, strength score, market cap
 */
export default function SectorCard({ sector, index = 0 }) {
  const isGain = sector.changePct >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      whileHover={{ y: -2 }}
      className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors cursor-default"
    >
      {/* Top: symbol pill + name */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="inline-block px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs font-mono-nums font-bold text-slate-300">
            {sector.symbol}
          </span>
          <h3 className="text-sm font-semibold text-slate-100 mt-1.5">
            {sector.name}
          </h3>
        </div>
        <span className="text-[10px] text-slate-500 font-mono-nums">
          {fmtMarketCap(sector.marketCap)}
        </span>
      </div>

      {/* Middle: % change (big) */}
      <div
        className={`text-3xl font-bold font-mono-nums mb-3 ${
          isGain ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {fmtPct(sector.changePct)}
      </div>

      {/* Bottom: strength bar */}
      <div>
        <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-wide">
          Strength Score
        </div>
        <RSBar score={sector.strengthScore} compact={false} />
      </div>
    </motion.div>
  );
}
