import Anthropic from '@anthropic-ai/sdk';
import type { CompanyResearch, ResearchEvent, ResearchEventType } from './types';
import { costUsd, type TokenUsage } from './pricing';

/** Default model for company research (owner decision 2026-11-23; env RESEARCH_MODEL overrides). */
export const DEFAULT_RESEARCH_MODEL = 'claude-opus-5-5';
/** At most this many web searches per research call. */
export const MAX_SEARCHES = 5;
/** At most this many request rounds (searches can pause a turn; the report may need a nudge). */
const MAX_ROUNDS = 4;

export interface ResearchInput {
  ticker: string;
  name: string;
  industry: string;
  currency: string;
  currentYear: number;
  /** Growth a year the price implies vs the model's own (decimals), when known */
  impliedGrowth: number | null;
  modelGrowth: number | null;
  eps: number | null;
  forwardEps: number | null;
  nextYearEps: number | null;
}

type ResearchClient = Pick<Anthropic, 'beta'>;

const EVENT_TYPES: ResearchEventType[] = [
  'patent_expiry', 'product_launch', 'guidance_change', 'regulation', 'litigation',
  'merger_acquisition', 'share_issuance', 'management_change', 'major_contract', 'other',
];

const SYSTEM = `You research listed companies for a long-term value investor (6–24 month holds).
Find known or scheduled events in the next five years that can materially change the company's earnings:
patent or exclusivity expiries, product launches and approvals, company guidance changes, regulation,
litigation, mergers and acquisitions, share issuance, management changes, and major contracts or customers.
Search both Japanese and English sources: company IR pages and earnings releases (決算短信), annual securities
reports (有価証券報告書, especially 事業等のリスク), TDnet/EDINET disclosures, and reputable news.
Only report what your sources support; do not speculate. Give an earnings impact only when a source states
or clearly implies its size (for example the share of revenue a drug provides). Every event needs the URL of
a page you actually retrieved. If there is nothing material, report an empty list.
When you are done, call report_research once.`;

const REPORT_TOOL = {
  name: 'report_research',
  description: 'Report the material events found, with sources. Call exactly once, at the end.',
  strict: true,
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: {
        type: 'string',
        description: 'One or two sentences on what the market may be pricing for this company.',
      },
      events: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: EVENT_TYPES },
            title: { type: 'string' },
            expected_year: { type: ['integer', 'null'] },
            direction: { type: 'string', enum: ['negative', 'positive'] },
            earnings_impact_pct: {
              type: ['number', 'null'],
              description: 'Change to annual earnings once fully in effect, percent (−30 = 30% lower); null if unsupported.',
            },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            in_analyst_estimates: {
              type: ['boolean', 'null'],
              description: "Whether analysts' 1–2 year EPS estimates already reflect it.",
            },
            source_url: { type: 'string' },
            source_title: { type: 'string' },
          },
          required: [
            'type', 'title', 'expected_year', 'direction', 'earnings_impact_pct', 'confidence',
            'in_analyst_estimates', 'source_url', 'source_title',
          ],
          additionalProperties: false,
        },
      },
    },
    required: ['summary', 'events'],
    additionalProperties: false,
  },
};

function userPrompt(i: ResearchInput): string {
  const pct = (g: number | null) => (g === null ? 'unknown' : `${(g * 100).toFixed(1)}%`);
  return [
    `Company: ${i.name} (${i.ticker}), industry: ${i.industry || 'unknown'}, currency: ${i.currency}. Current year: ${i.currentYear}.`,
    `Trailing EPS ${i.eps ?? 'unknown'}; analysts' EPS estimate this fiscal year ${i.forwardEps ?? 'unknown'}, next year ${i.nextYearEps ?? 'unknown'}.`,
    `Our valuation model assumes ${pct(i.modelGrowth)} growth a year; today's share price implies ${pct(i.impliedGrowth)}.`,
    'Find the events that could explain a gap between the two, and any other material events in the next five years.',
  ].join('\n');
}

