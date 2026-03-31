import type { StockOverview } from '@/types';

/** Market cap thresholds in USD */
const LARGE_CAP_THRESHOLD = 10_000_000_000;  // $10B
const MID_CAP_THRESHOLD = 2_000_000_000;     // $2B

/** Market cap thresholds in JPY */
const LARGE_CAP_JPY = 1_500_000_000_000;     // ¥1.5T
const MID_CAP_JPY = 300_000_000_000;          // ¥300B

/**
 * Classifies a company by market cap size.
 * - Large cap: > $10B (¥1.5T)
 * - Mid cap:   $2B–$10B (¥300B–¥1.5T)
 * - Small cap: < $2B (¥300B)
 */
export function classifyCapSize(marketCap: number, currency: string = 'USD'): StockOverview['capSize'] {
  const isJpy = currency.toUpperCase() === 'JPY';

  if (isJpy) {
    if (marketCap >= LARGE_CAP_JPY) return 'large';
    if (marketCap >= MID_CAP_JPY) return 'mid';
    return 'small';
  }

  if (marketCap >= LARGE_CAP_THRESHOLD) return 'large';
  if (marketCap >= MID_CAP_THRESHOLD) return 'mid';
  return 'small';
}
