import type { FinancialMetrics } from '@/types';
import type { GateResult, JapanFilterResult, JapanFilterOverall } from '@/types';

/**
 * TOPIX sector thresholds for the Japan 6-gate filter.
 * Based on TSE sector norms and docs_INVESTMENT_PHILOSOPHY.md.
 *
 * All values are adjusted for Japanese market expectations:
 * - ROE floor is lower (8% is genuinely above average for Japan)
 * - D/E ceiling is conservative for manufacturing
 * - Dividend yield floor is higher (Japanese investors expect income)
 * - Revenue growth floor is lower (mature domestic market)
 */
export interface TopixSectorThresholds {
  peCeiling: number;
  pegCeiling: number;
  deCeiling: number;
  roeFloor: number;
  dividendYieldFloor: number;      // % — 0 if buybacks accepted as substitute
  revenueGrowthFloor: number;      // % — minimum acceptable (can be negative for value plays)
}

const TOPIX_SECTOR_THRESHOLDS: Record<string, TopixSectorThresholds> = {
  Technology: {
    peCeiling: 35,
    pegCeiling: 2.0,
    deCeiling: 1.5,
    roeFloor: 8,
    dividendYieldFloor: 0,   // tech often returns via buybacks
    revenueGrowthFloor: 3,
  },
  'Financial Services': {
    peCeiling: 15,
    pegCeiling: 2.0,
    deCeiling: 8.0,   // banks are structurally leveraged
    roeFloor: 6,
    dividendYieldFloor: 2.0,
    revenueGrowthFloor: 0,
  },
  Banking: {
    peCeiling: 12,
    pegCeiling: 2.0,
    deCeiling: 10.0,  // Tier 1 capital ratio used instead; high D/E is structural
    roeFloor: 5,
    dividendYieldFloor: 2.5,
    revenueGrowthFloor: 0,
  },
  'Auto Manufacturing': {
    peCeiling: 15,
    pegCeiling: 1.8,
    deCeiling: 0.8,
    roeFloor: 8,
    dividendYieldFloor: 2.0,
    revenueGrowthFloor: 1,
  },
  'Consumer Goods': {
    peCeiling: 22,
    pegCeiling: 2.0,
    deCeiling: 0.8,
    roeFloor: 8,
    dividendYieldFloor: 1.5,
    revenueGrowthFloor: 1,
  },
  Retail: {
    peCeiling: 20,
    pegCeiling: 2.0,
    deCeiling: 1.0,
    roeFloor: 7,
    dividendYieldFloor: 1.5,
    revenueGrowthFloor: 1,
  },
  Industrials: {
    peCeiling: 18,
    pegCeiling: 1.8,
    deCeiling: 0.8,
    roeFloor: 8,
    dividendYieldFloor: 2.0,
    revenueGrowthFloor: 1,
  },
  Energy: {
    peCeiling: 16,
    pegCeiling: 2.0,
    deCeiling: 1.2,
    roeFloor: 7,
    dividendYieldFloor: 2.5,
    revenueGrowthFloor: -2,  // energy is cyclical; small decline ok
  },
  Healthcare: {
    peCeiling: 28,
    pegCeiling: 2.0,
    deCeiling: 0.8,
    roeFloor: 8,
    dividendYieldFloor: 1.0,
    revenueGrowthFloor: 2,
  },
  Telecom: {
    peCeiling: 16,
    pegCeiling: 2.0,
    deCeiling: 1.5,
    roeFloor: 7,
    dividendYieldFloor: 3.0,  // Japanese telecoms are dividend stocks
    revenueGrowthFloor: -1,
  },
};

const DEFAULT_TOPIX_THRESHOLDS: TopixSectorThresholds = {
  peCeiling: 20,
  pegCeiling: 2.0,
  deCeiling: 1.0,
  roeFloor: 8,
  dividendYieldFloor: 1.5,
  revenueGrowthFloor: 1,
};

