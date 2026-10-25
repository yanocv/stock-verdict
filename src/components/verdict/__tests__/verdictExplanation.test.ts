import { describe, it, expect } from 'vitest';

// ── Pure helper functions extracted for testing ────────────────────────────────
// These mirror the functions in VerdictExplanationPanel.tsx

function scoreColor(score: number): string {
  if (score >= 7) {return '#22c55e';}
  if (score >= 4) {return '#f59e0b';}
  return '#ef4444';
}

function scoreLabel(score: number): string {
  if (score >= 7) {return 'Strong';}
  if (score >= 5.5) {return 'Good';}
  if (score >= 4) {return 'Fair';}
  if (score >= 2.5) {return 'Weak';}
  return 'Poor';
}

function confidenceLabel(pct: number): string {
  if (pct >= 80) {return 'Very high confidence';}
  if (pct >= 65) {return 'High confidence';}
  if (pct >= 50) {return 'Moderate confidence';}
  if (pct >= 35) {return 'Low confidence';}
  return 'Very low confidence — treat as indicative';
}

function computeWeightedScore(scores: {
  financials: number;
  valuation: number;
  health: number;
  technical: number;
  macro: number;
}): number {
  return (
    scores.financials * 0.3 +
    scores.valuation * 0.2 +
    scores.health * 0.2 +
    scores.technical * 0.15 +
    scores.macro * 0.15
  );
}

// ── scoreColor ─────────────────────────────────────────────────────────────────
describe('scoreColor', () => {
  it('returns green for scores >= 7', () => {
    expect(scoreColor(7)).toBe('#22c55e');
    expect(scoreColor(10)).toBe('#22c55e');
    expect(scoreColor(7.5)).toBe('#22c55e');
  });

  it('returns amber for scores 4–6.9', () => {
    expect(scoreColor(4)).toBe('#f59e0b');
    expect(scoreColor(5)).toBe('#f59e0b');
    expect(scoreColor(6.9)).toBe('#f59e0b');
  });

  it('returns red for scores below 4', () => {
    expect(scoreColor(3.9)).toBe('#ef4444');
    expect(scoreColor(0)).toBe('#ef4444');
    expect(scoreColor(1)).toBe('#ef4444');
  });

  it('handles boundary at exactly 7', () => {
    expect(scoreColor(7)).toBe('#22c55e');
    expect(scoreColor(6.99)).toBe('#f59e0b');
  });

  it('handles boundary at exactly 4', () => {
    expect(scoreColor(4)).toBe('#f59e0b');
    expect(scoreColor(3.99)).toBe('#ef4444');
  });
});

// ── scoreLabel ─────────────────────────────────────────────────────────────────
describe('scoreLabel', () => {
  it('returns Strong for >= 7', () => {
    expect(scoreLabel(7)).toBe('Strong');
    expect(scoreLabel(9)).toBe('Strong');
    expect(scoreLabel(10)).toBe('Strong');
  });

  it('returns Good for 5.5–6.9', () => {
    expect(scoreLabel(5.5)).toBe('Good');
    expect(scoreLabel(6)).toBe('Good');
    expect(scoreLabel(6.9)).toBe('Good');
  });

  it('returns Fair for 4–5.4', () => {
    expect(scoreLabel(4)).toBe('Fair');
    expect(scoreLabel(5)).toBe('Fair');
    expect(scoreLabel(5.4)).toBe('Fair');
  });

  it('returns Weak for 2.5–3.9', () => {
    expect(scoreLabel(2.5)).toBe('Weak');
    expect(scoreLabel(3)).toBe('Weak');
    expect(scoreLabel(3.9)).toBe('Weak');
  });

  it('returns Poor for < 2.5', () => {
    expect(scoreLabel(2.4)).toBe('Poor');
    expect(scoreLabel(0)).toBe('Poor');
    expect(scoreLabel(1)).toBe('Poor');
  });
});

