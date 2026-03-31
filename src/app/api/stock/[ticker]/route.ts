import { NextRequest, NextResponse } from 'next/server';

// TODO: Phase 2 - Implement stock data fetching
// This route will:
// 1. Accept a ticker parameter (e.g. AAPL, 7203.T)
// 2. Fetch stock data from Yahoo Finance / Alpha Vantage
// 3. Run the verdict engine
// 4. Return a structured VerdictResponse
//
// Example response shape:
// {
//   overview: StockOverview,
//   financials: FinancialMetrics,
//   balanceSheet: BalanceSheet,
//   verdict: Verdict,
//   investorVerdicts: { buffett: InvestorVerdict, graham: InvestorVerdict, lynch: InvestorVerdict }
// }

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  return NextResponse.json(
    { message: `Stock data for ${ticker} — coming in Phase 2` },
    { status: 501 }
  );
}
