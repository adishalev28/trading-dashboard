"""Momentum portfolio + index trend filter. Rules are fixed in SPEC.md - do not tune here."""
import io, json, os, sys, warnings
from datetime import date, timedelta
import numpy as np, pandas as pd, requests, yfinance as yf

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
PRICES = os.path.join(HERE, "prices_pit.pkl")
MEMBERS = os.path.join(HERE, "sp500_components_history.csv")
CAPITAL, FEE, TAX = 30_000.0, 8.0, 0.25
TOP_N, LOOKBACK, SKIP = 20, 252, 21


# ---------- data ----------
def load_prices():
    if os.path.exists(PRICES):
        return pd.read_pickle(PRICES)
    html = requests.get("https://en.wikipedia.org/wiki/List_of_S%26P_500_companies",
                        headers={"User-Agent": "Mozilla/5.0"}, timeout=30).text
    syms = pd.read_html(io.StringIO(html))[0]["Symbol"].str.replace(".", "-", regex=False).tolist()
    px = yf.download(syms + ["SPY", "QQQ", "BIL"], start="2013-01-01", end="2026-09-12",
                     auto_adjust=True, progress=False, threads=True)["Close"]
    px = px.dropna(how="all")
    px.to_pickle(PRICES)
    return px


# ---------- engine ----------
class Book:
    def __init__(self, costs):
        self.costs, self.cash, self.pos = costs, CAPITAL, {}   # pos: sym -> [shares, basis]
        self.realized, self.carry, self.trades, self.tax_paid = 0.0, 0.0, 0, 0.0

    def value(self, prices):
        return self.cash + sum(sh * prices[s] for s, (sh, _) in self.pos.items())

    def sell(self, s, prices, frac=1.0, fee=True):
        sh, basis = self.pos[s]
        q, b = sh * frac, basis * frac
        proceeds = q * prices[s]
        self.cash += proceeds - (FEE if self.costs and fee else 0)
        self.realized += proceeds - b
        self.trades += 1
        if frac >= 1.0:
            del self.pos[s]
        else:
            self.pos[s] = [sh - q, basis - b]

    def buy(self, s, prices, amount):
        if amount <= 0:
            return
        if self.costs:
            self.cash -= FEE
        q = amount / prices[s]
        sh, basis = self.pos.get(s, [0.0, 0.0])
        self.pos[s] = [sh + q, basis + amount]
        self.cash -= amount
        self.trades += 1

    def year_end_tax(self, prices):
        if not self.costs:
            return
        net = self.realized + self.carry
        self.realized = 0.0
        if net <= 0:
            self.carry = net
            return
        self.carry, tax = 0.0, TAX * net
        self.tax_paid += tax
        if self.cash < tax:   # sell pro rata to fund the tax
            need, total = tax - self.cash, self.value(prices) - self.cash
            frac = min(1.0, need / total) if total > 0 else 0
            for s in list(self.pos):
                self.sell(s, prices, frac, fee=False)
        self.cash -= tax

    def liquidation_value(self, prices):
        v = self.value(prices)
        if not self.costs:
            return v
        unreal = sum(sh * prices[s] - b for s, (sh, b) in self.pos.items())
        return v - TAX * max(0.0, unreal + self.realized + self.carry)

    def rebalance_to(self, targets, prices):
        """targets: set of symbols (equal weight for new entries). Continuing names are not trimmed."""
        for s in [s for s in self.pos if s not in targets]:
            self.sell(s, prices)
        new = [s for s in targets if s not in self.pos]
        if new:
            budget = self.cash - (FEE * len(new) if self.costs else 0)
            for s in new:
                self.buy(s, prices, budget / len(new))


_hist = pd.read_csv(MEMBERS)
_hist["date"] = pd.to_datetime(_hist["date"])
_hist = _hist.sort_values("date")
_snaps = [(d, {t.replace(".", "-") for t in s.split(",")}) for d, s in zip(_hist["date"], _hist["tickers"])]
COVERAGE = []


def members_at(d, columns):
    """Point-in-time S&P 500 members on date d that have price data (survivorship fix)."""
    snap = None
    for sd, s in _snaps:
        if sd <= d:
            snap = s
        else:
            break
    have = [t for t in snap if t in columns]
    COVERAGE.append((d, len(have) / len(snap)))
    return have


def period_ends(idx, freq):
    s = pd.Series(idx, index=idx)
    g = s.groupby([idx.year, idx.month]).last() if freq == "M" else \
        s[idx.month.isin([3, 6, 9, 12])].groupby([idx[idx.month.isin([3, 6, 9, 12])].year,
                                                    idx[idx.month.isin([3, 6, 9, 12])].month]).last()
    return set(g.values)


