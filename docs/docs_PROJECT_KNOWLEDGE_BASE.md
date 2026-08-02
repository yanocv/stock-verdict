# 📚 Stock Verdict — Project Knowledge Base

> **Last updated:** 2026-06-27
> **Repo:** [yanocv/stock-verdict](https://github.com/yanocv/stock-verdict)
> **Description:** A stock trading support tool for tracking U.S. and Japanese markets, currency trends, and related financial news. Designed to assist investors by providing tailored insights based on real-time and scraped data.

---

## 📖 Table of Contents

1. [Project Vision](#-project-vision)
2. [Target Markets](#-target-markets)
3. [Tech Stack](#-tech-stack)
4. [Architecture Overview](#-architecture-overview)
5. [Code Analysis Findings](#-code-analysis-findings)
6. [Type System](#-type-system)
7. [Financial Formulas & Scoring Engine](#-financial-formulas--scoring-engine)
8. [Investor Lenses](#-investor-lenses)
9. [Verdict Logic](#-verdict-logic)
10. [Industry Benchmarks](#-industry-benchmarks)
11. [Features Roadmap](#-features-roadmap)
12. [Issues Tracker](#-issues-tracker)
13. [Pull Requests](#-pull-requests)
14. [Missing / Gaps Identified](#-missing--gaps-identified)
15. [API Research Notes](#-api-research-notes)
16. [Internationalization](#-internationalization)
17. [Dev Setup & Scripts](#-dev-setup--scripts)

---

## 🎯 Project Vision

Build a **stock verdict engine** that takes a ticker (US or JP), gathers real-time financial data, runs it through multi-dimensional scoring (financials, valuation, health, technical, macro/news), and outputs a clear **BUY / WAIT / AVOID** recommendation with confidence scores, reasoning, and suggested buy prices.

The app should feel like having Buffett, Graham, and Peter Lynch all reviewing one stock for you.

### Quality Goal — Error Handling Coverage

Every API call, external service (`yahooFinance`, `claudeService`, `macroService`, `newsService`), and financial formula must handle failure gracefully: null returns, try/catch at integration points, Zod validation of untrusted API responses, and no unhandled promise rejections. Tests must cover error path scenarios — malformed API data, network failure, division-by-zero in formulas, and null/undefined metric inputs.

### Architecture Goal — Maximise Next.js Server Components

Move data fetching, scoring, and heavy computation to React Server Components and API Route Handlers wherever possible. Client components (`'use client'`) should be limited to UI interactions, state (Zustand, TanStack Query), and browser-only APIs (localStorage, watchlist). Benefits: smaller client bundles, no API key exposure, better SEO, faster initial page load.

---

## 🌍 Target Markets

| Market | Exchanges | Currency | Index |
|--------|-----------|----------|-------|
| **United States** | NYSE, NASDAQ | USD | S&P 500, DJIA, NASDAQ Composite |
| **Japan** | TSE (Tokyo Stock Exchange) | JPY | Nikkei 225, TOPIX |

- Forex pair: **USD/JPY** (critical for cross-market analysis)
- Macro inputs: BoJ rates, Fed rates, gold, oil

---

## 🛠 Tech Stack

### Current (main branch)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | ^16.0.1 |
| Language | TypeScript | ^5.9.3 |
| UI Library | MUI (to be replaced) | ^7.3.5 |
| Styling | Tailwind CSS 4 | ^4.1.17 |
| State | Zustand | ^5.0.8 |
| Data Fetching | TanStack React Query | ^5.90.7 |
| i18n | next-intl | ^4.5.0 |
| Validation | Zod | ^4.1.12 |
| Dates | date-fns | ^4.1.0 |
| Testing | Jest (non-functional) | ^30.2.0 |
| Node | >=20.10.0 | — |

### After PR #1 (Foundation Overhaul)

| Change | From → To |
|--------|-----------|
| UI Library | MUI/Emotion → **shadcn/ui** (Radix + CVA + Tailwind) |
| Icons | MUI Icons → **Lucide React** |
| Testing | Jest → **Vitest** + happy-dom |
| Components | None → Button, Card, Badge (BUY/WAIT/AVOID), Tabs, Input |

### Language Composition

| Language | Percentage |
|----------|-----------|
| TypeScript | 67.1% |
| JavaScript | 28.6% |
| CSS | 4.3% |

---

## 🏗 Architecture Overview

```
src/
├── app/
│   ├── layout.tsx          # Root layout (metadata, fonts)
│   ├── page.tsx            # Landing page (search + language switcher)
│   └── api/
│       └── stock/
│           └── [ticker]/
│               └── route.ts  # API route stub (Phase 2)
├── components/
│   ├── ui/                 # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx       # BUY/WAIT/AVOID variants
│   │   ├── tabs.tsx
│   │   └── input.tsx
│   ├── StockSearchBar.tsx  # Stub
│   └── QuickVerdictCard.tsx # Stub
├── hooks/
│   └── useStock.ts         # Stub
├── lib/
│   ├── utils.ts            # cn() utility
│   ├── formulas/
│   │   ├── ratios.ts       # PE, PS, PB, PEG, ROE, D/E, margins, dividends
│   │   ├── valuation.ts    # Graham Number, Lynch Fair Value, DCF, DDM, Margin of Safety
│   │   └── health.ts       # Altman Z-Score, Piotroski F-Score, Risk Score
│   ├── scoring/
│   │   ├── buffettScore.ts # Buffett investor lens
│   │   ├── grahamScore.ts  # Graham investor lens
│   │   ├── lynchScore.ts   # Lynch investor lens
│   │   └── verdictEngine.ts # Master scoring + weighted verdict
│   ├── benchmarks/
│   │   └── industries.ts   # 8 sector benchmarks
│   └── classifiers/        # Lynch category, cap size
├── types/
│   ├── stock.ts            # StockOverview
│   ├── financials.ts       # FinancialMetrics, BalanceSheet, IncomeStatement
│   ├── verdict.ts          # Verdict, InvestorVerdict, MacroData, NewsArticle
│   └── index.ts            # Re-exports
├── validators/
│   └── stock.ts            # Zod schemas for all data shapes
└── stores/
    └── langStore.ts        # Language state (EN/JA/PT)
```

---

## 🔍 Code Analysis Findings

### What Was Found Missing / Broken

| Finding | Severity | Status |
|---------|----------|--------|
| MUI installed instead of shadcn/ui | 🔴 High | Fixed in PR #1 |
| Jest declared but non-functional | 🔴 High | Fixed in PR #1 (→ Vitest) |
| Zero business logic on main branch | 🔴 High | Fixed in PR #1 |
| No `.env.example` | 🟡 Medium | Issue [#5](https://github.com/yanocv/stock-verdict/issues/5) |
| Unused import `calculateMarginOfSafety` in buffettScore.ts | 🟢 Low | Issue [#4](https://github.com/yanocv/stock-verdict/issues/4) / [#7](https://github.com/yanocv/stock-verdict/issues/7) |
| `sharesOutstanding: 1` placeholder (wrong per-share math) | 🔴 High | Issue [#3](https://github.com/yanocv/stock-verdict/issues/3) / [#8](https://github.com/yanocv/stock-verdict/issues/8) |
| `grahamScore.ts` uses raw equity, not book value per share | 🔴 High | Issue [#3](https://github.com/yanocv/stock-verdict/issues/3) / [#8](https://github.com/yanocv/stock-verdict/issues/8) |
| HTML `lang="en"` hardcoded (doesn't reflect i18n) | 🟡 Medium | Draft issue (pending) |
| No real API data fetching | 🔴 Critical | Issue [#6](https://github.com/yanocv/stock-verdict/issues/6) |
| No frontend verdict flow (UI) | 🔴 Critical | Issue [#2](https://github.com/yanocv/stock-verdict/issues/2) |
| No news/macro scoring integration | 🟡 Medium | Draft issue (pending) |
| No calendar/dividend/earnings awareness | 🟡 Medium | Draft issue (pending) |
| Macro score hardcoded to 5 | 🔴 High | Needs real data |
| Technical score hardcoded to 5 | 🔴 High | Needs real data |

---

## 📦 Type System

### StockOverview

```typescript
interface StockOverview {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  currentPrice: number;
  currency: string;          // 'USD' | 'JPY'
  exchange: string;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  capSize: 'large' | 'mid' | 'small';
}
```

### FinancialMetrics

```typescript
interface FinancialMetrics {
  eps: number | null;
  roe: number | null;
  netProfitMargin: number | null;
  peRatio: number | null;
  psRatio: number | null;
  pegRatio: number | null;
  pbRatio: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  freeCashFlow: number | null;
  operatingMargin: number | null;
  revenueGrowth: number | null;
  epsGrowth: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;
  beta: number | null;
}
```

### BalanceSheet & IncomeStatement

```typescript
interface BalanceSheet {
  totalCurrentAssets: number;
  totalCurrentLiabilities: number;
  totalAssets: number;
  totalLiabilities: number;
  shareholderEquity: number;
  longTermDebt: number;
  totalDebt: number;
  cash: number;
  retainedEarnings: number;
}

interface IncomeStatement {
  revenue: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
  ebitda: number;
}
```

### Verdict Types

```typescript
type VerdictRecommendation = 'BUY' | 'WAIT' | 'AVOID';
type InvestorLens = 'balanced' | 'buffett' | 'graham' | 'lynch';
type LynchCategory = 'slow-grower' | 'stalwart' | 'fast-grower' | 'cyclical' | 'turnaround' | 'asset-play';

interface Verdict {
  recommendation: VerdictRecommendation;
  score: number;           // 1–10
  confidence: number;      // 0–100%
  reasons: string[];
  warnings: string[];
  suggestedBuyPrice: number | null;
  fairValue: number | null;
  lynchCategory: LynchCategory;
}
```

---

## 📐 Financial Formulas & Scoring Engine

### Ratio Formulas (`ratios.ts`)

| Formula | Function | Notes |
|---------|----------|-------|
| P/E Ratio | `calcPE(price, eps)` | Null-safe |
| P/S Ratio | `calcPS(marketCap, revenue)` | Null-safe |
| P/B Ratio | `calcPB(price, bookValue)` | Null-safe |
| PEG Ratio | `calcPEG(pe, growth)` | Null-safe |
| ROE | `calcROE(netIncome, equity)` | Null-safe |
| Current Ratio | `calcCurrentRatio(assets, liabilities)` | Null-safe |
| D/E | `calcDebtToEquity(debt, equity)` | Null-safe |
| Operating Margin | `calcOperatingMargin(opIncome, revenue)` | Null-safe |
| Net Profit Margin | `calcNetProfitMargin(netIncome, revenue)` | Null-safe |
| Dividend Yield | `calcDividendYield(dividend, price)` | Null-safe |
| Payout Ratio | `calcPayoutRatio(dividend, eps)` | Null-safe |

### Valuation Models (`valuation.ts`)

| Model | Function | Notes |
|-------|----------|-------|
| Graham Number | `grahamNumber(eps, bookValue)` | √(22.5 × EPS × BVPS) |
| Graham Intrinsic Value | `grahamIntrinsicValue(eps, growth, aaaYield)` | EPS × (8.5 + 2g) × 4.4/Y |
| Lynch Fair Value | `lynchFairValue(eps, growth)` | EPS × Growth Rate |
| DCF | `dcfFairValue(fcf[], discountRate, termGrowth, sharesOutstanding)` | Multi-year + terminal value |
| DDM | `ddmValue(dividend, requiredReturn, growthRate)` | Gordon Growth Model |
| Margin of Safety | `calculateMarginOfSafety(intrinsic, market)` | % below intrinsic value |

### Health Indicators (`health.ts`)

| Indicator | Function | Output |
|-----------|----------|--------|
| Altman Z-Score | `altmanZScore(...)` | Safe (>2.99) / Grey (1.81–2.99) / Distress (<1.81) |
| Piotroski F-Score | `piotrosikiFScore(...)` | 0–9 (9 binary checks) |
| Risk Score | `riskScore(...)` | 1–10 composite |

### Test Coverage: **113 tests** (all passing via Vitest)

---

## 🔭 Investor Lenses

### Buffett (`evaluateBuffett`)
- ROE > 15%
- Consistent earnings growth
- Low debt
- Strong moat (operating margin)
- Undervalued by DCF

### Graham (`evaluateGraham`)
- Low P/E (< 15)
- Low P/B (< 1.5)
- Current ratio > 2
- Positive earnings for 5+ years
- Price below Graham Number

### Lynch (`evaluateLynch`)
- PEG < 1 (undervalued growth)
- Revenue growth trajectory
- Category classification (slow/stalwart/fast/cyclical/turnaround)
- Lynch fair value vs. market price

---

## ⚖️ Verdict Logic

### Weighted Scoring

| Dimension | Weight | Source |
|-----------|--------|--------|
| Valuation | 35% | DCF margin of safety, PE, PS, PEG |
| Financials | 20% | ROE, margins, FCF, growth |
| Health | 20% | Current ratio, D/E |
| Technical | 12% | RSI, SMA50/200, 52wk position (fallback: beta proxies when no price history) |
| Macro | 7% | VIX, S&P 500, USD/JPY |
| News | 6% | Keyword sentiment scoring |

### Score → Recommendation

| Score Range | Verdict |
|-------------|---------|
| > 7.0 | **BUY** ✅ |
| 4.0 – 7.0 | **WAIT** 🟡 |
| < 4.0 | **AVOID** 🔴 |

---

## 🏭 Industry Benchmarks

8 sectors with thresholds for PE, PS, margin, ROE, and D/E:
- Technology
- Healthcare
- Financial Services
- Consumer Discretionary
- Consumer Staples
- Energy
- Industrials
- Utilities

---

## 🗺 Features Roadmap

### Phase 0 — Foundation ✅ (PR #1)
- [x] Replace MUI → shadcn/ui
- [x] Replace Jest → Vitest
- [x] Type system (StockOverview, FinancialMetrics, BalanceSheet, etc.)
- [x] Financial formulas (ratios, valuation, health) with 113 tests
- [x] Scoring engine (Buffett, Graham, Lynch lenses)
- [x] Verdict engine (weighted scoring → BUY/WAIT/AVOID)
- [x] Zod validators
- [x] Industry benchmarks (8 sectors)
- [x] Classifiers (Lynch category, cap size)
- [x] Landing page with search + language switcher

### Phase 1 — Quick Fixes
- [x] Remove unused import in `buffettScore.ts` — [#4](https://github.com/yanocv/stock-verdict/issues/4)
- [x] Add `.env.example` — [#5](https://github.com/yanocv/stock-verdict/issues/5)
- [x] Dynamic `<html lang>` from langStore — draft (pending)

### Phase 2 — Core Backend
- [x] Financial data fetching (US & JP APIs) — [#6](https://github.com/yanocv/stock-verdict/issues/6)
- [x] Fix per-share calculations (DCF, Graham) — [#3](https://github.com/yanocv/stock-verdict/issues/3)

### Phase 3 — Frontend UX ✅
- [x] Main verdict flow (input → loading → results) — [#2](https://github.com/yanocv/stock-verdict/issues/2)
- [x] **Auto-complete search:** Debounced search-as-you-type with ticker + company name suggestions via `/api/search` (Yahoo Finance `search`)
- [x] **Financials Tabs:** Income Statement, Balance Sheet, Cash Flow — each with annual / quarterly toggle, multi-period columns (like Yahoo Finance)
- [x] **Price Chart Tab:** 1-year daily close chart with 1M/3M/6M/1Y range selector (Recharts `LineChart`)
- [x] **How It Works Tab:** Score breakdown table, verdict thresholds, investor lens rules, valuation model formulas, macro/news scoring explained, disclaimer
- [x] **Tabbed result layout:** Overview · Chart · Financials · Market & News · How It Works
- [ ] **Analysis Modes (planned):** Long-term hold/investment mode vs. day trade mode (short-term signals)

### Phase 4 — Intelligence Layer ✅
- [x] Real-time macro data (VIX, S&P 500, Nikkei 225, USD/JPY, Oil, Gold) via Yahoo Finance
- [x] Macro scoring function — VIX + S&P 500 + USD/JPY → 0–10 score (replaces hardcoded 5)
- [x] News fetching via Yahoo Finance `search` — up to 8 articles per ticker
- [x] Keyword-based news sentiment scoring (bullish/bearish/neutral labels + 0–10 score)
- [x] Calendar awareness: next earnings date + EPS estimate range + ex-dividend + dividend pay date
- [x] Macro & news scores wired into the weighted verdict engine (no more hardcoded defaults)
- [x] Frontend: Market Conditions panel (VIX label, S&P 500, USD/JPY, Oil, Gold)
- [x] Frontend: Upcoming Events panel (earnings countdown, EPS estimate, dividend dates)
- [x] Frontend: News panel with per-article sentiment badges
- [ ] **Planned:** Consider adding crude oil price and geo-political risk as explicit scoring factors in the future (currently only USD/JPY is scored; oil and geo-politics are displayed but not scored)

### Phase 5 — Quality & CI
- [x] Full test coverage (85%+ critical modules) — **247 tests, 85.4% branch / 95.6% statement / 100% function** (2026-08-02)
- [x] `vitest.config.ts` → `vitest.config.mts` + `import.meta.dirname` — ESM warnings eliminated
- [x] New test files: `lynchCategory.test.ts`, `industries.test.ts`; branch coverage on all scoring engines raised above 80%
- [ ] CI pipeline (lint + typecheck + test on every PR) — **NEXT UP: add `.github/workflows/ci.yml`**

### Phase 6 — AI Narrative Layer ✅
- [x] `claudeService.ts` — Anthropic REST API (no SDK), Claude 3.5 Haiku, locale-aware (EN/JA/PT)
- [x] Structured prompt passes verdict scores, financials, top news, and macro context
- [x] `AINarrativeCard.tsx` — displays AI analysis in the verdict result panel
- [x] Graceful fallback when `ANTHROPIC_API_KEY` is not set (component hidden, no crash)

> **To activate:** set `ANTHROPIC_API_KEY=sk-ant-...` in `.env.local`. Model: `claude-3-5-haiku-20241022`.

---

## 📋 Issues Tracker

| # | Title | Category | State |
|---|-------|----------|-------|
| [#2](https://github.com/yanocv/stock-verdict/issues/2) | [Frontend] Implement the main input → verdict flow | 🖥️ Frontend | ✅ Closed |
| [#3](https://github.com/yanocv/stock-verdict/issues/3) | [Technical Debt] Use real shares outstanding for per-share calculations | 🏗️ Core | ✅ Closed |
| [#4](https://github.com/yanocv/stock-verdict/issues/4) | [Code Cleanup] Remove unused import in buffettScore.ts | 🔧 Quick fix | ✅ Closed |
| [#5](https://github.com/yanocv/stock-verdict/issues/5) | Add .env.example with documented required environment variables | 🔧 Quick fix | ✅ Closed |
| [#6](https://github.com/yanocv/stock-verdict/issues/6) | [App Core] Implement financial data fetching (US & JP) | 🏗️ Core | ✅ Closed |
| [#7](https://github.com/yanocv/stock-verdict/issues/7) | [Code Cleanup] Remove unused import in buffettScore.ts | 🔧 Quick fix | ✅ Closed |
| [#8](https://github.com/yanocv/stock-verdict/issues/8) | [Technical Debt] Use real shares outstanding (DCF/Graham) | 🏗️ Core | ✅ Closed |

### Open Issues

| Title | Category | Priority |
|-------|----------|----------|
| Add GitHub Actions CI pipeline (lint + typecheck + test on PR) | 🏗️ DevOps | 🔴 Next |
| Analyst consensus + bull/bear price targets | 🌍 Intelligence | 🟡 Phase 2 |
| RSI 14-day signals wired into technical score | 🌍 Intelligence | 🟡 Phase 2 |
| DCF sensitivity table (WACC ±2%, growth ±2%) | 🏗️ Core | 🟡 Phase 2 |
| Margin Risk module data integration (FINRA/KRX/JPX) | 🌍 Intelligence | 🟡 Phase 2 |

---

## 🔗 Pull Requests

| # | Title | Status | Author |
|---|-------|--------|--------|
| [#1](https://github.com/yanocv/stock-verdict/pull/1) | Foundation: replace MUI/Jest with shadcn/ui + Vitest, bootstrap core engine | Open | Copilot |

---

## 🔌 API Research Notes

### Candidates for Financial Data

| API | US Stocks | JP Stocks | Free Tier | Notes |
|-----|-----------|-----------|-----------|-------|
| Yahoo Finance (unofficial) | ✅ | ✅ | ✅ | Most popular, no official API |
| Alpha Vantage | ✅ | ❌ | ✅ (5/min) | Good fundamentals, limited JP |
| Twelve Data | ✅ | ✅ | ✅ (8/min) | Good for both markets |
| Finnhub | ✅ | Partial | ✅ | Good news + sentiment |
| Financial Modeling Prep (FMP) | ✅ | Partial | ✅ | Best for fundamentals |
| EOD Historical Data | ✅ | ✅ | Paid | Comprehensive |

### Candidates for News & Sentiment

| API | Notes |
|-----|-------|
| Finnhub News | Company + market news with sentiment |
| Google News RSS | Free, unstructured |
| NewsAPI.org | 500 req/day free |
| Nikkei API | Japanese market news (paid) |

### Candidates for Macro Data

| Data Point | Source |
|-----------|--------|
| Fed Funds Rate | FRED API (free) |
| BoJ Policy Rate | BoJ website / scraping |
| USD/JPY | Twelve Data / Alpha Vantage |
| Gold / Oil | Alpha Vantage / Twelve Data |
| Major Indices | Yahoo Finance / Twelve Data |

---

## 🌐 Internationalization

| Language | Code | Status |
|----------|------|--------|
| English | `en` | ✅ Done |
| Japanese | `ja` | ✅ Done |
| Portuguese | `pt` | ✅ Done |

- Using `next-intl` for translations
- `langStore` (Zustand) for client-side language state
- Translation files: `src/messages/en/common.json`, `ja/common.json`, `pt/common.json`
- Claude AI narrative responds in the user's current locale via `x-locale` header

---

## 💻 Dev Setup & Scripts

### Prerequisites
- Node.js >= 20.10.0

### Install & Run

```bash
git clone https://github.com/yanocv/stock-verdict.git
cd stock-verdict
npm install
cp .env.example .env.local  # (once .env.example exists)
npm run dev                  # http://localhost:3000
```

### Scripts (after PR #1)

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `npm run dev` | Start Next.js dev server |
| Build | `npm run build` | Production build |
| Start | `npm run start` | Start production server |
| Lint | `npm run lint` | ESLint |
| Test | `npm test` | Vitest (watch mode) |
| Test UI | `npm run test:ui` | Vitest browser UI |
| Test once | `npm run test:run` | Single run |
| Coverage | `npm run test:coverage` | With v8 coverage report |

---

## 📝 Decision Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-03-31 | Replace MUI → shadcn/ui | Lighter, more customizable, Tailwind-native |
| 2026-03-31 | Replace Jest → Vitest | Faster, ESM-native, happy-dom lighter than jsdom |
| 2026-03-31 | Pin happy-dom@^20.8.9 | v18.x had 3 CVEs |
| 2026-03-31 | 3-lens scoring (Buffett/Graham/Lynch) | Cover value, safety, and growth investing styles |
| 2026-03-31 | Weighted verdict (30/20/20/15/15) | Balance fundamentals with technicals and macro |
| 2026-03-31 | Support US + JP markets | Owner's investment focus |
| 2026-03-31 | EN/JA/PT language support | Owner's language needs |
| 2026-06-06 | claudeService uses fetch not SDK | Zero extra npm dependency; Anthropic REST API is stable |
| 2026-06-06 | Watchlist stored in localStorage | No auth required for Phase 1; migrate to Supabase in v2 |
| 2026-06-06 | Market dashboard fails silently | Index data is supplementary; never block the main flow |
| 2026-06-27 | 5-module parameter spec added | docs/docs_MASTER_PARAMETERS.md defines all parameters for Modules 1–5 |

---

## 🗺 Phase Status (as of 2026-06-27)

### Phase 2 — ✅ COMPLETE (209 tests, TypeScript clean)

| Item | File(s) | Status |
|------|---------|--------|
| Analyst consensus (bull/bear targets, rating distribution) | `yahooFinance.ts` + `types/analyst.ts` | ✅ |
| RSI 14-day + SMA 50/200 + 52wk position | `formulas/rsi.ts` + `types/technicals.ts` | ✅ |
| Full DCF — WACC from beta + 10Y treasury, 5×5 sensitivity table | `formulas/dcfAdvanced.ts` + `types/dcfAnalysis.ts` | ✅ |
| Japan 6-gate TOPIX filter (hard/soft fail + judgment rules) | `scoring/japanFilter.ts` + `types/japanFilter.ts` | ✅ |
| Macro regime gate (risk-on / neutral / risk-off + MoS bonus) | `scoring/macroRegime.ts` | ✅ |
| All wired into `/api/stock/[ticker]` response | `app/api/stock/[ticker]/route.ts` | ✅ |
| `StockVerdictResponse` updated with all new fields | `types/api.ts` | ✅ |

### Phase 1 — ✅ COMPLETE (150 tests, TypeScript clean)

| Item | Component / File | Status |
|------|-----------------|--------|
| Scoring engine + formula library | `src/lib/formulas/`, `src/lib/scoring/` | ✅ |
| Price charts | `PriceChart.tsx` (Recharts) | ✅ |
| i18n EN/JA/PT | `src/messages/`, `src/i18n/` | ✅ |
| Explainable verdicts | `VerdictExplanationPanel.tsx` | ✅ |
| Watchlist | `useWatchlist.ts` + `WatchlistButton.tsx` | ✅ |
| Market dashboard | `MarketDashboard.tsx` + `/api/market` | ✅ |
| AI narrative | `claudeService.ts` + `AINarrativeCard.tsx` | ✅ |

### Phase 2 — Next (see docs_MASTER_PARAMETERS.md for parameter specs)

| Item | Module | Priority |
|------|--------|----------|
| Analyst consensus + bull/bear targets | Module 1 `[NEEDS-LIVE-DATA]` | High |
| RSI (14-day) + overbought/oversold | Module 1 `[NEEDS-LIVE-DATA]` | High |
| DCF with terminal value + WACC sensitivity table | Module 2 `[CRITICAL-GAP]` | High |
| Japan 6-gate TOPIX filter | Module 5 | High |
| Alerts (price, verdict change, earnings) | — | Medium |
| News AI summaries per stock | — | Medium |
| Earnings & event calendar | — | Medium |

### Phase 3 — Portfolio tools

| Item | Module | Priority |
|------|--------|----------|
| Portfolio risk (VaR, Sharpe, correlation) | Module 3 | v2 |
| Portfolio builder (risk profile → DCA plan) | Module 4 | v2 |
| Context-aware position verdict (HOLD/ADD/REDUCE/EXIT) | — | v2 |

### Future — Nikkei Screener & Watchlist Scan

| Item | Notes | Priority |
|------|-------|----------|
| Nikkei-30 screener — scan curated list, return BUY results | `/api/screener` route + `ScreenerResultsTable.tsx` + `screener/page.tsx` | v2 |
| Watchlist-based scan | Once watchlist has persistent storage (Supabase), screener defaults to user's watchlist instead of static Nikkei-30 list. Same batch runner, different ticker source. | v2 |

---

*This document is a living knowledge base. Update it as the project evolves.*
