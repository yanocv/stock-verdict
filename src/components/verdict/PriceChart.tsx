'use client';

import { useState, useCallback } from 'react';
import type { ChartDataPoint } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface PriceChartProps {
  data: ChartDataPoint[];
  currency: string;
  ticker: string;
}

type Range = '1W' | '1M' | '3M' | '6M' | '1Y';

const RANGES: { label: Range; days: number }[] = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
];

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency === 'JPY' ? 'JPY' : 'USD',
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(value);
}

function formatDate(iso: string, long = false): string {
  if (long) {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    }).format(new Date(iso));
  }
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(iso));
}

// Custom crosshair tooltip
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, currency, baseClose }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const point: ChartDataPoint = payload[0].payload;
  const change = point.close - baseClose;
  const pct = baseClose > 0 ? (change / baseClose) * 100 : 0;
  const isPos = change >= 0;
  return (
    <div className="bg-background/95 border rounded-md shadow-lg px-3 py-2 text-xs min-w-[140px]">
      <div className="text-muted-foreground mb-1">{formatDate(point.date, true)}</div>
      <div className="font-bold text-base">{formatPrice(point.close, currency)}</div>
      <div className={isPos ? 'text-green-600' : 'text-red-600'}>
        {isPos ? '+' : ''}{formatPrice(change, currency)} ({isPos ? '+' : ''}{pct.toFixed(2)}%)
      </div>
    </div>
  );
}

export function PriceChart({ data, currency, ticker }: PriceChartProps) {
  const [range, setRange] = useState<Range>('1Y');
  const [hovered, setHovered] = useState<ChartDataPoint | null>(null);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RANGES.find((r) => r.label === range)!.days);
  const filtered = data.filter((d) => new Date(d.date) >= cutoff);

  if (data.length === 0 || filtered.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{ticker} — Price Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-12">No price history available.</p>
        </CardContent>
      </Card>
    );
  }

  const firstClose = filtered[0]!.close;
  const lastClose = filtered[filtered.length - 1]!.close;
  const displayClose = hovered?.close ?? lastClose;
  const change = displayClose - firstClose;
  const pct = firstClose > 0 ? (change / firstClose) * 100 : 0;
  const isPositive = change >= 0;
  const color = isPositive ? '#16a34a' : '#dc2626';
  const gradientId = `priceGrad-${ticker}`;

  // Thin out for perf
  const step = Math.max(1, Math.floor(filtered.length / 200));
  const chartData = filtered.filter((_, i) => i % step === 0 || i === filtered.length - 1);

  const prices = chartData.map((d) => d.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const pad = (maxPrice - minPrice) * 0.06 || 1;

  // X-axis ticks: pick ~5 evenly
  const tickStep = Math.max(1, Math.floor(chartData.length / 5));
  const tickDates = new Set(chartData.filter((_, i) => i % tickStep === 0).map((d) => d.date));

  const handleMouseMove = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => {
      if (state?.activePayload?.[0]?.payload) {
        setHovered(state.activePayload[0].payload as ChartDataPoint);
      }
    },
    []
  );
  const handleMouseLeave = useCallback(() => setHovered(null), []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between flex-wrap gap-2">
          {/* Price display — updates on hover */}
          <div>
            <CardTitle className="text-sm text-muted-foreground font-normal mb-0.5">
              {ticker}
              {hovered && (
                <span className="ml-2 text-xs text-muted-foreground/70">
                  {formatDate(hovered.date, true)}
                </span>
              )}
            </CardTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">
                {formatPrice(displayClose, currency)}
              </span>
              <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{formatPrice(change, currency)}{' '}
                ({isPositive ? '+' : ''}{pct.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Range selector */}
          <div className="flex items-center gap-0.5 text-xs rounded-md overflow-hidden border">
            {RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => { setRange(r.label); setHovered(null); }}
                className={`px-2.5 py-1 transition-colors cursor-pointer ${
                  range === r.label
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-4">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="85%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
              vertical={false}
            />

            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(d) => (tickDates.has(d) ? formatDate(d) : '')}
            />

            <YAxis
              domain={[minPrice - pad, maxPrice + pad]}
              tickLine={false}
              axisLine={false}
              orientation="right"
              width={64}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => formatPrice(v, currency)}
            />

            {/* Baseline — open price of the range */}
            <ReferenceLine
              y={firstClose}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              strokeOpacity={0.4}
              strokeWidth={1}
            />

            <Tooltip
              content={<CustomTooltip currency={currency} baseClose={firstClose} />}
              cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
            />

            <Area
              type="monotone"
              dataKey="close"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, fill: color, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}