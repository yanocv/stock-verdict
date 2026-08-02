import { describe, it, expect } from 'vitest';
import { classifyLynchCategory } from './lynchCategory';

describe('classifyLynchCategory', () => {
  it('returns slow-grower for low EPS growth in a non-cyclical sector', () => {
    const result = classifyLynchCategory({
      epsGrowthRate: 2,
      sector: 'Consumer Staples',
      recentLoss: false,
      improvingEarnings: false,
    });
    expect(result).toBe('slow-grower');
  });

  it('returns stalwart for 5–12% EPS growth', () => {
    const result = classifyLynchCategory({
      epsGrowthRate: 8,
      sector: 'Healthcare',
      recentLoss: false,
      improvingEarnings: true,
    });
    expect(result).toBe('stalwart');
  });

  it('returns fast-grower for EPS growth >= 12%', () => {
    const result = classifyLynchCategory({
      epsGrowthRate: 25,
      sector: 'Technology',
      recentLoss: false,
      improvingEarnings: true,
    });
    expect(result).toBe('fast-grower');
  });

  it('returns fast-grower at exactly 12% growth', () => {
    const result = classifyLynchCategory({
      epsGrowthRate: 12,
      sector: 'Retail',
      recentLoss: false,
      improvingEarnings: true,
    });
    expect(result).toBe('fast-grower');
  });

  it('returns cyclical for an Energy sector stock', () => {
    const result = classifyLynchCategory({
      epsGrowthRate: 8,
      sector: 'Energy',
      recentLoss: false,
      improvingEarnings: true,
    });
    expect(result).toBe('cyclical');
  });

  it('returns cyclical for an Auto Manufacturing sector stock', () => {
    const result = classifyLynchCategory({
      epsGrowthRate: 10,
      sector: 'Auto Manufacturing',
      recentLoss: false,
      improvingEarnings: true,
    });
    expect(result).toBe('cyclical');
  });

  it('returns cyclical for a Semiconductors sector stock', () => {
    const result = classifyLynchCategory({
      epsGrowthRate: 20,
      sector: 'Semiconductors',
      recentLoss: false,
      improvingEarnings: false,
    });
    expect(result).toBe('cyclical');
  });

  it('returns turnaround when company had a recent loss but earnings are improving', () => {
    const result = classifyLynchCategory({
      epsGrowthRate: 5,
      sector: 'Retail',
      recentLoss: true,
      improvingEarnings: true,
    });
    expect(result).toBe('turnaround');
  });

  it('does NOT return turnaround when recent loss but earnings are not improving', () => {
    const result = classifyLynchCategory({
      epsGrowthRate: -10,
      sector: 'Retail',
      recentLoss: true,
      improvingEarnings: false,
    });
    expect(result).not.toBe('turnaround');
  });

  it('turnaround takes priority over cyclical sector classification', () => {
    const result = classifyLynchCategory({
      epsGrowthRate: 3,
      sector: 'Energy',
      recentLoss: true,
      improvingEarnings: true,
    });
    expect(result).toBe('turnaround');
  });
});
