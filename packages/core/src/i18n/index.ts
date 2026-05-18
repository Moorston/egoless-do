import zh from './zh';

export type LangCode = 'zh' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'pt' | 'ru' | 'ar' | 'it' | 'hi' | 'vi' | 'th' | 'zh-Hant';

export const LANG_LIST: { code: LangCode; flag: string; name: string }[] = [
  { code:'zh', flag:'🇨🇳', name:'简体中文' },
  { code:'en', flag:'🇺🇸', name:'English' },
  { code:'ja', flag:'🇯🇵', name:'日本語' },
  { code:'ko', flag:'🇰🇷', name:'한국어' },
  { code:'fr', flag:'🇫🇷', name:'Français' },
  { code:'de', flag:'🇩🇪', name:'Deutsch' },
  { code:'es', flag:'🇪🇸', name:'Español' },
  { code:'pt', flag:'🇵🇹', name:'Português' },
  { code:'ru', flag:'🇷🇺', name:'Русский' },
  { code:'ar', flag:'🇸🇦', name:'العربية' },
  { code:'it', flag:'🇮🇹', name:'Italiano' },
  { code:'hi', flag:'🇮🇳', name:'हिन्दी' },
  { code:'vi', flag:'🇻🇳', name:'Tiếng Việt' },
  { code:'th', flag:'🇹🇭', name:'ภาษาไทย' },
  { code:'zh-Hant', flag:'🇹🇼', name:'繁體中文' },
];

const locales: Record<string, Record<string, string>> = { zh };

export function t(key: string, lang: string = 'zh'): string {
  return locales[lang]?.[key] ?? locales['zh']?.[key] ?? key;
}
