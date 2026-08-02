import { describe, it, expect } from 'vitest';
import { evaluateGraham } from './grahamScore';
import type { FinancialMetrics, BalanceSheet } from '@/types';

const grahamFriendlyMetrics: FinancialMetrics = {
  eps: 5,
  roe: 15,
  netProfitMargin: 12,
  peRatio: 12,
  psRatio: 0.8,
  pegRatio: 1.0,
  pbRatio: 1.2,
  debtToEquity: 0.4,
  currentRatio: 2.5,
  freeCashFlow: 200_000,
  operatingMargin: 14,
  revenueGrowth: 5,
  epsGrowth: 5,
  dividendYield: 3,
  payoutRatio: 40,
  beta: 0.7,
};

const overvaluedMetrics: FinancialMetrics = {
  eps: 2,
  roe: 8,
  netProfitMargin: 5,
  peRatio: 40,
  psRatio: 6,
  pegRatio: 4,
  pbRatio: 5,
  debtToEquity: 1.8,
  currentRatio: 0.9,
  freeCashFlow: -50_000,
  operatingMargin: 6,
  revenueGrowth: 2,
  epsGrowth: 2,
  dividendYield: 0,
  payoutRatio: null,
  beta: 1.5,
};

const balanceSheet: BalanceSheet = {
  totalCurrentAssets: 2_500_000,
  totalCurrentLiabilities: 1_000_000,
  totalAssets: 5_000_000,
  totalLiabilities: 2_000_000,
  shareholderEquity: 3_000_000,
  longTermDebt: 500_000,
  totalDebt: 1_200_000,
  cash: 800_000,
  retainedEarnings: 1_500_000,
};

describe('evaluateGraham', () => {
  it('returns BUY for a Graham-friendly stock', () => {
    const result = evaluateGraham(grahamFriendlyMetrics, balanceSheet, { currentPrice: 60 });
    expect(result.lens).toBe('graham');
    expect(result.recommendation).toBe('BUY');
  });

  it('returns AVOID for an overvalued stock', () => {
    const result = evaluateGraham(overvaluedMetrics, balanceSheet, { currentPrice: 80 });
    expect(result.recommendation).toBe('AVOID');
  });

  it('returns 6 checks', () => {
    const result = evaluateGraham(grahamFriendlyMetrics, balanceSheet, { currentPrice: 60 });
    expect(result.checks).toHaveLength(6);
  });

  it('calculates fair value using Graham Number', () => {
    const result = evaluateGraham(grahamFriendlyMetrics, balanceSheet, { currentPrice: 60 });
    // EPS=5, BVPS=3,000,000 → result should be non-null
    expect(result.fairValue).not.toBeNull();
    expect(result.fairValue).toBeGreaterThan(0);
  });

  it('provides a non-empty summary', () => {
    const result = evaluateGraham(grahamFriendlyMetrics, balanceSheet, { currentPrice: 60 });
    expect(result.summary).toBeTruthy();
  });

  it('returns WAIT when 3–4 checks pass', () => {
    // Fail exactly 2 checks: P/E (18 > 15) and dividends (0) → 4 pass → WAIT
    const midMetrics: FinancialMetrics = {
      ...grahamFriendlyMetrics,
      peRatio: 18,      // fails P/E < 15
      dividendYield: 0, // fails pays-dividends
    };
    const result = evaluateGraham(midMetrics, balanceSheet, { currentPrice: 60 });
    expect(result.recommendation).toBe('WAIT');
  });

  it('shows N/A for value when peRatio and pbRatio are null', () => {
    const nullMetrics: FinancialMetrics = {
      ...grahamFriendlyMetrics,
      peRatio: null,
      pbRatio: null,
    };
    const result = evaluateGraham(nullMetrics, balanceSheet, { currentPrice: 60 });
    const peCheck = result.checks.find((c) => c.label === 'P/E Ratio < 15');
    const pbCheck = result.checks.find((c) => c.label === 'P/B Ratio < 1.5');
    expect(peCheck?.value).toBe('N/A');
    expect(pbCheck?.value).toBe('N/A');
  });

  it('returns null fairValue when shareholderEquity is zero', () => {
    const zeroEquitySheet: BalanceSheet = { ...balanceSheet, shareholderEquity: 0 };
    const result = evaluateGraham(grahamFriendlyMetrics, zeroEquitySheet, { currentPrice: 60 });
    expect(result.fairValue).toBeNull();
    expect(result.buyBelow).toBeNull();
  });

  it('returns null fairValue when eps is zero or negative', () => {
    const noEpsMetrics: FinancialMetrics = { ...grahamFriendlyMetrics, eps: 0 };
    const result = evaluateGraham(noEpsMetrics, balanceSheet, { currentPrice: 60 });
    expect(result.fairValue).toBeNull();
  });

  it('P/E × P/B check shows N/A when either is Infinity', () => {
    const nullBoth: FinancialMetrics = { ...grahamFriendlyMetrics, peRatio: null, pbRatio: null };
    const result = evaluateGraham(nullBoth, balanceSheet, { currentPrice: 60 });
    const combinedCheck = result.checks.find((c) => c.label === 'P/E × P/B < 22.5');
    expect(combinedCheck?.value).toBe('N/A');
  });
});
