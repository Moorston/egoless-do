import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, useT } from '../../components/UI';
import { FONT_SMALL } from '@egoless-do/core';
import type { TimelineItem } from '@egoless-do/core';
import type { MindReflection, TrailNote, LinkType } from '@egoless-do/core';
import { TimelineReflectionItem } from './TimelineReflectionItem';
import { TimelineNoteItem } from './TimelineNoteItem';

interface TimelineListProps {
  items: TimelineItem[];
  links: Array<{ fromId: string; toId: string; type: LinkType }>;
  onRemoveReflection: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onCreatePlanFromReflection: (id: string) => void;
  onCreatePlanFromNote: (id: string) => void;
}

const DAY_MS = 1000 * 60 * 60 * 24;

export function TimelineList({
  items,
  links,
  onRemoveReflection,
  onDeleteNote,
  onCreatePlanFromReflection,
  onCreatePlanFromNote,
}: TimelineListProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: TH.sub }]}>暂无感念</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const nextItem = !isLast ? items[idx + 1] : null;

        // 计算时间间隔
        let dayGap = 0;
        if (nextItem) {
          dayGap = Math.round((nextItem.timestamp - item.timestamp) / DAY_MS);
        }

        // 查找与下一条的连接
        const linkToNext = !isLast
          ? links.find(l => l.fromId === getId(item) && l.toId === getId(items[idx + 1]))
          : null;

        return (
          <View key={getId(item)}>
            {item.kind === 'reflection' ? (
              <TimelineReflectionItem
                reflection={item.data as MindReflection}
                primaryColor={P}
                isLast={isLast}
                linkToNext={linkToNext}
                onRemove={onRemoveReflection}
                onCreatePlan={onCreatePlanFromReflection}
              />
            ) : (
              <TimelineNoteItem
                note={item.data as TrailNote}
                primaryColor={P}
                isLast={isLast}
                onDelete={onDeleteNote}
                onCreatePlan={onCreatePlanFromNote}
              />
            )}

            {/* 时间间隔标签 */}
            {!isLast && dayGap > 3 && (
              <View style={styles.gapContainer}>
                <View style={styles.gapLine} />
                <Text style={[styles.gapText, { color: TH.sub }]}>
                  · {T('trailTimelineDays').replace('{days}', String(dayGap))} ·
                </Text>
                <View style={styles.gapLine} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function getId(item: TimelineItem): string {
  return item.kind === 'reflection'
    ? (item.data as MindReflection).id
    : (item.data as TrailNote).id;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: FONT_SMALL,
  },
  gapContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 11,
    paddingVertical: 4,
  },
  gapLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'transparent',
  },
  gapText: {
    fontSize: FONT_SMALL,
    fontWeight: '500',
    marginHorizontal: 8,
  },
});
