/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { fetchFinancialHistory, fetchPriceHistory } from '@/lib/services/financialHistoryService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const t = /^\d{4}$/.test(ticker) ? `${ticker}.T` : ticker.toUpperCase();

  const [history, priceHistory] = await Promise.all([
    fetchFinancialHistory(t),
    fetchPriceHistory(t),
  ]);

  return NextResponse.json({
    ticker: t,
    priceHistoryCount: priceHistory.length,
    priceHistorySample: priceHistory.slice(0, 3),
    incomeAnnualCount: history.incomeAnnual.length,
    incomeAnnualSample: history.incomeAnnual.slice(0, 2),
    incomeQuarterlyCount: history.incomeQuarterly.length,
    balanceAnnualCount: history.balanceAnnual.length,
    balanceAnnualSample: history.balanceAnnual.slice(0, 2),
    cashFlowAnnualCount: history.cashFlowAnnual.length,
    cashFlowAnnualSample: history.cashFlowAnnual.slice(0, 2),
  });
}