// ── confidenceLabel ────────────────────────────────────────────────────────────
describe('confidenceLabel', () => {
  it('returns Very high confidence for >= 80', () => {
    expect(confidenceLabel(80)).toBe('Very high confidence');
    expect(confidenceLabel(100)).toBe('Very high confidence');
    expect(confidenceLabel(95)).toBe('Very high confidence');
  });

  it('returns High confidence for 65–79', () => {
    expect(confidenceLabel(65)).toBe('High confidence');
    expect(confidenceLabel(70)).toBe('High confidence');
    expect(confidenceLabel(79)).toBe('High confidence');
  });

  it('returns Moderate confidence for 50–64', () => {
    expect(confidenceLabel(50)).toBe('Moderate confidence');
    expect(confidenceLabel(60)).toBe('Moderate confidence');
    expect(confidenceLabel(64)).toBe('Moderate confidence');
  });

  it('returns Low confidence for 35–49', () => {
    expect(confidenceLabel(35)).toBe('Low confidence');
    expect(confidenceLabel(40)).toBe('Low confidence');
    expect(confidenceLabel(49)).toBe('Low confidence');
  });

  it('returns Very low confidence for < 35', () => {
    expect(confidenceLabel(34)).toContain('Very low confidence');
    expect(confidenceLabel(0)).toContain('Very low confidence');
    expect(confidenceLabel(10)).toContain('Very low confidence');
  });
});

// ── Weighted score formula ─────────────────────────────────────────────────────
describe('computeWeightedScore', () => {
  it('computes perfect 10 when all dimensions are 10', () => {
    const result = computeWeightedScore({
      financials: 10,
      valuation: 10,
      health: 10,
      technical: 10,
      macro: 10,
    });
    expect(result).toBeCloseTo(10, 5);
  });

  it('computes 0 when all dimensions are 0', () => {
    const result = computeWeightedScore({
      financials: 0,
      valuation: 0,
      health: 0,
      technical: 0,
      macro: 0,
    });
    expect(result).toBeCloseTo(0, 5);
  });

  it('weights financials at 30%', () => {
    const result = computeWeightedScore({
      financials: 10,
      valuation: 0,
      health: 0,
      technical: 0,
      macro: 0,
    });
    expect(result).toBeCloseTo(3.0, 5);
  });

  it('weights valuation at 20%', () => {
    const result = computeWeightedScore({
      financials: 0,
      valuation: 10,
      health: 0,
      technical: 0,
      macro: 0,
    });
    expect(result).toBeCloseTo(2.0, 5);
  });

  it('weights health at 20%', () => {
    const result = computeWeightedScore({
      financials: 0,
      valuation: 0,
      health: 10,
      technical: 0,
      macro: 0,
    });
    expect(result).toBeCloseTo(2.0, 5);
  });

  it('weights technical at 15%', () => {
    const result = computeWeightedScore({
      financials: 0,
      valuation: 0,
      health: 0,
      technical: 10,
      macro: 0,
    });
    expect(result).toBeCloseTo(1.5, 5);
  });

  it('weights macro at 15%', () => {
    const result = computeWeightedScore({
      financials: 0,
      valuation: 0,
      health: 0,
      technical: 0,
      macro: 10,
    });
    expect(result).toBeCloseTo(1.5, 5);
  });

  it('all weights sum to 100%', () => {
    expect(0.3 + 0.2 + 0.2 + 0.15 + 0.15).toBeCloseTo(1.0, 10);
  });

  it('computes a realistic mid-range score', () => {
    // financials=6, valuation=5, health=7, technical=5, macro=4
    // 6*0.3 + 5*0.2 + 7*0.2 + 5*0.15 + 4*0.15
    // = 1.8 + 1.0 + 1.4 + 0.75 + 0.6 = 5.55
    const result = computeWeightedScore({
      financials: 6,
      valuation: 5,
      health: 7,
      technical: 5,
      macro: 4,
    });
    expect(result).toBeCloseTo(5.55, 5);
  });
});