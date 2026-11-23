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
import { runAdvancedDCFForStock } from '@/lib/formulas/dcfAdvanced';
import { estimateFairValue, isFinancialCompany } from '@/lib/formulas/fairValue';
import { completeBalanceSheet } from '@/lib/formulas/balanceSheet';
import { completeFinancials } from '@/lib/formulas/statements';
import { getVerdictLog, getResearchStore } from '@/lib/db/instances';
import { getCompanyResearch, readResearchConfig } from '@/lib/research/getResearch';
import { applyEvents, eventReasons } from '@/lib/research/eventAdjustment';
import { DEFAULT_ENGINE_PARAMS } from '@/lib/scoring/params';
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

    const { overview, incomeStatement, calendarData, analystConsensus } = stockData;
    // Free cash flow from the annual statements; Yahoo's 12-month figure is unreliable
    const financials = completeFinancials(stockData.financials, financialHistory, overview);
    // Yahoo's snapshot has no balance sheet any more; take it from the statements
    const balanceSheet = completeBalanceSheet(stockData.balanceSheet, financialHistory);

    // 2. Score macro and news
    const macroScore = scoreMacro(macroData);
    const newsScore = scoreNews(news);

    // 3. Macro regime gate (per investment philosophy)
    const macroRegime = determineMacroRegime(macroData);

    // 4. Get industry benchmarks for the sector
    const benchmarks = getBenchmarksForSector(overview.sector, overview.industry);

    // 5. Technical indicators from price history
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

    // 6. Advanced DCF with WACC + sensitivity table
    const dcfAnalysis = runAdvancedDCFForStock(overview, financials, balanceSheet, financialHistory, macroData);
    const modelEstimate = estimateFairValue({
      overview,
      financials,
      history: financialHistory,
      dcf: dcfAnalysis,
      benchmarks,
    });

    // 6b. AI research on known company events (cached, budget-guarded, off without a key).
    // The engine turns sourced negative events into a lower fair value by fixed rules.
    const currentYear = new Date().getUTCFullYear();
    const isBank = modelEstimate.method === 'pb-roe';
    const impliedGrowth = isBank ? null : dcfAnalysis.impliedGrowthRate ?? null;
    const modelGrowth = isBank ? null : dcfAnalysis.growthRate;
    const store = getResearchStore();
    const researchOutcome = store
      ? await getCompanyResearch(
          {
            ticker: overview.ticker, name: overview.name, industry: overview.industry, currency: overview.currency,
            currentYear, impliedGrowth, modelGrowth, eps: financials.eps,
            forwardEps: financials.forwardEps ?? null, nextYearEps: financials.nextYearEps ?? null,
          },
          { store, config: readResearchConfig() }
        )
      : { status: 'error' as const, research: null };
    const events = researchOutcome.research?.events ?? [];
    const eventAdjustment = applyEvents(modelEstimate, events, dcfAnalysis.wacc ?? 0.08, currentYear);
    const fairValueEstimate = eventAdjustment.estimate;

    // 7. Run the master verdict engine with real macro, news, technicals and DCF
    const verdict = generateVerdict({
      financials,
      balanceSheet,
      price: overview.currentPrice,
      industryBenchmarks: benchmarks,
      sector: overview.sector,
      macroScore,
      newsScore,
      technicalIndicators,
      dcfFairValuePerShare: fairValueEstimate.value,
      sharesOutstanding: overview.sharesOutstanding,
      currencyMismatch: dcfAnalysis.currencyMismatch != null,
      requiredMosBonus: macroRegime.marginOfSafetyBonus / 100,
      nonOperatingEarnings: fairValueEstimate.unavailableReason === 'non-operating-earnings',
      bearFairValuePerShare: fairValueEstimate.bear,
      financialCompany: isFinancialCompany(overview),
      equityToAssets: balanceSheet.totalAssets > 0 ? balanceSheet.shareholderEquity / balanceSheet.totalAssets : null,
      uncertainValue:
        fairValueEstimate.method === 'dcf-earnings' || fairValueEstimate.adjustment === 'capped' || eventAdjustment.severe,
      impliedGrowth,
      modelGrowth,
      extraReasons: eventReasons(eventAdjustment, events),
    });

    // 8. Run individual investor lenses
    const buffett = evaluateBuffett(financials, balanceSheet);
    const graham = evaluateGraham(financials, balanceSheet, {
      currentPrice: overview.currentPrice,
      sharesOutstanding: overview.sharesOutstanding,
    });
    const lynch = evaluateLynch(financials, balanceSheet);

    // 9. Buffett's intrinsic value is the verdict's fair value: one cash-flow
    // estimate for the whole page, instead of a second DCF on Yahoo's TTM FCF
    buffett.fairValue = fairValueEstimate.value;
    buffett.buyBelow = fairValueEstimate.value !== null ? fairValueEstimate.value * 0.75 : null;

    // Lens fair values come from statement amounts and earnings — meaningless
    // when the statements use another currency than the price (ADRs) or the
    // profit doesn't come from operations
    if (fairValueEstimate.unavailableReason !== null) {
      for (const lens of [buffett, graham, lynch]) {
        lens.fairValue = null;
        lens.buyBelow = null;
      }
    }

    // 10. Japan 6-gate TOPIX filter
    const japanFilter = runJapanFilter(
      normalizedTicker,
      financials,
      { cash: balanceSheet.cash, totalDebt: balanceSheet.totalDebt },
      overview.sector,
      overview.industry
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
      fairValueEstimate,
      japanFilter,
      research: {
        status: researchOutcome.status,
        researchedAt: researchOutcome.research?.researchedAt ?? null,
        model: researchOutcome.research?.model ?? null,
        summary: researchOutcome.research?.summary ?? null,
        events,
        appliedTitles: eventAdjustment.applied.map((a) => a.event.title),
        valueFactor: eventAdjustment.factor,
      },
    };

    // 12. Decision journal: record the verdict and what it was based on (never blocks the response)
    try {
      getVerdictLog()?.save({
        stock: {
          ticker: overview.ticker, name: overview.name, sector: overview.sector, industry: overview.industry,
          currency: overview.currency, financialCurrency: overview.financialCurrency,
        },
        source: 'full',
        price: overview.currentPrice,
        dataAsOf: priceHistory.at(-1)?.date ?? null,
        verdict,
        fairValue: {
          bear: fairValueEstimate.bear, bull: fairValueEstimate.bull, method: fairValueEstimate.method,
          note: fairValueEstimate.unavailableReason ?? fairValueEstimate.adjustment,
        },
        regime: macroRegime.regime,
        regimeMosBonus: macroRegime.marginOfSafetyBonus / 100,
        params: DEFAULT_ENGINE_PARAMS,
        inputs: {
          financials, balanceSheet, dcf: dcfAnalysis, technicals: technicalIndicators, macro: macroData,
          research: response.research,
        },
      });
    } catch (err) {
      console.error('[verdict log] save failed:', err);
    }

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