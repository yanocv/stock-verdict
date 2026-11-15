import type { BalanceSheet, FinancialHistory, FinancialPeriod } from '@/types';

/** Balance sheet fields the statement history can supply. */
const FIELDS = [
  'totalCurrentAssets',
  'totalCurrentLiabilities',
  'totalAssets',
  'totalLiabilities',
  'shareholderEquity',
  'longTermDebt',
  'totalDebt',
  'cash',
  'retainedEarnings',
] as const satisfies ReadonlyArray<keyof BalanceSheet & keyof FinancialPeriod>;

/**
 * Fills balance sheet fields the quote snapshot left at 0 with the most
 * recent value from the statement history (quarterly or annual, whichever is
 * newer). Yahoo's snapshot module returns no balance sheet since Nov 2024, so
 * equity, assets and liabilities arrive as 0; debt and cash come from another
 * module and are kept when present, since they are more current.
 */
export function completeBalanceSheet(
  snapshot: BalanceSheet,
  history: Pick<FinancialHistory, 'balanceAnnual' | 'balanceQuarterly'> | null | undefined
): BalanceSheet {
  if (!history) {return snapshot;}
  const newestFirst = [...history.balanceAnnual, ...history.balanceQuarterly].sort(
    (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
  );

  const filled = { ...snapshot };
  for (const field of FIELDS) {
    if (snapshot[field] !== 0) {continue;}
    const value = newestFirst.map((p) => p[field]).find((v) => typeof v === 'number' && Number.isFinite(v));
    if (typeof value === 'number') {filled[field] = value;}
  }
  return filled;
}
