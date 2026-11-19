// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { Verdict } from '@/types';
import { DEFAULT_ENGINE_PARAMS } from '@/lib/scoring/params';
import { DatabaseSync } from 'node:sqlite';
import { openVerdictLog, hashParams, type VerdictLogEntry } from './verdictLog';
import { SCHEMA } from './schema';

const verdict: Verdict = {
  recommendation: 'WAIT',
  confidence: 58,
  scores: { overall: 6.5, financials: 3.5, valuation: 10, health: 6, technical: 3, macro: 6, news: 5 },
  fairValue: 4215,
  suggestedBuyPrice: 2950,
  reasons: { bullish: ['Upside vs downside is 5.7 : 1'], bearish: ['Negative or zero free cash flow'] },
  lynchCategory: 'stalwart',
  missingData: [],
  rewardToRisk: 5.7,
};

const entry = (over: Partial<VerdictLogEntry> = {}): VerdictLogEntry => ({
  stock: { ticker: '6762.T', name: 'TDK', sector: 'Technology', industry: 'Electronic Components', currency: 'JPY', financialCurrency: 'JPY' },
  source: 'full',
  price: 2274,
  dataAsOf: '2026-11-19',
  verdict,
  fairValue: { bear: 3168, bull: 5935, method: 'dcf-fcf', note: null },
  regime: 'neutral',
  regimeMosBonus: 0.05,
  params: DEFAULT_ENGINE_PARAMS,
  inputs: { financials: { eps: 182 } },
  ...over,
});

// Clock that moves one minute per call, so "latest" is well defined
const clock = () => {
  let t = Date.parse('2026-11-19T00:00:00Z');
  return () => new Date((t += 60_000));
};

describe('verdict log (SQLite)', () => {
  it('saves a verdict and reads it back', () => {
    const log = openVerdictLog(':memory:', clock());
    const id = log.save(entry());
    const v = log.latest('6762.T')!;
    expect(v.id).toBe(id);
    expect(v).toMatchObject({ recommendation: 'WAIT', scoreOverall: 6.5, fairValue: 4215, fairValueBear: 3168, rewardToRisk: 5.7, source: 'full' });
    log.close();
  });

  it('returns the most recent verdict and filters by source', () => {
    const log = openVerdictLog(':memory:', clock());
    log.save(entry());
    log.save(entry({ source: 'screener', price: 2300 }));
    expect(log.latest('6762.T')!.source).toBe('screener');
    expect(log.latest('6762.T', 'full')!.price).toBe(2274);
    expect(log.list({ source: 'screener' })).toHaveLength(1);
    expect(log.list()).toHaveLength(2);
    log.close();
  });

  it('shares one engine version while the params are the same', () => {
    const log = openVerdictLog(':memory:', clock());
    log.save(entry());
    log.save(entry());
    log.save(entry({ params: { ...DEFAULT_ENGINE_PARAMS, verdict: { ...DEFAULT_ENGINE_PARAMS.verdict, buyMin: 7.5 } } }));
    const [c, b, a] = log.list();
    expect(a!.engineVersionId).toBe(b!.engineVersionId);
    expect(c!.engineVersionId).not.toBe(a!.engineVersionId);
    log.close();
  });

  it('is append-only: verdicts cannot be changed or deleted', () => {
    const db = new DatabaseSync(':memory:');
    db.exec(SCHEMA);
    db.exec(`INSERT INTO stocks (ticker, market, updated_at) VALUES ('6762.T', 'JP', 'x');
      INSERT INTO engine_versions (params_hash, params_json, created_at) VALUES ('h', '{}', 'x');
      INSERT INTO verdicts (ticker, engine_version_id, created_at, source, price, recommendation, score_overall,
        confidence, missing_data_json, reasons_json) VALUES ('6762.T', 1, 'x', 'full', 1, 'WAIT', 5, 50, '[]', '{}');`);
    expect(() => db.exec("UPDATE verdicts SET recommendation = 'BUY'")).toThrow(/append-only/);
    expect(() => db.exec('DELETE FROM verdicts')).toThrow(/append-only/);
    db.close();
  });

  it('hashes params deterministically', () => {
    expect(hashParams(DEFAULT_ENGINE_PARAMS)).toBe(hashParams({ ...DEFAULT_ENGINE_PARAMS }));
  });
});
