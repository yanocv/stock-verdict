/**
 * SQLite schema, step 5 of ENGINE_SPEC §10.3 (verdict log). Mirrors the
 * tables in docs/DATABASE.md; change both together.
 *
 * Dates are ISO-8601 text (UTC). JSON columns hold display-only detail.
 * Verdicts are append-only: triggers refuse UPDATE and DELETE, so the log
 * stays an honest decision journal. company_research caches AI research per
 * stock; api_usage records every paid API call for the budget guard.
 */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS stocks (
  ticker             TEXT PRIMARY KEY,
  name               TEXT,
  market             TEXT NOT NULL CHECK (market IN ('JP', 'US')),
  sector             TEXT,
  industry           TEXT,
  currency           TEXT,
  financial_currency TEXT,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS engine_versions (
  id          INTEGER PRIMARY KEY,
  params_hash TEXT NOT NULL UNIQUE,
  params_json TEXT NOT NULL,
  app_version TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS verdicts (
  id                INTEGER PRIMARY KEY,
  ticker            TEXT NOT NULL REFERENCES stocks (ticker),
  engine_version_id INTEGER NOT NULL REFERENCES engine_versions (id),
  created_at        TEXT NOT NULL,
  data_as_of        TEXT,
  source            TEXT NOT NULL CHECK (source IN ('full', 'screener')),
  price             REAL NOT NULL,
  recommendation    TEXT NOT NULL CHECK (recommendation IN ('BUY', 'WAIT', 'AVOID')),
  score_overall     REAL NOT NULL,
  confidence        INTEGER NOT NULL,
  score_valuation   REAL,
  score_financials  REAL,
  score_health      REAL,
  score_technical   REAL,
  score_macro       REAL,
  score_news        REAL,
  fair_value        REAL,
  fair_value_bear   REAL,
  fair_value_bull   REAL,
  fair_value_method TEXT,
  fair_value_note   TEXT,
  suggested_buy     REAL,
  reward_to_risk    REAL,
  regime            TEXT,
  regime_mos_bonus  REAL,
  missing_data_json TEXT NOT NULL,
  reasons_json      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS verdict_inputs (
  verdict_id         INTEGER PRIMARY KEY REFERENCES verdicts (id),
  financials_json    TEXT,
  balance_sheet_json TEXT,
  dcf_json           TEXT,
  technicals_json    TEXT,
  macro_json         TEXT,
  research_json      TEXT
);

CREATE TABLE IF NOT EXISTS company_research (
  id            INTEGER PRIMARY KEY,
  ticker        TEXT NOT NULL,
  researched_at TEXT NOT NULL,
  model         TEXT NOT NULL,
  research_json TEXT NOT NULL,
  cost_usd      REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS api_usage (
  id            INTEGER PRIMARY KEY,
  at            TEXT NOT NULL,
  purpose       TEXT NOT NULL,
  ticker        TEXT,
  model         TEXT,
  input_tokens  INTEGER,
  output_tokens INTEGER,
  web_searches  INTEGER,
  cost_usd      REAL NOT NULL,
  ok            INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS verdicts_by_ticker ON verdicts (ticker, created_at);
CREATE INDEX IF NOT EXISTS verdicts_by_date ON verdicts (created_at, recommendation);
CREATE INDEX IF NOT EXISTS research_by_ticker ON company_research (ticker, researched_at);
CREATE INDEX IF NOT EXISTS api_usage_by_time ON api_usage (at);

CREATE TRIGGER IF NOT EXISTS verdicts_append_only_update BEFORE UPDATE ON verdicts
BEGIN SELECT RAISE(ABORT, 'verdicts are append-only'); END;
CREATE TRIGGER IF NOT EXISTS verdicts_append_only_delete BEFORE DELETE ON verdicts
BEGIN SELECT RAISE(ABORT, 'verdicts are append-only'); END;
`;
