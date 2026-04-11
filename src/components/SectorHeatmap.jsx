"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown } from "lucide-react";
import SectorCard from "./SectorCard";
import { sortSectors } from "@/lib/screener";

/**
 * Grid of SectorCards with sort toggle
 */
export default function SectorHeatmap({ sectors, limit }) {
  const [sortKey, setSortKey] = useState("strengthScore");
  const [sortDir, setSortDir] = useState("desc");

  const sorted = useMemo(() => {
    const arr = sortSectors(sectors, sortKey, sortDir);
    return limit ? arr.slice(0, limit) : arr;
  }, [sectors, sortKey, sortDir, limit]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div>
      {/* Sort controls */}
      {!limit && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-slate-500">Sort by:</span>
          {[
            { key: "strengthScore", label: "Strength" },
            { key: "changePct", label: "% Change" },
            { key: "name", label: "Name" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                sortKey === key
                  ? "bg-emerald-950/60 border-emerald-700 text-emerald-400"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="inline-flex items-center gap-1">
                {label}
                {sortKey === key && (
                  <ArrowUpDown className="w-3 h-3" />
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sorted.map((sector, i) => (
          <SectorCard key={sector.symbol} sector={sector} index={i} />
        ))}
      </div>
    </div>
  );
}
