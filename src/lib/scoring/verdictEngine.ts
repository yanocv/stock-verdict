import type {
  FinancialMetrics,
  BalanceSheet,
  Verdict,
  VerdictRecommendation,
  VerdictScore,
} from '@/types';
import type { IndustryBenchmarks } from '@/lib/benchmarks/industries';
import type { TechnicalIndicators } from '@/types/technicals';
import { classifyLynchCategory } from '@/lib/classifiers/lynchCategory';
import { dcfFairValue } from '@/lib/formulas/valuation';

export interface VerdictEngineParams {
  financials: FinancialMetrics;
  balanceSheet: BalanceSheet;
  price: number;
  industryBenchmarks: IndustryBenchmarks;
  sector?: string;
  macroScore?: number;          // 0–10, defaults to 5 (neutral) when not provided
  newsScore?: number;           // 0–10, defaults to 5 (neutral) when not provided
  technicalIndicators?: TechnicalIndicators | null; // RSI + SMA signals from price history
  /**
   * DCF fair value per share (pre-calculated with real sharesOutstanding).
   * When provided, the margin of safety is incorporated into the valuation score.
   * This is the primary fix for the "WAIT despite trading 50% below fair value" bug.
   */
  dcfFairValuePerShare?: number | null;
}

/**
 * GARP-aligned weighted scoring (Mode 1 — Value Hunter):
 * - Valuation:  35%  ← highest priority for value investors
 * - Financials: 20%  ← quality check
 * - Health:     20%  ← survival check
 * - Technical:  12%  ← real RSI/SMA when available, beta-proxy fallback
 * - Macro:       7%
 * - News:        6%
 *
 * Score > 7 = BUY, 4–7 = WAIT, < 4 = AVOID
 *
 * Key fix: when dcfFairValuePerShare is provided, the margin of safety
 * is incorporated directly into the valuation score. A stock trading
 * 50%+ below its DCF fair value receives a major valuation boost.
 */
