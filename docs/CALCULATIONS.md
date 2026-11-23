# How KabuCheck calculates everything

> **What this is:** the as-built maths, step by step, with the file for each part. When the engine changes, this file changes in the same edit.
> **Not this file:** plans and proposals live in [ENGINE_SPEC.md](ENGINE_SPEC.md). Numbers marked *(param)* live in [`src/lib/scoring/params.ts`](../src/lib/scoring/params.ts); all of them are first guesses until the backtest validates them.
> Last updated: 2026-10-25.

---

## 1. Pipeline at a glance

One ticker goes through these steps (full analysis: [`src/app/api/stock/[ticker]/route.ts`](../src/app/api/stock/%5Bticker%5D/route.ts)):

1. **Fetch** stock data, 4–5 years of statements, 5 years of daily prices, news and market data (§2).
2. **Market**: macro score and market regime (§3).
3. **Technicals** from price history (§4).
4. **Fair value**: DCF on free cash flow or earnings, or P/B–ROE for financials, then a sanity cap (§5).
5. **Verdict**: six sub-scores → weighted overall → BUY / WAIT / AVOID, confidence, entry price, reasons (§6).
6. **Side panels** that don't change the verdict: Japan 6-gate filter, Buffett / Graham / Lynch lenses, AI summary (§7).

The **screener** ([`src/app/api/screener/route.ts`](../src/app/api/screener/route.ts)) runs the same fair value and verdict, but without news (score fixed at 5) and without price history (technicals use the fallback in §6.4). Its results are "quick scores".

Tickers: four digits (`7203`) become Tokyo tickers (`7203.T`).

---

## 2. Data sources

| Data | Source | File |
|---|---|---|
| Price, ratios (P/E, ROE, margins…), total debt, cash, analyst EPS estimate | Yahoo Finance `quoteSummary` | `services/yahooFinance.ts` |
| Free cash flow used by scores and lens checks | Latest **annual statement** figure (`completeFinancials`); Yahoo's last-12-month figure only when there are no statements. The quote field was unreliable (TDK −¥34B vs +¥209B reported, Nov 2026) | `formulas/statements.ts` |
| EPS and P/E | Yahoo's trailing EPS, unless it **contradicts the latest annual statement** (opposite sign, or more than 2× off net income ÷ shares, or missing): then EPS = statement net income ÷ shares and P/E = price ÷ that EPS (`completeFinancials`, since 2026-11-23). Catches stale fields after stock splits (Tokio Marine 15:1, Sep 2026: −¥4.29 vs +¥18.95) and one-off-inflated 12-month figures (ORIX ¥861 vs ¥417) | `formulas/statements.ts` |
| Balance sheet (equity, assets, liabilities, retained earnings) | Latest quarterly or annual statement, whichever is newer (`completeBalanceSheet`). Yahoo's snapshot has returned no balance sheet since Nov 2024; debt and cash from the snapshot are kept when present | `formulas/balanceSheet.ts` |
| Annual and quarterly statements (income, balance, cash flow) | Yahoo Finance time series | `services/financialHistoryService.ts` |
| Daily prices (5 years) | Yahoo Finance | `financialHistoryService.ts` `fetchPriceHistory` |
| VIX, S&P 500, Nikkei 225, USD/JPY, US 10Y (`^TNX`), oil, gold | Yahoo Finance quotes | `services/macroService.ts` |
| S&P 500 and Nikkei 225 trend (≈13 months of closes) | Yahoo Finance chart | `macroService.ts` |
| Japan 10-year government bond yield | Ministry of Finance daily CSV (`jgbcm.csv`, Shift_JIS) | `macroService.ts` `parseJgbTenYear` |
| News headlines | Yahoo Finance search | `services/newsService.ts` |

Any source that fails returns `null`; the analysis continues without it.

**Missing data is never treated as zero.** A missing input leaves its score unchanged (neutral) and lowers confidence (§6.6).

---

## 3. Market: macro score and regime

