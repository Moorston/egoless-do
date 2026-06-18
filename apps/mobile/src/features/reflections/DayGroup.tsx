import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FONT_SUB, FONT_SMALL, FONT_TINY } from '@egoless-do/core';
import { useTheme } from '../../components/UI';
import ReflectionCard from './ReflectionCard';
import type { MindReflection } from '@egoless-do/core';

interface PlanItem {
  id: string;
  planId: string;
  name: string;
}

interface Props {
  date: string;
  reflections: MindReflection[];
  planItems?: PlanItem[];
  searchQuery?: string;
  onPress: (id: string) => void;
  onLongPress: (id: string) => void;
  onEdit: (id: string) => void;
  onTogglePin: (id: string) => void;
  onNavigateToPlan?: (planId: string) => void;
}

function DayGroupComponent({
  date,
  reflections,
  planItems = [],
  searchQuery,
  onPress,
  onLongPress,
  onEdit,
  onTogglePin,
  onNavigateToPlan,
}: Props) {
  const TH = useTheme();
  const P = TH.primary;

  const dayNum = date.slice(8, 10);
  const month = date.slice(5, 7);
  const [dy, dm, dd] = date.split('-').map(Number);
  const dateObj = new Date(dy, dm - 1, dd);
  const weekday = dateObj.toLocaleDateString('zh-CN', { weekday: 'short' });

  return (
    <View style={styles.container}>
      {/* Timeline header */}
      <View style={styles.timelineHeader}>
        <View style={styles.dateColumn}>
          <Text style={[styles.dayNum, { color: P }]}>{dayNum}</Text>
          <Text style={[styles.monthText, { color: TH.sub }]}>{month}月</Text>
        </View>
        <View style={styles.detailsColumn}>
          <View style={styles.dateDetails}>
            <Text style={[styles.dateText, { color: TH.sub }]}>{date}</Text>
            <Text style={[styles.weekdayText, { color: TH.sub }]}>· {weekday}</Text>
            <Text style={[styles.countText, { color: TH.sub }]}>· {reflections.length}条</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: TH.border }]} />
        </View>
      </View>

      {/* Cards with vertical line */}
      <View style={styles.cardsContainer}>
        <View style={[styles.verticalLine, { backgroundColor: TH.border }]} />
        {reflections.map((r, idx) => {
          const linkedPlanItem = r.linkedPlanItemId
            ? planItems.find((i) => i.id === r.linkedPlanItemId && !i.deleted)
            : null;

          return (
            <View key={r.id} style={styles.cardWrapper}>
              <View style={[styles.dot, { backgroundColor: P }]} />
              <View style={styles.cardContainer}>
                <ReflectionCard
                  reflection={r}
                  linkedPlanItem={linkedPlanItem}
                  searchQuery={searchQuery}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  onEdit={onEdit}
                  onTogglePin={onTogglePin}
                  onNavigateToPlan={onNavigateToPlan}
                  index={idx}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dateColumn: {
    width: 50,
    alignItems: 'center',
  },
  dayNum: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  monthText: {
    fontSize: FONT_TINY,
    marginTop: 2,
  },
  detailsColumn: {
    flex: 1,
    marginLeft: 8,
  },
  dateDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: FONT_SMALL,
  },
  weekdayText: {
    fontSize: FONT_SMALL,
  },
  countText: {
    fontSize: FONT_SMALL,
  },
  divider: {
    height: 1,
  },
  cardsContainer: {
    position: 'relative',
    paddingLeft: 25,
  },
  verticalLine: {
    position: 'absolute',
    left: 25,
    top: 0,
    bottom: 0,
    width: 2,
  },
  cardWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    left: -5,
    top: 14,
    zIndex: 1,
  },
  cardContainer: {
    flex: 1,
    marginLeft: 12,
  },
});

const DayGroup = React.memo(DayGroupComponent);
export default DayGroup;
