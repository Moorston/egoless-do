import { FONT_TINY } from '@egoless-do/core';
import type { SmartQueryFilters } from '@egoless-do/core';
import { X } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { useTheme } from '../../../components/UI';


interface FilterTagsProps {
  filters: SmartQueryFilters;
  onRemoveFilter: (type: keyof SmartQueryFilters, value?: string) => void;
  onAddPress: () => void;
}

const TIME_RANGE_LABELS: Record<string, string> = {
  week: '本周',
  month: '本月',
  '3months': '近3月',
  all: '全部',
};

export function FilterTags({ filters, onRemoveFilter, onAddPress }: FilterTagsProps) {
  const TH = useTheme();

  const tags: Array<{ type: keyof SmartQueryFilters; label: string; value?: string }> = [];

  if (filters.timeRange) {
    tags.push({ type: 'timeRange', label: `📅 ${TIME_RANGE_LABELS[filters.timeRange] || filters.timeRange}` });
  }
  if (filters.tags) {
    for (const tag of filters.tags) {
      tags.push({ type: 'tags', label: `🏷 ${tag}`, value: tag });
    }
  }
  if (filters.moods) {
    for (const mood of filters.moods) {
      tags.push({ type: 'moods', label: `📈 ${mood}`, value: mood });
    }
  }
  if (filters.keywords) {
    for (const kw of filters.keywords) {
      tags.push({ type: 'keywords', label: `"${kw}"`, value: kw });
    }
  }

  if (tags.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.tagsRow}>
        {tags.map((tag, idx) => (
          <View
            key={`${tag.type}-${tag.value || idx}`}
            style={[styles.tag, { backgroundColor: `${TH.primary}12`, borderColor: `${TH.primary}25` }]}
          >
            <Text style={[styles.tagText, { color: TH.primary }]}>{tag.label}</Text>
            <TouchableOpacity
              onPress={() => onRemoveFilter(tag.type, tag.value)}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <X size={12} color={TH.primary} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          onPress={onAddPress}
          style={[styles.addBtn, { borderColor: TH.border }]}
        >
          <Text style={[styles.addText, { color: TH.sub }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: FONT_TINY,
    fontWeight: '500',
  },
  addBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: -1,
  },
});
