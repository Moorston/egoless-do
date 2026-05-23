import 'intl-pluralrules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { zh, en } from '@egoless-do/core';

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng: Localization.getLocales()[0]?.languageCode ?? 'zh',
  fallbackLng: 'zh',
  interpolation: { escapeValue: false },
});

export default i18n;
export { useTranslation } from 'react-i18next';
