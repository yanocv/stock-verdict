/* eslint-disable @typescript-eslint/no-explicit-any */
import YahooFinance from 'yahoo-finance2';
import type { MacroData } from '@/types';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

/**
 * Macro symbols to fetch from Yahoo Finance.
 * These require no API key and update in real-time.
 */
const MACRO_SYMBOLS = {
  vix: '^VIX',
  sp500: '^GSPC',
  nikkei225: '^N225',
  usdJpy: 'JPY=X',
  tenYearYield: '^TNX',   // proxy for discount rate / risk-free rate
  oil: 'CL=F',            // WTI Crude futures
  gold: 'GC=F',           // Gold futures
};

/**
 * Fetches real-time macro indicator data from Yahoo Finance.
 * All symbols are publicly available — no API key required.
 */
export async function fetchMacroData(): Promise<MacroData> {
  try {
    const symbols = Object.values(MACRO_SYMBOLS);
    const quotes: any[] = await yf.quote(symbols);

    const bySymbol: Record<string, any> = {};
    for (const q of quotes) {
      bySymbol[q.symbol] = q;
    }

    const price = (sym: string): number | null => {
      const q = bySymbol[sym];
      const p = q?.regularMarketPrice;
      return typeof p === 'number' && isFinite(p) ? p : null;
    };

    return {
      bojRate: null,        // BoJ rate not available without a separate API key
      fedRate: null,        // Fed rate not available without FRED API key
      usdJpy: price(MACRO_SYMBOLS.usdJpy),
      oilPrice: price(MACRO_SYMBOLS.oil),
      goldPrice: price(MACRO_SYMBOLS.gold),
      nikkei225: price(MACRO_SYMBOLS.nikkei225),
      sp500: price(MACRO_SYMBOLS.sp500),
      vix: price(MACRO_SYMBOLS.vix),
    };
  } catch {
    // Return null-filled object if macro fetch fails — non-critical
    return {
      bojRate: null,
      fedRate: null,
      usdJpy: null,
      oilPrice: null,
      goldPrice: null,
      nikkei225: null,
      sp500: null,
      vix: null,
    };
  }
}