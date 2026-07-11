// ─── LoadingFallback + LazyScreen helpers ────────────────────────────
// Extracted from navigation/index.tsx (AR-04 refactoring)
import React, { Suspense } from 'react';
import { View, Text } from 'react-native';

import { useTheme } from '../components/UI';
import { FONT_STAT_SECTION, FONT_SUB } from '@egoless-do/core';

export function LoadingFallback() {
  const TH = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TH.bg }}>
      <Text style={{ fontSize: FONT_STAT_SECTION(), marginBottom: 8 }}>🪷</Text>
      <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>...</Text>
    </View>
  );
}

export function LazyScreen({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>;
}

/** Wrap a lazy component for use in React Navigation. */
export function withLazy<P extends object>(Component: React.LazyExoticComponent<React.ComponentType<P>>) {
  return (props: P) => <LazyScreen><Component {...props as P} /></LazyScreen>;
}