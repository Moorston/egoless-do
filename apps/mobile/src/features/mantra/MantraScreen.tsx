// ─── MantraScreen — Lightweight entry point ─────────────────────
// Lazy-loads MantraEngine to defer expo-haptics, expo-keep-awake,
// expo-av, expo-speech, expo-file-system, react-native-svg.
import React, { lazy, Suspense } from 'react';
import { View, Text } from 'react-native';

import { useTheme } from '../../components/UI';
import { FONT_STAT_SECTION, FONT_SUB } from '@egoless-do/core';

const MantraEngine = lazy(() => import('./MantraEngine'));

export default function MantraScreen() {
  const TH = useTheme();
  return (
    <Suspense fallback={
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TH.bg }}>
        <Text style={{ fontSize: FONT_STAT_SECTION(), marginBottom: 8 }}>🪷</Text>
        <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>...</Text>
      </View>
    }>
      <MantraEngine />
    </Suspense>
  );
}
