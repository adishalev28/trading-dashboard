import { Activity, Waves, Minus } from "lucide-react";

/**
 * Display VCP (Volatility Contraction Pattern) status
 * - tight: Classic tight VCP (Minervini ideal) — emerald
 * - loose: Wider base, still viable — amber
 * - none: No VCP detected — slate
 */
export default function VCPBadge({ status }) {
  const configs = {
    tight: {
      label: "VCP Tight",
      bg: "bg-emerald-950",
      text: "text-emerald-400",
      border: "border-emerald-800",
      Icon: Activity,
    },
    loose: {
      label: "VCP Loose",
      bg: "bg-amber-950",
      text: "text-amber-400",
      border: "border-amber-800",
      Icon: Waves,
    },
    none: {
      label: "No VCP",
      bg: "bg-slate-800",
      text: "text-slate-400",
      border: "border-slate-700",
      Icon: Minus,
    },
  };

  const cfg = configs[status] || configs.none;
  const Icon = cfg.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}
