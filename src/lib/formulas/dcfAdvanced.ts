import type { BalanceSheet, DCFAnalysis, FinancialMetrics, SensitivityCell, StockOverview } from '@/types';

/**
 * Default equity risk premium (Damodaran global estimate).
 * Used when no custom ERP is provided.
 */
export const DEFAULT_EQUITY_RISK_PREMIUM = 0.055; // 5.5%

/**
 * Default risk-free rate fallback when no live 10Y treasury data is available.
 */
export const DEFAULT_RISK_FREE_RATE = 0.045; // 4.5%

/**
 * Terminal growth rate for the Gordon Growth Model exit.
 */
export const DEFAULT_TERMINAL_GROWTH_RATE = 0.03; // 3%

export interface AdvancedDCFParams {
  freeCashFlow: number;
  sharesOutstanding: number;
  netDebt: number;               // totalDebt - cash (can be negative = net cash)
  beta: number;
  /** Annual FCF growth rate as decimal (e.g. 0.08 for 8%) */
  growthRate: number;
  /** 10Y Treasury yield as decimal. Falls back to DEFAULT_RISK_FREE_RATE if null. */
  riskFreeRate: number | null;
  /** Equity risk premium as decimal. Defaults to DEFAULT_EQUITY_RISK_PREMIUM. */
  equityRiskPremium?: number;
  /** Terminal growth rate. Defaults to DEFAULT_TERMINAL_GROWTH_RATE. */
  terminalGrowthRate?: number;
  /** Projection years. Default 10. */
  projectionYears?: number;
  /** Current price per share — used to calculate margin of safety. */
  currentPrice: number;
}

/**
 * Calculates WACC using the Capital Asset Pricing Model (CAPM).
 *
 * WACC (equity-only simplified) = riskFreeRate + beta × equityRiskPremium
 *
 * For simplicity we treat the company as all-equity financed here.
 * A full WACC would require cost-of-debt and capital structure weights,
 * which requires data not reliably available from Yahoo Finance for all tickers.
 */
export function calculateWACC(
  riskFreeRate: number,
  beta: number,
  equityRiskPremium: number
): number {
  const wacc = riskFreeRate + beta * equityRiskPremium;
  // Clamp between 5% and 25% to avoid nonsensical results from extreme betas
  return Math.min(0.25, Math.max(0.05, wacc));
}

/**
 * Calculates DCF fair value per share for a given WACC and growth rate.
 * Includes: projection-period PV + terminal value PV, adjusted for net debt.
 *
 * Returns null if inputs are invalid.
 */
export function dcfWithWACC(
  freeCashFlow: number,
  growthRate: number,
  wacc: number,
  terminalGrowthRate: number,
  sharesOutstanding: number,
  netDebt: number,
  projectionYears: number
): number | null {
  if (freeCashFlow <= 0) {return null;}
  if (sharesOutstanding <= 0) {return null;}
  if (wacc <= terminalGrowthRate) {return null;}
  if (projectionYears <= 0) {return null;}

  let totalPV = 0;
  let fcf = freeCashFlow;

  for (let year = 1; year <= projectionYears; year++) {
    fcf = fcf * (1 + growthRate);
    totalPV += fcf / Math.pow(1 + wacc, year);
  }

  // Terminal value (Gordon Growth Model)
  const terminalValue = (fcf * (1 + terminalGrowthRate)) / (wacc - terminalGrowthRate);
  const pvTerminal = terminalValue / Math.pow(1 + wacc, projectionYears);

  // Enterprise value → equity value: subtract net debt
  const equityValue = totalPV + pvTerminal - netDebt;
  if (equityValue <= 0) {return null;}

  return equityValue / sharesOutstanding;
}

/**
 * Builds a 5×5 sensitivity table varying WACC and growth rate.
 *
 * WACC axis: base ± [0.02, 0.01, 0, 0.01, 0.02]
 * Growth axis: base ± [0.02, 0.01, 0, 0.01, 0.02]
 *
 * Returns a 5×5 matrix where:
 *   rows = WACC from lowest (base-2%) to highest (base+2%)
 *   cols = growth rate from lowest (base-2%) to highest (base+2%)
 */
