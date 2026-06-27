# KabuCheck — Investor Pitch Document

> *The AI investment analyst in your pocket. Built for the US and Japan markets.*

---

## The Problem

Most individual investors make decisions based on gut feeling, social media tips, or outdated articles. They have no consistent framework. They don't know when to buy. They don't know when to sell. And by the time they find out a stock was a good opportunity, it's already too late.

Professional investors at hedge funds and asset managers use teams of analysts, expensive Bloomberg terminals, and proprietary models. **Retail investors have none of that.**

The result: retail investors consistently underperform the market — not because they're not smart, but because they don't have the same tools.

---

## The Solution

**KabuCheck** is an AI-powered stock analysis app that gives any individual investor access to the same quality of analysis that professional fund managers use — in seconds, in plain language, in their own language.

You type a stock ticker. The app does the rest.

---

## How It Works — User Journey

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   1. User types a ticker                                    │
│      "AAPL"  or  "7203" (Toyota)                           │
│                                                             │
│              ↓                                              │
│                                                             │
│   2. App checks the market environment                      │
│      Is now even a good time to be buying stocks?          │
│      (VIX, interest rates, economic conditions)            │
│                                                             │
│              ↓                                              │
│                                                             │
│   3. App analyzes the company across 5 dimensions          │
│      Financial strength · Valuation · Health               │
│      Technical signals · Macro environment                 │
│                                                             │
│              ↓                                              │
│                                                             │
│   4. App calculates what the stock is actually worth       │
│      Fair value · Margin of safety · Upside potential      │
│                                                             │
│              ↓                                              │
│                                                             │
│   5. AI generates a plain-language verdict                  │
│      BUY / WAIT / AVOID                                    │
│      + score out of 10                                     │
│      + confidence level                                    │
│      + exactly why, in simple words                        │
│      + what price to buy at                                │
│      + where to set your exit levels                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## The Verdict Screen — What the User Sees

When the analysis is complete, the user sees a full investment brief:

```
┌──────────────────────────────────────────────────────────────┐
│  Apple Inc. (AAPL)                              🟢 BUY       │
│  $185.20 · NASDAQ · Technology                               │
│  Score: 7.4 / 10    Confidence: 71%                          │
├──────────────────────────────────────────────────────────────┤
│  Fair value:  $215.00                                        │
│  Buy below:   $161.00   ← suggested entry price              │
│  Exit level 1: $215.00  (sell 25%)                           │
│  Exit level 2: $236.00  (sell 50%)                           │
│  Exit level 3: $258.00  (sell rest)                          │
│  Stop-loss:    $157.00  (15% below entry)                    │
├──────────────────────────────────────────────────────────────┤
│  ✅ Strong free cash flow — $90B generated last year         │
│  ✅ ROE of 145% — exceptional profitability                  │
│  ✅ Price is 14% below our fair value estimate               │
│  ⚠️  P/E ratio is above sector average                       │
│  ⚠️  Revenue growth has slowed to 5% YoY                     │
├──────────────────────────────────────────────────────────────┤
│  🤖 AI Analysis                                              │
│  "Apple remains one of the highest-quality businesses in     │
│   the world. At current prices, there is a reasonable        │
│   margin of safety for a medium-term entry. The main         │
│   risk is multiple compression if rates stay elevated,       │
│   but the balance sheet and cash generation are              │
│   exceptional. Consider entering in tranches."               │
└──────────────────────────────────────────────────────────────┘
```

---

## What Makes This Different

| Feature | KabuCheck | Google Finance | Yahoo Finance | Stock apps |
|---|---|---|---|---|
| BUY / WAIT / AVOID verdict | ✅ | ❌ | ❌ | ❌ |
| Fair value calculation | ✅ | ❌ | ❌ | Some |
| AI plain-language analysis | ✅ | ❌ | ❌ | ❌ |
| Exit price levels (when to sell) | ✅ | ❌ | ❌ | ❌ |
| Japan market (TSE) support | ✅ | Partial | Partial | Rare |
| Multilingual (EN/JA/PT) | ✅ | EN only | EN only | EN only |
| Macro environment context | ✅ | ❌ | ❌ | ❌ |
| "Why this verdict?" explanation | ✅ | ❌ | ❌ | ❌ |
| Professional framework (Buffett/Graham/Lynch) | ✅ | ❌ | ❌ | ❌ |

---

## The Technology Under the Hood

*(Simplified for non-technical audiences)*

The app uses three layers working together:

**Layer 1 — Data**
Real-time financial data is pulled from multiple sources: stock prices, company financials, balance sheets, economic indicators, and news headlines. All updated automatically.

