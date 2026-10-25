/**
 * Verdict engine parameters — single source of truth.
 *
 * Mirrors the parameter table in docs/ENGINE_SPEC.md §6. Every value is
 * `assumed` until the backtest harness validates it; change a value here and
 * in the spec together.
 *
 * Per-metric step adjustments (e.g. "ROE above sector good → +1.5") still live
 * inline in verdictEngine.ts; they move here when the engine is split into
 * Quality / Value / Expectations scores.
 */

export interface EngineParams {
  /** Weighted-average weights for the six sub-scores (sum to 1). */
  weights: {
    valuation: number;
    financials: number;
    health: number;
    technical: number;
    macro: number;
    news: number;
  };
  verdict: {
    /** overall > buyMin → BUY */
    buyMin: number;
    /** overall < avoidMax → AVOID; between → WAIT */
    avoidMax: number;
  };
  confidence: {
    /** Confidence at a threshold, before distance is added */
    base: number;
    /** Points added per unit of score distance from the nearest threshold */
    perScorePoint: number;
    max: number;
    /** Points removed per missing core input */
    missingInputPenalty: number;
    floor: number;
  };
  /**
   * DCF margin-of-safety steps added to the valuation sub-score.
   * MoS = (fair value − price) / fair value. First matching step wins:
   * `above` steps are checked in order (largest first), then `below` steps.
   */
  marginOfSafety: {
    above: ReadonlyArray<{ mos: number; points: number }>;
    below: ReadonlyArray<{ mos: number; points: number }>;
  };
  /** Suggested entry = fair value × factor (or price × fallback when no fair value). */
  suggestedBuy: {
    fairValueFactor: number;
    noFairValuePriceFactor: number;
  };
  /** Simple DCF used only when no advanced DCF fair value is available. */
  fallbackDcf: {
    defaultEpsGrowthPct: number;
    minGrowth: number;
    maxGrowth: number;
    discountRate: number;
    terminalGrowth: number;
    projectionYears: number;
  };
  /** Advanced DCF defaults (dcfAdvanced.ts). */
  dcf: {
    riskFreeRate: number;
    equityRiskPremium: number;
    terminalGrowth: number;
    minGrowth: number;
    maxGrowth: number;
    defaultGrowth: number;
  };
}

export const DEFAULT_ENGINE_PARAMS: EngineParams = {
  weights: {
    valuation: 0.35,
    financials: 0.20,
    health: 0.20,
    technical: 0.12,
    macro: 0.07,
    news: 0.06,
  },
  verdict: {
    buyMin: 7,
    avoidMax: 4,
  },
  confidence: {
    base: 50,
    perScorePoint: 15,
    max: 95,
    missingInputPenalty: 5,
    floor: 20,
  },
  marginOfSafety: {
    above: [
      { mos: 0.40, points: 4 },   // >40% below fair value — massive undervaluation
      { mos: 0.25, points: 2.5 }, // >25% below fair value — significant discount
      { mos: 0.10, points: 1 },   // >10% below fair value — moderate discount
    ],
    below: [
      { mos: -0.30, points: -3 }, // >30% above fair value — materially overvalued
      { mos: -0.10, points: -1 }, // >10% above fair value — moderately overvalued
    ],
  },
  suggestedBuy: {
    fairValueFactor: 0.75,
    noFairValuePriceFactor: 0.85,
  },
  fallbackDcf: {
    defaultEpsGrowthPct: 5,
    minGrowth: 0.02,
    maxGrowth: 0.15,
    discountRate: 0.09,
    terminalGrowth: 0.03,
    projectionYears: 10,
  },
  dcf: {
    riskFreeRate: 0.045,      // US 10Y fallback; Japan → live JGB 10Y (decided, not built)
    equityRiskPremium: 0.055, // Damodaran global estimate
    terminalGrowth: 0.03,
    minGrowth: -0.05,
    maxGrowth: 0.15,
    defaultGrowth: 0.05,
  },
};
