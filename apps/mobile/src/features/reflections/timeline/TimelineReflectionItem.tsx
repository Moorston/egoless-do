import { FONT_SMALL, FONT_BODY, FONT_TINY, MIND_COLORS_EXTENDED, REFLECTION_CATEGORIES , getMoodIcon, formatDate, formatTime } from '@egoless-do/core';
import type { MindReflection, LinkType } from '@egoless-do/core';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

import { useTheme, useT } from '../../../components/UI';


const LINK_LABELS: Record<LinkType, { icon: string; label: string }> = {
  inspire: { icon: '💭', label: '引发' },
  evolve: { icon: '💡', label: '演进' },
  contrast: { icon: '🔄', label: '转折' },
  respond: { icon: '💬', label: '回应' },
  related: { icon: '🔗', label: '相关' },
};

interface TimelineReflectionItemProps {
  reflection: MindReflection;
  primaryColor: string;
  isLast: boolean;
  linkToNext: { type: LinkType } | null;
  onRemove: (id: string) => void;
  onCreatePlan: (id: string) => void;
  /** Legacy prop kept for backward-compat callers; not rendered. */
  _onCreatePlan?: (id: string) => void;
}

function TimelineReflectionItemComponent({
  reflection: r,
  primaryColor,
  isLast,
  linkToNext,
  onRemove,
  _onCreatePlan,
}: TimelineReflectionItemProps) {
  const TH = useTheme();
  const T = useT();

  const handleRemove = useCallback(() => {
    Alert.alert(
      T('thoughtTrailRemoveReflection'),
      T('trailTimelineRemoveConfirm'),
      [
        { text: T('commonCancel'), style: 'cancel' },
        { text: T('commonConfirm'), style: 'destructive', onPress: () => onRemove(r.id) },
      ]
    );
  }, [r.id, onRemove, T]);

  const displayContent = r.content.length > 100 ? r.content.slice(0, 100) + '...' : r.content;

  const dateObj = new Date(r.timestamp);
  const month = formatDate(dateObj, 'zh', { month: 'short' });
  const day = dateObj.getDate();
  const time = formatTime(dateObj, 'zh', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      {/* 左侧时间线 */}
      <View style={styles.timelineCol}>
        <View style={[styles.dot, { backgroundColor: primaryColor }]} />
        <Text style={[styles.dateLabel, { color: TH.sub }]}>{month}{day}日</Text>
        <Text style={[styles.timeLabel, { color: TH.sub }]}>{time}</Text>
        {!isLast && <View style={[styles.line, { backgroundColor: TH.border }]} />}
      </View>

      {/* 右侧卡片 */}
      <View style={[styles.cardWrapper, !isLast && { marginBottom: 10 }]}>
        <View style={[styles.card, { borderColor: TH.border }]}>
          {/* 渐变内容区 */}
          <LinearGradient
            colors={[r.colors?.[0] || MIND_COLORS_EXTENDED[0][0], r.colors?.[1] || MIND_COLORS_EXTENDED[0][1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <TouchableOpacity onPress={handleRemove} style={styles.removeBtn}>
              <X size={14} color="rgba(255,255,255,.6)" />
            </TouchableOpacity>
            <Text style={styles.content}>{displayContent}</Text>

            {(r.tags.length > 0 || r.mood) && (
              <View style={styles.tagsRow}>
                {r.tags.slice(0, 3).map(tag => {
                  const category = REFLECTION_CATEGORIES.find(c => `#${c.label}` === tag);
                  return (
                    <Text key={tag} style={styles.tagText}>
                      {category ? `${category.icon} ` : ''}{tag}
                    </Text>
                  );
                })}
                {r.mood && (
                  <Text style={styles.moodText}>{getMoodIcon(r.mood)}</Text>
                )}
              </View>
            )}
          </LinearGradient>
        </View>

        {/* 连接指示器 */}
        {!isLast && linkToNext && (
          <View style={styles.linkContainer}>
            <Text style={styles.linkIcon}>{LINK_LABELS[linkToNext.type]?.icon || '🔗'}</Text>
            <Text style={[styles.linkLabel, { color: TH.sub }]}>
              {LINK_LABELS[linkToNext.type]?.label || '相关'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export const TimelineReflectionItem = React.memo(TimelineReflectionItemComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  timelineCol: {
    width: 52,
    alignItems: 'center',
    paddingTop: 14,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dateLabel: {
    fontSize: FONT_TINY(),
    marginTop: 4,
    fontWeight: '500',
  },
  timeLabel: {
    fontSize: FONT_TINY(),
    marginTop: 1,
  },
  line: {
    width: 1,
    flex: 1,
    marginTop: 6,
  },
  cardWrapper: {
    flex: 1,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    padding: 4,
    zIndex: 5,
  },
  gradient: {
    padding: 14,
  },
  content: {
    color: '#fff',
    fontSize: FONT_BODY(),
    lineHeight: 26,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tagText: {
    color: 'rgba(255,255,255,.9)',
    fontSize: FONT_SMALL(),
  },
  moodText: {
    color: 'rgba(255,255,255,.7)',
    fontSize: FONT_SMALL(),
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 4,
  },
  linkIcon: {
    fontSize: FONT_SMALL(),
  },
  linkLabel: {
    fontSize: FONT_TINY(),
    fontWeight: '500',
  },
});
