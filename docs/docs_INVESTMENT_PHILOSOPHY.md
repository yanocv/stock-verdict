# Investment Philosophy & System Design

> **Purpose:** This document defines the investment logic that drives every scoring, screening, and exit decision in the app. It is the "why" behind the parameters. Read this before reading `docs_MASTER_PARAMETERS.md`.
>
> **Last updated:** 2026-06-27

---

## Who This App Is Built For

**GARP investor — Growth at a Reasonable Price.**

Not deep value (buying distressed or broken companies). Not pure quality-at-any-price. The target profile:

- Buys quality businesses that are currently **underpriced relative to their intrinsic value**
- Holds until price **approaches fair value**, then exits in tranches
- Typical holding period: **6–24 months** (not day trading, not buy-and-hold forever)
- Currently capital-constrained → prioritizes **asymmetric upside** over diversification
- Covers both **US and Japan markets** — different frameworks needed for each

This is Peter Lynch's core methodology: find good businesses the market hasn't properly priced yet, ride them to fair value, exit when the margin of safety is gone.

---

## Two Investor Modes

The app supports two explicitly distinct modes. Users select one before running analysis. All scoring weights, thresholds, and exit signals differ between modes.

### Mode 1 — Value Hunter (default)

> *"Buy good companies trading below intrinsic value. Exit when they reach fair value."*

| Attribute | Detail |
|---|---|
| Entry trigger | Price significantly below DCF / Graham Number / Lynch Fair Value |
| Exit trigger | Price reaches fair value estimate (or becomes overvalued) |
| Holding period | 6–24 months typical |
| Primary metrics | P/E vs sector, PEG < 1, margin of safety ≥ 20%, FCF yield |
| Risk posture | Downside protection first; upside second |
| Japan fit | Strong — Japanese market has historically been full of value plays due to low ROE culture |

**Scoring priority order for Mode 1:**
1. Valuation (is it cheap?) — highest weight
2. Financial health (can it survive?) — second
3. Business quality (is it a decent business?) — third
4. Macro/technical (is now a reasonable time?) — fourth

### Mode 2 — Quality Compounder (aspirational)

> *"Buy exceptional businesses at any reasonable price. Only exit when the thesis breaks."*

| Attribute | Detail |
|---|---|
| Entry trigger | Any reasonable price for a truly great business; P/E premium acceptable |
| Exit trigger | Thesis invalidation (not price target) — see Exit Framework below |
| Holding period | Years |
| Primary metrics | ROE consistency (5yr), reinvestment rate, moat strength, earnings CAGR |
| Risk posture | Accept volatility; trust compounding |
| Japan fit | Harder — requires companies with strong capital allocation discipline |

**Scoring priority order for Mode 2:**
1. Business quality (moat, ROE, reinvestment rate) — highest weight
2. Growth consistency (5yr revenue + earnings CAGR) — second
3. Management quality (capital allocation track record) — third
4. Valuation (sanity check only — not the primary driver) — fourth

---

## The Investment Process Is a Funnel, Not Five Parallel Lists

The modules in `docs_MASTER_PARAMETERS.md` are ordered correctly **if you read them as a sequential funnel**:

```
Step 1: Macro environment
        Is this a time to be buying equities at all?
        (Rate environment, VIX, credit spreads, PMI)
               ↓
Step 2: Sector cycle
        Is this sector in a favorable part of its cycle?
        (Sector rotation, earnings revision trends, regulatory tailwinds/headwinds)
               ↓
Step 3: Stock screening (Module 1)
        Does this company pass the quality + value gates?
               ↓
Step 4: Valuation (Module 2)
        What is it actually worth? What's the upside to fair value?
               ↓
Step 5: Position sizing (Module 3 / 4)
        How much should I buy? How does this fit my existing exposure?
               ↓
Step 6: Entry + exit planning
        At what price do I buy? In how many tranches?
        At what price do I sell? What would invalidate the thesis?
```

The current app jumps straight to Step 3. Steps 1–2 are partially there (macro dashboard exists) but are **not connected to the screening logic yet**. This is Phase 2 work.

---

## Quality vs. Value: Keeping Them Separate

The screener currently mixes quality signals and value signals in the same gate list. They need to be separated because they mean different things:

| Signal Type | Examples | What it tells you |
|---|---|---|
| **Quality** | ROE > 15%, FCF positive, operating margin > 10%, moat = strong | Is this a good business? |
| **Value** | P/E < sector avg, PEG < 1, price < Graham Number, margin of safety > 20% | Is it cheap right now? |
| **Momentum** | 52-week position, RSI, earnings revision trend | Is the market starting to agree? |

