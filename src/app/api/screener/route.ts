import { fetchStockData } from '@/lib/services/yahooFinance';
import { fetchMacroData } from '@/lib/services/macroService';
import { generateVerdict } from '@/lib/scoring/verdictEngine';
import { scoreMacro } from '@/lib/scoring/macroScore';
import { getBenchmarksForSector } from '@/lib/benchmarks/industries';
import { NIKKEI_UNIVERSE } from '@/lib/screener/nikkeiUniverse';
import { runAdvancedDCFForStock } from '@/lib/formulas/dcfAdvanced';

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

async function processTicker(
  ticker: string,
  name: string,
  sector: string,
  macroScore: number
): Promise<ScreenerResult> {
  const stockData = await fetchStockData(ticker);
  const { overview, financials, balanceSheet } = stockData;
  const benchmarks = getBenchmarksForSector(overview.sector || sector);
  const dcfAnalysis = runAdvancedDCFForStock(overview, financials, balanceSheet);

  const verdict = generateVerdict({
    financials,
    balanceSheet,
    price: overview.currentPrice,
    industryBenchmarks: benchmarks,
    sector: overview.sector || sector,
    macroScore,
    newsScore: 5, // neutral — skip per-ticker news fetch to keep screener fast
    dcfFairValuePerShare: dcfAnalysis.baseCase,
    sharesOutstanding: overview.sharesOutstanding,
  });

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
        const macroScore = scoreMacro(macroData);

        let processed = 0;
        const total = NIKKEI_UNIVERSE.length;

        for (let i = 0; i < total; i += BATCH_SIZE) {
          const batch = NIKKEI_UNIVERSE.slice(i, i + BATCH_SIZE);

          const batchResults = await Promise.allSettled(
            batch.map(({ ticker, name, sector }) =>
              processTicker(ticker, name, sector, macroScore)
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
