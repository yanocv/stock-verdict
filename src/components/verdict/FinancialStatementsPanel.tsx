'use client';

import { useState } from 'react';
import type { FinancialHistory, FinancialPeriod } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TableIcon } from 'lucide-react';

interface FinancialStatementsPanelProps {
  history: FinancialHistory;
  currency: string;
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(value: number | null | undefined, currency: string): string {
  if (value == null) return '—';
  const abs = Math.abs(value);
  const isJpy = currency === 'JPY';
  const sym = isJpy ? '¥' : '$';
  const neg = value < 0 ? '-' : '';

  if (abs >= 1_000_000_000_000) return `${neg}${sym}${(abs / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `${neg}${sym}${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${neg}${sym}${(abs / 1_000_000).toFixed(2)}M`;
  return `${neg}${sym}${abs.toLocaleString()}`;
}

function fmtRaw(value: number | null | undefined, decimals = 2): string {
  if (value == null) return '—';
  return value.toFixed(decimals);
}

// ── Table Component ───────────────────────────────────────────────────────────

interface Row {
  label: string;
  key: keyof FinancialPeriod;
  format: 'currency' | 'number';
  decimals?: number;
  indent?: boolean;
}

function StatementTable({
  periods,
  rows,
  currency,
}: {
  periods: FinancialPeriod[];
  rows: Row[];
  currency: string;
}) {
  if (periods.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No data available.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-4 font-medium text-muted-foreground min-w-[180px]">
              Breakdown
            </th>
            {periods.map((p) => (
              <th
                key={p.period + p.endDate}
                className="text-right py-2 px-3 font-medium min-w-[100px]"
              >
                {p.period}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
              <td className={`py-2 pr-4 text-muted-foreground ${row.indent ? 'pl-4' : ''}`}>
                {row.label}
              </td>
              {periods.map((p) => {
                const val = p[row.key] as number | null | undefined;
                return (
                  <td key={p.period + p.endDate} className="text-right py-2 px-3 tabular-nums">
                    {row.format === 'currency'
                      ? fmt(val, currency)
                      : fmtRaw(val, row.decimals ?? 2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Row definitions ───────────────────────────────────────────────────────────

const INCOME_ROWS: Row[] = [
  { label: 'Total Revenue', key: 'revenue', format: 'currency' },
  { label: 'Gross Profit', key: 'grossProfit', format: 'currency', indent: true },
  { label: 'Operating Income', key: 'operatingIncome', format: 'currency', indent: true },
  { label: 'EBITDA', key: 'ebitda', format: 'currency', indent: true },
  { label: 'Net Income', key: 'netIncome', format: 'currency' },
  { label: 'EPS (Basic)', key: 'eps', format: 'number', decimals: 2 },
  { label: 'EPS (Diluted)', key: 'epsDiluted', format: 'number', decimals: 2 },
];

const BALANCE_ROWS: Row[] = [
  { label: 'Cash & Equivalents', key: 'cash', format: 'currency' },
  { label: 'Total Current Assets', key: 'totalCurrentAssets', format: 'currency' },
  { label: 'Total Assets', key: 'totalAssets', format: 'currency' },
  { label: 'Total Current Liabilities', key: 'totalCurrentLiabilities', format: 'currency' },
  { label: 'Total Liabilities', key: 'totalLiabilities', format: 'currency' },
  { label: 'Long-Term Debt', key: 'longTermDebt', format: 'currency', indent: true },
  { label: 'Total Debt', key: 'totalDebt', format: 'currency', indent: true },
  { label: 'Shareholder Equity', key: 'shareholderEquity', format: 'currency' },
  { label: 'Retained Earnings', key: 'retainedEarnings', format: 'currency', indent: true },
];

const CASHFLOW_ROWS: Row[] = [
  { label: 'Operating Cash Flow', key: 'operatingCashFlow', format: 'currency' },
  { label: 'Capital Expenditures', key: 'capitalExpenditures', format: 'currency', indent: true },
  { label: 'Free Cash Flow', key: 'freeCashFlow', format: 'currency' },
  { label: 'Dividends Paid', key: 'dividendsPaid', format: 'currency', indent: true },
];

// ── Main Component ────────────────────────────────────────────────────────────

type FreqTab = 'annual' | 'quarterly';
type StatementTab = 'income' | 'balance' | 'cashflow';

export function FinancialStatementsPanel({ history, currency }: FinancialStatementsPanelProps) {
  const [freq, setFreq] = useState<FreqTab>('annual');
  const [stmt, setStmt] = useState<StatementTab>('income');

  const incomePeriods = freq === 'annual' ? history.incomeAnnual : history.incomeQuarterly;
  const balancePeriods = freq === 'annual' ? history.balanceAnnual : history.balanceQuarterly;
  const cashflowPeriods = freq === 'annual' ? history.cashFlowAnnual : history.cashFlowQuarterly;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TableIcon className="h-4 w-4" />
            Financials
          </CardTitle>
          {/* Annual / Quarterly toggle */}
          <div className="flex items-center gap-1 text-xs border rounded-md overflow-hidden">
            {(['annual', 'quarterly'] as FreqTab[]).map((f) => (
              <button
                key={f}
                onClick={() => setFreq(f)}
                className={`px-3 py-1 capitalize transition-colors ${
                  freq === f
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={stmt} onValueChange={(v) => setStmt(v as StatementTab)}>
          <TabsList className="mb-4">
            <TabsTrigger value="income">Income Statement</TabsTrigger>
            <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          </TabsList>

          <TabsContent value="income">
            <StatementTable periods={incomePeriods} rows={INCOME_ROWS} currency={currency} />
          </TabsContent>

          <TabsContent value="balance">
            <StatementTable periods={balancePeriods} rows={BALANCE_ROWS} currency={currency} />
          </TabsContent>

          <TabsContent value="cashflow">
            <StatementTable periods={cashflowPeriods} rows={CASHFLOW_ROWS} currency={currency} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}