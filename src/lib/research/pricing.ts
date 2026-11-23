/**
 * Claude API prices used to record the cost of each research call
 * (USD per million tokens, first-party API, as of 2026-11). Check
 * https://platform.claude.com/docs/en/about-claude/pricing when they change;
 * update this table and CALCULATIONS §9 together.
 */
const PRICES: Record<string, { input: number; output: number }> = {
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
  'claude-fable-5-2': { input: 8, output: 40 },
};

/** Web search fee per search (USD); confirm on the pricing page. */
export const WEB_SEARCH_USD = 0.01;

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
  webSearches: number;
}

/** Cost in USD; unknown models are priced like Claude Opus 5.5 so the budget still counts them. */
export function costUsd(model: string, u: TokenUsage): number {
  const p = PRICES[model] ?? PRICES['claude-opus-5-5']!;
  const inputCost =
    (u.inputTokens + (u.cacheWriteTokens ?? 0) * 1.25 + (u.cacheReadTokens ?? 0) * 0.1) * (p.input / 1e6);
  return inputCost + u.outputTokens * (p.output / 1e6) + u.webSearches * WEB_SEARCH_USD;
}