**Layer 2 — Scoring Engine**
A rules-based scoring engine evaluates 5 dimensions simultaneously, using the same frameworks that professional investors like Warren Buffett, Benjamin Graham, and Peter Lynch built their fortunes with. This is not guesswork — it is a structured, repeatable system.

**Layer 3 — AI Narrative**
After the scoring is complete, a large language model (Claude, by Anthropic) translates the numbers into plain language. The AI explains the verdict, the risks, and the opportunity in 3–5 sentences — in the user's language.

---

## Two Investor Modes

KabuCheck is designed for two types of investors, and users can switch between them:

### 🎯 Mode 1 — Value Hunter
*"Help me find undervalued stocks and tell me when to buy and sell."*

- Prioritizes: cheap price relative to fair value
- Entry trigger: significant margin of safety (price well below intrinsic value)
- Exit trigger: price reaches fair value — sell in tranches
- Typical hold: 6–24 months
- Best for: investors starting out, building capital, smaller portfolios

### 🏆 Mode 2 — Quality Compounder
*"Help me find exceptional businesses and hold them for years."*

- Prioritizes: business quality, moat, consistent growth
- Entry trigger: great business at any reasonable price
- Exit trigger: thesis breaks, not a price target
- Typical hold: years
- Best for: experienced investors, larger portfolios, long-term wealth building

---

## Market Opportunity

**The problem is global and large.**

| Market | Size |
|---|---|
| Individual investors globally | ~200 million people |
| Japan retail investor market | 36 million individual brokerage accounts (TSE 2024) |
| US retail investor market | 158 million Americans own stocks |
| Fintech investment app market | $12.5B (2023), growing at 14% CAGR |

**Why Japan specifically?**
- Japan has the world's third-largest stock market (TOPIX)
- TSE corporate governance reforms (2023+) are actively creating value opportunities
- Japanese retail investors are chronically underserved — most apps don't support TSE
- USD/JPY volatility creates unique cross-market opportunities that require macro-aware analysis

**Why multilingual?**
- Japanese: 36M+ potential users in a market with very few AI-powered tools
- Portuguese: 215M speakers, Brazil has one of the fastest-growing retail investor populations in the world
- English: global default

---

## Revenue Model

| Tier | Price | Features |
|---|---|---|
| **Free** | $0/month | 5 stock analyses per day, basic verdict |
| **Pro** | $9.99/month | Unlimited analyses, AI narrative, exit levels, watchlist alerts |
| **Pro+** | $19.99/month | Everything + portfolio tools, custom parameters, priority support |

**Additional revenue streams:**
- B2B licensing to financial advisory firms and wealth managers
- White-label API for fintech companies building on top of the engine
- Premium Japan market research reports (institutional)

---

## Current Status

**Phase 1 — Complete ✅**

The core engine is built and working:
- Stock verdict engine (BUY/WAIT/AVOID) with 5-dimension scoring
- Real-time data from Yahoo Finance (US + Japan)
- AI narrative in English, Japanese, and Portuguese
- Price charts, financial statements, macro dashboard
- Watchlist with notes, tags, and target prices
- Live market dashboard (S&P 500, NASDAQ, Nikkei, USD/JPY)
- 150 automated tests passing — production-quality codebase

**Phase 2 — In Progress 🔨**

- Analyst consensus data (bull/bear price targets)
- RSI technical signals
- Full DCF valuation model with sensitivity analysis
- Japan 6-gate TOPIX sector filter
- Real-time price alerts

**Phase 3 — Planned 📋**

- Portfolio risk assessment (correlation, stress tests)
- Portfolio builder (AI builds a personalized allocation)
- Context-aware position verdict (HOLD / ADD / REDUCE / EXIT)
- Custom parameter settings — users can personalize the scoring weights to match their own investment style

**Phase 4 — Mobile 📱**

- React Native iOS + Android app
- Push notifications for verdict changes and price alerts
- Home screen widgets

---

## The Team

*(To be completed with actual team information)*

---

## Why Now

Three things are converging:

1. **AI is now good enough** to explain complex financial analysis in plain language that non-experts can act on. Two years ago, this wasn't possible at consumer quality.

2. **Japan is having a moment** — the TSE is pushing companies to improve ROE and return capital to shareholders. The Nikkei hit 40,000 in 2024 for the first time since 1989. International and domestic investors are paying attention to Japan again.

3. **Retail investors want real tools** — the meme stock era proved that retail investors are active market participants. The demand for serious, accessible analysis tools is real and growing.

---

## What We're Looking For

*(Investment ask — to be completed)*

Funding will be used for:
- Hiring a backend engineer to accelerate Phase 2 data integrations
- Marketing and user acquisition in Japan and Brazil
- Server infrastructure scaling
- App Store / Google Play launch

---

## Contact

*(Contact information — to be completed)*

---

*KabuCheck — Know before you invest.*