def run(px, stocks, kind, start, end, costs):
    ffill = px.ffill()
    days = px.index[(px.index >= pd.Timestamp(start)) & (px.index <= pd.Timestamp(end))]
    first_i = px.index.get_loc(days[0])
    spy_sma = px["SPY"].rolling(200).mean()
    qqq_sma = px["QQQ"].rolling(200).mean()
    freq = "Q" if kind == "M2" else "M"
    ends = period_ends(px.index, freq)
    book, curve, invested = Book(costs), [], []
    pending = None
    # initial signal = last period end on/before the day before start
    prior = [d for d in ends if d < days[0]]
    if kind in ("SPY", "QQQ", "EW"):
        pending = "init"
    else:
        pending = max(prior)
    year_of_last_ew = None
    for d in days:
        i = px.index.get_loc(d)
        prices = ffill.loc[d]
        # ---- execute pending signal at today's close ----
        if kind in ("SPY", "QQQ") and pending == "init":
            book.rebalance_to({kind}, prices); pending = None
        elif kind == "EW" and (pending == "init" or d.year != year_of_last_ew):
            avail = [s for s in members_at(d, px.columns) if not np.isnan(px.at[d, s])]
            for s in list(book.pos):
                book.sell(s, prices)
            budget = book.cash
            for s in avail:
                book.buy(s, prices, budget / len(avail))
            year_of_last_ew, pending = d.year, None
        elif pending is not None and pending != "init" and d > pending:
            sig = pending
            if kind in ("T1", "T2"):
                u = "SPY" if kind == "T1" else "QQQ"
                sma = spy_sma if kind == "T1" else qqq_sma
                book.rebalance_to({u} if px.at[sig, u] > sma.at[sig] else {"BIL"}, prices)
            else:
                if kind == "M3" and not px.at[sig, "SPY"] > spy_sma.at[sig]:
                    book.rebalance_to({"BIL"}, prices)
                else:
                    si = px.index.get_loc(sig)
                    uni = members_at(sig, px.columns)
                    p0, p1, pn = px.iloc[si - LOOKBACK][uni], px.iloc[si - SKIP][uni], px.iloc[si][uni]
                    mom = (p1 / p0 - 1)[p0.notna() & p1.notna() & pn.notna()]
                    book.rebalance_to(set(mom.nlargest(TOP_N).index), prices)
            pending = None
        # ---- queue a new signal ----
        if kind not in ("SPY", "QQQ", "EW") and d in ends and d != days[-1]:
            pending = d
        # ---- year-end tax ----
        nxt = px.index[i + 1] if i + 1 < len(px.index) else None
        if nxt is None or nxt.year != d.year:
            book.year_end_tax(prices)
        curve.append(book.value(prices))
        invested.append(0.0 if set(book.pos) <= {"BIL"} else 1.0)
    curve = pd.Series(curve, index=days)
    final = book.liquidation_value(ffill.loc[days[-1]])
    yrs = (days[-1] - days[0]).days / 365.25
    return dict(cagr=(final / CAPITAL) ** (1 / yrs) - 1, final=final,
                maxdd=float((curve / curve.cummax() - 1).min()),
                trades_per_year=book.trades / yrs, tax_paid=book.tax_paid,
                invested=float(np.mean(invested)), curve=curve)


if __name__ == "__main__":
    px = load_prices()
    stocks = [c for c in px.columns if c not in ("SPY", "QQQ", "BIL")]
    print(f"universe {len(stocks)} stocks, prices {px.index[0].date()} -> {px.index[-1].date()}", file=sys.stderr)
    windows = {"full": ("2014-01-01", "2026-09-11"), "2014-2020": ("2014-01-01", "2020-12-31"),
               "2021-2026": ("2021-01-01", "2026-09-11")}
    kinds = ["SPY", "QQQ", "EW", "M1", "M2", "M3", "T1", "T2"]
    rows, yearly = [], {}
    for w, (a, b) in windows.items():
        for k in kinds:
            for costs in (False, True):
                if k == "EW" and costs:
                    continue   # 500-name benchmark is gross only (see SPEC)
                r = run(px, stocks, k, a, b, costs)
                rows.append(dict(window=w, strat=k, net=costs, cagr=round(100 * r["cagr"], 2),
                                 maxdd=round(100 * r["maxdd"], 1), final=round(r["final"]),
                                 trades_yr=round(r["trades_per_year"], 1), invested=round(100 * r["invested"])))
                if w == "full" and not costs:
                    c = r["curve"]
                    yearly[k] = (c.groupby(c.index.year).last() / c.groupby(c.index.year).last().shift(1) - 1)
                    yearly[k].iloc[0] = c.groupby(c.index.year).last().iloc[0] / CAPITAL - 1
                print(w, k, "net" if costs else "gross", rows[-1]["cagr"], rows[-1]["maxdd"], file=sys.stderr)
    cov = pd.Series(dict(COVERAGE))
    print(f"member price coverage: mean {100*cov.mean():.1f}%, min {100*cov.min():.1f}% ({cov.idxmin().date()})", file=sys.stderr)
    df = pd.DataFrame(rows)
    df.to_csv(os.path.join(HERE, "results_pit.csv"), index=False)
    yr = (100 * pd.DataFrame(yearly)).round(1)
    yr.to_csv(os.path.join(HERE, "yearly_gross_pit.csv"))
    pd.set_option("display.width", 200)
    print(df.to_string(index=False))
    print(yr.to_string())
