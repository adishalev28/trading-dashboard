import { ShieldCheck, AlertTriangle, XOctagon, Ban } from "lucide-react";
import { fmtPct } from "@/lib/formatters";

/**
 * Traffic-light banner for round-trip commission as % of position
 * - SAFE    (< 0.5%)  → green — Minervini's ideal
 * - CAUTION (0.5–1%)  → amber — position size borderline
 * - DANGER  (> 1%)    → red   — position too small, skip or scale up
 * - INVALID           → slate — input errors
 */
export default function CommissionWarning({ level, commissionPct, invalidReason }) {
  if (level === "INVALID") {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-700 bg-slate-800/50">
        <Ban className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-slate-300">INVALID INPUT</div>
          <div className="text-sm text-slate-400 mt-0.5">{invalidReason}</div>
        </div>
      </div>
    );
  }

  const configs = {
    SAFE: {
      bg: "bg-emerald-950/60",
      border: "border-emerald-700",
      text: "text-emerald-300",
      titleText: "text-emerald-400",
      Icon: ShieldCheck,
      title: "SAFE",
      message: "Commission well within Minervini's 0.5% rule of thumb. Position size is efficient.",
    },
    CAUTION: {
      bg: "bg-amber-950/60",
      border: "border-amber-700",
      text: "text-amber-300",
      titleText: "text-amber-400",
      Icon: AlertTriangle,
      title: "CAUTION",
      message: "Round-trip commission above 0.5% of position. Consider increasing position size for better efficiency.",
    },
    DANGER: {
      bg: "bg-rose-950/60",
      border: "border-rose-700",
      text: "text-rose-300",
      titleText: "text-rose-400",
      Icon: XOctagon,
      title: "DANGER",
      message: "Position too small — commission eats >1% of capital. Skip this trade or scale up your position size.",
    },
  };

  const cfg = configs[level] || configs.DANGER;
  const Icon = cfg.Icon;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.bg} ${cfg.border}`}>
      <Icon className={`w-5 h-5 ${cfg.titleText} shrink-0 mt-0.5`} />
      <div className="flex-1">
        <div className="flex items-baseline gap-3">
          <span className={`font-bold ${cfg.titleText}`}>{cfg.title}</span>
          <span className={`text-sm font-mono-nums ${cfg.text}`}>
            Commission: {fmtPct(commissionPct, 2)}
          </span>
        </div>
        <div className={`text-sm mt-1 ${cfg.text}`}>{cfg.message}</div>
      </div>
    </div>
  );
}
