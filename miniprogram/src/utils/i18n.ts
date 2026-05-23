import { t, zh, en } from '../core';
import { useStore } from './store';

export function useT() {
  const language = useStore((s) => s.language);
  return (key: string) => t(key, language);
}

export function getTranslation(lang: string) {
  return lang === 'en' ? en : zh;
}

export { t, zh, en };
