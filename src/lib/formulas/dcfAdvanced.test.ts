import { describe, it, expect } from 'vitest';
import type { BalanceSheet, FinancialMetrics, StockOverview } from '@/types';
import { DEFAULT_ENGINE_PARAMS } from '@/lib/scoring/params';
import {
  runAdvancedDCFForStock,
  riskFreeRateFor,
  selectCashFlowBase,
  cashConversion,
  currentEps,
  getCurrencyMismatch,
  projectCashFlows,
  cagr,
  estimateGrowthRate,
  DEFAULT_GROWTH_RATE,
  calculateWACC,
  dcfWithWACC,
  buildSensitivityTable,
  runAdvancedDCF,
  DEFAULT_EQUITY_RISK_PREMIUM,
  DEFAULT_RISK_FREE_RATE,
  DEFAULT_TERMINAL_GROWTH_RATE,
} from './dcfAdvanced';

describe('calculateWACC', () => {
  it('returns riskFreeRate + beta × ERP for normal inputs', () => {
    // 4.5% + 1.0 × 5.5% = 10%
    expect(calculateWACC(0.045, 1.0, 0.055)).toBeCloseTo(0.10);
  });

  it('clamps minimum WACC to 5%', () => {
    // Very low beta + low risk-free rate should not go below 5%
    expect(calculateWACC(0.01, 0.1, 0.02)).toBeCloseTo(0.05);
  });

  it('clamps maximum WACC to 25%', () => {
    // Extreme beta should not produce WACC above 25%
    expect(calculateWACC(0.05, 10, 0.055)).toBeCloseTo(0.25);
  });

  it('handles high-growth tech (beta 1.5)', () => {
    const wacc = calculateWACC(0.045, 1.5, 0.055);
    expect(wacc).toBeCloseTo(0.045 + 1.5 * 0.055);
  });
});

describe('dcfWithWACC', () => {
  it('returns null for zero or negative FCF', () => {
    expect(dcfWithWACC(0, 0.08, 0.10, 0.03, 1000000, 0, 10)).toBeNull();
    expect(dcfWithWACC(-1000, 0.08, 0.10, 0.03, 1000000, 0, 10)).toBeNull();
  });

  it('returns null when sharesOutstanding <= 0', () => {
    expect(dcfWithWACC(1000000, 0.08, 0.10, 0.03, 0, 0, 10)).toBeNull();
  });

  it('returns null when WACC <= terminalGrowthRate', () => {
    expect(dcfWithWACC(1000000, 0.08, 0.03, 0.03, 1000000, 0, 10)).toBeNull();
    expect(dcfWithWACC(1000000, 0.08, 0.02, 0.03, 1000000, 0, 10)).toBeNull();
  });

  it('returns a positive value for valid inputs', () => {
    const fv = dcfWithWACC(1_000_000_000, 0.08, 0.10, 0.03, 1_000_000_000, 0, 10);
    expect(fv).not.toBeNull();
    expect(fv!).toBeGreaterThan(0);
  });

  it('higher WACC produces lower fair value', () => {
    const fcf = 1_000_000_000;
    const shares = 500_000_000;
    const fvLowWACC = dcfWithWACC(fcf, 0.08, 0.08, 0.03, shares, 0, 10);
    const fvHighWACC = dcfWithWACC(fcf, 0.08, 0.15, 0.03, shares, 0, 10);
    expect(fvLowWACC).not.toBeNull();
    expect(fvHighWACC).not.toBeNull();
    expect(fvLowWACC!).toBeGreaterThan(fvHighWACC!);
  });

  it('higher growth rate produces higher fair value', () => {
    const fcf = 1_000_000_000;
    const shares = 500_000_000;
    const fvLowGrowth = dcfWithWACC(fcf, 0.03, 0.10, 0.03, shares, 0, 10);
    const fvHighGrowth = dcfWithWACC(fcf, 0.15, 0.10, 0.03, shares, 0, 10);
    expect(fvLowGrowth).not.toBeNull();
    expect(fvHighGrowth).not.toBeNull();
    expect(fvHighGrowth!).toBeGreaterThan(fvLowGrowth!);
  });

  it('net-cash company (negative netDebt) produces higher equity value', () => {
    const fcf = 1_000_000_000;
    const shares = 500_000_000;
    const fvNoDebt = dcfWithWACC(fcf, 0.08, 0.10, 0.03, shares, 0, 10);
    const fvNetCash = dcfWithWACC(fcf, 0.08, 0.10, 0.03, shares, -500_000_000, 10);
    expect(fvNoDebt).not.toBeNull();
    expect(fvNetCash).not.toBeNull();
    expect(fvNetCash!).toBeGreaterThan(fvNoDebt!);
  });
});

