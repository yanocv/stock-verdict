import type { IndexTrend } from '@/types/macro';
import { calculateSMA } from './rsi';

/** Trading days in a year, used for the 52-week high. */
const YEAR_SESSIONS = 252;

/**
 * Trend of an index from daily closes (oldest first): position vs its 200-day
 * average and drop from its 52-week high. Returns null with fewer than 200
 * closes, since the 200-day average needs them.
 */
export function computeIndexTrend(closes: number[]): IndexTrend | null {
  const sma200 = calculateSMA(closes, 200);
  const last = closes[closes.length - 1];
  if (sma200 === null || last === undefined || sma200 <= 0) {return null;}

  const high = Math.max(...closes.slice(-YEAR_SESSIONS));
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    vsSma200Pct: round1((last / sma200 - 1) * 100),
    drawdownPct: round1(Math.max(0, (1 - last / high) * 100)),
  };
}
