import { describe, it, expect } from 'vitest';
import { altmanZScore, piotroskiFScore, calculateRiskScore } from './health';

describe('altmanZScore', () => {
  it('returns safe zone for financially healthy company', () => {
    // Classic "safe" Altman Z example: large profitable company with low debt
    const result = altmanZScore({
      workingCapital: 500_000,
      retainedEarnings: 400_000,
      ebit: 150_000,
      marketCap: 2_000_000,
      totalLiabilities: 300_000,
      revenue: 1_200_000,
      totalAssets: 1_000_000,
    });
    expect(result.zone).toBe('safe');
    expect(result.score).toBeGreaterThan(3.0);
  });

  it('returns distress zone for financially troubled company', () => {
    // Heavily indebted company losing money
    const result = altmanZScore({
      workingCapital: -100_000,
      retainedEarnings: -200_000,
      ebit: -50_000,
      marketCap: 50_000,
      totalLiabilities: 900_000,
      revenue: 200_000,
      totalAssets: 1_000_000,
    });
    expect(result.zone).toBe('distress');
    expect(result.score).toBeLessThan(1.8);
  });

  it('returns grey zone for borderline company', () => {
    // Moderate financials producing Z ≈ 2.19 (grey zone: 1.8–3.0)
    const result = altmanZScore({
      workingCapital: 150_000,
      retainedEarnings: 180_000,
      ebit: 60_000,
      marketCap: 800_000,
      totalLiabilities: 500_000,
      revenue: 600_000,
      totalAssets: 1_000_000,
    });
    expect(result.zone).toBe('grey');
    expect(result.score).toBeGreaterThanOrEqual(1.8);
    expect(result.score).toBeLessThanOrEqual(3.0);
  });

  it('handles zero totalAssets gracefully', () => {
    const result = altmanZScore({
      workingCapital: 100,
      retainedEarnings: 100,
      ebit: 100,
      marketCap: 100,
      totalLiabilities: 100,
      revenue: 100,
      totalAssets: 0,
    });
    expect(result.zone).toBe('distress');
    expect(result.score).toBe(0);
  });

  it('handles zero totalLiabilities (no debt) without divide by zero', () => {
    const result = altmanZScore({
      workingCapital: 500_000,
      retainedEarnings: 400_000,
      ebit: 150_000,
      marketCap: 2_000_000,
      totalLiabilities: 0,
      revenue: 1_200_000,
      totalAssets: 1_000_000,
    });
    // D term is set to 0 when no liabilities; score still above distress threshold
    expect(['safe', 'grey']).toContain(result.zone);
    expect(result.score).toBeGreaterThan(0);
  });
});

describe('piotroskiFScore', () => {
  const perfectParams = {
    netIncome: 1000,
    operatingCashFlow: 1500,
    returnOnAssets: 0.12,
    prevReturnOnAssets: 0.10,
    accruals: 0.02,
    longTermDebtRatioCurrent: 0.20,
    longTermDebtRatioPrev: 0.25,
    currentRatioCurrent: 2.5,
    currentRatioPrev: 2.0,
    sharesOutstandingCurrent: 1_000_000,
    sharesOutstandingPrev: 1_000_000,
    grossMarginCurrent: 0.40,
    grossMarginPrev: 0.35,
    assetTurnoverCurrent: 1.2,
    assetTurnoverPrev: 1.0,
  };

  it('returns perfect score (9) for ideal company', () => {
    const result = piotroskiFScore(perfectParams);
    expect(result.score).toBe(9);
    expect(result.checks).toHaveLength(9);
    result.checks.forEach((check) => expect(check.passed).toBe(true));
  });

  it('returns zero score for worst-case company', () => {
    const worstParams = {
      netIncome: -1000,
      operatingCashFlow: -1500,  // more negative than netIncome so check 4 also fails
      returnOnAssets: -0.05,
      prevReturnOnAssets: 0.10,
      accruals: 0,
      longTermDebtRatioCurrent: 0.50,
      longTermDebtRatioPrev: 0.20,
      currentRatioCurrent: 0.8,
      currentRatioPrev: 1.5,
      sharesOutstandingCurrent: 1_100_000,
      sharesOutstandingPrev: 1_000_000,
      grossMarginCurrent: 0.20,
      grossMarginPrev: 0.35,
      assetTurnoverCurrent: 0.8,
      assetTurnoverPrev: 1.0,
    };
    const result = piotroskiFScore(worstParams);
    expect(result.score).toBe(0);
    result.checks.forEach((check) => expect(check.passed).toBe(false));
  });

  it('returns 9 checks regardless of values', () => {
    const result = piotroskiFScore(perfectParams);
    expect(result.checks).toHaveLength(9);
  });

  it('counts passing checks correctly for partial score', () => {
    const mixedParams = {
      ...perfectParams,
      netIncome: -100,   // fails check 1 (positive net income)
      operatingCashFlow: -200, // fails check 2 (positive CF) and check 4 (CF > net income: -200 > -100 = false)
    };
    const result = piotroskiFScore(mixedParams);
    expect(result.score).toBe(6); // 3 checks fail
  });
});

describe('calculateRiskScore', () => {
  it('returns low risk score for defensive stock', () => {
    const score = calculateRiskScore({
      beta: 0.3,
      maxDrawdown: 5,
      zScore: 4.0,
      debtToEquity: 0.1,
      revenueVolatility: 5,
    });
    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(4);
  });

  it('returns high risk score for volatile, indebted stock', () => {
    const score = calculateRiskScore({
      beta: 2.5,
      maxDrawdown: 60,
      zScore: 1.0,
      debtToEquity: 3.0,
      revenueVolatility: 60,
    });
    expect(score).toBeGreaterThanOrEqual(7);
    expect(score).toBeLessThanOrEqual(10);
  });

  it('returns score within 1-10 range', () => {
    const score = calculateRiskScore({
      beta: 1.0,
      maxDrawdown: 25,
      zScore: 2.5,
      debtToEquity: 1.0,
      revenueVolatility: 20,
    });
    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(10);
  });
});
