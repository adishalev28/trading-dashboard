# Momentum portfolio + index trend filter - pre-registered test (13.9.2026)

Written BEFORE any result was seen. Rules below are not to be tuned after the run.

## Data
- Universe: current S&P 500 constituents (Wikipedia, 13.9.2026). Survivorship-biased upward.
- Daily adjusted closes (dividends reinvested) from yfinance, 2013-01-01 to 2026-09-11.
- Cash = `BIL` (1-3 month T-bills).
- Signals from 2014-01 (needs 12 months of history).

## Variants (exactly five)
| id | rule |
|---|---|
| M1 | 12-1 momentum (return from t-252 to t-21 trading days), top 20, equal weight at entry, **monthly** |
| M2 | same as M1, **quarterly** (Mar/Jun/Sep/Dec) |
| M3 | M1, but only invested when `SPY` close > its SMA200 at the signal date; otherwise all in `BIL` |
| T1 | `SPY` when `SPY` > SMA200 at month-end, otherwise `BIL` |
| T2 | `QQQ` when `QQQ` > SMA200 at month-end, otherwise `BIL` |

Signal on the last trading day of the period, executed at the **next trading day's close**.
Rebalance = sell names that left the top 20, split the proceeds equally across new names.
Continuing holdings are not trimmed (fewer trades, fewer taxable events).

## Benchmarks
- `SPY` buy and hold, `QQQ` buy and hold.
- **EW-500**: equal weight of the same current constituents, rebalanced yearly. Carries the same
  survivorship bias as M1-M3, so M1-M3 vs EW-500 isolates the momentum effect from the bias.

## Costs and Israeli tax
- Starting capital $30,000. $8 commission per trade (buy or sell).
- 25% tax on net realized gains per calendar year, losses carried forward, paid from the portfolio at year end.
- End value reported both before tax and **after liquidation tax** on unrealized gains (applied to every
  strategy and benchmark alike, so buy and hold is not flattered by deferral).
- Simplifications: nominal USD gains (Israeli tax is on real ILS gains), no dividend withholding, no FX spread.

## Periods
Full 2014-01 → 2026-09-11. Also reported: 2014-2020 and 2021-2026 separately.

## Pass bars (decided now)
- **Momentum (M1-M3):** after-tax CAGR ≥ `SPY` + 2 pts/yr in the full period AND in both sub-periods,
  max drawdown not deeper than `SPY`'s, AND beats EW-500 (otherwise it is survivorship, not momentum).
- **Trend (T1, T2):** max drawdown at least one third shallower than its own buy and hold, and after-tax CAGR
  no more than 2 pts/yr below it.
- A pass is only a first sign (survivorship). A fail is final.

## Amendment after the first run (data only, no rule change)
The first run on current constituents gave M1 +25%/yr after tax - implausible. Its 2024 top-20 was full of
names that joined the index only *because* they later soared. Replaced the universe with **point-in-time
S&P 500 membership** (`fja05680/sp500`, snapshots to 18.8.2026) and re-downloaded prices for every member
since 2013. 161 former members have no Yahoo data (mostly acquired); price coverage of members averages 88%
(min 77% in Jan 2014). Rules, variants and bars unchanged. First-run output kept as `*_current_members.csv`.
Results: `RESULTS.md`.
