'use client';

import type { VerdictScore } from '@/types';

interface ScoreBreakdownProps {
  scores: VerdictScore;
}

const dimensions = [
  { key: 'financials' as const, label: 'Financials', weight: '30%', color: 'bg-blue-500' },
  { key: 'valuation' as const, label: 'Valuation', weight: '20%', color: 'bg-purple-500' },
  { key: 'health' as const, label: 'Health', weight: '20%', color: 'bg-green-500' },
  { key: 'technical' as const, label: 'Technical', weight: '15%', color: 'bg-orange-500' },
  { key: 'macro' as const, label: 'Macro', weight: '15%', color: 'bg-red-500' },
];

function scoreColor(score: number): string {
  if (score >= 7) return 'text-green-600';
  if (score >= 4) return 'text-yellow-600';
  return 'text-red-600';
}

export function ScoreBreakdown({ scores }: ScoreBreakdownProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Score Breakdown
      </h3>
      {dimensions.map((dim) => {
        const score = scores[dim.key];
        return (
          <div key={dim.key} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>
                {dim.label}{' '}
                <span className="text-muted-foreground text-xs">({dim.weight})</span>
              </span>
              <span className={`font-semibold ${scoreColor(score)}`}>
                {score.toFixed(1)}/10
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${dim.color}`}
                style={{ width: `${Math.min(score * 10, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}