'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLangStore } from '@/state/langStore';

export default function Home() {
  const { locale, setLocale } = useLangStore();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-10 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col items-center gap-8 w-full max-w-lg">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2">
            <Badge variant="buy">BUY</Badge>
            <Badge variant="wait">WAIT</Badge>
            <Badge variant="avoid">AVOID</Badge>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Stock Verdict</h1>
          <p className="text-muted-foreground text-base">
            AI-powered stock analysis — enter a ticker and get an instant investment verdict.
          </p>
        </div>

        <div className="flex w-full gap-2">
          <Input
            type="text"
            placeholder="Enter stock code (e.g. AAPL, 7203)"
            className="flex-1"
          />
          <Button type="button">Analyze</Button>
        </div>

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
      </main>
    </div>
  );
}
