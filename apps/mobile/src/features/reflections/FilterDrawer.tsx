import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { X, Link, Pin, Calendar } from 'lucide-react-native';
import { FONT_BODY, FONT_SMALL, FONT_BUTTON, FONT_LABEL } from '@egoless-do/core';
import { useTheme, useT, PillSelector } from '../../components/UI';

interface Props {
  visible: boolean;
  onClose: () => void;
  filters: {
    tags: string[];
    moods: string[];
    hasLink?: boolean;
    isPinned?: boolean;
    dateRange?: { from: number; to: number };
  };
  onApplyFilters: (filters: any) => void;
  allTagOptions: string[];
  allMoodOptions: string[];
  dynamicTagCounts: Record<string, number>;
  dynamicMoodCounts: Record<string, number>;
  primaryColor: string;
}

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
  const T = useT();

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

  const handleToggleIsPinned = useCallback(() => {
    onApplyFilters({ ...filters, isPinned: filters.isPinned ? undefined : true });
  }, [filters, onApplyFilters]);

  const handleClearAll = useCallback(() => {
    onApplyFilters({ tags: [], moods: [], hasLink: undefined, isPinned: undefined, dateRange: undefined });
  }, [onApplyFilters]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={[styles.drawer, { backgroundColor: TH.cardSolid }]}>
        {/* Drag handle */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: TH.border }]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: TH.text }]}>筛选</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={TH.sub} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Tag filter */}
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

          {/* Mood filter */}
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

          {/* More filters */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: TH.sub }]}>更多筛选</Text>
            <View style={styles.moreFilters}>
              <TouchableOpacity
                onPress={handleToggleHasLink}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filters.hasLink ? `${P}20` : TH.card,
                    borderColor: filters.hasLink ? P : TH.border,
                  },
                ]}
              >
                <Link size={14} color={filters.hasLink ? P : TH.sub} />
                <Text style={{ color: filters.hasLink ? P : TH.text, fontSize: FONT_SMALL }}>有链接</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleToggleIsPinned}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filters.isPinned ? `${P}20` : TH.card,
                    borderColor: filters.isPinned ? P : TH.border,
                  },
                ]}
              >
                <Pin size={14} color={filters.isPinned ? P : TH.sub} />
                <Text style={{ color: filters.isPinned ? P : TH.text, fontSize: FONT_SMALL }}>已置顶</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleClearAll}
            style={[styles.clearButton, { borderColor: TH.border }]}
          >
            <Text style={{ color: TH.sub, fontSize: FONT_BUTTON }}>清除全部</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.applyButton, { backgroundColor: P }]}
          >
            <Text style={{ color: '#fff', fontSize: FONT_BUTTON, fontWeight: '600' }}>应用筛选</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: FONT_LABEL,
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
