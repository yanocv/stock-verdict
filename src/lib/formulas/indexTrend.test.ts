import { describe, it, expect } from 'vitest';
import { computeIndexTrend } from './indexTrend';

describe('computeIndexTrend', () => {
  it('returns null with fewer than 200 closes', () => {
    expect(computeIndexTrend(Array.from({ length: 199 }, () => 100))).toBeNull();
  });

  it('flat index: at its average and at its high', () => {
    expect(computeIndexTrend(Array.from({ length: 250 }, () => 100))).toEqual({
      vsSma200Pct: 0,
      drawdownPct: 0,
    });
  });

  it('measures the drop from the 52-week high and the gap to the 200-day average', () => {
    // 200 days at 100, a peak at 120, then down to 90
    const closes = [...Array.from({ length: 200 }, () => 100), 120, 90];
    const trend = computeIndexTrend(closes)!;
    expect(trend.drawdownPct).toBe(25); // 90 is 25% below 120
    expect(trend.vsSma200Pct).toBeLessThan(0);
  });

  it('ignores highs older than one year', () => {
    const closes = [200, ...Array.from({ length: 260 }, () => 100)];
    expect(computeIndexTrend(closes)!.drawdownPct).toBe(0);
  });
});
