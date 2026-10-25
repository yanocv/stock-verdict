# KabuCheck Verdict Engine — Spec (DRAFT, awaiting owner approval)

> Status: **draft v0.1, 2026-10-25.** Proposes the layer structure and gate order. Nothing here is built yet except what §1 describes as current.
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
| 1 | Hard disqualifiers | Japan filter `REJECT`; or FCF < 0 **and** D/E above sector "high" | **AVOID** |
| 2 | Quality gate | Quality < `quality.min` (mode-specific) | At most **WAIT** (Mode 1) / **AVOID** (Mode 2) |
| 3 | Value decision | BUY needs Value ≥ `value.buyMin` **and** margin of safety ≥ `mos.base + regime bonus` | Otherwise WAIT; Value < `value.avoidMax` → AVOID |
| 4 | Market caps | marginRisk < 3 → at most WAIT; < 2 → AVOID. Risk-off → mode 1 BUY needs Quality ≥ `quality.strong` | Cap |
| 5 | Expectations caps | Expectations ≥ `expectations.cap` (priced-in / overheating) | At most **WAIT** ("good business, price already assumes it") |
| 6 | Reward-to-risk | (fair value − price) / (price − stop) < 2 | At most **WAIT** |
| 7 | Stability | Hysteresis (§5) against the last published verdict for this ticker | Keep previous verdict inside the band |

The mode decides how Quality and Value combine at step 3:
- **Value Hunter (default):** passes step 2 at a moderate quality floor, then decides on Value.
- **Quality Compounder:** high quality floor at step 2; step 3 uses Value only as a sanity floor (not "cheap", just "not absurd").

A single blended "overall" score is still shown (users expect a number), but it is **output, not the decision**: `overall = w_q·Quality + w_v·Value + w_e·(10 − Expectations)`, with mode weights.

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
| `weights.valuation` | 0.35 | 0.35 | current | GARP mode 1 priority | `verdictEngine.ts` |
| `weights.financials` | 0.20 | 0.20 | current | | `verdictEngine.ts` |
| `weights.health` | 0.20 | 0.20 | current | | `verdictEngine.ts` |
| `weights.technical` | 0.12 | 0.12 | current | | `verdictEngine.ts` |
| `weights.macro` | 0.07 | 0.07 | current → removed | becomes market layer | `verdictEngine.ts` |
| `weights.news` | 0.06 | 0.06 | current → Expectations | | `verdictEngine.ts` |
| `verdict.buyMin` | 7.0 | 7.0 | current | | `verdictEngine.ts` |
| `verdict.avoidMax` | 4.0 | 4.0 | current | | `verdictEngine.ts` |
| `verdict.hysteresis` | 0.3 | 0.3 | assumed | handoff §4 | — |
| `mos.steps` | +4 / +2.5 / +1 at 40/25/10% below; −1 / −3 at 10/30% above | same | current | | `verdictEngine.ts` |
| `mos.base` (BUY minimum) | 20% | 20% | assumed | INVESTMENT_PHILOSOPHY mode 1 | — |
| `mos.regimeBonus` | 0 / +5 / +10% | same | current (not applied) | risk-on / neutral / risk-off | `macroRegime.ts` |
| `suggestedBuy.factor` | 0.75 × fair value | same | current | | `verdictEngine.ts` |
| `dcf.riskFree` | 4.5% | **to review** (JGB ≪ UST) | current | single default for both markets | `dcfAdvanced.ts` |
| `dcf.equityRiskPremium` | 5.5% | 5.5% | current | | `dcfAdvanced.ts` |
| `dcf.terminalGrowth` | 3% | **to review** | current | | `dcfAdvanced.ts` |
| `dcf.growthClamp` | −5% … +15%, fading to terminal by year 10 | same | current | median of FCF CAGR, revenue CAGR, EPS growth | `dcfAdvanced.ts` |
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

1. `params.ts` with today's values only (pure refactor, tests unchanged) → `verdictEngine.ts` reads from it.
2. Verdict log (ticker, date, inputs, scores, verdict) — needed by hysteresis and the backtest.
3. Backtest harness + fixtures: TDK Oct 2026 peak, MHI/KHI 2026 decline, Nikkei Oct 2026 drop.
4. Split into Quality / Value / Expectations and add gates 0–3 behind a flag; compare old vs new verdicts on the fixture set and on the Nikkei universe before switching.
5. Gates 4–7, then position and portfolio layers.

---

## 8. Questions for the owner

1. Is the layer structure (§2) and gate order (§3) right? Especially: should Quality Compounder treat low quality as **AVOID** (proposed) or WAIT?
2. Should gate 1 treat Japan `REJECT` as AVOID, or only cap at WAIT? Today's REJECT includes P/E > 2× sector ceiling, which is a value signal, not a business-quality one.
3. Keep a blended "overall" number on screen, or show the three scores only?
4. Japan DCF uses a 4.5% risk-free rate (US-like). Use JGB 10Y for `.T` tickers?
5. Where should the verdict log live (needs persistence — currently there is none)?
