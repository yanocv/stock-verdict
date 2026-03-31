export type VerdictRecommendation = 'BUY' | 'WAIT' | 'AVOID';
export type InvestorLens = 'balanced' | 'buffett' | 'graham' | 'lynch';
export type LynchCategory = 'slow-grower' | 'stalwart' | 'fast-grower' | 'cyclical' | 'turnaround' | 'asset-play';

export interface VerdictScore {
  overall: number; // 0-10
  financials: number;
  valuation: number;
  health: number;
  technical: number;
  macro: number;
  news: number;
}

export interface Verdict {
  recommendation: VerdictRecommendation;
  confidence: number; // 0-100
  scores: VerdictScore;
  fairValue: number | null;
  suggestedBuyPrice: number | null;
  reasons: {
    bullish: string[];
    bearish: string[];
  };
  lynchCategory: LynchCategory;
}

export interface InvestorVerdict {
  lens: InvestorLens;
  recommendation: VerdictRecommendation;
  fairValue: number | null;
  buyBelow: number | null;
  checks: InvestorCheck[];
  summary: string;
}

export interface InvestorCheck {
  label: string;
  passed: boolean;
  value: string;
  threshold: string;
  explanation: string;
}
