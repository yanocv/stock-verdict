import type { StockOverview, FinancialMetrics, BalanceSheet, IncomeStatement, Verdict, InvestorVerdict, NewsArticle, MacroData, CalendarData } from './index';

/**
 * The full response shape from GET /api/stock/[ticker].
 */
export interface StockVerdictResponse {
  overview: StockOverview;
  financials: FinancialMetrics;
  balanceSheet: BalanceSheet;
  incomeStatement: IncomeStatement;
  verdict: Verdict;
  investorVerdicts: {
    buffett: InvestorVerdict;
    graham: InvestorVerdict;
    lynch: InvestorVerdict;
  };
  news: NewsArticle[];
  macroData: MacroData;
  calendarData: CalendarData;
}
