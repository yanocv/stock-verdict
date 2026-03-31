import type { FinancialMetrics, BalanceSheet, InvestorVerdict, InvestorCheck } from '@/types';
import { grahamNumber } from '@/lib/formulas/valuation';

/**
 * Evaluates a stock through Benjamin Graham's investment lens.
 * Focuses on: Graham Number, P/E < 15, P/B < 1.5, current ratio > 2.
 */
export function evaluateGraham(
  metrics: FinancialMetrics,
  balanceSheet: BalanceSheet,
  priceData: { currentPrice: number }
): InvestorVerdict {
  const checks: InvestorCheck[] = [];
  const { currentPrice } = priceData;

  // 1. P/E < 15
  const pe = metrics.peRatio ?? Infinity;
  checks.push({
    label: 'P/E Ratio < 15',
    passed: pe > 0 && pe < 15,
    value: pe === Infinity ? 'N/A' : pe.toFixed(1),
    threshold: '< 15',
    explanation: 'Graham considered stocks with P/E below 15 as reasonably priced.',
  });

  // 2. P/B < 1.5
  const pb = metrics.pbRatio ?? Infinity;
  checks.push({
    label: 'P/B Ratio < 1.5',
    passed: pb > 0 && pb < 1.5,
    value: pb === Infinity ? 'N/A' : pb.toFixed(2),
    threshold: '< 1.5',
    explanation: 'Buying below book value provides a margin of safety on assets.',
  });

  // 3. P/E × P/B < 22.5
  const pePb = pe !== Infinity && pb !== Infinity ? pe * pb : Infinity;
  checks.push({
    label: 'P/E × P/B < 22.5',
    passed: pePb < 22.5,
    value: pePb === Infinity ? 'N/A' : pePb.toFixed(1),
    threshold: '< 22.5',
    explanation: 'Combined valuation check combining earnings and asset value.',
  });

  // 4. Current Ratio > 2.0
  const cr = metrics.currentRatio ?? 0;
  checks.push({
    label: 'Current Ratio > 2.0',
    passed: cr > 2.0,
    value: cr.toFixed(2),
    threshold: '> 2.0',
    explanation: 'Graham required strong liquidity to protect bondholders and shareholders.',
  });

  // 5. Positive EPS
  const eps = metrics.eps ?? 0;
  checks.push({
    label: 'Positive EPS',
    passed: eps > 0,
    value: eps.toFixed(2),
    threshold: '> 0',
    explanation: 'Company must have a history of positive earnings.',
  });

  // 6. Dividend record (paying dividends)
  const divYield = metrics.dividendYield ?? 0;
  checks.push({
    label: 'Pays dividends',
    passed: divYield > 0,
    value: `${divYield.toFixed(2)}%`,
    threshold: '> 0%',
    explanation: 'Graham favored companies with a consistent dividend payment history.',
  });

  // Calculate Graham Number as fair value
  const bvps =
    balanceSheet.shareholderEquity > 0
      ? balanceSheet.shareholderEquity
      : null;
  const fairValue = eps > 0 && bvps !== null ? grahamNumber(eps, bvps) : null;
  const buyBelow = fairValue !== null ? Math.min(fairValue, currentPrice * 0.8) : null;

  const passedCount = checks.filter((c) => c.passed).length;
  const recommendation = passedCount >= 5 ? 'BUY' : passedCount >= 3 ? 'WAIT' : 'AVOID';

  const bullish = checks.filter((c) => c.passed).map((c) => c.label);
  const bearish = checks.filter((c) => !c.passed).map((c) => c.label);

  return {
    lens: 'graham',
    recommendation,
    fairValue,
    buyBelow,
    checks,
    summary: `Graham analysis: ${passedCount}/6 checks passed. ${bullish.length > 0 ? `Strengths: ${bullish.join(', ')}.` : ''} ${bearish.length > 0 ? `Concerns: ${bearish.join(', ')}.` : ''}`,
  };
}
