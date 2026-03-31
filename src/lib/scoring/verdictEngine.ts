import type {
  FinancialMetrics,
  BalanceSheet,
  Verdict,
  VerdictRecommendation,
  VerdictScore,
} from '@/types';
import type { IndustryBenchmarks } from '@/lib/benchmarks/industries';
import { classifyLynchCategory } from '@/lib/classifiers/lynchCategory';
import { dcfFairValue } from '@/lib/formulas/valuation';

export interface VerdictEngineParams {
  financials: FinancialMetrics;
  balanceSheet: BalanceSheet;
  price: number;
  industryBenchmarks: IndustryBenchmarks;
  sector?: string;
  macroScore?: number;  // 0–10, defaults to 5 (neutral) when not provided
  newsScore?: number;   // 0–10, defaults to 5 (neutral) when not provided
}

/**
 * Weighted scoring system:
 * - Financials: 30%
 * - Valuation: 20%
 * - Health: 20%
 * - Technical: 15%
 * - Macro: 15% (defaults to 5 when no macro input provided)
 *
 * Score > 7 = BUY, 4-7 = WAIT, < 4 = AVOID
 */
export function generateVerdict(params: VerdictEngineParams): Verdict {
  const { financials, price, industryBenchmarks, sector = '', macroScore: macroScoreInput, newsScore: newsScoreInput } = params;

  // --- Financials Score (0-10) ---
  let financialsScore = 5; // start neutral
  const roe = financials.roe ?? 0;
  const npm = financials.netProfitMargin ?? 0;
  const opMargin = financials.operatingMargin ?? 0;
  const fcf = financials.freeCashFlow ?? 0;

  if (roe > industryBenchmarks.roe.good) financialsScore += 1.5;
  else if (roe > industryBenchmarks.roe.average) financialsScore += 0.5;
  else if (roe < industryBenchmarks.roe.poor) financialsScore -= 2;

  if (npm > industryBenchmarks.operatingMargin.good) financialsScore += 1;
  else if (npm < industryBenchmarks.operatingMargin.poor) financialsScore -= 1.5;

  if (opMargin > industryBenchmarks.operatingMargin.good) financialsScore += 0.5;
  if (fcf > 0) financialsScore += 1;
  else financialsScore -= 1.5;

  financialsScore = Math.max(0, Math.min(10, financialsScore));

  // --- Valuation Score (0-10) ---
  let valuationScore = 5;
  const pe = financials.peRatio ?? Infinity;
  const ps = financials.psRatio ?? Infinity;
  const peg = financials.pegRatio ?? Infinity;

  if (pe !== Infinity && pe < industryBenchmarks.pe.cheap) valuationScore += 2;
  else if (pe !== Infinity && pe < industryBenchmarks.pe.fair) valuationScore += 0.5;
  else if (pe !== Infinity && pe > industryBenchmarks.pe.expensive) valuationScore -= 2;

  if (ps !== Infinity && ps < industryBenchmarks.ps.cheap) valuationScore += 1.5;
  else if (ps !== Infinity && ps > industryBenchmarks.ps.expensive) valuationScore -= 1.5;

  if (peg !== Infinity && peg < 1) valuationScore += 1.5;
  else if (peg !== Infinity && peg > 2) valuationScore -= 1;

  valuationScore = Math.max(0, Math.min(10, valuationScore));

  // --- Health Score (0-10) ---
  let healthScore = 5;
  const cr = financials.currentRatio ?? 0;
  const de = financials.debtToEquity ?? Infinity;

  if (cr > 2) healthScore += 1.5;
  else if (cr > 1) healthScore += 0.5;
  else healthScore -= 2;

  if (de !== Infinity && de < industryBenchmarks.debtToEquity.low) healthScore += 2;
  else if (de !== Infinity && de < industryBenchmarks.debtToEquity.moderate) healthScore += 0.5;
  else if (de !== Infinity && de > industryBenchmarks.debtToEquity.high) healthScore -= 2;

  healthScore = Math.max(0, Math.min(10, healthScore));

  // --- Technical Score (0-10) — placeholder based on available data ---
  // Without OHLCV data we use beta and EPS growth as proxies
  let technicalScore = 5;
  const beta = financials.beta ?? 1;
  const epsGrowth = financials.epsGrowth ?? 0;
  const revenueGrowth = financials.revenueGrowth ?? 0;

  if (beta > 0 && beta < 1.2) technicalScore += 1;
  else if (beta > 2) technicalScore -= 1.5;

  if (epsGrowth > 15) technicalScore += 2;
  else if (epsGrowth > 5) technicalScore += 0.5;
  else if (epsGrowth < 0) technicalScore -= 2;

  if (revenueGrowth > 10) technicalScore += 1;
  else if (revenueGrowth < 0) technicalScore -= 1;

  technicalScore = Math.max(0, Math.min(10, technicalScore));

  // --- Macro Score (0-10) — use real score if provided ---
  const macroScore = macroScoreInput ?? 5;
  const newsScore = newsScoreInput ?? 5;

  // --- Weighted Overall Score ---
  const overall =
    financialsScore * 0.30 +
    valuationScore * 0.20 +
    healthScore * 0.20 +
    technicalScore * 0.15 +
    macroScore * 0.15;

  const scores: VerdictScore = {
    overall: Math.round(overall * 10) / 10,
    financials: Math.round(financialsScore * 10) / 10,
    valuation: Math.round(valuationScore * 10) / 10,
    health: Math.round(healthScore * 10) / 10,
    technical: Math.round(technicalScore * 10) / 10,
    macro: macroScore,
    news: newsScore,
  };

  const recommendation: VerdictRecommendation =
    overall > 7 ? 'BUY' : overall >= 4 ? 'WAIT' : 'AVOID';

  // Confidence: how far from the thresholds we are (50-95%)
  const distanceFromWait = Math.abs(overall - 4);
  const distanceFromBuy = Math.abs(overall - 7);
  const minDistance = Math.min(distanceFromWait, distanceFromBuy);
  const confidence = Math.round(Math.min(50 + minDistance * 15, 95));

  // Fair value via DCF
  const DEFAULT_EPS_GROWTH_RATE = 5;
  const MIN_DCF_GROWTH_RATE = 0.02;
  const MAX_DCF_GROWTH_RATE = 0.15;

  let fairValue: number | null = null;
  if (fcf > 0) {
    fairValue = dcfFairValue({
      freeCashFlow: fcf,
      growthRate: Math.min(
        Math.max((financials.epsGrowth ?? DEFAULT_EPS_GROWTH_RATE) / 100, MIN_DCF_GROWTH_RATE),
        MAX_DCF_GROWTH_RATE
      ),
      discountRate: 0.09,
      terminalGrowthRate: 0.03,
      sharesOutstanding: 1,
      projectionYears: 10,
    });
  }

  const suggestedBuyPrice = fairValue !== null ? fairValue * 0.75 : price * 0.85;

  // Reasons
  const bullish: string[] = [];
  const bearish: string[] = [];

  if (roe > industryBenchmarks.roe.good) bullish.push(`Strong ROE of ${roe.toFixed(1)}%`);
  if (fcf > 0) bullish.push('Positive free cash flow');
  if (peg !== Infinity && peg < 1) bullish.push(`PEG ratio of ${peg.toFixed(2)} indicates undervaluation`);
  if (cr > 2) bullish.push(`Strong liquidity with current ratio of ${cr.toFixed(2)}`);
  if (epsGrowth > 10) bullish.push(`EPS growing at ${epsGrowth.toFixed(1)}%`);

  if (fcf <= 0) bearish.push('Negative or zero free cash flow');
  if (de !== Infinity && de > industryBenchmarks.debtToEquity.high) bearish.push(`High debt/equity ratio of ${de.toFixed(2)}`);
  if (cr < 1) bearish.push(`Low current ratio of ${cr.toFixed(2)} — liquidity risk`);
  if (pe !== Infinity && pe > industryBenchmarks.pe.expensive) bearish.push(`P/E of ${pe.toFixed(1)} may be overvalued`);
  if (epsGrowth < 0) bearish.push(`EPS declining at ${epsGrowth.toFixed(1)}%`);

  const lynchCategory = classifyLynchCategory({
    epsGrowthRate: epsGrowth,
    sector,
    recentLoss: (financials.eps ?? 0) < 0,
    improvingEarnings: epsGrowth > 0,
  });

  return {
    recommendation,
    confidence,
    scores,
    fairValue,
    suggestedBuyPrice,
    reasons: { bullish, bearish },
    lynchCategory,
  };
}