/** URL key used to match an event's source against the pages actually retrieved. */
export function urlKey(url: string): string {
  return url.trim().replace(/#.*$/, '').replace(/\/+$/, '').toLowerCase();
}

/** Turns the reported tool input into events, dropping any whose source wasn't retrieved. */
export function parseReport(
  input: unknown,
  retrieved: Set<string>
): { summary: string; events: ResearchEvent[]; dropped: number } {
  const obj = (input ?? {}) as { summary?: unknown; events?: unknown };
  const raw = Array.isArray(obj.events) ? obj.events : [];
  const events: ResearchEvent[] = [];
  let dropped = 0;
  for (const r of raw as Array<Record<string, unknown>>) {
    const url = typeof r.source_url === 'string' ? r.source_url : '';
    if (!url || !retrieved.has(urlKey(url))) {
      dropped++;
      continue;
    }
    const impact = typeof r.earnings_impact_pct === 'number' ? Math.max(-90, Math.min(90, r.earnings_impact_pct)) : null;
    events.push({
      type: EVENT_TYPES.includes(r.type as ResearchEventType) ? (r.type as ResearchEventType) : 'other',
      title: String(r.title ?? '').slice(0, 200),
      expectedYear: typeof r.expected_year === 'number' ? Math.round(r.expected_year) : null,
      direction: r.direction === 'positive' ? 'positive' : 'negative',
      earningsImpactPct: impact,
      confidence: r.confidence === 'high' || r.confidence === 'medium' ? r.confidence : 'low',
      inAnalystEstimates: typeof r.in_analyst_estimates === 'boolean' ? r.in_analyst_estimates : null,
      sourceUrl: url,
      sourceTitle: String(r.source_title ?? '').slice(0, 200),
    });
  }
  return { summary: typeof obj.summary === 'string' ? obj.summary.slice(0, 600) : '', events, dropped };
}

/**
 * Researches one company with Claude and web search. Claude searches, then
 * reports through the strict report_research tool. Server-side fallbacks are
 * on: if the model declines, the API answers with a fallback model in the
 * same call. Throws on API errors or a refusal; callers handle the fallback.
 */
export async function researchCompany(
  input: ResearchInput,
  opts: { client?: ResearchClient; model?: string; now?: () => Date } = {}
): Promise<CompanyResearch> {
  const client = opts.client ?? new Anthropic();
  const model = opts.model ?? DEFAULT_RESEARCH_MODEL;
  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [{ role: 'user', content: userPrompt(input) }];
  const usage: Required<TokenUsage> = { inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, webSearches: 0 };
  const retrieved = new Set<string>();
  let servedBy = model;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system: SYSTEM,
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: MAX_SEARCHES }, REPORT_TOOL],
      messages,
    });
    servedBy = res.model;
    usage.inputTokens += res.usage.input_tokens;
    usage.outputTokens += res.usage.output_tokens;
    usage.cacheWriteTokens += res.usage.cache_creation_input_tokens ?? 0;
    usage.cacheReadTokens += res.usage.cache_read_input_tokens ?? 0;
    usage.webSearches += res.usage.server_tool_use?.web_search_requests ?? 0;

    for (const block of res.content) {
      if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
        for (const r of block.content) {retrieved.add(urlKey(r.url));}
      }
    }
    if (res.stop_reason === 'refusal') {throw new Error('research declined by the model');}

    const report = res.content.find((b) => b.type === 'tool_use' && b.name === REPORT_TOOL.name);
    if (report && report.type === 'tool_use') {
      const parsed = parseReport(report.input, retrieved);
      return {
        ticker: input.ticker,
        researchedAt: (opts.now ?? (() => new Date()))().toISOString(),
        model: servedBy,
        summary: parsed.summary,
        events: parsed.events,
        droppedUnsourced: parsed.dropped,
        usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, webSearches: usage.webSearches },
        costUsd: costUsd(servedBy, usage),
      };
    }

    messages.push({ role: 'assistant', content: res.content });
    if (res.stop_reason !== 'pause_turn') {
      // Finished without reporting: ask once more for the report
      messages.push({ role: 'user', content: 'Please call report_research now with what you found.' });
    }
  }
  throw new Error('research did not produce a report');
}
