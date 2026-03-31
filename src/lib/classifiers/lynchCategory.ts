import type { LynchCategory } from '@/types';

export interface LynchClassifierInput {
  epsGrowthRate: number;  // annual EPS growth rate in percent
  sector: string;
  recentLoss: boolean;    // company had a loss in the most recent period
  improvingEarnings: boolean; // earnings trend is improving (for turnarounds)
}

const CYCLICAL_SECTORS = [
  'Auto Manufacturing',
  'Energy',
  'Steel',
  'Chemicals',
  'Mining',
  'Airlines',
  'Construction',
  'Semiconductors',
];

/**
 * Classifies a stock into Peter Lynch's six categories:
 * - slow-grower:   < 5% EPS growth
 * - stalwart:      5-12% EPS growth
 * - fast-grower:   > 12% EPS growth
 * - cyclical:      sector-based detection
 * - turnaround:    recent losses but improving earnings
 * - asset-play:    (manual/future — not detectable from growth rate alone)
 */
export function classifyLynchCategory(input: LynchClassifierInput): LynchCategory {
  const { epsGrowthRate, sector, recentLoss, improvingEarnings } = input;

  // Turnaround: had losses but earnings are improving
  if (recentLoss && improvingEarnings) {
    return 'turnaround';
  }

  // Cyclical: sector-based detection
  const isCyclical = CYCLICAL_SECTORS.some(
    (s) => sector.toLowerCase().includes(s.toLowerCase())
  );
  if (isCyclical) {
    return 'cyclical';
  }

  // Growth-rate based classification
  if (epsGrowthRate >= 12) {
    return 'fast-grower';
  }

  if (epsGrowthRate >= 5) {
    return 'stalwart';
  }

  return 'slow-grower';
}
