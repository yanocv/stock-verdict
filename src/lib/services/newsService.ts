/* eslint-disable @typescript-eslint/no-explicit-any */
import YahooFinance from 'yahoo-finance2';
import type { NewsArticle } from '@/types';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

/** Positive signal words that suggest bullish sentiment */
const BULLISH_KEYWORDS = [
  'buy', 'bullish', 'upgrade', 'outperform', 'beat', 'record', 'growth',
  'surge', 'rally', 'strong', 'profit', 'revenue', 'earnings beat',
  'raised', 'raises', 'overweight', 'positive', 'expand', 'win', 'deal',
  'partnership', 'accelerat', 'momentum', 'breakthrough',
];

/** Negative signal words that suggest bearish sentiment */
const BEARISH_KEYWORDS = [
  'sell', 'bearish', 'downgrade', 'underperform', 'miss', 'loss', 'decline',
  'drop', 'fall', 'weak', 'lawsuit', 'investigation', 'fraud', 'recall',
  'layoff', 'cut', 'concern', 'risk', 'warning', 'guidance cut', 'downside',
  'underweight', 'negative', 'contract', 'debt', 'bankruptcy', 'default',
];

/**
 * Scores a news headline title for sentiment.
 * Returns:
 *  - positive score: 0.1 to 1.0
 *  - neutral: 0
 *  - negative score: -1.0 to -0.1
 */
function scoreTitle(title: string): number {
  const lower = title.toLowerCase();
  let score = 0;

  for (const word of BULLISH_KEYWORDS) {
    if (lower.includes(word)) score += 0.2;
  }
  for (const word of BEARISH_KEYWORDS) {
    if (lower.includes(word)) score -= 0.2;
  }

  return Math.max(-1, Math.min(1, score));
}

/**
 * Fetches and scores news articles for a given ticker from Yahoo Finance.
 * Returns up to 8 relevant news articles with sentiment labels.
 */
export async function fetchStockNews(ticker: string): Promise<NewsArticle[]> {
  try {
    const result: any = await yf.search(ticker, { newsCount: 10, quotesCount: 0 });
    const rawNews: any[] = result.news ?? [];

    const articles: NewsArticle[] = rawNews
      .filter((item: any) => item.type === 'STORY' && item.title && item.link)
      .slice(0, 8)
      .map((item: any) => {
        const sentimentScore = scoreTitle(item.title);
        const sentiment = sentimentScore > 0.1
          ? 'positive'
          : sentimentScore < -0.1
            ? 'negative'
            : 'neutral';

        return {
          title: item.title,
          source: item.publisher ?? 'Yahoo Finance',
          url: item.link,
          publishedAt: item.providerPublishTime ?? new Date().toISOString(),
          summary: null,
          sentiment,
          sentimentScore: Math.round(sentimentScore * 100) / 100,
          relevance: 1.0,
        };
      });

    return articles;
  } catch {
    return [];
  }
}

/**
 * Scores a list of news articles on a 0–10 scale.
 * Higher score = more positive news sentiment.
 */
export function scoreNews(articles: NewsArticle[]): number {
  if (articles.length === 0) return 5; // neutral when no news

  const total = articles.reduce((sum, a) => sum + (a.sentimentScore ?? 0), 0);
  const avg = total / articles.length;

  // avg is in range [-1, 1]; map to [0, 10]
  const score = (avg + 1) * 5;
  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}