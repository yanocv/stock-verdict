import type { StockOverview, FinancialMetrics, Verdict, MacroData, NewsArticle } from '@/types';

// Uses Anthropic REST API directly via fetch — no SDK dependency required.
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-5-5';
const MODEL = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

export interface NarrativeInput {
  overview: StockOverview;
  financials: FinancialMetrics;
  verdict: Verdict;
  news: NewsArticle[];
  macroData: MacroData;
  locale?: string; // 'en' | 'ja' | 'pt'
}

interface ClaudeTextBlock {
  type: 'text';
  text: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text?: string }>;
}

function buildPrompt(input: NarrativeInput): string {
  const { overview, financials, verdict, news, macroData, locale } = input;
  const lang =
    locale === 'ja' ? 'Japanese' : locale === 'pt' ? 'Brazilian Portuguese' : 'English';

  const topNews = news
    .slice(0, 3)
    .map((n) => `- ${n.title}`)
    .join('\n');

  const macroSummary = [
    macroData.fedRate !== null ? `Fed rate: ${macroData.fedRate}%` : null,
    macroData.bojRate !== null ? `BoJ rate: ${macroData.bojRate}%` : null,
    macroData.usdJpy !== null ? `USD/JPY: ${macroData.usdJpy}` : null,
    macroData.vix !== null ? `VIX: ${macroData.vix}` : null,
    macroData.oilPrice !== null ? `Oil: $${macroData.oilPrice}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return `You are a concise, data-driven investment analyst. Write a 3–5 sentence analysis in ${lang} for the stock below. Be direct and specific. Do not use bullet points — write flowing prose. Do not add headers.

Stock: ${overview.name} (${overview.ticker})
Sector: ${overview.sector} · ${overview.industry}
Current price: ${overview.currency} ${overview.currentPrice.toFixed(2)}
52-week range: ${overview.fiftyTwoWeekLow} – ${overview.fiftyTwoWeekHigh}

Verdict: ${verdict.recommendation} · Score: ${verdict.scores.overall.toFixed(1)}/10 · Confidence: ${verdict.confidence}%
Fair value: ${verdict.fairValue !== null ? verdict.fairValue.toFixed(2) : 'N/A'}
Suggested buy price: ${verdict.suggestedBuyPrice !== null ? verdict.suggestedBuyPrice.toFixed(2) : 'N/A'}

Key financials: P/E ${financials.peRatio?.toFixed(1) ?? 'N/A'}, ROE ${financials.roe?.toFixed(1) ?? 'N/A'}%, EPS ${financials.eps?.toFixed(2) ?? 'N/A'}, Net margin ${financials.netProfitMargin?.toFixed(1) ?? 'N/A'}%, D/E ${financials.debtToEquity?.toFixed(2) ?? 'N/A'}

Top bullish signals: ${verdict.reasons.bullish.slice(0, 3).join('; ') || 'None'}
Top bearish signals: ${verdict.reasons.bearish.slice(0, 3).join('; ') || 'None'}

Macro context: ${macroSummary || 'Not available'}

Recent news headlines:
${topNews || '(none available)'}

Write the analysis now in ${lang}:`;
}

/**
 * Generates an AI narrative for a stock verdict using the Claude REST API.
 * Returns null if ANTHROPIC_API_KEY is not set or if the call fails.
 * Gracefully degrades — the rest of the app works fine without it.
 */
export async function generateAINarrative(input: NarrativeInput): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[claude] ANTHROPIC_API_KEY not set — skipping AI narrative');
    return null;
  }

  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        messages: [{ role: 'user', content: buildPrompt(input) }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[claude] API error ${res.status}: ${errText}`);
      return null;
    }

    const data = (await res.json()) as ClaudeResponse;
    const text = data.content
      .filter((b): b is ClaudeTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    return text.trim() || null;
  } catch (err) {
    console.error('[claude] generateAINarrative failed:', err);
    return null;
  }
}