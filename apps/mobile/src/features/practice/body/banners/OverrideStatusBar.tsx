import { FONT_SMALL } from '@egoless-do/core';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export interface OverrideStatusBarProps {
  T: (key: string) => string;
  todayOverride: { type: string };
  onUndoOverride: () => void;
}

/**
 * Override status bar — extracted from TodayPlanBanner (L82-94).
 * The nested ternary for override type label counts toward THIS component's
 * complexity, not the parent TodayPlanBanner's.
 */
export function OverrideStatusBar({ T, todayOverride, onUndoOverride }: OverrideStatusBarProps) {
  return (
    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: FONT_SMALL(), color: '#fff' }}>
        {todayOverride.type === 'skip' ? T('bodyOverrideSkip')
          : todayOverride.type === 'swap' ? T('bodyOverrideSwap')
          : todayOverride.type === 'adjust' ? T('bodyOverrideAdjust')
          : T('bodyOverrideCustom')}
      </Text>
      <TouchableOpacity onPress={onUndoOverride} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: FONT_SMALL(), color: '#fff', fontWeight: '600', textDecorationLine: 'underline' }}>{T('bodyUndo')}</Text>
      </TouchableOpacity>
    </View>
  );
}
