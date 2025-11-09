/* eslint-disable react-refresh/only-export-components */
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useEffect, useState } from 'react';
import { NextIntlClientProvider } from "next-intl";
import { useLangStore, hydrateLocalePreference } from '../state/langStore';
import { getMessages } from '../i18n/messages';

type Props = {
  children: ReactNode;
};

export default function Providers({ children }: Props) {
  const [queryClient] = useState(() => new QueryClient());
  const locale = useLangStore((s) => s.locale);
  const hydrated = useLangStore((s) => s.hydrated);

  // Hydrate locale preference once
  useEffect(() => {
    if (!hydrated) {
      hydrateLocalePreference();
    }
  }, [hydrated]);

  const messages = getMessages(locale);

  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}
