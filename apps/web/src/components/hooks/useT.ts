'use client';

import { useCallback } from 'react';
import { t } from '@egoless-do/core';
import { useWebStore } from '../../store/useWebStore';

export function useT() {
  const language = useWebStore((s) => s.language);
  return useCallback((k: string) => t(k, language), [language]);
}
