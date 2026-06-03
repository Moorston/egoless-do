'use client';

import { t } from '@egoless-do/core';
import { useWebStore } from '../../store/useWebStore';

export function useT() {
  const language = useWebStore((s) => s.language);
  return (k: string) => t(k, language);
}
