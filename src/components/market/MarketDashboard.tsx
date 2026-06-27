'use client';

import { useMarket } from '@/hooks/useMarket';
import type { MarketIndex } from '@/app/api/market/route';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtPrice(price: number, symbol: string): string {
  // FX pairs shown to 2-4 decimals; indices to 0-2
  const isFX = symbol.includes('=X');
  if (isFX) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }
  return price.toLocaleString('en-US', {
    minimumFractionDigits: price > 1000 ? 0 : 2,
    maximumFractionDigits: price > 1000 ? 0 : 2,
  });
}

function fmtPct(pct: number): string {
  const abs = Math.abs(pct);
  const sign = pct >= 0 ? '+' : '−';
  return `${sign}${abs.toFixed(2)}%`;
}

function IndexCard({ idx }: { idx: MarketIndex }) {
  const up = idx.changePct > 0;
  const flat = idx.changePct === 0;
  const color = flat ? '#94a3b8' : up ? '#22c55e' : '#ef4444';
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;

  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 rounded-xl bg-slate-900/60 border border-white/5 min-w-[120px]">
      <span className="text-[10px] text-slate-500 font-semibold tracking-wide uppercase truncate">
        {idx.name}
      </span>
      <span className="text-white text-base font-bold tabular-nums leading-tight">
        {fmtPrice(idx.price, idx.symbol)}
      </span>
      <span className="flex items-center gap-1 text-[11px] font-semibold tabular-nums" style={{ color }}>
        <Icon className="h-3 w-3 shrink-0" />
        {fmtPct(idx.changePct)}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function MarketDashboard() {
  const { data, isLoading, isError, dataUpdatedAt } = useMarket();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-xs py-3">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        Loading market data…
      </div>
    );
  }

  if (isError || !data || data.indices.length === 0) {
    return null; // fail silently — market data is supplementary
  }

  const us = data.indices.filter((i) => i.region === 'US');
  const jp = data.indices.filter((i) => i.region === 'JP');
  const fx = data.indices.filter((i) => i.region === 'FX');

  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3">
      {/* ── US ── */}
      {us.length > 0 && (
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold ml-1">
            🇺🇸 US Markets
          </span>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {us.map((idx) => <IndexCard key={idx.symbol} idx={idx} />)}
          </div>
        </div>
      )}

      {/* ── Japan ── */}
      {jp.length > 0 && (
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold ml-1">
            🇯🇵 Japan Markets
          </span>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {jp.map((idx) => <IndexCard key={idx.symbol} idx={idx} />)}
          </div>
        </div>
      )}

      {/* ── FX ── */}
      {fx.length > 0 && (
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold ml-1">
            💱 FX
          </span>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {fx.map((idx) => <IndexCard key={idx.symbol} idx={idx} />)}
          </div>
        </div>
      )}

      {updatedAt && (
        <p className="text-[10px] text-slate-600 text-right">
          Updated {updatedAt} · refreshes every 5 min
        </p>
      )}
    </div>
  );
}