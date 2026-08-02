import type { MacroData } from '@/types';

export type MacroRegime = 'risk-on' | 'neutral' | 'risk-off';

export interface MacroRegimeResult {
  regime: MacroRegime;
  /**
   * Additional margin of safety % required in this regime.
   * risk-on: 0%, neutral: +5%, risk-off: +10%
   */
  marginOfSafetyBonus: number;
  /** Human-readable explanation */
  label: string;
  /** Per-factor signals that contributed to the regime determination */
  signals: RegimeSignal[];
}

export interface RegimeSignal {
  factor: string;
  value: string;
  signal: 'bullish' | 'neutral' | 'bearish';
  note: string;
}

/**
 * Determines macro regime (risk-on / neutral / risk-off) from MacroData.
 *
 * Scoring: each factor votes bullish (+1), neutral (0), or bearish (-1).
 * Sum > 1 = risk-on, -1 to 1 = neutral, < -1 = risk-off.
 *
 * Per docs_INVESTMENT_PHILOSOPHY.md:
 * - Risk-on  (VIX < 18, normal yield curve, PMI > 52) → standard thresholds
 * - Neutral  (mixed signals)                           → require +5% MoS
 * - Risk-off (VIX > 28, inverted curve, PMI < 48)      → require +10% MoS
 */
export function determineMacroRegime(macro: MacroData): MacroRegimeResult {
  const signals: RegimeSignal[] = [];
  let score = 0;

  // ── VIX ─────────────────────────────────────────────────────────────
  if (macro.vix !== null) {
    if (macro.vix < 18) {
      score += 1;
      signals.push({
        factor: 'VIX',
        value: macro.vix.toFixed(1),
        signal: 'bullish',
        note: 'Low fear — calm market conditions',
      });
    } else if (macro.vix <= 28) {
      signals.push({
        factor: 'VIX',
        value: macro.vix.toFixed(1),
        signal: 'neutral',
        note: 'Elevated but not crisis-level volatility',
      });
    } else {
      score -= 1;
      signals.push({
        factor: 'VIX',
        value: macro.vix.toFixed(1),
        signal: 'bearish',
        note: 'High fear — market in risk-off mode',
      });
    }
  }

  // ── S&P 500 trend proxy ──────────────────────────────────────────────
  if (macro.sp500 !== null) {
    if (macro.sp500 > 5000) {
      score += 1;
      signals.push({
        factor: 'S&P 500',
        value: macro.sp500.toFixed(0),
        signal: 'bullish',
        note: 'Strong bull market levels',
      });
    } else if (macro.sp500 > 3500) {
      signals.push({
        factor: 'S&P 500',
        value: macro.sp500.toFixed(0),
        signal: 'neutral',
        note: 'Mid-cycle levels',
      });
    } else {
      score -= 1;
      signals.push({
        factor: 'S&P 500',
        value: macro.sp500.toFixed(0),
        signal: 'bearish',
        note: 'Depressed equity levels — bear market territory',
      });
    }
  }

  // ── USD/JPY ──────────────────────────────────────────────────────────
  if (macro.usdJpy !== null) {
    if (macro.usdJpy > 160) {
      score -= 1;
      signals.push({
        factor: 'USD/JPY',
        value: macro.usdJpy.toFixed(2),
        signal: 'bearish',
        note: 'Extreme JPY weakness — risk for JP investors in US assets',
      });
    } else if (macro.usdJpy > 140) {
      signals.push({
        factor: 'USD/JPY',
        value: macro.usdJpy.toFixed(2),
        signal: 'neutral',
        note: 'Weak JPY — monitor but not extreme',
      });
    } else {
      score += 1;
      signals.push({
        factor: 'USD/JPY',
        value: macro.usdJpy.toFixed(2),
        signal: 'bullish',
        note: 'Stable or strong JPY — favourable for cross-market investors',
      });
    }
  }

  // ── Nikkei trend ────────────────────────────────────────────────────
  if (macro.nikkei225 !== null) {
    if (macro.nikkei225 > 38000) {
      score += 1;
      signals.push({
        factor: 'Nikkei 225',
        value: macro.nikkei225.toFixed(0),
        signal: 'bullish',
        note: 'Nikkei at multi-decade highs — JP market in strong uptrend',
      });
    } else if (macro.nikkei225 > 28000) {
      signals.push({
        factor: 'Nikkei 225',
        value: macro.nikkei225.toFixed(0),
        signal: 'neutral',
        note: 'Nikkei at mid-range levels',
      });
    } else {
      score -= 1;
      signals.push({
        factor: 'Nikkei 225',
        value: macro.nikkei225.toFixed(0),
        signal: 'bearish',
        note: 'Nikkei weak — JP market under pressure',
      });
    }
  }

  // ── Determine regime ────────────────────────────────────────────────
  let regime: MacroRegime;
  let label: string;
  let marginOfSafetyBonus: number;

  if (score >= 2) {
    regime = 'risk-on';
    label = 'Risk-On — Macro conditions are favourable. Standard thresholds apply.';
    marginOfSafetyBonus = 0;
  } else if (score <= -2) {
    regime = 'risk-off';
    label = 'Risk-Off — Macro conditions are unfavourable. Require +10% margin of safety. Focus on quality and defensive sectors.';
    marginOfSafetyBonus = 10;
  } else {
    regime = 'neutral';
    label = 'Neutral — Mixed macro signals. Require +5% margin of safety on all new positions.';
    marginOfSafetyBonus = 5;
  }

  return { regime, marginOfSafetyBonus, label, signals };
}