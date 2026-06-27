'use client';

import { useState } from 'react';
import { Bookmark, BookmarkCheck, X, Tag, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWatchlist, type WatchlistTag, type WatchlistEntry } from '@/hooks/useWatchlist';

interface WatchlistButtonProps {
  ticker: string;
  name: string;
}

const ALL_TAGS: WatchlistTag[] = ['long-term', 'swing', 'dividend', 'JP', 'US', 'growth', 'value'];

export function WatchlistButton({ ticker, name }: WatchlistButtonProps) {
  const { has, add, remove, update, entries } = useWatchlist();
  const isWatched = has(ticker);
  const entry = entries.find((e) => e.ticker === ticker);

  const [showPanel, setShowPanel] = useState(false);
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [tags, setTags] = useState<WatchlistTag[]>(entry?.tags ?? []);
  const [buyPrice, setBuyPrice] = useState(entry?.targetBuyPrice?.toString() ?? '');
  const [sellPrice, setTargetSellPrice] = useState(entry?.targetSellPrice?.toString() ?? '');

  function handleToggle() {
    if (isWatched) {
      remove(ticker);
      setShowPanel(false);
    } else {
      const newEntry: Omit<WatchlistEntry, 'addedAt'> = {
        ticker,
        name,
        notes,
        tags,
        targetBuyPrice: buyPrice ? parseFloat(buyPrice) : null,
        targetSellPrice: sellPrice ? parseFloat(sellPrice) : null,
      };
      add(newEntry);
      setShowPanel(true);
    }
  }

  function handleSave() {
    update(ticker, {
      notes,
      tags,
      targetBuyPrice: buyPrice ? parseFloat(buyPrice) : null,
      targetSellPrice: sellPrice ? parseFloat(sellPrice) : null,
    });
    setShowPanel(false);
  }

  function toggleTag(tag: WatchlistTag) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  return (
    <div className="relative">
      <Button
        variant={isWatched ? 'default' : 'outline'}
        size="sm"
        onClick={handleToggle}
        className="gap-1.5"
      >
        {isWatched ? (
          <BookmarkCheck className="h-4 w-4" />
        ) : (
          <Bookmark className="h-4 w-4" />
        )}
        {isWatched ? 'Watching' : 'Add to Watchlist'}
      </Button>

      {/* Edit panel — shown after adding */}
      {showPanel && isWatched && (
        <div className="absolute right-0 top-10 z-50 w-72 rounded-xl border bg-background shadow-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{ticker} — Watchlist</span>
            <button onClick={() => setShowPanel(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
              <Tag className="h-3 w-3" /> Tags
            </div>
            <div className="flex flex-wrap gap-1">
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                    tags.includes(tag)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-transparent text-muted-foreground border-border hover:border-primary'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Target prices */}
          <div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
              <DollarSign className="h-3 w-3" /> Price targets
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Buy below</label>
                <input
                  type="number"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  placeholder="e.g. 150"
                  className="w-full text-xs border rounded px-2 py-1 bg-background mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Sell above</label>
                <input
                  type="number"
                  value={sellPrice}
                  onChange={(e) => setTargetSellPrice(e.target.value)}
                  placeholder="e.g. 200"
                  className="w-full text-xs border rounded px-2 py-1 bg-background mt-0.5"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] text-muted-foreground">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Your investment thesis…"
              rows={2}
              className="w-full text-xs border rounded px-2 py-1 bg-background mt-0.5 resize-none"
            />
          </div>

          <Button size="sm" className="w-full" onClick={handleSave}>
            Save
          </Button>
        </div>
      )}

      {/* Edit icon when already watching */}
      {isWatched && !showPanel && (
        <button
          onClick={() => setShowPanel(true)}
          className="ml-1 text-[11px] text-muted-foreground hover:text-foreground underline"
        >
          edit
        </button>
      )}
    </div>
  );
}