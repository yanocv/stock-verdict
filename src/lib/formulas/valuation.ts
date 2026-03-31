/**
 * Stock valuation formula functions.
 * All functions return null for invalid or undefined inputs.
 */

/** Graham Number: √(22.5 × EPS × BVPS). Returns null if EPS or BVPS <= 0 */
export function grahamNumber(eps: number, bookValuePerShare: number): number | null {
  if (eps <= 0 || bookValuePerShare <= 0) return null;
  return Math.sqrt(22.5 * eps * bookValuePerShare);
}

/**
 * Graham Intrinsic Value: (EPS × (8.5 + 2g) × 4.4) / Y
 * where g = expected growth rate (%), Y = current AAA corporate bond yield (%)
 * Returns null if EPS <= 0 or currentYield <= 0
 */
export function grahamIntrinsicValue(
  eps: number,
  growthRate: number,
  currentYield: number
): number | null {
  if (eps <= 0) return null;
  if (currentYield <= 0) return null;
  return (eps * (8.5 + 2 * growthRate) * 4.4) / currentYield;
}

/** Lynch Fair Value: EPS × EPS Growth Rate (PEG of 1). Returns null if EPS or epsGrowthRate <= 0 */
export function lynchFairValue(eps: number, epsGrowthRate: number): number | null {
  if (eps <= 0 || epsGrowthRate <= 0) return null;
  return eps * epsGrowthRate;
}

export interface DCFParams {
  freeCashFlow: number;
  growthRate: number;       // decimal, e.g. 0.10 for 10%
  discountRate: number;     // decimal, e.g. 0.09 for 9%
  terminalGrowthRate: number; // decimal, e.g. 0.03 for 3%
  sharesOutstanding: number;
  projectionYears: number;
}

/**
 * DCF Fair Value per share.
 * Returns null if freeCashFlow <= 0, sharesOutstanding <= 0,
 * discountRate <= terminalGrowthRate, or projectionYears <= 0.
 */
export function dcfFairValue(params: DCFParams): number | null {
  const {
    freeCashFlow,
    growthRate,
    discountRate,
    terminalGrowthRate,
    sharesOutstanding,
    projectionYears,
  } = params;

  if (freeCashFlow <= 0) return null;
  if (sharesOutstanding <= 0) return null;
  if (discountRate <= terminalGrowthRate) return null;
  if (projectionYears <= 0) return null;

  let totalPV = 0;
  let fcf = freeCashFlow;

  for (let year = 1; year <= projectionYears; year++) {
    fcf = fcf * (1 + growthRate);
    totalPV += fcf / Math.pow(1 + discountRate, year);
  }

  // Terminal value (Gordon Growth Model)
  const terminalValue = (fcf * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate);
  const terminalPV = terminalValue / Math.pow(1 + discountRate, projectionYears);

  const totalValue = totalPV + terminalPV;
  return totalValue / sharesOutstanding;
}

/**
 * Dividend Discount Model: D / (r - g)
 * Returns null if r <= g or dividend <= 0 or requiredReturn <= 0
 */
export function dividendDiscountModel(
  dividend: number,
  requiredReturn: number,
  growthRate: number
): number | null {
  if (dividend <= 0) return null;
  if (requiredReturn <= 0) return null;
  if (requiredReturn <= growthRate) return null;
  return dividend / (requiredReturn - growthRate);
}

/**
 * Margin of Safety: (intrinsicValue - currentPrice) / intrinsicValue × 100
 * A positive value indicates the stock is trading below intrinsic value.
 */
export function calculateMarginOfSafety(intrinsicValue: number, currentPrice: number): number {
  if (intrinsicValue === 0) return 0;
  return ((intrinsicValue - currentPrice) / intrinsicValue) * 100;
}
