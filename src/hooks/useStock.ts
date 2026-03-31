import { useQuery } from '@tanstack/react-query';
import type { StockVerdictResponse } from '@/types';

interface StockError {
  error: string;
}

async function fetchStockVerdict(ticker: string): Promise<StockVerdictResponse> {
  const res = await fetch(`/api/stock/${encodeURIComponent(ticker)}`);

  if (!res.ok) {
    const body: StockError = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Failed to fetch data for ${ticker}`);
  }

  return res.json() as Promise<StockVerdictResponse>;
}

/**
 * Custom hook to fetch and cache stock verdict data via TanStack Query.
 *
 * @param ticker - Stock ticker symbol (e.g. "AAPL", "7203")
 * @param enabled - Whether the query should run (default: false until user submits)
 */
export function useStock(ticker: string, enabled: boolean = false) {
  return useQuery<StockVerdictResponse, Error>({
    queryKey: ['stock-verdict', ticker.toUpperCase()],
    queryFn: () => fetchStockVerdict(ticker),
    enabled: enabled && ticker.trim().length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
}