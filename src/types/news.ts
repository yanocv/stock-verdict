export interface NewsArticle {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  sentimentScore: number | null; // -1 to 1
  relevance: number; // 0-1
}
