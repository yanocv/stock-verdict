import { useEffect, useCallback } from 'react';
import { create } from 'zustand';

// ── Types ──────────────────────────────────────────────────────────────────────
export type WatchlistTag = 'long-term' | 'swing' | 'dividend' | 'JP' | 'US' | 'growth' | 'value';

export interface WatchlistEntry {
  ticker: string;
  name: string;
  addedAt: string; // ISO date string
  notes: string;
  tags: WatchlistTag[];
  targetBuyPrice: number | null;
  targetSellPrice: number | null;
}

// ── Store ──────────────────────────────────────────────────────────────────────
interface WatchlistState {
  entries: WatchlistEntry[];
  hydrated: boolean;
  add: (entry: Omit<WatchlistEntry, 'addedAt'>) => void;
  remove: (ticker: string) => void;
  update: (ticker: string, patch: Partial<Omit<WatchlistEntry, 'ticker' | 'addedAt'>>) => void;
  has: (ticker: string) => boolean;
  _hydrate: () => void;
}

const STORAGE_KEY = 'sv-watchlist-v1';

function loadFromStorage(): WatchlistEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {return [];}
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(entries: WatchlistEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // storage quota exceeded or unavailable — fail silently
  }
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  entries: [],
  hydrated: false,

  _hydrate: () => {
    const entries = loadFromStorage();
    set({ entries, hydrated: true });
  },

  add: (entry) => {
    const exists = get().entries.some((e) => e.ticker === entry.ticker);
    if (exists) {return;}
    const newEntry: WatchlistEntry = {
      ...entry,
      addedAt: new Date().toISOString(),
    };
    const next = [...get().entries, newEntry];
    saveToStorage(next);
    set({ entries: next });
  },

  remove: (ticker) => {
    const next = get().entries.filter((e) => e.ticker !== ticker);
    saveToStorage(next);
    set({ entries: next });
  },

  update: (ticker, patch) => {
    const next = get().entries.map((e) =>
      e.ticker === ticker ? { ...e, ...patch } : e,
    );
    saveToStorage(next);
    set({ entries: next });
  },

  has: (ticker) => get().entries.some((e) => e.ticker === ticker),
}));

// ── Public hook ────────────────────────────────────────────────────────────────
/**
 * Watchlist hook — call in any client component that needs watchlist access.
 * Handles hydration from localStorage automatically.
 */
export function useWatchlist() {
  const { entries, hydrated, add, remove, update, has, _hydrate } = useWatchlistStore();

  useEffect(() => {
    if (!hydrated) {_hydrate();}
  }, [hydrated, _hydrate]);

  const toggle = useCallback(
    (entry: Omit<WatchlistEntry, 'addedAt'>) => {
      if (has(entry.ticker)) {
        remove(entry.ticker);
      } else {
        add(entry);
      }
    },
    [has, add, remove],
  );

  return {
    entries,
    hydrated,
    add,
    remove,
    update,
    toggle,
    has,
  };
}