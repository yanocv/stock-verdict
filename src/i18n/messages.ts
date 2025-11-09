import type { Locale } from '../state/langStore';
import enCommon from '../messages/en/common.json';
import jaCommon from '../messages/ja/common.json';
import ptCommon from '../messages/pt/common.json';

type Namespace = 'common';
type Messages = Record<string, string>;
type LocaleBundle = Record<Namespace, Messages>;

const bundles: Record<Locale, LocaleBundle> = {
  en: { common: enCommon as Messages },
  ja: { common: jaCommon as Messages },
  pt: { common: ptCommon as Messages },
};

export function getMessages(locale: Locale): Messages {
  // Merge namespaces (single namespace for now)
  const entry = bundles[locale] ?? bundles.en;
  return Object.values(entry).reduce((acc, ns) => Object.assign(acc, ns), {} as Messages);
}

// Future extension: lazy dynamic import
// export async function loadNamespace(locale: Locale, ns: Namespace) {
//   const mod = await import(`../messages/${locale}/${ns}.json`);
//   return mod.default as Messages;
// }
