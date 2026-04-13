'use client';

import type { StockVerdictResponse } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScoreBreakdown } from './ScoreBreakdown';
import { InvestorLensCard } from './InvestorLensCard';
import { NewsPanel } from './NewsPanel';
import { MacroCalendarPanel } from './MacroCalendarPanel';
import { FinancialStatementsPanel } from './FinancialStatementsPanel';
import { PriceChart } from './PriceChart';
import { HowItWorksPanel } from './HowItWorksPanel';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Building2,
} from 'lucide-react';

interface VerdictResultPanelProps {
  data: StockVerdictResponse;
}

function verdictBadgeVariant(rec: string) {
  if (rec === 'BUY') return 'buy' as const;
  if (rec === 'AVOID') return 'avoid' as const;
  return 'wait' as const;
}

function formatCurrency(value: number | null, currency: string): string {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency === 'JPY' ? 'JPY' : 'USD',
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(value);
}

function formatPct(value: number | null): string {
  if (value === null) return 'N/A';
  return `${value.toFixed(1)}%`;
}

function formatNum(value: number | null, decimals: number = 2): string {
  if (value === null) return 'N/A';
  return value.toFixed(decimals);
}

export function VerdictResultPanel({ data }: VerdictResultPanelProps) {
  const { overview, financials, verdict, investorVerdicts, news, macroData, calendarData, financialHistory, priceHistory } = data;
  const currency = overview.currency;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* ── Hero Card ── */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                {overview.name}
                <span className="text-muted-foreground text-base font-normal">
                  ({overview.ticker})
                </span>
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Building2 className="h-3.5 w-3.5" />
                {overview.sector}
                {overview.industry ? ` · ${overview.industry}` : ''}
                {' · '}
                {overview.exchange}
              </CardDescription>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold">
                {formatCurrency(overview.currentPrice, currency)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                52wk: {formatCurrency(overview.fiftyTwoWeekLow, currency)} –{' '}
                {formatCurrency(overview.fiftyTwoWeekHigh, currency)}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Verdict summary row */}
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-muted/50">
            <Badge
              variant={verdictBadgeVariant(verdict.recommendation)}
              className="text-lg px-4 py-1"
            >
              {verdict.recommendation}
            </Badge>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 text-sm">
                <span>
                  Score:{' '}
                  <span className="font-bold text-base">{verdict.scores.overall}/10</span>
                </span>
                <span>
                  Confidence:{' '}
                  <span className="font-bold text-base">{verdict.confidence}%</span>
                </span>
                <span className="text-muted-foreground">
                  {verdict.lynchCategory}
                </span>
              </div>
            </div>

            {verdict.fairValue !== null && (
              <div className="text-right text-sm">
                <div>
                  Fair Value:{' '}
                  <span className="font-semibold">
                    {formatCurrency(verdict.fairValue, currency)}
                  </span>
                </div>
                {verdict.suggestedBuyPrice !== null && (
                  <div className="text-muted-foreground">
                    Buy Below:{' '}
                    {formatCurrency(verdict.suggestedBuyPrice, currency)}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Main Tabbed Layout ── */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="macro">Market &amp; News</TabsTrigger>
          <TabsTrigger value="how">How It Works</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Reasons & Score */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {verdict.reasons.bullish.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-green-600 flex items-center gap-1 mb-2">
                      <TrendingUp className="h-4 w-4" /> Bullish
                    </h4>
                    <ul className="space-y-1">
                      {verdict.reasons.bullish.map((r) => (
                        <li key={r} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-green-600 mt-1">+</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {verdict.reasons.bearish.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-red-600 flex items-center gap-1 mb-2">
                      <TrendingDown className="h-4 w-4" /> Bearish
                    </h4>
                    <ul className="space-y-1">
                      {verdict.reasons.bearish.map((r) => (
                        <li key={r} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-red-600 mt-1">−</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {verdict.reasons.bullish.length === 0 &&
                  verdict.reasons.bearish.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      <AlertTriangle className="h-4 w-4 inline mr-1" />
                      Insufficient data for detailed analysis.
                    </p>
                  )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" /> Score Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScoreBreakdown scores={verdict.scores} />
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-1">
                <DollarSign className="h-4 w-4" /> Key Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-sm">
                <MetricItem label="P/E" value={formatNum(financials.peRatio, 1)} />
                <MetricItem label="P/S" value={formatNum(financials.psRatio, 1)} />
                <MetricItem label="P/B" value={formatNum(financials.pbRatio, 2)} />
                <MetricItem label="PEG" value={formatNum(financials.pegRatio, 2)} />
                <MetricItem label="EPS" value={formatNum(financials.eps, 2)} />
                <MetricItem label="ROE" value={formatPct(financials.roe)} />
                <MetricItem label="Op. Margin" value={formatPct(financials.operatingMargin)} />
                <MetricItem label="Net Margin" value={formatPct(financials.netProfitMargin)} />
                <MetricItem label="D/E" value={formatNum(financials.debtToEquity, 2)} />
                <MetricItem label="Current Ratio" value={formatNum(financials.currentRatio, 2)} />
                <MetricItem label="Div. Yield" value={formatPct(financials.dividendYield)} />
                <MetricItem label="Beta" value={formatNum(financials.beta, 2)} />
              </div>
            </CardContent>
          </Card>

          {/* Investor Lenses */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Investor Lenses</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InvestorLensCard verdict={investorVerdicts.buffett} />
              <InvestorLensCard verdict={investorVerdicts.graham} />
              <InvestorLensCard verdict={investorVerdicts.lynch} />
            </div>
          </div>
        </TabsContent>

        {/* ── Chart Tab ── */}
        <TabsContent value="chart" className="mt-4">
          <PriceChart data={priceHistory} currency={currency} ticker={overview.ticker} />
        </TabsContent>

        {/* ── Financials Tab ── */}
        <TabsContent value="financials" className="mt-4">
          <FinancialStatementsPanel history={financialHistory} currency={currency} />
        </TabsContent>

        {/* ── Market & News Tab ── */}
        <TabsContent value="macro" className="space-y-6 mt-4">
          <MacroCalendarPanel
            macroData={macroData}
            calendarData={calendarData}
            currency={currency}
          />
          {news.length > 0 && <NewsPanel articles={news} />}
        </TabsContent>

        {/* ── How It Works Tab ── */}
        <TabsContent value="how" className="mt-4">
          <HowItWorksPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}