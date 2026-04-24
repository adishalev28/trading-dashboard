#!/usr/bin/env node
import { execSync } from "node:child_process";

const STAGE2_MIN_RS = 70;
const STAGE2_MAX_52W_DIST = 25;

function isStage2(t) {
  if (!t) return false;
  const { price, sma150, sma200, rsScore, weekHighDistance } = t;
  return (
    price > sma150 &&
    sma150 > sma200 &&
    rsScore >= STAGE2_MIN_RS &&
    weekHighDistance <= STAGE2_MAX_52W_DIST
  );
}

function findPotentialBreakouts(tickers, maxDistPct = 2) {
  return tickers
    .filter((t) => {
      if (!isStage2(t)) return false;
      if (t.rsScore < 80) return false;
      const d = t.distToPivotPct ?? 100;
      return d <= maxDistPct;
    })
    .sort((a, b) => (a.distToPivotPct ?? 100) - (b.distToPivotPct ?? 100));
}

// Latest commit per day (from origin/main, including 2026-04-24)
const commits = [
  ["2026-04-24", "07147d0"],
  ["2026-04-23", "506790d"],
  ["2026-04-22", "0eeb7e2"],
  ["2026-04-21", "c8dcb76"],
  ["2026-04-20", "66d51d3"],
  ["2026-04-19", "8594710"],
  ["2026-04-18", "b0cbf09"],
  ["2026-04-17", "3e1e322"],
];

const dayTops = [];          // [{date, top3: [{ticker, price, pivot, dist, rs, sector}]}]
const adiTimeline = [];      // when ADI/ADEA appear anywhere in candidates
const topTickerAppearances = new Map(); // ticker -> count in top-3

for (const [date, sha] of commits) {
  let raw;
  try {
    raw = execSync(`git show ${sha}:src/lib/mockData.json`, {
      cwd: "C:/Projects/trading-dashboard",
      maxBuffer: 100 * 1024 * 1024,
      encoding: "utf8",
    });
  } catch (e) {
    console.error(`skip ${date} ${sha}: ${e.message}`);
    continue;
  }
  const json = JSON.parse(raw);
  const tickers = json.tickers ?? [];
  const all = findPotentialBreakouts(tickers);
  const top3 = all.slice(0, 3);
  dayTops.push({ date, sha, total: tickers.length, nCands: all.length, top3 });

  for (const t of top3) {
    const prev = topTickerAppearances.get(t.ticker) ?? [];
    prev.push(date);
    topTickerAppearances.set(t.ticker, prev);
  }

  // Track ADI / ADEA / AADI wherever they appear in the candidates list
  for (const target of ["ADI", "ADEA", "AADI"]) {
    const found = all.find((t) => t.ticker === target);
    if (found) {
      const rank = all.indexOf(found) + 1;
      adiTimeline.push({
        date,
        ticker: target,
        rank,
        price: found.price,
        pivot: found.pivotPrice,
        dist: found.distToPivotPct,
        rs: found.rsScore,
        inTop3: rank <= 3,
      });
    }
  }
}

console.log("\n=== TOP-3 Breakouts per day (verified from git history) ===");
for (const d of dayTops) {
  console.log(`\n${d.date}  (${d.total} tickers, ${d.nCands} candidates)`);
  for (const t of d.top3) {
    console.log(
      `  ${t.ticker.padEnd(6)} ${(t.companyName ?? "").padEnd(30).slice(0, 30)}  $${(t.price ?? 0).toFixed(2).padStart(8)}  pivot $${(t.pivotPrice ?? 0).toFixed(2).padStart(8)}  dist ${(t.distToPivotPct ?? 0).toFixed(2)}%  RS ${t.rsScore}`
    );
  }
}

console.log("\n=== ADI / ADEA / AADI timeline (in candidates, any rank) ===");
for (const x of adiTimeline) {
  console.log(
    `  ${x.date}  ${x.ticker.padEnd(5)}  rank ${String(x.rank).padStart(3)}  price $${x.price.toFixed(2)}  pivot $${x.pivot.toFixed(2)}  dist ${x.dist.toFixed(2)}%  RS ${x.rs}  ${x.inTop3 ? "★ TOP-3" : ""}`
  );
}

console.log("\n=== Unique tickers that appeared in top-3 breakouts ===");
const rows = [...topTickerAppearances.entries()].sort(
  (a, b) => b[1].length - a[1].length
);
for (const [tk, dates] of rows) {
  console.log(`  ${tk.padEnd(6)}  ${dates.length}x   (${dates.join(", ")})`);
}