export function getTopixThresholds(sector: string): TopixSectorThresholds {
  return TOPIX_SECTOR_THRESHOLDS[sector] ?? DEFAULT_TOPIX_THRESHOLDS;
}

/** Returns true if the ticker is a Japanese-listed stock (ends in .T or is a 4-digit number) */
export function isJapaneseTicker(ticker: string): boolean {
  return ticker.endsWith('.T') || /^\d{4}$/.test(ticker);
}

/**
 * Evaluates Gate 1: P/E ratio vs. sector ceiling.
 *
 * Hard fail: P/E > 2× sector ceiling (extreme overvaluation).
 * Soft fail: P/E above ceiling but below 2× ceiling (possibly re-rating in progress).
 */
function evaluateGate1PE(
  pe: number | null,
  thresholds: TopixSectorThresholds
): GateResult {
  const gate = 1;
  const name = 'P/E Valuation';

  if (pe === null) {
    return {
      gate, name, status: 'SOFT_FAIL',
      value: 'P/E: N/A',
      threshold: `< ${thresholds.peCeiling}`,
      reason: 'P/E ratio not available.',
      softFailNote: 'Cannot evaluate valuation without P/E data. Check manually.',
    };
  }

  if (pe > thresholds.peCeiling * 2) {
    return {
      gate, name, status: 'HARD_FAIL',
      value: `P/E: ${pe.toFixed(1)}`,
      threshold: `< ${thresholds.peCeiling}`,
      reason: `P/E of ${pe.toFixed(1)} is more than 2× the sector ceiling of ${thresholds.peCeiling}. Extreme overvaluation.`,
    };
  }

  if (pe > thresholds.peCeiling) {
    return {
      gate, name, status: 'SOFT_FAIL',
      value: `P/E: ${pe.toFixed(1)}`,
      threshold: `< ${thresholds.peCeiling}`,
      reason: `P/E of ${pe.toFixed(1)} exceeds the sector ceiling of ${thresholds.peCeiling}.`,
      softFailNote: 'Could indicate a re-rating in progress if earnings are accelerating. Verify earnings trend.',
    };
  }

  return {
    gate, name, status: 'PASS',
    value: `P/E: ${pe.toFixed(1)}`,
    threshold: `< ${thresholds.peCeiling}`,
    reason: `P/E of ${pe.toFixed(1)} is within the sector ceiling of ${thresholds.peCeiling}.`,
  };
}

/**
 * Evaluates Gate 2: PEG ratio vs. sector ceiling.
 *
 * Hard fail: PEG > 3.0 (no growth justification for the premium).
 * Soft fail: PEG above ceiling but below 3.0.
 */
function evaluateGate2PEG(
  peg: number | null,
  thresholds: TopixSectorThresholds
): GateResult {
  const gate = 2;
  const name = 'PEG Ratio (Growth-Adjusted Value)';

  if (peg === null) {
    return {
      gate, name, status: 'SOFT_FAIL',
      value: 'PEG: N/A',
      threshold: `< ${thresholds.pegCeiling}`,
      reason: 'PEG ratio not available (missing growth data).',
      softFailNote: 'Calculate manually using EPS growth estimate.',
    };
  }

  if (peg > 3.0) {
    return {
      gate, name, status: 'HARD_FAIL',
      value: `PEG: ${peg.toFixed(2)}`,
      threshold: `< ${thresholds.pegCeiling}`,
      reason: `PEG of ${peg.toFixed(2)} exceeds 3.0 — growth does not justify the valuation premium.`,
    };
  }

  if (peg > thresholds.pegCeiling) {
    return {
      gate, name, status: 'SOFT_FAIL',
      value: `PEG: ${peg.toFixed(2)}`,
      threshold: `< ${thresholds.pegCeiling}`,
      reason: `PEG of ${peg.toFixed(2)} is above the sector ceiling of ${thresholds.pegCeiling}.`,
      softFailNote: 'Could be justified if growth was just revised sharply upward. Check recent earnings revisions.',
    };
  }

  return {
    gate, name, status: 'PASS',
    value: `PEG: ${peg.toFixed(2)}`,
    threshold: `< ${thresholds.pegCeiling}`,
    reason: `PEG of ${peg.toFixed(2)} indicates growth is reasonably priced.`,
  };
}

