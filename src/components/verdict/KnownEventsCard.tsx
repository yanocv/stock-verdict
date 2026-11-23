'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper } from 'lucide-react';
import type { StockVerdictResponse } from '@/types/api';

/**
 * Company events found by AI research (CALCULATIONS §9), each with its source.
 * Events that lowered the fair value are marked; nothing is shown when
 * research is off and nothing was saved before.
 */
export function KnownEventsCard({ research }: { research: StockVerdictResponse['research'] }) {
  const t = useTranslations('common');
  const { status, events, appliedTitles, summary, researchedAt } = research;
  if (events.length === 0 && status !== 'pending' && status !== 'budget' && !summary) {return null;}

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Newspaper className="h-4 w-4" /> {t('knownEvents')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {status === 'pending' && <p className="text-muted-foreground">{t('researchPending')}</p>}
        {status === 'budget' && <p className="text-muted-foreground">{t('researchBudget')}</p>}
        {summary && <p>{summary}</p>}
        {events.length > 0 && (
          <ul className="space-y-2">
            {events.map((e) => {
              const applied = appliedTitles.includes(e.title);
              return (
                <li key={`${e.title}-${e.sourceUrl}`} className="border-b border-border/40 pb-2">
                  <div className="font-medium">
                    {e.title}
                    {e.expectedYear !== null && <span className="text-muted-foreground"> · {e.expectedYear}</span>}
                    {e.earningsImpactPct !== null && (
                      <span className={e.direction === 'negative' ? 'text-red-600' : 'text-green-600'}>
                        {' '}· {e.earningsImpactPct > 0 ? '+' : ''}{e.earningsImpactPct}%
                      </span>
                    )}
                    {applied && <span className="ml-2 text-xs text-amber-600">{t('eventApplied')}</span>}
                  </div>
                  <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">
                    {e.sourceTitle || e.sourceUrl}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[11px] text-muted-foreground">
          {t('researchNote')}
          {researchedAt && ` (${researchedAt.slice(0, 10)})`}
        </p>
      </CardContent>
    </Card>
  );
}
