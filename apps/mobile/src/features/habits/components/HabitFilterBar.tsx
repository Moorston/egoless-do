// ─── HabitFilterBar: status filter pills ─────────────────────────
import { FONT_SMALL, FONT_TINY } from '@egoless-do/core';
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

import { useTheme, useT } from '../../../components/UI';
import { ALL_FILTERS } from '../constants';

interface Props {
  filter: string;
  filterCounts: Record<string, number>;
  primaryColor: string;
  onChangeFilter: (v: string) => void;
}

export default function HabitFilterBar({ filter, filterCounts, primaryColor: P, onChangeFilter }: Props) {
  const TH = useTheme();
  const T = useT();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
      {ALL_FILTERS.map(([v, l]) => {
        const isActive = filter === v;
        return (
          <TouchableOpacity key={v} onPress={() => onChangeFilter(v)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
              backgroundColor: isActive ? `${P}20` : TH.card,
              borderWidth: 1, borderColor: isActive ? P : TH.border,
            }}>
            <Text style={{ color: isActive ? P : TH.text, fontSize: FONT_SMALL() }}>{T(l)}</Text>
            <View style={{ backgroundColor: `${P}20`, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 }}>
              <Text style={{ color: P, fontSize: FONT_TINY(), fontWeight: '600' }}>{filterCounts[v] ?? 0}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
