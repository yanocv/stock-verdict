'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';

export function HowItWorksPanel() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="h-4 w-4" />
          How the Verdict Works
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">

        {/* Overall score */}
        <section>
          <h3 className="font-semibold mb-1">Overall Score (0–10)</h3>
          <p className="text-muted-foreground">
            The verdict is driven by a weighted composite score across 5 dimensions:
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 pr-4 font-medium text-muted-foreground">Dimension</th>
                  <th className="text-right py-1 px-3 font-medium text-muted-foreground">Weight</th>
                  <th className="text-left py-1 pl-3 font-medium text-muted-foreground">What it measures</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {[
                  ['Financials', '30%', 'ROE, profit margins, EPS growth, free cash flow'],
                  ['Valuation', '20%', 'P/E, P/S, PEG — is the stock cheap or expensive?'],
                  ['Health', '20%', 'Current ratio, debt/equity — balance sheet strength'],
                  ['Technical', '15%', 'Beta, EPS growth trend, revenue growth momentum'],
                  ['Macro / News', '15%', 'VIX fear index, S&P 500 regime, USD/JPY, news sentiment'],
                ].map(([dim, wt, desc]) => (
                  <tr key={dim} className="border-b border-border/40">
                    <td className="py-1 pr-4 font-medium text-foreground">{dim}</td>
                    <td className="text-right py-1 px-3 font-semibold">{wt}</td>
                    <td className="py-1 pl-3">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Score thresholds */}
        <section>
          <h3 className="font-semibold mb-1">Score → Verdict</h3>
          <div className="flex gap-4 flex-wrap">
            <span className="px-3 py-1 rounded-md bg-green-100 text-green-800 text-xs font-semibold">BUY &gt; 7.0</span>
            <span className="px-3 py-1 rounded-md bg-yellow-100 text-yellow-800 text-xs font-semibold">WAIT 4.0–7.0</span>
            <span className="px-3 py-1 rounded-md bg-red-100 text-red-800 text-xs font-semibold">AVOID &lt; 4.0</span>
          </div>
        </section>

        {/* Investor lenses */}
        <section>
          <h3 className="font-semibold mb-1">Investor Lenses</h3>
          <p className="text-muted-foreground mb-2">
            Three independent rule-based checklists view each stock through a different philosophy:
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <li><span className="font-medium text-foreground">Buffett</span> — Moat, ROE &gt; 15%, low debt, positive FCF, DCF undervaluation</li>
            <li><span className="font-medium text-foreground">Graham</span> — Deep value: P/E &lt; 15, P/B &lt; 1.5, current ratio &gt; 2, price below Graham Number</li>
            <li><span className="font-medium text-foreground">Lynch</span> — Growth at a reasonable price: PEG &lt; 1, revenue growth, Lynch fair value</li>
          </ul>
        </section>

        {/* Valuation models */}
        <section>
          <h3 className="font-semibold mb-2">Fair Value Models</h3>
          <ul className="space-y-1 text-muted-foreground">
            <li><span className="font-medium text-foreground">DCF</span> — Discounts projected free cash flow over 10 years at 9% + 3% terminal growth</li>
            <li><span className="font-medium text-foreground">Graham Number</span> — √(22.5 × EPS × Book Value per Share)</li>
            <li><span className="font-medium text-foreground">Lynch Fair Value</span> — EPS × EPS Growth Rate</li>
          </ul>
        </section>

        {/* Macro scoring */}
        <section>
          <h3 className="font-semibold mb-1">Macro Score</h3>
          <p className="text-muted-foreground">
            Based on three real-time Yahoo Finance signals:
          </p>
          <ul className="mt-1 space-y-0.5 text-muted-foreground">
            <li>• <span className="font-medium text-foreground">VIX</span> (double weight) — &lt;15 calm (8.5), 15–20 normal (6.5), 20–30 fear (4), &gt;30 crisis (2)</li>
            <li>• <span className="font-medium text-foreground">S&amp;P 500</span> — level used as market regime proxy (&gt;5000 = 7, &gt;4000 = 6, etc.)</li>
            <li>• <span className="font-medium text-foreground">USD/JPY</span> — extreme weakness &gt;160 (3), &gt;150 (5), normal 130–150 (6.5), strong &lt;130 (7)</li>
          </ul>
        </section>

        {/* News scoring */}
        <section>
          <h3 className="font-semibold mb-1">News Sentiment Score</h3>
          <p className="text-muted-foreground">
            News headlines from Yahoo Finance are scored using keyword matching.
            Bullish words (buy, upgrade, beat, growth…) add positive weight; bearish words
            (sell, downgrade, miss, lawsuit…) subtract. The average sentiment maps to a 0–10 score.
          </p>
        </section>

        {/* Disclaimer */}
        <section className="border-t pt-3">
          <p className="text-xs text-muted-foreground">
            ⚠️ <span className="font-medium">Disclaimer:</span> This app is for informational purposes only.
            Scores and verdicts are generated by a rule-based algorithm and do not constitute financial advice.
            Always do your own research before making investment decisions.
          </p>
        </section>

      </CardContent>
    </Card>
  );
}