import PageShell from "@/components/PageShell";
import LongTermTable, { LongTermTracked } from "@/components/LongTermTable";
import longTermData from "@/lib/longTermData.json";
import { Info } from "lucide-react";

const signed = (v) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`);

function Stat({ label, value, sub, tone = "text-slate-100" }) {
  return (
    <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold font-mono-nums ${tone}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export default function LongTermPage() {
  const { meta, criteria, summary, picks, tracked } = longTermData;
  const edge = summary.count ? summary.avgReturn - summary.avgSpyReturn : null;

  return (
    <PageShell
      title="Long Term"
      subtitle={`${picks.length} quality compounders · updated ${meta.asOf} · tracking since ${meta.trackingSince}`}
    >
      {/* Explainer */}
      <div className="mb-6 p-4 bg-slate-800 border border-slate-700 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-sm text-slate-300 space-y-3">
            <p>
              <strong className="text-slate-100">A different question from the swing screener:</strong> not
              &ldquo;what breaks out this week&rdquo;, but which businesses have grown for years, earn well on their
              capital, fund themselves and can survive a bad year. Every stock here passed all of these:
            </p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {criteria.map((c) => (
                <li key={c.label} className="text-xs">
                  <span className="text-slate-100 font-semibold">{c.label}</span>
                  <span className="text-emerald-400"> {c.rule}</span>
                  <span className="text-slate-500"> · {c.why}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-400">
              Free data has no historical fundamentals, so this list can&apos;t be backtested. Instead, every stock is
              tracked forward from the day it enters, against SPY over the same days. Give it months before judging.
            </p>
          </div>
        </div>
      </div>

      {/* Forward results */}
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Tracked" value={summary.count || 0} sub={summary.count ? "stocks with at least 1 day" : "starts counting tomorrow"} />
        <Stat
          label="Avg return"
          value={summary.count ? signed(summary.avgReturn) : "—"}
          sub={summary.count ? `median ${signed(summary.medianReturn)}` : null}
          tone={summary.avgReturn > 0 ? "text-emerald-400" : summary.avgReturn < 0 ? "text-rose-400" : "text-slate-100"}
        />
        <Stat
          label="SPY, same days"
          value={summary.count ? signed(summary.avgSpyReturn) : "—"}
          sub={edge == null ? null : `edge ${signed(edge)}`}
        />
        <Stat
          label="Beat SPY"
          value={summary.count ? `${summary.beatSpyPct}%` : "—"}
          tone={summary.beatSpyPct >= 50 ? "text-emerald-400" : summary.count ? "text-amber-400" : "text-slate-100"}
        />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Today&apos;s list</h2>
      <LongTermTable picks={picks} />

      <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Forward tracking · every stock that ever entered
      </h2>
      <LongTermTracked tracked={tracked} />

      {/* Footnote */}
      <div className="mt-6 space-y-1 text-[11px] text-slate-500">
        <p>
          <strong>Holding rules for this list:</strong> review after each quarterly report, not daily. Exit when the
          reason you bought breaks (growth stalls for two quarters, margins collapse, debt jumps) - not because the
          price fell. Dropping off the list is a prompt to re-check, not an automatic sell.
        </p>
        <p>
          Data: Finviz fundamentals and yfinance prices, refreshed with the daily screener run. This is a research
          tool, not investment advice.
        </p>
      </div>
    </PageShell>
  );
}