describe('buildSensitivityTable', () => {
  it('returns a 5×5 table', () => {
    const table = buildSensitivityTable(0.10, 0.08, 1_000_000_000, 0.03, 500_000_000, 0, 10);
    expect(table).toHaveLength(5);
    table.forEach((row) => expect(row).toHaveLength(5));
  });

  it('base case cell (center [2][2]) matches dcfWithWACC base case', () => {
    const baseWACC = 0.10;
    const baseGrowth = 0.08;
    const fcf = 1_000_000_000;
    const shares = 500_000_000;
    const table = buildSensitivityTable(baseWACC, baseGrowth, fcf, 0.03, shares, 0, 10);
    const centerCell = table[2]?.[2];
    const directValue = dcfWithWACC(fcf, baseGrowth, baseWACC, 0.03, shares, 0, 10);
    expect(centerCell?.fairValue).toBeCloseTo(directValue ?? 0, 1);
  });

  it('all cells have wacc and growthRate fields', () => {
    const table = buildSensitivityTable(0.10, 0.08, 1_000_000_000, 0.03, 500_000_000, 0, 10);
    table.forEach((row) => {
      row.forEach((cell) => {
        expect(typeof cell.wacc).toBe('number');
        expect(typeof cell.growthRate).toBe('number');
        expect(typeof cell.fairValue).toBe('number');
      });
    });
  });

  it('lower WACC rows have higher fair values than higher WACC rows (for same column)', () => {
    const table = buildSensitivityTable(0.10, 0.08, 1_000_000_000, 0.03, 500_000_000, 0, 10);
    // Row 0 = lowest WACC, Row 4 = highest WACC → row 0 should have higher values
    const col = 2;
    expect(table[0]?.[col]?.fairValue ?? 0).toBeGreaterThan(table[4]?.[col]?.fairValue ?? 0);
  });
});

