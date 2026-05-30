"use client";

import { useState } from "react";
import { Crosshair, TrendingUp, AlertCircle, Award, ChevronDown, ChevronUp, Search } from "lucide-react";
import { findTopPicks } from "@/lib/topPicks";
import { fmtUsd } from "@/lib/formatters";
import TradingViewModal from "./TradingViewModal";

const GRADE_STYLES = {
  "A+": { ring: "ring-emerald-400", text: "text-emerald-300", bg: "bg-emerald-500", label: "A+" },
  "A":  { ring: "ring-emerald-400", text: "text-emerald-300", bg: "bg-emerald-600", label: "A" },
  "B+": { ring: "ring-amber-400",   text: "text-amber-300",   bg: "bg-amber-600",   label: "B+" },
  "B":  { ring: "ring-amber-400",   text: "text-amber-300",   bg: "bg-amber-700",   label: "B" },
  "C":  { ring: "ring-slate-500",   text: "text-slate-300",   bg: "bg-slate-700",   label: "C" },
};

function PickCard({ pick, onOpen }) {
  const [showDetails, setShowDetails] = useState(false);
  const grade = GRADE_STYLES[pick.grade] || GRADE_STYLES.C;
  const t = pick.ticker;

  const breakdownEntries = Object.entries(pick.breakdown)
    .filter(([, b]) => b.label)
    .sort((a, b) => b[1].points - a[1].points);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 hover:border-emerald-700 transition-colors">
      <div className="flex items-start gap-3">
        {/* Grade badge */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl ring-2 ${grade.ring} ${grade.bg} flex items-center justify-center`}>
          <div className="text-white font-extrabold text-base leading-none">{grade.label}</div>
        </div>

        {/* Ticker + meta */}
        <div className="flex-1 min-w-0">
          <button
            onClick={() => onOpen(t.ticker)}
            className="font-extrabold text-lg text-slate-100 font-mono hover:text-emerald-400 transition-colors"
          >
            {t.ticker}
          </button>
          <div className="text-[11px] text-slate-500 truncate">{t.companyName}</div>
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className="font-mono-nums text-slate-300">{fmtUsd(t.price)}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">{t.sector}</span>
          </div>
        </div>

        {/* Score */}
        <div className="flex-shrink-0 text-right">
          <div className={`text-2xl font-extrabold ${grade.text} font-mono-nums leading-none`}>{pick.score}</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-1">score</div>
        </div>
      </div>

      {/* Quick reasons (top 3 strongest signals) */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {breakdownEntries.slice(0, 3).map(([key, b]) => (
          <span
            key={key}
            className={`text-[10px] px-2 py-0.5 rounded border ${
              b.points >= 15 ? "bg-emerald-950 text-emerald-300 border-emerald-800" :
              b.points >= 8  ? "bg-emerald-950/60 text-emerald-400/90 border-emerald-900" :
              "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            {b.label}
          </span>
        ))}
        {pick.daysToEarnings != null && Number.isFinite(pick.daysToEarnings) && (
          <span className="text-[10px] px-2 py-0.5 rounded border bg-slate-800 text-slate-400 border-slate-700">
            Earnings in {pick.daysToEarnings}d
          </span>
        )}
      </div>

      {/* Non-blocking observation tags — informational only, do NOT affect
          score or rank. Tracked over time to learn if they matter. */}
      {pick.tags && pick.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-amber-500/80 flex items-center gap-1">
            <Search className="w-3 h-3" /> Watch:
          </span>
          {pick.tags.map(tag => (
            <span
              key={tag.key}
              className="text-[10px] px-2 py-0.5 rounded border bg-amber-950/40 text-amber-300/90 border-amber-800/60"
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* Details toggle */}
      <button
        onClick={() => setShowDetails(v => !v)}
        className="mt-2 text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
      >
        {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {showDetails ? "Hide breakdown" : "Show full score breakdown"}
      </button>

      {showDetails && (
        <div className="mt-2 pt-2 border-t border-slate-800 grid grid-cols-2 gap-1 text-[10px]">
          {breakdownEntries.map(([key, b]) => (
            <div key={key} className="flex justify-between">
              <span className="text-slate-500 capitalize">{key}:</span>
              <span className={`font-mono-nums ${b.points > 0 ? "text-emerald-400" : "text-slate-600"}`}>
                +{b.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ totalCandidates, rejectedReasons }) {
  return (
    <div className="text-center py-6">
      <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
      <div className="text-sm font-bold text-slate-300">No A+ setups today</div>
      <div className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
        Discipline beats activity. Wait for a setup that meets every criterion — it will come.
      </div>
      <div className="mt-3 text-[10px] text-slate-600 space-y-0.5">
        <div>{totalCandidates} potential breakouts scanned</div>
        {rejectedReasons.noVolumeConfirmation > 0 && (
          <div>{rejectedReasons.noVolumeConfirmation} filtered: no volume confirmation</div>
        )}
        {rejectedReasons.earningsTooSoon > 0 && (
          <div>{rejectedReasons.earningsTooSoon} filtered: earnings within 7 days</div>
        )}
        {rejectedReasons.scoreTooLow > 0 && (
          <div>{rejectedReasons.scoreTooLow} filtered: setup score below 50</div>
        )}
      </div>
    </div>
  );
}

export default function TodaysTopPicks({ tickers, sectors }) {
  const [openTicker, setOpenTicker] = useState(null);
  const { picks, totalCandidates, rejectedReasons } = findTopPicks(tickers, sectors);
  const isEmpty = picks.length === 0;

  return (
    <>
      <div className="border-2 border-emerald-700/40 bg-gradient-to-br from-emerald-950/30 to-slate-900 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-900/60 border border-emerald-700 flex items-center justify-center">
              <Crosshair className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-100 leading-tight">
                Today's Top Picks
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                A+ setups — strict filter on top of Potential Breakouts
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-emerald-400">
              {picks.length} of {totalCandidates}
            </div>
            <div className="text-[10px] text-slate-500">qualified</div>
          </div>
        </div>

        {isEmpty ? (
          <EmptyState totalCandidates={totalCandidates} rejectedReasons={rejectedReasons} />
        ) : (
          <>
            {/* Scrollable picks container. Sized to comfortably show ~3 cards
                on mobile and a single row of 3 on desktop, with a soft fade
                cue so users can see more setups are available below. */}
            <div className="relative">
              <div
                className="grid grid-cols-1 lg:grid-cols-3 gap-3 overflow-y-auto pr-1
                           max-h-[470px] lg:max-h-[400px] scrollbar-thin"
              >
                {picks.map(p => (
                  <PickCard key={p.ticker.ticker} pick={p} onOpen={setOpenTicker} />
                ))}
              </div>
              {picks.length > 3 && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-8
                             bg-gradient-to-t from-slate-900 via-slate-900/70 to-transparent
                             rounded-b-xl"
                />
              )}
            </div>

            {picks.length > 3 && (
              <div className="mt-2 text-[10px] text-slate-500 text-center">
                Scroll to see {picks.length - 3} more {picks.length - 3 === 1 ? "pick" : "picks"} ranked by score
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-slate-800 flex items-start gap-2 text-[11px] text-slate-500">
              <Award className="w-3.5 h-3.5 text-emerald-500/60 flex-shrink-0 mt-0.5" />
              <span>
                Wait for the actual breakout candle with volume before entering. Stop loss
                at <strong className="text-slate-400">−7%</strong> from entry. Take 50% off
                at <strong className="text-emerald-400">+10%</strong>.
              </span>
            </div>
          </>
        )}
      </div>

      {openTicker && (() => {
        const td = tickers.find(t => t.ticker === openTicker);
        return (
          <TradingViewModal
            ticker={openTicker}
            companyName={td?.companyName}
            price={td?.price}
            pivotPrice={td?.pivotPrice}
            priceHistory={td?.priceHistory30d}
            onClose={() => setOpenTicker(null)}
          />
        );
      })()}
    </>
  );
}
