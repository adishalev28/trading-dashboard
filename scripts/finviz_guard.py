"""
Sanity checks for Finviz screener output.

finvizfinance 1.3.0 (July 2026) returned every ticker with its first letter
doubled (TSM -> TTSM). yfinance then found almost nothing, Stage 2 dropped from
~290 stocks to ~10, and the workflow still reported success for six weeks until
1.5.0 shipped a fix. These checks turn that kind of silent corruption into a
failed run, so GitHub emails instead of the dashboard quietly going stale.
"""

import statistics
import sys

ABSOLUTE_STAGE2_FLOOR = 25
STAGE2_CLIFF_FLOOR = 100
STAGE2_CLIFF_BASELINE = 200


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    sys.exit(1)


def check_tickers(tickers: list[str], source: str, min_count: int = 1) -> None:
    n = len(tickers)
    if n < min_count:
        fail(f"{source}: only {n} tickers returned (expected at least {min_count})")

    # Real tickers that start with a doubled letter (AAPL, LLY, EEFT) are a few
    # percent of the market. When nearly all of them do, parsing is broken.
    doubled = [t for t in tickers if len(t) >= 2 and t[0] == t[1]]
    if n >= 20 and len(doubled) / n > 0.3:
        fail(
            f"{source}: {len(doubled)}/{n} tickers start with a doubled letter "
            f"({', '.join(doubled[:5])}) - Finviz parsing is broken, check the finvizfinance version"
        )


def check_stage2(count: int, snapshots: list[dict]) -> None:
    """Fail when the Stage 2 population collapses the way it did in July 2026.

    Two separate traps, so a genuine bear market does not raise a false alarm:
      * an absolute floor - fewer than 25 Stage 2 stocks out of ~1,100 is data
        corruption, not a market.
      * a cliff - under 100 today while the last five runs averaged 200+ means
        the pipeline broke between yesterday and today.
    """
    if count < ABSOLUTE_STAGE2_FLOOR:
        fail(
            f"Stage 2 count is {count} (floor {ABSOLUTE_STAGE2_FLOOR}) - "
            f"the screener is broken, not the market"
        )

    prev = [s["stage2Count"] for s in snapshots[-6:-1] if s.get("stage2Count") is not None]
    if len(prev) >= 3:
        baseline = statistics.median(prev)
        if baseline >= STAGE2_CLIFF_BASELINE and count < STAGE2_CLIFF_FLOOR:
            fail(
                f"Stage 2 count dropped to {count} from a 5-run median of {baseline:.0f} - "
                f"suspected silent pipeline failure"
            )
