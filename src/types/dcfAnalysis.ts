/**
 * Advanced DCF analysis with WACC and sensitivity table.
 */

/** A single cell in the sensitivity table */
export interface SensitivityCell {
  wacc: number;        // decimal, e.g. 0.09
  growthRate: number;  // decimal, e.g. 0.08
  fairValue: number;   // per-share fair value
}

/**
 * Full DCF analysis output including WACC breakdown and sensitivity table.
 */
export interface DCFAnalysis {
  /** Fair value per share at the base-case WACC and growth rate */
  baseCase: number | null;
  /** Set when financials and price use different currencies; no fair value is computed. */
  currencyMismatch?: { price: string; financial: string } | null;
  /** WACC used in the base-case calculation */
  wacc: number | null;
  /** Risk-free rate used (10Y Treasury yield) */
  riskFreeRate: number | null;
  /** Equity risk premium applied */
  equityRiskPremium: number;
  /** Beta used in WACC calculation */
  betaUsed: number;
  /** Base growth rate used (FCF growth for projection years) */
  growthRate: number | null;
  /** Terminal growth rate */
  terminalGrowthRate: number;
  /** Number of projection years */
  projectionYears: number;
  /** Present value of projected cash flows */
  pvProjected: number | null;
  /** Present value of terminal value */
  pvTerminal: number | null;
  /**
   * 5×5 sensitivity table: ±2 WACC steps × ±2 growth rate steps.
   * Rows vary WACC (low → high), columns vary growth (low → high).
   */
  sensitivityTable: SensitivityCell[][];
  /** Margin of safety at base-case fair value vs. current price */
  marginOfSafety: number | null;
}