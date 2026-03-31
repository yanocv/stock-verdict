import { describe, it, expect } from 'vitest';
import { evaluateBuffett } from './buffettScore';
import type { FinancialMetrics, BalanceSheet } from '@/types';

const strongMetrics: FinancialMetrics = {
  eps: 10,
  roe: 22,
  netProfitMargin: 18,
  peRatio: 15,
  psRatio: 2,
  pegRatio: 1.5,
  pbRatio: 2,
  debtToEquity: 0.3,
  currentRatio: 2.5,
  freeCashFlow: 500_000,
  operatingMargin: 20,
  revenueGrowth: 12,
  epsGrowth: 15,
  dividendYield: 2.5,
  payoutRatio: 30,
  beta: 0.8,
};

const weakMetrics: FinancialMetrics = {
  eps: -2,
  roe: 5,
  netProfitMargin: -3,
  peRatio: 50,
  psRatio: 8,
  pegRatio: 5,
  pbRatio: 6,
  debtToEquity: 2.5,
  currentRatio: 0.7,
  freeCashFlow: -100_000,
  operatingMargin: 3,
  revenueGrowth: -5,
  epsGrowth: -10,
  dividendYield: 0,
  payoutRatio: null,
  beta: 2.2,
};

const balanceSheet: BalanceSheet = {
  totalCurrentAssets: 2_000_000,
  totalCurrentLiabilities: 800_000,
  totalAssets: 5_000_000,
  totalLiabilities: 2_000_000,
  shareholderEquity: 3_000_000,
  longTermDebt: 500_000,
  totalDebt: 900_000,
  cash: 500_000,
  retainedEarnings: 2_000_000,
};

describe('evaluateBuffett', () => {
  it('returns BUY for a company passing all Buffett checks', () => {
    const result = evaluateBuffett(strongMetrics, balanceSheet);
    expect(result.lens).toBe('buffett');
    expect(result.recommendation).toBe('BUY');
    expect(result.checks).toHaveLength(6);
  });

  it('returns AVOID for a company failing most Buffett checks', () => {
    const result = evaluateBuffett(weakMetrics, balanceSheet);
    expect(result.recommendation).toBe('AVOID');
  });

  it('includes all 6 checks', () => {
    const result = evaluateBuffett(strongMetrics, balanceSheet);
    expect(result.checks).toHaveLength(6);
  });

  it('provides a non-empty summary', () => {
    const result = evaluateBuffett(strongMetrics, balanceSheet);
    expect(result.summary).toBeTruthy();
  });

  it('provides a buy-below price with margin of safety applied', () => {
    const result = evaluateBuffett(strongMetrics, balanceSheet);
    if (result.fairValue !== null) {
      expect(result.buyBelow).toBeCloseTo(result.fairValue * 0.75, 0);
    }
  });
});
