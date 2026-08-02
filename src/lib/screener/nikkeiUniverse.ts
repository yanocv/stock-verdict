/**
 * Curated list of 30 high-liquidity Nikkei 225 constituents.
 * Used by the Nikkei screener to find BUY candidates.
 *
 * Future: when watchlist has persistent storage (Supabase),
 * the screener will default to the user's watchlist instead.
 */
export interface NikkeiTicker {
  ticker: string;
  name: string;
  sector: string;
}

export const NIKKEI_UNIVERSE: NikkeiTicker[] = [
  // Technology & Electronics
  { ticker: '6758.T', name: 'Sony Group',              sector: 'Technology' },
  { ticker: '6861.T', name: 'Keyence',                 sector: 'Technology' },
  { ticker: '6954.T', name: 'Fanuc',                   sector: 'Industrials' },
  { ticker: '6902.T', name: 'Denso',                   sector: 'Technology' },
  { ticker: '6723.T', name: 'Renesas Electronics',     sector: 'Technology' },
  { ticker: '4063.T', name: 'Shin-Etsu Chemical',      sector: 'Technology' },
  // Semiconductors / Precision
  { ticker: '8035.T', name: 'Tokyo Electron',          sector: 'Technology' },
  { ticker: '6367.T', name: 'Daikin Industries',       sector: 'Industrials' },
  // Automotive
  { ticker: '7203.T', name: 'Toyota Motor',            sector: 'Consumer Discretionary' },
  { ticker: '7267.T', name: 'Honda Motor',             sector: 'Consumer Discretionary' },
  { ticker: '7269.T', name: 'Suzuki Motor',            sector: 'Consumer Discretionary' },
  { ticker: '7201.T', name: 'Nissan Motor',            sector: 'Consumer Discretionary' },
  // Finance & Banking
  { ticker: '8306.T', name: 'Mitsubishi UFJ Financial',sector: 'Financial Services' },
  { ticker: '8316.T', name: 'Sumitomo Mitsui Financial',sector: 'Financial Services' },
  { ticker: '8411.T', name: 'Mizuho Financial',        sector: 'Financial Services' },
  { ticker: '8591.T', name: 'ORIX',                    sector: 'Financial Services' },
  // Telecom
  { ticker: '9984.T', name: 'SoftBank Group',          sector: 'Technology' },
  { ticker: '9432.T', name: 'NTT',                     sector: 'Technology' },
  { ticker: '9433.T', name: 'KDDI',                    sector: 'Technology' },
  // Retail & Consumer
  { ticker: '3382.T', name: 'Seven & i Holdings',      sector: 'Consumer Staples' },
  { ticker: '8267.T', name: 'Aeon',                    sector: 'Consumer Staples' },
  { ticker: '9983.T', name: 'Fast Retailing (Uniqlo)', sector: 'Consumer Discretionary' },
  // Industrial & Trading
  { ticker: '6326.T', name: 'Kubota',                  sector: 'Industrials' },
  { ticker: '7011.T', name: 'Mitsubishi Heavy Industries', sector: 'Industrials' },
  { ticker: '8031.T', name: 'Mitsui & Co.',            sector: 'Industrials' },
  { ticker: '8058.T', name: 'Mitsubishi Corp.',        sector: 'Industrials' },
  // Healthcare & Pharma
  { ticker: '4519.T', name: 'Chugai Pharmaceutical',   sector: 'Healthcare' },
  { ticker: '4502.T', name: 'Takeda Pharmaceutical',   sector: 'Healthcare' },
  // Real Estate
  { ticker: '8801.T', name: 'Mitsui Fudosan',          sector: 'Real Estate' },
  // Gaming & Entertainment
  { ticker: '9697.T', name: 'Capcom',                  sector: 'Technology' },
];
