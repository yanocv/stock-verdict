/* eslint-disable @typescript-eslint/no-explicit-any */
import { yf } from './yahooFinance';
import type { FinancialHistory, FinancialPeriod, ChartDataPoint } from '@/types';

/** Safely extract a nullable number. */
function n(value: unknown): number | null {
  return typeof value === 'number' && isFinite(value) ? value : null;
}

function quarterLabel(d: Date): string {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

function yearLabel(d: Date): string {
  return String(d.getFullYear());
}

function toDateObj(v: unknown): Date {
  if (v instanceof Date) return v;
  return new Date(v as string);
}

/** Maps a fundamentalsTimeSeries FINANCIALS row to FinancialPeriod */
function mapIncome(s: any, label: string): FinancialPeriod {
  return {
    period: label,
    endDate: toDateObj(s.date).toISOString(),
    revenue: n(s.totalRevenue),
    grossProfit: n(s.grossProfit),
    operatingIncome: n(s.operatingIncome) ?? n(s.totalOperatingIncomeAsReported),
    netIncome: n(s.netIncome) ?? n(s.netIncomeCommonStockholders),
    ebitda: n(s.EBITDA) ?? n(s.normalizedEBITDA),
    eps: n(s.basicEPS),
    epsDiluted: n(s.dilutedEPS),
  };
}

/** Maps a fundamentalsTimeSeries BALANCE_SHEET row to FinancialPeriod */
function mapBalance(s: any, label: string): FinancialPeriod {
  return {
    period: label,
    endDate: toDateObj(s.date).toISOString(),
    cash: n(s.cashAndCashEquivalents) ?? n(s.cashCashEquivalentsAndShortTermInvestments),
    totalCurrentAssets: n(s.currentAssets),
    totalCurrentLiabilities: n(s.currentLiabilities),
    totalAssets: n(s.totalAssets),
    totalLiabilities: n(s.totalLiabilitiesNetMinorityInterest),
    shareholderEquity: n(s.stockholdersEquity) ?? n(s.commonStockEquity),
    longTermDebt: n(s.longTermDebt),
    totalDebt: n(s.totalDebt),
    retainedEarnings: n(s.retainedEarnings),
  };
}

/** Maps a fundamentalsTimeSeries CASH_FLOW row to FinancialPeriod */
function mapCashFlow(s: any, label: string): FinancialPeriod {
  const opCF = n(s.operatingCashFlow) ?? n(s.cashFlowFromContinuingOperatingActivities);
  const capex = n(s.capitalExpenditure) ?? n(s.purchaseOfPPE);
  const fcf = n(s.freeCashFlow) ?? (opCF !== null && capex !== null ? opCF + capex : null);
  return {
    period: label,
    endDate: toDateObj(s.date).toISOString(),
    operatingCashFlow: opCF,
    capitalExpenditures: capex,
    freeCashFlow: fcf,
    dividendsPaid: n(s.cashDividendsPaid) ?? n(s.commonStockDividendPaid),
  };
}

async function fetchSeries(ticker: string, type: string, module: string): Promise<any[]> {
  try {
    const period1 = new Date();
    period1.setFullYear(period1.getFullYear() - 5);
    return await (yf as any).fundamentalsTimeSeries(ticker, {
      period1,
      period2: new Date(),
      type,
      module,
    });
  } catch (err) {
    console.error(`[fundamentalsTimeSeries] ${type}/${module} failed for ${ticker}:`, err);
    return [];
  }
}

/**
 * Fetches multi-period financial history (annual + quarterly) for a ticker
 * using the fundamentalsTimeSeries API (the quoteSummary financial statement
 * modules were broken by Yahoo Finance in Nov 2024).
 */
export async function fetchFinancialHistory(ticker: string): Promise<FinancialHistory> {
  const empty: FinancialHistory = {
    incomeAnnual: [], incomeQuarterly: [],
    balanceAnnual: [], balanceQuarterly: [],
    cashFlowAnnual: [], cashFlowQuarterly: [],
  };

  const [
    incomeAnnualRaw,
    balanceAnnualRaw,
    cashFlowAnnualRaw,
    incomeQtrRaw,
    balanceQtrRaw,
    cashFlowQtrRaw,
  ] = await Promise.all([
    fetchSeries(ticker, 'annual', 'financials'),
    fetchSeries(ticker, 'annual', 'balance-sheet'),
    fetchSeries(ticker, 'annual', 'cash-flow'),
    fetchSeries(ticker, 'quarterly', 'financials'),
    fetchSeries(ticker, 'quarterly', 'balance-sheet'),
    fetchSeries(ticker, 'quarterly', 'cash-flow'),
  ]);

  const incomeAnnual = incomeAnnualRaw.map((s) => mapIncome(s, yearLabel(toDateObj(s.date))));
  const balanceAnnual = balanceAnnualRaw.map((s) => mapBalance(s, yearLabel(toDateObj(s.date))));
  const cashFlowAnnual = cashFlowAnnualRaw.map((s) => mapCashFlow(s, yearLabel(toDateObj(s.date))));

  const incomeQuarterly = incomeQtrRaw.map((s) => mapIncome(s, quarterLabel(toDateObj(s.date))));
  const balanceQuarterly = balanceQtrRaw.map((s) => mapBalance(s, quarterLabel(toDateObj(s.date))));
  const cashFlowQuarterly = cashFlowQtrRaw.map((s) => mapCashFlow(s, quarterLabel(toDateObj(s.date))));

  if (incomeAnnual.length === 0 && balanceAnnual.length === 0) {
    console.warn(`[financialHistory] No data returned for ${ticker}`);
    return empty;
  }

  // Sort oldest → newest so charts render left-to-right
  const byDate = (a: FinancialPeriod, b: FinancialPeriod) =>
    new Date(a.endDate).getTime() - new Date(b.endDate).getTime();

  return {
    incomeAnnual: incomeAnnual.sort(byDate),
    incomeQuarterly: incomeQuarterly.sort(byDate),
    balanceAnnual: balanceAnnual.sort(byDate),
    balanceQuarterly: balanceQuarterly.sort(byDate),
    cashFlowAnnual: cashFlowAnnual.sort(byDate),
    cashFlowQuarterly: cashFlowQuarterly.sort(byDate),
  };
}

/**
 * Fetches 5 years of daily price history for a ticker.
 * This covers all range tabs: 1D (most recent day), 5D, 1M, 6M, 1Y, 5Y, MAX.
 * Note: Yahoo Finance `historical` with interval '1d' returns one point per
 * trading day — so '1D' tab will show the single most recent day's close.
 */
export async function fetchPriceHistory(ticker: string): Promise<ChartDataPoint[]> {
  try {
    const period2 = new Date();
    const period1 = new Date();
    period1.setFullYear(period1.getFullYear() - 5);

    const result: any[] = await yf.historical(ticker, {
      period1,
      period2,
      interval: '1d' as const,
    });

    return (Array.isArray(result) ? result : [])
      .filter((d: any) => d.close != null)
      .map((d: any) => ({
        date: (d.date instanceof Date ? d.date : new Date(d.date)).toISOString().slice(0, 10),
        open: d.open ?? d.close,
        high: d.high ?? d.close,
        low: d.low ?? d.close,
        close: d.close,
        volume: d.volume ?? 0,
      }));
  } catch (err) {
    console.error(`[priceHistory] failed for ${ticker}:`, err);
    return [];
  }
}