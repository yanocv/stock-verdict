import { fetchStockData } from '@/lib/services/yahooFinance';
import { fetchMacroData } from '@/lib/services/macroService';
import { generateVerdict } from '@/lib/scoring/verdictEngine';
import { scoreMacro } from '@/lib/scoring/macroScore';
import { determineMacroRegime } from '@/lib/scoring/macroRegime';
import type { MacroData } from '@/types';
import { getBenchmarksForSector } from '@/lib/benchmarks/industries';
import { NIKKEI_UNIVERSE } from '@/lib/screener/nikkeiUniverse';
import { runAdvancedDCFForStock } from '@/lib/formulas/dcfAdvanced';
import { estimateFairValue, isFinancialCompany } from '@/lib/formulas/fairValue';
import { completeBalanceSheet } from '@/lib/formulas/balanceSheet';
import { completeFinancials } from '@/lib/formulas/statements';
import { getVerdictLog, getResearchStore } from '@/lib/db/instances';
import { applyEvents, eventReasons } from '@/lib/research/eventAdjustment';
import { DEFAULT_ENGINE_PARAMS } from '@/lib/scoring/params';
import { fetchFinancialHistory } from '@/lib/services/financialHistoryService';

export interface ScreenerResult {
  ticker: string;
  name: string;
  sector: string;
  recommendation: 'BUY' | 'WAIT' | 'AVOID';
  score: number;
  currentPrice: number;
  currency: string;
  fairValue: number | null;
  upside: number | null;
  error?: string;
}

const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 450;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Market inputs fetched once per scan and shared by every ticker. */
interface MarketContext {
  macroData: MacroData;
  macroScore: number;
  /** Extra margin of safety (decimal) required by the market regime */
  requiredMosBonus: number;
  regime: string;
}

async function processTicker(
  ticker: string,
  name: string,
  sector: string,
  { macroData, macroScore, requiredMosBonus, regime }: MarketContext
): Promise<ScreenerResult> {
  // History is needed so screener fair values match the full analysis
  const [stockData, history] = await Promise.all([fetchStockData(ticker), fetchFinancialHistory(ticker)]);
  const { overview } = stockData;
  const financials = completeFinancials(stockData.financials, history, overview);
  const balanceSheet = completeBalanceSheet(stockData.balanceSheet, history);
  const benchmarks = getBenchmarksForSector(overview.sector || sector, overview.industry);
  const dcfAnalysis = runAdvancedDCFForStock(overview, financials, balanceSheet, history, macroData);
  const modelEstimate = estimateFairValue({ overview, financials, history, dcf: dcfAnalysis, benchmarks });
  // Saved AI research (free; the screener never starts new research), so verdicts match the stock page
  const events = getResearchStore()?.latest(overview.ticker)?.events ?? [];
  const currentYear = new Date().getUTCFullYear();
  const eventAdjustment = applyEvents(modelEstimate, events, dcfAnalysis.wacc ?? 0.08, currentYear);
  const fairValue = eventAdjustment.estimate;
  const isBank = modelEstimate.method === 'pb-roe';

  const verdict = generateVerdict({
    financials,
    balanceSheet,
    price: overview.currentPrice,
    industryBenchmarks: benchmarks,
    sector: overview.sector || sector,
    macroScore,
    newsScore: 5, // neutral — skip per-ticker news fetch to keep screener fast
    dcfFairValuePerShare: fairValue.value,
    sharesOutstanding: overview.sharesOutstanding,
    currencyMismatch: dcfAnalysis.currencyMismatch != null,
    requiredMosBonus,
    nonOperatingEarnings: fairValue.unavailableReason === 'non-operating-earnings',
    bearFairValuePerShare: fairValue.bear,
    financialCompany: isFinancialCompany(overview),
    equityToAssets: balanceSheet.totalAssets > 0 ? balanceSheet.shareholderEquity / balanceSheet.totalAssets : null,
    uncertainValue: fairValue.method === 'dcf-earnings' || fairValue.adjustment === 'capped' || eventAdjustment.severe,
    impliedGrowth: isBank ? null : dcfAnalysis.impliedGrowthRate ?? null,
    modelGrowth: isBank ? null : dcfAnalysis.growthRate,
    extraReasons: eventReasons(eventAdjustment, events),
  });

  try {
    getVerdictLog()?.save({
      stock: {
        ticker: overview.ticker, name: overview.name, sector: overview.sector, industry: overview.industry,
        currency: overview.currency, financialCurrency: overview.financialCurrency,
      },
      source: 'screener',
      price: overview.currentPrice,
      dataAsOf: null,
      verdict,
      fairValue: {
        bear: fairValue.bear, bull: fairValue.bull, method: fairValue.method,
        note: fairValue.unavailableReason ?? fairValue.adjustment,
      },
      regime,
      regimeMosBonus: requiredMosBonus,
      params: DEFAULT_ENGINE_PARAMS,
      inputs: { financials, balanceSheet, dcf: dcfAnalysis, macro: macroData, research: events },
    });
  } catch (err) {
    console.error('[verdict log] save failed:', err);
  }

  const upside =
    verdict.fairValue !== null && overview.currentPrice > 0
      ? Math.round(((verdict.fairValue - overview.currentPrice) / overview.currentPrice) * 100)
      : null;

  return {
    ticker,
    name: overview.name || name,
    sector: overview.sector || sector,
    recommendation: verdict.recommendation,
    score: verdict.scores.overall,
    currentPrice: overview.currentPrice,
    currency: overview.currency,
    fairValue: verdict.fairValue,
    upside,
  };
}

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Fetch macro once — shared across all tickers
        const macroData = await fetchMacroData();
        const regimeResult = determineMacroRegime(macroData);
        const market: MarketContext = {
          macroData,
          macroScore: scoreMacro(macroData),
          requiredMosBonus: regimeResult.marginOfSafetyBonus / 100,
          regime: regimeResult.regime,
        };

        let processed = 0;
        const total = NIKKEI_UNIVERSE.length;

        for (let i = 0; i < total; i += BATCH_SIZE) {
          const batch = NIKKEI_UNIVERSE.slice(i, i + BATCH_SIZE);

          const batchResults = await Promise.allSettled(
            batch.map(({ ticker, name, sector }) =>
              processTicker(ticker, name, sector, market)
            )
          );

          for (let j = 0; j < batchResults.length; j++) {
            processed++;
            const r = batchResults[j]!;
            const meta = batch[j]!;

            if (r.status === 'fulfilled') {
              send({ ...r.value, processed, total });
            } else {
              send({
                ticker: meta.ticker,
                name: meta.name,
                sector: meta.sector,
                recommendation: 'AVOID' as const,
                score: 0,
                currentPrice: 0,
                currency: 'JPY',
                fairValue: null,
                upside: null,
                error: 'Failed to fetch data',
                processed,
                total,
              });
            }
          }

          if (i + BATCH_SIZE < total) {
            await sleep(BATCH_DELAY_MS);
          }
        }

        send({ done: true, total });
      } catch (err) {
        send({ done: true, total: NIKKEI_UNIVERSE.length, fatalError: err instanceof Error ? err.message : 'Unknown error' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Keep the route dynamic (no static caching)
export const dynamic = 'force-dynamic';
