'use client';

import type { AnalystConsensus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AnalystConsensusCardProps {
  consensus: AnalystConsensus;
  currentPrice: number;
  currency: string;
}

function formatCurrency(value: number | null, currency: string): string {
  if (value === null) {return 'N/A';}
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency === 'JPY' ? 'JPY' : 'USD',
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(value);
}

function ratingBadge(key: string | null) {
  if (!key) {return null;}
  const map: Record<string, { label: string; variant: 'buy' | 'wait' | 'avoid' | 'default' }> = {
    strongBuy: { label: 'Strong Buy', variant: 'buy' },
    buy: { label: 'Buy', variant: 'buy' },
    hold: { label: 'Hold', variant: 'wait' },
    sell: { label: 'Sell', variant: 'avoid' },
    strongSell: { label: 'Strong Sell', variant: 'avoid' },
  };
  const entry = map[key];
  if (!entry) {return <Badge variant="default">{key}</Badge>;}
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

export function AnalystConsensusCard({ consensus, currency }: AnalystConsensusCardProps) {
  const total = consensus.strongBuy + consensus.buy + consensus.hold + consensus.sell + consensus.strongSell;
  const bullish = consensus.strongBuy + consensus.buy;
  const bearish = consensus.sell + consensus.strongSell;

  const upside = consensus.upsideToTarget;
  const hasTarget = consensus.targetMeanPrice !== null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Analyst Consensus
          {consensus.numberOfAnalysts !== null && (
            <span className="text-muted-foreground text-sm font-normal">
              ({consensus.numberOfAnalysts} analysts)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rating + upside */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {ratingBadge(consensus.recommendationKey)}
          </div>
          {hasTarget && (
            <div className="flex items-center gap-1.5 text-sm">
              {upside !== null && upside > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : upside !== null && upside < 0 ? (
                <TrendingDown className="h-4 w-4 text-red-600" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={upside !== null && upside > 0 ? 'text-green-600 font-medium' : upside !== null && upside < 0 ? 'text-red-600 font-medium' : ''}>
                {upside !== null ? `${upside > 0 ? '+' : ''}${upside.toFixed(1)}% upside` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Price targets */}
        {hasTarget && (
          <div className="grid grid-cols-3 gap-3 text-sm text-center">
            <div className="rounded-md bg-muted/50 p-2">
              <div className="text-xs text-muted-foreground mb-1">Low target</div>
              <div className="font-medium">{formatCurrency(consensus.targetLowPrice, currency)}</div>
            </div>
            <div className="rounded-md bg-primary/10 p-2">
              <div className="text-xs text-muted-foreground mb-1">Mean target</div>
              <div className="font-semibold">{formatCurrency(consensus.targetMeanPrice, currency)}</div>
            </div>
            <div className="rounded-md bg-muted/50 p-2">
              <div className="text-xs text-muted-foreground mb-1">High target</div>
              <div className="font-medium">{formatCurrency(consensus.targetHighPrice, currency)}</div>
            </div>
          </div>
        )}

        {/* Rating distribution bar */}
        {total > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground">Rating distribution ({total} analysts)</div>
            <div className="flex h-3 rounded-full overflow-hidden gap-px">
              {consensus.strongBuy > 0 && (
                <div
                  className="bg-green-600"
                  style={{ width: `${(consensus.strongBuy / total) * 100}%` }}
                  title={`Strong Buy: ${consensus.strongBuy}`}
                />
              )}
              {consensus.buy > 0 && (
                <div
                  className="bg-green-400"
                  style={{ width: `${(consensus.buy / total) * 100}%` }}
                  title={`Buy: ${consensus.buy}`}
                />
              )}
              {consensus.hold > 0 && (
                <div
                  className="bg-yellow-400"
                  style={{ width: `${(consensus.hold / total) * 100}%` }}
                  title={`Hold: ${consensus.hold}`}
                />
              )}
              {consensus.sell > 0 && (
                <div
                  className="bg-orange-400"
                  style={{ width: `${(consensus.sell / total) * 100}%` }}
                  title={`Sell: ${consensus.sell}`}
                />
              )}
              {consensus.strongSell > 0 && (
                <div
                  className="bg-red-600"
                  style={{ width: `${(consensus.strongSell / total) * 100}%` }}
                  title={`Strong Sell: ${consensus.strongSell}`}
                />
              )}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="text-green-600">{bullish} bullish</span>
              <span>{consensus.hold} hold</span>
              <span className="text-red-600">{bearish} bearish</span>
            </div>
          </div>
        )}

        {total === 0 && consensus.targetMeanPrice === null && (
          <p className="text-sm text-muted-foreground">No analyst coverage available.</p>
        )}
      </CardContent>
    </Card>
  );
}
