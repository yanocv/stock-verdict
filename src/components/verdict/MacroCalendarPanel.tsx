'use client';

import type { MacroData, CalendarData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Calendar } from 'lucide-react';

interface MacroCalendarPanelProps {
  macroData: MacroData;
  calendarData: CalendarData;
  currency: string;
}

function formatMacroValue(value: number | null, prefix: string = '', suffix: string = ''): string {
  if (value === null) return '—';
  return `${prefix}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function daysUntil(iso: string | null): string {
  if (!iso) return '';
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return '(past)';
  if (diff === 0) return '(today)';
  return `(in ${diff}d)`;
}

function VixLabel({ vix }: { vix: number | null }) {
  if (vix === null) return <span className="text-muted-foreground">—</span>;
  const label = vix < 15 ? '😌 Calm' : vix < 20 ? '😐 Normal' : vix < 30 ? '😟 Elevated' : '😱 Fear';
  const color = vix < 15 ? 'text-green-600' : vix < 20 ? 'text-yellow-600' : 'text-red-600';
  return (
    <span className={color}>
      {vix.toFixed(2)} <span className="text-xs">{label}</span>
    </span>
  );
}

export function MacroCalendarPanel({ macroData, calendarData, currency }: MacroCalendarPanelProps) {
  const isJpy = currency === 'JPY';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* ── Macro Panel ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Market Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <MacroRow label="VIX (Fear Index)">
              <VixLabel vix={macroData.vix} />
            </MacroRow>
            <MacroRow label="S&P 500" value={formatMacroValue(macroData.sp500, '$')} />
            {isJpy && (
              <MacroRow label="Nikkei 225" value={formatMacroValue(macroData.nikkei225, '¥')} />
            )}
            <MacroRow label="USD/JPY" value={formatMacroValue(macroData.usdJpy, '', ' ¥')} />
            <MacroRow label="Oil (WTI)" value={formatMacroValue(macroData.oilPrice, '$')} />
            <MacroRow label="Gold" value={formatMacroValue(macroData.goldPrice, '$')} />
          </div>
        </CardContent>
      </Card>

      {/* ── Calendar Panel ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <MacroRow label="Next Earnings">
              <span>
                {formatDate(calendarData.earningsDate)}{' '}
                <span className="text-xs text-muted-foreground">
                  {daysUntil(calendarData.earningsDate)}
                </span>
              </span>
            </MacroRow>

            {calendarData.earningsAverage !== null && (
              <MacroRow label="EPS Estimate">
                <span>
                  {calendarData.earningsAverage.toFixed(2)}
                  {calendarData.earningsLow !== null && calendarData.earningsHigh !== null && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({calendarData.earningsLow.toFixed(2)}–{calendarData.earningsHigh.toFixed(2)})
                    </span>
                  )}
                </span>
              </MacroRow>
            )}

            <MacroRow label="Ex-Dividend">
              <span>
                {formatDate(calendarData.exDividendDate)}{' '}
                <span className="text-xs text-muted-foreground">
                  {daysUntil(calendarData.exDividendDate)}
                </span>
              </span>
            </MacroRow>

            <MacroRow label="Dividend Pay">
              <span>
                {formatDate(calendarData.dividendDate)}{' '}
                <span className="text-xs text-muted-foreground">
                  {daysUntil(calendarData.dividendDate)}
                </span>
              </span>
            </MacroRow>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MacroRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children ?? value ?? '—'}</span>
    </div>
  );
}