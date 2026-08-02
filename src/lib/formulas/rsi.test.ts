import { describe, it, expect } from 'vitest';
import { calculateRSI, classifyRSI, calculateSMA, extractCloses } from './rsi';
import type { ChartDataPoint } from '@/types';

describe('calculateRSI', () => {
  it('returns null when insufficient data (< period + 1)', () => {
    expect(calculateRSI([100, 101, 102], 14)).toBeNull();
    expect(calculateRSI([], 14)).toBeNull();
  });

  it('returns null with exactly period elements (need period + 1)', () => {
    const closes = Array.from({ length: 14 }, (_, i) => 100 + i);
    expect(calculateRSI(closes, 14)).toBeNull();
  });

  it('returns 100 when all moves are gains (no losses)', () => {
    // 20 prices all increasing
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
    expect(calculateRSI(closes, 14)).toBe(100);
  });

  it('returns 0 when all moves are losses (no gains)', () => {
    // 20 prices all decreasing
    const closes = Array.from({ length: 20 }, (_, i) => 200 - i);
    const rsi = calculateRSI(closes, 14);
    // avgGain = 0, so RS = 0, RSI = 0
    expect(rsi).toBe(0);
  });

  it('returns value between 0 and 100 for mixed data', () => {
    const closes = [
      44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.15,
      43.61, 42.67, 43.13, 43.13, 43.22, 43.53, 43.28, 41.46,
      41.99, 42.61, 42.07, 42.27
    ];
    const rsi = calculateRSI(closes, 14);
    expect(rsi).not.toBeNull();
    expect(rsi!).toBeGreaterThan(0);
    expect(rsi!).toBeLessThan(100);
  });

  it('returns a value in a known range for a rising-then-falling series', () => {
    // Rise for 10 days, fall for 10 days — should give RSI near 50
    const rises = Array.from({ length: 10 }, (_, i) => 100 + i);
    const falls = Array.from({ length: 10 }, (_, i) => 110 - i);
    const closes = [...rises, ...falls];
    const rsi = calculateRSI(closes, 14);
    expect(rsi).not.toBeNull();
    expect(rsi!).toBeGreaterThan(0);
    expect(rsi!).toBeLessThan(100);
  });

  it('accepts custom period (e.g. period=5)', () => {
    const closes = [10, 11, 12, 11, 10, 11, 12];
    const rsi = calculateRSI(closes, 5);
    expect(rsi).not.toBeNull();
    expect(rsi!).toBeGreaterThanOrEqual(0);
    expect(rsi!).toBeLessThanOrEqual(100);
  });
});

describe('classifyRSI', () => {
  it('classifies >= 70 as overbought', () => {
    expect(classifyRSI(70)).toBe('overbought');
    expect(classifyRSI(85)).toBe('overbought');
    expect(classifyRSI(100)).toBe('overbought');
  });

  it('classifies <= 30 as oversold', () => {
    expect(classifyRSI(30)).toBe('oversold');
    expect(classifyRSI(15)).toBe('oversold');
    expect(classifyRSI(0)).toBe('oversold');
  });

  it('classifies between 31 and 69 as neutral', () => {
    expect(classifyRSI(50)).toBe('neutral');
    expect(classifyRSI(31)).toBe('neutral');
    expect(classifyRSI(69)).toBe('neutral');
  });
});

describe('calculateSMA', () => {
  it('returns null when fewer values than period', () => {
    expect(calculateSMA([1, 2, 3], 5)).toBeNull();
    expect(calculateSMA([], 50)).toBeNull();
  });

  it('returns average of last N values', () => {
    expect(calculateSMA([1, 2, 3, 4, 5], 3)).toBeCloseTo(4); // avg of [3,4,5]
    expect(calculateSMA([10, 20, 30], 3)).toBeCloseTo(20);
  });

  it('returns exact value when period equals array length', () => {
    expect(calculateSMA([2, 4, 6], 3)).toBeCloseTo(4);
  });
});

describe('extractCloses', () => {
  it('returns closes sorted by date, oldest first', () => {
    const points: ChartDataPoint[] = [
      { date: '2024-01-03', open: 1, high: 1, low: 1, close: 3, volume: 1 },
      { date: '2024-01-01', open: 1, high: 1, low: 1, close: 1, volume: 1 },
      { date: '2024-01-02', open: 1, high: 1, low: 1, close: 2, volume: 1 },
    ];
    expect(extractCloses(points)).toEqual([1, 2, 3]);
  });

  it('returns empty array for empty input', () => {
    expect(extractCloses([])).toEqual([]);
  });
});