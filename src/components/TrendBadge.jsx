import { TrendingUp, AlertTriangle, TrendingDown } from "lucide-react";
import { trendClassification } from "@/lib/screener";

/**
 * Display SMA 150/200 trend classification
 * - stage2: Price > SMA150 > SMA200 (green, "Stage 2")
 * - warning: Price > SMA200 only (amber, "Warning")
 * - avoid: Price < SMA200 (red, "Avoid")
 */
export default function TrendBadge({ price, sma150, sma200 }) {
  const trend = trendClassification({ price, sma150, sma200 });

  const configs = {
    stage2: {
      label: "Stage 2",
      bg: "bg-emerald-950",
      text: "text-emerald-400",
      border: "border-emerald-800",
      Icon: TrendingUp,
    },
    warning: {
      label: "Warning",
      bg: "bg-amber-950",
      text: "text-amber-400",
      border: "border-amber-800",
      Icon: AlertTriangle,
    },
    avoid: {
      label: "Avoid",
      bg: "bg-rose-950",
      text: "text-rose-400",
      border: "border-rose-800",
      Icon: TrendingDown,
    },
  };

  const cfg = configs[trend];
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
