import type {
  StockOverview,
  FinancialMetrics,
  BalanceSheet,
  IncomeStatement,
  Verdict,
  InvestorVerdict,
  NewsArticle,
  MacroData,
  CalendarData,
  FinancialHistory,
  ChartDataPoint,
  AnalystConsensus,
  TechnicalIndicators,
  DCFAnalysis,
  JapanFilterResult,
} from './index';
import type { MacroRegimeResult } from '@/lib/scoring/macroRegime';

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
  macroRegime: MacroRegimeResult;
  calendarData: CalendarData;
  financialHistory: FinancialHistory;
  priceHistory: ChartDataPoint[];
  aiNarrative: string | null;
  /** Phase 2: analyst consensus from Yahoo Finance recommendationTrend */
  analystConsensus: AnalystConsensus;
  /** Phase 2: RSI, SMA50, SMA200 derived from price history */
  technicalIndicators: TechnicalIndicators;
  /** Phase 2: full DCF with WACC + sensitivity table */
  dcfAnalysis: DCFAnalysis;
  /** Phase 2: Japan 6-gate TOPIX filter (NOT_APPLICABLE for non-JP stocks) */
  japanFilter: JapanFilterResult;
}
