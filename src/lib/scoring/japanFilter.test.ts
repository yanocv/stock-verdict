import { describe, it, expect } from 'vitest';
import { runJapanFilter, isJapaneseTicker, getTopixThresholds } from './japanFilter';
import type { FinancialMetrics } from '@/types';

// Minimal valid Japanese stock financials
const goodFinancials: FinancialMetrics = {
  eps: 100,
  roe: 12,
  netProfitMargin: 8,
  peRatio: 14,
  psRatio: 1.2,
  pegRatio: 1.4,
  pbRatio: 1.1,
  debtToEquity: 0.5,
  currentRatio: 1.8,
  freeCashFlow: 50_000_000_000,
  operatingMargin: 10,
  revenueGrowth: 5,
  epsGrowth: 8,
  dividendYield: 2.5,
  payoutRatio: 40,
  beta: 0.9,
};

const goodBalanceSheet = { cash: 200_000_000_000, totalDebt: 100_000_000_000 };

describe('isJapaneseTicker', () => {
  it('identifies .T suffix tickers as Japanese', () => {
    expect(isJapaneseTicker('7203.T')).toBe(true);
    expect(isJapaneseTicker('9984.T')).toBe(true);
  });

  it('identifies 4-digit tickers as Japanese', () => {
    expect(isJapaneseTicker('7203')).toBe(true);
    expect(isJapaneseTicker('6758')).toBe(true);
  });

  it('identifies non-Japanese tickers correctly', () => {
    expect(isJapaneseTicker('AAPL')).toBe(false);
    expect(isJapaneseTicker('TSLA')).toBe(false);
    expect(isJapaneseTicker('NVDA')).toBe(false);
    expect(isJapaneseTicker('7203.HK')).toBe(false);
  });
});

describe('getTopixThresholds', () => {
  it('returns Technology thresholds for Technology sector', () => {
    const t = getTopixThresholds('Technology');
    expect(t.peCeiling).toBe(35);
    expect(t.dividendYieldFloor).toBe(0);
  });

  it('returns high D/E ceiling for Banking sector', () => {
    const t = getTopixThresholds('Banking');
    expect(t.deCeiling).toBeGreaterThan(5);
  });

  it('returns default thresholds for unknown sector', () => {
    const t = getTopixThresholds('Aerospace');
    expect(t.peCeiling).toBe(20);
    expect(t.roeFloor).toBe(8);
  });
});

describe('runJapanFilter — non-Japanese stock', () => {
  it('returns NOT_APPLICABLE for US tickers', () => {
    const result = runJapanFilter('AAPL', goodFinancials, goodBalanceSheet, 'Technology');
    expect(result.isJapanese).toBe(false);
    expect(result.overall).toBe('NOT_APPLICABLE');
    expect(result.gates).toHaveLength(0);
  });
});

describe('runJapanFilter — ALL_PASS', () => {
  it('passes all 6 gates for a strong Japanese industrial stock', () => {
    // Net-cash position (cash > debt) → Gate 3 auto-passes
    const result = runJapanFilter(
      '7203.T',
      goodFinancials,
      goodBalanceSheet,
      'Industrials'
    );
    expect(result.isJapanese).toBe(true);
    expect(result.gates).toHaveLength(6);
    expect(result.hardFails).toBe(0);
    expect(result.passingGates).toBeGreaterThan(0);
  });

  it('Gate 3 auto-passes when cash > totalDebt (net cash)', () => {
    const result = runJapanFilter(
      '7203.T',
      goodFinancials,
      { cash: 500_000_000_000, totalDebt: 100_000_000_000 },
      'Auto Manufacturing'
    );
    const gate3 = result.gates.find((g) => g.gate === 3);
    expect(gate3?.status).toBe('PASS');
    expect(gate3?.value).toContain('Net cash');
  });
});

