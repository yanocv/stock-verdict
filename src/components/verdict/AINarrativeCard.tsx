'use client';

import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AINarrativeCardProps {
  narrative: string;
}

export function AINarrativeCard({ narrative }: AINarrativeCardProps) {
  return (
    <Card className="border-violet-200 dark:border-violet-900 bg-violet-50/50 dark:bg-violet-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-violet-700 dark:text-violet-400">
          <Sparkles className="h-4 w-4" />
          AI Analysis
          <span className="ml-auto text-[10px] font-normal text-muted-foreground">
            Claude · claude-3-5-haiku
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-foreground">{narrative}</p>
      </CardContent>
    </Card>
  );
}