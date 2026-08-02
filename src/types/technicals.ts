/**
 * Technical indicator data derived from price history.
 */
export interface TechnicalIndicators {
  /** RSI (14-day Relative Strength Index). null if insufficient price data. */
  rsi: number | null;
  /** RSI signal: 'overbought' (>70) | 'oversold' (<30) | 'neutral' */
  rsiSignal: 'overbought' | 'oversold' | 'neutral' | null;
  /** Price position within 52-week range: 0 = at 52wk low, 100 = at 52wk high */
  fiftyTwoWeekPosition: number | null;
  /** Simple 50-day moving average */
  sma50: number | null;
  /** Simple 200-day moving average */
  sma200: number | null;
  /** Price vs SMA50: 'above' | 'below' | null */
  trendVsSma50: 'above' | 'below' | null;
  /** Price vs SMA200: 'above' | 'below' | null (golden/death cross indicator) */
  trendVsSma200: 'above' | 'below' | null;
}