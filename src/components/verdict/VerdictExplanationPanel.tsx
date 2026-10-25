'use client';

import { useTranslations } from 'next-intl';
import type { Verdict, VerdictScore, InvestorVerdict } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Gauge,
  Activity,
  Globe,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Newspaper,
} from 'lucide-react';
import { DEFAULT_ENGINE_PARAMS } from '@/lib/scoring/params';

interface VerdictExplanationPanelProps {
  verdict: Verdict;
  investorVerdicts: {
    buffett: InvestorVerdict;
    graham: InvestorVerdict;
    lynch: InvestorVerdict;
  };
}

// Maps each score dimension to icon + label + weight (weights from the engine
// params; inputs as in docs/CALCULATIONS.md §6.2)
const w = DEFAULT_ENGINE_PARAMS.weights;
const DIMENSIONS: {
  key: Exclude<keyof VerdictScore, 'overall'>;
  label: string;
  weight: number;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    key: 'valuation',
    label: 'Valuation',
    weight: Math.round(w.valuation * 100),
    icon: Gauge,
    description: 'P/E, P/S, PEG vs sector, and margin of safety to fair value',
  },
  {
    key: 'financials',
    label: 'Financials',
    weight: Math.round(w.financials * 100),
    icon: DollarSign,
    description: 'ROE, net and operating margins, free cash flow',
  },
  {
    key: 'health',
    label: 'Health',
    weight: Math.round(w.health * 100),
    icon: ShieldCheck,
    description: 'Current ratio, debt/equity vs sector',
  },
  {
    key: 'technical',
    label: 'Technical',
    weight: Math.round(w.technical * 100),
    icon: Activity,
    description: 'RSI, price vs 50- and 200-day averages, 52-week position',
  },
  {
    key: 'macro',
    label: 'Macro',
    weight: Math.round(w.macro * 100),
    icon: Globe,
    description: 'VIX, S&P 500 and Nikkei trend, USD/JPY',
  },
  {
    key: 'news',
    label: 'News',
    weight: Math.round(w.news * 100),
    icon: Newspaper,
    description: 'Headline tone (keyword based)',
  },
];

function scoreColor(score: number): string {
  if (score >= 7) {return '#22c55e';}
  if (score >= 4) {return '#f59e0b';}
  return '#ef4444';
}

function scoreLabel(score: number): string {
  if (score >= 7) {return 'Strong';}
  if (score >= 5.5) {return 'Good';}
  if (score >= 4) {return 'Fair';}
  if (score >= 2.5) {return 'Weak';}
  return 'Poor';
}

function confidenceLabel(pct: number): string {
  if (pct >= 80) {return 'Very high confidence';}
  if (pct >= 65) {return 'High confidence';}
  if (pct >= 50) {return 'Moderate confidence';}
  if (pct >= 35) {return 'Low confidence';}
  return 'Very low confidence — treat as indicative';
}

function verdictBadgeVariant(rec: string) {
  if (rec === 'BUY') {return 'buy' as const;}
  if (rec === 'AVOID') {return 'avoid' as const;}
  return 'wait' as const;
}

const LENS_LABEL: Record<string, string> = {
  buffett: 'Buffett',
  graham: 'Graham',
  lynch: 'Lynch',
};