### 3.1 Index trend ([`formulas/indexTrend.ts`](../src/lib/formulas/indexTrend.ts))
For the S&P 500 and the Nikkei 225 (TOPIX has no history on Yahoo):
- `vsSma200Pct` = (last close ÷ 200-day average − 1) × 100
- `drawdownPct` = (1 − last close ÷ highest close of the last 252 sessions) × 100

Index **levels are never used**: they drift up over time, so a fixed level would always read "bullish".

### 3.2 Trend → signal ([`scoring/macroRegime.ts`](../src/lib/scoring/macroRegime.ts) `classifyIndexTrend`)
| Signal | Rule *(param `regime`)* |
|---|---|
| Bearish | drawdown > 20%, **or** below the 200-day average and drawdown ≥ 10% |
| Bullish | above the 200-day average **and** drawdown < 10% |
| Neutral | anything else |

### 3.3 Market regime (`determineMacroRegime`)
Each factor votes +1 / 0 / −1, and the votes are summed:
| Factor | +1 | 0 | −1 |
|---|---|---|---|
| VIX | < 18 | 18–28 | > 28 |
| S&P 500 trend | bullish | neutral | bearish |
| Nikkei 225 trend | bullish | neutral | bearish |
| USD/JPY | < 140 | 140–160 | > 160 |

Sum ≥ 2 → **risk-on**, ≤ −2 → **risk-off**, otherwise **neutral**.

Extra margin of safety a BUY needs *(param `regime.mosBonus`)*: risk-on +0%, neutral +5%, risk-off +10%. How it is applied: §6.2 and §6.5.

### 3.4 Macro score 0–10 ([`scoring/macroScore.ts`](../src/lib/scoring/macroScore.ts))
Average of factor scores, VIX counted twice:
- VIX: < 15 → 8.5 · < 20 → 6.5 · < 30 → 4 · else 2
- Each index trend: bullish 7 · neutral 5 · bearish 3
- USD/JPY: > 160 → 3 · > 150 → 5 · > 130 → 6.5 · else 7 (same for every stock today; per-stock currency sensitivity is planned, ENGINE_SPEC §9 P4)

No data → 5.

---

## 4. Technicals ([`formulas/rsi.ts`](../src/lib/formulas/rsi.ts))
From daily closes:
- **RSI (14)**: ≥ 70 overbought, ≤ 30 oversold, else neutral.
- **SMA 50 and SMA 200**: price above or below each.
- **52-week position**: (price − 52w low) ÷ (52w high − 52w low) × 100.

---

## 5. Fair value

### 5.1 Method by company type ([`formulas/fairValue.ts`](../src/lib/formulas/fairValue.ts) `estimateFairValue`)
| Company | Method |
|---|---|
| Sector "Financial Services", except insurers (banks, brokers, leasing) | **P/B–ROE** (§5.5) |
| Insurers (industry "Insurance…") | **DCF on earnings** (`dcf-earnings`, §5.2–5.4, earnings basis always): book value is swollen by unrealized gains on shareholdings and cash flow follows premiums and claims (`isInsurer`, since 2026-11-23) |
| Everyone else | **DCF** (§5.2–5.4) on free cash flow (`dcf-fcf`) or on earnings (`dcf-earnings`) |
| Statements in another currency than the price (ADRs) | **none**: per-share values would be wrong |
| Profitable, but operations lose money (operating margin ≤ 0 while net margin or EPS > 0), non-financials only | **none**: the profit is investment gains or one-offs (e.g. SoftBank Group), and valuing it would treat it as recurring (`hasNonOperatingEarnings`) |

Then the **sanity cap** (§5.6).

