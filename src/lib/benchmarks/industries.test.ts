import { describe, it, expect } from 'vitest';
import { getBenchmarksForSector, INDUSTRY_BENCHMARKS, DEFAULT_BENCHMARKS } from './industries';

describe('getBenchmarksForSector', () => {
  it('returns Technology benchmarks for the Technology sector', () => {
    const result = getBenchmarksForSector('Technology');
    expect(result).toBe(INDUSTRY_BENCHMARKS['Technology']);
    expect(result.pe.cheap).toBe(15);
  });

  it('returns Energy benchmarks for the Energy sector', () => {
    const result = getBenchmarksForSector('Energy');
    expect(result).toBe(INDUSTRY_BENCHMARKS['Energy']);
  });

  it('falls back to DEFAULT_BENCHMARKS for an unknown sector', () => {
    const result = getBenchmarksForSector('Unknown Sector XYZ');
    expect(result).toBe(DEFAULT_BENCHMARKS);
  });

  it('falls back to DEFAULT_BENCHMARKS for an empty string sector', () => {
    const result = getBenchmarksForSector('');
    expect(result).toBe(DEFAULT_BENCHMARKS);
  });

  it('returned benchmarks have the required shape', () => {
    const result = getBenchmarksForSector('Retail');
    expect(result).toHaveProperty('pe.cheap');
    expect(result).toHaveProperty('pe.fair');
    expect(result).toHaveProperty('pe.expensive');
    expect(result).toHaveProperty('ps.cheap');
    expect(result).toHaveProperty('roe.good');
    expect(result).toHaveProperty('debtToEquity.high');
    expect(result).toHaveProperty('operatingMargin.good');
  });
});
