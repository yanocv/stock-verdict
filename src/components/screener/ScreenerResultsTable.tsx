'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import type { ScreenerResult } from '@/app/api/screener/route';

interface Props {
  results: ScreenerResult[];
}

function scoreColor(score: number): string {
  if (score > 7) return 'text-green-600 dark:text-green-400';
  if (score >= 4) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function upsideIcon(upside: number | null) {
  if (upside === null) return <Minus className="w-3 h-3 text-muted-foreground" />;
  if (upside > 5)  return <TrendingUp  className="w-3 h-3 text-green-500" />;
  if (upside < -5) return <TrendingDown className="w-3 h-3 text-red-500" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

export function ScreenerResultsTable({ results }: Props) {
  // Sort: BUY first (score desc), then WAIT, then AVOID — errors last
  const sorted = [...results].sort((a, b) => {
    const order = { BUY: 0, WAIT: 1, AVOID: 2 };
    const oa = a.error ? 3 : (order[a.recommendation] ?? 2);
    const ob = b.error ? 3 : (order[b.recommendation] ?? 2);
    if (oa !== ob) return oa - ob;
    return b.score - a.score;
  });

  if (sorted.length === 0) return null;

  const buys  = sorted.filter((r) => !r.error && r.recommendation === 'BUY').length;
  const waits = sorted.filter((r) => !r.error && r.recommendation === 'WAIT').length;
  const avoids = sorted.filter((r) => !r.error && r.recommendation === 'AVOID').length;

  return (
    <div className="w-full space-y-4">
      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap text-sm">
        <span className="px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
          {buys} BUY
        </span>
        <span className="px-2.5 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-medium">
          {waits} WAIT
        </span>
        <span className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium">
          {avoids} AVOID
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
              <th className="text-left p-3 font-medium">Verdict</th>
              <th className="text-left p-3 font-medium">Score</th>
              <th className="text-left p-3 font-medium">Ticker</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">Company</th>
              <th className="text-right p-3 font-medium">Price</th>
              <th className="text-right p-3 font-medium hidden md:table-cell">Fair Value</th>
              <th className="text-right p-3 font-medium hidden md:table-cell">Upside</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.ticker}
                className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${
                  r.error ? 'opacity-40' : ''
                }`}
              >
                <td className="p-3">
                  {r.error ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <Badge variant={r.recommendation.toLowerCase() as 'buy' | 'wait' | 'avoid'}>
                      {r.recommendation}
                    </Badge>
                  )}
                </td>
                <td className="p-3">
                  <span className={`font-semibold tabular-nums ${scoreColor(r.score)}`}>
                    {r.error ? '—' : r.score.toFixed(1)}
                  </span>
                </td>
                <td className="p-3 font-mono font-medium">{r.ticker.replace('.T', '')}</td>
                <td className="p-3 text-muted-foreground hidden sm:table-cell">{r.name}</td>
                <td className="p-3 text-right tabular-nums">
                  {r.currentPrice > 0
                    ? `¥${r.currentPrice.toLocaleString()}`
                    : '—'}
                </td>
                <td className="p-3 text-right tabular-nums hidden md:table-cell text-muted-foreground">
                  {r.fairValue !== null ? `¥${Math.round(r.fairValue).toLocaleString()}` : '—'}
                </td>
                <td className="p-3 text-right hidden md:table-cell">
                  {r.upside !== null ? (
                    <span className={`flex items-center justify-end gap-1 ${r.upside > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                      {upsideIcon(r.upside)}
                      <span className="tabular-nums">{r.upside > 0 ? '+' : ''}{r.upside}%</span>
                    </span>
                  ) : '—'}
                </td>
                <td className="p-3 text-right">
                  {!r.error && (
                    <a href={`/?ticker=${r.ticker}`}>
                      <Button variant="outline" size="sm" className="gap-1 text-xs">
                        Analyze
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
