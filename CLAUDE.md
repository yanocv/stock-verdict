# KabuCheck (stock-verdict)

Next.js app that turns one ticker (US like `AAPL`, Tokyo like `7203` / `7203.T`) into a BUY / WAIT / AVOID verdict with score, confidence, fair value, exit levels and an AI summary in EN / JA / PT. Owner is a GARP investor (6–24 month holds) in the US and Japan.

## Read first

- **`docs/README.md` — docs-first phase (owner, 2026-11-19): coding is paused until the 11-document set listed there is written and approved. Work through it in order; don't change source code meanwhile.**
- `docs/PROJECT_SUMMARY_FOR_AI_AGENTS.md` — product, philosophy, progress
- `docs/CALCULATIONS.md` — how the system calculates everything today (as built), step by step
- `docs/DATABASE.md` — ER diagram (Mermaid) for the SQLite database: verdict log first, then watchlist, positions, rules, alerts
- `docs/ENGINE_SPEC.md` — source of truth for the verdict engine plans: current gaps, planned layers and gate order, owner decisions (§8, §9.6, §10.4), investing principles (§10), **the plan (§10.3)**
- `docs/docs_INVESTMENT_PHILOSOPHY.md`, `docs/docs_MASTER_PARAMETERS.md` — background only; where they disagree with ENGINE_SPEC or the code, ENGINE_SPEC and the code win

## Working rules (owner's preferences)

- Never commit and never push. Leave changes in the working tree; the owner reviews in VS Code and decides when to commit and push.
- `dev` is the working branch. `master` is stale; CI runs on `dev`, `master` and `main`.
- Before saying something is done, run lint, typecheck and tests.
- Changes that alter live verdicts must be called out so the owner can check real tickers.
- **Document every rule, as built, in the same change** (owner, 2026-11-19): calculations, thresholds, weights, verdict logic, alert triggers, risk measures, data sources and database behaviour. As-built rules → `docs/CALCULATIONS.md`; plans and owner decisions → `docs/ENGINE_SPEC.md`; tables → `docs/DATABASE.md`. A change that affects a result isn't done until the docs describe it, so the app's full logic is on paper if it is ever launched.
- Phrase alerts as risk levels and the user's own rules ("your 10% trailing stop was hit"), never "sell now" (Japan FIEA / advisory rules).

## Commands

Node 24 (see `engines`).

```sh
npm ci
npm run dev
npm run lint        # eslint . (flat config; 0 errors, 2 known set-state-in-effect warnings)
npm run typecheck
npm run test:run    # vitest; 375 tests as of 2026-11-19
```

Env: copy `.env.example` → `.env.local`. `ANTHROPIC_API_KEY` is optional (AI summary is skipped without it); `ANTHROPIC_MODEL` defaults to `claude-haiku-5-5`.

## Code map

