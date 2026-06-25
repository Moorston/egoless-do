import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Link, Calendar, TrendingUp, CheckCircle, Bell, BellOff } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_TINY, COLORS, dateStr, daysInMonth, MOOD_DISPLAY } from '@egoless-do/core';
import { HABIT_LINK_COLORS } from '@egoless-do/core';
import type { Habit, HabitStatus } from '@egoless-do/core';
import TimePickerModal from '../../components/TimePickerModal';
import { Toggle } from '../../components/UI';
import { requestNotificationPermission, rescheduleAllHabitReminders } from '../notifications/NotificationService';

const STATUS_CONFIG: Record<HabitStatus, { label: string; color: string }> = {
  notStarted: { label: '未开始', color: COLORS.GRAY },
  inProgress: { label: '进行中', color: COLORS.GREEN },
  paused: { label: '已暂停', color: COLORS.YELLOW },
  abandoned: { label: '已放弃', color: COLORS.RED },
  completed: { label: '已完成', color: '#7C3AED' },
};

export default function HabitDetailScreen() {
  const TH = useTheme();
  const P = TH.primary;
  const store = useAppStore();
  const nav = useNavigation();
  const route = useRoute();

  const { habitId } = route.params as { habitId: string };
  const habit = useMemo(() =>
    (store.habits ?? []).find(h => !h.deleted && h.id === habitId),
    [store.habits, habitId]
  );

  // Alarm editing
  const [showAlarmPicker, setShowAlarmPicker] = useState(false);

  // Related reflections (exact tag match, sorted by newest first)
  const [expanded, setExpanded] = useState(false);
  const relatedReflections = useMemo(() => {
    if (!habit) return [];
    const habitTag = `#${habit.name}`;
    return (store.reflections ?? []).filter(r =>
      !r.deleted && r.tags.some(t => t === habitTag)
    ).sort((a, b) => b.timestamp - a.timestamp);
  }, [habit, store.reflections]);


  // Calendar data
  const today = new Date();
  const calYear = today.getFullYear();
  const calMonth = today.getMonth();
  const calDays = useMemo(() => daysInMonth(calYear, calMonth), [calYear, calMonth]);
  const firstDay = useMemo(() => new Date(calYear, calMonth, 1).getDay(), [calYear, calMonth]);

  if (!habit) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: TH.bg }}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: TH.sub }]}>习惯不存在</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = STATUS_CONFIG[habit.status];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: TH.text }]}>{habit.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View style={[styles.statsContainer, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}20`, alignSelf: 'flex-start', marginBottom: 12 }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: P }]}>{habit.streak}</Text>
              <Text style={[styles.statLabel, { color: TH.sub }]}>连续天数</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: P }]}>{habit.doneDays}</Text>
              <Text style={[styles.statLabel, { color: TH.sub }]}>总完成天数</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: P }]}>{habit.targetDays}</Text>
              <Text style={[styles.statLabel, { color: TH.sub }]}>目标天数</Text>
            </View>
          </View>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: TH.border }]}>
              <View style={[styles.progressFill, { width: `${habit.targetDays > 0 ? Math.min(100, (habit.doneDays / habit.targetDays) * 100) : 0}%`, backgroundColor: P }]} />
            </View>
            <Text style={[styles.progressText, { color: TH.sub }]}>
              {habit.targetDays > 0 ? Math.round((habit.doneDays / habit.targetDays) * 100) : 0}%
            </Text>
          </View>
        </View>

        {/* Habit Info */}
        <View style={[styles.infoCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <Text style={[styles.infoTitle, { color: TH.text }]}>习惯信息</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: TH.sub }]}>开始日期</Text>
            <Text style={[styles.infoValue, { color: TH.text }]}>{habit.startDate}</Text>
          </View>
          {habit.goal && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: TH.sub }]}>目标</Text>
              <Text style={[styles.infoValue, { color: TH.text }]}>{habit.goal}</Text>
            </View>
          )}
          {habit.insight && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: TH.sub }]}>我的愿景</Text>
              <Text style={[styles.infoValue, { color: TH.text }]}>{habit.insight}</Text>
            </View>
          )}
          {(habit.link && habit.link !== 'none') && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: TH.sub }]}>关联</Text>
              <Text style={[styles.infoValue, { color: HABIT_LINK_COLORS[habit.link] }]}>
                {habit.link === 'fasting' ? `禁食（${habit.linkConfig?.targetHours ?? 16}h）`
                  : habit.link === 'exercise' ? `锻炼（${habit.linkConfig?.targetMinutes ?? 30}min）`
                  : '冥想'}
              </Text>
            </View>
          )}
        </View>

        {/* Alarm reminder */}
        <View style={[styles.infoCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {habit.alarmEnabled ? <Bell size={18} color={P} /> : <BellOff size={18} color={TH.sub} />}
              <Text style={[styles.infoTitle, { color: TH.text, marginBottom: 0 }]}>{'每日提醒'}</Text>
            </View>
            <Toggle
              on={habit.alarmEnabled}
              onChange={async () => {
                store.updateHabit(habitId, { alarmEnabled: !habit.alarmEnabled });
                const granted = await requestNotificationPermission();
                if (granted) {
                  const s = useAppStore.getState();
                  const habits = s.habits.filter(h => !h.deleted);
                  const [gh, gm] = (s.remindTime ?? '21:00').split(':').map(Number);
                  await rescheduleAllHabitReminders(habits, gh, gm).catch(() => {});
                }
              }}
            />
          </View>
          {habit.alarmEnabled && (
            <TouchableOpacity
              onPress={() => setShowAlarmPicker(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: `${P}10` }}
            >
              <Text style={{ fontSize: 24, fontWeight: '700', color: P }}>
                {String(habit.alarmHour).padStart(2, '0')}:{String(habit.alarmMinute).padStart(2, '0')}
              </Text>
              <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>· 点击修改</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Calendar */}
        <View style={[styles.calendarCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <Text style={[styles.calendarTitle, { color: TH.text }]}>打卡日历</Text>
          {/* Weekday labels */}
          <View style={styles.weekdayRow}>
            {['日', '一', '二', '三', '四', '五', '六'].map((day, i) => (
              <View key={i} style={styles.weekdayCell}>
                <Text style={[styles.weekdayText, { color: TH.sub }]}>{day}</Text>
              </View>
            ))}
          </View>
          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <View key={`e${i}`} style={styles.dayCell} />
            ))}
            {Array.from({ length: calDays }).map((_, i) => {
              const day = i + 1;
              const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const checked = habit.checkedDates?.includes(ds);
              const isToday = ds === dateStr();
              return (
                <View key={day} style={styles.dayCell}>
                  <View style={[
                    styles.dayCircle,
                    {
                      backgroundColor: checked ? P : isToday ? `${P}30` : 'transparent',
                    },
                  ]}>
                    <Text style={{
                      color: checked ? '#fff' : isToday ? P : TH.text,
                      fontSize: FONT_SMALL,
                      fontWeight: isToday ? '700' : '400',
                    }}>
                      {day}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: P }]} />
              <Text style={[styles.legendText, { color: TH.sub }]}>已打卡</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: `${P}30` }]} />
              <Text style={[styles.legendText, { color: TH.sub }]}>今天</Text>
            </View>
          </View>
        </View>

        {/* Related Reflections */}
        {relatedReflections.length > 0 && (() => {
          const latest = relatedReflections[0];
          const rest = relatedReflections.slice(1);
          const latestMood = latest.mood ? (MOOD_DISPLAY[latest.mood] ?? latest.mood) : null;
          return (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: TH.text }]}>相关感念</Text>
              {/* Latest - full display */}
              <View style={[styles.relatedItem, { backgroundColor: TH.card, borderColor: TH.border }]}>
                <Text style={[styles.relatedContentFull, { color: TH.text }]}>
                  {latest.content}
                </Text>
                <View style={styles.relatedMeta}>
                  <View style={styles.relatedMetaLeft}>
                    {latestMood && <Text style={[styles.relatedMood, { color: TH.sub }]}>{latestMood}</Text>}
                    {latest.tags.map(t => (
                      <Text key={t} style={[styles.relatedTag, { color: P, backgroundColor: `${P}15` }]}>{t}</Text>
                    ))}
                  </View>
                  <Text style={[styles.relatedDate, { color: TH.sub }]}>
                    {new Date(latest.timestamp).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              {/* Collapsed rest */}
              {rest.length > 0 && (
                <>
                  {expanded && rest.map(r => {
                    const mood = r.mood ? (MOOD_DISPLAY[r.mood] ?? r.mood) : null;
                    return (
                      <View key={r.id} style={[styles.relatedItem, { backgroundColor: TH.card, borderColor: TH.border }]}>
                        <Text style={[styles.relatedContent, { color: TH.text }]} numberOfLines={2}>
                          {r.content}
                        </Text>
                        <View style={styles.relatedMeta}>
                          <View style={styles.relatedMetaLeft}>
                            {mood && <Text style={[styles.relatedMood, { color: TH.sub }]}>{mood}</Text>}
                            {r.tags.map(t => (
                              <Text key={t} style={[styles.relatedTag, { color: P, backgroundColor: `${P}15` }]}>{t}</Text>
                            ))}
                          </View>
                          <Text style={[styles.relatedDate, { color: TH.sub }]}>
                            {new Date(r.timestamp).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                  <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.expandBtn}>
                    <Text style={[styles.expandText, { color: P }]}>
                      {expanded ? '收起' : `展开更多 (${rest.length}条)`}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          );
        })()}

        {/* Relation Map Entry */}
        <TouchableOpacity
          onPress={() => nav.navigate('RelationMap', { context: { type: 'habit', id: habitId } })}
          style={[styles.relationEntry, { backgroundColor: TH.card, borderColor: TH.border }]}
        >
          <View style={[styles.relationIcon, { backgroundColor: `${P}20` }]}>
            <Link size={20} color={P} />
          </View>
          <View style={styles.relationContent}>
            <Text style={[styles.relationTitle, { color: TH.text }]}>关系全景图</Text>
            <Text style={[styles.relationDesc, { color: TH.sub }]}>查看感念、计划的关联关系</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
      {/* Alarm time picker */}
      <TimePickerModal
        visible={showAlarmPicker}
        value={`${String(habit.alarmHour).padStart(2, '0')}:${String(habit.alarmMinute).padStart(2, '0')}`}
        onConfirm={async (time) => {
          const [h, m] = time.split(':').map(Number);
          store.updateHabit(habitId, { alarmHour: h, alarmMinute: m });
          setShowAlarmPicker(false);
          const granted = await requestNotificationPermission();
          if (granted) {
            const s = useAppStore.getState();
            const habits = s.habits.filter(h => !h.deleted);
            const [gh, gm] = (s.remindTime ?? '21:00').split(':').map(Number);
            await rescheduleAllHabitReminders(habits, gh, gm).catch(() => {});
          }
        }}
        onClose={() => setShowAlarmPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FONT_BODY,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusText: {
    fontSize: FONT_SMALL,
    fontWeight: '600',
  },
  statsContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FONT_SMALL,
    marginTop: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    fontSize: FONT_SMALL,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: FONT_SMALL,
  },
  infoValue: {
    fontSize: FONT_SMALL,
    fontWeight: '500',
  },
  calendarCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  calendarTitle: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginBottom: 12,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    width: '14.28%',
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: FONT_TINY,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: FONT_SMALL,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginBottom: 12,
  },
  relatedItem: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  relatedContent: {
    fontSize: FONT_SMALL,
    marginBottom: 4,
  },
  relatedContentFull: {
    fontSize: FONT_SMALL,
    marginBottom: 8,
    lineHeight: 20,
  },
  relatedMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  relatedMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  relatedMood: {
    fontSize: FONT_TINY,
  },
  relatedTag: {
    fontSize: FONT_TINY,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  relatedDate: {
    fontSize: FONT_TINY,
    marginLeft: 8,
  },
  expandBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  expandText: {
    fontSize: FONT_SMALL,
    fontWeight: '600',
  },
  relationEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  relationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relationContent: {
    flex: 1,
  },
  relationTitle: {
    fontSize: FONT_BODY,
    fontWeight: '600',
  },
  relationDesc: {
    fontSize: FONT_SMALL,
  },
});
