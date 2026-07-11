import { FONT_BODY, FONT_SMALL, FONT_SUB } from '@egoless-do/core';
import { X, BarChart3 } from 'lucide-react-native';
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';

import { useTheme, useT } from '../../../components/UI';


interface FilterItem {
  key: string;
  value?: string;
  label: string;
}

interface Props {
  searchInput: string;
  onSearchChange: (text: string) => void;
  onSearchClear: () => void;
  onFilterPress: () => void;
  onStatsPress: () => void;
  showFilterDrawer: boolean;
  hasActiveFilters: boolean;
  activeFilters: FilterItem[];
  onRemoveFilter: (key: string, value?: string) => void;
  onClearAllFilters: () => void;
}

export default function SearchFilterBar({
  searchInput, onSearchChange, onSearchClear,
  onFilterPress, onStatsPress, showFilterDrawer,
  hasActiveFilters, activeFilters, onRemoveFilter, onClearAllFilters,
}: Props) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  return (
    <>
      {/* Search + toggle row */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: TH.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
          <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>🔍</Text>
          <TextInput
            value={searchInput}
            onChangeText={onSearchChange}
            placeholder="搜索感念..."
            placeholderTextColor={TH.sub}
            style={{ flex: 1, color: TH.text, fontSize: FONT_BODY(), padding: 0 }}
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={onSearchClear}>
              <X size={16} color={TH.sub} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={onFilterPress}
          style={{ paddingHorizontal: 14, borderRadius: 10, backgroundColor: showFilterDrawer ? `${P}20` : TH.card, justifyContent: 'center' }}
        >
          <Text style={{ color: showFilterDrawer ? P : TH.sub, fontSize: FONT_SMALL(), fontWeight: '600' }}>筛选</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onStatsPress}
          style={{ paddingHorizontal: 14, borderRadius: 10, backgroundColor: TH.card, justifyContent: 'center' }}
        >
          <BarChart3 size={18} color={TH.sub} />
        </TouchableOpacity>
      </View>

      {/* Active Filters Bar */}
      {hasActiveFilters && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginBottom: 12 }}>
          {activeFilters.map((f, i) => (
            <TouchableOpacity
              key={`${f.key}-${f.value ?? i}`}
              onPress={() => onRemoveFilter(f.key, f.value)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: `${P}15`, borderWidth: 1, borderColor: `${P}30` }}
            >
              <Text style={{ color: P, fontSize: FONT_SMALL() }}>{f.label}</Text>
              <X size={12} color={P} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={onClearAllFilters}
            style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border }}
          >
            <Text style={{ color: TH.sub, fontSize: FONT_SMALL() }}>清除全部</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </>
  );
}