A high-quality company at a fair price is **almost always better** than a cheap mediocre company. The framework should reflect this:

- In **Mode 1 (Value Hunter)**: require minimum quality threshold, then screen hard on value
- In **Mode 2 (Quality Compounder)**: require high quality threshold, then check value as a sanity floor (not a hard gate)

---

## The Japan 6-Gate Filter: Judgment Rules for Soft Failures

Binary gates fail in edge cases. The Japan filter (Module 5) needs **judgment rules** for stocks that fail one gate but have a strong compensating factor.

### The MHI 2022 Problem

Mitsubishi Heavy Industries in 2022 would have failed the **revenue growth gate** (defense contractors in Japan had been flat for years). But:
- Global defense spending was about to structurally increase (Russia-Ukraine)
- Japan's defense budget was being raised from 1% to 2% of GDP (largest increase in decades)
- MHI had a near-monopoly on key Japanese defense systems

A pure gate-based filter rejects it. A judgment-aware filter asks: *"Why is this gate failing, and is that reason about to reverse?"*

### Judgment Rules for Gate Failures

| Gate | Hard fail condition | Soft fail (investigate further) |
|---|---|---|
| Revenue growth | Declining for 3+ years with no catalyst | Temporarily flat due to sector cycle; structural change imminent |
| P/E ceiling | P/E > 2× sector ceiling (extreme overvaluation) | P/E above ceiling but earnings accelerating (re-rating in progress) |
| PEG ceiling | PEG > 3.0 (no growth justification) | PEG above ceiling because growth was just revised sharply upward |
| ROE floor | ROE < 3% (value destruction) | ROE temporarily depressed due to one-time restructuring charge |
| D/E ceiling | D/E > 3× ceiling (distress territory) | D/E above ceiling but actively deleveraging; FCF strongly positive |
| Dividend floor | No dividend + no buybacks + no growth | No dividend but aggressive buybacks exceeding yield requirement |

**Rule:** A stock that soft-fails one gate and passes all others → flag as **"Investigate"** not **"Reject"**. The AI narrative should explain the soft failure specifically.

**Rule:** A stock that hard-fails any single gate → **Reject**. Hard fails are non-negotiable.

**Rule:** Net-cash companies (negative net debt) → automatically pass the D/E gate regardless of calculation. This is common and desirable in Japan.

---

## Exit Framework — When to Sell

Exit criteria are as important as entry criteria. The app should support all three types.

### Type 1 — Price target exit (Mode 1 primary)

Exit when price reaches a calculated threshold. **Set this before you buy.**

| Trigger level | Action |
|---|---|
| Price reaches 75% of fair value | Review thesis — consider partial entry or wait |
| Price reaches fair value | Sell 25–33% of position |
| Price reaches fair value + 10% | Sell another 25–33% |
| Price reaches fair value + 20% | Sell remaining position |

**Never sell all at once.** Tranche out to avoid selling too early on a re-rating trend, and to avoid selling too late on a reversal.

### Type 2 — Thesis invalidation exit (Mode 1 + Mode 2)

Exit if the original reason for buying is no longer true. Price target becomes irrelevant.

| Invalidation trigger | Example |
|---|---|
| Core financial deterioration | ROE drops below threshold for 2+ consecutive quarters |
| Moat eroded | Market share declining to a new competitor with structural advantage |
| Management capital allocation failure | Large acquisition at 20× EV/EBITDA; share dilution without clear return |
| Regulatory/structural headwind | New legislation directly targeting core revenue stream |
| Macro regime change | Japan rate normalization crushes leveraged balance sheet thesis |

**Rule:** Review the thesis quarterly, not just the price. If fundamentals improve, raise the target. If they deteriorate, exit regardless of price.

### Type 3 — Stop-loss exit (risk management)

For Mode 1 (Value Hunter) only. Quality compounders should not use stop-losses on noise.

- Default stop-loss: **purchase price × 0.85** (15% drawdown from cost basis)
- Tighten to 10% if macro environment has deteriorated significantly since entry
- Never stop-loss out of a position and re-enter the same day — that's emotional trading

---

## Sell-in-Tranches Logic (What Corporations Do)