export function buildSensitivityTable(
  baseWACC: number,
  baseGrowth: number,
  freeCashFlow: number,
  terminalGrowthRate: number,
  sharesOutstanding: number,
  netDebt: number,
  projectionYears: number
): SensitivityCell[][] {
  const waccOffsets = [-0.02, -0.01, 0, 0.01, 0.02];
  const growthOffsets = [-0.02, -0.01, 0, 0.01, 0.02];

  return waccOffsets.map((wo) => {
    const wacc = Math.max(0.01, baseWACC + wo);
    return growthOffsets.map((go) => {
      const growth = Math.max(-0.05, baseGrowth + go);
      const fv = dcfWithWACC(
        freeCashFlow,
        growth,
        wacc,
        terminalGrowthRate,
        sharesOutstanding,
        netDebt,
        projectionYears
      );
      return {
        wacc,
        growthRate: growth,
        fairValue: fv !== null ? Math.round(fv * 100) / 100 : 0,
      };
    });
  });
}

/**
 * Full advanced DCF analysis: base case + WACC calculation + sensitivity table.
 */
export function runAdvancedDCF(params: AdvancedDCFParams): DCFAnalysis {
  const {
    freeCashFlow,
    sharesOutstanding,
    netDebt,
    beta,
    growthRate,
    riskFreeRate: rfRaw,
    equityRiskPremium = DEFAULT_EQUITY_RISK_PREMIUM,
    terminalGrowthRate = DEFAULT_TERMINAL_GROWTH_RATE,
    projectionYears = 10,
    currentPrice,
  } = params;

  const riskFreeRate = rfRaw ?? DEFAULT_RISK_FREE_RATE;

  // Clamp beta to avoid extreme WACC values
  const betaUsed = Math.min(3, Math.max(0.3, beta));
  const wacc = calculateWACC(riskFreeRate, betaUsed, equityRiskPremium);

  // Clamp growth rate
  const clampedGrowth = Math.min(0.20, Math.max(-0.05, growthRate));

  // Base case DCF
  let pvProjected: number | null = null;
  let pvTerminal: number | null = null;
  let baseCase: number | null = null;

  if (freeCashFlow > 0 && sharesOutstanding > 0 && wacc > terminalGrowthRate) {
    let totalPV = 0;
    let fcf = freeCashFlow;

    for (let year = 1; year <= projectionYears; year++) {
      fcf = fcf * (1 + clampedGrowth);
      totalPV += fcf / Math.pow(1 + wacc, year);
    }

    const tv = (fcf * (1 + terminalGrowthRate)) / (wacc - terminalGrowthRate);
    const tvPV = tv / Math.pow(1 + wacc, projectionYears);

    pvProjected = Math.round(totalPV * 100) / 100;
    pvTerminal = Math.round(tvPV * 100) / 100;

    const equityValue = totalPV + tvPV - netDebt;
    baseCase = equityValue > 0 ? Math.round((equityValue / sharesOutstanding) * 100) / 100 : null;
  }

  const marginOfSafety =
    baseCase !== null && currentPrice > 0
      ? Math.round(((baseCase - currentPrice) / baseCase) * 100 * 10) / 10
      : null;

  const sensitivityTable = buildSensitivityTable(
    wacc,
    clampedGrowth,
    freeCashFlow,
    terminalGrowthRate,
    sharesOutstanding,
    netDebt,
    projectionYears
  );

  return {
    baseCase,
    wacc: Math.round(wacc * 10000) / 10000, // 4 decimal places
    riskFreeRate,
    equityRiskPremium,
    betaUsed,
    growthRate: clampedGrowth,
    terminalGrowthRate,
    projectionYears,
    pvProjected,
    pvTerminal,
    sensitivityTable,
    marginOfSafety,
  };
}
/**
 * Runs the advanced DCF from fetched stock data, so every caller (full
 * analysis, screener) values a stock with the same inputs.
 */
export function runAdvancedDCFForStock(
  overview: StockOverview,
  financials: FinancialMetrics,
  balanceSheet: BalanceSheet
): DCFAnalysis {
  return runAdvancedDCF({
    freeCashFlow: financials.freeCashFlow ?? 0,
    sharesOutstanding: overview.sharesOutstanding,
    netDebt: balanceSheet.totalDebt - balanceSheet.cash,
    beta: financials.beta ?? 1.0,
    growthRate: Math.min(0.20, Math.max(-0.05, (financials.epsGrowth ?? 5) / 100)),
    riskFreeRate: null, // will use DEFAULT_RISK_FREE_RATE (4.5%)
    currentPrice: overview.currentPrice,
  });
}
