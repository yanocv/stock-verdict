# Stock Verdict (KabuCheck) — Project Summary

> Non-technical overview for onboarding another AI agent. Covers purpose, philosophy, product, progress and plan.
> **Date:** 2026-10-20

---

## 1. Purpose

Most individual investors decide on gut feeling, social media tips or outdated articles. They have no consistent framework for when to buy or sell. Professionals use analyst teams and expensive terminals; retail investors have nothing comparable.

**Stock Verdict (brand name: KabuCheck)** gives an individual investor professional-grade stock analysis in seconds, in plain language, in their own language.

The owner is a GARP investor (Growth at a Reasonable Price) who invests in both the **US** and **Japanese (Tokyo)** markets, so the app is built around those two markets.

---

## 2. The Goal

The user types a stock ticker (for example "AAPL", or "7203" for Toyota) and receives:

- A clear verdict: **BUY / WAIT / AVOID**
- A score out of 10 and a confidence level
- The reasons, in simple words (bullish and bearish)
- An estimated fair value and a suggested buy price
- Exit levels (where to take profits, where to cut losses)
- An AI-written plain-language summary

The experience should feel like having Warren Buffett, Benjamin Graham and Peter Lynch all reviewing the same stock.

**Languages:** English, Japanese and Portuguese.

---

## 3. Investment Philosophy (the "why" behind every number)

**Target investor:** buys quality businesses that are underpriced relative to their real worth, holds until the price approaches fair value, then exits in stages. Typical holding period is 6–24 months. Not day trading, not buy-forever.

**Two investor modes (planned):**

| Mode | Idea | Status |
|---|---|---|
| **Value Hunter** (default) | Buy good companies below intrinsic value, exit at fair value. Valuation matters most. | Active |
| **Quality Compounder** | Buy exceptional businesses at reasonable prices, exit only if the thesis breaks. Business quality matters most. | Aspirational |

**The decision process is a funnel, not parallel lists:**

1. Macro environment: is this a good time to buy equities at all?
2. Sector cycle: is the sector in a favourable phase?
3. Stock screening: does the company pass quality and value gates?
4. Valuation: what is it really worth, and what is the upside?
5. Position sizing: how much to buy, and how it fits existing holdings?
6. Entry and exit planning: buy price, tranches, sell levels, and what would invalidate the thesis.

Today the app covers steps 3–4 well and parts of 1 and 6. Steps 1–2 are shown but not yet connected to the screening logic.

**Quality vs. value vs. momentum are kept separate:**
- Quality: is it a good business? (profitability, cash flow, margins)
- Value: is it cheap right now? (price vs. sector, vs. fair value)
- Momentum: is the market starting to agree? (trend, strength indicators)

A high-quality company at a fair price is almost always better than a cheap mediocre one.

---

## 4. How the System Thinks

### The verdict
Each stock gets sub-scores from 0–10 that are combined into one overall score:

| Dimension | Weight | What it asks |
|---|---|---|
| Valuation | 35% | Is it cheap versus its estimated fair value and versus peers? |
| Financials | 20% | Is it a profitable, cash-generating business? |
| Health | 20% | Can it survive? (debt, liquidity) |
| Technical | 12% | Is the price trend supportive? (momentum, trend, position in 52-week range) |
| Macro | 7% | Is the market environment friendly? (fear index, indices, USD/JPY) |
| News | 6% | Is recent news sentiment positive or negative? |

**Result:** above 7 = **BUY**, 4 to 7 = **WAIT**, below 4 = **AVOID**.
Confidence is higher the further the score is from a threshold.

### Three investor lenses
The same stock is also judged through three famous styles:
- **Buffett:** strong returns on equity, low debt, durable advantage, undervalued.
- **Graham:** low price multiples, strong balance sheet, price below a conservative value.
- **Lynch:** growth versus price, classifies the company (slow grower, stalwart, fast grower, cyclical, turnaround).

### Fair value
Estimated using a discounted cash flow model, with a sensitivity table showing how fair value changes under different assumptions. The margin of safety (how far the price sits below fair value) is the strongest driver of the valuation score.

### Japan-specific filter
A six-gate filter for Japanese stocks (growth, valuation, return on equity, debt, dividends and so on). Stocks that narrowly fail one gate are flagged "Investigate" rather than rejected, because rigid gates miss real opportunities (example: Mitsubishi Heavy Industries in 2022, rejected on growth but about to benefit from a defence-spending shift). Companies holding more cash than debt automatically pass the debt gate.

