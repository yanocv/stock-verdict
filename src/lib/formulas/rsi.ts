import type { ChartDataPoint } from '@/types';

/**
 * Calculates RSI (Relative Strength Index) using Wilder's smoothing method.
 *
 * @param closes - Array of closing prices, oldest first.
 * @param period - RSI period (default 14).
 * @returns RSI value 0–100, or null if insufficient data.
 */
export function calculateRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;

  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1];
    const curr = closes[i];
    if (prev !== undefined && curr !== undefined) {
      changes.push(curr - prev);
    }
  }

  // Separate initial gains and losses for the seed average
  const initialGains = changes.slice(0, period).filter((c): c is number => c > 0);
  const initialLosses = changes.slice(0, period).filter((c): c is number => c < 0).map((c) => Math.abs(c));

  let avgGain =
    initialGains.length > 0
      ? initialGains.reduce((a, b) => a + b, 0) / period
      : 0;
  let avgLoss =
    initialLosses.length > 0
      ? initialLosses.reduce((a, b) => a + b, 0) / period
      : 0;

  // Wilder's smoothing for remaining periods
  for (let i = period; i < changes.length; i++) {
    const change = changes[i] ?? 0;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return Math.round(rsi * 100) / 100;
}

/**
 * Returns 'overbought' (RSI > 70), 'oversold' (RSI < 30), or 'neutral'.
 */
export function classifyRSI(rsi: number): 'overbought' | 'oversold' | 'neutral' {
  if (rsi >= 70) return 'overbought';
  if (rsi <= 30) return 'oversold';
  return 'neutral';
}

/**
 * Calculates the simple moving average of the last `period` values.
 * Returns null if there are fewer values than `period`.
 */
export function calculateSMA(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(values.length - period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/**
 * Extracts closing prices from ChartDataPoint[], oldest first.
 */
export function extractCloses(priceHistory: ChartDataPoint[]): number[] {
  return [...priceHistory]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => p.close);
}