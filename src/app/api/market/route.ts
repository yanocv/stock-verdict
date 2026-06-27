import { NextResponse } from 'next/server';
import { yf } from '@/lib/services/yahooFinance';

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  region: 'US' | 'JP' | 'FX';
}

export interface MarketDashboardData {
  indices: MarketIndex[];
  fetchedAt: string;
}

const SYMBOLS = [
  // US indices
  { symbol: '^GSPC', name: 'S&P 500', region: 'US' as const },
  { symbol: '^IXIC', name: 'NASDAQ', region: 'US' as const },
  { symbol: '^DJI', name: 'Dow Jones', region: 'US' as const },
  { symbol: '^VIX', name: 'VIX', region: 'US' as const },
  // Japan indices
  { symbol: '^N225', name: 'Nikkei 225', region: 'JP' as const },
  { symbol: '^TPX', name: 'TOPIX', region: 'JP' as const },
  // FX
  { symbol: 'JPY=X', name: 'USD/JPY', region: 'FX' as const },
  { symbol: 'EURUSD=X', name: 'EUR/USD', region: 'FX' as const },
];

export async function GET() {
  try {
    const quotes = await Promise.allSettled(
      SYMBOLS.map((s) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (yf as any).quote(s.symbol).catch(() => null),
      ),
    );

    const indices: MarketIndex[] = quotes
      .map((result, i) => {
        const meta = SYMBOLS[i]!;
        if (result.status === 'rejected' || !result.value) return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q: any = result.value;
        const price = q.regularMarketPrice ?? q.price ?? 0;
        const change = q.regularMarketChange ?? 0;
        const changePct = q.regularMarketChangePercent ?? 0;
        if (!price) return null;
        return {
          symbol: meta.symbol,
          name: meta.name,
          price,
          change,
          changePct,
          region: meta.region,
        };
      })
      .filter((x): x is MarketIndex => x !== null);

    const data: MarketDashboardData = {
      indices,
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (err) {
    console.error('[market] failed:', err);
    return NextResponse.json({ indices: [], fetchedAt: new Date().toISOString() }, { status: 500 });
  }
}