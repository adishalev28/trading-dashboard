"use client";

import { computeMarketBreadth, COMPONENT_AVAILABLE, COMPONENT_COLLECTING } from "@/lib/marketBreadth";
import { CheckCircle2, AlertTriangle, XCircle, Clock, TrendingUp, Activity, Zap } from "lucide-react";

const ICON_BY_POINTS = {
  pos: { Icon: CheckCircle2, classes: "text-emerald-400" },
  zero: { Icon: AlertTriangle, classes: "text-amber-400" },
  neg: { Icon: XCircle, classes: "text-rose-400" },
  collecting: { Icon: Clock, classes: "text-slate-500" },
};

function bucketFor(component) {
  if (component.status === COMPONENT_COLLECTING) return ICON_BY_POINTS.collecting;
  if (component.points > 0) return ICON_BY_POINTS.pos;
  if (component.points < 0) return ICON_BY_POINTS.neg;
  return ICON_BY_POINTS.zero;
}

function ComponentRow({ name, hint, component, ComponentIcon }) {
  const { Icon, classes } = bucketFor(component);
  return (
    <div className="flex items-start gap-3 py-2">
      <div className={`mt-0.5 ${classes}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <ComponentIcon className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">{name}</span>
        </div>
        <div className="text-sm text-slate-200 mt-0.5">{component.label}</div>
        {hint && component.status === COMPONENT_COLLECTING && (
          <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>
        )}
      </div>
    </div>
  );
}

export default function MarketBreadthLight({ breadth }) {
  const result = computeMarketBreadth(breadth);
  const { level, meta, components } = result;
  const { indexTrend, stage2Density, breakoutHealth } = components;
  const c = meta.classes;

  const indexHint = indexTrend.spy && indexTrend.qqq
    ? `SPY $${indexTrend.spy.price} (SMA50 $${indexTrend.spy.sma50}) · QQQ $${indexTrend.qqq.price} (SMA50 $${indexTrend.qqq.sma50})`
    : null;

  return (
    <div className={`relative border-2 rounded-2xl p-5 mb-6 ${c.container}`}>
      <div className="flex items-start gap-5">
        {/* Traffic light circle */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <div
            className={`w-20 h-20 rounded-full ring-4 ring-offset-4 ring-offset-slate-900 ${c.ring} ${c.circle} flex items-center justify-center`}
            aria-label={meta.label}
          >
            <Zap className="w-10 h-10 text-white/95 drop-shadow" />
          </div>
          <div className={`mt-2 text-[10px] font-extrabold tracking-wider ${c.text}`}>
            {meta.label}
          </div>
        </div>

        {/* Headline + advice */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Market Breadth · Go/No-Go Gauge
            </span>
            {result.asOf && (
              <span className="text-[10px] text-slate-500">· as of {result.asOf}</span>
            )}
          </div>
          <h2 className={`text-2xl font-extrabold leading-tight ${c.text}`}>
            {meta.headline}
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            {meta.advice}
          </p>
          <p className={`text-sm mt-1 ${c.mutedText}`} dir="rtl">
            {meta.advice_he}
          </p>
        </div>
      </div>

      {/* Component breakdown */}
      <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1">
        <ComponentRow
          name="Index Trend"
          ComponentIcon={TrendingUp}
          component={{ ...indexTrend, label: indexHint ? `${indexTrend.label} · ${indexHint}` : indexTrend.label }}
        />
        <ComponentRow
          name="Stage 2 Density"
          ComponentIcon={Activity}
          hint={stage2Density.current != null ? `Currently ${stage2Density.current} qualified` : null}
          component={stage2Density}
        />
        <ComponentRow
          name="Breakout Health"
          ComponentIcon={Zap}
          hint={breakoutHealth.current != null ? `Currently ${breakoutHealth.current} actionable` : null}
          component={breakoutHealth}
        />
      </div>
    </div>
  );
}
