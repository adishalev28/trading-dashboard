"use client";

import { Download } from "lucide-react";

/**
 * Export portfolio positions to CSV file
 * Includes: Ticker, Entry Date, Entry Price, Current Price, Shares, Stop Loss,
 *           P&L ($), P&L (%), R-Multiple, Reason, Sector
 */
export default function ExportCSV({ positions, tickers, label = "Download CSV" }) {
  if (!positions || positions.length === 0) return null;

  const tickerMap = {};
  for (const t of tickers || []) tickerMap[t.ticker] = t;

  const handleExport = () => {
    const headers = [
      "Ticker", "Entry Date", "Entry Price", "Current Price", "Shares",
      "Stop Loss", "P&L ($)", "P&L (%)", "R-Multiple", "Reason", "Sector"
    ];

    const rows = positions.map(pos => {
      const live = tickerMap[pos.ticker];
      const currentPrice = live?.price ?? pos.entryPrice;
      const pnl = (currentPrice - pos.entryPrice) * pos.shares;
      const pnlPct = pos.entryPrice > 0 ? ((currentPrice - pos.entryPrice) / pos.entryPrice * 100) : 0;
      const risk = pos.entryPrice - pos.stopLoss;
      const rMultiple = risk > 0 ? (currentPrice - pos.entryPrice) / risk : 0;

      return [
        pos.ticker,
        pos.entryDate || "",
        pos.entryPrice.toFixed(2),
        currentPrice.toFixed(2),
        pos.shares,
        pos.stopLoss.toFixed(2),
        pnl.toFixed(2),
        pnlPct.toFixed(2),
        rMultiple.toFixed(2),
        `"${(pos.reason || "").replace(/"/g, '""')}"`,
        live?.sector || "",
      ];
    });

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }); // BOM for Excel Hebrew
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `portfolio_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors border border-slate-700 hover:border-emerald-700 px-3 py-1.5 rounded-lg"
    >
      <Download className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
