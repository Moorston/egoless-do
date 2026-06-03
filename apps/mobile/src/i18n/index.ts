import 'intl-pluralrules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { zh, zhHant, en } from '@egoless-do/core';

let lng = 'zh';
try {
  const Localization = require('expo-localization');
  lng = Localization.getLocales()[0]?.languageCode ?? 'zh';
} catch {}

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    zh: { translation: zh },
    'zh-Hant': { translation: zhHant },
    en: { translation: en },
  },
  lng,
  fallbackLng: 'zh',
  interpolation: { escapeValue: false },
});

export default i18n;
export { useTranslation } from 'react-i18next';