/**
 * Evaluates Gate 3: Debt/Equity vs. sector ceiling.
 *
 * Special rule: net-cash companies (negative netDebt) automatically PASS.
 * Hard fail: D/E > 3× sector ceiling (distress territory).
 * Soft fail: D/E above ceiling but below 3× ceiling.
 */
function evaluateGate3DE(
  de: number | null,
  cash: number,
  totalDebt: number,
  thresholds: TopixSectorThresholds
): GateResult {
  const gate = 3;
  const name = 'Debt / Equity';

  // Net-cash auto-pass (per investment philosophy)
  const netDebt = totalDebt - cash;
  if (netDebt < 0) {
    return {
      gate, name, status: 'PASS',
      value: `Net cash: ¥${Math.abs(netDebt / 1e9).toFixed(1)}B`,
      threshold: `< ${thresholds.deCeiling} D/E`,
      reason: 'Company holds more cash than debt (net-cash position). Automatically passes D/E gate.',
    };
  }

  if (de === null) {
    return {
      gate, name, status: 'SOFT_FAIL',
      value: 'D/E: N/A',
      threshold: `< ${thresholds.deCeiling}`,
      reason: 'D/E ratio not available.',
      softFailNote: 'Check balance sheet manually.',
    };
  }

  if (de > thresholds.deCeiling * 3) {
    return {
      gate, name, status: 'HARD_FAIL',
      value: `D/E: ${de.toFixed(2)}`,
      threshold: `< ${thresholds.deCeiling}`,
      reason: `D/E of ${de.toFixed(2)} is more than 3× the sector ceiling — potential financial distress.`,
    };
  }

  if (de > thresholds.deCeiling) {
    return {
      gate, name, status: 'SOFT_FAIL',
      value: `D/E: ${de.toFixed(2)}`,
      threshold: `< ${thresholds.deCeiling}`,
      reason: `D/E of ${de.toFixed(2)} exceeds the sector ceiling of ${thresholds.deCeiling}.`,
      softFailNote: 'Investigate: is the company actively deleveraging? Is FCF strongly positive?',
    };
  }

  return {
    gate, name, status: 'PASS',
    value: `D/E: ${de.toFixed(2)}`,
    threshold: `< ${thresholds.deCeiling}`,
    reason: `D/E of ${de.toFixed(2)} is within the sector ceiling.`,
  };
}

/**
 * Evaluates Gate 4: ROE vs. sector floor.
 *
 * Hard fail: ROE < 3% (value destruction territory).
 * Soft fail: ROE above 3% but below sector floor.
 */
function evaluateGate4ROE(
  roe: number | null,
  thresholds: TopixSectorThresholds
): GateResult {
  const gate = 4;
  const name = 'Return on Equity (ROE)';

  if (roe === null) {
    return {
      gate, name, status: 'SOFT_FAIL',
      value: 'ROE: N/A',
      threshold: `> ${thresholds.roeFloor}%`,
      reason: 'ROE not available.',
      softFailNote: 'Calculate manually from net income and shareholder equity.',
    };
  }

  if (roe < 3) {
    return {
      gate, name, status: 'HARD_FAIL',
      value: `ROE: ${roe.toFixed(1)}%`,
      threshold: `> ${thresholds.roeFloor}%`,
      reason: `ROE of ${roe.toFixed(1)}% is below 3% — company may be destroying shareholder value.`,
    };
  }

  if (roe < thresholds.roeFloor) {
    return {
      gate, name, status: 'SOFT_FAIL',
      value: `ROE: ${roe.toFixed(1)}%`,
      threshold: `> ${thresholds.roeFloor}%`,
      reason: `ROE of ${roe.toFixed(1)}% is below the sector floor of ${thresholds.roeFloor}%.`,
      softFailNote: 'Could be a one-time restructuring charge depressing ROE. Check multi-year trend.',
    };
  }

  return {
    gate, name, status: 'PASS',
    value: `ROE: ${roe.toFixed(1)}%`,
    threshold: `> ${thresholds.roeFloor}%`,
    reason: `ROE of ${roe.toFixed(1)}% meets the sector floor of ${thresholds.roeFloor}%.`,
  };
}

