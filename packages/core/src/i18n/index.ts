export type { I18nKeys, I18nKey } from './types';
export { zh } from './zh';
export { en } from './en';
export { zhHant } from './zh-Hant';

import type { I18nKeys, I18nKey } from './types';
import { zh } from './zh';
import { en } from './en';
import { zhHant } from './zh-Hant';

export const translations: Record<string, I18nKeys> = {
  zh,
  'zh-Hant': zhHant,
  en,
};

export const getT = (lang: string): I18nKeys => translations[lang] ?? zh;

/**
 * Type-safe translation lookup.
 * @param key - Must be a valid key from I18nKeys (compile-time checked).
 *                If you need dynamic keys, use getT(lang)[key as I18nKey].
 * @param lang - Language code ('zh', 'en', 'zh-Hant'). Defaults to 'zh'.
 * @returns Translated string, or the key itself if translation is missing.
 */
export const t = (key: I18nKey, lang: string = 'zh', params?: Record<string, string | number>): string => {
  const dict = translations[lang] ?? translations['zh'];
  let text = (dict as unknown as Record<string, string>)?.[key]
    ?? (translations['en'] as unknown as Record<string, string>)?.[key]
    ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
};