describe('runAdvancedDCF', () => {
  const baseParams = {
    freeCashFlow: 90_000_000_000, // Apple-like FCF
    sharesOutstanding: 15_000_000_000,
    netDebt: -50_000_000_000, // net cash
    beta: 1.2,
    growthRate: 0.08,
    riskFreeRate: 0.045,
    currentPrice: 185,
  };

  it('returns a DCFAnalysis object with all required fields', () => {
    const result = runAdvancedDCF(baseParams);
    expect(result.baseCase).not.toBeNull();
    expect(result.wacc).not.toBeNull();
    expect(result.riskFreeRate).toBe(0.045);
    expect(result.betaUsed).toBeCloseTo(1.2);
    expect(result.sensitivityTable).toHaveLength(5);
    expect(result.sensitivityTable[0]).toHaveLength(5);
  });

  it('uses DEFAULT_RISK_FREE_RATE when riskFreeRate is null', () => {
    const result = runAdvancedDCF({ ...baseParams, riskFreeRate: null });
    expect(result.riskFreeRate).toBe(DEFAULT_RISK_FREE_RATE);
  });

  it('uses DEFAULT_EQUITY_RISK_PREMIUM when not provided', () => {
    const result = runAdvancedDCF(baseParams);
    expect(result.equityRiskPremium).toBe(DEFAULT_EQUITY_RISK_PREMIUM);
  });

  it('uses DEFAULT_TERMINAL_GROWTH_RATE when not provided', () => {
    const result = runAdvancedDCF(baseParams);
    expect(result.terminalGrowthRate).toBe(DEFAULT_TERMINAL_GROWTH_RATE);
  });

  it('returns null baseCase for negative FCF', () => {
    const result = runAdvancedDCF({ ...baseParams, freeCashFlow: -1_000_000 });
    expect(result.baseCase).toBeNull();
  });

  it('calculates positive margin of safety when price < fair value', () => {
    // FCF is large so fair value should exceed $185
    const result = runAdvancedDCF(baseParams);
    if (result.baseCase !== null && result.baseCase > baseParams.currentPrice) {
      expect(result.marginOfSafety).not.toBeNull();
      expect(result.marginOfSafety!).toBeGreaterThan(0);
    }
  });

  it('clamps extreme beta values', () => {
    const highBeta = runAdvancedDCF({ ...baseParams, beta: 10 });
    expect(highBeta.betaUsed).toBe(3);
    const lowBeta = runAdvancedDCF({ ...baseParams, beta: 0.1 });
    expect(lowBeta.betaUsed).toBe(DEFAULT_ENGINE_PARAMS.dcf.betaFloor);
  });

  it('clamps growth rate above 15%', () => {
    const result = runAdvancedDCF({ ...baseParams, growthRate: 0.50 });
    expect(result.growthRate).toBe(0.15);
  });
});
describe('runAdvancedDCFForStock', () => {
  const overview = {
    ticker: 'TEST',
    sharesOutstanding: 1_000_000,
    currentPrice: 50,
    currency: 'USD',
    financialCurrency: 'USD',
  } as StockOverview;
  const balanceSheet = { totalDebt: 2_000_000, cash: 500_000 } as BalanceSheet;
  const financials = { freeCashFlow: 5_000_000, beta: 1.2, epsGrowth: 30 } as FinancialMetrics;

  it('matches runAdvancedDCF with inputs derived from stock data', () => {
    const result = runAdvancedDCFForStock(overview, financials, balanceSheet);
    const direct = runAdvancedDCF({
      freeCashFlow: 5_000_000,
      sharesOutstanding: 1_000_000,
      netDebt: 1_500_000,
      beta: 1.2,
      growthRate: shrunk(0.30), // only estimate: 30% EPS growth, clipped to 25%, shrunk halfway to 3%
      riskFreeRate: null,
      currentPrice: 50,
    });
    // No history or EPS: falls back to the latest FCF
    expect(result).toEqual({ ...direct, currencyMismatch: null, cashFlowBasis: 'fcf' });
    expect(result.baseCase).not.toBeNull();
  });

  it('returns no fair value or table when financials use another currency (ADR)', () => {
    const adr = { ...overview, financialCurrency: 'TWD' };
    const result = runAdvancedDCFForStock(adr, financials, balanceSheet);
    expect(result.baseCase).toBeNull();
    expect(result.marginOfSafety).toBeNull();
    expect(result.sensitivityTable).toEqual([]);
    expect(result.currencyMismatch).toEqual({ price: 'USD', financial: 'TWD' });
  });

  it('returns no base case when free cash flow is missing', () => {
    const result = runAdvancedDCFForStock(overview, { ...financials, freeCashFlow: null }, balanceSheet);
    expect(result.baseCase).toBeNull();
  });

  it('discounts with the live yield of the stock’s home market', () => {
    const macro = { usTenYearYield: 4.99, jgbTenYearYield: 2.91 };
    const us = runAdvancedDCFForStock(overview, financials, balanceSheet, null, macro);
    const jp = runAdvancedDCFForStock({ ...overview, ticker: '6762.T' }, financials, balanceSheet, null, macro);
    expect(us.riskFreeRate).toBeCloseTo(0.0499, 6);
    expect(jp.riskFreeRate).toBeCloseTo(0.0291, 6);
    // Lower discount rate → higher fair value for the same cash flows
    expect(jp.baseCase!).toBeGreaterThan(us.baseCase!);
  });
});

