# KabuCheck database (ER diagram)

> Status: **approved by the owner 2026-11-19** (§3). Step-5 tables **built** in `src/lib/db/` (not yet called by the routes). Rules as built: CALCULATIONS.md §8.
> Engine: SQLite (one file in the project, no server), behind a small TypeScript interface so it can move to a hosted database (e.g. Postgres) when sign-in and multiple devices arrive. ENGINE_SPEC §10.3 step 5.

## 1. Diagram

**Step 5 builds the four tables at the top** (verdict log). The rest is drawn now so the structure won't need to change later; it is built with the watchlist, alerts and position features.

```mermaid
erDiagram
    stocks ||--o{ verdicts : "is judged in"
    engine_versions ||--o{ verdicts : "produced"
    verdicts ||--|| verdict_inputs : "was based on"

    stocks ||--o{ watchlist_items : "is followed in"
    stocks ||--o{ positions : "is held in"
    positions ||--o{ position_sales : "is sold in"
    stocks ||--o{ alert_rules : "is watched by"
    alert_rules ||--o{ alerts : "fires"
    positions |o--o{ alerts : "concerns"
    verdicts |o--o{ alerts : "triggered by"

    stocks {
        text ticker PK "7203.T, AAPL"
        text name
        text market "JP or US"
        text sector
        text industry
        text currency "price currency"
        text financial_currency "statement currency (ADRs differ)"
        datetime updated_at
    }

    engine_versions {
        integer id PK
        text params_hash UK "hash of params.ts values"
        text params_json "full DEFAULT_ENGINE_PARAMS"
        text app_version "git commit"
        datetime created_at
    }

    verdicts {
        integer id PK
        text ticker FK
        integer engine_version_id FK
        datetime created_at
        date data_as_of "price date"
        text source "full or screener"
        real price
        text recommendation "BUY WAIT AVOID"
        real score_overall
        integer confidence
        real score_valuation
        real score_financials
        real score_health
        real score_technical
        real score_macro
        real score_news
        real fair_value "null when none"
        real fair_value_bear
        real fair_value_bull
        text fair_value_method "dcf-fcf dcf-earnings pb-roe"
        text fair_value_note "capped, currency-mismatch, non-operating-earnings"
        real suggested_buy
        real reward_to_risk
        text regime "risk-on neutral risk-off"
        real regime_mos_bonus "extra discount the regime asked for"
        text missing_data_json
        text reasons_json "for and against"
    }

    verdict_inputs {
        integer verdict_id PK,FK
        text financials_json
        text balance_sheet_json
        text dcf_json
        text technicals_json
        text macro_json
    }

    watchlist_items {
        integer id PK
        text ticker FK
        datetime added_at
        text notes
        text tags_json
    }

    positions {
        integer id PK
        text ticker FK
        text account "NISA or taxable"
        real buy_price
        integer shares
        date bought_on
        real peak_price "for the trailing stop"
        text status "open or closed"
        date closed_on
    }

    position_sales {
        integer id PK
        integer position_id FK
        date sold_on
        integer shares
        real price
    }

    user_rules {
        integer id PK "single row for now"
        text mode "value-hunter quality-compounder"
        real stop_loss_pct "0.15"
        real trailing_stop_pct "0.10"
        text take_profit_json "steps"
        real theme_limit_pct "0.30"
        real max_stock_pct
        text language "en ja pt"
        datetime updated_at
    }

    alert_rules {
        integer id PK
        text ticker FK
        text type "buy-level verdict-change results overheated stop"
        integer enabled
    }

    alerts {
        integer id PK
        integer alert_rule_id FK
        integer position_id FK "optional"
        integer verdict_id FK "optional"
        datetime triggered_at
        text message "your own rule, never 'sell now'"
        datetime read_at
    }
```

`user_rules` has no relations yet: there is one user. With sign-in, a `users` table arrives and `user_id` is added to `user_rules`, `watchlist_items`, `positions` and `alert_rules`.

### Research tables (added 2026-11-23)

| Table | Columns | Purpose |
|---|---|---|
| `company_research` | id, ticker, researched_at, model, research_json, cost_usd | Saved AI research per stock (CALCULATIONS §9); the newest is reused for 7 days |
| `api_usage` | id, at, purpose, ticker, model, input_tokens, output_tokens, web_searches, cost_usd, ok | Every paid API call, successful or not, for the budget guard and cost history |

`verdict_inputs` also has `research_json`: the research a verdict used.

## 2. Why it looks like this

| Choice | Reason |
|---|---|
| **Verdicts are never updated, only added** | The log is a decision journal (ENGINE_SPEC §10, principle 7): each verdict must stay exactly as it was, so it can be judged on what was known at the time. |
| **`engine_versions` table** | Each verdict records which parameter set produced it. When params change, old verdicts still say which rules they followed, and the backtest can compare versions. |
| **Inputs in a separate table (`verdict_inputs`)** | The raw data (financials, DCF, macro) is large and rarely read. Keeping it apart keeps the main log fast for lists and charts, while a verdict can still be re-checked or re-run later. |
| **Scores as columns, reasons as JSON** | Scores are filtered and charted (e.g. "all BUYs in October"), so they get columns. Reasons and missing data are only displayed, so JSON is enough. |
| **`source`: full or screener** | Screener verdicts are quick scores (no news, no price history). Both are useful, but must never be mixed up in the forward test. |
| **`account` on positions** | Owner decision §9.6.2: NISA first, taxable above the limit; tax effects apply only to the taxable part. |
| **`peak_price` on positions** | The trailing stop (the last part of the exit plan, §10.4.2) needs the highest price since buying. |

Indexes: `verdicts (ticker, created_at)` for "latest verdict per stock" (needed by hysteresis, ENGINE_SPEC §5) and `verdicts (created_at, recommendation)` for the monthly forward test against TOPIX.

## 3. Owner decisions (approved 2026-11-19)

1. **Approved:** step-5 tables `stocks`, `engine_versions`, `verdicts`, `verdict_inputs`.
2. **Log screener results too: yes**, with `source = screener`. Each scan then records the whole Nikkei list, which is the best data for the forward test (what did the model say about every stock, not only the ones you opened).
3. **Keep raw inputs: yes**, for now. At roughly 20–50 KB per verdict, even 100 verdicts a day is under 2 GB a year; revisit if it grows.
4. **File:** `data/kabucheck.db`, excluded from git (personal data and large).
