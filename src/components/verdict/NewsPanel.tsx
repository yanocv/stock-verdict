'use client';

import type { NewsArticle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Newspaper, ExternalLink } from 'lucide-react';

interface NewsPanelProps {
  articles: NewsArticle[];
}

function sentimentBadge(sentiment: NewsArticle['sentiment']) {
  if (sentiment === 'positive') return <Badge variant="buy" className="text-xs">Positive</Badge>;
  if (sentiment === 'negative') return <Badge variant="avoid" className="text-xs">Negative</Badge>;
  return <Badge variant="wait" className="text-xs">Neutral</Badge>;
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function NewsPanel({ articles }: NewsPanelProps) {
  if (articles.length === 0) {
    return null;
  }

  const positive = articles.filter((a) => a.sentiment === 'positive').length;
  const negative = articles.filter((a) => a.sentiment === 'negative').length;
  const neutral = articles.length - positive - negative;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Newspaper className="h-4 w-4" />
          Recent News
          <span className="text-xs font-normal text-muted-foreground ml-1">
            {positive > 0 && <span className="text-green-600">{positive}↑ </span>}
            {negative > 0 && <span className="text-red-500">{negative}↓ </span>}
            {neutral > 0 && <span>{neutral}→</span>}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {articles.map((article) => (
          <div key={article.url} className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline flex items-start gap-1 group"
              >
                <span className="leading-snug">{article.title}</span>
                <ExternalLink className="h-3 w-3 shrink-0 mt-0.5 opacity-0 group-hover:opacity-60 transition-opacity" />
              </a>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{article.source}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(
                    typeof article.publishedAt === 'string'
                      ? article.publishedAt
                      : (article.publishedAt as Date).toISOString()
                  )}
                </span>
              </div>
            </div>
            <div className="shrink-0">{sentimentBadge(article.sentiment)}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}