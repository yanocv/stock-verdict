// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { openResearchStore } from '@/lib/db/researchStore';
import type { CompanyResearch } from './types';
import { getCompanyResearch, readResearchConfig, FAILED_CALL_ESTIMATE_USD, type ResearchConfig } from './getResearch';
import type { ResearchInput } from './researchService';

const input: ResearchInput = {
  ticker: '4503.T', name: 'Astellas', industry: 'Drug Manufacturers - General', currency: 'JPY', currentYear: 2026,
  impliedGrowth: -0.04, modelGrowth: 0.075, eps: 214, forwardEps: 216, nextYearEps: 210,
};
const NOW = new Date('2026-11-23T12:00:00Z');
const config: ResearchConfig = {
  enabled: true, model: 'claude-opus-5-5', dailyBudgetUsd: 1, monthlyBudgetUsd: 10, dailyMaxCalls: 20, maxAgeDays: 7, waitMs: 1_000,
};
const research = (at: string, cost = 0.3): CompanyResearch => ({
  ticker: '4503.T', researchedAt: at, model: 'claude-opus-5-5', summary: 's', events: [], droppedUnsourced: 0,
  usage: { inputTokens: 1, outputTokens: 1, webSearches: 1 }, costUsd: cost,
});
const deps = (over: Partial<Parameters<typeof getCompanyResearch>[1]> = {}) => ({
  store: openResearchStore(':memory:', () => NOW), config, now: () => NOW,
  research: async () => research(NOW.toISOString()), ...over,
});

describe('getCompanyResearch', () => {
  it('researches, saves the result and records the cost', async () => {
    const d = deps();
    const r = await getCompanyResearch(input, d);
    expect(r.status).toBe('fresh');
    expect(d.store.latest('4503.T')).not.toBeNull();
    expect(d.store.spentUsd('2026-11-23T00:00:00Z')).toBeCloseTo(0.3, 6);
  });

  it('reuses research younger than the cache window without paying', async () => {
    let calls = 0;
    const d = deps({ research: async () => { calls++; return research(NOW.toISOString()); } });
    d.store.save(research('2026-11-20T00:00:00Z'));
    expect((await getCompanyResearch(input, d)).status).toBe('cached');
    expect(calls).toBe(0);
  });

  it('does nothing without a key, but still shows old research', async () => {
    const d = deps({ config: { ...config, enabled: false } });
    d.store.save(research('2026-10-01T00:00:00Z'));
    const r = await getCompanyResearch(input, d);
    expect(r).toMatchObject({ status: 'disabled' });
    expect(r.research).not.toBeNull();
  });

  it('stops at the daily budget', async () => {
    const d = deps();
    d.store.recordUsage({ purpose: 'research', ticker: 'X', model: 'm', inputTokens: 0, outputTokens: 0, webSearches: 0, costUsd: 1.2, ok: true });
    expect((await getCompanyResearch(input, d)).status).toBe('budget');
  });

  it('stops at the daily call limit', async () => {
    const d = deps({ config: { ...config, dailyMaxCalls: 1 } });
    d.store.recordUsage({ purpose: 'research', ticker: 'X', model: 'm', inputTokens: 0, outputTokens: 0, webSearches: 0, costUsd: 0, ok: true });
    expect((await getCompanyResearch(input, d)).status).toBe('budget');
  });

  it('counts a failed call at the conservative estimate', async () => {
    const d = deps({ research: async () => { throw new Error('api down'); } });
    expect((await getCompanyResearch(input, d)).status).toBe('error');
    expect(d.store.spentUsd('2026-11-23T00:00:00Z')).toBe(FAILED_CALL_ESTIMATE_USD);
  });

  it('returns "pending" when research takes longer than the wait, and saves it when done', async () => {
    let finish!: () => void;
    const slow = () => new Promise<CompanyResearch>((resolve) => { finish = () => resolve(research(NOW.toISOString())); });
    const d = deps({ config: { ...config, waitMs: 10 }, research: slow });
    expect((await getCompanyResearch(input, d)).status).toBe('pending');
    finish();
    await new Promise((r) => setTimeout(r, 10));
    expect(d.store.latest('4503.T')).not.toBeNull();
  });
});

describe('readResearchConfig', () => {
  it('is off without an API key and reads limits from the environment', () => {
    expect(readResearchConfig({}).enabled).toBe(false);
    const c = readResearchConfig({ ANTHROPIC_API_KEY: 'x', RESEARCH_DAILY_BUDGET_USD: '0.5', RESEARCH_MODEL: 'claude-sonnet-5-5' });
    expect(c).toMatchObject({ enabled: true, dailyBudgetUsd: 0.5, model: 'claude-sonnet-5-5', monthlyBudgetUsd: 10 });
    expect(readResearchConfig({ ANTHROPIC_API_KEY: 'x', RESEARCH_ENABLED: 'false' }).enabled).toBe(false);
  });
});
