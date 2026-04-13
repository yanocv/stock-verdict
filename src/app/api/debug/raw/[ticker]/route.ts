/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { yf } from '@/lib/services/yahooFinance';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const t = /^\d{4}$/.test(ticker) ? `${ticker}.T` : ticker.toUpperCase();

  const result: any = await yf.quoteSummary(t, {
    modules: [
      'incomeStatementHistory' as const,
      'balanceSheetHistory' as const,
      'cashflowStatementHistory' as const,
    ],
  });

  const firstIncome = result?.incomeStatementHistory?.incomeStatementHistory?.[0] ?? null;
  const firstBalance = result?.balanceSheetHistory?.balanceSheetStatements?.[0] ?? null;
  const firstCashflow = result?.cashflowStatementHistory?.cashflowStatements?.[0] ?? null;

  return NextResponse.json({
    incomeKeys: firstIncome ? Object.keys(firstIncome) : [],
    incomeRaw: firstIncome,
    balanceKeys: firstBalance ? Object.keys(firstBalance) : [],
    balanceRaw: firstBalance,
    cashflowKeys: firstCashflow ? Object.keys(firstCashflow) : [],
    cashflowRaw: firstCashflow,
  });
}