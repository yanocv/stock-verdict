import type { FairValueEstimate } from '@/lib/formulas/fairValue';
import type { ResearchEvent } from './types';

/** Rules for turning researched events into numbers (CALCULATIONS §9.3). */
export const EVENT_RULES = {
  /** Events further away than this many years are listed but not applied */
  horizonYears: 5,
  /** Total earnings shock is limited to −80% */
  maxShockPct: -80,
  /** A shock at or beyond this counts as severe: the fair value is uncertain */
  severeShockPct: -20,
} as const;

export interface AppliedEvent {
  event: ResearchEvent;
  /** Share of fair value removed by this event (0.12 = −12%) */
  valueReduction: number;
}

export interface EventAdjustment {
  estimate: FairValueEstimate;
  applied: AppliedEvent[];
  /** Factor the base value was multiplied by (1 = unchanged) */
  factor: number;
  /** Sum of applied earnings impacts, percent (negative), capped */
  shockPct: number;
  severe: boolean;
}

/** Events eligible to lower the value: negative, sourced, sized, likely, near enough, not already in estimates. */
export function isApplicable(e: ResearchEvent, currentYear: number): boolean {
  return (
    e.direction === 'negative' &&
    e.earningsImpactPct !== null &&
    e.earningsImpactPct < 0 &&
    e.confidence !== 'low' &&
    e.inAnalystEstimates !== true &&
    (e.expectedYear === null || e.expectedYear <= currentYear + EVENT_RULES.horizonYears)
  );
}

/**
 * Lowers the fair value for known negative events. Each event is treated as a
 * permanent earnings drop starting in its expected year: the share of value
 * lost ≈ impact × (1 + discount rate)^−(years away), i.e. the drop only hits
 * cash flows from that year on. The bear value takes the whole (capped) shock
 * at once. Positive events never raise the value — they are only listed.
 */
export function applyEvents(
  estimate: FairValueEstimate,
  events: ResearchEvent[],
  discountRate: number,
  currentYear: number
): EventAdjustment {
  const applied: AppliedEvent[] = [];
  let factor = 1;
  let shock = 0;
  for (const e of events) {
    if (!isApplicable(e, currentYear)) {continue;}
    const impact = Math.max(-0.9, e.earningsImpactPct! / 100);
    const yearsAway = Math.max(0, (e.expectedYear ?? currentYear) - currentYear);
    const valueReduction = -impact * Math.pow(1 + discountRate, -yearsAway);
    factor *= 1 - valueReduction;
    shock += e.earningsImpactPct!;
    applied.push({ event: e, valueReduction });
  }
  const shockPct = Math.max(EVENT_RULES.maxShockPct, shock);
  if (applied.length === 0 || estimate.value === null) {
    return { estimate, applied: [], factor: 1, shockPct: 0, severe: false };
  }
  factor = Math.max(0.2, factor);

  const value = estimate.value * factor;
  const bearShock = 1 + shockPct / 100;
  const bear = estimate.bear !== null ? Math.min(estimate.bear * bearShock, value) : value * bearShock;
  const bull = estimate.bull !== null ? Math.max(estimate.bull * factor, value) : null;
  return {
    estimate: { ...estimate, value, bear, bull },
    applied,
    factor,
    shockPct,
    severe: shockPct <= EVENT_RULES.severeShockPct,
  };
}

/** Reasons shown with the verdict: applied events lower the value; likely positive ones are listed only. */
export function eventReasons(adjustment: EventAdjustment, events: ResearchEvent[]): { bullish: string[]; bearish: string[] } {
  const year = (e: ResearchEvent) => (e.expectedYear !== null ? String(e.expectedYear) : 'date unknown');
  const source = (e: ResearchEvent) => (e.sourceTitle ? ` (source: ${e.sourceTitle})` : '');
  const bearish = adjustment.applied.map(
    ({ event: e, valueReduction }) =>
      `Known event: ${e.title} (${year(e)}), about ${e.earningsImpactPct}% of earnings — fair value lowered ${Math.round(valueReduction * 100)}%${source(e)}`
  );
  const bullish = events
    .filter((e) => e.direction === 'positive' && e.confidence !== 'low')
    .map((e) => `Possible upside: ${e.title} (${year(e)}) — not counted in the fair value${source(e)}`);
  return { bullish, bearish };
}
