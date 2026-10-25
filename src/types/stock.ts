export interface StockOverview {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  currentPrice: number;
  currency: string;
  /** Currency the financial statements are reported in (differs for ADRs, e.g. TSM: TWD). */
  financialCurrency: string;
  exchange: string;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  sharesOutstanding: number;
  capSize: 'large' | 'mid' | 'small';
}
