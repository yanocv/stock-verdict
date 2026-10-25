/* eslint-disable @typescript-eslint/no-explicit-any */
import YahooFinance from 'yahoo-finance2';
import type { MacroData } from '@/types';
import type { IndexTrend } from '@/types/macro';
import { computeIndexTrend } from '@/lib/formulas/indexTrend';

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
  tenYearYield: '^TNX',   // US 10Y yield in % (e.g. 4.99)
  oil: 'CL=F',            // WTI Crude futures
  gold: 'GC=F',           // Gold futures
};

/**
 * Japan Ministry of Finance daily JGB yields for the current month (Shift_JIS CSV).
 * Yahoo has no reliable JGB 10Y symbol.
 */
const JGB_CSV_URL = 'https://www.mof.go.jp/jgbs/reference/interest_rate/jgbcm.csv';

/** Column of the 10-year yield in the MoF CSV (基準日, 1年 … 10年 …). */
const JGB_TEN_YEAR_COLUMN = 10;

/**
 * Latest 10-year yield (%) from the MoF CSV. Data rows start with an era date
 * such as "R8.10.22"; header and note rows don't. Returns null when no row
 * has a usable value (e.g. on the first business day of a month).
 */
export function parseJgbTenYear(csv: string): number | null {
  const rows = csv.split(/\r?\n/).filter((line) => /^[A-Z]\d+\.\d+\.\d+,/.test(line));
  for (let i = rows.length - 1; i >= 0; i--) {
    const raw = rows[i]!.split(',')[JGB_TEN_YEAR_COLUMN]?.trim();
    if (!raw) {continue;} // Number('') would read as 0%
    const value = Number(raw);
    if (Number.isFinite(value) && value > -5 && value < 20) {return value;}
  }
  return null;
}

async function fetchJgbTenYear(): Promise<number | null> {
  try {
    const res = await fetch(JGB_CSV_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {return null;}
    const csv = new TextDecoder('shift_jis').decode(await res.arrayBuffer());
    return parseJgbTenYear(csv);
  } catch {
    return null;
  }
}

/** ~13 months of daily closes, enough for a 200-day average and a 52-week high. */
async function fetchIndexTrend(symbol: string): Promise<IndexTrend | null> {
  try {
    const period1 = new Date();
    period1.setDate(period1.getDate() - 400);
    const chart: any = await yf.chart(symbol, { period1, interval: '1d' as const });
    const closes = (chart?.quotes ?? [])
      .map((q: any) => q.close)
      .filter((c: unknown): c is number => typeof c === 'number' && isFinite(c));
    return computeIndexTrend(closes);
  } catch {
    return null;
  }
}

async function fetchQuotes(): Promise<Record<string, any>> {
  try {
    const quotes: any[] = await yf.quote(Object.values(MACRO_SYMBOLS));
    const bySymbol: Record<string, any> = {};
    for (const q of quotes) {
      bySymbol[q.symbol] = q;
    }
    return bySymbol;
  } catch {
    return {};
  }
}

/**
 * Fetches macro indicators: Yahoo quotes and index history, plus JGB yields
 * from the Ministry of Finance. Each source fails on its own to null.
 */
export async function fetchMacroData(): Promise<MacroData> {
  const [bySymbol, jgbTenYearYield, sp500Trend, nikkeiTrend] = await Promise.all([
    fetchQuotes(),
    fetchJgbTenYear(),
    fetchIndexTrend(MACRO_SYMBOLS.sp500),
    fetchIndexTrend(MACRO_SYMBOLS.nikkei225),
  ]);

  const price = (sym: string): number | null => {
    const p = bySymbol[sym]?.regularMarketPrice;
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
    usTenYearYield: price(MACRO_SYMBOLS.tenYearYield),
    jgbTenYearYield,
    sp500Trend,
    nikkeiTrend,
  };
}
