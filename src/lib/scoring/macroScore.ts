import type { MacroData } from '@/types';
import { classifyIndexTrend } from './macroRegime';
import { DEFAULT_ENGINE_PARAMS } from './params';

/**
 * Scores macro conditions on a 0–10 scale.
 *
 * Factors:
 * - VIX (fear index): high VIX = bearish environment
 * - S&P 500 and Nikkei 225 trend (vs 200-day average and 52-week high)
 * - USD/JPY: relevant for cross-market JP/US stocks
 *
 * Returns 5 (neutral) when no macro data is available.
 */
export function scoreMacro(macro: MacroData): number {
  let score = 5; // neutral baseline
  let factorsUsed = 0;
  let factorScore = 0;

  // ── VIX — Fear & Greed proxy ────────────────────────────────
  // < 15: calm market → bullish  (score: 8)
  // 15–20: normal volatility     (score: 6)
  // 20–30: elevated fear         (score: 4)
  // > 30: high fear / crisis     (score: 2)
  if (macro.vix !== null) {
    let vixScore: number;
    if (macro.vix < 15) {vixScore = 8.5;}
    else if (macro.vix < 20) {vixScore = 6.5;}
    else if (macro.vix < 30) {vixScore = 4;}
    else {vixScore = 2;}
    factorScore += vixScore * 2; // double weight for VIX
    factorsUsed += 2;
  }

  // ── Index trends (S&P 500, Nikkei 225) ───────────────────────
  // By trend vs the 200-day average and 52-week high, not by level:
  // levels drift up over time, so fixed levels always read "healthy".
  for (const trend of [macro.sp500Trend, macro.nikkeiTrend]) {
    if (trend === null) {continue;}
    const signal = classifyIndexTrend(trend, DEFAULT_ENGINE_PARAMS.regime);
    factorScore += signal === 'bullish' ? 7 : signal === 'bearish' ? 3 : 5;
    factorsUsed += 1;
  }

  // ── USD/JPY — Currency stability ─────────────────────────────
  // Extreme JPY weakness (>155) = risk for JP investors buying US stocks
  // Moderate range (130–150) = normal
  if (macro.usdJpy !== null) {
    let fxScore: number;
    if (macro.usdJpy > 160) {fxScore = 3;}        // extreme JPY weakness
    else if (macro.usdJpy > 150) {fxScore = 5;}   // weak JPY
    else if (macro.usdJpy > 130) {fxScore = 6.5;} // normal range
    else {fxScore = 7;}                            // strong JPY
    factorScore += fxScore;
    factorsUsed += 1;
  }

  if (factorsUsed > 0) {
    score = factorScore / factorsUsed;
  }

  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}