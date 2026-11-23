import type { FinancialHistory, FinancialMetrics } from '@/types';

/**
 * Corrects quote fields that contradict the company's own statements.
 *
 * Free cash flow: replaces Yahoo's last-12-month figure with the latest
 * annual statement figure when one exists. The quote field is unreliable: TDK
 * showed −¥34B against +¥209B in its annual statement, MHI ¥1,057B against
 * ¥290B (Nov 2026). Scores and lens checks that read `freeCashFlow` then
 * use the reported number.
 */
export function completeFinancials(
  financials: FinancialMetrics,
  history: Pick<FinancialHistory, 'cashFlowAnnual'> & Partial<Pick<FinancialHistory, 'incomeAnnual'>> | null | undefined,
  quote?: { sharesOutstanding: number; currentPrice: number }
): FinancialMetrics {
  const latestFcf = latestValue(history?.cashFlowAnnual ?? [], (p) => p.freeCashFlow);
  let result = latestFcf === undefined ? financials : { ...financials, freeCashFlow: latestFcf };

  // EPS: Yahoo's trailing figure can be stale or wrong, e.g. right after a
  // stock split (Tokio Marine 15:1, Sep 2026: −¥4.29 vs +¥19 from its
  // statements). When it contradicts the latest annual statement (opposite
  // sign, or more than 2× off), use net income ÷ shares and recompute P/E.
  const netIncome = latestValue(history?.incomeAnnual ?? [], (p) => p.netIncome);
  if (netIncome !== undefined && quote && quote.sharesOutstanding > 0) {
    const statementEps = netIncome / quote.sharesOutstanding;
    const yahooEps = financials.eps;
    const contradicts =
      yahooEps === null ||
      Math.sign(yahooEps) !== Math.sign(statementEps) ||
      (statementEps !== 0 && (yahooEps / statementEps > 2 || yahooEps / statementEps < 0.5));
    if (contradicts) {
      result = {
        ...result,
        eps: statementEps,
        peRatio: statementEps > 0 && quote.currentPrice > 0 ? quote.currentPrice / statementEps : null,
      };
    }
  }
  return result;
}

/** Most recent finite value of a statement field (by period end date). */
function latestValue<T extends { endDate: string }>(
  periods: T[],
  pick: (p: T) => number | null | undefined
): number | undefined {
  return [...periods]
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
    .map(pick)
    .find((v): v is number => typeof v === 'number' && Number.isFinite(v));
}
