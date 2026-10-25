# KabuCheck (stock-verdict)

Next.js app that turns one ticker (US like `AAPL`, Tokyo like `7203` / `7203.T`) into a BUY / WAIT / AVOID verdict with score, confidence, fair value, exit levels and an AI summary in EN / JA / PT. Owner is a GARP investor (6–24 month holds) in the US and Japan.

## Read first

- `docs/PROJECT_SUMMARY_FOR_AI_AGENTS.md` — product, philosophy, progress
- `docs/CALCULATIONS.md` — how the system calculates everything today (as built), step by step
- `docs/ENGINE_SPEC.md` — source of truth for the verdict engine plans: current gaps, planned layers and gate order, owner decisions (§8, §9.6), parameter table, build order (§7, §9.5)
- `docs/docs_INVESTMENT_PHILOSOPHY.md`, `docs/docs_MASTER_PARAMETERS.md` — background only; where they disagree with ENGINE_SPEC or the code, ENGINE_SPEC and the code win

## Working rules (owner's preferences)

- Never commit and never push. Leave changes in the working tree; the owner reviews in VS Code and decides when to commit and push.
- `dev` is the working branch. `master` is stale; CI runs on `dev`, `master` and `main`.
- Before saying something is done, run lint, typecheck and tests.
- Changes that alter live verdicts must be called out so the owner can check real tickers.
- Any change to a calculation, threshold, weight or data source updates `docs/CALCULATIONS.md` in the same change.
- Phrase alerts as risk levels and the user's own rules ("your 10% trailing stop was hit"), never "sell now" (Japan FIEA / advisory rules).

## Commands

Node 24 (see `engines`).

```sh
npm ci
npm run dev
npm run lint        # eslint . (flat config; 0 errors, 2 known set-state-in-effect warnings)
npm run typecheck
npm run test:run    # vitest; 339 tests as of 2026-10-25
```

Env: copy `.env.example` → `.env.local`. `ANTHROPIC_API_KEY` is optional (AI summary is skipped without it); `ANTHROPIC_MODEL` defaults to `claude-haiku-5-5`.

## Code map

- Verdict engine: `src/lib/scoring/verdictEngine.ts`; weights and thresholds in `src/lib/scoring/params.ts` (`DEFAULT_ENGINE_PARAMS`; pass `engineParams` to override, e.g. in a backtest)
- Lenses and filters: `scoring/buffettScore.ts`, `grahamScore.ts`, `lynchScore.ts`, `japanFilter.ts` (6 TOPIX gates), `macroRegime.ts`, `macroScore.ts`
- Formulas: `src/lib/formulas/` — `fairValue.ts` (`estimateFairValue`: method choice, P/B–ROE for financials, sanity cap; the fair value the verdict uses), `dcfAdvanced.ts` (`runAdvancedDCFForStock`, cash-flow base, risk-free rate per market, growth estimate + fade, ADR currency check), `indexTrend.ts`, `valuation.ts`, `rsi.ts`, `health.ts`, `ratios.ts`
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

## State (2026-10-25)

Done: lint fixed for Next 16; debug routes gated; model ID in env; technicals + DCF now feed the verdict; screener per-share fair value fixed; DCF growth = median of FCF CAGR / revenue CAGR / EPS growth, faded to terminal, capped 15%; missing data neutral + confidence penalty; ADR currency mismatch suppresses fair values; `params.ts`; ENGINE_SPEC v0.3 (§9 model proposal, owner decisions in §9.6: Japan first, NISA, JPY); §9 P1–P3, P8, P9 fixed (trend-based market regime; regime margin-of-safety bonus applied; live US 10Y and MoF JGB 10Y in the DCF; fair value by company type with averaged cash flow, earnings basis, P/B–ROE for financials, beta floor, sanity cap; Yahoo sector/industry names mapped to benchmark sets); `docs/CALCULATIONS.md` written. Next: §9 P10 (shareholder equity 0 in the balance-sheet snapshot), then the verdict log (storage decision still open).

Not verified against live data: Yahoo's `financialData.financialCurrency` for ADRs (e.g. TSM should be TWD).

## Next (ENGINE_SPEC §7)

1. Verdict log (ticker, date, inputs, scores, verdict). Open decision: storage. Recommended: SQLite behind a small interface, movable to a hosted DB later. **Ask the owner before building.**
2. Backtest harness: price history + signal functions + hit-rate report. Fixtures: TDK Oct 2026 peak, MHI/KHI 2026 decline, Nikkei Oct 2026 drop (details in the original handoff). Run the overheating signal first.
3. Split scoring into Quality / Value / Expectations and add gates 0–3 behind a flag; compare old vs new verdicts before switching.
4. Japan DCF: live JGB 10Y risk-free rate (fallback ~2%) for `.T` tickers.

Diagrams (owner request, 2026-10-25):
- ER diagram: draw it when the database and backend work starts (verdict log, watchlist, positions, alerts, rules). Desktop UI designs are in `docs/design/`.
- Business flow diagram: draw it at the end of the project.

Housekeeping still open: make `dev` the default branch (GitHub settings), merge old docs into one source of truth, refresh pitch deck, verify KOSPI figures in MASTER_PARAMETERS Module 6, label screener results as "quick scores".
