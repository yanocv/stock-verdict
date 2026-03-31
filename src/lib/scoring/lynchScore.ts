import type { FinancialMetrics, BalanceSheet, InvestorVerdict, InvestorCheck, LynchCategory } from '@/types';
import { classifyLynchCategory } from '@/lib/classifiers/lynchCategory';
import { lynchFairValue } from '@/lib/formulas/valuation';

/**
 * Evaluates a stock through Peter Lynch's investment lens.
 * Focuses on: PEG ratio, Lynch category, debt levels, growth consistency.
 */
export function evaluateLynch(
  metrics: FinancialMetrics,
  _balanceSheet: BalanceSheet
): InvestorVerdict {
  const checks: InvestorCheck[] = [];

  const epsGrowth = metrics.epsGrowth ?? 0;
  const lynchCategory: LynchCategory = classifyLynchCategory({
    epsGrowthRate: epsGrowth,
    sector: '',
    recentLoss: (metrics.eps ?? 0) < 0,
    improvingEarnings: epsGrowth > 0,
  });

  // 1. PEG < 1.0 (Lynch's golden rule)
  const peg = metrics.pegRatio ?? Infinity;
  checks.push({
    label: 'PEG Ratio < 1.0',
    passed: peg > 0 && peg < 1.0,
    value: peg === Infinity ? 'N/A' : peg.toFixed(2),
    threshold: '< 1.0',
    explanation: 'PEG < 1 means you are paying less than the growth rate — Lynch\'s sweet spot.',
  });

  // 2. Debt-to-Equity < 0.33
  const de = metrics.debtToEquity ?? Infinity;
  checks.push({
    label: 'Debt/Equity < 0.33',
    passed: de < 0.33,
    value: de === Infinity ? 'N/A' : de.toFixed(2),
    threshold: '< 0.33',
    explanation: 'Lynch preferred companies with minimal debt, especially for growth stocks.',
  });

  // 3. Positive EPS growth
  checks.push({
    label: 'Positive EPS growth',
    passed: epsGrowth > 0,
    value: `${epsGrowth.toFixed(1)}%`,
    threshold: '> 0%',
    explanation: 'Lynch looked for companies growing earnings consistently.',
  });

  // 4. P/E below growth rate (related to PEG)
  const pe = metrics.peRatio ?? Infinity;
  checks.push({
    label: 'P/E below EPS growth rate',
    passed: pe !== Infinity && pe < epsGrowth,
    value: pe === Infinity ? 'N/A' : pe.toFixed(1),
    threshold: `< ${epsGrowth.toFixed(1)}% (growth rate)`,
    explanation: 'If P/E < growth rate, the stock may be undervalued relative to its growth.',
  });

  // 5. Positive free cash flow
  const fcf = metrics.freeCashFlow ?? 0;
  checks.push({
    label: 'Positive free cash flow',
    passed: fcf > 0,
    value: fcf > 0 ? 'Positive' : 'Negative',
    threshold: '> 0',
    explanation: 'Lynch preferred companies that generate real cash, not just accounting profits.',
  });

  // Calculate Lynch fair value (EPS × EPS growth rate)
  const eps = metrics.eps ?? 0;
  const fairValue = eps > 0 && epsGrowth > 0 ? lynchFairValue(eps, epsGrowth) : null;
  const buyBelow = fairValue !== null ? fairValue : null;

  const passedCount = checks.filter((c) => c.passed).length;
  const recommendation = passedCount >= 4 ? 'BUY' : passedCount >= 2 ? 'WAIT' : 'AVOID';

  const bullish = checks.filter((c) => c.passed).map((c) => c.label);
  const bearish = checks.filter((c) => !c.passed).map((c) => c.label);

  return {
    lens: 'lynch',
    recommendation,
    fairValue,
    buyBelow,
    checks,
    summary: `Lynch analysis (${lynchCategory}): ${passedCount}/5 checks passed. ${bullish.length > 0 ? `Strengths: ${bullish.join(', ')}.` : ''} ${bearish.length > 0 ? `Concerns: ${bearish.join(', ')}.` : ''}`,
  };
}