describe('riskFreeRateFor', () => {
  const { riskFreeRate, riskFreeRateJp } = DEFAULT_ENGINE_PARAMS.dcf;

  it('uses the JGB yield for Tokyo tickers and the Treasury yield otherwise', () => {
    const macro = { usTenYearYield: 4.5, jgbTenYearYield: 1.5 };
    expect(riskFreeRateFor('7203.T', macro)).toBeCloseTo(0.015, 6);
    expect(riskFreeRateFor('7203', macro)).toBeCloseTo(0.015, 6);
    expect(riskFreeRateFor('AAPL', macro)).toBeCloseTo(0.045, 6);
  });

  it('falls back per market when the live yield is missing', () => {
    const none = { usTenYearYield: null, jgbTenYearYield: null };
    expect(riskFreeRateFor('7203.T', none)).toBe(riskFreeRateJp);
    expect(riskFreeRateFor('AAPL', none)).toBe(riskFreeRate);
    expect(riskFreeRateFor('AAPL')).toBe(riskFreeRate);
  });
});

describe('terminal growth cap', () => {
  const params = {
    freeCashFlow: 1_000_000,
    sharesOutstanding: 1_000,
    netDebt: 0,
    beta: 0.5,
    growthRate: 0.05,
    currentPrice: 1_000,
  };

  it('never lets long-run growth exceed the risk-free rate', () => {
    expect(runAdvancedDCF({ ...params, riskFreeRate: 0.015 }).terminalGrowthRate).toBe(0.015);
    expect(runAdvancedDCF({ ...params, riskFreeRate: 0.05 }).terminalGrowthRate).toBe(
      DEFAULT_ENGINE_PARAMS.dcf.terminalGrowth
    );
  });
});

describe('projectCashFlows', () => {
  it('fades growth linearly to the terminal rate by the final year', () => {
    // With no discounting effect isolated: compare against a manual fade
    const { pvProjected } = projectCashFlows(100, 0.15, 0.10, 0.03, 3);
    // year growths: 15%, 9%, 3%
    const f1 = 100 * 1.15;
    const f2 = f1 * 1.09;
    const f3 = f2 * 1.03;
    const expected = f1 / 1.1 + f2 / 1.1 ** 2 + f3 / 1.1 ** 3;
    expect(pvProjected).toBeCloseTo(expected, 6);
  });

  it('values high growth far less than compounding it for every year', () => {
    const faded = projectCashFlows(100, 0.15, 0.10, 0.03, 10);
    let fcf = 100;
    let pv = 0;
    for (let y = 1; y <= 10; y++) {
      fcf *= 1.15;
      pv += fcf / 1.1 ** y;
    }
    expect(faded.pvProjected).toBeLessThan(pv);
  });
});

describe('cagr', () => {
  it('computes compound annual growth', () => {
    expect(cagr(100, 121, 2)).toBeCloseTo(0.10, 10);
  });

  it('returns null for non-positive endpoints', () => {
    expect(cagr(-100, 121, 2)).toBeNull();
    expect(cagr(100, 0, 2)).toBeNull();
  });
});

// Expected starting growth for a median estimate g: clipped, then pulled halfway back to long-run growth
function shrunk(g: number): number {
  const { growthInputClip, growthShrink, terminalGrowth } = DEFAULT_ENGINE_PARAMS.dcf;
  const clipped = Math.min(growthInputClip.max, Math.max(growthInputClip.min, g));
  return terminalGrowth + growthShrink * (clipped - terminalGrowth);
}

describe('estimateGrowthRate', () => {
  const period = (fields: Record<string, number | null>) => ({ period: '', endDate: '', ...fields });
  const history = {
    cashFlowAnnual: [100, 105, 110, 116].map((v) => period({ freeCashFlow: v })), // ~5%/yr
    incomeAnnual: [1000, 1060, 1120, 1190].map((v) => period({ revenue: v })),   // ~6%/yr
  };

  it('ignores a one-quarter EPS spike via the median', () => {
    // Median of ~5%, ~6% and 80% (clipped to 25%) ≈ 6%, then shrunk toward 3%
    const g = estimateGrowthRate({ epsGrowth: 80 }, history);
    expect(g).toBeCloseTo(shrunk(cagr(1000, 1190, 3)!), 10);
  });

  it('falls back to EPS growth when there is no usable history', () => {
    expect(estimateGrowthRate({ epsGrowth: 12 }, null)).toBeCloseTo(shrunk(0.12), 10);
  });

  it('skips FCF CAGR when an endpoint is negative', () => {
    const negFcf = { ...history, cashFlowAnnual: [-50, 20, 40, 60].map((v) => period({ freeCashFlow: v })) };
    const g = estimateGrowthRate({ epsGrowth: null }, negFcf);
    expect(g).toBeCloseTo(shrunk(cagr(1000, 1190, 3)!), 10);
  });

  it('needs at least two years between endpoints', () => {
    const short = {
      cashFlowAnnual: [100, 200].map((v) => period({ freeCashFlow: v })),
      incomeAnnual: [],
    };
    expect(estimateGrowthRate({ epsGrowth: null }, short)).toBe(DEFAULT_GROWTH_RATE);
  });
});

