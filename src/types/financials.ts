export interface FinancialMetrics {
  eps: number | null;
  roe: number | null;
  netProfitMargin: number | null;
  peRatio: number | null;
  psRatio: number | null;
  pegRatio: number | null;
  pbRatio: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  freeCashFlow: number | null;
  operatingMargin: number | null;
  revenueGrowth: number | null;
  epsGrowth: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;
  beta: number | null;
}

export interface BalanceSheet {
  totalCurrentAssets: number;
  totalCurrentLiabilities: number;
  totalAssets: number;
  totalLiabilities: number;
  shareholderEquity: number;
  longTermDebt: number;
  totalDebt: number;
  cash: number;
  retainedEarnings: number;
}

export interface IncomeStatement {
  revenue: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
  ebitda: number;
}
