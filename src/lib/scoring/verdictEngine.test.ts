import { describe, it, expect } from 'vitest';
import { generateVerdict } from './verdictEngine';
import { DEFAULT_BENCHMARKS } from '@/lib/benchmarks/industries';
import type { FinancialMetrics, BalanceSheet } from '@/types';
import type { TechnicalIndicators } from '@/types/technicals';

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

  it('divides the fallback DCF fair value by sharesOutstanding', () => {
    const whole = generateVerdict({
      financials: strongMetrics,
      balanceSheet,
      price: 150,
      industryBenchmarks: DEFAULT_BENCHMARKS,
    });
    const perShare = generateVerdict({
      financials: strongMetrics,
      balanceSheet,
      price: 150,
      industryBenchmarks: DEFAULT_BENCHMARKS,
      sharesOutstanding: 1_000,
    });
    expect(whole.fairValue).not.toBeNull();
    expect(perShare.fairValue).toBeCloseTo(whole.fairValue! / 1_000, 2);
    expect(perShare.suggestedBuyPrice).toBeCloseTo(perShare.fairValue! * 0.75, 2);
  });

  it('ignores sharesOutstanding when dcfFairValuePerShare is provided', () => {
    const result = generateVerdict({
      financials: strongMetrics,
      balanceSheet,
      price: 50,
      industryBenchmarks: DEFAULT_BENCHMARKS,
      dcfFairValuePerShare: 100,
      sharesOutstanding: 1_000,
    });
    expect(result.fairValue).toBe(100);
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

// ── Group A: Arithmetic integrity ─────────────────────────────────────────
describe('arithmetic integrity', () => {
  it('scores.overall equals the weighted sum of component scores', () => {
    const r = generateVerdict({ financials: strongMetrics, balanceSheet, price: 150, industryBenchmarks: DEFAULT_BENCHMARKS });
    const expected =
      r.scores.financials * 0.20 +
      r.scores.valuation  * 0.35 +
      r.scores.health     * 0.20 +
      r.scores.technical  * 0.12 +
      r.scores.macro      * 0.07 +
      r.scores.news       * 0.06;
    expect(r.scores.overall).toBeCloseTo(expected, 1);
  });

  it('all component scores are within 0–10', () => {
    const r = generateVerdict({ financials: weakMetrics, balanceSheet, price: 50, industryBenchmarks: DEFAULT_BENCHMARKS });
    for (const [key, val] of Object.entries(r.scores)) {
      expect(val, `${key} out of range`).toBeGreaterThanOrEqual(0);
      expect(val, `${key} out of range`).toBeLessThanOrEqual(10);
    }
  });
});

// ── Group B: Verdict boundary exactness ───────────────────────────────────
describe('verdict boundaries', () => {
  it('score > 7.0 is BUY', () => {
    const r = generateVerdict({
      financials: strongMetrics, balanceSheet, price: 50,
      industryBenchmarks: DEFAULT_BENCHMARKS,
      dcfFairValuePerShare: 200, macroScore: 9, newsScore: 9,
    });
    expect(r.recommendation).toBe('BUY');
    expect(r.scores.overall).toBeGreaterThan(7);
  });

  it('score < 4.0 is AVOID', () => {
    const r = generateVerdict({
      financials: weakMetrics, balanceSheet, price: 500,
      industryBenchmarks: DEFAULT_BENCHMARKS,
      macroScore: 1, newsScore: 1, dcfFairValuePerShare: 10,
    });
    expect(r.recommendation).toBe('AVOID');
    expect(r.scores.overall).toBeLessThan(4);
  });
});

// ── Group C: Monotonicity ─────────────────────────────────────────────────
describe('monotonicity — improving a single metric must not lower the score', () => {
  it('lower PE improves or maintains the overall score', () => {
    const base   = generateVerdict({ financials: { ...strongMetrics, peRatio: 30 }, balanceSheet, price: 150, industryBenchmarks: DEFAULT_BENCHMARKS });
    const better = generateVerdict({ financials: { ...strongMetrics, peRatio: 10 }, balanceSheet, price: 150, industryBenchmarks: DEFAULT_BENCHMARKS });
    expect(better.scores.overall).toBeGreaterThanOrEqual(base.scores.overall);
  });

  it('higher ROE improves or maintains the overall score', () => {
    const base   = generateVerdict({ financials: { ...strongMetrics, roe: 10 }, balanceSheet, price: 150, industryBenchmarks: DEFAULT_BENCHMARKS });
    const better = generateVerdict({ financials: { ...strongMetrics, roe: 30 }, balanceSheet, price: 150, industryBenchmarks: DEFAULT_BENCHMARKS });
    expect(better.scores.overall).toBeGreaterThanOrEqual(base.scores.overall);
  });

  it('positive FCF beats negative FCF', () => {
    const base   = generateVerdict({ financials: { ...strongMetrics, freeCashFlow: -1 }, balanceSheet, price: 150, industryBenchmarks: DEFAULT_BENCHMARKS });
    const better = generateVerdict({ financials: { ...strongMetrics, freeCashFlow: 1_000_000 }, balanceSheet, price: 150, industryBenchmarks: DEFAULT_BENCHMARKS });
    expect(better.scores.overall).toBeGreaterThan(base.scores.overall);
  });

  it('lower debt/equity improves or maintains the overall score', () => {
    const base   = generateVerdict({ financials: { ...strongMetrics, debtToEquity: 3 }, balanceSheet, price: 150, industryBenchmarks: DEFAULT_BENCHMARKS });
    const better = generateVerdict({ financials: { ...strongMetrics, debtToEquity: 0.1 }, balanceSheet, price: 150, industryBenchmarks: DEFAULT_BENCHMARKS });
    expect(better.scores.overall).toBeGreaterThanOrEqual(base.scores.overall);
  });

  it('higher current ratio improves or maintains the overall score', () => {
    const base   = generateVerdict({ financials: { ...strongMetrics, currentRatio: 0.8 }, balanceSheet, price: 150, industryBenchmarks: DEFAULT_BENCHMARKS });
    const better = generateVerdict({ financials: { ...strongMetrics, currentRatio: 2.5 }, balanceSheet, price: 150, industryBenchmarks: DEFAULT_BENCHMARKS });
    expect(better.scores.overall).toBeGreaterThanOrEqual(base.scores.overall);
  });
});

// ── Group D: newsScore actually affects the outcome ───────────────────────
describe('newsScore influence', () => {
  it('high news sentiment produces a higher score than low news sentiment', () => {
    const bullish = generateVerdict({ financials: strongMetrics, balanceSheet, price: 150, industryBenchmarks: DEFAULT_BENCHMARKS, newsScore: 9 });
    const bearish  = generateVerdict({ financials: strongMetrics, balanceSheet, price: 150, industryBenchmarks: DEFAULT_BENCHMARKS, newsScore: 1 });
    expect(bullish.scores.overall).toBeGreaterThan(bearish.scores.overall);
  });

  it('newsScore delta matches the 6% weight', () => {
    const high = generateVerdict({ financials: strongMetrics, balanceSheet, price: 150, industryBenchmarks: DEFAULT_BENCHMARKS, newsScore: 10 });
    const low  = generateVerdict({ financials: strongMetrics, balanceSheet, price: 150, industryBenchmarks: DEFAULT_BENCHMARKS, newsScore: 0 });
    // 10-point swing × 6% weight = 0.6 point overall difference
    expect(high.scores.overall - low.scores.overall).toBeCloseTo(0.6, 1);
  });
});

// ── Group E: Real technical signals ──────────────────────────────────────
describe('technical indicators wiring', () => {
  const oversoldUptrend: TechnicalIndicators = {
    rsi: 25, rsiSignal: 'oversold', fiftyTwoWeekPosition: 15,
    sma50: 140, sma200: 130, trendVsSma50: 'above', trendVsSma200: 'above',
  };
  const overboughtDowntrend: TechnicalIndicators = {
    rsi: 78, rsiSignal: 'overbought', fiftyTwoWeekPosition: 95,
    sma50: 160, sma200: 170, trendVsSma50: 'below', trendVsSma200: 'below',
  };

  it('oversold + uptrend gives a higher technical score than overbought + downtrend', () => {
    const bull = generateVerdict({ financials: strongMetrics, balanceSheet, price: 150, industryBenchmarks: DEFAULT_BENCHMARKS, technicalIndicators: oversoldUptrend });
    const bear = generateVerdict({ financials: strongMetrics, balanceSheet, price: 150, industryBenchmarks: DEFAULT_BENCHMARKS, technicalIndicators: overboughtDowntrend });
    expect(bull.scores.technical).toBeGreaterThan(bear.scores.technical);
  });

  it('real technical signals produce a valid score within 0–10', () => {
    const r = generateVerdict({ financials: strongMetrics, balanceSheet, price: 150, industryBenchmarks: DEFAULT_BENCHMARKS, technicalIndicators: oversoldUptrend });
    expect(r.scores.technical).toBeGreaterThanOrEqual(0);
    expect(r.scores.technical).toBeLessThanOrEqual(10);
  });

  it('null technicalIndicators falls back to proxy without crashing', () => {
    expect(() => generateVerdict({
      financials: strongMetrics, balanceSheet, price: 150,
      industryBenchmarks: DEFAULT_BENCHMARKS, technicalIndicators: null,
    })).not.toThrow();
  });
});

// ── Group F: Archetype scenarios ──────────────────────────────────────────
describe('archetype scenarios', () => {
  const nullMetrics: FinancialMetrics = {
    eps: null, roe: null, netProfitMargin: null, peRatio: null,
    psRatio: null, pegRatio: null, pbRatio: null, debtToEquity: null,
    currentRatio: null, freeCashFlow: null, operatingMargin: null,
    revenueGrowth: null, epsGrowth: null, dividendYield: null,
    payoutRatio: null, beta: null,
  };

  it('quality compounder (high ROE, FCF+, fair PE, 40%+ DCF MoS) is BUY', () => {
    const r = generateVerdict({
      financials: { ...strongMetrics, roe: 30, peRatio: 18, freeCashFlow: 2_000_000 },
      balanceSheet, price: 100,
      industryBenchmarks: DEFAULT_BENCHMARKS,
      dcfFairValuePerShare: 170,
      macroScore: 6, newsScore: 6,
    });
    expect(r.recommendation).toBe('BUY');
  });

  it('value trap (low PE but negative FCF, declining revenue) is WAIT or AVOID', () => {
    const r = generateVerdict({
      financials: { ...weakMetrics, peRatio: 8, freeCashFlow: -200_000, revenueGrowth: -15 },
      balanceSheet, price: 30,
      industryBenchmarks: DEFAULT_BENCHMARKS,
      macroScore: 5, newsScore: 5,
    });
    expect(['WAIT', 'AVOID']).toContain(r.recommendation);
  });

  it('overpriced growth stock (high PE/PS, price above DCF) is WAIT or AVOID', () => {
    const r = generateVerdict({
      financials: { ...strongMetrics, peRatio: 80, psRatio: 15, pegRatio: 3 },
      balanceSheet, price: 500,
      industryBenchmarks: DEFAULT_BENCHMARKS,
      dcfFairValuePerShare: 200,
      macroScore: 5, newsScore: 5,
    });
    expect(['WAIT', 'AVOID']).toContain(r.recommendation);
  });

  it('zombie company (negative FCF, high debt, low current ratio) is AVOID', () => {
    const r = generateVerdict({
      financials: { ...weakMetrics, freeCashFlow: -1_000_000, debtToEquity: 5, currentRatio: 0.4 },
      balanceSheet, price: 5,
      industryBenchmarks: DEFAULT_BENCHMARKS,
      macroScore: 3, newsScore: 2,
    });
    expect(r.recommendation).toBe('AVOID');
  });

  it('all-null metrics does not crash and returns a valid verdict', () => {
    expect(() => generateVerdict({
      financials: nullMetrics, balanceSheet, price: 50,
      industryBenchmarks: DEFAULT_BENCHMARKS,
    })).not.toThrow();
  });
});
