"use client";

import { useState } from "react";
import { RotateCcw, Save, Check } from "lucide-react";
import useRiskCalc from "@/hooks/useRiskCalc";
import usePortfolio from "@/hooks/usePortfolio";
import CommissionWarning from "./CommissionWarning";
import { fmtUsd, fmtIls, fmtPct, fmtNum } from "@/lib/formatters";

function InputField({ label, value, onChange, prefix, suffix, type = "number", step = "any" }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 font-mono-nums text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type={type}
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? 0 : parseFloat(v));
          }}
          className={`w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 ${
            prefix ? "pl-8" : "pl-3"
          } pr-3 text-slate-100 font-mono-nums focus:outline-none focus:border-emerald-600 transition-colors`}
        />
        {suffix && (
          <span className="absolute inset-y-0 right-3 flex items-center text-slate-500 font-mono-nums text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function ResultRow({ label, value, highlight = false }) {
  return (
    <div className={`flex items-baseline justify-between py-2 border-b border-slate-800 last:border-0 ${
      highlight ? "text-emerald-400" : "text-slate-300"
    }`}>
      <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
      <span className="font-mono-nums font-bold">{value}</span>
    </div>
  );
}

export default function RiskCalculator() {
  const { state, result, setField, reset } = useRiskCalc();
  const { addPosition } = usePortfolio();
  const [ticker, setTicker] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSaveToPortfolio = () => {
    if (!ticker.trim() || result.level === "INVALID" || result.shares <= 0) return;
    addPosition({
      ticker: ticker.trim().toUpperCase(),
      entryPrice: state.entryUsd,
      shares: result.shares,
      stopLoss: state.stopUsd,
      notes: `Risk ${state.riskPct}% | FX ${state.fxRate}`,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl">
      {/* Inputs card */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-100">Position Size Calculator</h2>
          <button
            onClick={reset}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ticker input for portfolio save */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
              Ticker Symbol (for portfolio)
            </label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="e.g. NVDA, META, AAPL..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-3 pr-3 text-slate-100 font-mono-nums uppercase focus:outline-none focus:border-emerald-600 transition-colors"
            />
          </div>

          <InputField
            label="Account Equity (ILS)"
            value={state.equityIls}
            onChange={(v) => setField("equityIls", v)}
            prefix="₪"
          />
          <InputField
            label="Risk Per Trade"
            value={state.riskPct}
            onChange={(v) => setField("riskPct", v)}
            suffix="%"
          />
          <InputField
            label="Entry Price (USD)"
            value={state.entryUsd}
            onChange={(v) => setField("entryUsd", v)}
            prefix="$"
          />
          <InputField
            label="Stop Loss (USD)"
            value={state.stopUsd}
            onChange={(v) => setField("stopUsd", v)}
            prefix="$"
          />
          <InputField
            label="FX Rate (USD → ILS)"
            value={state.fxRate}
            onChange={(v) => setField("fxRate", v)}
          />
          <InputField
            label="Commission Round-Trip"
            value={state.commissionRoundTripUsd}
            onChange={(v) => setField("commissionRoundTripUsd", v)}
            prefix="$"
          />
        </div>
      </div>

      {/* Commission warning banner */}
      <div className="mb-6">
        <CommissionWarning
          level={result.level}
          commissionPct={result.commissionPct}
          invalidReason={result.invalidReason}
        />
      </div>

      {/* Results card */}
      {result.level !== "INVALID" && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-bold text-slate-100 mb-4">Results</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column — Position */}
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Position
              </div>
              <ResultRow
                label="Shares to Buy"
                value={fmtNum(result.shares)}
                highlight={result.shares > 0}
              />
              <ResultRow
                label="Position Value USD"
                value={fmtUsd(result.positionValueUsd)}
              />
              <ResultRow
                label="Position Value ILS"
                value={fmtIls(result.positionValueIls)}
              />
            </div>

            {/* Right column — Risk */}
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Risk Exposure
              </div>
              <ResultRow
                label="Risk Per Share"
                value={fmtUsd(result.riskPerShareUsd)}
              />
              <ResultRow
                label="Risk Amount USD"
                value={fmtUsd(result.riskAmountUsd)}
              />
              <ResultRow
                label="Risk Amount ILS"
                value={fmtIls(result.riskAmountIls)}
              />
            </div>
          </div>

          {/* Save to Portfolio button */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-3">
            <button
              onClick={handleSaveToPortfolio}
              disabled={!ticker.trim() || result.shares <= 0 || saved}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
                saved
                  ? "bg-emerald-600 text-white"
                  : !ticker.trim() || result.shares <= 0
                  ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Saved to Portfolio!" : "Save to Portfolio"}
            </button>
            {!ticker.trim() && result.shares > 0 && (
              <span className="text-[10px] text-amber-400">Enter ticker symbol above to save</span>
            )}
          </div>

          {/* Formula explainer */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="text-[10px] text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-400">Formula:</span> shares = floor( (equity x risk%) / FX / (entry - stop) ) |
              commission % = (${fmtNum(state.commissionRoundTripUsd)} round-trip) / position value x 100
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
