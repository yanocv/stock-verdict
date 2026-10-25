# KabuCheck Verdict Engine — Spec (DRAFT, awaiting owner approval)

> Status: **draft v0.3, 2026-10-25.** Owner decisions recorded in §8; one question still open. §9 adds a factor review and the model v1 proposal (awaiting approval). Nothing here is built yet except what §1 describes as current.
> Once approved, this file and `src/lib/scoring/params.ts` become the single source of truth for weights and thresholds. Older parameter sections in `docs_MASTER_PARAMETERS.md` and `docs_INVESTMENT_PHILOSOPHY.md` will point here.

Every number in this document is a first guess (`assumed`) until the backtest harness validates it. The goal of this draft is to get the **structure** right, not the numbers.

---

## 1. Current engine (as built on `dev`)

`generateVerdict` in `src/lib/scoring/verdictEngine.ts` computes six 0–10 sub-scores, each starting at 5 and moved by fixed step adjustments, then takes a weighted average:

| Dimension | Weight | Inputs |
|---|---|---|
| Valuation | 35% | P/E, P/S, PEG vs sector benchmark; DCF margin of safety |
| Financials | 20% | ROE, net margin, operating margin, FCF sign |
| Health | 20% | Current ratio, D/E vs sector |
| Technical | 12% | RSI, price vs SMA50/200, 52-week position (fallback: beta + growth proxy) |
| Macro | 7% | `scoreMacro` |
| News | 6% | `scoreNews` (screener: fixed 5) |

`overall > 7` → BUY, `4–7` → WAIT, `< 4` → AVOID. Confidence = distance from the nearest threshold.

**What the current structure can't do:**

1. **Compensation.** A weak business can reach BUY on price alone. Example: valuation 10, financials 3, health 4, everything else 5 → 0.35·10 + 0.2·3 + 0.2·4 + 0.25·5 = **6.15**, close to BUY. With strong technicals (10) and good macro/news (8) it reaches **7.14 = BUY**. That contradicts "quality first, then price".
2. **Signals that don't change the verdict:**
   - The macro regime's required extra margin of safety (`macroRegime.ts`: +5% neutral, +10% risk-off) is displayed but never applied.
   - The Japan 6-gate filter's `REJECT` (hard fail) is displayed next to the verdict but doesn't change it. A stock can show BUY and REJECT on the same page.
   - Margin risk (MASTER_PARAMETERS Module 6) is specified as a BUY suppressor but not built.
3. **No modes or markets in the engine.** Value Hunter / Quality Compounder and US / Japan use the same weights. Japan differences live only in the separate filter.
4. **No stability.** A score moving 6.95 → 7.05 flips WAIT → BUY.
5. **No explanation of caps.** There is nothing like "would be BUY, held at WAIT because…", because nothing caps.

(Fixed on 2026-10-25: the stock route computed RSI/SMA and the advanced DCF *after* calling the engine, so the full page used the technical proxy and ignored DCF margin of safety. Both are now passed in.)

---

## 2. Proposed layers

```
 Market layer        regime · event risk · margin risk          → caps + required margin of safety
      │
 Stock layer         Quality score   Value score   Expectations score   (separate, not averaged together)
      │
 Verdict layer       gates in fixed order (§3) → BUY / WAIT / AVOID + list of applied caps
      │
 Position layer      (holdings with cost basis) HOLD / ADD / REDUCE / EXIT + exit plan
      │
 Portfolio layer     size per position · theme/sector caps · regime multiplier
```

### 2.1 Market layer (one result, shared by every stock in a session)
| Output | From | Effect |
|---|---|---|
| `regime`: risk-on / neutral / risk-off | existing `determineMacroRegime` (+ later: oil, 2Y/10Y, inflation nowcast, USD/JPY) | raises required margin of safety |
| `marginRisk` 0–10 | Module 6 (JPX/FINRA margin data — not yet sourced) | caps verdicts |
| `eventRisk` list | economic + earnings calendar, next 10 sessions | caps ADD; warns on holdings |