describe('getCurrencyMismatch', () => {
  it('returns null when currencies match', () => {
    expect(getCurrencyMismatch({ currency: 'JPY', financialCurrency: 'JPY' })).toBeNull();
  });

  it('returns null when financial currency is unknown', () => {
    expect(getCurrencyMismatch({ currency: 'USD', financialCurrency: '' })).toBeNull();
  });

  it('returns both currencies for an ADR', () => {
    expect(getCurrencyMismatch({ currency: 'USD', financialCurrency: 'JPY' }))
      .toEqual({ price: 'USD', financial: 'JPY' });
  });
});

describe('selectCashFlowBase', () => {
  const history = (fcf: number[], ni: number[]) => ({
    cashFlowAnnual: fcf.map((v, i) => ({ period: String(2022 + i), endDate: '', freeCashFlow: v })),
    incomeAnnual: ni.map((v, i) => ({ period: String(2022 + i), endDate: '', netIncome: v })),
  });
  // Current earnings = EPS 10 × 100 shares = 1,000
  const fin = { freeCashFlow: 9_999, eps: 10, roe: 12 };

  it('values current earnings at the usual cash conversion', () => {
    // Conversion (100 + 200) ÷ (140 + 160) = 1.0 → 1,000; the odd TTM FCF 9,999 is ignored
    expect(selectCashFlowBase(fin, history([100, 200], [140, 160]), 100, 0.03)).toEqual({ basis: 'fcf', amount: 1000 });
  });

  it('does not undervalue a company whose profits just grew', () => {
    // Old 4-year FCF average would be 50; conversion 200 ÷ 400 = 0.5 × current earnings 1,000 = 500
    const base = selectCashFlowBase(fin, history([-20, 30, 60, 130], [40, 60, 100, 200]), 100, 0.03);
    expect(base!.basis).toBe('fcf');
    expect(base!.amount).toBeCloseTo(500, 6);
  });

  it('measures conversion only on years that have both figures', () => {
    // 2022 FCF has no matching net income; 2023–2024 convert at 0.8
    const h = {
      cashFlowAnnual: [
        { period: '2022', endDate: '', freeCashFlow: 5_000 },
        { period: '2023', endDate: '', freeCashFlow: 80 },
        { period: '2024', endDate: '', freeCashFlow: 80 },
      ],
      incomeAnnual: [
        { period: '2023', endDate: '', netIncome: 100 },
        { period: '2024', endDate: '', netIncome: 100 },
      ],
    };
    expect(cashConversion(h)).toBeCloseTo(0.8, 6);
  });

  it('switches to earnings after reinvestment when FCF is distorted (finance arm)', () => {
    // Conversion negative; payout = 1 − 3% ÷ 12% = 75% of current earnings 1,000
    const base = selectCashFlowBase(fin, history([-750, -840, -1560, 180], [2450, 4950, 4770, 3830]), 100, 0.03);
    expect(base!.basis).toBe('earnings');
    expect(base!.amount).toBeCloseTo(750, 6);
  });

  it('switches to earnings when FCF is far above earnings (advance payments)', () => {
    expect(selectCashFlowBase(fin, history([600, 600], [200, 200]), 100, 0.03)!.basis).toBe('earnings');
  });

  it('keeps at least the minimum payout for low-ROE companies', () => {
    const base = selectCashFlowBase({ ...fin, roe: 4 }, history([-10], [100]), 100, 0.03);
    expect(base!.amount).toBeCloseTo(1000 * DEFAULT_ENGINE_PARAMS.dcf.minPayout, 6);
  });

  it('uses average FCF when earnings are negative, else nothing', () => {
    const loss = { freeCashFlow: null, eps: -1, roe: null };
    expect(selectCashFlowBase(loss, history([40, 60], [-5, -1]), 100, 0.03)).toEqual({ basis: 'fcf', amount: 50 });
    expect(selectCashFlowBase(loss, history([-5], [-1]), 100, 0.03)).toBeNull();
  });

  it('falls back to latest FCF ÷ earnings without history', () => {
    // FCF 900 ÷ earnings 1,000 = 0.9 → in line → 900
    expect(selectCashFlowBase({ freeCashFlow: 900, eps: 10, roe: 12 }, null, 100, 0.03)).toEqual({ basis: 'fcf', amount: 900 });
  });
});

