import { describe, it, expect } from 'vitest';
import { estimateFairValue, pbRoeFairValue, isFinancialCompany } from './fairValue';
import { DEFAULT_ENGINE_PARAMS } from '@/lib/scoring/params';

const { betaFloor, equityRiskPremium, sanityCap } = DEFAULT_ENGINE_PARAMS.dcf;
const benchmarks = { pe: { cheap: 10, fair: 15, expensive: 25 } };
const dcf = (baseCase: number | null, cashFlowBasis: 'fcf' | 'earnings' | null = 'fcf') => ({
  baseCase,
  cashFlowBasis,
  riskFreeRate: 0.03,
  currencyMismatch: null,
});
const industrial = { sector: 'Industrials', sharesOutstanding: 100 };

describe('estimateFairValue', () => {
  it('passes the DCF value through when it agrees with earnings', () => {
    // EPS 10 × fair P/E 15 = 150; DCF 200 is under the 1.5× cap (225)
    const fv = estimateFairValue({ overview: industrial, financials: { roe: 12, beta: 1, eps: 10 }, history: null, dcf: dcf(200), benchmarks });
    expect(fv).toEqual({ value: 200, method: 'dcf-fcf', modelValue: 200, multiplesValue: 150, adjustment: null });
  });

  it('caps a DCF value far above what earnings support', () => {
    const fv = estimateFairValue({ overview: industrial, financials: { roe: 12, beta: 1, eps: 10 }, history: null, dcf: dcf(600, 'earnings'), benchmarks });
    expect(fv.value).toBe(150 * sanityCap);
    expect(fv.adjustment).toBe('capped');
    expect(fv.method).toBe('dcf-earnings');
  });

  // EPS can be inflated by one-off gains; raising would invent bargains
  it('keeps a DCF value below what earnings suggest', () => {
    const fv = estimateFairValue({ overview: industrial, financials: { roe: 12, beta: 1, eps: 10 }, history: null, dcf: dcf(20), benchmarks });
    expect(fv.value).toBe(20);
    expect(fv.adjustment).toBeNull();
  });

  it('leaves the value unbounded when EPS is not positive', () => {
    const fv = estimateFairValue({ overview: industrial, financials: { roe: -5, beta: 1, eps: -3 }, history: null, dcf: dcf(600), benchmarks });
    expect(fv.value).toBe(600);
    expect(fv.multiplesValue).toBeNull();
  });

  it('gives no value when the DCF has none', () => {
    const fv = estimateFairValue({ overview: industrial, financials: { roe: 12, beta: 1, eps: 10 }, history: null, dcf: dcf(null, null), benchmarks });
    expect(fv.value).toBeNull();
    expect(fv.multiplesValue).toBe(150);
  });

  it('gives no value for ADRs with financials in another currency', () => {
    const fv = estimateFairValue({
      overview: industrial,
      financials: { roe: 12, beta: 1, eps: 10 },
      history: null,
      dcf: { ...dcf(200), currencyMismatch: { price: 'USD', financial: 'TWD' } },
      benchmarks,
    });
    expect(fv.value).toBeNull();
  });

  it('values banks from book value and ROE, ignoring the DCF', () => {
    const history = { incomeAnnual: [], balanceAnnual: [{ period: '2026', endDate: '', shareholderEquity: 20_000 }] };
    const fv = estimateFairValue({
      overview: { sector: 'Financial Services', sharesOutstanding: 100 },
      financials: { roe: 10, beta: 0.35, eps: 20 },
      history,
      dcf: dcf(9_999),
      benchmarks,
    });
    expect(fv.method).toBe('pb-roe');
    // BVPS 200; cost of equity 3% + 0.8 × 5.5% = 7.4%; P/B = (10% − 3%) ÷ (7.4% − 3%)
    const coe = 0.03 + betaFloor * equityRiskPremium;
    expect(fv.modelValue).toBeCloseTo(200 * (0.10 - 0.03) / (coe - 0.03), 6);
  });
});

describe('pbRoeFairValue', () => {
  const balanceAnnual = [
    { period: '2025', endDate: '', shareholderEquity: 1_000 },
    { period: '2026', endDate: '', shareholderEquity: 1_000 },
  ];

  it('derives ROE from recent years when the latest ROE is missing', () => {
    const incomeAnnual = [
      { period: '2025', endDate: '', netIncome: 80 },
      { period: '2026', endDate: '', netIncome: 120 },
    ];
    const withHistoryRoe = pbRoeFairValue({ financials: { roe: null, beta: 1 }, history: { incomeAnnual, balanceAnnual }, sharesOutstanding: 10, riskFreeRate: 0.03 });
    const withGivenRoe = pbRoeFairValue({ financials: { roe: 10, beta: 1 }, history: { incomeAnnual, balanceAnnual }, sharesOutstanding: 10, riskFreeRate: 0.03 });
    expect(withHistoryRoe).toBeCloseTo(withGivenRoe!, 6); // both ROE 10%
  });

  it('returns null when ROE does not beat long-run growth', () => {
    expect(pbRoeFairValue({ financials: { roe: 2, beta: 1 }, history: { incomeAnnual: [], balanceAnnual }, sharesOutstanding: 10, riskFreeRate: 0.03 })).toBeNull();
  });

  it('returns null without book value', () => {
    expect(pbRoeFairValue({ financials: { roe: 10, beta: 1 }, history: null, sharesOutstanding: 10, riskFreeRate: 0.03 })).toBeNull();
  });
});

describe('isFinancialCompany', () => {
  it('matches the Financial Services sector only', () => {
    expect(isFinancialCompany({ sector: 'Financial Services' })).toBe(true);
    expect(isFinancialCompany({ sector: 'Industrials' })).toBe(false);
  });
});