### Market regime
A macro gate classifies the environment as risk-on, neutral or risk-off and adjusts how much margin of safety to require.

### Planned risk module: margin-call cascades
Lessons from the KOSPI "Black Monday" case (leveraged retail positions forcing sales, which deepen the fall). Plan is to monitor margin-debt levels (US, Korea, Japan) as a macro override that can pull the verdict down in fragile markets. Not yet built.

---

## 5. What the User Sees Today

- **Search bar** with live suggestions by ticker or company name.
- **Market dashboard** on the home page: major US and Japan indices, volatility, USD/JPY.
- **Verdict result** in tabs: Overview, Why, Chart, Financials, Market and News, How It Works.
  - Overview: verdict, scores, three investor lenses, analyst consensus with price targets, technical signals, DCF fair value sensitivity table, AI summary.
  - Financials: income statement, balance sheet and cash flow, annual or quarterly.
  - Market and News: macro conditions, upcoming earnings and dividend dates, news with sentiment labels.
  - How It Works: transparent explanation of every score and threshold.
- **Watchlist** saved in the browser.
- **Nikkei Screener** (new): scans 30 highly liquid Nikkei 225 stocks, shows results live as they arrive, and ranks BUY candidates first. Each result links to the full analysis.
- **AI narrative** written by Claude in the user's language (requires an API key).

---

## 6. Progress

| Phase | Content | Status |
|---|---|---|
| 0. Foundation | UI kit, test setup, data model, formula library, scoring engine | Done |
| 1. Quick fixes + real data | Live market data, correct per-share maths | Done |
| 2. Core intelligence | Analyst consensus, technical indicators, full DCF with sensitivity, Japan filter, macro regime | Done and now displayed in the UI |
| 3. Frontend | Full tabbed result screen, search, charts, financial statements | Done |
| 4. Intelligence layer | Macro scoring, news sentiment, earnings and dividend calendar | Done |
| 5. Quality and CI | Automated tests (about 266, roughly 85% branch coverage), automated checks on every code push | Done |
| 6. AI narrative | Plain-language AI summary in 3 languages | Done (needs API key to activate) |
| Screener | Nikkei-30 BUY scanner | Done (first version) |

**Recent scoring improvements (rethink of the engine):**
- News sentiment was being calculated but silently ignored in the final score. Fixed (now 6% weight).
- Technical score was a stand-in using growth and volatility. Now uses real trend and momentum signals when price history is available.
- Added a test suite that checks the final score makes sense: weights add up correctly, thresholds behave as specified, improving a single metric never lowers the score, and realistic archetypes land where expected (quality compounder is BUY, value trap and zombie company are not).

**Known limits:**
- The data source is Yahoo Finance (unofficial, free, can throttle or be slow).
- A single stock analysis takes roughly 2–4 seconds, 3–7 with the AI summary.
- The screener uses neutral news sentiment and no price history to stay fast.
- Some documentation still contains outdated sections.

---

## 7. Plan

**Near term**
- Error-handling review across every external data call and calculation (failures must degrade gracefully, never crash the verdict).
- Move as much work as sensible to the server side (data fetching, scoring, heavy computation), keeping the browser for interaction only. Benefits: smaller pages, hidden keys, faster loads.
- Make the AI summary load after the verdict so it never delays the first result.
- Connect macro and sector context into the screening logic (funnel steps 1–2).
- Margin-risk module using margin-debt data (US, Korea, Japan).
- Alerts: price targets, verdict changes, upcoming earnings.
- AI summaries of news per stock.
- Analysis modes: Value Hunter versus Quality Compounder, and possibly long-term versus short-term trading.

**Medium term (v2)**
- Persistent watchlist with accounts; the screener then scans the user's own watchlist instead of the fixed Nikkei list, and eventually offers both ("scan my watchlist" plus "find new ideas").
- Portfolio tools: risk measures, portfolio builder from a risk profile into a gradual buying plan, and context-aware position advice (hold, add, reduce, exit).
- Exit framework: staged profit-taking, stop-loss, and thesis-break signals.

**Long term (v3)**
- Mobile app.

---

## 8. Principles to Respect

- **Explainable:** every verdict must show why, in plain words. No black-box scores.
- **Honest about uncertainty:** show confidence, show disclaimers, never present output as financial advice.
- **Fails gracefully:** missing data or a failed service should reduce detail, not break the result.
- **Two markets, two realities:** US and Japan need different handling.
- **Quality first, then price:** do not reward cheapness alone.
- **Keep it simple for the user:** one ticker in, one clear verdict out.
