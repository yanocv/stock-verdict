'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import type { SearchSuggestion } from '@/app/api/search/route';

interface StockSearchBarProps {
  onSearch: (ticker: string) => void;
  isLoading?: boolean;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function StockSearchBar({ onSearch, isLoading = false }: StockSearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 280);

  // Fetch suggestions
  useEffect(() => {
    if (debouncedQuery.trim().length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    let cancelled = false;
    setIsFetching(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data: SearchSuggestion[]) => {
        if (!cancelled) {
          setSuggestions(data);
          setShowDropdown(data.length > 0);
          setActiveIdx(-1);
        }
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const submit = useCallback((ticker: string) => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    setQuery(t);
    setShowDropdown(false);
    onSearch(t);
  }, [onSearch]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) {
      if (e.key === 'Enter') submit(query);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        submit(suggestions[activeIdx].ticker);
      } else {
        submit(query);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-lg mx-auto">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
            placeholder="Search ticker or company name…"
            className="pr-8"
            autoComplete="off"
            spellCheck={false}
            aria-autocomplete="list"
            aria-expanded={showDropdown}
          />
          {isFetching && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button
          onClick={() => submit(query)}
          disabled={isLoading || query.trim().length === 0}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span className="ml-1 hidden sm:inline">Search</span>
        </Button>
      </div>

      {/* Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <ul
          className="absolute z-50 top-full left-0 w-full mt-1 bg-background border rounded-md shadow-lg overflow-hidden"
          role="listbox"
        >
          {suggestions.map((s, idx) => (
            <li
              key={s.ticker}
              role="option"
              aria-selected={idx === activeIdx}
              onMouseDown={() => submit(s.ticker)}
              onMouseEnter={() => setActiveIdx(idx)}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer text-sm transition-colors ${
                idx === activeIdx ? 'bg-muted' : 'hover:bg-muted/60'
              }`}
            >
              <div>
                <span className="font-semibold">{s.ticker}</span>
                <span className="ml-2 text-muted-foreground truncate max-w-[220px] inline-block align-bottom">
                  {s.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground ml-2 shrink-0">{s.exchange}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}