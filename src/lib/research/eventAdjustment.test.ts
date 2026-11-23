import { describe, it, expect } from 'vitest';
import type { FairValueEstimate } from '@/lib/formulas/fairValue';
import type { ResearchEvent } from './types';
import { applyEvents, isApplicable } from './eventAdjustment';

const estimate: FairValueEstimate = {
  value: 5000, method: 'dcf-earnings', modelValue: 5000, multiplesValue: 4000, adjustment: null,
  bear: 4000, bull: 6000, unavailableReason: null,
};
const event = (over: Partial<ResearchEvent> = {}): ResearchEvent => ({
  type: 'patent_expiry', title: 'Main drug patent expiry', expectedYear: 2028, direction: 'negative',
  earningsImpactPct: -30, confidence: 'high', inAnalystEstimates: false,
  sourceUrl: 'https://example.com/a', sourceTitle: 'Report', ...over,
});

describe('applyEvents', () => {
  it('lowers the value by the discounted permanent earnings drop', () => {
    // −30% from 2028, two years after 2026, at 8%: value −30% × 1.08^−2 ≈ −25.7%
    const r = applyEvents(estimate, [event()], 0.08, 2026);
    expect(r.factor).toBeCloseTo(1 - 0.3 / 1.08 ** 2, 6);
    expect(r.estimate.value).toBeCloseTo(5000 * r.factor, 6);
    expect(r.severe).toBe(true); // −30% ≤ −20%
  });

  it('puts the full shock into the bear value, keeping bear ≤ value ≤ bull', () => {
    const r = applyEvents(estimate, [event()], 0.08, 2026);
    expect(r.estimate.bear).toBeCloseTo(Math.min(4000 * 0.7, r.estimate.value!), 6);
    expect(r.estimate.bull!).toBeGreaterThanOrEqual(r.estimate.value!);
  });

  it('never raises the value for positive events', () => {
    const r = applyEvents(estimate, [event({ direction: 'positive', earningsImpactPct: 40 })], 0.08, 2026);
    expect(r.estimate.value).toBe(5000);
    expect(r.applied).toHaveLength(0);
  });

  it('skips events already in analyst estimates, low-confidence, unsized or beyond 5 years', () => {
    expect(isApplicable(event({ inAnalystEstimates: true }), 2026)).toBe(false);
    expect(isApplicable(event({ confidence: 'low' }), 2026)).toBe(false);
    expect(isApplicable(event({ earningsImpactPct: null }), 2026)).toBe(false);
    expect(isApplicable(event({ expectedYear: 2035 }), 2026)).toBe(false);
  });

  it('leaves a missing fair value alone', () => {
    const r = applyEvents({ ...estimate, value: null }, [event()], 0.08, 2026);
    expect(r.estimate.value).toBeNull();
    expect(r.factor).toBe(1);
  });
});
