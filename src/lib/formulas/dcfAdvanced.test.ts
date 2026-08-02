import { describe, it, expect } from 'vitest';
import {
  calculateWACC,
  dcfWithWACC,
  buildSensitivityTable,
  runAdvancedDCF,
  DEFAULT_EQUITY_RISK_PREMIUM,
  DEFAULT_RISK_FREE_RATE,
  DEFAULT_TERMINAL_GROWTH_RATE,
} from './dcfAdvanced';

describe('calculateWACC', () => {
  it('returns riskFreeRate + beta × ERP for normal inputs', () => {
    // 4.5% + 1.0 × 5.5% = 10%
    expect(calculateWACC(0.045, 1.0, 0.055)).toBeCloseTo(0.10);
  });

  it('clamps minimum WACC to 5%', () => {
    // Very low beta + low risk-free rate should not go below 5%
    expect(calculateWACC(0.01, 0.1, 0.02)).toBeCloseTo(0.05);
  });

  it('clamps maximum WACC to 25%', () => {
    // Extreme beta should not produce WACC above 25%
    expect(calculateWACC(0.05, 10, 0.055)).toBeCloseTo(0.25);
  });

  it('handles high-growth tech (beta 1.5)', () => {
    const wacc = calculateWACC(0.045, 1.5, 0.055);
    expect(wacc).toBeCloseTo(0.045 + 1.5 * 0.055);
  });
});

describe('dcfWithWACC', () => {
  it('returns null for zero or negative FCF', () => {
    expect(dcfWithWACC(0, 0.08, 0.10, 0.03, 1000000, 0, 10)).toBeNull();
    expect(dcfWithWACC(-1000, 0.08, 0.10, 0.03, 1000000, 0, 10)).toBeNull();
  });

  it('returns null when sharesOutstanding <= 0', () => {
    expect(dcfWithWACC(1000000, 0.08, 0.10, 0.03, 0, 0, 10)).toBeNull();
  });

  it('returns null when WACC <= terminalGrowthRate', () => {
    expect(dcfWithWACC(1000000, 0.08, 0.03, 0.03, 1000000, 0, 10)).toBeNull();
    expect(dcfWithWACC(1000000, 0.08, 0.02, 0.03, 1000000, 0, 10)).toBeNull();
  });

  it('returns a positive value for valid inputs', () => {
    const fv = dcfWithWACC(1_000_000_000, 0.08, 0.10, 0.03, 1_000_000_000, 0, 10);
    expect(fv).not.toBeNull();
    expect(fv!).toBeGreaterThan(0);
  });

  it('higher WACC produces lower fair value', () => {
    const fcf = 1_000_000_000;
    const shares = 500_000_000;
    const fvLowWACC = dcfWithWACC(fcf, 0.08, 0.08, 0.03, shares, 0, 10);
    const fvHighWACC = dcfWithWACC(fcf, 0.08, 0.15, 0.03, shares, 0, 10);
    expect(fvLowWACC).not.toBeNull();
    expect(fvHighWACC).not.toBeNull();
    expect(fvLowWACC!).toBeGreaterThan(fvHighWACC!);
  });

  it('higher growth rate produces higher fair value', () => {
    const fcf = 1_000_000_000;
    const shares = 500_000_000;
    const fvLowGrowth = dcfWithWACC(fcf, 0.03, 0.10, 0.03, shares, 0, 10);
    const fvHighGrowth = dcfWithWACC(fcf, 0.15, 0.10, 0.03, shares, 0, 10);
    expect(fvLowGrowth).not.toBeNull();
    expect(fvHighGrowth).not.toBeNull();
    expect(fvHighGrowth!).toBeGreaterThan(fvLowGrowth!);
  });

  it('net-cash company (negative netDebt) produces higher equity value', () => {
    const fcf = 1_000_000_000;
    const shares = 500_000_000;
    const fvNoDebt = dcfWithWACC(fcf, 0.08, 0.10, 0.03, shares, 0, 10);
    const fvNetCash = dcfWithWACC(fcf, 0.08, 0.10, 0.03, shares, -500_000_000, 10);
    expect(fvNoDebt).not.toBeNull();
    expect(fvNetCash).not.toBeNull();
    expect(fvNetCash!).toBeGreaterThan(fvNoDebt!);
  });
});

