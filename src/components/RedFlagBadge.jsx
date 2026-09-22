import { Flag } from "lucide-react";
import { getRedFlags, LEVELS, flagsTooltip } from "@/lib/redFlags";

/**
 * Compact red-flag badge. Renders a <span> (never a button) so it can sit inside
 * clickable rows. Shows nothing for clean stocks unless showClean is set.
 */
export default function RedFlagBadge({ ticker, showClean = false }) {
  const rf = getRedFlags(ticker);
  if (!rf) return null;
  if (!showClean && (rf.level === "clean" || rf.level === "unknown")) return null;
  const lvl = LEVELS[rf.level] ?? LEVELS.unknown;
  return (
    <span
      title={flagsTooltip(rf)}
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border ${lvl.cls}`}
    >
      <Flag className="w-3 h-3" />
      {rf.level === "veto" || rf.level === "caution" ? `${rf.count}/4` : lvl.label}
    </span>
  );
}
