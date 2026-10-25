import { describe, it, expect } from 'vitest';
import { estimateFairValue, pbRoeFairValue, isFinancialCompany, hasNonOperatingEarnings } from './fairValue';
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
    const fv = estimateFairValue({ overview: industrial, financials: { operatingMargin: 10, netProfitMargin: 8, roe: 12, beta: 1, eps: 10 }, history: null, dcf: dcf(200), benchmarks });
    expect(fv).toEqual({ value: 200, method: 'dcf-fcf', modelValue: 200, multiplesValue: 150, adjustment: null, unavailableReason: null });
  });

  it('caps a DCF value far above what earnings support', () => {
    const fv = estimateFairValue({ overview: industrial, financials: { operatingMargin: 10, netProfitMargin: 8, roe: 12, beta: 1, eps: 10 }, history: null, dcf: dcf(600, 'earnings'), benchmarks });
    expect(fv.value).toBe(150 * sanityCap);
    expect(fv.adjustment).toBe('capped');
    expect(fv.method).toBe('dcf-earnings');
  });

  // EPS can be inflated by one-off gains; raising would invent bargains
  it('keeps a DCF value below what earnings suggest', () => {
    const fv = estimateFairValue({ overview: industrial, financials: { operatingMargin: 10, netProfitMargin: 8, roe: 12, beta: 1, eps: 10 }, history: null, dcf: dcf(20), benchmarks });
    expect(fv.value).toBe(20);
    expect(fv.adjustment).toBeNull();
  });

  it('leaves the value unbounded when EPS is not positive', () => {
    const fv = estimateFairValue({ overview: industrial, financials: { operatingMargin: 10, netProfitMargin: 8, roe: -5, beta: 1, eps: -3 }, history: null, dcf: dcf(600), benchmarks });
    expect(fv.value).toBe(600);
    expect(fv.multiplesValue).toBeNull();
  });

  it('gives no value when the DCF has none', () => {
    const fv = estimateFairValue({ overview: industrial, financials: { operatingMargin: 10, netProfitMargin: 8, roe: 12, beta: 1, eps: 10 }, history: null, dcf: dcf(null, null), benchmarks });
    expect(fv.value).toBeNull();
    expect(fv.multiplesValue).toBe(150);
  });

  it('gives no value for ADRs with financials in another currency', () => {
    const fv = estimateFairValue({
      overview: industrial,
      financials: { operatingMargin: 10, netProfitMargin: 8, roe: 12, beta: 1, eps: 10 },
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
      financials: { operatingMargin: 10, netProfitMargin: 8, roe: 10, beta: 0.35, eps: 20 },
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

describe('profit that does not come from operations (P15)', () => {
  // SoftBank Group, Oct 2026: operating margin −11.5%, net margin +62%, EPS ¥859 from investment gains
  const holding = { operatingMargin: -11.5, netProfitMargin: 61.6, roe: 32, beta: 0.93, eps: 859, forwardEps: 132, forwardEpsAnalysts: 8 };

  it('is detected when operations lose money but the company reports a profit', () => {
    expect(hasNonOperatingEarnings(holding)).toBe(true);
    expect(hasNonOperatingEarnings({ operatingMargin: 12, netProfitMargin: 8, eps: 10 })).toBe(false);
    expect(hasNonOperatingEarnings({ operatingMargin: -5, netProfitMargin: -9, eps: -2 })).toBe(false); // plain loss-maker
    expect(hasNonOperatingEarnings({ operatingMargin: null, netProfitMargin: 8, eps: 10 })).toBe(false); // unknown → no claim
  });

  it('gives no fair value, with the reason', () => {
    const fv = estimateFairValue({ overview: industrial, financials: holding, history: null, dcf: dcf(6835, 'earnings'), benchmarks });
    expect(fv.value).toBeNull();
    expect(fv.unavailableReason).toBe('non-operating-earnings');
  });

  it('does not apply to banks, which are valued on book value', () => {
    const history = { incomeAnnual: [], balanceAnnual: [{ period: '2026', endDate: '', shareholderEquity: 20_000 }] };
    const fv = estimateFairValue({
      overview: { sector: 'Financial Services', sharesOutstanding: 100 },
      financials: { ...holding, roe: 10 },
      history,
      dcf: dcf(null, null),
      benchmarks,
    });
    expect(fv.method).toBe('pb-roe');
    expect(fv.unavailableReason).toBeNull();
  });
});