### 5.2 Cash flow to discount ([`formulas/dcfAdvanced.ts`](../src/lib/formulas/dcfAdvanced.ts) `selectCashFlowBase`)
Starts from **today's earning power**, not an average of past years (averaging undervalued companies whose profits just grew: MHI's 4-year FCF average was half its latest year).
- **Current EPS** (`currentEps`): trailing EPS, blended **half-and-half** with analysts' EPS estimate for the current fiscal year when at least **3** analysts cover the stock *(param `dcf.forecastMinAnalysts`)*. Estimate only, if there is no trailing EPS. Source: Yahoo `earningsTrend` "0y".
- **Current earnings** = current EPS × shares (latest annual net income if EPS is missing).
- **Cash conversion** (`cashConversion`) = sum of free cash flow ÷ sum of net income over the last **4** years that have both figures *(param `dcf.cashFlowYears`)*, matched by year. Without history: latest FCF ÷ current earnings. (Yahoo's single "TTM free cash flow" is not used when history exists: it was ~4× the annual figures for MHI.)
- If conversion is between **0.5 and 1.5** *(param `dcf.fcfToEarnings`)* → cash flow = current earnings × conversion, with conversion counted at most **1.0** *(param `dcf.maxCashConversion`)*: cash flow above earnings (working-capital swings, capex below depreciation) doesn't last (`fcf` basis).
- Otherwise free cash flow is distorted (finance arms like Toyota's, big advance payments, heavy investment years) → cash flow = current earnings × payout (`earnings` basis), where payout = 1 − long-run growth ÷ ROE, at least **0.5** *(param `dcf.minPayout`)*.
- If current earnings ≤ 0: 4-year average FCF if positive, else no DCF value.

### 5.3 Discount rate
- **Risk-free rate** (`riskFreeRateFor`): live 10-year yield of the stock's home market. Tokyo tickers → JGB 10Y (MoF); others → US 10Y (`^TNX`). Fallbacks *(param)*: Japan 2.9%, US 4.5%.
- **Beta**: Yahoo beta, kept between **0.8** *(param `dcf.betaFloor`)* and 3. The floor exists because many Japanese large caps show betas of 0.3–0.4, which would put the cost of equity near the bond yield.
- **Cost of equity** (used as the discount rate; the company is treated as all-equity): `rf + beta × 5.5%` *(param `dcf.equityRiskPremium`)*, kept between 5% and 25%.

### 5.4 DCF projection (`runAdvancedDCF`)
- **Starting growth** (`estimateGrowthRate`), deliberately conservative:
  1. Inputs: FCF CAGR, revenue CAGR (both need ≥ 2 years between first and last point), Yahoo's EPS growth, **analysts' expected growth this year** (estimate ÷ trailing EPS − 1; needs ≥ 3 analysts and trailing EPS > 0), and **analysts' expected growth next year** (next-year estimate ÷ this-year estimate − 1, same analyst rule; Yahoo `earningsTrend` "+1y", since 2026-11-23) — catches declines analysts already model a year out, e.g. a patent expiry. The analyst input is the only forward-looking one: without it, TDK (EPS expected to fall ~23%) was projected at the maximum.
  2. Each input is clipped to **−10% … +25%** *(param `dcf.growthInputClip`)*, so a one-off +97% year counts as +25%.
  3. Median of the clipped inputs.
  4. Pulled **halfway** back to long-run growth (3%) *(param `dcf.growthShrink` 0.5)*: starting growth = 3% + 0.5 × (median − 3%). High growth rarely persists, and the value should be conservative.
  5. 5% when there are no inputs. Finally kept between −5% and 15% *(param)*; after steps 2–4 the 15% limit is practically never reached.
- **Long-run growth**: 3% *(param `dcf.terminalGrowth`)*, but never above the risk-free rate.
- **10 years**: growth fades in a straight line from the starting rate (year 1) to long-run growth (year 10). Each year's cash flow is discounted at the cost of equity.
- **Terminal value** (Gordon): year-10 cash flow × (1 + long-run growth) ÷ (cost of equity − long-run growth), discounted to today.
- **Equity value** = PV of 10 years + PV of terminal value − **net debt** (total debt − cash). On the **earnings** basis net debt is *not* subtracted, because net income is already after interest (this also keeps a finance arm's debt out).
- **Per share** = equity value ÷ shares outstanding. No value if it is ≤ 0.
- The Financials tab shows a 5×5 sensitivity table (discount rate ±2 pt × growth ±2 pt).

### 5.5 Banks and insurers: P/B–ROE (`pbRoeFairValue`)
- Book value per share = latest shareholder equity (from annual statements) ÷ shares.
- ROE = the **lower** of the latest ROE (Yahoo, last 12 months) and average net income ÷ average equity over the last 4 annual statements (whichever exist). A one-off gain can't inflate the value (ORIX, Nov 2026: latest 19.7% vs 8.9% average); banks with genuinely rising ROE are valued slightly low.
- Fair P/B = (ROE − g) ÷ (cost of equity − g), with g = long-run growth (§5.4) and the cost of equity from §5.3.
- Fair value = book value per share × fair P/B. None if ROE ≤ g.

### 5.6 Sanity cap
Reference = current EPS (§5.2, trailing blended with the analyst estimate) × the sector's "fair" P/E (§6.1 benchmarks). If the method's value is above **1.5×** that *(param `dcf.sanityCap`)*, it is cut to 1.5× (`adjustment: 'capped'`). Values below the reference are kept: one-off gains can inflate EPS (SoftBank), and raising them would invent bargains. No cap when EPS ≤ 0.

The response returns `fairValueEstimate` with `method`, `modelValue` (before the cap), `multiplesValue`, `adjustment`, `bear`, `bull` and `unavailableReason`.

### 5.7 Bear and bull values
A range around the base value, so a single number isn't presented as certain. It is never turned into probabilities.
- **DCF methods:** from the sensitivity grid (§5.4). **Bear** = discount rate +1 pt and starting growth −2 pt; **bull** = discount rate −1 pt and growth +2 pt.
- **P/B–ROE (financials):** cost of equity +1 pt (bear) or −1 pt (bull).
- Both get the same sanity cap as the base value (§5.6), and bear ≤ base ≤ bull. A grid cell that isn't valid (e.g. discount rate ≤ long-run growth) gives no value.
- Shown under the fair value as "Range (bear – bull)". The bear value is the downside in the reward-to-risk gate (§6.4).

---

### 5.8 Growth the price implies (reverse DCF)
`solveImpliedGrowth` in [`formulas/dcfAdvanced.ts`](../src/lib/formulas/dcfAdvanced.ts): the same DCF as §5.4 run backwards — the starting growth rate (searched between −30% and +60% a year by bisection) at which the value per share equals today's price, with the same cash flow, discount rate, 10-year fade and terminal value. Returned as `dcfAnalysis.impliedGrowthRate` (and `impliedGrowthBound` when the price lies outside that range). Not computed for banks (P/B–ROE) or without a cash-flow base. Used by the expectations check (§6.4) and given to the AI research as context (§9).

## 6. Verdict ([`scoring/verdictEngine.ts`](../src/lib/scoring/verdictEngine.ts) `generateVerdict`)

### 6.1 Sector benchmarks ([`benchmarks/industries.ts`](../src/lib/benchmarks/industries.ts))
Each sector has bands for P/E, P/S, operating margin, ROE and debt/equity. Lookup (`resolveSectorKey`): Yahoo **industry** first (e.g. "Auto Manufacturers" → Auto Manufacturing, "Banks…" → Banking, "Telecom…" → Telecom, "Drug Manufacturers"/"Biotechnology" → Pharma/Biotech, retail industries → Retail), then the exact sector, then a sector alias (Healthcare → Pharma/Biotech, Consumer Defensive/Cyclical → Consumer Goods), else defaults (P/E 12/20/35, ROE 8/15/25…). **Pharma** — industry "Drug Manufacturers…" (P/E 10/16/28, ROE 5/10/18, operating margin 5/15/25, D/E 0.3/0.8/1.5) is separate from biotech (`Pharma/Biotech`, P/E 15/25/50) since 2026-11-23: large drug makers face patent cliffs, so their fair multiple is moderate (Astellas' sanity cap went from 37× to 24× earnings). **Tech Hardware** — industries Electronic Components, Consumer Electronics, Computer Hardware, Communication Equipment, Scientific & Technical Instruments (P/E 10/18/30, ROE 5/10/15, operating margin 4/9/15, D/E 0.3/0.8/1.5) — and **Semiconductors** — industries starting with "Semiconductor" (P/E 12/22/40, ROE 8/14/22, operating margin 8/15/25, D/E 0.2/0.6/1.2) have their own sets since 2026-11-23, so hardware and chip makers aren't judged against software-like Technology bands. **Industrials** (P/E 10/16/28, ROE 5/10/15, operating margin 3/7/12, D/E 0.3/0.8/1.5) and **Basic Materials** (P/E 9/14/24, ROE 5/9/14, operating margin 4/9/15) have their own sets since 2026-10-25; Utilities, Real Estate and Communication Services (non-telecom) still use the defaults.

### 6.2 Sub-scores (each starts at 5, kept within 0–10)
**Financials** (quality of earnings)
| Input | Points |
|---|---|
| ROE | > sector good +1.5 · > average +0.5 · < poor −2 |
| Net margin | > sector good operating margin +1 · < poor −1.5 |
| Operating margin | > sector good +0.5 |
| Free cash flow | > 0 +1 · ≤ 0 −1.5 |

**Valuation**
| Input | Points |
|---|---|
| P/E | < sector cheap +2 · < fair +0.5 · > expensive −2 |
| P/S | < cheap +1.5 · > expensive −1.5 |
| PEG | < 1 +1.5 · > 2 −1 |
| Margin of safety vs fair value (§5) | see below |

When the profit doesn't come from operations (§5.1), P/E and PEG are skipped (and ROE and net margin in Financials): they are built on those one-off earnings.

Margin of safety (MoS) = (fair value − price) ÷ fair value, **minus the regime bonus** (§3.3) **and minus the uncertainty bonus**: +5 pt *(param `marginOfSafety.uncertaintyBonus`)* when the fair value is on the earnings basis or was capped (§5), or 2+ core inputs are missing *(param `marginOfSafety.uncertainMissingInputs`)*. First matching step *(param `marginOfSafety`)*: > 40% +4 · > 25% +2.5 · > 10% +1 · < −30% −3 · < −10% −1.

**Health**
| Input | Points |
|---|---|
| Current ratio | > 2 +1.5 · > 1 +0.5 · ≤ 1 −2 |
| Debt/equity | < sector low +2 · < moderate +0.5 · > high −2 |

**Financials companies** (sector Financial Services: banks, insurers, leasing; since 2026-11-23). Their balance sheets are built on deposits and policy reserves, so:
- **Health** skips current ratio and debt/equity and uses capital strength instead: shareholder equity ÷ total assets ≥ **8%** +2, ≥ **5%** +1, < **3%** −2 *(param `health.bankEquityToAssets`)*. Japanese megabanks sit around 5%; insurers and leasing companies higher. Reasons: "Strong capital: equity is X% of assets" / "Thin capital…".
- **Financials** skips free cash flow (it swings with deposits and lending).
- Current ratio, debt/equity and free cash flow don't count as missing data for them; equity/assets does.

**Technical** (with price history)
| Input | Points |
|---|---|
| RSI | oversold +2 · overbought −1.5 |
| vs SMA 200 | above +1.5 · below −1.5 |
| vs SMA 50 | above +1 · below −0.5 |
| 52-week position | < 20 +1 · > 90 −1 |

Without price history (screener): beta 0–1.2 +1 · > 2 −1.5; EPS growth > 15% +2 · > 5% +0.5 · < 0 −2; revenue growth > 10% +1 · < 0 −1.

**Macro**: §3.4. **News**: §6.3.

### 6.3 News score ([`services/newsService.ts`](../src/lib/services/newsService.ts))
Each headline: +0.2 per bullish keyword, −0.2 per bearish keyword (e.g. "upgrade", "beat" vs "downgrade", "lawsuit"), kept within −1…+1. News score = (average + 1) × 5. No news → 5. English headlines only; a weak signal, hence the small weight.

### 6.4 Overall score and verdict
Overall = weighted average *(param `weights`)*: valuation **35%**, financials **20%**, health **20%**, technical **12%**, macro **7%**, news **6%**. It is **displayed** (owner decision ENGINE_SPEC §8.3), but since 2026-11-23 it **no longer decides the verdict**: the average squeezed scores toward 5, and a cheap stock usually has a falling trend, so BUY was practically unreachable (TDK: valuation 10, reward-to-risk 6.7 : 1, overall 7.0 → WAIT).

**Verdict gates** *(params `verdict.gates`, `verdict.avoidMax`, `verdict.minRewardToRisk`)*. Quality = average of the financials and health scores, one decimal (returned as `verdict.quality`).

| Verdict | Rule |
|---|---|
| **AVOID** | Quality **< 3**: a weak business. A sound business at a high price is **WAIT**, however low the overall score (owner, 2026-11-23, following §8.2: valuation failures cap at WAIT) |
| **BUY** | All of: quality **≥ 5.5**; valuation score **≥ 8**; a fair value exists (§5); reward ÷ risk **≥ 2** (below) |
| **WAIT** | Everything else |

- **Market expectations check** *(param `expectations.gapPts` 0.06)*: gap = model's starting growth (§5.4) − growth the price implies (§5.8).
  - Gap ≥ **6 pt** (market far more pessimistic): the fair value counts as **uncertain** (extra 5% discount for BUY, §6.2) and the reasons say "The price implies X% growth a year; the model assumes Y%. The market may know something the numbers don't show (patents, guidance, regulation)". The AI research (§9) then looks for what that is.
  - Gap ≤ **−6 pt** (market far more optimistic): reason "The price already assumes X% growth a year … high expectations are priced in".
- **Falling-price warning** (`verdict.fallingKnife`): a BUY whose technical score is **≤ 4** (price below its moving averages) stays BUY, and the screen adds: "Good price, but still falling — consider buying in steps or waiting for the trend to turn." The trend informs timing; it no longer blocks the verdict.
- **Reasons** explain a missed BUY: "Good price, but business quality X is below 5.5 — WAIT instead of BUY", "Upside vs downside is X : 1, below 2 : 1 — WAIT instead of BUY", or "Weak business: quality X of 10 — AVOID".
- `verdict.buyMin` (7) and `verdict.avoidMax` (4) no longer decide the verdict; they are only the thresholds the confidence distance is measured from (§6.6).

**Reward-to-risk** *(param `verdict.minRewardToRisk` 2, `verdict.stopLossPct` 0.15)*:
- Reward = fair value − price. Risk = the **larger** of (price − bear value, §5.7) and the 15% stop-loss (price × 0.15): you risk at least your stop, even when the bear value is just under or above the price.
- Rounded to one decimal, returned as `verdict.rewardToRisk`, shown in the reasons. No fair value → no ratio (and no BUY).

### 6.5 Suggested entry price
- With a fair value: fair value × (0.75 − regime bonus − uncertainty bonus). Neutral regime, certain value → 70%; neutral regime, uncertain value → 65%.
- Without: current price × 0.85.

The engine only runs its own simple FCF DCF when the caller gives no fair value at all. The app always gives one (possibly "none"), so that fallback is for tests and backtests.

### 6.6 Confidence (0–100)
- Distance from the nearest threshold (4 or 7): 50 + 15 × distance, at most 95.
- Minus 5 per missing core input (ROE, net margin, operating margin, FCF, current ratio, debt/equity, revenue growth, EPS growth, and P/E when EPS > 0), at least 20.
- Missing inputs are listed in `verdict.missingData`; an ADR adds "fair value (financials in a different currency)", and profit from outside operations adds "fair value (profit not from operations)".

### 6.7 Reasons
Plain-language bullets for and against, from the same inputs: strong ROE, positive FCF, PEG < 1, liquidity, EPS growth, MoS > 20% / > 40% or price > 20% above fair value, price below the suggested entry, high debt, low current ratio, high P/E, falling EPS, "Market caution: a BUY needs an extra N% discount" when the regime bonus applies, "Fair value is less certain (…): a BUY needs an extra 5% discount" when the uncertainty bonus applies, and "Profit comes from outside its operations…" for §5.1's no-value case (the "Strong ROE" reason is then skipped).

---

## 7. Shown but not part of the verdict (yet)

**Japan 6-gate filter** ([`scoring/japanFilter.ts`](../src/lib/scoring/japanFilter.ts)), Tokyo tickers only, sector thresholds via the same lookup as §6.1:
| Gate | Hard fail | Soft fail |
|---|---|---|
| 1 P/E | > 2× sector ceiling | > ceiling |
| 2 PEG | (see file) | > ceiling |
| 3 Debt/equity | > 3× ceiling (net cash always passes) | > ceiling |
| 4 ROE | < 3% | < sector floor |
| 5 Shareholder return | no dividend and no FCF and no growth | yield < sector floor |
| 6 Revenue growth | < −5% | < sector floor |

Any hard fail → REJECT; any soft fail → INVESTIGATE; else ALL_PASS. Owner decision (ENGINE_SPEC §8.2) is to make it gate the verdict; not built yet.

**Investor lenses** (cards only):
- **Buffett** ([`buffettScore.ts`](../src/lib/scoring/buffettScore.ts)): 6 checks (ROE > 15%, D/E < 0.5, EPS > 0, net margin > 10%, FCF > 0, operating margin > 15%). Its fair value **is the verdict's fair value** (§5), so the card can't contradict the headline; buy below 75% of it. ≥ 5 BUY, ≥ 3 WAIT.
- **Graham** ([`grahamScore.ts`](../src/lib/scoring/grahamScore.ts)): 6 checks (P/E < 15, P/B < 1.5, P/E × P/B < 22.5, current ratio > 2, EPS > 0, pays dividends); fair value = Graham number √(22.5 × EPS × book value per share), where book value per share = shareholder equity ÷ shares (price ÷ P/B if equity is missing). ≥ 5 BUY, ≥ 3 WAIT.
- **Lynch** ([`lynchScore.ts`](../src/lib/scoring/lynchScore.ts)): 5 checks (PEG < 1, D/E < 0.33, EPS growth > 0, P/E < EPS growth, FCF > 0); fair value = EPS × growth (PEG 1). ≥ 4 BUY, ≥ 2 WAIT.

All three lens fair values are hidden when the verdict has none on purpose (ADR currency mismatch, or profit not from operations).

**AI summary** ([`services/claudeService.ts`](../src/lib/services/claudeService.ts)): written by Claude from the numbers above, in the user's language. Skipped without `ANTHROPIC_API_KEY`. It never changes a score.

---

## 8. Verdict log (database)

Every verdict is recorded so it can be judged later on what was known at the time (ENGINE_SPEC §10, principle 7). Tables: [DATABASE.md](DATABASE.md). Code: [`src/lib/db/verdictLog.ts`](../src/lib/db/verdictLog.ts), schema in [`src/lib/db/schema.ts`](../src/lib/db/schema.ts).

- **Storage:** SQLite file `data/kabucheck.db` (Node's built-in `node:sqlite`, no extra dependency), excluded from git. Behind the `VerdictLog` interface so it can move to a hosted database.
- **Append-only:** a verdict is never changed or deleted. Database triggers refuse `UPDATE` and `DELETE` on `verdicts`.
- **What is recorded per verdict:** stock, time, price and its date, source (`full` analysis or `screener` quick score), verdict, overall and six sub-scores, confidence, fair value with bear/bull, method and note (capped, ADR, non-operating earnings), suggested buy price, reward-to-risk, market regime and its extra discount, missing data, reasons; and in a separate table the raw inputs (financials, balance sheet, DCF, technicals, macro) as JSON.
- **Engine version:** the full parameter set (`params.ts`) is hashed (SHA-256, first 16 hex characters). Verdicts made with identical parameters share one `engine_versions` row; any parameter change creates a new one, so every verdict says which rules produced it.
- **When:** every full analysis (`source = full`) and every screener row (`source = screener`) since 2026-11-23. Saving never blocks or breaks a response; if the database can't be opened (e.g. a read-only host), the app works without it.
- The raw inputs also hold the research used (§9) in `research_json`.

---

## 9. AI company research

Since 2026-11-23 (owner decision; ENGINE_SPEC §11). The model's numbers can't see things like a patent expiry, but the market can. The app asks Claude to research known events, with sources, and turns them into numbers by fixed rules. **The AI never decides the verdict.**

### 9.1 When research runs ([`research/getResearch.ts`](../src/lib/research/getResearch.ts))
- **Stock page only.** The screener never starts research; it uses saved research when there is some (free).
- **Saved research younger than 7 days is reused** (no cost) *(env `RESEARCH_MAX_AGE_DAYS`)*.
- **Off without `ANTHROPIC_API_KEY`** (or with `RESEARCH_ENABLED=false`); older saved research is still shown.
- **Budget guard, checked before every call**, in UTC days/months, counting calls still running at $0.50 each: daily spend < **$1** *(`RESEARCH_DAILY_BUDGET_USD`)*, monthly < **$10** *(`RESEARCH_MONTHLY_BUDGET_USD`)*, calls today < **20** *(`RESEARCH_DAILY_MAX_CALLS`)*. Otherwise status `budget` and the last saved result.
- One research per stock at a time (a second page load waits for the same call).
- The page waits up to **45 s** *(`RESEARCH_WAIT_MS`)*; after that it shows "researching…" (status `pending`) and the result is saved for the next load.

### 9.2 The research call ([`research/researchService.ts`](../src/lib/research/researchService.ts))
- Model **Claude Opus 5.5** (`claude-opus-5-5`) *(env `RESEARCH_MODEL`)*, effort `medium`, server-side fallbacks on (if the model declines, the API answers with a fallback model in the same call).
- Tools: Claude's **web search** (at most 5 searches) and a strict `report_research` tool whose schema defines the answer.
- Input: company, industry, EPS (trailing, this year's and next year's estimates), the model's growth and the growth the price implies (§5.8).
- Instructions: find known or scheduled events in the next 5 years that can materially change earnings (patent/exclusivity expiries, launches and approvals, guidance changes, regulation, litigation, M&A, share issuance, management changes, major contracts), in Japanese and English sources (IR, 決算短信, 有価証券報告書 「事業等のリスク」, TDnet/EDINET, reputable news); give an earnings impact only when sources support it; every event needs a source URL.
- **Source check:** an event whose URL isn't among the pages the search actually retrieved is **dropped** (counted in `droppedUnsourced`). Impacts are clamped to ±90%.
- Each event: type, title, expected year, direction, earnings impact %, confidence (high/medium/low), whether analysts' 1–2 year estimates already include it, source URL and title.
- Cost: from the token usage the API returns, at $4 / $20 per million input/output tokens (Opus 5.5; table in [`research/pricing.ts`](../src/lib/research/pricing.ts)) plus $0.01 per web search (to confirm on the pricing page). A failed call is counted at $0.50.

### 9.3 How events change the numbers ([`research/eventAdjustment.ts`](../src/lib/research/eventAdjustment.ts))
- **Applied** only if: negative, sized, confidence high or medium, not already in analyst estimates, and within 5 years (or year unknown).
- Each applied event is treated as a **permanent earnings drop starting in its year**: value removed = |impact| × (1 + discount rate)^−(years away). Several events multiply; the value never drops below 20% of the model value.
- **Bear value** takes the whole shock at once: bear × (1 + total impact), total capped at −80%; bear ≤ value ≤ bull is kept.
- **Positive events never raise the value** (conservative); likely ones are listed as "Possible upside … not counted in the fair value".
- Total impact ≤ **−20%** → the fair value counts as **uncertain** (extra 5% discount for BUY).
- Reasons: "Known event: {title} ({year}), about {impact}% of earnings — fair value lowered {n}% (source: …)".
- Screen: "Known events (AI research)" card on the Overview tab lists every event with its source link and marks those that lowered the fair value.

### 9.4 Storage
Saved in `company_research`; every paid call (successful or failed) in `api_usage` with tokens, searches and cost (DATABASE.md).
