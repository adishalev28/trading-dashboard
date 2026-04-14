import { Flame, TrendingUp } from "lucide-react";

/**
 * Volume Surge indicator badge
 * - surge:  Vol > 150% avg on a green day — strong buying signal
 * - rising: Vol > 120% avg on a green day — early accumulation
 * - none:   returns null (no badge shown)
 */
export default function VolSurgeBadge({ status }) {
  if (!status || status === "none") return null;

  const configs = {
    surge: {
      label: "VOL SURGE",
      bg: "bg-rose-950",
      text: "text-rose-400",
      border: "border-rose-800",
      Icon: Flame,
    },
    rising: {
      label: "VOL RISING",
      bg: "bg-blue-950",
      text: "text-blue-400",
      border: "border-blue-800",
      Icon: TrendingUp,
    },
  };

  const cfg = configs[status];
  if (!cfg) return null;
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
