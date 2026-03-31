/**
 * Financial health scoring functions.
 */

export interface AltmanZParams {
  workingCapital: number;
  retainedEarnings: number;
  ebit: number;
  marketCap: number;
  totalLiabilities: number;
  revenue: number;
  totalAssets: number;
}

export interface AltmanZResult {
  score: number;
  zone: 'safe' | 'grey' | 'distress';
}

/**
 * Altman Z-Score for public companies.
 * Z = 1.2A + 1.4B + 3.3C + 0.6D + 1.0E
 * A = Working Capital / Total Assets
 * B = Retained Earnings / Total Assets
 * C = EBIT / Total Assets
 * D = Market Cap / Total Liabilities
 * E = Revenue / Total Assets
 *
 * Zone: > 3.0 = safe, 1.8–3.0 = grey, < 1.8 = distress
 */
export function altmanZScore(params: AltmanZParams): AltmanZResult {
  const { workingCapital, retainedEarnings, ebit, marketCap, totalLiabilities, revenue, totalAssets } = params;

  if (totalAssets === 0) {
    return { score: 0, zone: 'distress' };
  }

  const A = workingCapital / totalAssets;
  const B = retainedEarnings / totalAssets;
  const C = ebit / totalAssets;
  const D = totalLiabilities !== 0 ? marketCap / totalLiabilities : 0;
  const E = revenue / totalAssets;

  const score = 1.2 * A + 1.4 * B + 3.3 * C + 0.6 * D + 1.0 * E;

  let zone: 'safe' | 'grey' | 'distress';
  if (score > 3.0) {
    zone = 'safe';
  } else if (score >= 1.8) {
    zone = 'grey';
  } else {
    zone = 'distress';
  }

  return { score, zone };
}

export interface PiotroskiParams {
  // Profitability signals
  netIncome: number;
  operatingCashFlow: number;
  returnOnAssets: number;
  prevReturnOnAssets: number;
  accruals: number; // operatingCashFlow / totalAssets - ROA
  // Leverage, Liquidity & Source of Funds signals
  longTermDebtRatioCurrent: number;
  longTermDebtRatioPrev: number;
  currentRatioCurrent: number;
  currentRatioPrev: number;
  sharesOutstandingCurrent: number;
  sharesOutstandingPrev: number;
  // Operating Efficiency signals
  grossMarginCurrent: number;
  grossMarginPrev: number;
  assetTurnoverCurrent: number;
  assetTurnoverPrev: number;
}

export interface PiotroskiResult {
  score: number;
  checks: { label: string; passed: boolean }[];
}

/**
 * Piotroski F-Score: 9 binary checks producing a score from 0 to 9.
 * Score >= 7 = strong, 4-6 = neutral, <= 3 = weak
 */
export function piotroskiFScore(params: PiotroskiParams): PiotroskiResult {
  const checks: { label: string; passed: boolean }[] = [
    // Profitability
    {
      label: 'Positive net income',
      passed: params.netIncome > 0,
    },
    {
      label: 'Positive operating cash flow',
      passed: params.operatingCashFlow > 0,
    },
    {
      label: 'Increasing return on assets',
      passed: params.returnOnAssets > params.prevReturnOnAssets,
    },
    {
      label: 'Cash flow exceeds net income (accruals)',
      passed: params.operatingCashFlow > params.netIncome,
    },
    // Leverage, Liquidity & Dilution
    {
      label: 'Decreasing long-term debt ratio',
      passed: params.longTermDebtRatioCurrent < params.longTermDebtRatioPrev,
    },
    {
      label: 'Increasing current ratio',
      passed: params.currentRatioCurrent > params.currentRatioPrev,
    },
    {
      label: 'No new shares issued (no dilution)',
      passed: params.sharesOutstandingCurrent <= params.sharesOutstandingPrev,
    },
    // Operating Efficiency
    {
      label: 'Increasing gross margin',
      passed: params.grossMarginCurrent > params.grossMarginPrev,
    },
    {
      label: 'Increasing asset turnover',
      passed: params.assetTurnoverCurrent > params.assetTurnoverPrev,
    },
  ];

  const score = checks.filter((c) => c.passed).length;
  return { score, checks };
}

export interface RiskScoreParams {
  beta: number;
  maxDrawdown: number;   // percentage as positive number e.g. 30 for -30%
  zScore: number;        // Altman Z-Score
  debtToEquity: number;
  revenueVolatility: number; // coefficient of variation as percentage
}

/**
 * Composite Risk Score (1-10, lower = less risk).
 * Factors: beta, max drawdown, Altman Z-Score, debt/equity, revenue volatility.
 */
export function calculateRiskScore(params: RiskScoreParams): number {
  const { beta, maxDrawdown, zScore, debtToEquity, revenueVolatility } = params;

  // Beta component (0-2): higher beta = more risk
  const betaScore = Math.min(beta / 2, 1) * 2;

  // Max drawdown component (0-2): 0% = 0 risk, 50%+ = max risk
  const drawdownScore = Math.min(maxDrawdown / 50, 1) * 2;

  // Z-Score component (0-2): higher Z = less risk
  const zRisk = zScore >= 3 ? 0 : zScore >= 1.8 ? 1 : 2;

  // Debt/Equity component (0-2): 0 = safe, 2+ = risky
  const debtScore = Math.min(debtToEquity / 2, 1) * 2;

  // Revenue volatility (0-2): 0% = safe, 50%+ = risky
  const volatilityScore = Math.min(revenueVolatility / 50, 1) * 2;

  const rawScore = betaScore + drawdownScore + zRisk + debtScore + volatilityScore;
  // rawScore is 0-10, clamp to 1-10
  return Math.max(1, Math.min(10, Math.round(rawScore)));
}
