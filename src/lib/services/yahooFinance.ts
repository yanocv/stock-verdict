/* eslint-disable @typescript-eslint/no-explicit-any */
import YahooFinance from 'yahoo-finance2';
import type { StockOverview, FinancialMetrics, BalanceSheet, IncomeStatement, CalendarData } from '@/types';
import { classifyCapSize } from '@/lib/classifiers/capSize';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

/**
 * Full data bundle returned from Yahoo Finance for a single ticker.
 */
export interface YahooStockData {
  overview: StockOverview;
  financials: FinancialMetrics;
  balanceSheet: BalanceSheet;
  incomeStatement: IncomeStatement;
  calendarData: CalendarData;
}

/** Safely extract a number from a Yahoo Finance field that may be a number or undefined. */
function num(value: unknown, fallback: number = 0): number {
  return typeof value === 'number' && isFinite(value) ? value : fallback;
}

/** Safely extract a nullable number. */
function numOrNull(value: unknown): number | null {
  return typeof value === 'number' && isFinite(value) ? value : null;
}

/**
 * Fetches comprehensive stock data from Yahoo Finance using the
 * `yahoo-finance2` package's `quoteSummary` endpoint.
 *
 * Supports both US tickers (AAPL) and Japanese tickers (7203.T).
 */
export async function fetchStockData(ticker: string): Promise<YahooStockData> {
  // Normalize Japanese tickers: "7203" → "7203.T"
  const normalizedTicker =
    /^\d{4}$/.test(ticker) ? `${ticker}.T` : ticker.toUpperCase();

  // yahoo-finance2's quoteSummary with strict module typing
  const result: any = await yahooFinance.quoteSummary(normalizedTicker, {
    modules: [
      'price' as const,
      'summaryDetail' as const,
      'defaultKeyStatistics' as const,
      'financialData' as const,
      'balanceSheetHistory' as const,
      'incomeStatementHistory' as const,
      'assetProfile' as const,
      'calendarEvents' as const,
    ],
  });

  const price = result.price ?? {};
  const summary = result.summaryDetail ?? {};
  const keyStats = result.defaultKeyStatistics ?? {};
  const finData = result.financialData ?? {};
  const profile = result.assetProfile ?? {};

  // --- Balance Sheet (most recent) ---
  const bsStatements = result.balanceSheetHistory?.balanceSheetStatements ?? [];
  const latestBS: any = bsStatements[0] ?? {};

  // --- Income Statement (most recent annual) ---
  const isStatements = result.incomeStatementHistory?.incomeStatementHistory ?? [];
  const latestIS: any = isStatements[0] ?? {};

  // Extract numeric values safely
  const currentPrice = num(price.regularMarketPrice);
  const marketCap = num(price.marketCap);
  const currency: string = price.currency ?? 'USD';
  const sharesOut = num(keyStats.sharesOutstanding) || (currentPrice > 0 ? marketCap / currentPrice : 0);

  // Revenue & earnings data
  const revenue = num(latestIS.totalRevenue);
  const operatingIncome = num(latestIS.operatingIncome);
  const netIncome = num(latestIS.netIncome);
  const ebitda = num(latestIS.ebitda) || num(finData.ebitda);

  // EPS — prefer trailingEps, fall back to computed
  const eps: number | null =
    numOrNull(keyStats.trailingEps) ??
    (netIncome !== 0 && sharesOut > 0 ? netIncome / sharesOut : null);

  // Book value
  const shareholderEquity = num(latestBS.totalStockholderEquity);

  // Operating & net margins (from financialData — already in decimal, convert to %)
  const operatingMargin: number | null =
    numOrNull(finData.operatingMargins) !== null
      ? (finData.operatingMargins as number) * 100
      : (revenue > 0 ? (operatingIncome / revenue) * 100 : null);

  const netProfitMargin: number | null =
    numOrNull(finData.profitMargins) !== null
      ? (finData.profitMargins as number) * 100
      : (revenue > 0 ? (netIncome / revenue) * 100 : null);

  // ROE (from financialData — already decimal)
  const roe: number | null =
    numOrNull(finData.returnOnEquity) !== null
      ? (finData.returnOnEquity as number) * 100
      : (shareholderEquity > 0 && netIncome !== 0 ? (netIncome / shareholderEquity) * 100 : null);

  // Growth rates
  const revenueGrowth: number | null =
    numOrNull(finData.revenueGrowth) !== null
      ? (finData.revenueGrowth as number) * 100
      : null;

  const epsGrowth: number | null =
    numOrNull(finData.earningsGrowth) !== null
      ? (finData.earningsGrowth as number) * 100
      : null;

  // Free cash flow
  const freeCashFlow: number | null = numOrNull(finData.freeCashflow);

  // Valuation ratios
  const peRatio: number | null = numOrNull(summary.trailingPE) ?? numOrNull(keyStats.trailingPE);
  const pbRatio: number | null = numOrNull(keyStats.priceToBook);
  const psRatio: number | null = numOrNull(summary.priceToSalesTrailing12Months);
  const pegRatio: number | null = numOrNull(keyStats.pegRatio);

  // Debt ratios
  const totalDebt = num(finData.totalDebt) || num(latestBS.longTermDebt);
  const debtToEquity: number | null =
    numOrNull(finData.debtToEquity) !== null
      ? (finData.debtToEquity as number) / 100 // Yahoo returns as percentage
      : (shareholderEquity > 0 ? totalDebt / shareholderEquity : null);
  const currentRatio: number | null = numOrNull(finData.currentRatio);

  // Dividend
  const dividendYield: number | null =
    numOrNull(summary.dividendYield) !== null
      ? (summary.dividendYield as number) * 100
      : null;
  const payoutRatio: number | null =
    numOrNull(summary.payoutRatio) !== null
      ? (summary.payoutRatio as number) * 100
      : null;

  // Beta
  const beta: number | null = numOrNull(summary.beta);

  // Build StockOverview
  const overview: StockOverview = {
    ticker: normalizedTicker,
    name: price.shortName ?? price.longName ?? normalizedTicker,
    sector: profile.sector ?? '',
    industry: profile.industry ?? '',
    marketCap,
    currentPrice,
    currency,
    exchange: price.exchangeName ?? '',
    fiftyTwoWeekHigh: num(summary.fiftyTwoWeekHigh) || currentPrice,
    fiftyTwoWeekLow: num(summary.fiftyTwoWeekLow) || currentPrice,
    sharesOutstanding: sharesOut,
    capSize: classifyCapSize(marketCap, currency),
  };

  // Build FinancialMetrics
  const financials: FinancialMetrics = {
    eps,
    roe,
    netProfitMargin,
    peRatio,
    psRatio,
    pegRatio,
    pbRatio,
    debtToEquity,
    currentRatio,
    freeCashFlow,
    operatingMargin,
    revenueGrowth,
    epsGrowth,
    dividendYield,
    payoutRatio,
    beta,
  };

  // Build BalanceSheet
  const balanceSheet: BalanceSheet = {
    totalCurrentAssets: num(latestBS.totalCurrentAssets),
    totalCurrentLiabilities: num(latestBS.totalCurrentLiabilities),
    totalAssets: num(latestBS.totalAssets),
    totalLiabilities: num(latestBS.totalLiab),
    shareholderEquity,
    longTermDebt: num(latestBS.longTermDebt),
    totalDebt,
    cash: num(latestBS.cash) || num(finData.totalCash),
    retainedEarnings: num(latestBS.retainedEarnings),
  };

  // Build IncomeStatement
  const incomeStatement: IncomeStatement = {
    revenue,
    operatingIncome,
    netIncome,
    eps: eps ?? 0,
    ebitda,
  };

  // Build CalendarData
  const cal = result.calendarEvents ?? {};
  const earningsDates: Date[] = cal.earnings?.earningsDate ?? [];
  const nextEarnings = earningsDates.length > 0 ? earningsDates[0] : null;

  const calendarData: CalendarData = {
    earningsDate: nextEarnings instanceof Date ? nextEarnings.toISOString() : null,
    exDividendDate: cal.exDividendDate instanceof Date ? cal.exDividendDate.toISOString() : null,
    dividendDate: cal.dividendDate instanceof Date ? cal.dividendDate.toISOString() : null,
    earningsAverage: typeof cal.earnings?.earningsAverage === 'number' ? cal.earnings.earningsAverage : null,
    earningsLow: typeof cal.earnings?.earningsLow === 'number' ? cal.earnings.earningsLow : null,
    earningsHigh: typeof cal.earnings?.earningsHigh === 'number' ? cal.earnings.earningsHigh : null,
    revenueAverage: typeof cal.earnings?.revenueAverage === 'number' ? cal.earnings.revenueAverage : null,
  };

  return { overview, financials, balanceSheet, incomeStatement, calendarData };
}