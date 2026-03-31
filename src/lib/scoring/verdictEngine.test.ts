import { describe, it, expect } from 'vitest';
import { generateVerdict } from './verdictEngine';
import { DEFAULT_BENCHMARKS } from '@/lib/benchmarks/industries';
import type { FinancialMetrics, BalanceSheet } from '@/types';

const strongMetrics: FinancialMetrics = {
  eps: 10,
  roe: 25,
  netProfitMargin: 20,
  peRatio: 14,
  psRatio: 1.5,
  pegRatio: 0.8,
  pbRatio: 2,
  debtToEquity: 0.2,
  currentRatio: 3.0,
  freeCashFlow: 1_000_000,
  operatingMargin: 22,
  revenueGrowth: 15,
  epsGrowth: 18,
  dividendYield: 2,
  payoutRatio: 25,
  beta: 0.8,
};

const weakMetrics: FinancialMetrics = {
  eps: -5,
  roe: 3,
  netProfitMargin: -8,
  peRatio: 60,
  psRatio: 10,
  pegRatio: null,
  pbRatio: 8,
  debtToEquity: 3.5,
  currentRatio: 0.6,
  freeCashFlow: -500_000,
  operatingMargin: -5,
  revenueGrowth: -10,
  epsGrowth: -20,
  dividendYield: 0,
  payoutRatio: null,
  beta: 2.5,
};

const balanceSheet: BalanceSheet = {
  totalCurrentAssets: 3_000_000,
  totalCurrentLiabilities: 1_000_000,
  totalAssets: 8_000_000,
  totalLiabilities: 3_000_000,
  shareholderEquity: 5_000_000,
  longTermDebt: 1_000_000,
  totalDebt: 1_000_000,
  cash: 1_000_000,
  retainedEarnings: 2_000_000,
};

describe('generateVerdict', () => {
  it('returns BUY for a financially strong company', () => {
    const result = generateVerdict({
      financials: strongMetrics,
      balanceSheet,
      price: 150,
      industryBenchmarks: DEFAULT_BENCHMARKS,
    });
    expect(result.recommendation).toBe('BUY');
  });

  it('returns AVOID for a financially weak company', () => {
    const result = generateVerdict({
      financials: weakMetrics,
      balanceSheet,
      price: 50,
      industryBenchmarks: DEFAULT_BENCHMARKS,
    });
    expect(result.recommendation).toBe('AVOID');
  });

  it('returns scores with all required fields', () => {
    const result = generateVerdict({
      financials: strongMetrics,
      balanceSheet,
      price: 150,
      industryBenchmarks: DEFAULT_BENCHMARKS,
    });
    expect(result.scores).toHaveProperty('overall');
    expect(result.scores).toHaveProperty('financials');
    expect(result.scores).toHaveProperty('valuation');
    expect(result.scores).toHaveProperty('health');
    expect(result.scores).toHaveProperty('technical');
    expect(result.scores).toHaveProperty('macro');
    expect(result.scores).toHaveProperty('news');
  });

  it('returns overall score between 0 and 10', () => {
    const result = generateVerdict({
      financials: strongMetrics,
      balanceSheet,
      price: 150,
      industryBenchmarks: DEFAULT_BENCHMARKS,
    });
    expect(result.scores.overall).toBeGreaterThanOrEqual(0);
    expect(result.scores.overall).toBeLessThanOrEqual(10);
  });

  it('returns confidence between 50 and 95', () => {
    const result = generateVerdict({
      financials: strongMetrics,
      balanceSheet,
      price: 150,
      industryBenchmarks: DEFAULT_BENCHMARKS,
    });
    expect(result.confidence).toBeGreaterThanOrEqual(50);
    expect(result.confidence).toBeLessThanOrEqual(95);
  });

  it('returns bullish and bearish reasons', () => {
    const result = generateVerdict({
      financials: strongMetrics,
      balanceSheet,
      price: 150,
      industryBenchmarks: DEFAULT_BENCHMARKS,
    });
    expect(Array.isArray(result.reasons.bullish)).toBe(true);
    expect(Array.isArray(result.reasons.bearish)).toBe(true);
  });

  it('provides a suggestedBuyPrice', () => {
    const result = generateVerdict({
      financials: strongMetrics,
      balanceSheet,
      price: 150,
      industryBenchmarks: DEFAULT_BENCHMARKS,
    });
    expect(result.suggestedBuyPrice).not.toBeNull();
    expect(result.suggestedBuyPrice).toBeGreaterThan(0);
  });
});