describe('buildSensitivityTable', () => {
  it('returns a 5×5 table', () => {
    const table = buildSensitivityTable(0.10, 0.08, 1_000_000_000, 0.03, 500_000_000, 0, 10);
    expect(table).toHaveLength(5);
    table.forEach((row) => expect(row).toHaveLength(5));
  });

  it('base case cell (center [2][2]) matches dcfWithWACC base case', () => {
    const baseWACC = 0.10;
    const baseGrowth = 0.08;
    const fcf = 1_000_000_000;
    const shares = 500_000_000;
    const table = buildSensitivityTable(baseWACC, baseGrowth, fcf, 0.03, shares, 0, 10);
    const centerCell = table[2]?.[2];
    const directValue = dcfWithWACC(fcf, baseGrowth, baseWACC, 0.03, shares, 0, 10);
    expect(centerCell?.fairValue).toBeCloseTo(directValue ?? 0, 1);
  });

  it('all cells have wacc and growthRate fields', () => {
    const table = buildSensitivityTable(0.10, 0.08, 1_000_000_000, 0.03, 500_000_000, 0, 10);
    table.forEach((row) => {
      row.forEach((cell) => {
        expect(typeof cell.wacc).toBe('number');
        expect(typeof cell.growthRate).toBe('number');
        expect(typeof cell.fairValue).toBe('number');
      });
    });
  });

  it('lower WACC rows have higher fair values than higher WACC rows (for same column)', () => {
    const table = buildSensitivityTable(0.10, 0.08, 1_000_000_000, 0.03, 500_000_000, 0, 10);
    // Row 0 = lowest WACC, Row 4 = highest WACC → row 0 should have higher values
    const col = 2;
    expect(table[0]?.[col]?.fairValue ?? 0).toBeGreaterThan(table[4]?.[col]?.fairValue ?? 0);
  });
});

describe('runAdvancedDCF', () => {
  const baseParams = {
    freeCashFlow: 90_000_000_000, // Apple-like FCF
    sharesOutstanding: 15_000_000_000,
    netDebt: -50_000_000_000, // net cash
    beta: 1.2,
    growthRate: 0.08,
    riskFreeRate: 0.045,
    currentPrice: 185,
  };

  it('returns a DCFAnalysis object with all required fields', () => {
    const result = runAdvancedDCF(baseParams);
    expect(result.baseCase).not.toBeNull();
    expect(result.wacc).not.toBeNull();
    expect(result.riskFreeRate).toBe(0.045);
    expect(result.betaUsed).toBeCloseTo(1.2);
    expect(result.sensitivityTable).toHaveLength(5);
    expect(result.sensitivityTable[0]).toHaveLength(5);
  });

  it('uses DEFAULT_RISK_FREE_RATE when riskFreeRate is null', () => {
    const result = runAdvancedDCF({ ...baseParams, riskFreeRate: null });
    expect(result.riskFreeRate).toBe(DEFAULT_RISK_FREE_RATE);
  });

  it('uses DEFAULT_EQUITY_RISK_PREMIUM when not provided', () => {
    const result = runAdvancedDCF(baseParams);
    expect(result.equityRiskPremium).toBe(DEFAULT_EQUITY_RISK_PREMIUM);
  });

  it('uses DEFAULT_TERMINAL_GROWTH_RATE when not provided', () => {
    const result = runAdvancedDCF(baseParams);
    expect(result.terminalGrowthRate).toBe(DEFAULT_TERMINAL_GROWTH_RATE);
  });

  it('returns null baseCase for negative FCF', () => {
    const result = runAdvancedDCF({ ...baseParams, freeCashFlow: -1_000_000 });
    expect(result.baseCase).toBeNull();
  });

  it('calculates positive margin of safety when price < fair value', () => {
    // FCF is large so fair value should exceed $185
    const result = runAdvancedDCF(baseParams);
    if (result.baseCase !== null && result.baseCase > baseParams.currentPrice) {
      expect(result.marginOfSafety).not.toBeNull();
      expect(result.marginOfSafety!).toBeGreaterThan(0);
    }
  });

  it('clamps extreme beta values', () => {
    const highBeta = runAdvancedDCF({ ...baseParams, beta: 10 });
    expect(highBeta.betaUsed).toBe(3);
    const lowBeta = runAdvancedDCF({ ...baseParams, beta: 0.1 });
    expect(lowBeta.betaUsed).toBe(0.3);
  });

  it('clamps growth rate above 20%', () => {
    const result = runAdvancedDCF({ ...baseParams, growthRate: 0.50 });
    expect(result.growthRate).toBe(0.20);
  });
});