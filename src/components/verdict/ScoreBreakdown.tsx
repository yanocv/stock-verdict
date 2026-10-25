'use client';

import type { VerdictScore } from '@/types';
import { DEFAULT_ENGINE_PARAMS } from '@/lib/scoring/params';

interface ScoreBreakdownProps {
  scores: VerdictScore;
}

// Weights come from the engine params so the labels can't drift from the maths
const pct = (w: number) => `${Math.round(w * 100)}%`;
const w = DEFAULT_ENGINE_PARAMS.weights;
const dimensions = [
  { key: 'valuation' as const, label: 'Valuation', weight: pct(w.valuation), color: 'bg-purple-500' },
  { key: 'financials' as const, label: 'Financials', weight: pct(w.financials), color: 'bg-blue-500' },
  { key: 'health' as const, label: 'Health', weight: pct(w.health), color: 'bg-green-500' },
  { key: 'technical' as const, label: 'Technical', weight: pct(w.technical), color: 'bg-orange-500' },
  { key: 'macro' as const, label: 'Macro', weight: pct(w.macro), color: 'bg-red-500' },
  { key: 'news' as const, label: 'News', weight: pct(w.news), color: 'bg-slate-500' },
];

function scoreColor(score: number): string {
  if (score >= 7) {return 'text-green-600';}
  if (score >= 4) {return 'text-yellow-600';}
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