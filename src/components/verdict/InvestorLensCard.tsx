'use client';

import type { InvestorVerdict } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle } from 'lucide-react';

interface InvestorLensCardProps {
  verdict: InvestorVerdict;
}

const lensEmoji: Record<string, string> = {
  buffett: '🏛',
  graham: '📏',
  lynch: '📈',
};

const lensName: Record<string, string> = {
  buffett: 'Warren Buffett',
  graham: 'Benjamin Graham',
  lynch: 'Peter Lynch',
};

function verdictBadgeVariant(rec: string) {
  if (rec === 'BUY') return 'buy' as const;
  if (rec === 'AVOID') return 'avoid' as const;
  return 'wait' as const;
}

export function InvestorLensCard({ verdict }: InvestorLensCardProps) {
  const passedCount = verdict.checks.filter((c) => c.passed).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {lensEmoji[verdict.lens] ?? '🔍'} {lensName[verdict.lens] ?? verdict.lens}
          </CardTitle>
          <Badge variant={verdictBadgeVariant(verdict.recommendation)}>
            {verdict.recommendation}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {passedCount}/{verdict.checks.length} checks passed
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {verdict.checks.map((check) => (
          <div key={check.label} className="flex items-start gap-2 text-sm">
            {check.passed ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <span className={check.passed ? 'text-foreground' : 'text-muted-foreground'}>
                {check.label}
              </span>
              <span className="text-muted-foreground text-xs ml-1">
                ({check.value} vs {check.threshold})
              </span>
            </div>
          </div>
        ))}

        {verdict.fairValue !== null && (
          <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
            Fair Value:{' '}
            <span className="font-semibold text-foreground">
              {verdict.fairValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            {verdict.buyBelow !== null && (
              <>
                {' · '}Buy Below:{' '}
                <span className="font-semibold text-foreground">
                  {verdict.buyBelow.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}