/**
 * Evaluates Gate 5: Dividend yield vs. sector floor.
 *
 * Soft fail if yield is zero but FCF is positive (buyback substitute may be present).
 * Hard fail: no dividend AND negative FCF AND no growth.
 */
function evaluateGate5Dividend(
  dividendYield: number | null,
  fcf: number | null,
  revenueGrowth: number | null,
  thresholds: TopixSectorThresholds
): GateResult {
  const gate = 5;
  const name = 'Dividend / Shareholder Return';

  if (thresholds.dividendYieldFloor === 0) {
    // Sector doesn't require dividends (e.g. tech)
    return {
      gate, name, status: 'PASS',
      value: dividendYield !== null ? `Yield: ${dividendYield.toFixed(2)}%` : 'Yield: N/A',
      threshold: 'No floor (sector returns via buybacks)',
      reason: 'Sector does not require a dividend minimum. Growth/buybacks are acceptable substitutes.',
    };
  }

  const yield_ = dividendYield ?? 0;

  if (yield_ <= 0) {
    // No dividend — hard fail only if also no FCF and no growth
    const hasFCF = fcf !== null && fcf > 0;
    const hasGrowth = revenueGrowth !== null && revenueGrowth > 5;

    if (!hasFCF && !hasGrowth) {
      return {
        gate, name, status: 'HARD_FAIL',
        value: 'Yield: 0%',
        threshold: `> ${thresholds.dividendYieldFloor}%`,
        reason: `No dividend, no positive FCF, and no meaningful revenue growth. No shareholder return mechanism.`,
      };
    }

    return {
      gate, name, status: 'SOFT_FAIL',
      value: 'Yield: 0%',
      threshold: `> ${thresholds.dividendYieldFloor}%`,
      reason: `No dividend paid, but ${hasFCF ? 'positive FCF' : ''}${hasFCF && hasGrowth ? ' and ' : ''}${hasGrowth ? 'strong revenue growth' : ''} present.`,
      softFailNote: 'Check if company is running share buyback program. TSE governance reform is pushing buybacks.',
    };
  }

  if (yield_ < thresholds.dividendYieldFloor) {
    return {
      gate, name, status: 'SOFT_FAIL',
      value: `Yield: ${yield_.toFixed(2)}%`,
      threshold: `> ${thresholds.dividendYieldFloor}%`,
      reason: `Dividend yield of ${yield_.toFixed(2)}% is below the sector floor of ${thresholds.dividendYieldFloor}%.`,
      softFailNote: 'Dividend may be growing — check payout trend over 3+ years.',
    };
  }

  return {
    gate, name, status: 'PASS',
    value: `Yield: ${yield_.toFixed(2)}%`,
    threshold: `> ${thresholds.dividendYieldFloor}%`,
    reason: `Dividend yield of ${yield_.toFixed(2)}% meets the sector floor of ${thresholds.dividendYieldFloor}%.`,
  };
}

/**
 * Evaluates Gate 6: Revenue growth vs. sector floor.
 *
 * Hard fail: declining for consecutive years — but we only have single-period data here,
 * so hard fail is revenue growth < -5% (severe contraction).
 * Soft fail: below floor but above -5%.
 */
