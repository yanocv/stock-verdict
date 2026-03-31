import { describe, it, expect } from 'vitest';
import {
  calculatePE,
  calculatePS,
  calculatePB,
  calculatePEG,
  calculateROE,
  calculateCurrentRatio,
  calculateDebtToEquity,
  calculateOperatingMargin,
  calculateNetProfitMargin,
  calculateDividendYield,
  calculatePayoutRatio,
} from './ratios';

describe('calculatePE', () => {
  it('calculates PE ratio correctly', () => {
    expect(calculatePE(100, 5)).toBeCloseTo(20);
  });

  it('returns null when EPS is zero', () => {
    expect(calculatePE(100, 0)).toBeNull();
  });

  it('returns null when EPS is negative', () => {
    expect(calculatePE(100, -5)).toBeNull();
  });

  it('handles high PE ratios', () => {
    expect(calculatePE(1000, 1)).toBeCloseTo(1000);
  });
});

describe('calculatePS', () => {
  it('calculates P/S ratio correctly', () => {
    expect(calculatePS(50, 25)).toBeCloseTo(2);
  });

  it('returns null when revenuePerShare is zero', () => {
    expect(calculatePS(50, 0)).toBeNull();
  });

  it('returns null when revenuePerShare is negative', () => {
    expect(calculatePS(50, -10)).toBeNull();
  });
});

describe('calculatePB', () => {
  it('calculates P/B ratio correctly', () => {
    expect(calculatePB(60, 30)).toBeCloseTo(2);
  });

  it('returns null when bookValuePerShare is zero', () => {
    expect(calculatePB(60, 0)).toBeNull();
  });

  it('returns null when bookValuePerShare is negative', () => {
    expect(calculatePB(60, -10)).toBeNull();
  });
});

describe('calculatePEG', () => {
  it('calculates PEG ratio correctly', () => {
    expect(calculatePEG(20, 10)).toBeCloseTo(2);
  });

  it('returns null when epsGrowthRate is zero', () => {
    expect(calculatePEG(20, 0)).toBeNull();
  });

  it('returns null when epsGrowthRate is negative', () => {
    expect(calculatePEG(20, -5)).toBeNull();
  });

  it('returns null when peRatio is negative', () => {
    expect(calculatePEG(-5, 10)).toBeNull();
  });

  it('returns null when peRatio is zero', () => {
    expect(calculatePEG(0, 10)).toBeNull();
  });
});

describe('calculateROE', () => {
  it('calculates ROE correctly as percentage', () => {
    expect(calculateROE(1000, 5000)).toBeCloseTo(20);
  });

  it('returns null when shareholderEquity is zero', () => {
    expect(calculateROE(1000, 0)).toBeNull();
  });

  it('returns null when shareholderEquity is negative', () => {
    expect(calculateROE(1000, -500)).toBeNull();
  });

  it('returns negative ROE for negative net income', () => {
    const result = calculateROE(-500, 5000);
    expect(result).toBeCloseTo(-10);
  });
});

describe('calculateCurrentRatio', () => {
  it('calculates current ratio correctly', () => {
    expect(calculateCurrentRatio(200, 100)).toBeCloseTo(2);
  });

  it('returns null when currentLiabilities is zero', () => {
    expect(calculateCurrentRatio(200, 0)).toBeNull();
  });

  it('returns null when currentLiabilities is negative', () => {
    expect(calculateCurrentRatio(200, -50)).toBeNull();
  });

  it('returns value less than 1 for illiquid company', () => {
    expect(calculateCurrentRatio(50, 100)).toBeCloseTo(0.5);
  });
});

describe('calculateDebtToEquity', () => {
  it('calculates D/E ratio correctly', () => {
    expect(calculateDebtToEquity(500, 1000)).toBeCloseTo(0.5);
  });

  it('returns null when shareholderEquity is zero', () => {
    expect(calculateDebtToEquity(500, 0)).toBeNull();
  });

  it('returns null when shareholderEquity is negative', () => {
    expect(calculateDebtToEquity(500, -200)).toBeNull();
  });

  it('returns zero when debt is zero', () => {
    expect(calculateDebtToEquity(0, 1000)).toBeCloseTo(0);
  });
});

describe('calculateOperatingMargin', () => {
  it('calculates operating margin as percentage', () => {
    expect(calculateOperatingMargin(150, 1000)).toBeCloseTo(15);
  });

  it('returns null when revenue is zero', () => {
    expect(calculateOperatingMargin(150, 0)).toBeNull();
  });

  it('returns null when revenue is negative', () => {
    expect(calculateOperatingMargin(150, -1000)).toBeNull();
  });

  it('returns negative margin for operating losses', () => {
    expect(calculateOperatingMargin(-100, 1000)).toBeCloseTo(-10);
  });
});

describe('calculateNetProfitMargin', () => {
  it('calculates net profit margin as percentage', () => {
    expect(calculateNetProfitMargin(100, 1000)).toBeCloseTo(10);
  });

  it('returns null when revenue is zero', () => {
    expect(calculateNetProfitMargin(100, 0)).toBeNull();
  });

  it('returns null when revenue is negative', () => {
    expect(calculateNetProfitMargin(100, -1000)).toBeNull();
  });

  it('returns negative margin for net losses', () => {
    expect(calculateNetProfitMargin(-200, 1000)).toBeCloseTo(-20);
  });
});

describe('calculateDividendYield', () => {
  it('calculates dividend yield as percentage', () => {
    expect(calculateDividendYield(3, 100)).toBeCloseTo(3);
  });

  it('returns null when price is zero', () => {
    expect(calculateDividendYield(3, 0)).toBeNull();
  });

  it('returns null when price is negative', () => {
    expect(calculateDividendYield(3, -100)).toBeNull();
  });

  it('returns null when dividend is negative', () => {
    expect(calculateDividendYield(-1, 100)).toBeNull();
  });

  it('returns zero for no dividend', () => {
    expect(calculateDividendYield(0, 100)).toBeCloseTo(0);
  });
});

describe('calculatePayoutRatio', () => {
  it('calculates payout ratio as percentage', () => {
    expect(calculatePayoutRatio(1.5, 5)).toBeCloseTo(30);
  });

  it('returns null when EPS is zero', () => {
    expect(calculatePayoutRatio(1.5, 0)).toBeNull();
  });

  it('returns null when EPS is negative', () => {
    expect(calculatePayoutRatio(1.5, -5)).toBeNull();
  });

  it('returns null when dividendPerShare is negative', () => {
    expect(calculatePayoutRatio(-1, 5)).toBeNull();
  });

  it('returns zero for no dividend', () => {
    expect(calculatePayoutRatio(0, 5)).toBeCloseTo(0);
  });

  it('returns over 100 for unsustainable payout', () => {
    expect(calculatePayoutRatio(6, 5)).toBeCloseTo(120);
  });
});
