/** Where an index stands against its own recent history (not its absolute level). */
export interface IndexTrend {
  /** % above (+) or below (−) the 200-day average */
  vsSma200Pct: number;
  /** % below the highest close of the last 52 weeks (0 = at the high) */
  drawdownPct: number;
}

export interface MacroData {
  bojRate: number | null;
  fedRate: number | null;
  usdJpy: number | null;
  oilPrice: number | null;
  goldPrice: number | null;
  nikkei225: number | null;
  sp500: number | null;
  vix: number | null;
  /** US 10-year Treasury yield, % (e.g. 4.99) */
  usTenYearYield: number | null;
  /** Japan 10-year government bond yield, % (Ministry of Finance) */
  jgbTenYearYield: number | null;
  sp500Trend: IndexTrend | null;
  nikkeiTrend: IndexTrend | null;
}
