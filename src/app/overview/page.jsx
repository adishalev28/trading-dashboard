import PageShell from "@/components/PageShell";
import SectorHeatmap from "@/components/SectorHeatmap";
import Stage2Table from "@/components/Stage2Table";
import SystemHealth from "@/components/SystemHealth";
import mockData from "@/lib/mockData.json";
import { isStage2, sortSectors, sortTickers } from "@/lib/screener";
import { Trophy, Target, Flame, Activity, Crown, TrendingUp } from "lucide-react";

function StatCard({ label, value, sub, Icon, tone = "emerald", badge }) {
  const toneClasses = {
    emerald: "text-emerald-400 bg-emerald-950/40 border-emerald-900",
    amber:   "text-amber-400 bg-amber-950/40 border-amber-900",
    rose:    "text-rose-400 bg-rose-950/40 border-rose-900",
    slate:   "text-slate-300 bg-slate-800 border-slate-700",
  };
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${toneClasses[tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-100 font-mono-nums">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      {badge && (
        <div className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.classes}`}>
          {badge.text}
        </div>
      )}
    </div>
  );
}

export default function OverviewPage() {
  const { sectors, tickers, benchmark } = mockData;

  // Compute summary stats
  const topSector = sortSectors(sectors, "strengthScore", "desc")[0];
  const stage2Count = tickers.filter(isStage2).length;
  const strongest = sortTickers(tickers, "rsScore", "desc")[0];
  const avgBreadth =
    sectors.reduce((sum, s) => sum + s.changePct, 0) / sectors.length;

  // NEW: Top ticker within the leading sector
  const sectorLeaderTickers = tickers
    .filter(t => t.sector === topSector.name)
    .sort((a, b) => b.rsScore - a.rsScore);
  const sectorLeader = sectorLeaderTickers[0];

  // NEW: SPY market context
  const spyBullish = benchmark?.aboveSma200 ?? false;

  const now = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <PageShell
      title="Overview"
      subtitle={`Market snapshot - ${now}`}
    >
      {/* 5 summary cards (was 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <StatCard
          label="Top Sector"
          value={topSector.symbol}
          sub={`${topSector.name} - Strength ${topSector.strengthScore}`}
          Icon={Trophy}
          tone="emerald"
        />
        <StatCard
          label="Stage 2 Count"
          value={`${stage2Count}/${tickers.length}`}
          sub="Tickers meeting all criteria"
          Icon={Target}
          tone="emerald"
        />
        <StatCard
          label="Strongest Ticker (Overall)"
          value={strongest.ticker}
          sub={`RS ${strongest.rsScore} - ${strongest.sector}`}
          Icon={Flame}
          tone="emerald"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* NEW: Sector Leader */}
        {sectorLeader && (
          <StatCard
            label={`Top in ${topSector.symbol} (${topSector.name})`}
            value={sectorLeader.ticker}
            sub={`RS ${sectorLeader.rsScore} - Pivot ${sectorLeader.distToPivotPct != null ? sectorLeader.distToPivotPct.toFixed(1) + '% away' : '?'}`}
            Icon={Crown}
            tone="amber"
          />
        )}

        {/* Market Breadth + SPY Context */}
        <StatCard
          label="Market Breadth"
          value={`${avgBreadth >= 0 ? "+" : ""}${avgBreadth.toFixed(2)}%`}
          sub="Avg sector change"
          Icon={Activity}
          tone={avgBreadth >= 0 ? "emerald" : "rose"}
          badge={{
            text: spyBullish
              ? `SPY $${benchmark?.price ?? '?'} - BULLISH (above SMA200)`
              : `SPY $${benchmark?.price ?? '?'} - BEARISH (below SMA200)`,
            classes: spyBullish
              ? "bg-emerald-950 text-emerald-400 border-emerald-800"
              : "bg-rose-950 text-rose-400 border-rose-800",
          }}
        />

        {/* NEW: SPY Market Context card */}
        <StatCard
          label="S&P 500 (SPY)"
          value={`$${benchmark?.price ?? '?'}`}
          sub={`SMA200: $${benchmark?.sma200 ?? '?'} - SMA50: $${benchmark?.sma50 ?? '?'}`}
          Icon={TrendingUp}
          tone={spyBullish ? "emerald" : "rose"}
          badge={{
            text: spyBullish ? "BULLISH TREND" : "BEARISH TREND",
            classes: spyBullish
              ? "bg-emerald-950 text-emerald-400 border-emerald-800"
              : "bg-rose-950 text-rose-400 border-rose-800",
          }}
        />
      </div>

      {/* System Health Checklist */}
      <div className="mb-8">
        <SystemHealth benchmark={benchmark} sectors={sectors} tickers={tickers} />
      </div>

      {/* ALL 11 sectors (was top 6) */}
      <section className="mb-10">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4">
          All 11 Sectors - S&P 500 Rotation
        </h2>
        <SectorHeatmap sectors={sortSectors(sectors, "strengthScore", "desc")} />
      </section>

      {/* Top watchlist */}
      <section>
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4">
          Top 5 Picks by RS Score
        </h2>
        <Stage2Table tickers={tickers} limit={5} />
      </section>
    </PageShell>
  );
}
