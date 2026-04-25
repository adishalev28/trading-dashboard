"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

const STOP_LOSS_PCT = 7; // Minervini's max-loss rule

export default function AddPositionForm({ onAdd, tickers = [] }) {
  const [open, setOpen] = useState(false);
  const [ticker, setTicker] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [shares, setShares] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function reset() {
    setTicker("");
    setEntryPrice("");
    setShares("");
    setStopLoss("");
    setNotes("");
    setError("");
  }

  function suggestStopFromEntry(price) {
    const p = parseFloat(price);
    if (!Number.isFinite(p) || p <= 0) return "";
    return (p * (1 - STOP_LOSS_PCT / 100)).toFixed(2);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const t = ticker.trim().toUpperCase();
    const p = parseFloat(entryPrice);
    const q = parseInt(shares, 10);
    let s = stopLoss.trim() ? parseFloat(stopLoss) : (p * (1 - STOP_LOSS_PCT / 100));

    if (!t) return setError("Ticker is required");
    if (!Number.isFinite(p) || p <= 0) return setError("Entry price must be positive");
    if (!Number.isInteger(q) || q <= 0) return setError("Shares must be a positive integer");
    if (!Number.isFinite(s) || s <= 0 || s >= p) return setError("Stop loss must be below entry price");

    onAdd({
      ticker: t,
      entryPrice: p,
      shares: q,
      stopLoss: Math.round(s * 100) / 100,
      notes: notes.trim(),
    });

    reset();
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Position
      </button>
    );
  }

  // Live preview: known ticker?
  const liveMatch = tickers.find(t => t.ticker === ticker.trim().toUpperCase());
  const livePrice = liveMatch?.price;

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 p-4 bg-slate-800 border border-emerald-800 rounded-xl space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wide">Add Position</h3>
        <button
          type="button"
          onClick={() => { reset(); setOpen(false); }}
          className="text-slate-500 hover:text-slate-200"
          aria-label="Close form"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wide">Ticker</label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="AAPL"
            autoFocus
            className="w-full mt-1 px-3 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-lg text-slate-200 font-mono uppercase focus:border-emerald-500 focus:outline-none"
          />
          {liveMatch && (
            <div className="text-[10px] text-emerald-400 mt-0.5">
              Live: ${livePrice} · {liveMatch.companyName ?? ""}
            </div>
          )}
        </div>

        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wide">Entry Price ($)</label>
          <input
            type="number"
            step="0.01"
            value={entryPrice}
            onChange={(e) => {
              setEntryPrice(e.target.value);
              if (!stopLoss) setStopLoss(suggestStopFromEntry(e.target.value));
            }}
            placeholder="150.25"
            className="w-full mt-1 px-3 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-lg text-slate-200 font-mono focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wide">Shares</label>
          <input
            type="number"
            step="1"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="50"
            className="w-full mt-1 px-3 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-lg text-slate-200 font-mono focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wide">
            Stop Loss ($) <span className="text-slate-600 normal-case">— default −7%</span>
          </label>
          <input
            type="number"
            step="0.01"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            placeholder={entryPrice ? suggestStopFromEntry(entryPrice) : "auto"}
            className="w-full mt-1 px-3 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-lg text-slate-200 font-mono focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-slate-500 uppercase tracking-wide">Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. VCP breakout, earnings 2 weeks out"
          className="w-full mt-1 px-3 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {error && (
        <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800 rounded px-2 py-1">
          {error}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => { reset(); setOpen(false); }}
          className="px-4 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors"
        >
          Add to Portfolio
        </button>
      </div>
    </form>
  );
}
