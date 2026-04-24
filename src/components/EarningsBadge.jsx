"use client";

import { CalendarClock } from "lucide-react";

/**
 * Earnings Calendar Badge — red flag before quarterly reports.
 *
 * Minervini's iron rule: never enter a new position 2-3 trading days
 * before earnings. This badge makes the upcoming report impossible to miss.
 *
 * Computes days-until at render time so the badge ages automatically
 * between data refreshes.
 */

function daysUntil(isoDate) {
  if (!isoDate) return null;
  const target = new Date(isoDate + "T00:00:00Z");
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const ms = target.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function EarningsBadge({ earningsDate, compact = false }) {
  const days = daysUntil(earningsDate);
  if (days == null || days < 0 || days > 14) return null;

  const isUrgent = days <= 3;
  const isWarning = days > 3 && days <= 7;

  const tone = isUrgent
    ? "bg-rose-950 text-rose-300 border-rose-700"
    : isWarning
    ? "bg-amber-950 text-amber-300 border-amber-700"
    : "bg-sky-950 text-sky-300 border-sky-800";

  const label =
    days === 0
      ? "Earnings today"
      : days === 1
      ? "Earnings tomorrow"
      : `Earnings in ${days}d`;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wide ${tone}`}
        title={`${label} — ${earningsDate}`}
      >
        <CalendarClock className="w-2.5 h-2.5" />
        {days}d
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${tone}`}
      title={`${label} — ${earningsDate}`}
    >
      <CalendarClock className="w-3 h-3" />
      {label}
    </span>
  );
}
