'use client';

import { useState, useCallback, type FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';

interface StockSearchBarProps {
  onSearch: (ticker: string) => void;
  isLoading?: boolean;
}

export function StockSearchBar({ onSearch, isLoading = false }: StockSearchBarProps) {
  const [input, setInput] = useState('');

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed.length > 0) {
        onSearch(trimmed);
      }
    },
    [input, onSearch]
  );

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <Input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter ticker (e.g. AAPL, TSLA, 7203)"
        className="flex-1"
        disabled={isLoading}
      />
      <Button type="submit" disabled={isLoading || input.trim().length === 0}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        <span className="ml-2">{isLoading ? 'Analyzing...' : 'Analyze'}</span>
      </Button>
    </form>
  );
}