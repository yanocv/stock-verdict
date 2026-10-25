'use client';

import type { DCFAnalysis } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator } from 'lucide-react';

interface DCFSensitivityCardProps {
  dcf: DCFAnalysis;
  currentPrice: number;
  currency: string;
}

function formatValue(value: number, currency: string): string {
  if (currency === 'JPY') {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function cellColor(fairValue: number, currentPrice: number): string {
  const mos = (fairValue - currentPrice) / fairValue;
  if (mos > 0.30) {return 'bg-green-100 text-green-800 font-semibold dark:bg-green-900/30 dark:text-green-300';}
  if (mos > 0.10) {return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400';}
  if (mos < -0.20) {return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';}
  if (mos < -0.05) {return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400';}
  return 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
}

export function DCFSensitivityCard({ dcf, currentPrice, currency }: DCFSensitivityCardProps) {
  const hasTable = dcf.sensitivityTable && dcf.sensitivityTable.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          DCF Valuation
          {dcf.wacc !== null && (
            <span className="text-muted-foreground text-sm font-normal">
              WACC {(dcf.wacc * 100).toFixed(1)}%
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Base case summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-xs text-muted-foreground mb-1">Fair value</div>
            <div className="font-semibold">{dcf.baseCase !== null ? formatValue(dcf.baseCase, currency) : 'N/A'}</div>
          </div>
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-xs text-muted-foreground mb-1">Margin of safety</div>
            <div className={`font-semibold ${dcf.marginOfSafety !== null && dcf.marginOfSafety > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {dcf.marginOfSafety !== null ? `${(dcf.marginOfSafety * 100).toFixed(1)}%` : 'N/A'}
            </div>
          </div>
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-xs text-muted-foreground mb-1">Growth rate</div>
            <div className="font-medium">{dcf.growthRate !== null ? `${(dcf.growthRate * 100).toFixed(1)}%` : 'N/A'}</div>
          </div>
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="text-xs text-muted-foreground mb-1">Terminal rate</div>
            <div className="font-medium">{(dcf.terminalGrowthRate * 100).toFixed(1)}%</div>
          </div>
        </div>

        {/* Sensitivity table */}
        {hasTable && dcf.sensitivityTable.length > 0 && dcf.sensitivityTable[0] && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">
              Fair value sensitivity — WACC (rows) vs. FCF growth (columns)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-1.5 text-muted-foreground border-b">WACC \ Growth</th>
                    {dcf.sensitivityTable[0]!.map((cell, ci) => (
                      <th key={ci} className="p-1.5 text-center text-muted-foreground border-b">
                        {(cell.growthRate * 100).toFixed(0)}%
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dcf.sensitivityTable.map((row, ri) => (
                    <tr key={ri}>
                      <td className="p-1.5 text-muted-foreground font-medium border-r">
                        {row[0] ? (row[0].wacc * 100).toFixed(1) : ''}%
                      </td>
                      {row.map((cell, ci) => {
                        const isBase =
                          dcf.wacc !== null &&
                          dcf.growthRate !== null &&
                          Math.abs(cell.wacc - dcf.wacc) < 0.001 &&
                          Math.abs(cell.growthRate - dcf.growthRate) < 0.001;
                        return (
                          <td
                            key={ci}
                            className={`p-1.5 text-center rounded-sm ${cellColor(cell.fairValue, currentPrice)} ${isBase ? 'ring-2 ring-primary ring-inset' : ''}`}
                          >
                            {formatValue(cell.fairValue, currency)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-muted-foreground mt-1.5 flex gap-3">
              <span>🟢 &gt;30% below current price</span>
              <span>🟡 near current price</span>
              <span>🔴 above current price</span>
            </div>
          </div>
        )}

        {dcf.baseCase === null && (
          <p className="text-sm text-muted-foreground">
            {dcf.currencyMismatch
              ? `No DCF valuation: financials are reported in ${dcf.currencyMismatch.financial} but the price is in ${dcf.currencyMismatch.price}.`
              : 'Insufficient data for DCF valuation (requires positive free cash flow).'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
