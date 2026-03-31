'use client';

import { useEffect } from 'react';
import { useLangStore } from '@/state/langStore';

/**
 * Mounts invisibly in the layout and keeps the <html lang> attribute
 * in sync with the Zustand locale store. Runs client-side only.
 */
export function LocaleHtmlLang() {
  const locale = useLangStore((s) => s.locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}