Macro **stops being an averaged dimension** (today's 7%). It acts only through these outputs.

### 2.2 Stock layer — three scores, each 0–10
| Score | Built from (today's code) | Added later |
|---|---|---|
| **Quality** | current Financials + Health sub-scores; Buffett lens | ROE consistency (5y), Japan gates 3–6 |
| **Value** | current Valuation sub-score incl. DCF margin of safety; Graham/Lynch fair values | valuation vs own 5-year P/E range |
| **Expectations** (momentum & priced-in) | current Technical sub-score; news score | priced-in detector, overheating signals, analyst target gap, estimate revisions |

High Expectations means *the price already assumes good news* (risky for new buying), not "bullish". This is the main change in meaning from today's Technical score, where overbought is just a small deduction.

### 2.3 Verdict layer — see §3.

### 2.4 Position layer (new; needs holdings with cost basis)
HOLD / ADD / REDUCE / EXIT, plus the exit plan from INVESTMENT_PHILOSOPHY (tranches at fair value / +10% / +20%, stop-loss, thesis-break triggers, review date). A high Expectations score brings the first tranche forward. Wording is always about the user's own rules ("your 10% trailing stop was hit"), never "sell now".

### 2.5 Portfolio layer (new)
Position size from fixed risk per trade (1–2% of portfolio to the stop), rounded down to 100-share lots for Japan; theme cap ~30%; regime multiplier on size.

---

## 3. Verdict gates — fixed order

Each step can only **lower** the verdict proposed by the step before. Every applied step adds a plain-language reason to `verdict.caps[]` so the UI can show "BUY → WAIT because …".

| # | Gate | Rule (first guess) | Result if triggered |
|---|---|---|---|
| 0 | Data sufficiency | Missing FCF, or ≥ 3 of {P/E, ROE, D/E, current ratio, revenue growth} | Confidence capped at 50%; verdict at most WAIT ("not enough data") |
| 1 | Hard disqualifiers | Japan hard fail on a business gate (3 D/E, 4 ROE, 5 shareholder return, 6 revenue growth); or FCF < 0 **and** D/E above sector "high" | **AVOID** |
| 1b | Japan valuation hard fail | Japan hard fail on gate 1 (P/E > 2× sector ceiling) or gate 2 (PEG > 3) | At most **WAIT** (price can fall) |
| 2 | Quality gate | Quality < `quality.min` (mode-specific; higher floor in Mode 2) | At most **WAIT** (both modes) |
| 3 | Value decision | BUY needs Value ≥ `value.buyMin` **and** margin of safety ≥ `mos.base + regime bonus` | Otherwise WAIT; Value < `value.avoidMax` → AVOID |
| 4 | Market caps | marginRisk < 3 → at most WAIT; < 2 → AVOID. Risk-off → mode 1 BUY needs Quality ≥ `quality.strong` | Cap |
| 5 | Expectations caps | Expectations ≥ `expectations.cap` (priced-in / overheating) | At most **WAIT** ("good business, price already assumes it") |
| 6 | Reward-to-risk | (fair value − price) / (price − stop) < 2 | At most **WAIT** |
| 7 | Stability | Hysteresis (§5) against the last published verdict for this ticker | Keep previous verdict inside the band |

The mode decides how Quality and Value combine at step 3:
- **Value Hunter (default):** passes step 2 at a moderate quality floor, then decides on Value.
- **Quality Compounder:** high quality floor at step 2; step 3 uses Value only as a sanity floor (not "cheap", just "not absurd").

The screen shows one blended "overall" 0–10 number with Quality / Value / Expectations beneath it. The blended number is **output, not the decision**: `overall = w_q·Quality + w_v·Value + w_e·(10 − Expectations)`, with mode weights.

---

## 4. Parameter sets: mode × market

Four sets: `valueHunter.us`, `valueHunter.jp`, `qualityCompounder.us`, `qualityCompounder.jp`. Each set holds the same keys, so the code never branches on mode or market; it just picks a set.

Japan differs mainly in: lower ROE floor (sector-aware via existing `TOPIX_SECTOR_THRESHOLDS`), net cash credit in health, 100-share lots in sizing, TOPIX alongside the Nikkei for regime.

---

## 5. Verdict stability (hysteresis)

- Band of ±0.3 around each threshold on the deciding score (step 3).
- To go WAIT → BUY: score must reach `buyMin + 0.3`. To go BUY → WAIT: drop below `buyMin − 0.3`.
- Caps from steps 0, 1, 4 and 5 apply immediately (risk shouldn't wait for a band).
- **Dependency:** needs the last published verdict per ticker, which means a verdict log. That log is also the data for the track record and backtest, so it's worth building early.

---

## 6. Parameter table (seeded with current values)

Status: `current` = in code today · `assumed` = proposed, not built · `validated` = backed by backtest (none yet).

| Name | US | JP | Status | Source / rationale | Where today |
|---|---|---|---|---|---|
| `weights.valuation` | 0.35 | 0.35 | current | GARP mode 1 priority | `params.ts` |
| `weights.financials` | 0.20 | 0.20 | current | | `params.ts` |
| `weights.health` | 0.20 | 0.20 | current | | `params.ts` |
| `weights.technical` | 0.12 | 0.12 | current | | `params.ts` |
| `weights.macro` | 0.07 | 0.07 | current → removed | becomes market layer | `params.ts` |
| `weights.news` | 0.06 | 0.06 | current → Expectations | | `params.ts` |
| `verdict.buyMin` | 7.0 | 7.0 | current | | `params.ts` |
| `verdict.avoidMax` | 4.0 | 4.0 | current | | `params.ts` |
| `verdict.hysteresis` | 0.3 | 0.3 | assumed | handoff §4 | — |
| `mos.steps` | +4 / +2.5 / +1 at 40/25/10% below; −1 / −3 at 10/30% above | same | current | | `params.ts` |
| `mos.base` (BUY minimum) | 20% | 20% | assumed | INVESTMENT_PHILOSOPHY mode 1 | — |
| `mos.regimeBonus` | 0 / +5 / +10% | same | current (not applied) | risk-on / neutral / risk-off | `macroRegime.ts` |
| `suggestedBuy.factor` | 0.75 × fair value | same | current | | `params.ts` |
| `dcf.riskFree` | 4.5% | live JGB 10Y, fallback 2% | current (US) / decided (JP) | owner decision 2026-10-25 | `params.ts` |
| `dcf.equityRiskPremium` | 5.5% | 5.5% | current | | `params.ts` |
| `dcf.terminalGrowth` | 3% | **to review** | current | | `params.ts` |
| `dcf.growthClamp` | −5% … +15%, fading to terminal by year 10 | same | current | median of FCF CAGR, revenue CAGR, EPS growth | `params.ts` |
| `quality.min` (mode 1) | 4.5 | 4.0 | assumed | | — |
| `quality.min` (mode 2) | 7.0 | 6.5 | assumed | | — |
| `quality.strong` | 7.0 | 6.5 | assumed | risk-off BUY requirement | — |
| `value.buyMin` | 7.0 | 7.0 | assumed | | — |
| `expectations.cap` | 8.0 | 8.0 | assumed | priced-in detector | — |
| `overheat.rsi` | 85 | 85 | assumed | TDK peak RSI 93.5 | — |
| `overheat.aboveSma50` | 10% | 10% | assumed | TDK +10% at peak | — |
| `overheat.runup` | 20% in 6 sessions | same | assumed | TDK +24% in 6 | — |
| `overheat.volume` | 2× 20-day avg | same | assumed | TDK ~2–3× | — |
| `rewardRisk.min` | 2.0 | 2.0 | assumed | handoff §9 | — |
| `stop.default` | 15% below cost | same | assumed | INVESTMENT_PHILOSOPHY | — |
| `stop.trailing` | 10% from peak | same | assumed | TDK example | — |
| `marginRisk.capWait` | < 3 | < 3 | assumed | Module 6 | — |
| `marginRisk.capAvoid` | < 2 | < 2 | assumed | Module 6 | — |
| `sizing.riskPerTrade` | 1–2% | same | assumed | | — |
| `sizing.lot` | 1 | 100 | assumed | TSE unit | — |
| `portfolio.themeCap` | 30% | 30% | assumed | | — |
| Japan sector gates | — | per sector | current | `TOPIX_SECTOR_THRESHOLDS` | `japanFilter.ts` |
| Industry benchmarks | per sector | per sector | current | | `benchmarks/industries.ts` |

---

## 7. Build order once approved

1. ~~`params.ts` with today's values only~~ — done 2026-10-25 (weights, thresholds, MoS steps, confidence, DCF defaults; per-metric steps still inline).
2. Verdict log (ticker, date, inputs, scores, verdict) — needed by hysteresis and the backtest.
3. Backtest harness + fixtures: TDK Oct 2026 peak, MHI/KHI 2026 decline, Nikkei Oct 2026 drop.
4. Split into Quality / Value / Expectations and add gates 0–3 behind a flag; compare old vs new verdicts on the fixture set and on the Nikkei universe before switching.
5. Gates 4–7, then position and portfolio layers.

---

## 8. Owner decisions (2026-10-25)

1. **Quality gate:** failing it caps at **WAIT in both modes**. Quality Compounder uses a higher floor, not a harsher result.
2. **Japan REJECT:** split by gate. Business-quality hard fails (D/E, ROE, shareholder return, revenue growth) → **AVOID**. Valuation hard fails (P/E, PEG) → cap at **WAIT**.
3. **Display:** keep the blended overall number, with the three scores beneath it.
4. **Japan DCF:** use the live JGB 10-year yield for `.T` tickers, with a fixed fallback (~2%) when unavailable.

**Still open:** where the verdict log lives (needs persistence; there is none today). Needed before build step 2.

---

## 9. Factor review and model v1 proposal (DRAFT, 2026-10-25)

Owner goal: one model that uses everything that matters (company numbers, valuation, technicals, news, macro, rates and central banks, currencies, tax) and makes money over 6–24 month holds.

**What "works" means here.** No model can promise profits. The target we can measure: over rolling periods, the stocks the model calls BUY beat simply holding the index (TOPIX for Japan, S&P 500 for US) **after costs and tax**, with smaller drawdowns. If it can't, the honest answer is the index fund. Every factor below earns its place only if the backtest (§7 step 3) or the forward log shows it helps.

### 9.1 Problems in today's code (fix first; these change live verdicts)

| # | Problem | Where | Effect today |
|---|---|---|---|
| P1 | Macro uses **absolute index levels** (S&P > 5,000 = bullish, Nikkei > 38,000 = bullish). Index levels drift up over time, so these read "bullish" permanently (S&P ~7,700, Nikkei ~64,900). | `macroScore.ts`, `macroRegime.ts` | Regime leans risk-on regardless of conditions |
| P2 | `macroRegime.marginOfSafetyBonus` is **never used** by the verdict. The design says "new BUY verdicts need a 25% margin of safety", but the engine doesn't apply it. | `verdictEngine.ts` | A caution regime changes no verdict |
| P3 | Interest rates are fetched (`^TNX`) but **not used**. The DCF risk-free rate is a fixed 4.5% for every stock, Japan included (live JGB decided in §8.4, not built). | `params.ts` `dcf.riskFreeRate` | Fair values ignore rate moves; Japanese fair values too low |
| P4 | USD/JPY scores the **same for every stock**. A weak yen helps exporters (Toyota, TDK) and hurts importers. | `macroScore.ts` | Currency effect has the wrong sign for many stocks |
| P5 | The technical score mixes **opposite ideas**: oversold +2 and near 52-week low +1 (buy the dip) with below 200-day average −1.5 (follow the trend). They partly cancel. | `verdictEngine.ts` | Technical score is mostly noise |
| P6 | News is a **keyword count** on English headlines ("deal" +, "debt" −). | `newsService.ts` | Weak signal; fine at 6%, shouldn't grow |
| P7 | Overall is a weighted average of scores that all start at 5: BUY (> 7) needs nearly everything good, and very poor Health can be hidden by great Value. | `verdictEngine.ts` | Addressed by the gates in §3 |
| P8 | The FCF-based DCF doesn't fit many large Japanese companies. Live check 2026-10-25: no fair value at all for Toyota, TDK, KHI, MUFG, SoftBank (negative or missing FCF: finance arms, banks, holding companies); fair value ~4× the price for MHI and Sony (one-off cash flows, e.g. defense advance payments, Sony's financial arm). | `dcfAdvanced.ts` | Valuation score runs without MoS, or with a maxed-out MoS that means nothing |

| P9 | Sector benchmark keys ("Auto Manufacturing", "Telecom"…) didn't match Yahoo's sector names ("Consumer Cyclical", "Communication Services"…), so most stocks were scored against the generic default bands. Same in the Japan gate thresholds. | `benchmarks/industries.ts`, `japanFilter.ts` | Wrong P/E, ROE, margin and D/E bands for e.g. Toyota, SoftBank |
| P10 | `balanceSheet.shareholderEquity` from the quoteSummary snapshot is 0 for every ticker (statement history has the right values). | `yahooFinance.ts` | Buffett fair value and Graham book value missing; fallback ROE and D/E can't be computed |

**Status:**
- P1–P3 fixed 2026-10-25: trend-based regime (`regime` params); MoS bonus applied via `requiredMosBonus`; live US 10Y and MoF JGB 10Y in the DCF (`dcf.riskFreeRateJp` fallback); terminal growth capped at the risk-free rate.
- P8 fixed 2026-10-25 (`formulas/fairValue.ts`): cash-flow base averaged over 4 years; earnings after reinvestment when FCF ÷ earnings is outside 0.5–1.5 (no net-debt subtraction on that basis); P/B–ROE for Financial Services; beta floor 0.8; fair value capped at 1.5 × EPS × sector fair P/E (cap only; raising invented bargains, e.g. SoftBank). Details in [CALCULATIONS.md](CALCULATIONS.md) §5.
- P9 fixed 2026-10-25: `resolveSectorKey` maps Yahoo industry first, then sector, then sector alias, for both tables. Industrials and Basic Materials still have no own set.
- P10 open.
- Data to verify: Yahoo data for 8766.T (Tokio Marine) looked inconsistent on 2026-10-25 (price ¥572, 28.2 B shares).

### 9.2 Factor map

Rule of thumb: **company numbers decide the score; market conditions decide how strict we are; technicals and events decide timing.** Macro, rates and events act as caps and required margin of safety, not averaged points (as §2.1 says).

| Factor | Layer | Role in model v1 | Data |
|---|---|---|---|
| **Quality**: ROE/ROIC level and 5-year stability, margin trend, FCF ÷ net income (earnings quality), net debt ÷ EBITDA, interest cover, share dilution | Quality score | Main input. Five steady years count more than one good year. Dilution > 3%/yr is a red flag (e.g. KHI) | Yahoo statements (4–5 years) |
| **Japan specifics**: 6 TOPIX gates, net cash, P/B < 1 under TSE reform pressure, shareholder returns | Quality + gates | Existing gates (§8.2); net cash credit in Health | Yahoo |
| **Valuation**: DCF margin of safety (primary), P/E vs the stock's own 5-year range, EV/EBIT vs sector, PEG | Value score | MoS stays the main driver; own-history P/E replaces fixed sector bands where data exists | Yahoo |
| **Interest rates** (Fed, BoJ, hikes) | DCF + market layer | (a) **Live 10-year yield in the DCF**: US 10Y for US stocks, JGB 10Y for `.T`, so rate moves reprice fair values directly. (b) Rate direction: 10Y up > 0.5 pt in 3 months → stricter regime. (c) Curve 10Y − 3M inverted → stricter regime | `^TNX`, `^IRX`; JGB from Japan MoF daily CSV |
| **Events**: FOMC, BoJ, CPI, jobs, the company's results date | Market layer (eventRisk) | No points. Within N sessions of a high-impact event or results: warning on new BUY, position size halved (portfolio layer) | Existing calendar data |
| **Market regime** | Market layer | Replace index levels (P1) with **trend**: index vs 200-day average, drawdown from 52-week high, VIX, credit stress (HYG ÷ LQD trend). risk-on / neutral / risk-off → +0 / +5 / +10 pt required MoS (fixes P2) | Yahoo prices |
| **Currencies** | Stock + portfolio layer | (a) Per-stock **FX sensitivity** from 2 years of weekly returns vs USD/JPY (exporter vs importer), replacing the flat score (P4). (b) Extreme yen moves raise risk for high-sensitivity stocks. (c) Show US stock returns in JPY for a yen-based investor | `JPY=X` + price history |
| **Technicals** | Expectations + timing | Split by purpose (fixes P5): **trend** (vs 200-day) and **12-month momentum excluding the last month** feed Expectations; **overheating** (RSI > 80, > 20% run-up in 10 sessions, volume spike) caps at WAIT (gate 5); **oversold** only flags "possible entry" when Quality and Value already pass | Price history |
| **Analyst expectations**: estimate revisions (up vs down, 30 days), earnings surprises, target gap | Expectations | Revisions are among the better-documented signals; add before growing news | Yahoo `earningsTrend`, `earningsHistory` (not fetched yet) |
| **Priced-in check**: growth implied by the price (reverse DCF) vs analyst growth | Expectations | Feeds the "Is the good news already in the price?" card | Derived |
| **News** | Expectations (small) + flags | Sentiment ≤ 5%. Add **event flags** instead of points: share offering, guidance cut, scandal, M&A. Flags show as reasons and can cap | Yahoo news |
| **Tax** | Position + portfolio layer only | See 9.3 | Owner's account types |

### 9.3 Tax (assumes a Japan tax resident; owner to confirm)

Tax doesn't make a stock better or worse, so it stays out of BUY / WAIT / AVOID. It changes what a decision is worth to the user:
- Taxable account: gains and dividends taxed at 20.315%. Switching from a winner costs that tax now, so a replacement must clear a higher bar. Position layer shows "after-tax gain if you sell today".
- NISA: tax-free, but losses can't offset other gains, and the 10% US withholding on US dividends can't be reclaimed. Placement hint (information only): growth stocks suit NISA better than US dividend payers.
- December: list positions with unrealised losses (possible offset against realised gains). A reminder, not advice.
- The app states rules; it doesn't give tax advice. Details to be checked with a tax adviser.

### 9.4 How we find out if it works

1. **Price-only signals first** (trend, momentum, overheating, regime): Yahoo has 20+ years of prices, so these can be tested properly now. Fixtures from §7.
2. **Fundamental signals need point-in-time history.** Yahoo gives ~4–5 years and only today's listed companies (survivorship bias). Options: SEC EDGAR company facts (free, US) and JPX J-Quants (Japan, paid plans). Owner decision.
3. **Forward test from day one:** every verdict goes into the verdict log; each month compare the BUY list with the index. The one test that can't be overfitted.
4. **Against overfitting:** few parameters, fit on one period and check on a later one, prefer rules with outside evidence (value, quality, momentum, revisions).
5. **Success bar** (proposal): BUY basket beats the benchmark by ≥ 2 pt/year after costs and tax over rolling 3-year windows, with max drawdown no worse than the index.

### 9.5 Proposed order (replaces §7 steps 2–5 once approved)

1. ~~**Fix P1–P3, P8, P9**~~ (done 2026-10-25). Then P10 (equity from statement history) and benchmark sets for Industrials and Basic Materials.
2. Verdict log (storage still open), so forward testing starts early.
3. Backtest harness with price-only signals.
4. Quality / Value / Expectations split + gates 0–3 behind a flag (§3), with revisions, FX sensitivity, own-history P/E.
5. Point-in-time fundamentals source and the fundamental backtest.
6. Gates 4–7, position layer (incl. tax), portfolio layer.

### 9.6 Owner decisions (2026-10-25)
1. **Approved:** factor map (9.2) and order (9.5). Start with P1–P3.
2. **Tax:** Japan resident. Uses NISA up to its limit; anything above goes to a taxable account. So the position layer needs the account type per position (NISA / taxable), and tax effects apply only to the taxable part.
3. **Home currency:** JPY. Show US stock returns in yen.
4. **Japan first.** US data (EDGAR) and US-specific work wait until Japan works. Source for point-in-time Japanese fundamentals still to choose (J-Quants or other).
5. **Success bar** (left to Claude): Japan BUY basket beats **TOPIX total return** by ≥ 2 pt/year after costs over rolling 3-year windows, with max drawdown no worse than TOPIX. Tax is ~0 inside NISA, so measure before tax first and check the taxable case separately.
