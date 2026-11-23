import type { ResearchStore } from '@/lib/db/researchStore';
import type { CompanyResearch, ResearchStatus } from './types';
import { researchCompany, DEFAULT_RESEARCH_MODEL, type ResearchInput } from './researchService';

/** Cost counted for a failed call, whose real usage is unknown (conservative). */
export const FAILED_CALL_ESTIMATE_USD = 0.5;

/** Research settings from the environment (documented in .env.example and CALCULATIONS §9). */
export interface ResearchConfig {
  enabled: boolean;
  model: string;
  dailyBudgetUsd: number;
  monthlyBudgetUsd: number;
  dailyMaxCalls: number;
  maxAgeDays: number;
  waitMs: number;
}

export function readResearchConfig(env: Record<string, string | undefined> = process.env): ResearchConfig {
  const num = (v: string | undefined, d: number) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
  return {
    enabled: Boolean(env.ANTHROPIC_API_KEY) && env.RESEARCH_ENABLED !== 'false',
    model: env.RESEARCH_MODEL || DEFAULT_RESEARCH_MODEL,
    dailyBudgetUsd: num(env.RESEARCH_DAILY_BUDGET_USD, 1),
    monthlyBudgetUsd: num(env.RESEARCH_MONTHLY_BUDGET_USD, 10),
    dailyMaxCalls: num(env.RESEARCH_DAILY_MAX_CALLS, 20),
    maxAgeDays: num(env.RESEARCH_MAX_AGE_DAYS, 7),
    waitMs: num(env.RESEARCH_WAIT_MS, 45_000),
  };
}

/** Research runs in progress, so two page loads don't pay for the same stock twice. */
const inFlight = new Map<string, Promise<CompanyResearch>>();

export interface ResearchOutcome {
  status: ResearchStatus;
  /** Fresh or cached research to use (may be older than the cache window when nothing newer exists) */
  research: CompanyResearch | null;
}

/**
 * Returns research for a stock, spending money only when allowed: a fresh
 * cache wins; without a key or over budget the cached result (if any) is
 * returned; otherwise a new research call starts. If it takes longer than
 * `waitMs`, the page continues without it and the result is saved for the
 * next load.
 */
export async function getCompanyResearch(
  input: ResearchInput,
  deps: {
    store: ResearchStore;
    config: ResearchConfig;
    research?: typeof researchCompany;
    now?: () => Date;
  }
): Promise<ResearchOutcome> {
  const { store, config } = deps;
  const now = (deps.now ?? (() => new Date()))();
  const cached = store.latest(input.ticker);
  const ageDays = cached ? (now.getTime() - Date.parse(cached.researchedAt)) / 86_400_000 : Infinity;
  if (cached && ageDays < config.maxAgeDays) {return { status: 'cached', research: cached };}
  if (!config.enabled) {return { status: 'disabled', research: cached };}

  let promise = inFlight.get(input.ticker);
  if (!promise) {
    // Budget guard, counted in UTC days and months, including calls still running
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const running = inFlight.size * FAILED_CALL_ESTIMATE_USD;
    if (
      store.spentUsd(dayStart) + running >= config.dailyBudgetUsd ||
      store.spentUsd(monthStart) + running >= config.monthlyBudgetUsd ||
      store.callsSince(dayStart) + inFlight.size >= config.dailyMaxCalls
    ) {
      return { status: 'budget', research: cached };
    }

    const run = deps.research ?? researchCompany;
    promise = run(input, { model: config.model })
      .then((r) => {
        store.save(r);
        store.recordUsage({
          purpose: 'research', ticker: input.ticker, model: r.model, inputTokens: r.usage.inputTokens,
          outputTokens: r.usage.outputTokens, webSearches: r.usage.webSearches, costUsd: r.costUsd, ok: true,
        });
        return r;
      })
      .catch((err: unknown) => {
        store.recordUsage({
          purpose: 'research', ticker: input.ticker, model: config.model, inputTokens: 0, outputTokens: 0,
          webSearches: 0, costUsd: FAILED_CALL_ESTIMATE_USD, ok: false,
        });
        console.error(`[research] ${input.ticker} failed:`, err);
        throw err;
      })
      .finally(() => inFlight.delete(input.ticker));
    promise.catch(() => {}); // a late failure after the page moved on must not crash the server
    inFlight.set(input.ticker, promise);
  }

  const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), config.waitMs));
  try {
    const result = await Promise.race([promise, timeout]);
    return result === 'timeout' ? { status: 'pending', research: cached } : { status: 'fresh', research: result };
  } catch {
    return { status: 'error', research: cached };
  }
}