- Verdict engine: `src/lib/scoring/verdictEngine.ts`; weights and thresholds in `src/lib/scoring/params.ts` (`DEFAULT_ENGINE_PARAMS`; pass `engineParams` to override, e.g. in a backtest)
- Lenses and filters: `scoring/buffettScore.ts`, `grahamScore.ts`, `lynchScore.ts`, `japanFilter.ts` (6 TOPIX gates), `macroRegime.ts`, `macroScore.ts`
- Formulas: `src/lib/formulas/` — `fairValue.ts` (`estimateFairValue`: method choice, P/B–ROE for financials, sanity cap; the fair value the verdict uses), `dcfAdvanced.ts` (`runAdvancedDCFForStock`, cash-flow base, risk-free rate per market, growth estimate + fade, ADR currency check), `indexTrend.ts`, `valuation.ts`, `rsi.ts`, `health.ts`, `ratios.ts`
- Database: `src/lib/db/` — `schema.ts`, `verdictLog.ts` (`openVerdictLog`, append-only verdict log on Node's built-in `node:sqlite`; file `data/kabucheck.db`, git-ignored)
- Sector bands: `src/lib/benchmarks/industries.ts` (`resolveSectorKey` maps Yahoo industry/sector names; shared with the Japan gates)
- Data (Yahoo Finance, unofficial): `src/lib/services/yahooFinance.ts`, `financialHistoryService.ts`, `macroService.ts`, `newsService.ts`, `claudeService.ts`
- API: `src/app/api/stock/[ticker]` (full analysis), `screener` (Nikkei universe, quick scores: no news, no price history), `debug/*` (404 in production)
- UI: `src/components/verdict/*`; i18n strings in `src/messages/{en,ja,pt}/common.json` — add every new string in all three

## Conventions

- Lint enforces braces on every `if`, `import type` for types, `===` (except `== null`), no `any`
- Missing data is `null` and must stay neutral in scoring; it lowers confidence and is listed in `verdict.missingData`
- Per-share fair value: use `estimateFairValue(...).value` (not `dcfAnalysis.baseCase` directly); never mix statement currency and price currency (`getCurrencyMismatch`)
- Tests that hit live Yahoo need `// @vitest-environment node` (the default jsdom environment blocks the requests with CORS)
- Tests sit next to the code (`*.test.ts`)
- On Windows, run vitest from the path with an uppercase drive letter (`C:/Users/...`). From `c:/...` every suite fails with "Cannot read properties of undefined (reading 'config')" because vitest gets loaded twice
- Balance sheet: use `completeBalanceSheet(stockData.balanceSheet, history)`; the raw snapshot has 0 for equity, assets and liabilities

## State (2026-10-25)

Done: lint fixed for Next 16; debug routes gated; model ID in env; technicals + DCF now feed the verdict; screener per-share fair value fixed; DCF growth = median of FCF CAGR / revenue CAGR / EPS growth, faded to terminal, capped 15%; missing data neutral + confidence penalty; ADR currency mismatch suppresses fair values; `params.ts`; ENGINE_SPEC v0.3 (§9 model proposal, owner decisions in §9.6: Japan first, NISA, JPY); §9 P1–P3, P8, P9 fixed (trend-based market regime; regime margin-of-safety bonus applied; live US 10Y and MoF JGB 10Y in the DCF; fair value by company type from current earnings (trailing EPS blended with analyst estimate) × cash conversion, earnings basis, P/B–ROE for financials, beta floor, sanity cap; conservative growth (inputs clipped, shrunk halfway to long-run); Yahoo sector/industry names mapped to benchmark sets incl. Industrials and Basic Materials; verdict decided on the displayed score); `docs/CALCULATIONS.md` written; investing principles (Graham + Housel) mapped in ENGINE_SPEC §10. Plan: ENGINE_SPEC §10.3. Owner approved §10 (P11–P14, exit plan with trailing stop on the last part, 2 : 1 reward-to-risk, SQLite for the verdict log); docs updated, source code not yet except P15 (no fair value when profit isn't from operations, e.g. SoftBank). P10 done 2026-11-15 (balance sheet completed from statement history; Graham book value per share and Buffett lens fair value fixed). P11 closed with no change 2026-11-19 (TOPIX implies ~7.5% cost of equity; model already at or above it). P12 done 2026-11-19 (bear/base/bull fair values shown as a range). P13 done 2026-11-19 (BUY needs reward ÷ risk ≥ 2 against the bear value or the 15% stop). ORIX fixed (P/B–ROE uses lower of latest and 4-year average ROE). P14 done 2026-11-19 (extra 5 pt discount when the fair value is uncertain). Next per ENGINE_SPEC §10.3: step 5, verdict log in SQLite (decision journal). Owner approved DATABASE.md and moved portfolio + rules + alerts (5b) and falling-knife + risk (5c) ahead of the backtest. Verdict log built in src/lib/db (2026-11-19), not yet called by the routes. Then the owner paused coding for a docs-first phase (docs/README.md); English, Markdown + Excel for table-heavy docs.

Not verified against live data: Yahoo's `financialData.financialCurrency` for ADRs (e.g. TSM should be TWD).

## Next

The plan and its status live in `docs/ENGINE_SPEC.md` §10.3 (approved by the owner). In short: verdict log in SQLite (decision journal) → backtest harness (price-only signals first) → Quality / Value / Expectations split with gates → position and portfolio layers.

Diagrams (owner request, 2026-10-25):
- ER diagram: draw it when the database and backend work starts (verdict log, watchlist, positions, alerts, rules). Desktop UI designs are in `docs/design/`.
- Business flow diagram: draw it at the end of the project.

Housekeeping still open: make `dev` the default branch (GitHub settings), merge old docs into one source of truth, refresh pitch deck, verify KOSPI figures in MASTER_PARAMETERS Module 6, label screener results as "quick scores".
