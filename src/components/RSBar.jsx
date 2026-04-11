import { rsTier } from "@/lib/screener";

/**
 * Horizontal bar visualizing RS Score 0-100
 * - compact: inline 80px bar for table cells
 * - full: larger bar with number for cards
 */
export default function RSBar({ score, compact = false }) {
  const clampedScore = Math.max(0, Math.min(100, score ?? 0));
  const tier = rsTier(clampedScore);

  const barWidth = compact ? "80px" : "100%";
  const barHeight = compact ? "6px" : "8px";

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "w-full"}`}>
      <div
        style={{ width: barWidth, height: barHeight }}
        className="relative rounded-full overflow-hidden bg-slate-800"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${clampedScore}%`,
            background: "linear-gradient(90deg, #f43f5e 0%, #fbbf24 50%, #10b981 100%)",
          }}
        />
      </div>
      <span className="font-mono-nums text-xs font-bold text-slate-200 min-w-[2.5rem]">
        {clampedScore}
      </span>
      {!compact && (
        <span
          className={`text-xs font-bold ${
            tier.color === "emerald"
              ? "text-emerald-400"
              : tier.color === "amber"
              ? "text-amber-400"
              : "text-rose-400"
          }`}
        >
          {tier.label}
        </span>
      )}
    </div>
  );
}
