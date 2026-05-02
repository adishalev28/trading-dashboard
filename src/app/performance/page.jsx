"use client";

import { useMemo } from "react";
import PageShell from "@/components/PageShell";
import PerformanceTable from "@/components/PerformanceTable";
import mockData from "@/lib/mockData.json";
import performanceData from "../../../scripts/performance_data.json";
import { buildPerformanceRows, summarizeRows } from "@/lib/performanceTracker";
import { Info } from "lucide-react";

export default function PerformancePage() {
  const { tickers } = mockData;

  const rows = useMemo(() => buildPerformanceRows(performanceData, tickers), [tickers]);
  const summary = useMemo(() => summarizeRows(rows), [rows]);

  return (
    <PageShell
      title="Performance Tracker"
      subtitle={`${rows.length} tickers tracked since ${performanceData.tickers && Object.values(performanceData.tickers)[0]?.firstSeen || "start"}`}
    >
      {/* Explainer */}
      <div className="mb-6 p-4 bg-slate-800 border border-slate-700 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-sm text-slate-300 space-y-2">
            <p>
              <strong className="text-slate-100">What you're seeing:</strong> every ticker that's ever appeared in
              <span className="text-emerald-400 font-bold"> Today's Top Picks</span> or
              <span className="text-slate-200 font-bold"> Potential Breakouts</span>, with its return measured from
              the day it first appeared in either list.
            </p>
            <p className="text-xs text-slate-400">
              Use this to see if Top Picks are actually beating the broader Breakouts list. After 2-3 months of data,
              the Top Picks group should statistically out-perform the Breakouts group — that's how we'll know the
              filter is doing its job.
            </p>
          </div>
        </div>
      </div>

      <PerformanceTable rows={rows} summary={summary} />

      {/* Footnote */}
      <div className="mt-6 text-[11px] text-slate-500">
        <p>
          <strong>Entry price</strong> = closing price on the first trading day the ticker appeared in either list.
          <strong> Current price</strong> = latest price from the most recent screener run. Returns are not adjusted
          for stop losses or partial exits — they show what would have happened if you'd bought and held.
        </p>
      </div>
    </PageShell>
  );
}
