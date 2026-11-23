import type { FinancialHistory, FinancialMetrics } from '@/types';

/**
 * Replaces Yahoo's last-12-month free cash flow with the latest annual
 * statement figure when one exists. The quote field is unreliable: TDK
 * showed −¥34B against +¥209B in its annual statement, MHI ¥1,057B against
 * ¥290B (Nov 2026). Scores and lens checks that read `freeCashFlow` then
 * use the reported number.
 */
export function completeFinancials(
  financials: FinancialMetrics,
  history: Pick<FinancialHistory, 'cashFlowAnnual'> | null | undefined
): FinancialMetrics {
  const latest = [...(history?.cashFlowAnnual ?? [])]
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
    .map((p) => p.freeCashFlow)
    .find((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return latest === undefined ? financials : { ...financials, freeCashFlow: latest };
}
