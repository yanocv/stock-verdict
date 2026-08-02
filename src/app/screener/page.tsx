'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScreenerResultsTable } from '@/components/screener/ScreenerResultsTable';
import { ScanLine, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ScreenerResult } from '@/app/api/screener/route';

const TOTAL = 30;

export default function ScreenerPage() {
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [processed, setProcessed] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runScan = useCallback(async () => {
    setResults([]);
    setProcessed(0);
    setDone(false);
    setFatalError(null);
    setScanning(true);

    abortRef.current = new AbortController();

    try {
      const response = await fetch('/api/screener', {
        signal: abortRef.current.signal,
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              setDone(true);
              if (data.fatalError) setFatalError(data.fatalError);
            } else {
              setProcessed(data.processed ?? 0);
              const { processed: _p, total: _t, ...result } = data;
              setResults((prev) => [...prev, result as ScreenerResult]);
            }
          } catch {
            // malformed SSE line — skip
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setFatalError(err.message);
      }
    } finally {
      setScanning(false);
    }
  }, []);

  const stopScan = useCallback(() => {
    abortRef.current?.abort();
    setScanning(false);
  }, []);

  const progress = TOTAL > 0 ? Math.round((processed / TOTAL) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col items-center p-6 sm:p-8 gap-8 font-[family-name:var(--font-geist-sans)]">
      {/* Header */}
      <header className="flex flex-col items-center gap-3 text-center w-full max-w-4xl pt-8">
        <div className="flex items-center gap-2">
          <Badge variant="buy">BUY</Badge>
          <Badge variant="wait">WAIT</Badge>
          <Badge variant="avoid">AVOID</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Nikkei Stock Screener</h1>
        <p className="text-muted-foreground text-sm max-w-md">
          Scans the top 30 most liquid Nikkei 225 stocks through our full verdict engine and ranks
          them by score. Macro data is shared across all tickers for consistency.
        </p>
        <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to search
        </Link>
      </header>

      {/* Controls */}
      <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
        {!scanning ? (
          <Button onClick={runScan} size="lg" className="gap-2">
            <ScanLine className="w-4 h-4" />
            {done ? 'Run Again' : 'Find BUY Stocks'}
          </Button>
        ) : (
          <Button onClick={stopScan} variant="outline" size="lg" className="gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Stop Scan
          </Button>
        )}

        {/* Progress bar */}
        {(scanning || (done && processed > 0)) && (
          <div className="w-full max-w-sm space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{scanning ? 'Scanning…' : 'Complete'}</span>
              <span>{processed} / {TOTAL}</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {fatalError && (
          <p className="text-sm text-red-500">Error: {fatalError}</p>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="w-full max-w-4xl">
          <ScreenerResultsTable results={results} />
          {done && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Scores use our full verdict engine (Valuation 35% · Financials 20% · Health 20% · Technical 12% · Macro 7% · News 6%).
              News sentiment fixed at neutral (5/10) during bulk scan.
              Not financial advice.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
