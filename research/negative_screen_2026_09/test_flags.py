"""Negative-screen test. Rules are fixed in SPEC.md - do not tune here."""
import json, os, pickle, sys, time, warnings
from datetime import date, timedelta
import numpy as np, pandas as pd, yfinance as yf

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
PERF = "C:/Projects/trading-dashboard/scripts/performance_data.json"
CACHE = os.path.join(HERE, "statements_cache.pkl")
START, END = (sys.argv[1], sys.argv[2]) if len(sys.argv) > 2 else ("2026-04-25", "2026-05-24")
TAG = sys.argv[3] if len(sys.argv) > 3 else "run1"
LAG_DAYS = 75

perf = json.load(open(PERF, encoding="utf-8"))["tickers"]
sample = []
for sym, v in perf.items():
    d = sorted(a["date"] for a in v["appearances"] if "breakout" in a["lists"])
    if d and START <= d[0] <= END:
        sample.append((sym, d[0]))
syms = [s for s, _ in sample]

px = yf.download(syms + ["SPY"], start="2024-12-01", end=str(date.today() + timedelta(days=1)),
                 auto_adjust=True, progress=False, threads=True)["Close"].dropna(how="all")
rets = px.pct_change()

cache = pickle.load(open(CACHE, "rb")) if os.path.exists(CACHE) else {}
for i, s in enumerate(syms):
    if s in cache:
        continue
    try:
        t = yf.Ticker(s)
        cache[s] = dict(bs=t.balance_sheet, inc=t.income_stmt, cf=t.cashflow)
    except Exception as e:
        cache[s] = dict(err=str(e))
    if i % 20 == 0:
        pickle.dump(cache, open(CACHE, "wb"))
        time.sleep(1)
pickle.dump(cache, open(CACHE, "wb"))


def row(df, names):
    for n in names:
        if df is not None and not df.empty and n in df.index:
            return df.loc[n]
    return None


def known_years(series, entry):
    """values of an annual series for fiscal years ended >= LAG_DAYS before entry, newest first"""
    if series is None:
        return []
    s = series.dropna()
    s = s[[pd.Timestamp(c) <= pd.Timestamp(entry) - pd.Timedelta(days=LAG_DAYS) for c in s.index]]
    return list(s.sort_index(ascending=False).values)


out = []
for s, entry in sample:
    if s not in px or px[s].dropna().empty:
        continue
    c = cache.get(s, {})
    bs, inc, cf = c.get("bs"), c.get("inc"), c.get("cf")
    sh = known_years(row(bs, ["Ordinary Shares Number", "Share Issued"]), entry)
    ta = known_years(row(bs, ["Total Assets"]), entry)
    oi = known_years(row(inc, ["Operating Income", "EBIT"]), entry)
    fcf = known_years(row(cf, ["Free Cash Flow"]), entry)
    f = {}
    f["DILUTION"] = (sh[0] / sh[1] - 1 > 0.10) if len(sh) >= 2 and sh[1] > 0 else None
    f["ASSET_BLOAT"] = (ta[0] / ta[1] - 1 > 0.50) if len(ta) >= 2 and ta[1] > 0 else None
    f["LOSS"] = ((oi[0] < 0) or (len(fcf) > 0 and fcf[0] < 0)) if oi else (fcf[0] < 0 if fcf else None)
    # price-based, strictly before entry
    t0 = px.index[px.index <= pd.Timestamp(entry)][-1]
    hist = rets.loc[:t0].iloc[:-1]
    r, m = hist[s].tail(252), hist["SPY"].tail(252)
    ok = r.notna() & m.notna()
    beta = np.cov(r[ok], m[ok])[0, 1] / np.var(m[ok]) if ok.sum() > 120 else None
    maxday = hist[s].tail(21).max()
    f["LOTTO"] = None if beta is None and np.isnan(maxday) else bool((beta or 0) > 2 or maxday > 0.15)
    p0 = px.at[t0, s]
    p1 = px[s].dropna().iloc[-1]
    spy = px["SPY"].dropna().iloc[-1] / px.at[t0, "SPY"] - 1
    ret = p1 / p0 - 1
    out.append(dict(sym=s, entry=entry, ret=ret, excess=ret - spy, beta=beta, maxday=maxday,
                    n_flags=sum(1 for v in f.values() if v), n_known=sum(1 for v in f.values() if v is not None), **f))

df = pd.DataFrame(out)
df.to_csv(os.path.join(HERE, f"flags_results_{TAG}.csv"), index=False)
print(f"n={len(df)}  last close {px.index[-1].date()}  coverage:",
      {k: int(df[k].notna().sum()) for k in ["DILUTION", "LOSS", "ASSET_BLOAT", "LOTTO"]})


def summ(g):
    return f"n={len(g):3d} median_excess={100*g.excess.median():+6.1f}  mean_excess={100*g.excess.mean():+6.1f}  " \
           f"median_ret={100*g.ret.median():+6.1f}  up={100*(g.ret>0).mean():3.0f}%  <=-30%={int((g.ret<=-.3).sum())}"


print("\nBY FLAG COUNT")
for k, g in df.groupby(df.n_flags.clip(upper=3)):
    print(f"  {k}{'+' if k == 3 else ' '} flags: {summ(g)}")
zero, two = df[df.n_flags == 0], df[df.n_flags >= 2]
gap = 100 * (two.excess.median() - zero.excess.median())
print(f"\n2+ vs 0 median excess gap: {gap:+.1f} pts   (bar: <= -5)")
print(f"share flagged 2+: {100*len(two)/len(df):.0f}%   (bar: 15-50%)")

print("\nEACH FLAG (flagged vs not, unknown excluded)")
agree = 0
for k in ["DILUTION", "LOSS", "ASSET_BLOAT", "LOTTO"]:
    a, b = df[df[k] == True], df[df[k] == False]
    d = 100 * (a.excess.median() - b.excess.median())
    agree += d < 0
    print(f"  {k:12s} flagged {summ(a)}\n  {'':12s} clean   {summ(b)}   diff {d:+.1f}")
print(f"flags pointing the right way: {agree}/4   (bar: >= 3)")

# bootstrap CI on the 2+ vs 0 gap (ignores cross-correlation, so too narrow)
rng = np.random.default_rng(0)
boots = [np.median(rng.choice(two.excess, len(two))) - np.median(rng.choice(zero.excess, len(zero))) for _ in range(5000)]
print(f"bootstrap 90% CI of gap: {100*np.percentile(boots,5):+.1f} .. {100*np.percentile(boots,95):+.1f} pts")

big = df[df.ret >= 0.5].sort_values("ret", ascending=False)
print(f"\nBIG WINNERS (+50%+): {len(big)}, vetoed by 2+ flags: {int((big.n_flags>=2).sum())}")
print(big[["sym", "ret", "n_flags", "DILUTION", "LOSS", "ASSET_BLOAT", "LOTTO"]].assign(ret=lambda d: (100*d.ret).round(0)).to_string(index=False))
worst = df.sort_values("ret").head(12)
print("\nWORST 12")
print(worst[["sym", "ret", "n_flags", "DILUTION", "LOSS", "ASSET_BLOAT", "LOTTO"]].assign(ret=lambda d: (100*d.ret).round(0)).to_string(index=False))
