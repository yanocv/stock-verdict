import { describe, it, expect } from 'vitest';
import { evaluateLynch } from './lynchScore';
import type { FinancialMetrics, BalanceSheet } from '@/types';

const fastGrowerMetrics: FinancialMetrics = {
  eps: 3,
  roe: 20,
  netProfitMargin: 15,
  peRatio: 20,
  psRatio: 3,
  pegRatio: 0.7,
  pbRatio: 3,
  debtToEquity: 0.2,
  currentRatio: 2.0,
  freeCashFlow: 150_000,
  operatingMargin: 18,
  revenueGrowth: 25,
  epsGrowth: 28,
  dividendYield: 0.5,
  payoutRatio: 10,
  beta: 1.1,
};

const weakGrowerMetrics: FinancialMetrics = {
  eps: 1,
  roe: 6,
  netProfitMargin: 3,
  peRatio: 20,
  psRatio: 1.5,
  pegRatio: 10,
  pbRatio: 2,
  debtToEquity: 0.8,
  currentRatio: 1.2,
  freeCashFlow: -30_000,
  operatingMargin: 4,
  revenueGrowth: 2,
  epsGrowth: 2,
  dividendYield: 0,
  payoutRatio: null,
  beta: 0.9,
};

const balanceSheet: BalanceSheet = {
  totalCurrentAssets: 1_000_000,
  totalCurrentLiabilities: 500_000,
  totalAssets: 3_000_000,
  totalLiabilities: 600_000,
  shareholderEquity: 2_400_000,
  longTermDebt: 480_000,
  totalDebt: 480_000,
  cash: 200_000,
  retainedEarnings: 1_000_000,
};

describe('evaluateLynch', () => {
  it('returns BUY for a fast-grower with low PEG', () => {
    const result = evaluateLynch(fastGrowerMetrics, balanceSheet);
    expect(result.lens).toBe('lynch');
    expect(result.recommendation).toBe('BUY');
  });

  it('returns AVOID or WAIT for a slow grower with high PEG', () => {
    const result = evaluateLynch(weakGrowerMetrics, balanceSheet);
    expect(['AVOID', 'WAIT']).toContain(result.recommendation);
  });

  it('includes 5 checks', () => {
    const result = evaluateLynch(fastGrowerMetrics, balanceSheet);
    expect(result.checks).toHaveLength(5);
  });

  it('provides a non-empty summary mentioning the Lynch category', () => {
    const result = evaluateLynch(fastGrowerMetrics, balanceSheet);
    expect(result.summary).toBeTruthy();
    expect(result.summary.toLowerCase()).toContain('lynch');
  });

  it('calculates fair value via Lynch formula', () => {
    const result = evaluateLynch(fastGrowerMetrics, balanceSheet);
    // EPS=3, growth=28 → 3×28=84
    expect(result.fairValue).toBeCloseTo(84);
  });
});
