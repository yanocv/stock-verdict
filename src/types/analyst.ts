/**
 * Analyst consensus data from Yahoo Finance recommendationTrend + financialData.
 */
export interface AnalystConsensus {
  targetMeanPrice: number | null;
  targetHighPrice: number | null;
  targetLowPrice: number | null;
  targetMedianPrice: number | null;
  numberOfAnalysts: number | null;
  /** Analyst recommendation string from Yahoo: 'strongBuy' | 'buy' | 'hold' | 'sell' | 'strongSell' */
  recommendationKey: string | null;
  /** Upside/downside % from current price to mean target */
  upsideToTarget: number | null;
  /** Distribution of analyst ratings */
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}