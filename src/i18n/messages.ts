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

export function getMessages(locale: Locale): LocaleBundle {
  // Return the namespaced bundle so next-intl can resolve useTranslations('common')
  return bundles[locale] ?? bundles.en;
}

// Future extension: lazy dynamic import
// export async function loadNamespace(locale: Locale, ns: Namespace) {
//   const mod = await import(`../messages/${locale}/${ns}.json`);
//   return mod.default as Messages;
// }
