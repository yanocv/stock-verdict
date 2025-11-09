import { create } from 'zustand';

export type Locale = 'en' | 'ja' | 'pt';

interface LangState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  hydrated: boolean;
}

export const useLangStore = create<LangState>((set) => ({
  locale: 'en',
  hydrated: false,
  setLocale: (locale) => {
    set({ locale });
    try {
      localStorage.setItem('preferred-locale', locale);
    } catch {}
  },
}));

// Hydration helper (call once in a client component)
export function hydrateLocalePreference() {
  try {
    const saved = localStorage.getItem('preferred-locale') as Locale | null;
    if (saved) {
      useLangStore.setState({ locale: saved });
    }
  } catch {}
  useLangStore.setState({ hydrated: true });
}
