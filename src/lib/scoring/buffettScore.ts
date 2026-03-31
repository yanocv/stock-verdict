import type { FinancialMetrics, BalanceSheet, InvestorVerdict, InvestorCheck } from '@/types';
import { dcfFairValue } from '@/lib/formulas/valuation';

/**
 * Evaluates a stock through Warren Buffett's investment lens.
 * Focuses on: ROE consistency, low debt, owner earnings, profit margins, moat.
 */
export function evaluateBuffett(
  metrics: FinancialMetrics,
  balanceSheet: BalanceSheet
): InvestorVerdict {
  const checks: InvestorCheck[] = [];

  // 1. ROE > 15%
  const roe = metrics.roe ?? 0;
  checks.push({
    label: 'ROE > 15%',
    passed: roe > 15,
    value: `${roe.toFixed(1)}%`,
    threshold: '> 15%',
    explanation: 'Return on equity above 15% indicates consistent profitability and competitive advantage.',
  });

  // 2. Debt-to-Equity < 0.5
  const de = metrics.debtToEquity ?? Infinity;
  checks.push({
    label: 'Debt/Equity < 0.5',
    passed: de < 0.5,
    value: de === Infinity ? 'N/A' : de.toFixed(2),
    threshold: '< 0.5',
    explanation: 'Low debt means financial resilience and flexibility for capital allocation.',
  });

  // 3. Positive EPS (proxy for owner earnings)
  const eps = metrics.eps ?? 0;
  checks.push({
    label: 'Positive EPS',
    passed: eps > 0,
    value: eps.toFixed(2),
    threshold: '> 0',
    explanation: 'Positive earnings per share signals the company consistently generates profit.',
  });

  // 4. Net profit margin > 10%
  const npm = metrics.netProfitMargin ?? 0;
  checks.push({
    label: 'Net profit margin > 10%',
    passed: npm > 10,
    value: `${npm.toFixed(1)}%`,
    threshold: '> 10%',
    explanation: 'High net profit margins indicate pricing power and operational efficiency.',
  });

  // 5. Positive free cash flow
  const fcf = metrics.freeCashFlow ?? 0;
  checks.push({
    label: 'Positive free cash flow',
    passed: fcf > 0,
    value: fcf > 0 ? 'Positive' : 'Negative',
    threshold: '> 0',
    explanation: 'Free cash flow is the lifeblood Buffett calls "owner earnings".',
  });

  // 6. Moat indicator: operating margin > 15%
  const opMargin = metrics.operatingMargin ?? 0;
  checks.push({
    label: 'Operating margin > 15% (moat proxy)',
    passed: opMargin > 15,
    value: `${opMargin.toFixed(1)}%`,
    threshold: '> 15%',
    explanation: 'Sustained high operating margins often signal a durable competitive moat.',
  });

  // Calculate intrinsic value via DCF (use free cash flow as proxy)
  // sharesOutstanding = 1 is a placeholder; the result represents total enterprise value.
  // Real per-share value requires actual shares outstanding from stock data (Phase 2).
  let fairValue: number | null = null;
  if (fcf > 0 && balanceSheet.shareholderEquity > 0) {
    fairValue = dcfFairValue({
      freeCashFlow: fcf,
      growthRate: Math.min((metrics.epsGrowth ?? 5) / 100, 0.15),
      discountRate: 0.09,
      terminalGrowthRate: 0.03,
      sharesOutstanding: 1,
      projectionYears: 10,
    });
  }

  // Apply 25% margin of safety
  const buyBelow = fairValue !== null ? fairValue * 0.75 : null;

  const passedCount = checks.filter((c) => c.passed).length;
  const recommendation = passedCount >= 5 ? 'BUY' : passedCount >= 3 ? 'WAIT' : 'AVOID';

  const bullish = checks.filter((c) => c.passed).map((c) => c.label);
  const bearish = checks.filter((c) => !c.passed).map((c) => c.label);

  return {
    lens: 'buffett',
    recommendation,
    fairValue,
    buyBelow,
    checks,
    summary: `Buffett analysis: ${passedCount}/6 checks passed. ${bullish.length > 0 ? `Strengths: ${bullish.join(', ')}.` : ''} ${bearish.length > 0 ? `Concerns: ${bearish.join(', ')}.` : ''}`,
  };
}
