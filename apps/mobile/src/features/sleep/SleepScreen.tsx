// ─── SleepScreen — Lightweight entry point ──────────────────────
// Lazy-loads SleepEngine to defer expo-notifications, DiaryModal,
// lucide-react-native (13 icons), and other heavy dependencies.
import { FONT_STAT_SECTION, FONT_SUB } from '@egoless-do/core';
import React, { lazy, Suspense } from 'react';
import { View, Text } from 'react-native';

import { useTheme } from '../../components/UI';

const SleepEngine = lazy(() => import('./SleepEngine'));

export default function SleepScreen() {
  const TH = useTheme();
  return (
    <Suspense fallback={
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TH.bg }}>
        <Text style={{ fontSize: FONT_STAT_SECTION(), marginBottom: 8 }}>🌙</Text>
        <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>...</Text>
      </View>
    }>
      <SleepEngine />
    </Suspense>
  );
}
