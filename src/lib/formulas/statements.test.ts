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
