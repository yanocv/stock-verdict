/**
 * Financial ratio calculation functions.
 * All functions return null for invalid inputs (zero denominators, negative values where inappropriate, etc.)
 */

/** Price / EPS. Returns null if EPS <= 0 */
export function calculatePE(price: number, eps: number): number | null {
  if (eps <= 0) return null;
  return price / eps;
}

/** Price / Revenue per Share. Returns null if revenuePerShare <= 0 */
export function calculatePS(price: number, revenuePerShare: number): number | null {
  if (revenuePerShare <= 0) return null;
  return price / revenuePerShare;
}

/** Price / Book Value per Share. Returns null if bookValuePerShare <= 0 */
export function calculatePB(price: number, bookValuePerShare: number): number | null {
  if (bookValuePerShare <= 0) return null;
  return price / bookValuePerShare;
}

/** PE Ratio / EPS Growth Rate. Returns null if epsGrowthRate <= 0 or peRatio is null/negative */
export function calculatePEG(peRatio: number, epsGrowthRate: number): number | null {
  if (peRatio <= 0) return null;
  if (epsGrowthRate <= 0) return null;
  return peRatio / epsGrowthRate;
}

/** Net Income / Shareholder Equity × 100. Returns null if shareholderEquity <= 0 */
export function calculateROE(netIncome: number, shareholderEquity: number): number | null {
  if (shareholderEquity <= 0) return null;
  return (netIncome / shareholderEquity) * 100;
}

/** Current Assets / Current Liabilities. Returns null if currentLiabilities <= 0 */
export function calculateCurrentRatio(currentAssets: number, currentLiabilities: number): number | null {
  if (currentLiabilities <= 0) return null;
  return currentAssets / currentLiabilities;
}

/** Total Debt / Shareholder Equity. Returns null if shareholderEquity <= 0 */
export function calculateDebtToEquity(totalDebt: number, shareholderEquity: number): number | null {
  if (shareholderEquity <= 0) return null;
  return totalDebt / shareholderEquity;
}

/** Operating Income / Revenue × 100. Returns null if revenue <= 0 */
export function calculateOperatingMargin(operatingIncome: number, revenue: number): number | null {
  if (revenue <= 0) return null;
  return (operatingIncome / revenue) * 100;
}

/** Net Income / Revenue × 100. Returns null if revenue <= 0 */
export function calculateNetProfitMargin(netIncome: number, revenue: number): number | null {
  if (revenue <= 0) return null;
  return (netIncome / revenue) * 100;
}

/** Annual Dividend / Price × 100. Returns null if price <= 0 */
export function calculateDividendYield(annualDividend: number, price: number): number | null {
  if (price <= 0) return null;
  if (annualDividend < 0) return null;
  return (annualDividend / price) * 100;
}

/** Dividend Per Share / EPS × 100. Returns null if EPS <= 0 */
export function calculatePayoutRatio(dividendPerShare: number, eps: number): number | null {
  if (eps <= 0) return null;
  if (dividendPerShare < 0) return null;
  return (dividendPerShare / eps) * 100;
}
