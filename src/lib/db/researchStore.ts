import type { CompanyResearch } from '@/lib/research/types';
import { openDatabase, DEFAULT_DB_PATH } from './verdictLog';

/** One paid API call, for the budget guard and the cost history. */
export interface UsageRecord {
  purpose: 'research';
  ticker: string | null;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  webSearches: number;
  costUsd: number;
  ok: boolean;
}

/** Saved AI research per stock and the record of paid API calls. */
export interface ResearchStore {
  /** Most recent research for a ticker, or null. */
  latest(ticker: string): CompanyResearch | null;
  save(research: CompanyResearch): void;
  recordUsage(usage: UsageRecord): void;
  /** Total recorded API spend (USD) since an ISO time. */
  spentUsd(sinceIso: string): number;
  /** Number of recorded API calls since an ISO time. */
  callsSince(sinceIso: string): number;
  close(): void;
}

export function openResearchStore(path: string = DEFAULT_DB_PATH, now: () => Date = () => new Date()): ResearchStore {
  const db = openDatabase(path);
  const insertResearch = db.prepare(
    'INSERT INTO company_research (ticker, researched_at, model, research_json, cost_usd) VALUES (?, ?, ?, ?, ?)'
  );
  const latestResearch = db.prepare(
    'SELECT research_json FROM company_research WHERE ticker = ? ORDER BY researched_at DESC, id DESC LIMIT 1'
  );
  const insertUsage = db.prepare(`
    INSERT INTO api_usage (at, purpose, ticker, model, input_tokens, output_tokens, web_searches, cost_usd, ok)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const spent = db.prepare('SELECT COALESCE(SUM(cost_usd), 0) AS total FROM api_usage WHERE at >= ?');
  const calls = db.prepare('SELECT COUNT(*) AS n FROM api_usage WHERE at >= ?');

  return {
    latest(ticker) {
      const row = latestResearch.get(ticker) as { research_json: string } | undefined;
      return row ? (JSON.parse(row.research_json) as CompanyResearch) : null;
    },
    save(r) {
      insertResearch.run(r.ticker, r.researchedAt, r.model, JSON.stringify(r), r.costUsd);
    },
    recordUsage(u) {
      insertUsage.run(
        now().toISOString(), u.purpose, u.ticker, u.model, u.inputTokens, u.outputTokens, u.webSearches, u.costUsd, u.ok ? 1 : 0
      );
    },
    spentUsd(sinceIso) {
      return Number((spent.get(sinceIso) as { total: number }).total);
    },
    callsSince(sinceIso) {
      return Number((calls.get(sinceIso) as { n: number }).n);
    },
    close() {
      db.close();
    },
  };
}
