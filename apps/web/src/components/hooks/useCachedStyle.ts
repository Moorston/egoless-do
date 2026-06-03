'use client';

import { useMemo, DependencyList } from 'react';

export function useCachedStyle<T>(factory: () => T, deps: DependencyList): T {
  return useMemo(factory, deps);
}