describe('currentEps', () => {
  const { forecastMinAnalysts } = DEFAULT_ENGINE_PARAMS.dcf;

  it('blends trailing EPS half-and-half with the analyst estimate', () => {
    expect(currentEps({ eps: 88, forwardEps: 135, forwardEpsAnalysts: 16 })).toBeCloseTo(111.5, 6);
  });

  it('ignores an estimate from too few analysts', () => {
    expect(currentEps({ eps: 88, forwardEps: 135, forwardEpsAnalysts: forecastMinAnalysts - 1 })).toBe(88);
  });

  it('uses trailing EPS alone without an estimate, and the estimate alone without EPS', () => {
    expect(currentEps({ eps: 88 })).toBe(88);
    expect(currentEps({ eps: null, forwardEps: 135, forwardEpsAnalysts: 16 })).toBe(135);
  });
});

describe('runAdvancedDCFForStock with the earnings basis', () => {
  it('does not subtract debt from earnings (already after interest)', () => {
    const overview = { ticker: '7203.T', sharesOutstanding: 100, currentPrice: 50, currency: 'JPY', financialCurrency: 'JPY' } as StockOverview;
    const financials = { freeCashFlow: -500, eps: 40, roe: 12, beta: 1, epsGrowth: 3 } as FinancialMetrics;
    const lowDebt = runAdvancedDCFForStock(overview, financials, { totalDebt: 0, cash: 0 } as BalanceSheet);
    const hugeDebt = runAdvancedDCFForStock(overview, financials, { totalDebt: 1e9, cash: 0 } as BalanceSheet);
    expect(lowDebt.cashFlowBasis).toBe('earnings');
    expect(hugeDebt.baseCase).toBe(lowDebt.baseCase);
  });
});

describe('estimateGrowthRate with analyst estimates', () => {
  it('adds the growth analysts expect this year to the median', () => {
    // Backward: EPS growth +30% (clipped to 25%). Forward: 182 → 140 = −23% (clipped to −10%)
    const g = estimateGrowthRate({ epsGrowth: 30, eps: 182, forwardEps: 140, forwardEpsAnalysts: 17 }, null);
    expect(g).toBeCloseTo(shrunk((0.25 - 0.10) / 2), 6);
  });

  it('ignores the estimate with too few analysts or no positive EPS', () => {
    expect(estimateGrowthRate({ epsGrowth: 30, eps: 182, forwardEps: 140, forwardEpsAnalysts: 1 }, null)).toBeCloseTo(shrunk(0.30), 6);
    expect(estimateGrowthRate({ epsGrowth: 30, eps: -5, forwardEps: 140, forwardEpsAnalysts: 17 }, null)).toBeCloseTo(shrunk(0.30), 6);
  });
});

describe('cash conversion above earnings', () => {
  it('is never credited above 100% of earnings', () => {
    // Conversion 1.4 is "in line" (≤ 1.5) but counts as 1.0
    const h = {
      cashFlowAnnual: [{ period: '2025', endDate: '', freeCashFlow: 140 }],
      incomeAnnual: [{ period: '2025', endDate: '', netIncome: 100 }],
    };
    expect(selectCashFlowBase({ freeCashFlow: null, eps: 10, roe: 12 }, h, 100, 0.03)).toEqual({ basis: 'fcf', amount: 1000 });
  });
});
