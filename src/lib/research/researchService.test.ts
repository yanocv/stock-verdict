import { describe, it, expect } from 'vitest';
import { researchCompany, parseReport, urlKey, type ResearchInput } from './researchService';
import { costUsd, WEB_SEARCH_USD } from './pricing';

const input: ResearchInput = {
  ticker: '4503.T', name: 'Astellas Pharma', industry: 'Drug Manufacturers - General', currency: 'JPY',
  currentYear: 2026, impliedGrowth: -0.04, modelGrowth: 0.075, eps: 214, forwardEps: 216, nextYearEps: 210,
};

const event = (url: string) => ({
  type: 'patent_expiry', title: 'Xtandi US exclusivity ends', expected_year: 2027, direction: 'negative',
  earnings_impact_pct: -30, confidence: 'high', in_analyst_estimates: false, source_url: url, source_title: 'IR report',
});

const usage = (input_tokens: number, output_tokens: number, searches = 0) => ({
  input_tokens, output_tokens, cache_creation_input_tokens: 0, cache_read_input_tokens: 0,
  server_tool_use: { web_search_requests: searches },
});

/** Fake client returning canned responses in order and recording the requests. */
function fakeClient(responses: unknown[]) {
  const requests: unknown[] = [];
  const client = { beta: { messages: { create: async (params: unknown) => { requests.push(params); return responses.shift(); } } } };
  return { client: client as unknown as NonNullable<NonNullable<Parameters<typeof researchCompany>[1]>['client']>, requests };
}

describe('researchCompany (simulated API)', () => {
  it('keeps only events whose source was actually retrieved, and records the cost', async () => {
    const { client } = fakeClient([
      {
        model: 'claude-opus-5-5', stop_reason: 'tool_use', usage: usage(30_000, 2_000, 3),
        content: [
          { type: 'web_search_tool_result', tool_use_id: 's1', content: [{ type: 'web_search_result', url: 'https://ir.example.jp/xtandi/', title: 'IR' }] },
          { type: 'tool_use', id: 't1', name: 'report_research', input: { summary: 'Market prices the Xtandi cliff.', events: [event('https://ir.example.jp/xtandi'), event('https://made-up.example.com/x')] } },
        ],
      },
    ]);
    const r = await researchCompany(input, { client, now: () => new Date('2026-11-23T00:00:00Z') });
    expect(r.events).toHaveLength(1);
    expect(r.droppedUnsourced).toBe(1);
    expect(r.events[0]).toMatchObject({ type: 'patent_expiry', expectedYear: 2027, earningsImpactPct: -30, confidence: 'high' });
    expect(r.costUsd).toBeCloseTo(30_000 * 4e-6 + 2_000 * 20e-6 + 3 * WEB_SEARCH_USD, 6);
    expect(r.researchedAt).toBe('2026-11-23T00:00:00.000Z');
  });

  it('continues a paused turn and asks for the report if the model ends without it', async () => {
    const { client, requests } = fakeClient([
      { model: 'claude-opus-5-5', stop_reason: 'pause_turn', usage: usage(1000, 100), content: [] },
      { model: 'claude-opus-5-5', stop_reason: 'end_turn', usage: usage(1000, 100), content: [{ type: 'text', text: 'Done.' }] },
      { model: 'claude-opus-5-5', stop_reason: 'tool_use', usage: usage(1000, 100), content: [{ type: 'tool_use', id: 't', name: 'report_research', input: { summary: '', events: [] } }] },
    ]);
    const r = await researchCompany(input, { client });
    expect(r.events).toEqual([]);
    expect(requests).toHaveLength(3);
  });

  it('throws on a refusal and when no report comes', async () => {
    await expect(researchCompany(input, { client: fakeClient([{ model: 'm', stop_reason: 'refusal', usage: usage(1, 1), content: [] }]).client })).rejects.toThrow(/declined/);
    const endless = Array.from({ length: 4 }, () => ({ model: 'm', stop_reason: 'end_turn', usage: usage(1, 1), content: [] }));
    await expect(researchCompany(input, { client: fakeClient(endless).client })).rejects.toThrow(/did not produce/);
  });

  it('sends web search, the strict report tool and server-side fallbacks', async () => {
    const { client, requests } = fakeClient([
      { model: 'claude-opus-5-5', stop_reason: 'tool_use', usage: usage(1, 1), content: [{ type: 'tool_use', id: 't', name: 'report_research', input: { summary: '', events: [] } }] },
    ]);
    await researchCompany(input, { client });
    const req = requests[0] as { model: string; fallbacks: string; tools: Array<{ type?: string; name: string; strict?: boolean }> };
    expect(req.model).toBe('claude-opus-5-5');
    expect(req.fallbacks).toBe('default');
    expect(req.tools.some((t) => t.type === 'web_search_20260209')).toBe(true);
    expect(req.tools.find((t) => t.name === 'report_research')!.strict).toBe(true);
  });
});

describe('parseReport', () => {
  it('clamps impacts and normalises unknown fields', () => {
    const retrieved = new Set([urlKey('https://a.example/x')]);
    const { events } = parseReport({ summary: 's', events: [{ ...event('https://a.example/x'), earnings_impact_pct: -400, type: 'weird', confidence: 'maybe' }] }, retrieved);
    expect(events[0]).toMatchObject({ earningsImpactPct: -90, type: 'other', confidence: 'low' });
  });
});

describe('costUsd', () => {
  it('prices unknown models like Claude Opus 5.5', () => {
    expect(costUsd('mystery', { inputTokens: 1e6, outputTokens: 0, webSearches: 0 })).toBe(4);
  });
});
