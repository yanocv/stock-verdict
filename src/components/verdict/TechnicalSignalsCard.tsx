'use client';

import type { TechnicalIndicators } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

interface TechnicalSignalsCardProps {
  indicators: TechnicalIndicators;
  currentPrice: number;
  currency: string;
}

function formatPrice(value: number | null, currency: string): string {
  if (value === null) {return 'N/A';}
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency === 'JPY' ? 'JPY' : 'USD',
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(value);
}

function RsiGauge({ rsi }: { rsi: number }) {
  const pct = Math.max(0, Math.min(100, rsi));
  const color = rsi >= 70 ? 'bg-red-500' : rsi <= 30 ? 'bg-blue-500' : 'bg-green-500';
  const label = rsi >= 70 ? 'Overbought' : rsi <= 30 ? 'Oversold' : 'Neutral';
  const labelColor = rsi >= 70 ? 'text-red-600' : rsi <= 30 ? 'text-blue-600' : 'text-green-600';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0</span>
        <span className="font-medium text-foreground">RSI {rsi.toFixed(1)}</span>
        <span>100</span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
        {/* coloured zones */}
        <div className="absolute left-0 top-0 h-full w-[30%] bg-blue-200/60 rounded-l-full" />
        <div className="absolute right-0 top-0 h-full w-[30%] bg-red-200/60 rounded-r-full" />
        {/* marker */}
        <div
          className={`absolute top-0 h-full w-1.5 -ml-0.75 rounded-full ${color}`}
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className={`text-xs font-medium ${labelColor}`}>{label}</div>
    </div>
  );
}

export function TechnicalSignalsCard({ indicators, currency }: TechnicalSignalsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Technical Signals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* RSI gauge */}
        {indicators.rsi !== null ? (
          <RsiGauge rsi={indicators.rsi} />
        ) : (
          <p className="text-sm text-muted-foreground">RSI: insufficient price history</p>
        )}

        {/* 52-week position */}
        {indicators.fiftyTwoWeekPosition !== null && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>52wk Low</span>
              <span className="font-medium text-foreground">
                {indicators.fiftyTwoWeekPosition.toFixed(0)}% of range
              </span>
              <span>52wk High</span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-primary rounded-full"
                style={{ width: `${Math.max(2, indicators.fiftyTwoWeekPosition)}%` }}
              />
            </div>
          </div>
        )}

        {/* Moving averages */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">vs SMA 50</div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium">{formatPrice(indicators.sma50, currency)}</span>
              {indicators.trendVsSma50 && (
                <Badge variant={indicators.trendVsSma50 === 'above' ? 'buy' : 'avoid'} className="text-xs px-1.5 py-0">
                  {indicators.trendVsSma50 === 'above' ? 'Above' : 'Below'}
                </Badge>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">vs SMA 200</div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium">{formatPrice(indicators.sma200, currency)}</span>
              {indicators.trendVsSma200 && (
                <Badge variant={indicators.trendVsSma200 === 'above' ? 'buy' : 'avoid'} className="text-xs px-1.5 py-0">
                  {indicators.trendVsSma200 === 'above' ? 'Above' : 'Below'}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Golden/death cross note */}
        {indicators.trendVsSma50 && indicators.trendVsSma200 && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            {indicators.trendVsSma50 === 'above' && indicators.trendVsSma200 === 'above'
              ? '✅ Price above both SMAs — bullish trend'
              : indicators.trendVsSma50 === 'below' && indicators.trendVsSma200 === 'below'
              ? '🔴 Price below both SMAs — bearish trend'
              : indicators.trendVsSma50 === 'above' && indicators.trendVsSma200 === 'below'
              ? '⚠️ Above SMA50 but below SMA200 — short-term recovery, long-term caution'
              : '⚠️ Below SMA50 but above SMA200 — short-term pullback in uptrend'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
