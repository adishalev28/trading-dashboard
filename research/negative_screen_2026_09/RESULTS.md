# Results (run 22.9.2026, prices to 21.9.2026)

## Run 1 - pre-registered bar: PASS on paper
258 stocks, first breakout appearance 25.4-24.5.2026.

| flags | n | median excess vs SPY | median return | up | lost 30%+ |
|---|---|---|---|---|---|
| 0 | 89 | -10.4% | -2.9% | 43% | 9 |
| 1 | 92 | -13.0% | -5.5% | 39% | 12 |
| 2 | 39 | -3.9% | +2.0% | 56% | 9 |
| 3+ | 38 | **-27.3%** | **-19.0%** | 21% | 12 |

2+ vs 0 gap -7.8 pts (bar ≤ -5 ✔), 2+ share 30% (✔), 3 of 4 flags right way (✔: DILUTION -8.4, ASSET_BLOAT -15.0,
LOTTO -8.6; LOSS +0.7 ✘). But not monotonic - the 2-flag group beat the 0-flag group - and the bootstrap
interval crossed zero. The effect sits entirely in 3+. → Amendment 1: confirm "3+" on unseen data.

## Run 2 - confirmation (25.5-14.7.2026): PASS
222 stocks with complete data. 3+ flags: n=25 (11%, bar ≤ 25% ✔), median excess **-21.6%** vs **-6.3%** for 0-1 flags,
gap **-15.4 pts** (bar ≤ -10 ✔). Bootstrap 90% interval -24.5..+3.4 (n=25, too few to be sure).
Individually again: DILUTION -8.7, ASSET_BLOAT -15.8, LOTTO -17.1, LOSS +0.5 (useless in both runs).

## Pooled
3+ flags: 63 stocks, median return -18.4%, excess -23.8%. 0-1 flags: 355 stocks, median -3.3%, excess -10.0%.
**Big winners (+50%) vetoed by 3+: 0 of 23.** 2 flags would have vetoed 6 of them (TWST, SNDK, TXG, ABCL, PLSE, DFTX),
mostly loss-making biotech/semis with high volatility - so 2 flags must not be a veto.

## Decision for the build
- Veto label only at **3+ of the 4 tested flags** (the confirmed rule, unchanged).
- 2 flags = caution note, no veto. LOSS stays visible but proved weak on its own.
- SHORT interest shown as information only - untested (no free history).
- Limits: two batches from one regime (spring-summer 2026, AI hardware rally), ~4 months of outcome.
  Keep measuring forward: every flagged stock is tracked against SPY from the day it is flagged.
