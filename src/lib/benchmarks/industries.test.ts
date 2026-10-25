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

describe('getBenchmarksForSector with Yahoo names', () => {
  it('maps Yahoo industries before the broad sector', () => {
    expect(getBenchmarksForSector('Consumer Cyclical', 'Auto Manufacturers')).toBe(INDUSTRY_BENCHMARKS['Auto Manufacturing']);
    expect(getBenchmarksForSector('Communication Services', 'Telecom Services')).toBe(INDUSTRY_BENCHMARKS.Telecom);
    expect(getBenchmarksForSector('Healthcare', 'Drug Manufacturers - General')).toBe(INDUSTRY_BENCHMARKS['Pharma/Biotech']);
  });

  it('maps Yahoo sectors whose names differ', () => {
    expect(getBenchmarksForSector('Consumer Defensive', 'Packaged Foods')).toBe(INDUSTRY_BENCHMARKS['Consumer Goods']);
  });

  it('keeps exact sector matches and falls back to the default', () => {
    expect(getBenchmarksForSector('Technology', 'Electronic Components')).toBe(INDUSTRY_BENCHMARKS.Technology);
    expect(getBenchmarksForSector('Industrials', 'Specialty Industrial Machinery')).toBe(INDUSTRY_BENCHMARKS.Industrials);
    expect(getBenchmarksForSector('Utilities', 'Utilities - Regulated Electric')).toBe(DEFAULT_BENCHMARKS);
  });
});
