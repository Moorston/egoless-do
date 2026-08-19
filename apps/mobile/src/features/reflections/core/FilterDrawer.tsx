import {FONT_SMALL, FONT_BUTTON, FONT_LABEL, dateStr, FONT_TITLE} from '@egoless-do/core';
import { X, Link, ListChecks, Calendar } from 'lucide-react-native';
import React, { useState, useCallback } from 'react';
import {View, Text, TouchableOpacity, ScrollView, StyleSheet} from 'react-native';

import DateRangePickerModal from '../../../components/DateRangePickerModal';
import {useTheme} from '../../../components/UI';

interface Props {
  visible: boolean;
  onClose: () => void;
  filters: {
    tags: string[];
    moods: string[];
    hasLink?: boolean;
    hasLinkedTask?: boolean;
    dateRange?: { from: number; to: number };
    datePreset?: string;
  };
  onApplyFilters: (filters: Props['filters']) => void;
  allTagOptions: string[];
  allMoodOptions: string[];
  dynamicTagCounts: Record<string, number>;
  dynamicMoodCounts: Record<string, number>;
  primaryColor: string;
}

type DatePreset = 'week' | 'month' | '7d' | '30d' | 'custom';

function getDateRange(preset: Exclude<DatePreset, 'custom'>): { from: number; to: number } {
  const now = new Date();
  const to = Date.now();
  let from: number;
  if (preset === 'week') {
    const d = new Date(now);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    from = d.getTime();
  } else if (preset === 'month') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    from = d.getTime();
  } else if (preset === '7d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    from = d.getTime();
  } else {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    d.setHours(0, 0, 0, 0);
    from = d.getTime();
  }
  return { from, to };
}

const QUICK_PRESETS: { key: Exclude<DatePreset, 'custom'>; label: string }[] = [
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: '7d', label: '近7天' },
  { key: '30d', label: '近30天' },
];

