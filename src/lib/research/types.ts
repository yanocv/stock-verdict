/**
 * Company research found by Claude with web search (ENGINE_SPEC §11,
 * CALCULATIONS §9). Events are evidence with a source; the engine turns them
 * into numbers by fixed rules (eventAdjustment.ts), never the model itself.
 */

export type ResearchEventType =
  | 'patent_expiry'
  | 'product_launch'
  | 'guidance_change'
  | 'regulation'
  | 'litigation'
  | 'merger_acquisition'
  | 'share_issuance'
  | 'management_change'
  | 'major_contract'
  | 'other';

export interface ResearchEvent {
  type: ResearchEventType;
  /** Short description, e.g. "Xtandi US patent expiry" */
  title: string;
  /** Year the effect starts (e.g. 2027), or null when unknown */
  expectedYear: number | null;
  direction: 'negative' | 'positive';
  /**
   * Estimated change to annual earnings once the event fully hits, in percent
   * (−30 = earnings 30% lower). Null when the sources don't support a number.
   */
  earningsImpactPct: number | null;
  confidence: 'high' | 'medium' | 'low';
  /** True when analysts' 1–2 year estimates already reflect it (so it isn't counted twice) */
  inAnalystEstimates: boolean | null;
  sourceUrl: string;
  sourceTitle: string;
}

export interface CompanyResearch {
  ticker: string;
  researchedAt: string;
  model: string;
  /** One or two sentences on what the market may be pricing */
  summary: string;
  events: ResearchEvent[];
  /** Events the model reported whose source wasn't among the pages it actually retrieved */
  droppedUnsourced: number;
  usage: { inputTokens: number; outputTokens: number; webSearches: number };
  costUsd: number;
}

/** Outcome of asking for research on a stock page. */
export type ResearchStatus =
  | 'fresh' // researched just now
  | 'cached' // a recent enough saved result
  | 'pending' // research still running; a later page load will show it
  | 'disabled' // no API key
  | 'budget' // daily or monthly budget reached
  | 'error';
