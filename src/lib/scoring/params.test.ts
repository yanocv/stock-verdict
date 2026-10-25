import { describe, it, expect } from 'vitest';
import { DEFAULT_ENGINE_PARAMS } from './params';
import { generateVerdict } from './verdictEngine';
import { DEFAULT_BENCHMARKS } from '@/lib/benchmarks/industries';
import type { FinancialMetrics, BalanceSheet } from '@/types';

describe('DEFAULT_ENGINE_PARAMS', () => {
  it('weights sum to 1', () => {
    const sum = Object.values(DEFAULT_ENGINE_PARAMS.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it('BUY threshold is above the AVOID threshold', () => {
    expect(DEFAULT_ENGINE_PARAMS.verdict.buyMin).toBeGreaterThan(DEFAULT_ENGINE_PARAMS.verdict.avoidMax);
  });

  // generateVerdict takes the first matching step, so order matters
  it('margin-of-safety steps are ordered from most extreme inward', () => {
    const above = DEFAULT_ENGINE_PARAMS.marginOfSafety.above.map((s) => s.mos);
    const below = DEFAULT_ENGINE_PARAMS.marginOfSafety.below.map((s) => s.mos);
    expect(above).toEqual([...above].sort((a, b) => b - a));
    expect(below).toEqual([...below].sort((a, b) => a - b));
  });
});

describe('generateVerdict with engineParams override', () => {
  const financials: FinancialMetrics = {
    eps: 5, roe: 12, netProfitMargin: 10, peRatio: 18, psRatio: 2, pegRatio: 1.5, pbRatio: 2,
    debtToEquity: 0.5, currentRatio: 1.5, freeCashFlow: 1_000_000, operatingMargin: 12,
    revenueGrowth: 5, epsGrowth: 5, dividendYield: 2, payoutRatio: 30, beta: 1,
  };
  const balanceSheet = {} as BalanceSheet;
  const base = { financials, balanceSheet, price: 100, industryBenchmarks: DEFAULT_BENCHMARKS };

  it('uses the given thresholds', () => {
    const normal = generateVerdict(base);
    expect(normal.recommendation).toBe('WAIT');
    const lowBar = generateVerdict({
      ...base,
      engineParams: {
        ...DEFAULT_ENGINE_PARAMS,
        verdict: { buyMin: normal.scores.overall - 0.5, avoidMax: 1 },
      },
    });
    expect(lowBar.recommendation).toBe('BUY');
  });

  it('defaults to DEFAULT_ENGINE_PARAMS', () => {
    expect(generateVerdict({ ...base, engineParams: DEFAULT_ENGINE_PARAMS })).toEqual(generateVerdict(base));
  });
});