function FilterDrawerComponent({
  visible,
  onClose,
  filters,
  onApplyFilters,
  allTagOptions,
  allMoodOptions,
  dynamicTagCounts,
  dynamicMoodCounts,
  primaryColor: P,
}: Props) {
  const TH = useTheme();

  const [showRangePicker, setShowRangePicker] = useState(false);

  const activePreset = filters.datePreset as DatePreset | undefined;

  const handleTagToggle = useCallback((tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onApplyFilters({ ...filters, tags: newTags });
  }, [filters, onApplyFilters]);

  const handleMoodToggle = useCallback((mood: string) => {
    const newMoods = filters.moods.includes(mood)
      ? filters.moods.filter((m) => m !== mood)
      : [...filters.moods, mood];
    onApplyFilters({ ...filters, moods: newMoods });
  }, [filters, onApplyFilters]);

  const handleToggleHasLink = useCallback(() => {
    onApplyFilters({ ...filters, hasLink: filters.hasLink ? undefined : true });
  }, [filters, onApplyFilters]);

  const handleToggleHasLinkedTask = useCallback(() => {
    onApplyFilters({ ...filters, hasLinkedTask: filters.hasLinkedTask ? undefined : true });
  }, [filters, onApplyFilters]);

  const handleQuickPreset = useCallback((preset: Exclude<DatePreset, 'custom'>) => {
    if (activePreset === preset) {
      // 取消选中
      onApplyFilters({ ...filters, dateRange: undefined, datePreset: undefined });
    } else {
      onApplyFilters({ ...filters, dateRange: getDateRange(preset), datePreset: preset });
    }
  }, [filters, onApplyFilters, activePreset]);

  const handleCustomPress = useCallback(() => {
    setShowRangePicker(true);
  }, []);

  const handleCustomRangeConfirm = useCallback((start: string, end: string) => {
    setShowRangePicker(false);
    const from = new Date(start + 'T00:00:00').getTime();
    const to = new Date(end + 'T23:59:59').getTime();
    onApplyFilters({ ...filters, dateRange: { from, to }, datePreset: 'custom' });
  }, [filters, onApplyFilters]);

  const handleClearAll = useCallback(() => {
    onApplyFilters({ tags: [], moods: [], hasLink: undefined, hasLinkedTask: undefined, dateRange: undefined, datePreset: undefined });
  }, [onApplyFilters]);

  // 自定义范围显示文本
  const customLabel = activePreset === 'custom' && filters.dateRange
    ? `${new Date(filters.dateRange.from).toLocaleDateString('sv-SE')} ~ ${new Date(filters.dateRange.to).toLocaleDateString('sv-SE')}`
    : '自定义';

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={[styles.drawer, { backgroundColor: TH.cardSolid }]}>
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: TH.border }]} />
        </View>

        <View style={styles.header}>
          <Text style={[styles.title, { color: TH.text }]}>筛选</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={TH.sub} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 标签 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: TH.sub }]}>标签</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContainer}>
              <PillSelector
                options={allTagOptions}
                selected={filters.tags}
                onChange={handleTagToggle}
                counts={dynamicTagCounts}
                color={P}
                textActiveColor={P}
              />
            </ScrollView>
          </View>

          {/* 心情 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: TH.sub }]}>心情</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContainer}>
              <PillSelector
                options={allMoodOptions}
                selected={filters.moods}
                onChange={handleMoodToggle}
                counts={dynamicMoodCounts}
                color={P}
                textActiveColor={P}
              />
            </ScrollView>
          </View>

          {/* 时间范围 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: TH.sub }]}>时间范围</Text>
            <View style={styles.moreFilters}>
              {QUICK_PRESETS.map(({ key, label }) => {
                const isActive = activePreset === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => handleQuickPreset(key)}
                    style={[styles.filterChip, {
                      backgroundColor: isActive ? `${P}20` : TH.card,
                      borderColor: isActive ? P : TH.border,
                    }]}
                  >
                    <Calendar size={14} color={isActive ? P : TH.sub} />
                    <Text style={{ color: isActive ? P : TH.text, fontSize: FONT_SMALL() }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
              {/* 自定义 */}
              <TouchableOpacity
                onPress={handleCustomPress}
                style={[styles.filterChip, {
                  backgroundColor: activePreset === 'custom' ? `${P}20` : TH.card,
                  borderColor: activePreset === 'custom' ? P : TH.border,
                }]}
              >
                <Calendar size={14} color={activePreset === 'custom' ? P : TH.sub} />
                <Text style={{ color: activePreset === 'custom' ? P : TH.text, fontSize: FONT_SMALL() }}>{customLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 更多筛选 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: TH.sub }]}>更多筛选</Text>
            <View style={styles.moreFilters}>
              <TouchableOpacity
                onPress={handleToggleHasLink}
                style={[styles.filterChip, {
                  backgroundColor: filters.hasLink ? `${P}20` : TH.card,
                  borderColor: filters.hasLink ? P : TH.border,
                }]}
              >
                <Link size={14} color={filters.hasLink ? P : TH.sub} />
                <Text style={{ color: filters.hasLink ? P : TH.text, fontSize: FONT_SMALL() }}>有链接</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleToggleHasLinkedTask}
                style={[styles.filterChip, {
                  backgroundColor: filters.hasLinkedTask ? `${P}20` : TH.card,
                  borderColor: filters.hasLinkedTask ? P : TH.border,
                }]}
              >
                <ListChecks size={14} color={filters.hasLinkedTask ? P : TH.sub} />
                <Text style={{ color: filters.hasLinkedTask ? P : TH.text, fontSize: FONT_SMALL() }}>关联任务</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* 底部按钮 */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleClearAll} style={[styles.clearButton, { borderColor: TH.border }]}>
            <Text style={{ color: TH.sub, fontSize: FONT_BUTTON() }}>清除全部</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={[styles.applyButton, { backgroundColor: P }]}>
            <Text style={{ color: '#fff', fontSize: FONT_BUTTON(), fontWeight: '600' }}>应用筛选</Text>
          </TouchableOpacity>
        </View>
      </View>

      <DateRangePickerModal
        visible={showRangePicker}
        startDate={filters.dateRange ? new Date(filters.dateRange.from).toLocaleDateString('sv-SE') : dateStr()}
        endDate={filters.dateRange ? new Date(filters.dateRange.to).toLocaleDateString('sv-SE') : dateStr()}
        onConfirm={handleCustomRangeConfirm}
        onClose={() => setShowRangePicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.5)',
  },
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: FONT_TITLE(),
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: FONT_LABEL(),
    fontWeight: '600',
    marginBottom: 10,
  },
  pillsContainer: {
    gap: 8,
  },
  moreFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
});

const FilterDrawer = React.memo(FilterDrawerComponent);
export default FilterDrawer;
