import { FONT_SMALL } from '@egoless-do/core';
import type { TimelineItem , MindReflection, TrailNote, LinkType } from '@egoless-do/core';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useTheme, useT } from '../../../components/UI';
import { SwipeableRow } from '../core/SwipeableRow';

import { TimelineNoteItem } from './TimelineNoteItem';
import { TimelineReflectionItem } from './TimelineReflectionItem';


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
        <Text style={[styles.emptyIcon, { color: TH.sub }]}>🌱</Text>
        <Text style={[styles.emptyTitle, { color: TH.text }]}>还没有内容</Text>
        <Text style={[styles.emptyText, { color: TH.sub }]}>
          点击右下角 + 号添加感念、记录反思笔记{'\n'}或将已有的感念加入此脉络
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.map((ti, idx) => {
        const isLast = idx === items.length - 1;
        const nextItem = !isLast ? items[idx + 1] : null;

        // 计算时间间隔
        let dayGap = 0;
        if (nextItem) {
          dayGap = Math.round((ti.timestamp - nextItem.timestamp) / DAY_MS);
        }

        // 查找与下一条的连接
        const linkToNext = !isLast
          ? (links.find(l => l.fromId === getId(ti) && l.toId === getId(items[idx + 1])) ?? null)
          : null;

        const itemEl = ti.kind === 'reflection' ? (
          <TimelineReflectionItem
            reflection={ti.data as MindReflection}
            primaryColor={P}
            isLast={isLast}
            linkToNext={linkToNext}
            onRemove={onRemoveReflection}
            onCreatePlan={onCreatePlanFromReflection}
          />
        ) : (
          <TimelineNoteItem
            note={ti.data as TrailNote}
            primaryColor={P}
            isLast={isLast}
            onDelete={onDeleteNote}
            onCreatePlan={onCreatePlanFromNote}
          />
        );

        const deleteAction = ti.kind === 'reflection'
          ? () => onRemoveReflection((ti.data as MindReflection).id)
          : () => onDeleteNote((ti.data as TrailNote).id);

        return (
          <View key={getId(ti)}>
            <SwipeableRow onDelete={deleteAction}>
              {itemEl}
            </SwipeableRow>

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
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: FONT_SMALL(),
    textAlign: 'center',
    lineHeight: 22,
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
    fontSize: FONT_SMALL(),
    fontWeight: '500',
    marginHorizontal: 8,
  },
});
