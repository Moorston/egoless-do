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
export const t = (key: I18nKey | (string & {}), lang: string = 'zh'): string => {
  const dict = translations[lang] ?? translations['zh'];
  return (dict as unknown as Record<string, string>)?.[key] ?? key;
};
