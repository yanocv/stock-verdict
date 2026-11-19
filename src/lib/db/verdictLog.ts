import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Verdict, VerdictRecommendation } from '@/types';
import type { EngineParams } from '@/lib/scoring/params';
import { isJapaneseTicker } from '@/lib/scoring/japanFilter';
import { SCHEMA } from './schema';

/** Default database file (excluded from git). */
export const DEFAULT_DB_PATH = 'data/kabucheck.db';

/** Everything recorded for one verdict. */
export interface VerdictLogEntry {
  stock: {
    ticker: string;
    name: string;
    sector: string;
    industry: string;
    currency: string;
    financialCurrency: string;
  };
  source: 'full' | 'screener';
  price: number;
  /** Date of the price the verdict used (YYYY-MM-DD), when known */
  dataAsOf: string | null;
  verdict: Verdict;
  fairValue: {
    bear: number | null;
    bull: number | null;
    method: string | null;
    /** 'capped', 'currency-mismatch' or 'non-operating-earnings' */
    note: string | null;
  };
  regime: string | null;
  /** Extra discount the market regime asked for (decimal) */
  regimeMosBonus: number | null;
  params: EngineParams;
  /** Git commit or app version, when known */
  appVersion?: string | null;
  /** Raw inputs, stored as JSON for re-checking later */
  inputs: {
    financials?: unknown;
    balanceSheet?: unknown;
    dcf?: unknown;
    technicals?: unknown;
    macro?: unknown;
  };
}

/** A logged verdict as read back (main columns; raw inputs stay in verdict_inputs). */
export interface StoredVerdict {
  id: number;
  ticker: string;
  createdAt: string;
  source: 'full' | 'screener';
  price: number;
  recommendation: VerdictRecommendation;
  scoreOverall: number;
  confidence: number;
  fairValue: number | null;
  fairValueBear: number | null;
  fairValueBull: number | null;
  rewardToRisk: number | null;
  engineVersionId: number;
}

/**
 * The verdict log, as an interface so SQLite can later be swapped for a
 * hosted database without touching callers.
 */
export interface VerdictLog {
  /** Appends a verdict; returns its id. Verdicts are never changed afterwards. */
  save(entry: VerdictLogEntry): number;
  /** Most recent verdict for a ticker, optionally of one source. */
  latest(ticker: string, source?: 'full' | 'screener'): StoredVerdict | null;
  /** Verdicts, newest first. */
  list(filter?: { ticker?: string; since?: string; source?: 'full' | 'screener'; limit?: number }): StoredVerdict[];
  close(): void;
}

/** Stable hash of the parameter set, so identical params share one engine version. */
export function hashParams(params: EngineParams): string {
  return createHash('sha256').update(JSON.stringify(params)).digest('hex').slice(0, 16);
}

const json = (v: unknown): string | null => (v === undefined ? null : JSON.stringify(v));

