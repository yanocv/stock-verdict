import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { fetchStockData } from '@/lib/services/yahooFinance';
import { fetchMacroData } from '@/lib/services/macroService';
import { fetchStockNews, scoreNews } from '@/lib/services/newsService';
import { fetchFinancialHistory, fetchPriceHistory } from '@/lib/services/financialHistoryService';
import { generateVerdict } from '@/lib/scoring/verdictEngine';
import { evaluateBuffett } from '@/lib/scoring/buffettScore';
import { evaluateGraham } from '@/lib/scoring/grahamScore';
import { evaluateLynch } from '@/lib/scoring/lynchScore';
import { scoreMacro } from '@/lib/scoring/macroScore';
import { determineMacroRegime } from '@/lib/scoring/macroRegime';
import { runJapanFilter } from '@/lib/scoring/japanFilter';
import { getBenchmarksForSector } from '@/lib/benchmarks/industries';
import { generateAINarrative } from '@/lib/services/claudeService';
import { calculateRSI, classifyRSI, calculateSMA, extractCloses } from '@/lib/formulas/rsi';
import { runAdvancedDCF } from '@/lib/formulas/dcfAdvanced';
import type { StockVerdictResponse, TechnicalIndicators } from '@/types';

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

    const { overview, financials, balanceSheet, incomeStatement, calendarData, analystConsensus } = stockData;

    // 2. Score macro and news
    const macroScore = scoreMacro(macroData);
    const newsScore = scoreNews(news);

    // 3. Macro regime gate (per investment philosophy)
    const macroRegime = determineMacroRegime(macroData);

    // 4. Get industry benchmarks for the sector
    const benchmarks = getBenchmarksForSector(overview.sector);

    // 5. Run the master verdict engine with real macro and news scores
    const verdict = generateVerdict({
      financials,
      balanceSheet,
      price: overview.currentPrice,
      industryBenchmarks: benchmarks,
      sector: overview.sector,
      macroScore,
      newsScore,
    });

    // 6. Run individual investor lenses
    const buffett = evaluateBuffett(financials, balanceSheet);
    const graham = evaluateGraham(financials, balanceSheet, {
      currentPrice: overview.currentPrice,
    });
    const lynch = evaluateLynch(financials, balanceSheet);

    // 7. Fix per-share values using real shares outstanding
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

    // 8. Technical indicators from price history
    const closes = extractCloses(priceHistory);
    const rsi = calculateRSI(closes);
    const rsiSignal = rsi !== null ? classifyRSI(rsi) : null;
    const sma50 = calculateSMA(closes, 50);
    const sma200 = calculateSMA(closes, 200);
    const currentPrice = overview.currentPrice;

    const rangeHigh = overview.fiftyTwoWeekHigh;
    const rangeLow = overview.fiftyTwoWeekLow;
    const fiftyTwoWeekPosition =
      rangeHigh > rangeLow
        ? Math.round(((currentPrice - rangeLow) / (rangeHigh - rangeLow)) * 100)
        : null;

    const technicalIndicators: TechnicalIndicators = {
      rsi,
      rsiSignal,
      fiftyTwoWeekPosition,
      sma50,
      sma200,
      trendVsSma50: sma50 !== null ? (currentPrice > sma50 ? 'above' : 'below') : null,
      trendVsSma200: sma200 !== null ? (currentPrice > sma200 ? 'above' : 'below') : null,
    };

    // 9. Advanced DCF with WACC + sensitivity table
    const netDebt = balanceSheet.totalDebt - balanceSheet.cash;
    const fcfGrowthRate = Math.min(0.20, Math.max(-0.05, (financials.epsGrowth ?? 5) / 100));

    const dcfAnalysis = runAdvancedDCF({
      freeCashFlow: financials.freeCashFlow ?? 0,
      sharesOutstanding: overview.sharesOutstanding,
      netDebt,
      beta: financials.beta ?? 1.0,
      growthRate: fcfGrowthRate,
      riskFreeRate: null, // will use DEFAULT_RISK_FREE_RATE (4.5%)
      currentPrice: overview.currentPrice,
    });

    // 10. Japan 6-gate TOPIX filter
    const japanFilter = runJapanFilter(
      normalizedTicker,
      financials,
      { cash: balanceSheet.cash, totalDebt: balanceSheet.totalDebt },
      overview.sector
    );

    // 11. Generate AI narrative (non-blocking — null if key not set or call fails)
    const locale = _request.headers.get('x-locale') ?? 'en';
    const aiNarrative = await generateAINarrative({
      overview,
      financials,
      verdict,
      news,
      macroData,
      locale,
    });

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
      macroRegime,
      calendarData,
      financialHistory,
      priceHistory,
      aiNarrative,
      analystConsensus,
      technicalIndicators,
      dcfAnalysis,
      japanFilter,
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