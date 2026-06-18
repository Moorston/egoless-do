'use client';

import { useMemo } from 'react';
import { THEMES } from '@egoless-do/core';
import { useWebStore } from '../../store/useWebStore';

export function useTheme() {
  const theme = useWebStore((s) => s.theme);
  return useMemo(() => {
    const TH = THEMES[theme];
    const P = TH.primary;
    return { TH, P };
  }, [theme]);
}