function evaluateGate6RevenueGrowth(
  revenueGrowth: number | null,
  thresholds: TopixSectorThresholds
): GateResult {
  const gate = 6;
  const name = 'Revenue Growth';

  if (revenueGrowth === null) {
    return {
      gate, name, status: 'SOFT_FAIL',
      value: 'Growth: N/A',
      threshold: `> ${thresholds.revenueGrowthFloor}%`,
      reason: 'Revenue growth data not available.',
      softFailNote: 'Calculate manually from multi-year revenue data.',
    };
  }

  if (revenueGrowth < -5) {
    return {
      gate, name, status: 'HARD_FAIL',
      value: `Growth: ${revenueGrowth.toFixed(1)}%`,
      threshold: `> ${thresholds.revenueGrowthFloor}%`,
      reason: `Revenue declining at ${Math.abs(revenueGrowth).toFixed(1)}% — severe contraction.`,
    };
  }

  if (revenueGrowth < thresholds.revenueGrowthFloor) {
    return {
      gate, name, status: 'SOFT_FAIL',
      value: `Growth: ${revenueGrowth.toFixed(1)}%`,
      threshold: `> ${thresholds.revenueGrowthFloor}%`,
      reason: `Revenue growth of ${revenueGrowth.toFixed(1)}% is below the sector floor of ${thresholds.revenueGrowthFloor}%.`,
      softFailNote: 'Could be a temporary cycle trough. Check if structural catalyst exists (defense, EV transition, etc.).',
    };
  }

  return {
    gate, name, status: 'PASS',
    value: `Growth: ${revenueGrowth.toFixed(1)}%`,
    threshold: `> ${thresholds.revenueGrowthFloor}%`,
    reason: `Revenue growing at ${revenueGrowth.toFixed(1)}%, meeting the sector floor.`,
  };
}

/**
 * Runs the full Japan 6-gate TOPIX sequential filter.
 *
 * For non-Japanese stocks, returns NOT_APPLICABLE immediately.
 */
export function runJapanFilter(
  ticker: string,
  financials: FinancialMetrics,
  balanceSheet: { cash: number; totalDebt: number },
  sector: string
): JapanFilterResult {
  if (!isJapaneseTicker(ticker)) {
    return {
      isJapanese: false,
      overall: 'NOT_APPLICABLE',
      gates: [],
      passingGates: 0,
      softFails: 0,
      hardFails: 0,
      topixSector: null,
      summary: 'Japan 6-gate filter not applicable to non-Japanese stocks.',
    };
  }

  const thresholds = getTopixThresholds(sector);
  const gates: GateResult[] = [
    evaluateGate1PE(financials.peRatio, thresholds),
    evaluateGate2PEG(financials.pegRatio, thresholds),
    evaluateGate3DE(financials.debtToEquity, balanceSheet.cash, balanceSheet.totalDebt, thresholds),
    evaluateGate4ROE(financials.roe, thresholds),
    evaluateGate5Dividend(financials.dividendYield, financials.freeCashFlow, financials.revenueGrowth, thresholds),
    evaluateGate6RevenueGrowth(financials.revenueGrowth, thresholds),
  ];

  const passingGates = gates.filter((g) => g.status === 'PASS').length;
  const softFails = gates.filter((g) => g.status === 'SOFT_FAIL').length;
  const hardFails = gates.filter((g) => g.status === 'HARD_FAIL').length;

  let overall: JapanFilterOverall;
  let summary: string;

  if (hardFails > 0) {
    overall = 'REJECT';
    const failedGates = gates.filter((g) => g.status === 'HARD_FAIL').map((g) => g.name).join(', ');
    summary = `REJECT — ${hardFails} hard failure(s): ${failedGates}. These are non-negotiable disqualifiers.`;
  } else if (softFails > 0) {
    overall = 'INVESTIGATE';
    const softGates = gates.filter((g) => g.status === 'SOFT_FAIL').map((g) => g.name).join(', ');
    summary = `INVESTIGATE — Passes ${passingGates}/6 gates with ${softFails} soft failure(s): ${softGates}. Check soft-fail notes before deciding.`;
  } else {
    overall = 'ALL_PASS';
    summary = `ALL_PASS — Passes all 6 TOPIX gates for the ${sector || 'sector'}.`;
  }

  return {
    isJapanese: true,
    overall,
    gates,
    passingGates,
    softFails,
    hardFails,
    topixSector: sector || null,
    summary,
  };
}