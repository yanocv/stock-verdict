/**
 * Industry benchmark data for ratio evaluation.
 * All thresholds are approximate; real-world analysis should use live data.
 */

export interface IndustryBenchmarks {
  pe: { cheap: number; fair: number; expensive: number };
  ps: { cheap: number; fair: number; expensive: number };
  operatingMargin: { poor: number; average: number; good: number };
  roe: { poor: number; average: number; good: number };
  debtToEquity: { low: number; moderate: number; high: number };
}

const INDUSTRY_BENCHMARKS: Record<string, IndustryBenchmarks> = {
  'Auto Manufacturing': {
    pe: { cheap: 8, fair: 12, expensive: 20 },
    ps: { cheap: 0.3, fair: 0.6, expensive: 1.5 },
    operatingMargin: { poor: 3, average: 6, good: 10 },
    roe: { poor: 5, average: 10, good: 18 },
    debtToEquity: { low: 0.5, moderate: 1.5, high: 2.5 },
  },
  Technology: {
    pe: { cheap: 15, fair: 25, expensive: 50 },
    ps: { cheap: 2, fair: 5, expensive: 12 },
    operatingMargin: { poor: 5, average: 15, good: 25 },
    roe: { poor: 8, average: 18, good: 30 },
    debtToEquity: { low: 0.2, moderate: 0.8, high: 1.5 },
  },
  'Financial Services': {
    pe: { cheap: 8, fair: 12, expensive: 20 },
    ps: { cheap: 1, fair: 2, expensive: 4 },
    operatingMargin: { poor: 10, average: 20, good: 35 },
    roe: { poor: 6, average: 12, good: 18 },
    debtToEquity: { low: 1.0, moderate: 3.0, high: 6.0 },
  },
  Retail: {
    pe: { cheap: 10, fair: 18, expensive: 35 },
    ps: { cheap: 0.3, fair: 0.7, expensive: 2.0 },
    operatingMargin: { poor: 1, average: 4, good: 8 },
    roe: { poor: 5, average: 12, good: 20 },
    debtToEquity: { low: 0.3, moderate: 1.0, high: 2.0 },
  },
  'Pharma/Biotech': {
    pe: { cheap: 15, fair: 25, expensive: 50 },
    ps: { cheap: 3, fair: 7, expensive: 15 },
    operatingMargin: { poor: 5, average: 15, good: 30 },
    roe: { poor: 5, average: 15, good: 25 },
    debtToEquity: { low: 0.3, moderate: 0.8, high: 1.5 },
  },
  Energy: {
    pe: { cheap: 8, fair: 14, expensive: 25 },
    ps: { cheap: 0.5, fair: 1.2, expensive: 3.0 },
    operatingMargin: { poor: 3, average: 10, good: 20 },
    roe: { poor: 5, average: 12, good: 20 },
    debtToEquity: { low: 0.3, moderate: 1.0, high: 2.0 },
  },
  Telecom: {
    pe: { cheap: 10, fair: 16, expensive: 28 },
    ps: { cheap: 0.8, fair: 1.5, expensive: 3.5 },
    operatingMargin: { poor: 5, average: 15, good: 25 },
    roe: { poor: 5, average: 12, good: 20 },
    debtToEquity: { low: 0.5, moderate: 1.5, high: 3.0 },
  },
  'Consumer Goods': {
    pe: { cheap: 12, fair: 20, expensive: 35 },
    ps: { cheap: 0.8, fair: 1.8, expensive: 4.0 },
    operatingMargin: { poor: 5, average: 12, good: 20 },
    roe: { poor: 8, average: 15, good: 25 },
    debtToEquity: { low: 0.3, moderate: 0.8, high: 1.5 },
  },
};

/** Default/fallback benchmarks for unknown sectors */
const DEFAULT_BENCHMARKS: IndustryBenchmarks = {
  pe: { cheap: 12, fair: 20, expensive: 35 },
  ps: { cheap: 1, fair: 3, expensive: 8 },
  operatingMargin: { poor: 5, average: 12, good: 20 },
  roe: { poor: 8, average: 15, good: 25 },
  debtToEquity: { low: 0.3, moderate: 1.0, high: 2.0 },
};

/**
 * Get benchmarks for a given sector.
 * Falls back to DEFAULT_BENCHMARKS if the sector is not found.
 */
export function getBenchmarksForSector(sector: string): IndustryBenchmarks {
  return INDUSTRY_BENCHMARKS[sector] ?? DEFAULT_BENCHMARKS;
}

export { INDUSTRY_BENCHMARKS, DEFAULT_BENCHMARKS };