export function generateVerdict(params: VerdictEngineParams): Verdict {
  const {
    financials,
    price,
    industryBenchmarks,
    sector = '',
    macroScore: macroScoreInput,
    newsScore: newsScoreInput,
    technicalIndicators,
    dcfFairValuePerShare,
  } = params;

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

  // --- DCF Margin of Safety (most important valuation signal) ---
  // If a real per-share fair value is available, incorporate the MoS.
  // This is the primary driver for catching stocks trading far below intrinsic value.
  let mosPercent: number | null = null;
  if (dcfFairValuePerShare !== null && dcfFairValuePerShare !== undefined && dcfFairValuePerShare > 0 && price > 0) {
    mosPercent = (dcfFairValuePerShare - price) / dcfFairValuePerShare;
    if (mosPercent > 0.40) valuationScore += 4;       // >40% below fair value — massive undervaluation
    else if (mosPercent > 0.25) valuationScore += 2.5; // >25% below fair value — significant discount
    else if (mosPercent > 0.10) valuationScore += 1;   // >10% below fair value — moderate discount
    else if (mosPercent < -0.30) valuationScore -= 3;  // >30% above fair value — materially overvalued
    else if (mosPercent < -0.10) valuationScore -= 1;  // >10% above fair value — moderately overvalued
  }

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

  // --- Technical Score (0-10) ---
  // Uses real RSI/SMA data when available; falls back to fundamental proxies.
  const epsGrowth = financials.epsGrowth ?? 0;
  const revenueGrowth = financials.revenueGrowth ?? 0;
  let technicalScore = 5;

  if (technicalIndicators) {
    // RSI signal
    if (technicalIndicators.rsiSignal === 'oversold')      technicalScore += 2;    // potential bounce
    else if (technicalIndicators.rsiSignal === 'overbought') technicalScore -= 1.5; // extended, risk of pullback

    // Trend: price vs SMA200 (primary trend direction)
    if (technicalIndicators.trendVsSma200 === 'above')      technicalScore += 1.5;  // uptrend confirmed
    else if (technicalIndicators.trendVsSma200 === 'below') technicalScore -= 1.5;  // downtrend

    // Trend: price vs SMA50 (near-term momentum)
    if (technicalIndicators.trendVsSma50 === 'above')       technicalScore += 1;    // near-term bullish
    else if (technicalIndicators.trendVsSma50 === 'below')  technicalScore -= 0.5;

    // 52-week position
    const pos = technicalIndicators.fiftyTwoWeekPosition;
    if (pos !== null) {
      if (pos < 20)  technicalScore += 1;   // near 52wk low — potential value entry
      else if (pos > 90) technicalScore -= 1; // near 52wk high — limited upside
    }
  } else {
    // Fallback: fundamental proxies when no price history is available
    const beta = financials.beta ?? 1;
    if (beta > 0 && beta < 1.2) technicalScore += 1;
    else if (beta > 2)           technicalScore -= 1.5;

    if (epsGrowth > 15)      technicalScore += 2;
    else if (epsGrowth > 5)  technicalScore += 0.5;
    else if (epsGrowth < 0)  technicalScore -= 2;

    if (revenueGrowth > 10)  technicalScore += 1;
    else if (revenueGrowth < 0) technicalScore -= 1;
  }

  technicalScore = Math.max(0, Math.min(10, technicalScore));

  // --- Macro / News Scores (0-10) ---
  const macroScore = macroScoreInput ?? 5;
  const newsScore = newsScoreInput ?? 5;

  // --- Weighted Overall Score ---
  // GARP Mode 1 (Value Hunter): valuation is the highest priority
  // Weights: Valuation 35% | Financials 20% | Health 20% | Technical 12% | Macro 7% | News 6%
  const overall =
    financialsScore * 0.20 +
    valuationScore  * 0.35 +
    healthScore     * 0.20 +
    technicalScore  * 0.12 +
    macroScore      * 0.07 +
    newsScore       * 0.06;

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

  // Fair value via DCF (used for display — sharesOutstanding=1, corrected in route)
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

  // Prefer the more accurate advanced DCF fair value when available
  const displayFairValue = dcfFairValuePerShare ?? fairValue;
  const suggestedBuyPrice = displayFairValue !== null ? displayFairValue * 0.75 : price * 0.85;

  // Reasons
  const bullish: string[] = [];
  const bearish: string[] = [];

  if (roe > industryBenchmarks.roe.good) bullish.push(`Strong ROE of ${roe.toFixed(1)}%`);
  if (fcf > 0) bullish.push('Positive free cash flow');
  if (peg !== Infinity && peg < 1) bullish.push(`PEG ratio of ${peg.toFixed(2)} indicates undervaluation`);
  if (cr > 2) bullish.push(`Strong liquidity with current ratio of ${cr.toFixed(2)}`);
  if (epsGrowth > 10) bullish.push(`EPS growing at ${epsGrowth.toFixed(1)}%`);

  // DCF margin of safety reasons
  if (mosPercent !== null) {
    if (mosPercent > 0.40) {
      bullish.push(`Significant undervaluation: trading ${(mosPercent * 100).toFixed(0)}% below DCF fair value`);
    } else if (mosPercent > 0.20) {
      bullish.push(`Trading ${(mosPercent * 100).toFixed(0)}% below DCF fair value — meaningful margin of safety`);
    } else if (mosPercent < -0.20) {
      bearish.push(`Appears ${(Math.abs(mosPercent) * 100).toFixed(0)}% above DCF fair value — potential overvaluation`);
    }
  }

  // Price vs suggested buy price
  if (displayFairValue !== null && price < displayFairValue * 0.75) {
    bullish.push('Current price already below our suggested entry level');
  }

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
    fairValue: displayFairValue,
    suggestedBuyPrice,
    reasons: { bullish, bearish },
    lynchCategory,
  };
}