// ── Score bar ──────────────────────────────────────────────────────────────────
function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = Math.min(100, (score / max) * 100);
  const color = scoreColor(score);
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums w-8 text-right" style={{ color }}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function VerdictExplanationPanel({
  verdict,
  investorVerdicts,
}: VerdictExplanationPanelProps) {
  useTranslations('common');
  const { recommendation, confidence, scores, reasons, lynchCategory, fairValue, suggestedBuyPrice } =
    verdict;

  const lensResults = [
    investorVerdicts.buffett,
    investorVerdicts.graham,
    investorVerdicts.lynch,
  ];

  const lensAgreement = lensResults.filter((l) => l.recommendation === recommendation).length;

  return (
    <div className="space-y-4">
      {/* ── Top summary strip ── */}
      <Card className="border-l-4" style={{ borderLeftColor: scoreColor(scores.overall) }}>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-start gap-4">
            {/* Verdict + score */}
            <div className="flex items-center gap-3">
              <Badge variant={verdictBadgeVariant(recommendation)} className="text-base px-4 py-1">
                {recommendation}
              </Badge>
              <div>
                <span className="text-2xl font-bold tabular-nums">{scores.overall.toFixed(1)}</span>
                <span className="text-muted-foreground text-sm">/10</span>
              </div>
            </div>

            {/* Confidence */}
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Confidence
              </span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${confidence}%`,
                      background: scoreColor(confidence / 10),
                    }}
                  />
                </div>
                <span className="text-sm font-semibold tabular-nums">{confidence}%</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{confidenceLabel(confidence)}</span>
            </div>

            {/* Lens agreement */}
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Investor lens agreement
              </span>
              <div className="flex gap-1.5 mt-1">
                {lensResults.map((l) => (
                  <span
                    key={l.lens}
                    className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background: l.recommendation === recommendation ? scoreColor(scores.overall) + '22' : 'transparent',
                      color: l.recommendation === recommendation ? scoreColor(scores.overall) : '#94a3b8',
                      border: `1px solid ${l.recommendation === recommendation ? scoreColor(scores.overall) + '55' : '#e2e8f0'}`,
                    }}
                  >
                    {LENS_LABEL[l.lens]} {l.recommendation}
                  </span>
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {lensAgreement}/3 lenses agree with {recommendation}
              </span>
            </div>

            {/* Lynch category */}
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Stock type
              </span>
              <span className="text-sm font-semibold capitalize">
                {lynchCategory.replace('-', ' ')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Score breakdown ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4" /> Score Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {DIMENSIONS.map(({ key, label, weight, icon: Icon, description }) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{label}</span>
                  <span className="text-[11px] text-muted-foreground">({weight}% weight)</span>
                </div>
                <span
                  className="text-xs font-semibold"
                  style={{ color: scoreColor(scores[key]) }}
                >
                  {scoreLabel(scores[key])}
                </span>
              </div>
              <ScoreBar score={scores[key]} />
              <p className="text-[11px] text-muted-foreground">{description}</p>
            </div>
          ))}

          {/* Weighted formula explanation */}
          <div className="mt-3 pt-3 border-t text-[11px] text-muted-foreground space-y-1">
            <p className="font-medium text-foreground text-xs">How the overall score is calculated:</p>
            <p>
              {DIMENSIONS.map(({ key, weight }) => `(${scores[key].toFixed(1)} × ${weight}%)`).join(' + ')} ={' '}
              <span className="font-bold text-foreground">{scores.overall.toFixed(2)}/10</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Bullish / Bearish signals ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-green-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Bullish signals
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {reasons.bullish.length} found
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reasons.bullish.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> No bullish signals detected
              </p>
            ) : (
              <ul className="space-y-2">
                {reasons.bullish.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-600 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Bearish signals
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {reasons.bearish.length} found
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reasons.bearish.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" /> No bearish signals detected
              </p>
            ) : (
              <ul className="space-y-2">
                {reasons.bearish.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Price targets ── */}
      {(fairValue !== null || suggestedBuyPrice !== null) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" /> Price targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {fairValue !== null && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Fair value estimate</p>
                  <p className="text-lg font-bold">
                    {fairValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Blended average of DCF, Graham Number, and Lynch Fair Value
                  </p>
                </div>
              )}
              {suggestedBuyPrice !== null && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Suggested buy price</p>
                  <p className="text-lg font-bold text-green-600">
                    {suggestedBuyPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Fair value × 0.85 — 15% margin of safety buffer
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Disclaimer ── */}
      <p className="text-[11px] text-muted-foreground text-center px-4">
        ⚠️ This verdict is generated by a quantitative scoring engine. It does not account for your
        personal financial situation, risk tolerance, or investment horizon. Always do your own
        research before making investment decisions.
      </p>
    </div>
  );
}