Institutional investors and corporate treasuries do not sell positions in one block. They execute in tranches to:
1. Avoid moving the market against themselves on large positions
2. Capture upside if the re-rating continues past the initial target
3. Reduce the emotional cost of "selling too early"

**Recommended tranche structure for this app:**

```
Purchase price: ¥1,000
Fair value estimate: ¥1,400 (40% upside)

Tranche 1 — ¥1,400 (100% of fair value)    → Sell 25% of position
Tranche 2 — ¥1,540 (fair value + 10%)       → Sell 50% of remaining
Tranche 3 — ¥1,680 (fair value + 20%)       → Sell remaining
Stop-loss  — ¥850  (15% below purchase)     → Exit all immediately
```

The app should **pre-calculate and display these levels** when a user adds a stock to their watchlist with a cost basis.

---

## Macro Environment Gate (Pre-Screening)

Before screening any individual stock, the macro environment should output a **regime signal**:

| Regime | Signal | Implication |
|---|---|---|
| Risk-on | ✅ Favorable | Full screening; standard thresholds |
| Neutral | 🟡 Caution | Tighten value gates (require larger margin of safety) |
| Risk-off | 🔴 Unfavorable | Pause new positions; focus on quality + defensive sectors only |

**Regime inputs:**

| Input | Risk-on signal | Risk-off signal |
|---|---|---|
| VIX | < 18 | > 28 |
| Yield curve | Normal (upward sloping) | Inverted (2Y > 10Y) |
| Credit spreads | Tight (IG spread < 100bp) | Wide (IG spread > 200bp) |
| PMI | > 52 (expansion) | < 48 (contraction) |
| Fed/BoJ direction | Cutting or pausing | Hiking aggressively |

**Rule:** In a Risk-off regime, require an additional 10% margin of safety on top of the standard threshold before marking any stock as BUY.

---

## US vs. Japan Framework Differences

The same parameters mean different things in different markets. Do not apply US thresholds to Japanese stocks.

| Parameter | US expectation | Japan expectation | Reason |
|---|---|---|---|
| ROE | > 15% | > 8% | Japanese companies have historically been capital-inefficient; 8% is genuinely above average |
| P/E | Sector-relative | Sector-relative | Similar logic, different medians |
| Dividend yield | > 1.5% | > 2.0% | Japanese investors expect higher income; buybacks are newer |
| Revenue growth | > 5% (tech: > 15%) | > 3% | Mature domestic market; global export growth matters more |
| D/E | < 1.0 | < 0.6 (manufacturing) | Japanese manufacturers are historically conservative |
| Net cash | Nice to have | Very common; always positive signal | Many Japanese companies hold enormous cash positions |
| Buybacks | Standard signal | Particularly bullish | TSE corporate governance reform is driving buybacks as a new signal |

---

## Parameters That Are Noise (For This Profile)

Given GARP focus + 6–24 month holding period + US + Japan, these parameters add complexity without meaningfully improving decisions:

| Parameter | Why it's noise for this profile |
|---|---|
| Implied volatility (IV) | Relevant for options trading; not for buy-and-hold equity |
| Earnings surprise history (single quarter) | Too short-term; 3yr trend matters, single quarter is noise |
| Short interest % | Contrarian signal; requires real-time data; unreliable for JP |
| Insider trading (Form 4) | Useful for US micro-caps; less relevant for large-cap US or JP |
| Credit rating for equities | Relevant for bond allocation (Module 4); not for stock picking |
| Intraday volume patterns | Day trading signals; irrelevant for 6–24 month holds |

These should be excluded from the default scoring or pushed to an "advanced" toggle.

---

## Summary: What the App Should Feel Like

A user opens the app, enters a ticker. Before showing a verdict, the app has already:

1. **Checked the macro regime** — is it even a good time to be buying?
2. **Identified the sector cycle** — is this sector in accumulation or distribution?
3. **Run the quality + value gates** — does this company pass the minimum bar?
4. **Calculated intrinsic value** — what is it actually worth?
5. **Computed the margin of safety** — how much upside exists from here?
6. **Pre-calculated exit levels** — where would you sell, and why?
7. **Generated an AI narrative** — in plain language, what's the case for and against?

Then it says: **BUY at ¥2,400. Fair value ¥3,200. Exit in tranches at ¥3,200 / ¥3,520 / ¥3,840. Stop-loss ¥2,040. Macro regime: neutral — require 25% margin of safety, not 20%. Thesis invalidation: monitor ROE quarterly.**

That's what a professional investment memo looks like. That's what the app should produce.