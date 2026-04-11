"use client";

import { RotateCcw } from "lucide-react";
import useRiskCalc from "@/hooks/useRiskCalc";
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

          {/* Formula explainer */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="text-[10px] text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-400">Formula:</span> shares = floor( (equity × risk%) ÷ FX ÷ (entry − stop) ) &nbsp;·&nbsp;
              commission % = (${fmtNum(state.commissionRoundTripUsd)} round-trip) ÷ position value × 100
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
