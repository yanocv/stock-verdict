import type { MacroData } from '@/types';
import type { IndexTrend } from '@/types/macro';
import type { EngineParams } from './params';
import { DEFAULT_ENGINE_PARAMS } from './params';

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
 * Indices vote by trend (classifyIndexTrend), never by level: levels drift up
 * over time, so a fixed level would read "bullish" forever.
 *
 * Per docs_INVESTMENT_PHILOSOPHY.md:
 * - Risk-on  (VIX < 18, normal yield curve, PMI > 52) → standard thresholds
 * - Neutral  (mixed signals)                           → require +5% MoS
 * - Risk-off (VIX > 28, inverted curve, PMI < 48)      → require +10% MoS
 */
export function determineMacroRegime(
  macro: MacroData,
  p: EngineParams = DEFAULT_ENGINE_PARAMS
): MacroRegimeResult {
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

  // ── Index trends (S&P 500, Nikkei 225) ──────────────────────────────
  for (const [factor, trend] of [
    ['S&P 500', macro.sp500Trend],
    ['Nikkei 225', macro.nikkeiTrend],
  ] as const) {
    if (trend === null) {continue;}
    const signal = classifyIndexTrend(trend, p.regime);
    score += signal === 'bullish' ? 1 : signal === 'bearish' ? -1 : 0;
    signals.push({
      factor,
      value: `${trend.vsSma200Pct >= 0 ? '+' : ''}${trend.vsSma200Pct}% vs 200-day · ${trend.drawdownPct}% off high`,
      signal,
      note:
        signal === 'bullish'
          ? 'Uptrend: above its 200-day average and near its high'
          : signal === 'bearish'
            ? 'Downtrend: below its 200-day average and well off its high'
            : 'Mixed trend',
    });
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

  // ── Determine regime ────────────────────────────────────────────────
  const bonus = p.regime.mosBonus;
  let regime: MacroRegime;
  let label: string;
  let marginOfSafetyBonus: number;

  if (score >= 2) {
    regime = 'risk-on';
    marginOfSafetyBonus = Math.round(bonus.riskOn * 100);
    label = 'Risk-On — Macro conditions are favourable. Standard thresholds apply.';
  } else if (score <= -2) {
    regime = 'risk-off';
    marginOfSafetyBonus = Math.round(bonus.riskOff * 100);
    label = `Risk-Off — Macro conditions are unfavourable. Require +${marginOfSafetyBonus}% margin of safety. Focus on quality and defensive sectors.`;
  } else {
    regime = 'neutral';
    marginOfSafetyBonus = Math.round(bonus.neutral * 100);
    label = `Neutral — Mixed macro signals. Require +${marginOfSafetyBonus}% margin of safety on all new positions.`;
  }

  return { regime, marginOfSafetyBonus, label, signals };
}

/**
 * Bullish: above the 200-day average and less than `shallowDrawdownPct` off
 * the 52-week high. Bearish: below the average and more than that off the
 * high, or more than `deepDrawdownPct` off the high on its own. Else neutral.
 */
export function classifyIndexTrend(
  trend: IndexTrend,
  r: EngineParams['regime']
): RegimeSignal['signal'] {
  if (trend.drawdownPct > r.deepDrawdownPct) {return 'bearish';}
  if (trend.vsSma200Pct > 0 && trend.drawdownPct < r.shallowDrawdownPct) {return 'bullish';}
  if (trend.vsSma200Pct < 0 && trend.drawdownPct >= r.shallowDrawdownPct) {return 'bearish';}
  return 'neutral';
}