import { NextRequest, NextResponse } from 'next/server';
import { fetchStockData } from '@/lib/services/yahooFinance';
import { fetchMacroData } from '@/lib/services/macroService';
import { fetchStockNews, scoreNews } from '@/lib/services/newsService';
import { fetchFinancialHistory, fetchPriceHistory } from '@/lib/services/financialHistoryService';
import { generateVerdict } from '@/lib/scoring/verdictEngine';
import { evaluateBuffett } from '@/lib/scoring/buffettScore';
import { evaluateGraham } from '@/lib/scoring/grahamScore';
import { evaluateLynch } from '@/lib/scoring/lynchScore';
import { scoreMacro } from '@/lib/scoring/macroScore';
import { getBenchmarksForSector } from '@/lib/benchmarks/industries';
import type { StockVerdictResponse } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  if (!ticker || ticker.trim().length === 0) {
    return NextResponse.json(
      { error: 'Ticker symbol is required' },
      { status: 400 }
    );
  }

  // Normalize Japanese tickers: "7203" → "7203.T"
  const normalizedTicker = /^\d{4}$/.test(ticker) ? `${ticker}.T` : ticker.toUpperCase();

  try {
    // 1. Fetch all data in parallel
    const [stockData, macroData, news, financialHistory, priceHistory] = await Promise.all([
      fetchStockData(normalizedTicker),
      fetchMacroData(),
      fetchStockNews(normalizedTicker),
      fetchFinancialHistory(normalizedTicker),
      fetchPriceHistory(normalizedTicker),
    ]);

    const { overview, financials, balanceSheet, incomeStatement, calendarData } = stockData;

    // 2. Score macro and news
    const macroScore = scoreMacro(macroData);
    const newsScore = scoreNews(news);

    // 3. Get industry benchmarks for the sector
    const benchmarks = getBenchmarksForSector(overview.sector);

    // 4. Run the master verdict engine with real macro and news scores
    const verdict = generateVerdict({
      financials,
      balanceSheet,
      price: overview.currentPrice,
      industryBenchmarks: benchmarks,
      sector: overview.sector,
      macroScore,
      newsScore,
    });

    // 5. Run individual investor lenses
    const buffett = evaluateBuffett(financials, balanceSheet);
    const graham = evaluateGraham(financials, balanceSheet, {
      currentPrice: overview.currentPrice,
    });
    const lynch = evaluateLynch(financials, balanceSheet);

    // 6. Fix per-share values using real shares outstanding
    if (overview.sharesOutstanding > 1) {
      if (buffett.fairValue !== null) {
        buffett.fairValue = buffett.fairValue / overview.sharesOutstanding;
        buffett.buyBelow = buffett.fairValue * 0.75;
      }
      if (verdict.fairValue !== null) {
        verdict.fairValue = verdict.fairValue / overview.sharesOutstanding;
        verdict.suggestedBuyPrice = verdict.fairValue * 0.75;
      }
    }

    const response: StockVerdictResponse = {
      overview,
      financials,
      balanceSheet,
      incomeStatement,
      verdict,
      investorVerdicts: {
        buffett,
        graham,
        lynch,
      },
      news,
      macroData,
      calendarData,
      financialHistory,
      priceHistory,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch stock data';

    if (message.includes('Not Found') || message.includes('no symbol')) {
      return NextResponse.json(
        { error: `Ticker "${ticker}" not found. Try a valid symbol like AAPL or 7203.T` },
        { status: 404 }
      );
    }

    console.error(`[API] /api/stock/${ticker} error:`, error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}