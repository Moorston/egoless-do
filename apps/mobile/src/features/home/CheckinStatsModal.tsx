import React, { useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme, useT } from '../../components/UI';
import CalendarGrid from '../../components/charts/CalendarGrid';
import { useAppStore } from '../../store/useAppStore';
import { FONT_BODY, FONT_SUB, FONT_STAT_CARD, FONT_TITLE, computeLongestStreak } from '@egoless-do/core';
import type { CheckinEntry } from '@egoless-do/core';

interface CheckinStatsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CheckinStatsModal({ visible, onClose }: CheckinStatsModalProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();

  const checkinHistory = store.checkinHistory ?? [];
  const totalCompleted = useMemo(() => checkinHistory.filter((c: CheckinEntry) => c.done).length, [checkinHistory]);
  const streak = store.streak;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // 本月打卡天数
  const monthDone = useMemo(() => {
    return checkinHistory.filter((c: CheckinEntry) => {
      if (!c.done) return false;
      const d = new Date(c.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).length;
  }, [checkinHistory, currentYear, currentMonth]);

  // 本月已过天数
  const monthPassed = useMemo(() => today.getDate(), [today]);

  // 本月完成率
  const monthRate = useMemo(() => {
    if (monthPassed === 0) return 0;
    return Math.round((monthDone / monthPassed) * 100);
  }, [monthDone, monthPassed]);

  // 最长连续记录
  const longestStreak = useMemo(() => {
    return computeLongestStreak(checkinHistory.filter((c: CheckinEntry) => c.done).map(c => c.date));
  }, [checkinHistory]);

  // 平均每周打卡
  const avgPerWeek = useMemo(() => {
    if (checkinHistory.length === 0) return 0;
    const dates = checkinHistory.filter((c: CheckinEntry) => c.done).map(c => c.date).sort();
    if (dates.length === 0) return 0;
    const firstDate = new Date(dates[0]);
    const lastDate = new Date(dates[dates.length - 1]);
    const weeks = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    return Math.round((totalCompleted / weeks) * 10) / 10;
  }, [checkinHistory, totalCompleted]);

  const stats = [
    { label: T('monthCompletionRate'), value: `${monthRate}%`, sub: `${monthDone}/${monthPassed} ${T('days')}` },
    { label: T('monthCheckinDays'), value: monthDone, sub: `${T('total')} ${new Date(currentYear, currentMonth + 1, 0).getDate()} ${T('days')}` },
    { label: T('longestStreak'), value: longestStreak, sub: T('days') },
    { label: T('totalCompleted'), value: totalCompleted, sub: T('days') },
    { label: T('streak'), value: streak, sub: T('days') },
    { label: T('avgPerWeek'), value: avgPerWeek, sub: T('days') },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: `${TH.bg}E6` }}>
        <View style={{ flex: 1, backgroundColor: TH.bg }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: TH.border }}>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>{T('checkinStats')}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
              <X size={24} color={TH.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            {/* Calendar */}
            <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: TH.border }}>
              <CalendarGrid
                history={checkinHistory.map((c: CheckinEntry) => ({ date: c.date, done: c.done }))}
                primaryColor={P}
                textColor={TH.text}
                subColor={TH.sub}
                borderColor={TH.border}
              />
            </View>

            {/* Stats Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {stats.map((stat, i) => (
                <View key={i} style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, width: '48%', borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 4, textAlign: 'center' }}>{stat.label}</Text>
                  <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '700', color: P }}>{stat.value}</Text>
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2, textAlign: 'center' }}>{stat.sub}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
