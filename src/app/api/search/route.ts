/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface SearchSuggestion {
  ticker: string;
  name: string;
  exchange: string;
  type: string;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (q.length < 1) {
    return NextResponse.json([] as SearchSuggestion[]);
  }

  try {
    const result: any = await yf.search(q, { quotesCount: 8, newsCount: 0 });
    const quotes: any[] = result.quotes ?? [];

    const suggestions: SearchSuggestion[] = quotes
      .filter((q) => q.symbol && q.quoteType !== 'CURRENCY' && q.quoteType !== 'FUTURE')
      .slice(0, 7)
      .map((q) => ({
        ticker: q.symbol,
        name: q.longname ?? q.shortname ?? q.symbol,
        exchange: q.exchDisp ?? q.exchange ?? '',
        type: q.quoteType ?? 'EQUITY',
      }));

    return NextResponse.json(suggestions);
  } catch {
    return NextResponse.json([] as SearchSuggestion[]);
  }
}