import { describe, it, expect } from 'vitest';
import type { FinancialMetrics } from '@/types';
import { completeFinancials } from './statements';

const fin = { freeCashFlow: -34 } as FinancialMetrics;
const period = (endDate: string, freeCashFlow: number | null) => ({ period: endDate.slice(0, 4), endDate, freeCashFlow });

describe('completeFinancials', () => {
  it('uses the latest annual statement free cash flow', () => {
    const h = { cashFlowAnnual: [period('2025-03-31', 221), period('2026-03-31', 209)] };
    expect(completeFinancials(fin, h).freeCashFlow).toBe(209);
  });

  it('skips years without a value', () => {
    const h = { cashFlowAnnual: [period('2025-03-31', 221), period('2026-03-31', null)] };
    expect(completeFinancials(fin, h).freeCashFlow).toBe(221);
  });

  it('keeps the quote value without statements', () => {
    expect(completeFinancials(fin, null)).toBe(fin);
    expect(completeFinancials(fin, { cashFlowAnnual: [] })).toBe(fin);
  });
});

describe('completeFinancials: EPS against the statements', () => {
  const quote = { sharesOutstanding: 28_000, currentPrice: 577.5 };
  const income = (netIncome: number) => ({ cashFlowAnnual: [], incomeAnnual: [{ period: '2026', endDate: '2026-03-31', netIncome }] });

  it('replaces a Yahoo EPS that contradicts the statements (e.g. after a split)', () => {
    // Net income 531,000 ÷ 28,000 shares = 18.96; Yahoo says −4.29
    const f = completeFinancials({ ...fin, eps: -4.29, peRatio: null }, income(531_000), quote);
    expect(f.eps).toBeCloseTo(18.96, 2);
    expect(f.peRatio).toBeCloseTo(577.5 / 18.96, 1);
  });

  it('keeps a Yahoo EPS that roughly agrees (trailing vs annual may differ a little)', () => {
    const f = completeFinancials({ ...fin, eps: 24, peRatio: 24 }, income(531_000), quote);
    expect(f.eps).toBe(24);
  });

  it('fills a missing EPS from the statements', () => {
    expect(completeFinancials({ ...fin, eps: null, peRatio: null }, income(531_000), quote).eps).toBeCloseTo(18.96, 2);
  });
});
