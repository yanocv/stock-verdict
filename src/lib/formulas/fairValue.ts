import type { DCFAnalysis, FinancialHistory, FinancialMetrics, StockOverview } from '@/types';
import type { IndustryBenchmarks } from '@/lib/benchmarks/industries';
import { DEFAULT_ENGINE_PARAMS } from '@/lib/scoring/params';
import {
  calculateWACC,
  clampBeta,
  DEFAULT_EQUITY_RISK_PREMIUM,
  DEFAULT_RISK_FREE_RATE,
  DEFAULT_TERMINAL_GROWTH_RATE,
} from './dcfAdvanced';

const DCF_PARAMS = DEFAULT_ENGINE_PARAMS.dcf;

/**
 * How the fair value was reached:
 * - 'dcf-fcf': DCF on average free cash flow
 * - 'dcf-earnings': DCF on average earnings after reinvestment (FCF distorted)
 * - 'pb-roe': banks and insurers — book value × justified P/B from ROE
 */
export type FairValueMethod = 'dcf-fcf' | 'dcf-earnings' | 'pb-roe';

export interface FairValueEstimate {
  /** Fair value per share used by the verdict, or null when none is reliable */
  value: number | null;
  method: FairValueMethod | null;
  /** Per-share value from the method, before the sanity cap */
  modelValue: number | null;
  /** EPS × sector fair P/E: the reference for the sanity cap */
  multiplesValue: number | null;
  /** 'capped' when modelValue was above `dcf.sanityCap` × multiplesValue */
  adjustment: 'capped' | null;
}

/** Banks, insurers and other financials: cash flow isn't meaningful, book value is. */
export function isFinancialCompany(overview: Pick<StockOverview, 'sector'>): boolean {
  return overview.sector === 'Financial Services';
}

/**
 * Justified price-to-book: P/B = (ROE − g) ÷ (cost of equity − g), times book
 * value per share. ROE is the latest from financials, else the average of
 * recent years (net income ÷ equity). Null when equity is missing or ROE
 * doesn't beat long-run growth.
 */
export function pbRoeFairValue(input: {
  financials: Pick<FinancialMetrics, 'roe' | 'beta'>;
  history: Pick<FinancialHistory, 'incomeAnnual' | 'balanceAnnual'> | null | undefined;
  sharesOutstanding: number;
  riskFreeRate: number;
}): number | null {
  const { financials, history, sharesOutstanding, riskFreeRate } = input;
  const equities = (history?.balanceAnnual ?? [])
    .map((p) => p.shareholderEquity)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  const equity = equities[equities.length - 1];
  if (equity === undefined || sharesOutstanding <= 0) {return null;}

  let roe = financials.roe !== null ? financials.roe / 100 : null;
  if (roe === null) {
    const years = DCF_PARAMS.cashFlowYears;
    const incomes = (history?.incomeAnnual ?? [])
      .map((p) => p.netIncome)
      .filter((v): v is number => typeof v === 'number')
      .slice(-years);
    const recentEquity = equities.slice(-years);
    if (incomes.length > 0) {
      const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
      roe = avg(incomes) / avg(recentEquity);
    }
  }
  if (roe === null) {return null;}

  const growth = Math.min(DEFAULT_TERMINAL_GROWTH_RATE, riskFreeRate);
  const costOfEquity = calculateWACC(riskFreeRate, clampBeta(financials.beta ?? 1), DEFAULT_EQUITY_RISK_PREMIUM);
  if (roe <= growth || costOfEquity <= growth) {return null;}

  return (equity / sharesOutstanding) * ((roe - growth) / (costOfEquity - growth));
}

/**
 * The fair value the verdict uses. Picks the method by company type, then
 * caps the result at `dcf.sanityCap` × (EPS × sector fair P/E), so a model
 * fed with odd data can't claim a stock is worth several times what its
 * earnings support.
 */
export function estimateFairValue(input: {
  overview: Pick<StockOverview, 'sector' | 'sharesOutstanding'>;
  financials: Pick<FinancialMetrics, 'roe' | 'beta' | 'eps'>;
  history: Pick<FinancialHistory, 'incomeAnnual' | 'balanceAnnual'> | null | undefined;
  dcf: Pick<DCFAnalysis, 'baseCase' | 'cashFlowBasis' | 'riskFreeRate' | 'currencyMismatch'>;
  benchmarks: Pick<IndustryBenchmarks, 'pe'>;
}): FairValueEstimate {
  const { overview, financials, history, dcf, benchmarks } = input;
  const none: FairValueEstimate = { value: null, method: null, modelValue: null, multiplesValue: null, adjustment: null };
  if (dcf.currencyMismatch) {return none;}

  let method: FairValueMethod | null;
  let modelValue: number | null;
  if (isFinancialCompany(overview)) {
    method = 'pb-roe';
    modelValue = pbRoeFairValue({
      financials,
      history,
      sharesOutstanding: overview.sharesOutstanding,
      riskFreeRate: dcf.riskFreeRate ?? DEFAULT_RISK_FREE_RATE,
    });
  } else {
    method = dcf.cashFlowBasis === 'earnings' ? 'dcf-earnings' : dcf.cashFlowBasis === 'fcf' ? 'dcf-fcf' : null;
    modelValue = dcf.baseCase;
  }

  const multiplesValue = financials.eps !== null && financials.eps > 0 ? financials.eps * benchmarks.pe.fair : null;
  if (modelValue === null) {return { ...none, method, multiplesValue };}

  const cap = multiplesValue !== null ? multiplesValue * DCF_PARAMS.sanityCap : Infinity;
  return modelValue > cap
    ? { value: cap, method, modelValue, multiplesValue, adjustment: 'capped' }
    : { value: modelValue, method, modelValue, multiplesValue, adjustment: null };
}
