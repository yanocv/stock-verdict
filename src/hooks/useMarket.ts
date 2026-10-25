import { useQuery } from '@tanstack/react-query';
import type { MarketDashboardData } from '@/app/api/market/route';

async function fetchMarketData(): Promise<MarketDashboardData> {
  const res = await fetch('/api/market');
  if (!res.ok) {throw new Error('Failed to fetch market data');}
  return res.json() as Promise<MarketDashboardData>;
}

/**
 * Fetches live market index data (S&P 500, NASDAQ, Nikkei, USD/JPY, etc.)
 * Refreshes every 5 minutes. Cached by TanStack Query.
 */
export function useMarket() {
  return useQuery({
    queryKey: ['market-dashboard'],
    queryFn: fetchMarketData,
    staleTime: 5 * 60 * 1000,   // 5 min
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  });
}