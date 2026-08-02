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

  // --- DCF margin of safety branches (lines 94–99, 205–210) ---

  it('boosts valuation score and adds bullish reason when price is >40% below DCF fair value', () => {
    const result = generateVerdict({
      financials: strongMetrics,
      balanceSheet,
      price: 50,
      industryBenchmarks: DEFAULT_BENCHMARKS,
      dcfFairValuePerShare: 100, // price is 50% below → mosPercent = 0.50
    });
    expect(result.scores.valuation).toBeGreaterThan(7);
    expect(result.reasons.bullish.some((r) => r.includes('below DCF fair value'))).toBe(true);
  });

  it('adds moderate bullish reason when price is 20–40% below DCF fair value', () => {
    const result = generateVerdict({
      financials: strongMetrics,
      balanceSheet,
      price: 75,
      industryBenchmarks: DEFAULT_BENCHMARKS,
      dcfFairValuePerShare: 100, // price is 25% below → mosPercent = 0.25
    });
    expect(result.reasons.bullish.some((r) => r.includes('below DCF fair value'))).toBe(true);
  });

  it('adds bearish reason when price is >20% above DCF fair value', () => {
    const result = generateVerdict({
      financials: weakMetrics,
      balanceSheet,
      price: 130,
      industryBenchmarks: DEFAULT_BENCHMARKS,
      dcfFairValuePerShare: 100, // price is 30% above → mosPercent = -0.30
    });
    expect(result.reasons.bearish.some((r) => r.includes('above DCF fair value'))).toBe(true);
  });

  it('penalises valuation score when price is >30% above DCF fair value', () => {
    const baseResult = generateVerdict({
      financials: weakMetrics,
      balanceSheet,
      price: 50,
      industryBenchmarks: DEFAULT_BENCHMARKS,
    });
    const overvaluedResult = generateVerdict({
      financials: weakMetrics,
      balanceSheet,
      price: 50,
      industryBenchmarks: DEFAULT_BENCHMARKS,
      dcfFairValuePerShare: 30, // price is ~67% above → mosPercent = -0.67
    });
    expect(overvaluedResult.scores.valuation).toBeLessThan(baseResult.scores.valuation);
  });

  it('skips DCF margin of safety when dcfFairValuePerShare is null', () => {
    const withNull = generateVerdict({
      financials: strongMetrics,
      balanceSheet,
      price: 150,
      industryBenchmarks: DEFAULT_BENCHMARKS,
      dcfFairValuePerShare: null,
    });
    const withUndefined = generateVerdict({
      financials: strongMetrics,
      balanceSheet,
      price: 150,
      industryBenchmarks: DEFAULT_BENCHMARKS,
    });
    expect(withNull.scores.valuation).toBe(withUndefined.scores.valuation);
  });

  it('uses dcfFairValuePerShare as the displayed fair value when provided', () => {
    const result = generateVerdict({
      financials: strongMetrics,
      balanceSheet,
      price: 150,
      industryBenchmarks: DEFAULT_BENCHMARKS,
      dcfFairValuePerShare: 200,
    });
    expect(result.fairValue).toBe(200);
    expect(result.suggestedBuyPrice).toBeCloseTo(200 * 0.75, 1);
  });

  it('uses macroScore and newsScore when provided', () => {
    const bullishMacro = generateVerdict({
      financials: strongMetrics,
      balanceSheet,
      price: 150,
      industryBenchmarks: DEFAULT_BENCHMARKS,
      macroScore: 9,
      newsScore: 9,
    });
    const bearishMacro = generateVerdict({
      financials: strongMetrics,
      balanceSheet,
      price: 150,
      industryBenchmarks: DEFAULT_BENCHMARKS,
      macroScore: 1,
      newsScore: 1,
    });
    expect(bullishMacro.scores.overall).toBeGreaterThan(bearishMacro.scores.overall);
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
