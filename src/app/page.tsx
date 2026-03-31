'use client';

import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLangStore } from '@/state/langStore';
import { useStock } from '@/hooks/useStock';
import { StockSearchBar } from '@/components/stock/StockSearchBar';
import { VerdictResultPanel } from '@/components/verdict/VerdictResultPanel';
import { Loader2, AlertCircle } from 'lucide-react';

export default function Home() {
  const { locale, setLocale } = useLangStore();
  const [ticker, setTicker] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, isError, error } = useStock(ticker, submitted);

  const handleSearch = useCallback((newTicker: string) => {
    setTicker(newTicker);
    setSubmitted(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center p-6 sm:p-8 gap-8 font-[family-name:var(--font-geist-sans)]">
      {/* ── Header ── */}
      <header className="flex flex-col items-center gap-3 text-center w-full max-w-lg pt-8">
        <div className="flex items-center gap-2">
          <Badge variant="buy">BUY</Badge>
          <Badge variant="wait">WAIT</Badge>
          <Badge variant="avoid">AVOID</Badge>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Stock Verdict</h1>
        <p className="text-muted-foreground text-base">
          AI-powered stock analysis — enter a ticker and get an instant investment verdict.
        </p>
      </header>

      {/* ── Search Bar ── */}
      <div className="w-full max-w-lg">
        <StockSearchBar onSearch={handleSearch} isLoading={isLoading} />
      </div>

      {/* ── Language Switcher ── */}
      <div className="flex gap-2">
        {(['en', 'ja', 'pt'] as const).map((lang) => (
          <Button
            key={lang}
            variant={locale === lang ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLocale(lang)}
          >
            {lang.toUpperCase()}
          </Button>
        ))}
      </div>

      {/* ── Loading State ── */}
      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">
            Analyzing <span className="font-semibold text-foreground">{ticker.toUpperCase()}</span>...
          </p>
          <p className="text-xs">Fetching data from Yahoo Finance & running scoring engine</p>
        </div>
      )}

      {/* ── Error State ── */}
      {isError && !isLoading && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 w-full max-w-lg">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Analysis failed</p>
            <p className="text-sm mt-1">
              {error?.message || 'An unexpected error occurred. Please try again.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {data && !isLoading && (
        <VerdictResultPanel data={data} />
      )}

      {/* ── Empty State (before any search) ── */}
      {!submitted && !isLoading && (
        <div className="text-center text-muted-foreground text-sm py-8 space-y-2">
          <p>Enter a ticker symbol above to get started.</p>
          <p className="text-xs">
            Supports US stocks (AAPL, TSLA, MSFT) and Japanese stocks (7203, 9984, 6758)
          </p>
        </div>
      )}
    </div>
  );
}