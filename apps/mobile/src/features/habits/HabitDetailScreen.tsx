import {FONT_BODY, FONT_SMALL, FONT_TINY, MOOD_DISPLAY, HABIT_LINK_COLORS, activeOnly , FONT_TITLE, FONT_STAT_CARD} from '@egoless-do/core';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ArrowLeft, Link, Bell, BellOff } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import TimePickerModal from '../../components/TimePickerModal';
import { useTheme, useT, ProgressBar , Toggle } from '../../components/UI';
import CalendarGrid from '../../components/charts/CalendarGrid';
import type { RootStackParamList } from '../../navigation/types';
import { useAppStore, useShallowStore } from '../../store/useAppStore';
import { requestNotificationPermission, rescheduleAllHabitReminders } from '../notifications/NotificationService';

import HabitStatsSection from './HabitStatsSection';
import { STATUS_COLORS, STATUS_LABELS } from './constants';



export default function HabitDetailScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const { habits, reflections, updateHabit } = useShallowStore(s => ({ habits: s.habits, reflections: s.reflections, updateHabit: s.updateHabit }));
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'HabitDetail'>>();

  const { habitId } = route.params;
  const habit = useMemo(() =>
    (habits ?? []).find(h => !h.deleted && h.id === habitId),
    [habits, habitId]
  );

  const [showAlarmPicker, setShowAlarmPicker] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const relatedReflections = useMemo(() => {
    if (!habit) return [];
    const habitTag = `#${habit.name}`;
    return (reflections ?? []).filter(r =>
      !r.deleted && r.tags.some(t => t === habitTag)
    ).sort((a, b) => b.timestamp - a.timestamp);
  }, [habit, reflections]);

  if (!habit) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: TH.bg }}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: TH.sub }]}>{T('habitNotFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = STATUS_COLORS[habit.status] ?? STATUS_COLORS.notStarted;
  const statusLabel = T(STATUS_LABELS[habit.status] ?? STATUS_LABELS.notStarted);
  const pct = habit.targetDays > 0 ? Math.min(100, (habit.doneDays / habit.targetDays) * 100) : 0;
  const calHistory = (habit.checkedDates ?? []).map(d => ({ date: d, done: true }));

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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={[styles.statsContainer, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, alignSelf: 'flex-start', marginBottom: 12 }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <View style={styles.statsRow}>
            {[
              { v: habit.streak, l: T('habitStreakDays') },
              { v: habit.doneDays, l: T('habitTotalDays') },
              { v: habit.targetDays, l: T('habitTargetDays') },
            ].map(({ v, l }) => (
              <View key={l} style={styles.statItem}>
                <Text style={[styles.statNumber, { color: P }]}>{v}</Text>
                <Text style={[styles.statLabel, { color: TH.sub }]}>{l}</Text>
              </View>
            ))}
          </View>
          <View style={styles.progressContainer}>
            <ProgressBar pct={pct} color={P} />
            <Text style={[styles.progressText, { color: TH.sub }]}>{Math.round(pct)}%</Text>
          </View>
        </View>

        {/* Habit Info */}
        <View style={[styles.infoCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <Text style={[styles.infoTitle, { color: TH.text }]}>{T('habitInfo')}</Text>
          {([
            { label: T('habitStartDate'), value: habit.startDate },
            habit.goal ? { label: T('habitTarget'), value: habit.goal } : null,
            habit.insight ? { label: T('habitMyVision'), value: habit.insight } : null,
            (habit.link && habit.link !== 'none') ? {
              label: T('habitLinked'),
              value: habit.link === 'fasting' ? `${T('habitLinkedFasting')}（${habit.linkConfig?.targetHours ?? 16}h）`
                : habit.link === 'exercise' ? `${T('habitLinkedExercise')}（${habit.linkConfig?.targetMinutes ?? 30}min）`
                : habit.link === 'sleep' ? T('habitLinkedSleep') : T('habitLinkedMeditation'),
              color: HABIT_LINK_COLORS[habit.link],
            } : null,
          ].filter(Boolean) as Array<{ label: string; value: string; color?: string }>).map(({ label, value, color }) => (
            <View key={label} style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: TH.sub }]}>{label}</Text>
              <Text style={[styles.infoValue, { color: color ?? TH.text }]}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Alarm reminder */}
        <View style={[styles.infoCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {habit.alarmEnabled ? <Bell size={18} color={P} /> : <BellOff size={18} color={TH.sub} />}
              <Text style={[styles.infoTitle, { color: TH.text, marginBottom: 0 }]}>{T('habitDailyReminder')}</Text>
            </View>
            <Toggle
              on={habit.alarmEnabled}
              onChange={async () => {
                updateHabit(habitId, { alarmEnabled: !habit.alarmEnabled });
                const granted = await requestNotificationPermission();
                if (granted) {
                  const s = useAppStore.getState();
                  const h = activeOnly(s.habits ?? []) as import('@egoless-do/core').Habit[];
                  const [gh, gm] = (s.remindTime ?? '21:00').split(':').map(Number);
                  await rescheduleAllHabitReminders(h, gh, gm).catch(() => {});
                }
              }}
            />
          </View>
          {habit.alarmEnabled && (
            <TouchableOpacity
              onPress={() => setShowAlarmPicker(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: `${P}10` }}
            >
              <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '700', color: P }}>
                {String(habit.alarmHour).padStart(2, '0')}:{String(habit.alarmMinute).padStart(2, '0')}
              </Text>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T('habitTapToModify')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Calendar — using shared CalendarGrid */}
        <View style={[styles.calendarCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <Text style={[styles.calendarTitle, { color: TH.text }]}>{T('habitCheckinCalendar')}</Text>
          <CalendarGrid
            history={calHistory}
            primaryColor={P}
            textColor={TH.text}
            subColor={TH.sub}
            borderColor={TH.border}
          />
        </View>

        {/* Statistics Charts */}
        <HabitStatsSection checkedDates={habit.checkedDates ?? []} />

        {/* Related Reflections */}
        {relatedReflections.length > 0 && (() => {
          const latest = relatedReflections[0];
          const rest = relatedReflections.slice(1);
          const latestMood = latest.mood ? (MOOD_DISPLAY[latest.mood] ?? latest.mood) : null;
          return (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: TH.text }]}>{T('habitRelatedReflections')}</Text>
              <View style={[styles.relatedItem, { backgroundColor: TH.card, borderColor: TH.border }]}>
                <Text style={[styles.relatedContentFull, { color: TH.text }]}>{latest.content}</Text>
                <View style={styles.relatedMeta}>
                  <View style={styles.relatedMetaLeft}>
                    {latestMood && <Text style={[styles.relatedMood, { color: TH.sub }]}>{latestMood}</Text>}
                    {latest.tags.map(t => (
                      <Text key={t} style={[styles.relatedTag, { color: P, backgroundColor: `${P}15` }]}>{t}</Text>
                    ))}
                  </View>
                  <Text style={[styles.relatedDate, { color: TH.sub }]}>{new Date(latest.timestamp).toLocaleDateString()}</Text>
                </View>
              </View>
              {rest.length > 0 && (
                <>
                  {expanded && rest.map(r => {
                    const mood = r.mood ? (MOOD_DISPLAY[r.mood] ?? r.mood) : null;
                    return (
                      <View key={r.id} style={[styles.relatedItem, { backgroundColor: TH.card, borderColor: TH.border }]}>
                        <Text style={[styles.relatedContent, { color: TH.text }]} numberOfLines={2}>{r.content}</Text>
                        <View style={styles.relatedMeta}>
                          <View style={styles.relatedMetaLeft}>
                            {mood && <Text style={[styles.relatedMood, { color: TH.sub }]}>{mood}</Text>}
                            {r.tags.map(t => (
                              <Text key={t} style={[styles.relatedTag, { color: P, backgroundColor: `${P}15` }]}>{t}</Text>
                            ))}
                          </View>
                          <Text style={[styles.relatedDate, { color: TH.sub }]}>{new Date(r.timestamp).toLocaleDateString()}</Text>
                        </View>
                      </View>
                    );
                  })}
                  <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.expandBtn}>
                    <Text style={[styles.expandText, { color: P }]}>
                      {expanded ? T('habitCollapse') : `${T('habitExpandMore')} (${rest.length})`}
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
            <Text style={[styles.relationTitle, { color: TH.text }]}>{T('habitRelationMap')}</Text>
            <Text style={[styles.relationDesc, { color: TH.sub }]}>{T('habitRelationMapDesc')}</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <TimePickerModal
        visible={showAlarmPicker}
        value={`${String(habit.alarmHour).padStart(2, '0')}:${String(habit.alarmMinute).padStart(2, '0')}`}
        onConfirm={async (time) => {
          const [h, m] = time.split(':').map(Number);
          updateHabit(habitId, { alarmHour: h, alarmMinute: m });
          setShowAlarmPicker(false);
          const granted = await requestNotificationPermission();
          if (granted) {
            const s = useAppStore.getState();
            const habits = activeOnly(s.habits ?? []) as import('@egoless-do/core').Habit[];
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: FONT_TITLE(), fontWeight: '700', flex: 1, textAlign: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: FONT_BODY() },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: FONT_SMALL(), fontWeight: '600' },
  statsContainer: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: FONT_STAT_CARD(), fontWeight: '700' },
  statLabel: { fontSize: FONT_SMALL(), marginTop: 4 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressText: { fontSize: FONT_SMALL(), fontWeight: '600', minWidth: 40, textAlign: 'right' },
  infoCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  infoTitle: { fontSize: FONT_BODY(), fontWeight: '600', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { fontSize: FONT_SMALL() },
  infoValue: { fontSize: FONT_SMALL(), fontWeight: '500' },
  calendarCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  calendarTitle: { fontSize: FONT_BODY(), fontWeight: '600', marginBottom: 12 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: FONT_BODY(), fontWeight: '600', marginBottom: 12 },
  relatedItem: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  relatedContent: { fontSize: FONT_SMALL(), marginBottom: 4 },
  relatedContentFull: { fontSize: FONT_SMALL(), marginBottom: 8, lineHeight: 20 },
  relatedMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  relatedMetaLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' },
  relatedMood: { fontSize: FONT_TINY() },
  relatedTag: { fontSize: FONT_TINY(), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  relatedDate: { fontSize: FONT_TINY(), marginLeft: 8 },
  expandBtn: { alignItems: 'center', paddingVertical: 8 },
  expandText: { fontSize: FONT_SMALL(), fontWeight: '600' },
  relationEntry: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, borderWidth: 1 },
  relationIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  relationContent: { flex: 1 },
  relationTitle: { fontSize: FONT_BODY(), fontWeight: '600' },
  relationDesc: { fontSize: FONT_SMALL() },
});
