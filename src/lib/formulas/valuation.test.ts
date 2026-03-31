import { describe, it, expect } from 'vitest';
import {
  grahamNumber,
  grahamIntrinsicValue,
  lynchFairValue,
  dcfFairValue,
  dividendDiscountModel,
  calculateMarginOfSafety,
} from './valuation';

describe('grahamNumber', () => {
  it('calculates Graham Number correctly for Toyota-like data', () => {
    // Toyota: EPS ~¥400, BVPS ~¥3000 → √(22.5 × 400 × 3000) = √27,000,000 ≈ 5196
    const result = grahamNumber(400, 3000);
    expect(result).toBeCloseTo(Math.sqrt(22.5 * 400 * 3000), 1);
  });

  it('calculates Graham Number for a typical US stock', () => {
    // EPS = 5, BVPS = 20 → √(22.5 × 5 × 20) = √2250 ≈ 47.43
    const result = grahamNumber(5, 20);
    expect(result).toBeCloseTo(47.43, 1);
  });

  it('returns null when EPS is zero', () => {
    expect(grahamNumber(0, 20)).toBeNull();
  });

  it('returns null when EPS is negative', () => {
    expect(grahamNumber(-5, 20)).toBeNull();
  });

  it('returns null when bookValuePerShare is zero', () => {
    expect(grahamNumber(5, 0)).toBeNull();
  });

  it('returns null when bookValuePerShare is negative', () => {
    expect(grahamNumber(5, -20)).toBeNull();
  });
});

describe('grahamIntrinsicValue', () => {
  it('calculates Graham intrinsic value correctly', () => {
    // EPS=5, g=7%, Y=4.4% → (5 × (8.5 + 14) × 4.4) / 4.4 = 5 × 22.5 = 112.5
    const result = grahamIntrinsicValue(5, 7, 4.4);
    expect(result).toBeCloseTo(112.5, 0);
  });

  it('returns null when EPS is zero', () => {
    expect(grahamIntrinsicValue(0, 7, 4.4)).toBeNull();
  });

  it('returns null when EPS is negative', () => {
    expect(grahamIntrinsicValue(-5, 7, 4.4)).toBeNull();
  });

  it('returns null when currentYield is zero', () => {
    expect(grahamIntrinsicValue(5, 7, 0)).toBeNull();
  });

  it('returns null when currentYield is negative', () => {
    expect(grahamIntrinsicValue(5, 7, -1)).toBeNull();
  });
});

describe('lynchFairValue', () => {
  it('calculates Lynch fair value correctly', () => {
    // EPS = 3, growth rate = 15% → 3 × 15 = 45
    expect(lynchFairValue(3, 15)).toBeCloseTo(45);
  });

  it('returns null when EPS is zero', () => {
    expect(lynchFairValue(0, 15)).toBeNull();
  });

  it('returns null when EPS is negative', () => {
    expect(lynchFairValue(-3, 15)).toBeNull();
  });

  it('returns null when epsGrowthRate is zero', () => {
    expect(lynchFairValue(3, 0)).toBeNull();
  });

  it('returns null when epsGrowthRate is negative', () => {
    expect(lynchFairValue(3, -5)).toBeNull();
  });
});

describe('dcfFairValue', () => {
  const baseParams = {
    freeCashFlow: 1_000_000,
    growthRate: 0.1,
    discountRate: 0.09,
    terminalGrowthRate: 0.03,
    sharesOutstanding: 100_000,
    projectionYears: 10,
  };

  it('returns a positive value for valid inputs', () => {
    const result = dcfFairValue(baseParams);
    expect(result).toBeGreaterThan(0);
  });

  it('higher growth rate produces higher fair value', () => {
    const low = dcfFairValue({ ...baseParams, growthRate: 0.05 });
    const high = dcfFairValue({ ...baseParams, growthRate: 0.15 });
    expect(high).toBeGreaterThan(low!);
  });

  it('returns null when freeCashFlow is zero', () => {
    expect(dcfFairValue({ ...baseParams, freeCashFlow: 0 })).toBeNull();
  });

  it('returns null when freeCashFlow is negative', () => {
    expect(dcfFairValue({ ...baseParams, freeCashFlow: -1000 })).toBeNull();
  });

  it('returns null when sharesOutstanding is zero', () => {
    expect(dcfFairValue({ ...baseParams, sharesOutstanding: 0 })).toBeNull();
  });

  it('returns null when discountRate <= terminalGrowthRate', () => {
    expect(dcfFairValue({ ...baseParams, discountRate: 0.03, terminalGrowthRate: 0.03 })).toBeNull();
    expect(dcfFairValue({ ...baseParams, discountRate: 0.02, terminalGrowthRate: 0.03 })).toBeNull();
  });

  it('returns null when projectionYears is zero', () => {
    expect(dcfFairValue({ ...baseParams, projectionYears: 0 })).toBeNull();
  });
});

describe('dividendDiscountModel', () => {
  it('calculates DDM correctly', () => {
    // D=2, r=0.08, g=0.03 → 2 / (0.08 - 0.03) = 40
    expect(dividendDiscountModel(2, 0.08, 0.03)).toBeCloseTo(40);
  });

  it('returns null when dividend is zero', () => {
    expect(dividendDiscountModel(0, 0.08, 0.03)).toBeNull();
  });

  it('returns null when dividend is negative', () => {
    expect(dividendDiscountModel(-1, 0.08, 0.03)).toBeNull();
  });

  it('returns null when requiredReturn equals growthRate', () => {
    expect(dividendDiscountModel(2, 0.05, 0.05)).toBeNull();
  });

  it('returns null when requiredReturn is less than growthRate', () => {
    expect(dividendDiscountModel(2, 0.03, 0.05)).toBeNull();
  });

  it('returns null when requiredReturn is zero', () => {
    expect(dividendDiscountModel(2, 0, 0.03)).toBeNull();
  });
});

describe('calculateMarginOfSafety', () => {
  it('returns positive MoS when price is below intrinsic value', () => {
    // IV=100, price=75 → (100-75)/100×100 = 25%
    expect(calculateMarginOfSafety(100, 75)).toBeCloseTo(25);
  });

  it('returns negative MoS when price is above intrinsic value', () => {
    // IV=100, price=120 → (100-120)/100×100 = -20%
    expect(calculateMarginOfSafety(100, 120)).toBeCloseTo(-20);
  });

  it('returns 0 when price equals intrinsic value', () => {
    expect(calculateMarginOfSafety(100, 100)).toBeCloseTo(0);
  });

  it('returns 0 when intrinsicValue is 0 to avoid division by zero', () => {
    expect(calculateMarginOfSafety(0, 100)).toBe(0);
  });
});
