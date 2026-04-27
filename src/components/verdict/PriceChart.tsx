'use client';

import { useState, useCallback } from 'react';
import type { ChartDataPoint } from '@/types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

// ─── Colors ───────────────────────────────────────────────────────────────────
const UP_COLOR = '#22c55e'; // tailwind green-500
const DOWN_COLOR = '#ef4444'; // tailwind red-500
const UP_FADE = 'rgba(34,197,94,0)';
const DOWN_FADE = 'rgba(239,68,68,0)';
const GRID_COLOR = 'rgba(148,163,184,0.12)'; // slate-400 very faint

// ─── Types ────────────────────────────────────────────────────────────────────
interface PriceChartProps {
  data: ChartDataPoint[];
  currency: string;
  ticker: string;
}

type Range = '1D' | '5D' | '1M' | '6M' | '1Y' | '5Y' | 'MAX';

const RANGES: { label: Range; days: number | null }[] = [
  { label: '1D', days: 1 },
  { label: '5D', days: 5 },
  { label: '1M', days: 30 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: '5Y', days: 365 * 5 },
  { label: 'MAX', days: null },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function filterByRange(data: ChartDataPoint[], range: Range): ChartDataPoint[] {
  if (!data.length || range === 'MAX') return data;
  const days = RANGES.find((r) => r.label === range)!.days!;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const result = data.filter((d) => new Date(d.date) >= cutoff);
  // Return filtered result even if only 1 point — never fall back to full dataset
  return result.length > 0 ? result : [];
}

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'JPY' ? 'JPY' : 'USD',
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
}

function formatPriceFull(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'JPY' ? 'JPY' : 'USD',
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(value);
}

function formatXLabel(iso: string, range: Range): string {
  const d = new Date(iso);
  switch (range) {
    case '1D':
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    case '5D':
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    case '1M':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case '6M':
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    case '1Y':
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    case '5Y':
      return d.toLocaleDateString('en-US', { year: 'numeric' });
    case 'MAX':
      return d.toLocaleDateString('en-US', { year: 'numeric' });
    default:
      return iso;
  }
}

