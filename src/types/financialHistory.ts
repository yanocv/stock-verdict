/**
 * A single period row in a financial statement (annual or quarterly).
 * `period` is either "TTM", a year string "2024", or a quarter "Q3 2024".
 */
export interface FinancialPeriod {
  period: string;           // e.g. "TTM", "2025", "2024", "Q1 2025"
  endDate: string;          // ISO date string

  // Income Statement fields
  revenue?: number | null;
  grossProfit?: number | null;
  operatingIncome?: number | null;
  netIncome?: number | null;
  ebitda?: number | null;
  eps?: number | null;
  epsDiluted?: number | null;

  // Balance Sheet fields
  cash?: number | null;
  totalCurrentAssets?: number | null;
  totalCurrentLiabilities?: number | null;
  totalAssets?: number | null;
  totalLiabilities?: number | null;
  shareholderEquity?: number | null;
  longTermDebt?: number | null;
  totalDebt?: number | null;
  retainedEarnings?: number | null;

  // Cash Flow fields
  operatingCashFlow?: number | null;
  capitalExpenditures?: number | null;
  freeCashFlow?: number | null;
  dividendsPaid?: number | null;
}

/**
 * A set of financial periods grouped by statement type and frequency.
 */
export interface FinancialHistory {
  incomeAnnual: FinancialPeriod[];
  incomeQuarterly: FinancialPeriod[];
  balanceAnnual: FinancialPeriod[];
  balanceQuarterly: FinancialPeriod[];
  cashFlowAnnual: FinancialPeriod[];
  cashFlowQuarterly: FinancialPeriod[];
}

/**
 * A single OHLCV data point for the price chart.
 */
export interface ChartDataPoint {
  date: string;    // ISO date string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}