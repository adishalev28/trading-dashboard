"use client";

import { useMemo, useState } from "react";
import { Info, Flag } from "lucide-react";
import PageShell from "@/components/PageShell";
import TradingViewModal from "@/components/TradingViewModal";
import {
  FLAG_ORDER, FLAG_LABELS, LEVELS, fmtFlagValue,
  screenMeta, screenGroups, screenTracked, screenTickers,
} from "@/lib/redFlags";

const LEVEL_RANK = { veto: 0, caution: 1, clean: 2, unknown: 3 };
const signed = (v) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`);

function FlagCell({ flag, k }) {
  if (!flag) return <td className="px-3 py-2 text-slate-600">—</td>;
  const on = flag.on;
  const counted = k !== "SHORT";
  return (
    <td className="px-3 py-2 whitespace-nowrap" title={FLAG_LABELS[k].he}>
      <span
        className={`inline-block w-2 h-2 rounded-full mr-1.5 align-middle ${
          on == null ? "bg-slate-700" : on ? (counted ? "bg-red-500" : "bg-amber-500") : "bg-emerald-700"
        }`}
      />
      <span className={`text-xs font-mono-nums ${on ? "text-slate-100" : "text-slate-500"}`}>
        {fmtFlagValue(k, flag.value)}
      </span>
    </td>
  );
}

function FlagTable({ rows, onOpen }) {
  return (
    <div className="overflow-x-auto scrollbar-thin rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-950">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Ticker</th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Verdict</th>
            {FLAG_ORDER.map((k) => (
              <th key={k} title={FLAG_LABELS[k].he}
                className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">
                {FLAG_LABELS[k].en}{k === "SHORT" ? " (info)" : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map(([t, rf]) => {
            const lvl = LEVELS[rf.level] ?? LEVELS.unknown;
            return (
              <tr key={t} className="bg-slate-900 hover:bg-slate-800/60">
                <td className="px-3 py-2">
                  <button onClick={() => onOpen(t)} className="text-left group cursor-pointer" title="Open TradingView chart">
                    <div className="font-bold font-mono-nums text-slate-100 group-hover:text-emerald-400">{t}</div>
                    <div className="text-[10px] text-slate-500 max-w-[160px] truncate">{rf.companyName}</div>
                  </button>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${lvl.cls}`}>
                    <Flag className="w-3 h-3" />{lvl.label} {rf.level !== "unknown" && `${rf.count}/4`}
                  </span>
                </td>
                {FLAG_ORDER.map((k) => <FlagCell key={k} k={k} flag={rf.flags?.[k]} />)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value, sub, tone = "text-slate-100" }) {
  return (
    <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold font-mono-nums ${tone}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export default function RedFlagsPage() {
  const [chart, setChart] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const all = useMemo(
    () => Object.entries(screenTickers).sort((a, b) =>
      LEVEL_RANK[a[1].level] - LEVEL_RANK[b[1].level] || b[1].count - a[1].count || a[0].localeCompare(b[0])),
    [],
  );
  const pick = (list) => list.map((t) => [t, screenTickers[t]]).filter(([, rf]) => rf);
  const watch = pick(screenGroups.watch ?? []);
  const flagged = all.filter(([, rf]) => rf.level === "veto" || rf.level === "caution");
  const counts = all.reduce((m, [, rf]) => ({ ...m, [rf.level]: (m[rf.level] ?? 0) + 1 }), {});

  return (
    <PageShell title="Red Flags" subtitle={`negative screen · ${all.length} stocks · updated ${screenMeta.asOf}`}>
      <div className="mb-6 p-4 bg-slate-800 border border-slate-700 rounded-xl" dir="rtl">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-sm text-slate-300 space-y-2 leading-relaxed">
            <p>
              <strong className="text-slate-100">מסנן שלילה, לא איתות קנייה.</strong> הוא לא אומר מה לקנות. הוא מסמן
              מניות שהממוצע עובד נגדן.
            </p>
            <p>
              <strong className="text-slate-100">הבדיקה (22.9.2026, 480 מניות פריצה):</strong> מניות עם 3 דגלים ומעלה
              ירדו בחציון 18% ופיגרו אחרי SPY בכ-24 נקודות. אף אחת מ-23 המניות שזינקו ביותר מ-50% לא הגיעה ל-3
              דגלים. <strong className="text-slate-100">שני דגלים לא הבחינו</strong> - לכן הם רק הערת זהירות.
            </p>
            <p className="text-slate-400">
              שורט מוצג כמידע ולא נספר, כי אין עליו נתונים היסטוריים לבדיקה. הבדיקה כיסתה תקופה אחת, אביב-קיץ 2026 -
              ולכן כל מניה נמדדת מעכשיו קדימה מול SPY.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4 mb-6">
        <Stat label="Odds against (3+)" value={counts.veto ?? 0} tone="text-red-400" sub={`of ${all.length} screened`} />
        <Stat label="Caution (2)" value={counts.caution ?? 0} tone="text-amber-300" />
        <Stat label="Veto since tracking" value={signed(screenTracked.veto?.avgExcess)}
          sub={`vs SPY · n=${screenTracked.veto?.n ?? 0}`} tone="text-slate-100" />
        <Stat label="Clean since tracking" value={signed(screenTracked.clean?.avgExcess)}
          sub={`vs SPY · since ${screenMeta.trackingSince}`} />
      </div>

      <h2 className="text-sm font-semibold text-slate-300 mb-2">My list</h2>
      <div className="mb-6"><FlagTable rows={watch} onOpen={setChart} /></div>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-300">
          {showAll ? "All screened stocks" : "Flagged in the screener lists"}
        </h2>
        <button onClick={() => setShowAll(!showAll)} className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer">
          {showAll ? "Show flagged only" : `Show all ${all.length}`}
        </button>
      </div>
      <FlagTable rows={showAll ? all : flagged} onOpen={setChart} />

      <TradingViewModal ticker={chart} onClose={() => setChart(null)} />
    </PageShell>
  );
}
