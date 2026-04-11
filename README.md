# Trading Command Center

Momentum trading dashboard for Meitav Trade users, following Mark Minervini's VCP and Stan Weinstein's Stage 2 methodology.

**Stack:** Next.js 16 · React 19 · Tailwind 4 · lucide-react · framer-motion

---

## 🎯 Features

- **Overview** — 4-card summary (top sector, Stage 2 count, strongest ticker, market breadth)
- **Sectors** — 11 SPDR sector ETFs with sortable momentum heatmap
- **Watchlist** — 19 tickers in a Stage 2 screener with sortable table
- **Risk Calculator** — Meitav Trade position sizing (ILS↔USD) with round-trip commission check

---

## 🚀 Getting Started — Frontend

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/overview`.

---

## 📊 Data Agent — Live Data Refresh (Python)

The frontend reads all data from `src/lib/mockData.json`. To refresh it with **live yfinance data**, run:

### One-time setup
```bash
pip install -r scripts/requirements.txt
```

### Refresh data
```bash
python scripts/fetch_data.py
```

This fetches ~18 months of OHLCV data for:
- **11 sector ETFs** (XLK, XLV, XLF, XLE, XLI, XLY, XLP, XLB, XLU, XLRE, XLC)
- **19 watchlist tickers** (NVDA, META, AVGO, TSM, CRM, ANET, PLTR, NFLX, COST, LLY, AXON, CEG, VST, SHOP, AMD, IBKR, SMCI, HIMS, MSTR)
- **SPY** (benchmark for Relative Strength)

### Calculated metrics

| Metric | Description |
|---|---|
| **Price** | Latest close |
| **SMA 150 / 200** | 150-day and 200-day simple moving averages |
| **52W High Distance** | % below 52-week high (0 = at high, 25 = 25% below) |
| **RS Score** | IBD-style weighted 3/6/9/12-month return vs SPY, ranked 1-99 within the 19-ticker universe |
| **Volume %** | Today's volume as % of 50-day average (100 = matches avg, >120 = breakout) |
| **VCP Status** | Auto-detected (`tight` / `loose` / `none`) based on price proximity to 52W high + volume/range contraction |
| **Market Cap** | In billions USD (from yfinance info) |

### Sector metrics
- **Today's % change** — daily close vs prior close
- **Strength Score** — 63-day outperformance vs SPY, mapped to 1-99
- **Market cap** — of the SPDR ETF itself

### After refreshing data
```bash
# View the updated data locally
npm run dev

# Or push to production
git add src/lib/mockData.json
git commit -m "data: refresh from yfinance"
git push   # Vercel auto-deploys
```

---

## 🏗️ Project Structure

```
src/
├── app/                  # Next.js App Router
│   ├── layout.jsx        # Root layout (dark LTR theme + sidebar mount)
│   ├── page.jsx          # Redirects to /overview
│   ├── overview/         # 4 summary cards + top 6 sectors + top 5 picks
│   ├── sectors/          # 11-sector heatmap
│   ├── watchlist/        # Stage 2 screener table
│   └── risk/             # Meitav Trade risk calculator
├── components/
│   ├── Sidebar.jsx       # 240px left nav + mobile bottom tab bar
│   ├── PageShell.jsx     # Sticky header wrapper
│   ├── SectorCard.jsx    # Single sector tile (framer-motion)
│   ├── SectorHeatmap.jsx # Grid with sort toggle
│   ├── Stage2Table.jsx   # Professional sortable table (7 columns)
│   ├── TrendBadge.jsx    # Stage 2 / Warning / Avoid pill
│   ├── VCPBadge.jsx      # VCP Tight / Loose / None pill
│   ├── RSBar.jsx         # 0-100 gradient bar
│   ├── RiskCalculator.jsx # Full calculator (6 inputs → 6 outputs)
│   └── CommissionWarning.jsx # Traffic-light commission banner
├── hooks/
│   ├── useFxRate.js      # Stub — currently returns mockData.fxRate
│   └── useRiskCalc.js    # useReducer state machine for calculator
├── lib/
│   ├── constants.js      # Design tokens + commission thresholds
│   ├── formatters.js     # fmtUsd, fmtIls, fmtPct, fmtMarketCap
│   ├── screener.js       # calcRisk, isStage2, trendClassification, rsTier
│   └── mockData.json     # Sectors + tickers + FX rate
└── styles/
    └── globals.css       # Tailwind import + dark theme base

scripts/
├── fetch_data.py         # Python data agent (yfinance)
└── requirements.txt      # Python dependencies
```

---

## 💰 Risk Calculator Logic

Meitav Trade charges **$7 per trade**, so a round trip (buy + sell) costs **$14**.
Minervini's rule: commission should not exceed 0.5% of position value one-way — that's **1% round-trip**.

Traffic-light classification:
- 🟢 **SAFE** — commission < 0.5% of position
- 🟡 **CAUTION** — 0.5% to 1.0%
- 🔴 **DANGER** — > 1% (position too small, skip or scale up)

Formula:
```
riskPerShareUsd    = entryUsd - stopUsd
riskAmountIls      = equityIls × (riskPct / 100)
riskAmountUsd      = riskAmountIls / fxRate
shares             = floor(riskAmountUsd / riskPerShareUsd)
positionValueUsd   = shares × entryUsd
positionValueIls   = positionValueUsd × fxRate
commissionPct      = (commissionRoundTripUsd / positionValueUsd) × 100
```

---

## 📝 License

Private project — all rights reserved.
