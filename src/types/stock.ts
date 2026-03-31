export interface StockOverview {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  currentPrice: number;
  currency: string;
  exchange: string;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  sharesOutstanding: number;
  capSize: 'large' | 'mid' | 'small';
}
