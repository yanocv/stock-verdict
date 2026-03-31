import type { MacroData } from '@/types';

/**
 * Scores macro conditions on a 0–10 scale.
 *
 * Factors:
 * - VIX (fear index): high VIX = bearish environment
 * - S&P 500 trend: used as a market regime proxy
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
    if (macro.vix < 15) vixScore = 8.5;
    else if (macro.vix < 20) vixScore = 6.5;
    else if (macro.vix < 30) vixScore = 4;
    else vixScore = 2;
    factorScore += vixScore * 2; // double weight for VIX
    factorsUsed += 2;
  }

  // ── S&P 500 level ────────────────────────────────────────────
  // Rough regime check: use 52wk context not available here,
  // so just check if it's above historical milestone levels.
  // This is a lightweight proxy — no historical data needed.
  if (macro.sp500 !== null) {
    // If S&P 500 > 4,000 it's generally healthy (post-2020 recovery)
    // > 5,000 = strong bull market
    let sp500Score: number;
    if (macro.sp500 > 5000) sp500Score = 7;
    else if (macro.sp500 > 4000) sp500Score = 6;
    else if (macro.sp500 > 3000) sp500Score = 5;
    else sp500Score = 3;
    factorScore += sp500Score;
    factorsUsed += 1;
  }

  // ── USD/JPY — Currency stability ─────────────────────────────
  // Extreme JPY weakness (>155) = risk for JP investors buying US stocks
  // Moderate range (130–150) = normal
  if (macro.usdJpy !== null) {
    let fxScore: number;
    if (macro.usdJpy > 160) fxScore = 3;        // extreme JPY weakness
    else if (macro.usdJpy > 150) fxScore = 5;   // weak JPY
    else if (macro.usdJpy > 130) fxScore = 6.5; // normal range
    else fxScore = 7;                            // strong JPY
    factorScore += fxScore;
    factorsUsed += 1;
  }

  if (factorsUsed > 0) {
    score = factorScore / factorsUsed;
  }

  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}