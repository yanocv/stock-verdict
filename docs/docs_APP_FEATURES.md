# 🧠 Stock Verdict (KabuCheck) — Complete App Features Document

> **Last updated:** 2026-03-31
> **Repo:** [yanocv/stock-verdict](https://github.com/yanocv/stock-verdict)
> **Codename:** KabuCheck (株チェック)
> **Target cost:** ~$0–5/month (free tiers + Claude API)

---

## 📖 Table of Contents

1. [App Overview](#-app-overview)
2. [Full Tech Stack](#-full-tech-stack)
3. [Phase 0 — Foundation](#-phase-0--foundation)
4. [Phase 1 — Core Engine & API](#-phase-1--core-engine--api)
5. [Core Features (v1)](#-core-features-v1)
6. [AI-Powered Features (Claude API)](#-ai-powered-features-claude-api)
7. [Data Sources & API Integrations](#-data-sources--api-integrations)
8. [Scoring Engine](#-scoring-engine)
9. [Investor Lenses](#-investor-lenses)
10. [Verdict System](#-verdict-system)
11. [Charts & Visualizations](#-charts--visualizations)
12. [News & Sentiment Analysis](#-news--sentiment-analysis)
13. [Macro & Geopolitical Awareness](#-macro--geopolitical-awareness)
14. [Calendar Awareness (Dividends, Earnings)](#-calendar-awareness-dividends-earnings)
15. [Stock Screener (v2)](#-stock-screener-v2)
16. [Competitor Price Overlay](#-competitor-price-overlay)
17. [ESG Score](#-esg-score-)
18. [Buyback Tracker](#-buyback-tracker-)
19. [Analyst Consensus](#-analyst-consensus-)
20. [Internationalization (i18n)](#-internationalization-i18n)
21. [Mobile App (React Native — v2)](#-mobile-app-react-native--v2)
22. [Infrastructure & Deployment](#-infrastructure--deployment)
23. [Full Feature Matrix](#-full-feature-matrix)

---

## 🎯 App Overview

**KabuCheck / Stock Verdict** is an AI-assisted stock trading support tool for tracking **U.S. and Japanese markets**, currency trends, and financial news. It provides **BUY / WAIT / AVOID** verdicts using multi-dimensional scoring inspired by Warren Buffett, Benjamin Graham, and Peter Lynch — enhanced with Claude AI for natural-language reasoning.

### Core User Flow

```
User enters ticker (e.g. AAPL, 7203.T)
       ↓
App fetches real-time data from Yahoo Finance + APIs
       ↓
Scoring engine runs (financials, valuation, health, technical, macro)
       ↓
Claude AI generates human-readable analysis
       ↓
User sees: BUY/WAIT/AVOID + score + confidence + reasoning + charts
```

---

## 🛠 Full Tech Stack

### Frontend

| Technology | Purpose | Version |
|-----------|---------|---------|
| **Next.js** (App Router) | Full-stack React framework | 14+ |
| **TypeScript** | Type safety | ^5.9 |
| **TailwindCSS 4** | Utility-first CSS | ^4.1 |
| **shadcn/ui** | Component library (Radix + CVA) | Latest |
| **TradingView Lightweight Charts** | Interactive price charts | Latest |
| **Recharts** | Other visualizations (scores, comparisons) | Latest |
| **TanStack Query** | Server state management & caching | ^5.90 |
| **Zustand** | Client UI state (lang, theme, filters) | ^5.0 |
| **next-intl** | Internationalization (JP/EN/PT) | ^4.5 |
| **Zod** | Runtime validation & schemas | ^4.1 |
| **date-fns** | Date utilities | ^4.1 |
| **Lucide React** | Icon library | Latest |

### Backend

| Technology | Purpose |
|-----------|---------|
| **Next.js Route Handlers** | REST API endpoints |
| **Drizzle ORM** | Type-safe database queries |
| **Supabase (PostgreSQL)** | Primary database (watchlists, history, user prefs) |
| **Upstash Redis** | API response caching (TTL-based) |
| **Claude API** (Anthropic) | AI-powered analysis & natural language summaries |

### Data Sources

| Source | Data Provided |
|--------|--------------|
| **Yahoo Finance** (`yahoo-finance2`) | Stock prices, fundamentals, historical data, financials |
| **Alpha Vantage** (backup) | Fallback for price/fundamentals if Yahoo is down |
| **NewsAPI.org** | Company & market news headlines |
| **FRED API** | Macro/economic data (Fed rate, CPI, GDP, unemployment) |
| **ExchangeRate-API** | Forex rates (USD/JPY, etc.) |
| **EDINET** | Japan insider trading disclosures |
| **Damodaran dataset** | Industry benchmark data (PE, margins, WACC by sector) |

### Testing

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit & integration tests |
| **React Testing Library** | Component testing |
| **happy-dom** | Lightweight test DOM environment |
| **Playwright** (v2) | End-to-end browser tests |

### Infrastructure

| Service | Purpose | Cost |
|---------|---------|------|
| **Vercel** | Hosting & deployment | Free tier |
| **Supabase** | PostgreSQL database hosting | Free tier |
| **Upstash** | Redis caching | Free tier |
| **GitHub Actions** | CI/CD (lint, test, deploy) | Free for public repos |

### Future (v2)

| Technology | Purpose |
|-----------|---------|
| **React Native** | Mobile app (iOS + Android) |
| **Playwright** | E2E testing |
| **Standalone API extraction** | Separate API for mobile consumption |

---

## 🏗 Phase 0 — Foundation

> ✅ **Status:** Implemented in [PR #1](https://github.com/yanocv/stock-verdict/pull/1)

### What was done

- **Replaced MUI/Emotion → shadcn/ui** (Radix + CVA + Tailwind)
- **Replaced Jest → Vitest** with happy-dom environment
- **Created type system:** `StockOverview`, `FinancialMetrics`, `BalanceSheet`, `IncomeStatement`, `Verdict`, `InvestorVerdict`, `MacroData`, `NewsArticle`
- **Built financial formula library (113 tests, all passing):**
  - `ratios.ts` — PE, PS, PB, PEG, ROE, CurrentRatio, D/E, margins, dividends
  - `valuation.ts` — Graham Number, Graham Intrinsic Value, Lynch Fair Value, DCF, DDM, Margin of Safety
  - `health.ts` — Altman Z-Score, Piotroski F-Score, composite Risk Score
- **Built scoring engine:**
  - `buffettScore.ts` — Buffett investor lens
  - `grahamScore.ts` — Graham investor lens
  - `lynchScore.ts` — Lynch investor lens
  - `verdictEngine.ts` — Master scoring + weighted verdict (BUY/WAIT/AVOID)
- **Supporting infrastructure:**
  - Zod schemas for all data shapes
  - Industry benchmarks (8 sectors)
  - Lynch category classifier
  - Cap size classifier (USD + JPY thresholds)
- **App cleanup:**
  - Landing page with search input + language switcher (EN/JA/PT)
  - Badge component with BUY/WAIT/AVOID variants
  - Default boilerplate removed
- **Phase 1 stubs:**
  - `api/stock/[ticker]/route.ts` — API route skeleton
  - `StockSearchBar` component skeleton
  - `QuickVerdictCard` component skeleton
  - `useStock` hook skeleton
  - `.env.example` placeholder

---

## �� Phase 1 — Core Engine & API

> 🔲 **Status:** In progress (issues created)

### What needs to be done

| Feature | Issue | Status |
|---------|-------|--------|
| Wire up Yahoo Finance (`yahoo-finance2`) for real data | [#6](https://github.com/yanocv/stock-verdict/issues/6) | Open |
| Fix per-share calculations (DCF, Graham) | [#3](https://github.com/yanocv/stock-verdict/issues/3) | Open |
| Add `.env.example` with all API keys | [#5](https://github.com/yanocv/stock-verdict/issues/5) | Open |
| Remove unused imports | [#4](https://github.com/yanocv/stock-verdict/issues/4) | Open |
| Build frontend verdict flow (input → result) | [#2](https://github.com/yanocv/stock-verdict/issues/2) | Open |
| Connect Claude API for AI analysis | Planned | — |
| Set up Supabase + Drizzle ORM | Planned | — |
| Set up Upstash Redis caching | Planned | — |
| Dynamic HTML `lang` attribute | Planned | — |

---

## 📋 Core Features (v1)

### 1. Stock Search & Lookup

- User enters a ticker symbol (US: `AAPL`, `TSLA` / JP: `7203.T`, `9984.T`)
- Auto-complete suggestions from Yahoo Finance
- Support both US and Japanese exchanges
- Display: company name, sector, exchange, current price

### 2. Real-Time Stock Data

- **Price data:** Current price, OHLC, volume, 52-week high/low
- **Fundamentals:** EPS, ROE, P/E, P/S, P/B, PEG, D/E, current ratio, margins
- **Balance sheet:** Total assets, liabilities, equity, debt, cash
- **Income statement:** Revenue, operating income, net income, EBITDA
- **Multi-year history:** 3–5 year trends for growth analysis

### 3. Verdict System (BUY / WAIT / AVOID)

- Clear recommendation badge with color coding
- Overall score (1–10)
- Confidence percentage (0–100%)
- Bullish reasons list
- Bearish reasons / warnings list
- Suggested buy price
- Fair value estimate
- Lynch category classification

### 4. Score Breakdown Dashboard

Five dimensions displayed as a radar chart or bar chart:

| Dimension | Weight | Data Source |
|-----------|--------|------------|
| Financials | 30% | PE, ROE, margins, growth rates |
| Valuation | 20% | Graham Number, DCF, Lynch Fair Value |
| Health | 20% | Altman Z-Score, Piotroski F-Score, Risk Score |
| Technical | 15% | 52wk position, volume trends, beta, SMA/EMA |
| Macro/News | 15% | Interest rates, forex, commodity prices, news sentiment |

### 5. Watchlist & Portfolio Tracking

- Save stocks to a personal watchlist (stored in Supabase)
- Track portfolio performance over time
- Alerts when verdict changes (BUY→WAIT, WAIT→AVOID, etc.)
- Quick re-analysis on demand

### 6. Historical Verdict Log

- Record every verdict generated with timestamp
- Track how past verdicts performed vs. actual price movement
- Build a "track record" for the scoring engine
- Learn from accuracy over time

---

## 🤖 AI-Powered Features (Claude API)

### AI Verdict Narrative

After the scoring engine runs, Claude generates a human-readable analysis:

> *"Toyota (7203.T) scores 7.8/10 — **BUY**. The stock is trading at ¥2,680, which is 18% below our DCF fair value of ¥3,270. ROE of 12.3% is solid for the auto sector, and the Piotroski F-Score of 7 indicates strong financial health. However, watch for the BoJ rate decision next week — a rate hike could strengthen JPY and pressure export earnings. The PEG ratio of 0.9 suggests the growth is underpriced."*

### AI Features Breakdown

| Feature | Description |
|---------|-------------|
| **Natural language summary** | Plain-English (or Japanese/Portuguese) explanation of the verdict |
| **Risk narrative** | AI explains the biggest risks in context |
| **Sector comparison** | "Compared to Honda and Nissan, Toyota's ROE is 2.3% higher..." |
| **News impact analysis** | AI reads recent headlines and explains potential impact |
| **"What if" scenarios** | "If the Fed cuts rates by 25bp, here's how it could affect..." |
| **Investment thesis** | A 3-sentence bull case and bear case |
| **Question answering** | User can ask follow-up questions about any stock |

### AI Implementation

```
User requests analysis for AAPL
       ↓
App gathers all data (Yahoo Finance, news, macro)
       ↓
Scoring engine produces numerical scores
       ↓
All data + scores sent to Claude API as structured prompt
       ↓
Claude returns natural-language analysis
       ↓
Displayed alongside scores in the UI
```

---

## 🔌 Data Sources & API Integrations

### Yahoo Finance (`yahoo-finance2` npm package)

**Primary data source** — provides:

| Data | Endpoint |
|------|----------|
| Stock quote (price, volume, market cap) | `quote()` |
| Historical prices (OHLC) | `historical()` |
| Financial statements | `quoteSummary()` → financialData, incomeStatement, balanceSheet |
| Key statistics | `quoteSummary()` → defaultKeyStatistics |
| Earnings calendar | `quoteSummary()` → calendarEvents |
| Analyst recommendations | `quoteSummary()` → recommendationTrend |
| Company profile | `quoteSummary()` → assetProfile |
| Institutional holders | `quoteSummary()` → institutionOwnership |

### Alpha Vantage (Backup)

- Fallback when Yahoo Finance is rate-limited or down
- Good for: intraday data, fundamental data, forex
- Free tier: 5 requests/minute, 500/day

### NewsAPI.org

- Company-specific news headlines
- Market-wide news
- Sentiment scoring (via NLP or Claude)
- Free tier: 100 requests/day

### FRED API (Federal Reserve Economic Data)

| Data Point | Series ID |
|-----------|-----------|
| Federal Funds Rate | `FEDFUNDS` |
| CPI (Inflation) | `CPIAUCSL` |
| GDP Growth | `GDP` |
| Unemployment Rate | `UNRATE` |
| 10-Year Treasury Yield | `GS10` |
| Consumer Confidence | `UMCSENT` |

### ExchangeRate-API

- Real-time USD/JPY exchange rate
- Historical forex data
- Free tier: 1,500 requests/month

### EDINET (Japan)

- Insider trading disclosures for Japanese companies
- Officer buy/sell activity
- SEC equivalent for Japan (金融庁)

### Damodaran Dataset

- Industry benchmarks (PE, PS, margins, ROE, D/E, WACC by sector)
- Updated annually by Prof. Aswath Damodaran (NYU)
- Used for comparative analysis ("Is this PE high for the sector?")

---

## 📐 Scoring Engine

### Financial Ratios (`ratios.ts`) — 11 formulas

| Formula | What it measures |
|---------|-----------------|
| P/E Ratio | Price vs. earnings (cheap or expensive?) |
| P/S Ratio | Price vs. revenue |
| P/B Ratio | Price vs. book value |
| PEG Ratio | PE adjusted for growth |
| ROE | Return on equity (profitability) |
| Current Ratio | Short-term solvency |
| Debt-to-Equity | Leverage risk |
| Operating Margin | Core business profitability |
| Net Profit Margin | Bottom-line profitability |
| Dividend Yield | Cash return to shareholders |
| Payout Ratio | Sustainability of dividends |

### Valuation Models (`valuation.ts`) — 6 models

| Model | Formula | Use Case |
|-------|---------|----------|
| Graham Number | √(22.5 × EPS × BVPS) | Conservative fair value |
| Graham Intrinsic Value | EPS × (8.5 + 2g) × 4.4/Y | Growth-adjusted value |
| Lynch Fair Value | EPS × Growth Rate | Growth investor value |
| DCF (Discounted Cash Flow) | Σ(FCF / (1+r)^n) + TV | Multi-year intrinsic value |
| DDM (Dividend Discount) | D / (r - g) | Income stock value |
| Margin of Safety | (Intrinsic - Market) / Intrinsic | Buffer percentage |

### Health Indicators (`health.ts`) — 3 indicators

| Indicator | Output | Interpretation |
|-----------|--------|---------------|
| Altman Z-Score | Number | Safe (>2.99) / Grey (1.81–2.99) / Distress (<1.81) |
| Piotroski F-Score | 0–9 | Strong (7–9) / Moderate (4–6) / Weak (0–3) |
| Risk Score | 1–10 | Composite risk assessment |

### Test Coverage: **113 unit tests** (all passing)

---

## 🔭 Investor Lenses

### 🏛 Warren Buffett Lens (`evaluateBuffett`)

| Check | Threshold | What it means |
|-------|-----------|---------------|
| ROE | > 15% | High profitability |
| Consistent earnings | 5+ years positive | Predictable business |
| Low debt | D/E < 0.5 | Conservative balance sheet |
| Strong moat | Operating margin > 15% | Competitive advantage |
| Undervalued | Price < DCF fair value | Margin of safety |

### 📏 Benjamin Graham Lens (`evaluateGraham`)

| Check | Threshold | What it means |
|-------|-----------|---------------|
| Low P/E | < 15 | Not overpriced |
| Low P/B | < 1.5 | Asset-backed value |
| Current ratio | > 2.0 | Strong liquidity |
| Positive earnings | 5+ consecutive years | Proven profitability |
| Price < Graham Number | — | Mathematical undervaluation |

### 📈 Peter Lynch Lens (`evaluateLynch`)

| Check | Threshold | What it means |
|-------|-----------|---------------|
| PEG < 1 | Growth underpriced | Core Lynch metric |
| Revenue growth | Accelerating | Business momentum |
| Category fit | Classification matches profile | Investment thesis alignment |
| Lynch Fair Value | Price < EPS × Growth | Simple undervaluation check |

### Lynch Categories

| Category | Description | Example |
|----------|-------------|---------|
| Slow Grower | Mature, dividends, <5% growth | Utilities, Coca-Cola |
| Stalwart | Steady 10–15% growth | Procter & Gamble |
| Fast Grower | >20% growth, aggressive | Tesla early days |
| Cyclical | Tied to economic cycles | Auto, steel, airlines |
| Turnaround | Recovering from trouble | Company restructuring |
| Asset Play | Hidden asset value | Real estate holdings |

---

## ⚖️ Verdict System

### Weighted Scoring

```
Final Score = (Financials × 0.30)
            + (Valuation × 0.20)
            + (Health    × 0.20)
            + (Technical × 0.15)
            + (Macro     × 0.15)
```

### Score → Recommendation

| Score | Verdict | Badge Color | Meaning |
|-------|---------|-------------|---------|
| > 7.0 | **BUY** | 🟢 Green | Strong opportunity |
| 4.0 – 7.0 | **WAIT** | 🟡 Yellow | Hold or monitor |
| < 4.0 | **AVOID** | 🔴 Red | Too risky / overvalued |

### Verdict Output Includes

- ✅ Clear recommendation (BUY / WAIT / AVOID)
- 📊 Score breakdown (5 dimensions)
- 🎯 Confidence percentage
- 📈 Bullish reasons
- ⚠️ Bearish warnings
- 💰 Suggested buy price
- 📐 Fair value estimate
- 🏷 Lynch category
- 📋 Key stats (PE, PS, PEG, ROE, margin, cap size, liquidity)
- 🚩 Warning flags (stale data, incomplete info, API errors)
- 🤖 AI-generated narrative (Claude)

---

## 📊 Charts & Visualizations

### TradingView Lightweight Charts

| Chart | Description |
|-------|-------------|
| **Candlestick chart** | OHLC price data with volume bars |
| **Line chart** | Simple price trend |
| **Area chart** | Price with filled area below |
| **Multiple timeframes** | 1D, 1W, 1M, 3M, 6M, 1Y, 5Y, Max |

### Recharts Visualizations

| Chart | Description |
|-------|-------------|
| **Radar chart** | 5-dimension score breakdown |
| **Bar chart** | Revenue/earnings trend (multi-year) |
| **Comparison chart** | Stock vs. sector vs. index |
| **Gauge** | Overall score visualization |
| **Waterfall** | Score contribution by dimension |

---

## 📰 News & Sentiment Analysis

### Data Flow

```
NewsAPI.org → Fetch headlines for ticker/sector
       ↓
NLP / Claude API → Score sentiment (positive/neutral/negative)
       ↓
Impact assessment → How does this news affect the verdict?
       ↓
Display → Summarized with color-coded sentiment badges
```

### News Categories Tracked

| Category | Impact Examples |
|----------|----------------|
| Earnings releases | Beat/miss expectations |
| Product launches | New iPhone, new car model |
| Regulatory changes | Antitrust, tariffs, sanctions |
| Management changes | CEO resignation, activist investor |
| M&A activity | Acquisition, merger, spin-off |
| Legal/lawsuits | Patent disputes, SEC investigations |
| Supply chain | Disruptions, shortages |
| Geopolitical | War, trade war, sanctions |

---

## 🌍 Macro & Geopolitical Awareness

### Macro Inputs Tracked

| Input | Source | Impact |
|-------|--------|--------|
| Fed Funds Rate | FRED API | Higher rates → lower stock valuations |
| BoJ Policy Rate | BoJ / scraping | JPY strength, Japan equity valuations |
| USD/JPY | ExchangeRate-API | Export company earnings impact |
| Gold price | Yahoo Finance | Risk-off indicator |
| Oil price | Yahoo Finance | Energy sector + inflation |
| CPI (inflation) | FRED API | Rate hike expectations |
| 10Y Treasury Yield | FRED API | Discount rate for DCF |
| VIX (volatility) | Yahoo Finance | Fear gauge |

### Geopolitical Event Scoring

The system detects and scores impact from:

- Wars and military conflicts
- Trade wars and tariffs
- Central bank policy changes
- Natural disasters
- Pandemic developments
- Election outcomes
- Sanctions and embargoes

### How It Affects Verdicts

- Negative macro events → **confidence knockdown** (e.g., -10% confidence)
- Sector-specific events → **targeted warnings** (e.g., "Auto sector impacted by supply chain disruption")
- Currency moves → **FX impact flag** for Japanese exporters

---

## 📅 Calendar Awareness (Dividends, Earnings)

### Events Tracked

| Event | Source | Impact on Verdict |
|-------|--------|-------------------|
| **Earnings release date** | Yahoo Finance calendar | "Earnings in 3 days — expect volatility" |
| **Ex-dividend date** | Yahoo Finance | "Ex-dividend tomorrow — price may drop" |
| **Dividend pay date** | Yahoo Finance | Income timing |
| **Dividend amount** | Yahoo Finance | Yield trap detection |
| **Fiscal year end** | Company profile | Reporting cycle awareness |

### Special Verdict Modifiers

| Condition | Modifier |
|-----------|----------|
| Earnings within 7 days | ⚠️ "Earnings risk — consider waiting" |
| Ex-dividend within 3 days | ⚠️ "Price typically drops post ex-dividend" |
| Unusually high yield (>8%) | 🚩 "Potential yield trap" |
| Dividend cut history | 🚩 "Dividend has been cut before" |
| Growing dividends 5+ years | ✅ "Dividend aristocrat candidate" |

### UI Display

- Calendar view or timeline widget
- Upcoming events list with countdown
- Color-coded importance (red = high impact, yellow = moderate)

---

## 🔍 Stock Screener (v2)

> **Planned for v2** — but architecture should accommodate it from v1

### How It Works

Instead of analyzing one stock at a time, find stocks matching criteria:

```
"Show me all TSE stocks with:
  - P/E < 15
  - ROE > 15%
  - Growing dividends for 3+ years
  - Piotroski F-Score > 7
  - Verdict = BUY"
```

### Screener Criteria Available

| Category | Filters |
|----------|---------|
| **Valuation** | PE, PS, PB, PEG, price vs. Graham Number |
| **Profitability** | ROE, operating margin, net margin |
| **Growth** | Revenue growth, EPS growth, dividend growth |
| **Health** | Altman Z, Piotroski F, D/E, current ratio |
| **Dividends** | Yield, payout ratio, consecutive years |
| **Size** | Market cap (large/mid/small) |
| **Verdict** | BUY / WAIT / AVOID |
| **Lens** | Passes Buffett / Graham / Lynch criteria |
| **Market** | US only, Japan only, or both |

### Pre-built Screener Templates

| Template | Description |
|----------|-------------|
| "Buffett Picks" | ROE>15%, low debt, consistent earnings, moat |
| "Graham Bargains" | PE<15, PB<1.5, current ratio>2 |
| "Lynch Growth" | PEG<1, revenue growing, fast-grower category |
| "Dividend Champions" | Yield>3%, growing 5+ years, payout<60% |
| "Japan Value" | TSE stocks, PE<12, Piotroski>6 |
| "Turnaround Plays" | Recovering from 52wk low, improving margins |

---

## 📈 Competitor Price Overlay

### Feature

On the price chart, toggle on competitor stocks for direct comparison:

```
Toyota (7203.T) vs Honda (7267.T) vs Nissan (7201.T)
— normalized to % change from a common start date
```

### How It Works

- Automatically suggest competitors based on sector/industry
- User can manually add any ticker to compare
- All prices normalized to percentage change (so ¥2,680 and ¥1,200 are comparable)
- Toggle individual competitors on/off
- Timeframe sync across all overlaid lines

### Use Cases

- "Is Toyota outperforming its peers?"
- "The whole sector is down — is this stock-specific or market-wide?"
- "Which competitor recovered fastest from the recent dip?"

---

## 🌱 ESG Score

### Why It Matters

- Companies with poor ESG face regulatory risk, boycotts, lawsuits
- Increasingly important for institutional investors
- Japan's TSE corporate governance reform pushes ESG compliance
- Long-term performance correlation with good governance

### Data Sources

| Provider | Coverage | Cost |
|----------|----------|------|
| MSCI ESG Ratings | Global | Paid (enterprise) |
| Sustainalytics | Global | Paid |
| CDP (Carbon Disclosure) | Environmental | Free (limited) |
| Company IR pages | Self-reported | Free (scraping) |

### Display

| Rating | Meaning | Color |
|--------|---------|-------|
| **Good** | Strong ESG practices, low risk | 🟢 Green |
| **Average** | Some concerns, manageable | 🟡 Yellow |
| **Poor** | Material ESG risks identified | 🔴 Red |

Key concerns displayed: carbon emissions, labor practices, board diversity, data privacy, supply chain ethics

---

## 💰 Buyback Tracker

### Why It Matters

- When a company buys back its own shares → reduces supply → often bullish
- Japan has been actively encouraging buybacks (TSE corporate governance reform 2023+)
- Significant buybacks signal management confidence
- Increases EPS mechanically (fewer shares outstanding)

### Data Tracked

| Data Point | Source |
|-----------|--------|
| Buyback announcements | Company IR / news |
| Amount authorized | Earnings reports |
| % of shares repurchased | Calculated |
| Buyback vs. dividends ratio | Calculated |
| Historical buyback pattern | Multi-year trend |

### Display

```
🔄 Buyback Activity: Active
   Authorized: ¥100B (2.3% of market cap)
   Completed: ¥42B (42% of authorization)
   Last purchase: 2026-03-28
   Signal: 🟢 Bullish — management buying aggressively
```

---

## 📋 Analyst Consensus

### Data Tracked

| Data Point | Source |
|-----------|--------|
| Number of analysts covering | Yahoo Finance |
| Buy / Hold / Sell breakdown | Yahoo Finance |
| Average target price | Yahoo Finance |
| High / Low target range | Yahoo Finance |
| Recent rating changes | Yahoo Finance / Finnhub |

### Display Example

```
📋 Analyst Consensus (12 analysts):
   ┌──────────────────────────────┐
   │ 🟢 Buy: 8  │ 🟡 Hold: 3  │ 🔴 Sell: 1 │
   └──────────────────────────────┘
   Average Target: ¥2,900 (+8.2% upside)
   Range: ¥2,400 — ¥3,500

   ⚠️ Note: Analyst targets are often wrong.
   Use as one data point, not the sole signal.
```

### How It Affects Verdict

- Strong consensus BUY with high upside → small confidence boost
- Unanimous SELL → warning flag
- Displayed as supplementary info, NOT weighted into the score
- Disclaimer always shown: analysts are frequently wrong

---

## 🌐 Internationalization (i18n)

### Supported Languages

| Language | Code | Status |
|----------|------|--------|
| English | `en` | ✅ Default |
| Japanese (日本語) | `ja` | 🟡 Planned |
| Portuguese (Português) | `pt` | 🟡 Planned |

### Implementation

- **next-intl** for page-level translations
- **Zustand langStore** for client-side language state
- Dynamic `<html lang={locale}>` attribute
- All verdict text, UI labels, and AI summaries translated
- Claude API instructed to respond in the user's selected language
- Number formatting (¥2,680 vs $150.00 vs R$750,00)
- Date formatting (2026/03/31 vs 03/31/2026 vs 31/03/2026)

---

## 📱 Mobile App (React Native — v2)

### Planned for v2

| Feature | Description |
|---------|-------------|
| **React Native app** | iOS + Android from shared codebase |
| **Standalone API** | Extract Next.js API routes into standalone service |
| **Push notifications** | Verdict changes, earnings alerts, price targets hit |
| **Offline mode** | Cache last-viewed verdicts |
| **Quick verdict widget** | Home screen widget showing watchlist verdicts |
| **Biometric auth** | Face ID / fingerprint for portfolio access |

### Architecture for Mobile

```
Mobile App (React Native)
       ↓
Standalone REST API (extracted from Next.js routes)
       ↓
Same backend: Supabase + Redis + Yahoo Finance + Claude
```

---

## 🏗 Infrastructure & Deployment

### CI/CD Pipeline (GitHub Actions)

```yaml
on: [push, pull_request]

jobs:
  lint:     npm run lint
  test:     npm run test:run
  build:    npm run build
  deploy:   Vercel (auto on main branch)
```

### Environment Variables Needed

```bash
# Data Sources
YAHOO_FINANCE_API_KEY=          # Optional (yahoo-finance2 works without key)
ALPHA_VANTAGE_API_KEY=          # Backup data source
NEWS_API_KEY=                   # NewsAPI.org
FRED_API_KEY=                   # Federal Reserve Economic Data
EXCHANGE_RATE_API_KEY=          # Forex rates

# AI
ANTHROPIC_API_KEY=              # Claude API for AI features

# Database
SUPABASE_URL=                   # Supabase project URL
SUPABASE_ANON_KEY=              # Supabase anonymous key
SUPABASE_SERVICE_KEY=           # Supabase service role key

# Caching
UPSTASH_REDIS_URL=              # Upstash Redis REST URL
UPSTASH_REDIS_TOKEN=            # Upstash Redis token

# App
NEXT_PUBLIC_APP_URL=            # App URL for CORS/redirects
```

---

## 📊 Full Feature Matrix

| Feature | v1 | v2 | Status |
|---------|----|----|--------|
| Stock search (US + JP) | ✅ | ✅ | In progress |
| Real-time price data | ✅ | ✅ | Issue [#6](https://github.com/yanocv/stock-verdict/issues/6) |
| Financial fundamentals | ✅ | ✅ | Issue [#6](https://github.com/yanocv/stock-verdict/issues/6) |
| Scoring engine (5 dimensions) | ✅ | ✅ | ✅ Done (PR #1) |
| Investor lenses (Buffett/Graham/Lynch) | ✅ | ✅ | ✅ Done (PR #1) |
| BUY/WAIT/AVOID verdict | ✅ | ✅ | ✅ Done (PR #1) |
| Formula library (113 tests) | ✅ | ✅ | ✅ Done (PR #1) |
| Verdict UI (frontend flow) | ✅ | ✅ | Issue [#2](https://github.com/yanocv/stock-verdict/issues/2) |
| AI narrative (Claude) | ✅ | ✅ | Planned |
| Price charts (TradingView) | ✅ | ✅ | Planned |
| Score visualizations (Recharts) | ✅ | ✅ | Planned |
| News + sentiment | ✅ | ✅ | Draft issue |
| Macro/geopolitical scoring | ✅ | ✅ | Draft issue |
| Calendar awareness | ✅ | ✅ | Draft issue |
| Internationalization (EN/JA/PT) | ✅ | ✅ | Partial |
| Watchlist | ✅ | ✅ | Planned |
| Analyst consensus | ✅ | ✅ | Planned |
| Competitor overlay | — | ✅ | v2 |
| Stock screener | — | ✅ | v2 |
| ESG score | — | ✅ | v2 |
| Buyback tracker | — | ✅ | v2 |
| React Native mobile | — | ✅ | v2 |
| Push notifications | — | ✅ | v2 |
| E2E tests (Playwright) | — | ✅ | v2 |
| Historical verdict tracking | — | ✅ | v2 |

---

*This is a living document. Update as features are implemented, requirements change, or new ideas emerge.*