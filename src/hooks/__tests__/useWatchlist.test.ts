import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWatchlist, useWatchlistStore } from '../useWatchlist';

// ── localStorage mock ──────────────────────────────────────────────────────────
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete storage[key]; }),
  clear: vi.fn(() => { Object.keys(storage).forEach((k) => delete storage[k]); }),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
  // Reset Zustand store between tests
  useWatchlistStore.setState({ entries: [], hydrated: false });
});

const APPLE: Parameters<ReturnType<typeof useWatchlist>['add']>[0] = {
  ticker: 'AAPL',
  name: 'Apple Inc.',
  notes: '',
  tags: [],
  targetBuyPrice: null,
  targetSellPrice: null,
};

const TOYOTA: Parameters<ReturnType<typeof useWatchlist>['add']>[0] = {
  ticker: '7203.T',
  name: 'Toyota Motor',
  notes: 'Long-term hold',
  tags: ['long-term', 'JP'],
  targetBuyPrice: 2500,
  targetSellPrice: 3200,
};

describe('useWatchlist', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useWatchlist());
    expect(result.current.entries).toHaveLength(0);
  });

  it('adds an entry', () => {
    const { result } = renderHook(() => useWatchlist());
    act(() => { result.current.add(APPLE); });
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0]?.ticker).toBe('AAPL');
    expect(result.current.entries[0]?.addedAt).toBeDefined();
  });

  it('does not add the same ticker twice', () => {
    const { result } = renderHook(() => useWatchlist());
    act(() => { result.current.add(APPLE); });
    act(() => { result.current.add(APPLE); });
    expect(result.current.entries).toHaveLength(1);
  });

  it('removes an entry', () => {
    const { result } = renderHook(() => useWatchlist());
    act(() => { result.current.add(APPLE); });
    act(() => { result.current.remove('AAPL'); });
    expect(result.current.entries).toHaveLength(0);
  });

  it('has() returns true when ticker is in watchlist', () => {
    const { result } = renderHook(() => useWatchlist());
    act(() => { result.current.add(APPLE); });
    expect(result.current.has('AAPL')).toBe(true);
    expect(result.current.has('MSFT')).toBe(false);
  });

  it('toggle adds when not in watchlist', () => {
    const { result } = renderHook(() => useWatchlist());
    act(() => { result.current.toggle(APPLE); });
    expect(result.current.has('AAPL')).toBe(true);
  });

  it('toggle removes when already in watchlist', () => {
    const { result } = renderHook(() => useWatchlist());
    act(() => { result.current.add(APPLE); });
    act(() => { result.current.toggle(APPLE); });
    expect(result.current.has('AAPL')).toBe(false);
  });

  it('update patches an existing entry', () => {
    const { result } = renderHook(() => useWatchlist());
    act(() => { result.current.add(APPLE); });
    act(() => {
      result.current.update('AAPL', {
        notes: 'Updated note',
        targetBuyPrice: 150,
      });
    });
    const entry = result.current.entries.find((e) => e.ticker === 'AAPL');
    expect(entry?.notes).toBe('Updated note');
    expect(entry?.targetBuyPrice).toBe(150);
  });

  it('update does not affect other entries', () => {
    const { result } = renderHook(() => useWatchlist());
    act(() => {
      result.current.add(APPLE);
      result.current.add(TOYOTA);
    });
    act(() => { result.current.update('AAPL', { notes: 'Changed' }); });
    const toyota = result.current.entries.find((e) => e.ticker === '7203.T');
    expect(toyota?.notes).toBe('Long-term hold');
  });

  it('persists entries to localStorage on add', () => {
    const { result } = renderHook(() => useWatchlist());
    act(() => { result.current.add(APPLE); });
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'sv-watchlist-v1',
      expect.stringContaining('AAPL'),
    );
  });

  it('persists entries to localStorage on remove', () => {
    const { result } = renderHook(() => useWatchlist());
    act(() => { result.current.add(APPLE); });
    act(() => { result.current.remove('AAPL'); });
    const lastCall = localStorageMock.setItem.mock.calls.at(-1);
    expect(lastCall?.[1]).toBe('[]');
  });

  it('stores all fields including tags and target prices', () => {
    const { result } = renderHook(() => useWatchlist());
    act(() => { result.current.add(TOYOTA); });
    const entry = result.current.entries[0];
    expect(entry?.tags).toContain('long-term');
    expect(entry?.tags).toContain('JP');
    expect(entry?.targetBuyPrice).toBe(2500);
    expect(entry?.targetSellPrice).toBe(3200);
    expect(entry?.notes).toBe('Long-term hold');
  });

  it('handles multiple entries correctly', () => {
    const { result } = renderHook(() => useWatchlist());
    act(() => {
      result.current.add(APPLE);
      result.current.add(TOYOTA);
    });
    expect(result.current.entries).toHaveLength(2);
    expect(result.current.has('AAPL')).toBe(true);
    expect(result.current.has('7203.T')).toBe(true);
  });
});