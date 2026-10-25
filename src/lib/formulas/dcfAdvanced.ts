import type {
  BalanceSheet,
  DCFAnalysis,
  FinancialHistory,
  FinancialMetrics,
  SensitivityCell,
  StockOverview,
} from '@/types';
import { DEFAULT_ENGINE_PARAMS } from '@/lib/scoring/params';

const DCF_PARAMS = DEFAULT_ENGINE_PARAMS.dcf;

/**
 * Default equity risk premium (Damodaran global estimate).
 * Used when no custom ERP is provided.
 */
export const DEFAULT_EQUITY_RISK_PREMIUM = DCF_PARAMS.equityRiskPremium; // 5.5%

/**
 * Default risk-free rate fallback when no live 10Y treasury data is available.
 */
export const DEFAULT_RISK_FREE_RATE = DCF_PARAMS.riskFreeRate; // 4.5%

/**
 * Terminal growth rate for the Gordon Growth Model exit.
 */
export const DEFAULT_TERMINAL_GROWTH_RATE = DCF_PARAMS.terminalGrowth; // 3%

/** Growth clamp for the first projection year (growth then fades to terminal). */
export const MAX_GROWTH_RATE = DCF_PARAMS.maxGrowth;
export const MIN_GROWTH_RATE = DCF_PARAMS.minGrowth;

/** Growth assumed when no history or estimate is available. */
export const DEFAULT_GROWTH_RATE = DCF_PARAMS.defaultGrowth;

/**
 * Present value of projected FCF plus terminal value.
 *
 * Growth starts at `growthRate` in year 1 and fades linearly to
 * `terminalGrowthRate` by the final year, so a high near-term growth rate
 * isn't compounded for the full projection period.
 */
export function projectCashFlows(
  freeCashFlow: number,
  growthRate: number,
  wacc: number,
  terminalGrowthRate: number,
  projectionYears: number
): { pvProjected: number; pvTerminal: number } {
  let pvProjected = 0;
  let fcf = freeCashFlow;

  for (let year = 1; year <= projectionYears; year++) {
    const fade = projectionYears > 1 ? (year - 1) / (projectionYears - 1) : 0;
    const growth = growthRate + (terminalGrowthRate - growthRate) * fade;
    fcf = fcf * (1 + growth);
    pvProjected += fcf / Math.pow(1 + wacc, year);
  }

  // Terminal value (Gordon Growth Model)
  const terminalValue = (fcf * (1 + terminalGrowthRate)) / (wacc - terminalGrowthRate);
  const pvTerminal = terminalValue / Math.pow(1 + wacc, projectionYears);

  return { pvProjected, pvTerminal };
}

/**
 * Compound annual growth rate between two positive values `years` apart.
 * Returns null when either value is non-positive (CAGR is undefined).
 */
export function cagr(first: number, last: number, years: number): number | null {
  if (first <= 0 || last <= 0 || years <= 0) {return null;}
  return Math.pow(last / first, 1 / years) - 1;
}

function seriesCagr(values: Array<number | null | undefined>): number | null {
  const points = values
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => typeof p.v === 'number' && Number.isFinite(p.v));
  const first = points[0];
  const last = points[points.length - 1];
  // Need at least two years between endpoints to say anything about a trend
  if (!first || !last || last.i - first.i < 2) {return null;}
  return cagr(first.v, last.v, last.i - first.i);
}

/**
 * Estimates the starting FCF growth rate (decimal) for the DCF.
 *
 * Takes the median of the estimates that are available:
 * - FCF CAGR over the annual history
 * - Revenue CAGR over the annual history
 * - Yahoo's earnings growth (latest quarter YoY — noisy on its own)
 *
 * The median keeps one outlier (e.g. a rebound quarter) from setting the
 * valuation. Falls back to DEFAULT_GROWTH_RATE when nothing is available.
 */
export function estimateGrowthRate(
  financials: Pick<FinancialMetrics, 'epsGrowth'>,
  history?: Pick<FinancialHistory, 'cashFlowAnnual' | 'incomeAnnual'> | null
): number {
  const estimates: number[] = [];

  const fcfCagr = seriesCagr(history?.cashFlowAnnual.map((p) => p.freeCashFlow) ?? []);
  if (fcfCagr !== null) {estimates.push(fcfCagr);}

  const revenueCagr = seriesCagr(history?.incomeAnnual.map((p) => p.revenue) ?? []);
  if (revenueCagr !== null) {estimates.push(revenueCagr);}

  if (financials.epsGrowth !== null && financials.epsGrowth !== undefined) {
    estimates.push(financials.epsGrowth / 100);
  }

  if (estimates.length === 0) {return DEFAULT_GROWTH_RATE;}

  const sorted = [...estimates].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

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

  const { pvProjected, pvTerminal } = projectCashFlows(
    freeCashFlow, growthRate, wacc, terminalGrowthRate, projectionYears
  );

  // Enterprise value → equity value: subtract net debt
  const equityValue = pvProjected + pvTerminal - netDebt;
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
  const clampedGrowth = Math.min(MAX_GROWTH_RATE, Math.max(MIN_GROWTH_RATE, growthRate));

  // Base case DCF
  let pvProjected: number | null = null;
  let pvTerminal: number | null = null;
  let baseCase: number | null = null;

  if (freeCashFlow > 0 && sharesOutstanding > 0 && wacc > terminalGrowthRate) {
    const pv = projectCashFlows(freeCashFlow, clampedGrowth, wacc, terminalGrowthRate, projectionYears);

    pvProjected = Math.round(pv.pvProjected * 100) / 100;
    pvTerminal = Math.round(pv.pvTerminal * 100) / 100;

    const equityValue = pv.pvProjected + pv.pvTerminal - netDebt;
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
 * Returns the two currencies when the financial statements are reported in a
 * different currency than the share price (e.g. ADRs), else null. Per-share
 * values from statement amounts are meaningless without conversion and an ADR
 * ratio, so callers should not show them.
 */
export function getCurrencyMismatch(
  overview: Pick<StockOverview, 'currency' | 'financialCurrency'>
): { price: string; financial: string } | null {
  const financial = overview.financialCurrency || overview.currency;
  return financial !== overview.currency ? { price: overview.currency, financial } : null;
}

/**
 * Runs the advanced DCF from fetched stock data, so every caller (full
 * analysis, screener) values a stock with the same inputs.
 */
export function runAdvancedDCFForStock(
  overview: StockOverview,
  financials: FinancialMetrics,
  balanceSheet: BalanceSheet,
  history?: FinancialHistory | null
): DCFAnalysis {
  const currencyMismatch = getCurrencyMismatch(overview);
  const analysis = runAdvancedDCF({
    // No FCF → no base case when currencies differ
    freeCashFlow: currencyMismatch ? 0 : financials.freeCashFlow ?? 0,
    sharesOutstanding: overview.sharesOutstanding,
    netDebt: balanceSheet.totalDebt - balanceSheet.cash,
    beta: financials.beta ?? 1.0,
    growthRate: estimateGrowthRate(financials, history),
    riskFreeRate: null, // will use DEFAULT_RISK_FREE_RATE (4.5%)
    currentPrice: overview.currentPrice,
  });
  return currencyMismatch
    ? { ...analysis, sensitivityTable: [], currencyMismatch }
    : { ...analysis, currencyMismatch };
}
