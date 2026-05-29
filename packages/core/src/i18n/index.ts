export { zh } from './zh';
export { en } from './en';
export { zhHant } from './zh-Hant';

import { zh } from './zh';
import { en } from './en';
import { zhHant } from './zh-Hant';

export const translations: Record<string, Record<string, string>> = {
  zh,
  'zh-Hant': zhHant,
  en,
};

export const getT = (lang: string) => translations[lang] ?? zh;
export const t = (key: string, lang: string = 'zh'): string =>
  translations[lang]?.[key] ?? translations['zh']?.[key] ?? key;
