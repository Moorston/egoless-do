// ─── 搜索+排序栏组件 ─────────────────────────────────────────────

import { FONT_BODY, FONT_SUB } from '@egoless-do/core';
import { Search, ArrowUpDown } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';

import { useTheme, useT } from '../../components/UI';

export type SortType = 'default' | 'name';

interface Props {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortType: SortType;
  onSortChange: (type: SortType) => void;
}

const SORT_LABELS: Record<SortType, string> = {
  default: '默认',
  name: '名称',
};

const SORT_CYCLE: SortType[] = ['default', 'name'];

export default function SearchSortBar({ searchQuery, onSearchChange, sortType, onSortChange }: Props) {
  const TH = useTheme();
  const T = useT();

  const handleCycleSort = useCallback(() => {
    const idx = SORT_CYCLE.indexOf(sortType);
    onSortChange(SORT_CYCLE[(idx + 1) % SORT_CYCLE.length]);
  }, [sortType, onSortChange]);

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}>
      {/* Search bar */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', backgroundColor: TH.card,
        borderRadius: 12, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: TH.border,
      }}>
        <Search size={16} color={TH.sub} />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder={T('searchHistory') || '搜索曲目...'}
          placeholderTextColor={TH.sub}
          style={{ flex: 1, marginLeft: 8, color: TH.text, fontSize: FONT_BODY(), padding: 0 }}
        />
      </View>

      {/* Sort row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity
          onPress={handleCycleSort}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: TH.card }}
        >
          <ArrowUpDown size={14} color={TH.sub} />
          <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>{SORT_LABELS[sortType]}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}