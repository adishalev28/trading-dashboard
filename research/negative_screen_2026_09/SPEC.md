# Negative screen (red flags) - pre-registered test (22.9.2026)

Written BEFORE any result was seen. Rules and pass bar are not to be tuned after the run.

## Question
Do stocks that carry research-based red flags *at the time they appeared* do worse than clean ones?
The screen is meant to veto bets, not to pick them.

## Sample
Every ticker whose first appearance in Potential Breakouts was 25.4.2026-24.5.2026 (258 with prices,
same sample as the 13.9.2026 buy-and-hold check). Entry = close on the day of first appearance.
Outcome = return from entry to the latest close, and the same minus `SPY` over the same days (excess).

## Flags - point-in-time
Fundamentals come from the latest **annual** statements whose fiscal year ended at least 75 days before
the entry date (10-K filing lag). yfinance keeps ~4 annual periods, enough for a year-over-year change.

| flag | fires when |
|---|---|
| DILUTION | shares outstanding up more than 10% vs the prior fiscal year |
| LOSS | operating income < 0, or free cash flow < 0, in that fiscal year |
| ASSET_BLOAT | total assets up more than 50% vs the prior fiscal year |
| LOTTO | beta vs `SPY` over the 252 trading days before entry > 2, or a single-day gain > 15% in the 21 days before entry |

SHORT interest is part of the proposed screen but has no free history, so it is **not tested** here.
A missing input leaves that flag unknown; unknowns are excluded from that flag's comparison and counted as
not fired in the flag total (reported separately).

## Pass bar (decided now)
1. Median excess return of stocks with **2+ flags** is at least **5 points below** stocks with **0 flags**.
2. At least **3 of the 4 flags** point the same way individually (flagged median below unflagged median).
3. The screen flags (2+ flags) between 15% and 50% of the sample - otherwise it is useless or too strict.
Also reported, not part of the bar: how many of the big winners (+50% or more) the screen would have vetoed.

## Amendment 1 - written after run 1, BEFORE run 2
Run 1 (25.4-24.5) passed the bar on paper, but not cleanly: the 2-flag group beat the 0-flag group,
the whole effect sat in the 3+ group, LOSS pointed the wrong way, and the bootstrap interval crossed zero.
"3+ flags" is therefore a post-hoc threshold and must be confirmed on data not yet looked at.

**Run 2 (confirmation):** tickers whose first Potential Breakouts appearance was 25.5.2026-14.7.2026
(stops before the silent screener failure of ~15.7-27.8). Same flags, same code, outcome to the latest close.
**Confirmation bar:** median excess return of the 3+ flag group at least **10 points below** the 0-1 flag group,
AND the 3+ group is no more than 25% of the sample. If it fails, the screen ships only as information
(no veto label), or not at all.

## Known limits
One month of entries, one market regime, heavily overlapping themes: the effective sample is far smaller
than 258. A pass is a first sign, a fail is informative. No short-interest history.