function formatTooltipDate(iso: string, range: Range): string {
  const d = new Date(iso);
  if (range === '1D')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function pickTicks(data: { date: string }[], count: number): Set<string> {
  if (data.length <= count) return new Set(data.map((d) => d.date));
  const step = Math.floor(data.length / count);
  return new Set(data.filter((_, i) => i % step === 0).map((d) => d.date));
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, currency, baseClose, range }: any) {
  if (!active || !payload?.length) return null;
  const pt: ChartDataPoint = payload[0].payload;
  const delta = pt.close - baseClose;
  const pct = baseClose > 0 ? (delta / baseClose) * 100 : 0;
  const up = delta >= 0;

  return (
    <div
      className="rounded-xl border border-white/10 backdrop-blur-md px-4 py-3 shadow-2xl text-xs"
      style={{ background: 'rgba(15,23,42,0.92)', minWidth: 160 }}
    >
      <p className="text-slate-400 mb-2 text-[11px] font-medium tracking-wide">
        {formatTooltipDate(pt.date, range)}
      </p>
      <p className="text-white text-base font-bold tabular-nums mb-1">
        {formatPriceFull(pt.close, currency)}
      </p>
      <p
        className="font-semibold tabular-nums text-[12px]"
        style={{ color: up ? UP_COLOR : DOWN_COLOR }}
      >
        {up ? '▲' : '▼'}&nbsp;{formatPriceFull(Math.abs(delta), currency)}&nbsp;
        <span className="opacity-70">({up ? '+' : ''}{pct.toFixed(2)}%)</span>
      </p>
      {pt.volume !== undefined && (
        <p className="text-slate-500 text-[10px] mt-1.5">
          Vol&nbsp;{new Intl.NumberFormat('en-US', { notation: 'compact' }).format(pt.volume)}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function PriceChart({ data, currency, ticker }: PriceChartProps) {
  const [range, setRange] = useState<Range>('1Y');
  const [hovered, setHovered] = useState<ChartDataPoint | null>(null);

  const filtered = filterByRange(data, range);

  if (!data.length || !filtered.length) {
    return (
      <div className="flex items-center justify-center h-64 rounded-2xl bg-slate-900/40 text-slate-500 text-sm">
        No price data available
      </div>
    );
  }

  const firstClose = filtered[0]!.close;
  const displayPt = hovered ?? filtered[filtered.length - 1]!;
  const delta = displayPt.close - firstClose;
  const pct = firstClose > 0 ? (delta / firstClose) * 100 : 0;
  const isUp = delta >= 0;
  const lineColor = isUp ? UP_COLOR : DOWN_COLOR;
  const gradId = `grad-${ticker.replace(/[^a-z0-9]/gi, '')}-${range}`;

  // downsample to max 400 pts for perf
  const step = Math.max(1, Math.floor(filtered.length / 400));
  const chartData = filtered.filter((_, i) => i % step === 0 || i === filtered.length - 1);

  const prices = chartData.map((d) => d.close);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const pad = Math.max((hi - lo) * 0.12, lo * 0.005, 1);

  const tickDates = pickTicks(chartData, 6);

  const onMouseMove = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => {
      const pt = s?.activePayload?.[0]?.payload as ChartDataPoint | undefined;
      if (pt) setHovered(pt);
    },
    [],
  );
  const onMouseLeave = useCallback(() => setHovered(null), []);

  return (
    <div className="rounded-2xl overflow-hidden bg-slate-950 border border-white/5 shadow-xl">
      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-3 flex flex-col gap-1">
        <span className="text-slate-400 text-[11px] font-semibold tracking-widest uppercase">
          {ticker}
        </span>

        <div className="flex items-end gap-3 flex-wrap">
          <span className="text-white text-4xl font-bold tabular-nums tracking-tight leading-none">
            {formatPriceFull(displayPt.close, currency)}
          </span>
          <span
            className="text-lg font-bold tabular-nums leading-none mb-0.5"
            style={{ color: lineColor }}
          >
            {isUp ? '▲' : '▼'}&nbsp;{formatPriceFull(Math.abs(delta), currency)}&nbsp;
            <span className="text-base opacity-80">({isUp ? '+' : ''}{pct.toFixed(2)}%)</span>
          </span>
        </div>

        {hovered && (
          <span className="text-slate-500 text-[11px]">
            {formatTooltipDate(hovered.date, range)}
          </span>
        )}
      </div>

      {/* ── Range selector ── */}
      <div className="px-5 pb-3 flex gap-1">
        {RANGES.map((r) => {
          const active = r.label === range;
          return (
            <button
              key={r.label}
              onClick={() => { setRange(r.label); setHovered(null); }}
              className="relative px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer"
              style={{
                background: active ? lineColor + '22' : 'transparent',
                color: active ? lineColor : '#64748b',
                border: active ? `1px solid ${lineColor}44` : '1px solid transparent',
              }}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {/* ── Chart ── */}
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={chartData}
          margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
              <stop offset="80%" stopColor={isUp ? UP_FADE : DOWN_FADE} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="0"
            vertical={false}
            stroke={GRID_COLOR}
            strokeWidth={1}
          />

          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#475569', fontSize: 10, fontWeight: 500 }}
            tickFormatter={(d) => (tickDates.has(d) ? formatXLabel(d, range) : '')}
            interval={0}
          />

          <YAxis
            domain={[lo - pad, hi + pad]}
            axisLine={false}
            tickLine={false}
            orientation="right"
            width={68}
            tick={{ fill: '#475569', fontSize: 10, fontWeight: 500 }}
            tickFormatter={(v) => formatPrice(v, currency)}
            tickCount={5}
          />

          {/* Zero baseline */}
          <ReferenceLine
            y={firstClose}
            stroke={lineColor}
            strokeOpacity={0.25}
            strokeDasharray="4 3"
            strokeWidth={1}
          />

          <Tooltip
            content={<ChartTooltip currency={currency} baseClose={firstClose} range={range} />}
            cursor={{
              stroke: lineColor,
              strokeWidth: 1.5,
              strokeOpacity: 0.5,
              strokeDasharray: '4 3',
            }}
            isAnimationActive={false}
          />

          <Area
            type="monotoneX"
            dataKey="close"
            stroke={lineColor}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{
              r: 5,
              fill: lineColor,
              stroke: '#0f172a',
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* ── Footer: range info ── */}
      <div className="px-5 py-3 border-t border-white/5 flex justify-between text-[10px] text-slate-600">
        <span>{filtered[0]?.date ?? ''}</span>
        <span>{filtered[filtered.length - 1]?.date ?? ''}</span>
      </div>
    </div>
  );
}