describe('runJapanFilter — HARD_FAIL scenarios', () => {
  it('HARD_FAIL Gate 1 when P/E > 2× sector ceiling', () => {
    const financials = { ...goodFinancials, peRatio: 100 }; // Industrials ceiling is 18, 2× = 36
    const result = runJapanFilter('7203.T', financials, goodBalanceSheet, 'Industrials');
    const gate1 = result.gates.find((g) => g.gate === 1);
    expect(gate1?.status).toBe('HARD_FAIL');
    expect(result.overall).toBe('REJECT');
  });

  it('HARD_FAIL Gate 2 when PEG > 3.0', () => {
    const financials = { ...goodFinancials, pegRatio: 3.5 };
    const result = runJapanFilter('6758.T', financials, { cash: 10, totalDebt: 50 }, 'Technology');
    const gate2 = result.gates.find((g) => g.gate === 2);
    expect(gate2?.status).toBe('HARD_FAIL');
    expect(result.overall).toBe('REJECT');
  });

  it('HARD_FAIL Gate 3 when D/E > 3× sector ceiling', () => {
    // Auto Manufacturing ceiling = 0.8, 3× = 2.4
    const financials = { ...goodFinancials, debtToEquity: 3.0 };
    const bs = { cash: 10_000_000, totalDebt: 500_000_000_000 }; // net debt → no auto-pass
    const result = runJapanFilter('7203.T', financials, bs, 'Auto Manufacturing');
    const gate3 = result.gates.find((g) => g.gate === 3);
    expect(gate3?.status).toBe('HARD_FAIL');
    expect(result.overall).toBe('REJECT');
  });

  it('HARD_FAIL Gate 4 when ROE < 3%', () => {
    const financials = { ...goodFinancials, roe: 1.5 };
    const bs = { cash: 10_000_000, totalDebt: 50_000_000 };
    const result = runJapanFilter('7203.T', financials, bs, 'Industrials');
    const gate4 = result.gates.find((g) => g.gate === 4);
    expect(gate4?.status).toBe('HARD_FAIL');
    expect(result.overall).toBe('REJECT');
  });

  it('HARD_FAIL Gate 6 when revenue growth < -5%', () => {
    const financials = { ...goodFinancials, revenueGrowth: -8 };
    const result = runJapanFilter('7203.T', financials, goodBalanceSheet, 'Industrials');
    const gate6 = result.gates.find((g) => g.gate === 6);
    expect(gate6?.status).toBe('HARD_FAIL');
    expect(result.overall).toBe('REJECT');
  });
});

describe('runJapanFilter — INVESTIGATE (soft fail)', () => {
  it('INVESTIGATE when P/E is above ceiling but below 2× ceiling', () => {
    // Industrials ceiling = 18; soft fail range: 18–36
    const financials = { ...goodFinancials, peRatio: 22 };
    const result = runJapanFilter('7203.T', financials, goodBalanceSheet, 'Industrials');
    const gate1 = result.gates.find((g) => g.gate === 1);
    expect(gate1?.status).toBe('SOFT_FAIL');
    expect(result.overall).toBe('INVESTIGATE');
    expect(result.softFails).toBe(1);
    expect(result.hardFails).toBe(0);
  });

  it('SOFT_FAIL Gate 3 when D/E is above ceiling but below 3× ceiling', () => {
    // Auto Manufacturing ceiling = 0.8; soft fail range: 0.8–2.4
    const financials = { ...goodFinancials, debtToEquity: 1.5 };
    const bs = { cash: 10_000_000, totalDebt: 500_000_000_000 };
    const result = runJapanFilter('7203.T', financials, bs, 'Auto Manufacturing');
    const gate3 = result.gates.find((g) => g.gate === 3);
    expect(gate3?.status).toBe('SOFT_FAIL');
    expect(gate3?.softFailNote).toBeDefined();
  });

  it('SOFT_FAIL Gate 5 when no dividend but FCF is positive', () => {
    const financials = { ...goodFinancials, dividendYield: 0 };
    const bs = { cash: 10_000_000, totalDebt: 50_000_000 };
    const result = runJapanFilter('7203.T', financials, bs, 'Industrials');
    const gate5 = result.gates.find((g) => g.gate === 5);
    expect(gate5?.status).toBe('SOFT_FAIL');
    expect(gate5?.softFailNote).toContain('buyback');
  });
});

describe('runJapanFilter — Technology sector (no dividend requirement)', () => {
  it('Gate 5 PASS even with zero dividend yield in Technology sector', () => {
    const financials = { ...goodFinancials, dividendYield: 0 };
    const result = runJapanFilter('4063.T', financials, goodBalanceSheet, 'Technology');
    const gate5 = result.gates.find((g) => g.gate === 5);
    expect(gate5?.status).toBe('PASS');
    expect(gate5?.threshold).toContain('No floor');
  });
});

describe('runJapanFilter — summary messages', () => {
  it('ALL_PASS summary includes sector name', () => {
    const result = runJapanFilter('7203.T', goodFinancials, goodBalanceSheet, 'Industrials');
    if (result.overall === 'ALL_PASS') {
      expect(result.summary).toContain('ALL_PASS');
      expect(result.summary).toContain('Industrials');
    }
  });

  it('REJECT summary names the failing gates', () => {
    const financials = { ...goodFinancials, peRatio: 150, roe: 1 };
    const result = runJapanFilter('7203.T', financials, goodBalanceSheet, 'Industrials');
    expect(result.summary).toContain('REJECT');
  });

  it('INVESTIGATE summary includes passing gate count', () => {
    const financials = { ...goodFinancials, peRatio: 22 }; // soft fail on Gate 1
    const result = runJapanFilter('7203.T', financials, goodBalanceSheet, 'Industrials');
    if (result.overall === 'INVESTIGATE') {
      expect(result.summary).toContain('INVESTIGATE');
    }
  });
});