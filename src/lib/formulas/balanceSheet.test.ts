import { describe, it, expect } from 'vitest';
import type { BalanceSheet } from '@/types';
import { completeBalanceSheet } from './balanceSheet';

// What Yahoo's snapshot returns today: only debt and cash are filled
const snapshot: BalanceSheet = {
  totalCurrentAssets: 0,
  totalCurrentLiabilities: 0,
  totalAssets: 0,
  totalLiabilities: 0,
  shareholderEquity: 0,
  longTermDebt: 0,
  totalDebt: 900,
  cash: 300,
  retainedEarnings: 0,
};

const period = (endDate: string, fields: Record<string, number | null>) => ({ period: endDate.slice(0, 4), endDate, ...fields });

describe('completeBalanceSheet', () => {
  it('fills missing fields from the newest statement period', () => {
    const history = {
      balanceAnnual: [
        period('2025-03-31', { shareholderEquity: 2_000, totalAssets: 9_000 }),
        period('2026-03-31', { shareholderEquity: 3_000, totalAssets: 10_000 }),
      ],
      balanceQuarterly: [period('2026-06-30', { shareholderEquity: 3_100, totalAssets: null })],
    };
    const bs = completeBalanceSheet(snapshot, history);
    expect(bs.shareholderEquity).toBe(3_100); // newest quarter
    expect(bs.totalAssets).toBe(10_000); // quarter has none → latest annual
  });

  it('keeps snapshot values that are present (debt and cash are more current)', () => {
    const history = {
      balanceAnnual: [period('2026-03-31', { totalDebt: 1, cash: 1, shareholderEquity: 5 })],
      balanceQuarterly: [],
    };
    const bs = completeBalanceSheet(snapshot, history);
    expect(bs.totalDebt).toBe(900);
    expect(bs.cash).toBe(300);
  });

  it('leaves the snapshot alone without history or values', () => {
    expect(completeBalanceSheet(snapshot, null)).toBe(snapshot);
    expect(completeBalanceSheet(snapshot, { balanceAnnual: [], balanceQuarterly: [] })).toEqual(snapshot);
  });
});
