import { z } from 'zod';

export const StockOverviewSchema = z.object({
  ticker: z.string().min(1).max(10),
  name: z.string().min(1),
  sector: z.string(),
  industry: z.string(),
  marketCap: z.number().nonnegative(),
  currentPrice: z.number().positive(),
  currency: z.string().length(3),
  exchange: z.string(),
  fiftyTwoWeekHigh: z.number().positive(),
  fiftyTwoWeekLow: z.number().positive(),
  capSize: z.enum(['large', 'mid', 'small']),
});

export const FinancialMetricsSchema = z.object({
  eps: z.number().nullable(),
  roe: z.number().nullable(),
  netProfitMargin: z.number().nullable(),
  peRatio: z.number().nullable(),
  psRatio: z.number().nullable(),
  pegRatio: z.number().nullable(),
  pbRatio: z.number().nullable(),
  debtToEquity: z.number().nullable(),
  currentRatio: z.number().nullable(),
  freeCashFlow: z.number().nullable(),
  operatingMargin: z.number().nullable(),
  revenueGrowth: z.number().nullable(),
  epsGrowth: z.number().nullable(),
  dividendYield: z.number().nullable(),
  payoutRatio: z.number().nullable(),
  beta: z.number().nullable(),
});

export const BalanceSheetSchema = z.object({
  totalCurrentAssets: z.number(),
  totalCurrentLiabilities: z.number(),
  totalAssets: z.number(),
  totalLiabilities: z.number(),
  shareholderEquity: z.number(),
  longTermDebt: z.number().nonnegative(),
  totalDebt: z.number().nonnegative(),
  cash: z.number().nonnegative(),
  retainedEarnings: z.number(),
});

export const IncomeStatementSchema = z.object({
  revenue: z.number(),
  operatingIncome: z.number(),
  netIncome: z.number(),
  eps: z.number(),
  ebitda: z.number(),
});

export const MacroDataSchema = z.object({
  bojRate: z.number().nullable(),
  fedRate: z.number().nullable(),
  usdJpy: z.number().nullable(),
  oilPrice: z.number().nullable(),
  goldPrice: z.number().nullable(),
  nikkei225: z.number().nullable(),
  sp500: z.number().nullable(),
  vix: z.number().nullable(),
});

export const NewsArticleSchema = z.object({
  title: z.string(),
  source: z.string(),
  url: z.string().url(),
  publishedAt: z.string(),
  summary: z.string().nullable(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).nullable(),
  sentimentScore: z.number().min(-1).max(1).nullable(),
  relevance: z.number().min(0).max(1),
});

export type StockOverviewInput = z.infer<typeof StockOverviewSchema>;
export type FinancialMetricsInput = z.infer<typeof FinancialMetricsSchema>;
export type BalanceSheetInput = z.infer<typeof BalanceSheetSchema>;
export type IncomeStatementInput = z.infer<typeof IncomeStatementSchema>;
export type MacroDataInput = z.infer<typeof MacroDataSchema>;
export type NewsArticleInput = z.infer<typeof NewsArticleSchema>;
