export interface CalendarData {
  earningsDate: string | null;        // ISO date string
  exDividendDate: string | null;
  dividendDate: string | null;
  earningsAverage: number | null;     // consensus EPS estimate
  earningsLow: number | null;
  earningsHigh: number | null;
  revenueAverage: number | null;
}