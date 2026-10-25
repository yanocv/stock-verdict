import { describe, it, expect } from 'vitest';
import type { MacroData } from '@/types';
import { classifyIndexTrend, determineMacroRegime } from './macroRegime';
import { scoreMacro } from './macroScore';
import { DEFAULT_ENGINE_PARAMS } from './params';

const r = DEFAULT_ENGINE_PARAMS.regime;

const empty: MacroData = {
  bojRate: null, fedRate: null, usdJpy: null, oilPrice: null, goldPrice: null,
  nikkei225: null, sp500: null, vix: null, usTenYearYield: null, jgbTenYearYield: null,
  sp500Trend: null, nikkeiTrend: null,
};

describe('classifyIndexTrend', () => {
  it('uptrend near the high is bullish', () => {
    expect(classifyIndexTrend({ vsSma200Pct: 5, drawdownPct: 3 }, r)).toBe('bullish');
  });

  it('below the 200-day average and well off the high is bearish', () => {
    expect(classifyIndexTrend({ vsSma200Pct: -4, drawdownPct: 14 }, r)).toBe('bearish');
  });

  it('a deep drop is bearish even above the 200-day average', () => {
    expect(classifyIndexTrend({ vsSma200Pct: 2, drawdownPct: 22 }, r)).toBe('bearish');
  });

  it('mixed signals are neutral', () => {
    expect(classifyIndexTrend({ vsSma200Pct: 3, drawdownPct: 12 }, r)).toBe('neutral');
    expect(classifyIndexTrend({ vsSma200Pct: -1, drawdownPct: 5 }, r)).toBe('neutral');
  });
});

describe('determineMacroRegime', () => {
  // The old rule called any S&P above 5,000 bullish; level alone must not count now
  it('ignores index levels', () => {
    const levelsOnly = { ...empty, sp500: 7700, nikkei225: 65000 };
    expect(determineMacroRegime(levelsOnly).signals).toEqual([]);
  });

  it('two indices in downtrends plus high fear → risk-off with the risk-off bonus', () => {
    const result = determineMacroRegime({
      ...empty,
      vix: 32,
      sp500Trend: { vsSma200Pct: -6, drawdownPct: 15 },
      nikkeiTrend: { vsSma200Pct: -8, drawdownPct: 18 },
    });
    expect(result.regime).toBe('risk-off');
    expect(result.marginOfSafetyBonus).toBe(r.mosBonus.riskOff * 100);
  });

  it('calm market with both indices in uptrends → risk-on, no bonus', () => {
    const result = determineMacroRegime({
      ...empty,
      vix: 14,
      sp500Trend: { vsSma200Pct: 6, drawdownPct: 2 },
      nikkeiTrend: { vsSma200Pct: 4, drawdownPct: 3 },
    });
    expect(result.regime).toBe('risk-on');
    expect(result.marginOfSafetyBonus).toBe(0);
  });
});

describe('scoreMacro', () => {
  it('scores indices by trend, not level', () => {
    const up = scoreMacro({ ...empty, sp500Trend: { vsSma200Pct: 5, drawdownPct: 2 } });
    const down = scoreMacro({ ...empty, sp500Trend: { vsSma200Pct: -5, drawdownPct: 15 } });
    expect(up).toBeGreaterThan(down);
    expect(scoreMacro({ ...empty, sp500: 7700 })).toBe(5); // level alone → neutral
  });
});
