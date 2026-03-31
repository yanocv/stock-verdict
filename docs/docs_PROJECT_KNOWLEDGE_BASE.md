# 📚 Stock Verdict — Project Knowledge Base

> **Last updated:** 2026-03-31
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
| Financials | 30% | Ratios (PE, ROE, margins, growth) |
| Valuation | 20% | Graham, Lynch, DCF fair values |
| Health | 20% | Altman Z, Piotroski F, Risk Score |
| Technical | 15% | ⚠️ Currently hardcoded to 5 |
| Macro/News | 15% | ⚠️ Currently hardcoded to 5 |

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
- [ ] Remove unused import in `buffettScore.ts` — [#4](https://github.com/yanocv/stock-verdict/issues/4)
- [ ] Add `.env.example` — [#5](https://github.com/yanocv/stock-verdict/issues/5)
- [ ] Dynamic `<html lang>` from langStore — draft (pending)

### Phase 2 — Core Backend
- [ ] Financial data fetching (US & JP APIs) — [#6](https://github.com/yanocv/stock-verdict/issues/6)
- [ ] Fix per-share calculations (DCF, Graham) — [#3](https://github.com/yanocv/stock-verdict/issues/3)

### Phase 3 — Frontend UX
- [ ] Main verdict flow (input → loading → results) — [#2](https://github.com/yanocv/stock-verdict/issues/2)

### Phase 4 — Intelligence Layer
- [ ] News impact & macro scoring — draft (pending)
- [ ] Calendar awareness (dividends, earnings) — draft (pending)

### Phase 5 — Quality & CI
- [ ] Full test coverage (85%+ critical modules)
- [ ] CI pipeline (lint + test on every PR)

---

## 📋 Issues Tracker

| # | Title | Category | State |
|---|-------|----------|-------|
| [#2](https://github.com/yanocv/stock-verdict/issues/2) | [Frontend] Implement the main input → verdict flow | 🖥️ Frontend | Open |
| [#3](https://github.com/yanocv/stock-verdict/issues/3) | [Technical Debt] Use real shares outstanding for per-share calculations | 🏗️ Core | Open |
| [#4](https://github.com/yanocv/stock-verdict/issues/4) | [Code Cleanup] Remove unused import in buffettScore.ts | 🔧 Quick fix | Open |
| [#5](https://github.com/yanocv/stock-verdict/issues/5) | Add .env.example with documented required environment variables | 🔧 Quick fix | Open |
| [#6](https://github.com/yanocv/stock-verdict/issues/6) | [App Core] Implement financial data fetching (US & JP) | 🏗️ Core | Open |
| [#7](https://github.com/yanocv/stock-verdict/issues/7) | [Code Cleanup] Remove unused import in buffettScore.ts | 🔧 Quick fix | Open |
| [#8](https://github.com/yanocv/stock-verdict/issues/8) | [Technical Debt] Use real shares outstanding (DCF/Graham) | 🏗️ Core | Open |

### Pending Draft Issues (not yet created)

| Title | Category |
|-------|----------|
| Dynamic HTML `lang` attribute from user locale | 🔧 Quick fix |
| [Feature] Add news impact and macro scoring | 🌍 Intelligence |
| [Feature] Calendar awareness: dividend and earnings release | 🌍 Intelligence |

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
| English | `en` | ✅ Default |
| Japanese | `ja` | 🟡 Planned |
| Portuguese | `pt` | 🟡 Planned |

- Using `next-intl` for translations
- `langStore` (Zustand) for client-side language state
- ⚠️ HTML `lang` attribute is hardcoded to `"en"` — needs fix

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

---

*This document is a living knowledge base. Update it as the project evolves.*