/** Opens (and creates if needed) a SQLite verdict log. Pass ':memory:' for tests. */
export function openVerdictLog(path: string = DEFAULT_DB_PATH, now: () => Date = () => new Date()): VerdictLog {
  if (path !== ':memory:') {mkdirSync(dirname(path), { recursive: true });}
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);

  const upsertStock = db.prepare(`
    INSERT INTO stocks (ticker, name, market, sector, industry, currency, financial_currency, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (ticker) DO UPDATE SET name = excluded.name, sector = excluded.sector,
      industry = excluded.industry, currency = excluded.currency,
      financial_currency = excluded.financial_currency, updated_at = excluded.updated_at`);
  const findVersion = db.prepare('SELECT id FROM engine_versions WHERE params_hash = ?');
  const insertVersion = db.prepare(
    'INSERT INTO engine_versions (params_hash, params_json, app_version, created_at) VALUES (?, ?, ?, ?)'
  );
  const insertVerdict = db.prepare(`
    INSERT INTO verdicts (ticker, engine_version_id, created_at, data_as_of, source, price, recommendation,
      score_overall, confidence, score_valuation, score_financials, score_health, score_technical,
      score_macro, score_news, fair_value, fair_value_bear, fair_value_bull, fair_value_method,
      fair_value_note, suggested_buy, reward_to_risk, regime, regime_mos_bonus, missing_data_json, reasons_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertInputs = db.prepare(`
    INSERT INTO verdict_inputs (verdict_id, financials_json, balance_sheet_json, dcf_json, technicals_json, macro_json)
    VALUES (?, ?, ?, ?, ?, ?)`);

  const engineVersionId = (params: EngineParams, appVersion: string | null, at: string): number => {
    const hash = hashParams(params);
    const found = findVersion.get(hash) as { id: number } | undefined;
    if (found) {return found.id;}
    return Number(insertVersion.run(hash, JSON.stringify(params), appVersion, at).lastInsertRowid);
  };

  const toStored = (r: Record<string, unknown>): StoredVerdict => ({
    id: Number(r.id),
    ticker: String(r.ticker),
    createdAt: String(r.created_at),
    source: r.source as StoredVerdict['source'],
    price: Number(r.price),
    recommendation: r.recommendation as VerdictRecommendation,
    scoreOverall: Number(r.score_overall),
    confidence: Number(r.confidence),
    fairValue: r.fair_value === null ? null : Number(r.fair_value),
    fairValueBear: r.fair_value_bear === null ? null : Number(r.fair_value_bear),
    fairValueBull: r.fair_value_bull === null ? null : Number(r.fair_value_bull),
    rewardToRisk: r.reward_to_risk === null ? null : Number(r.reward_to_risk),
    engineVersionId: Number(r.engine_version_id),
  });

  return {
    save(entry) {
      const at = now().toISOString();
      const { stock, verdict: v, fairValue: fv } = entry;
      db.exec('BEGIN');
      try {
        upsertStock.run(
          stock.ticker, stock.name, isJapaneseTicker(stock.ticker) ? 'JP' : 'US', stock.sector,
          stock.industry, stock.currency, stock.financialCurrency, at
        );
        const versionId = engineVersionId(entry.params, entry.appVersion ?? null, at);
        const id = Number(
          insertVerdict.run(
            stock.ticker, versionId, at, entry.dataAsOf, entry.source, entry.price, v.recommendation,
            v.scores.overall, v.confidence, v.scores.valuation, v.scores.financials, v.scores.health,
            v.scores.technical, v.scores.macro, v.scores.news, v.fairValue, fv.bear, fv.bull, fv.method,
            fv.note, v.suggestedBuyPrice, v.rewardToRisk ?? null, entry.regime, entry.regimeMosBonus,
            JSON.stringify(v.missingData), JSON.stringify(v.reasons)
          ).lastInsertRowid
        );
        const i = entry.inputs;
        insertInputs.run(id, json(i.financials), json(i.balanceSheet), json(i.dcf), json(i.technicals), json(i.macro));
        db.exec('COMMIT');
        return id;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },

    latest(ticker, source) {
      const row = source
        ? db.prepare('SELECT * FROM verdicts WHERE ticker = ? AND source = ? ORDER BY created_at DESC, id DESC LIMIT 1').get(ticker, source)
        : db.prepare('SELECT * FROM verdicts WHERE ticker = ? ORDER BY created_at DESC, id DESC LIMIT 1').get(ticker);
      return row ? toStored(row as Record<string, unknown>) : null;
    },

    list(filter = {}) {
      const where: string[] = [];
      const args: Array<string | number> = [];
      if (filter.ticker) {where.push('ticker = ?'); args.push(filter.ticker);}
      if (filter.source) {where.push('source = ?'); args.push(filter.source);}
      if (filter.since) {where.push('created_at >= ?'); args.push(filter.since);}
      const sql = `SELECT * FROM verdicts ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY created_at DESC, id DESC LIMIT ?`;
      args.push(filter.limit ?? 1000);
      return (db.prepare(sql).all(...args) as Array<Record<string, unknown>>).map(toStored);
    },

    close() {
      db.close();
    },
  };
}
