"""
Sanity checks for Finviz screener output.

finvizfinance 1.3.0 (July 2026) returned every ticker with its first letter
doubled (TSM -> TTSM). yfinance then found almost nothing, Stage 2 dropped from
~290 stocks to ~10, and the workflow still reported success for six weeks until
1.5.0 shipped a fix. These checks turn that kind of silent corruption into a
failed run, so GitHub emails instead of the dashboard quietly going stale.
"""

import sys


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
