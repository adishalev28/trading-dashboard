import PageShell from "@/components/PageShell";
import Stage2Table from "@/components/Stage2Table";
import mockData from "@/lib/mockData.json";
import { isStage2 } from "@/lib/screener";

export default function WatchlistPage() {
  const { tickers, meta } = mockData;
  const stage2Count = tickers.filter(isStage2).length;
  const scannedText = meta?.totalScanned
    ? `Scanned ${meta.totalScanned} stocks · `
    : "";

  return (
    <PageShell
      title="Watchlist"
      subtitle={`${scannedText}${tickers.length} passed filters · ${stage2Count} in Stage 2`}
    >
      <Stage2Table tickers={tickers} />

      {/* Legend */}
      <div className="mt-6 p-4 bg-slate-800/50 border border-slate-800 rounded-xl">
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-2 font-semibold">
          Stage 2 Criteria (Weinstein + Minervini)
        </div>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• Price above rising SMA 150 and SMA 200</li>
          <li>• RS Score ≥ 70 (IBD-style relative strength rank)</li>
          <li>• Within 25% of 52-week high</li>
          <li>• Ideally in a tight VCP (Volatility Contraction Pattern)</li>
        </ul>
      </div>
    </PageShell>
  );
}
