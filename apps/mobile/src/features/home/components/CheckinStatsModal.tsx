import React, { useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme, useT } from '../../../components/UI';
import CalendarGrid from '../../../components/charts/CalendarGrid';
import { useAppStore } from '../../../store/useAppStore';
import { FONT_BODY, FONT_SUB, FONT_TITLE, computeLongestStreak, INCOMPLETE_REASONS, parseCheckinNote, MS_PER_WEEK } from '@egoless-do/core';
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
  const insets = useSafeAreaInsets();

  const checkinHistory = store.checkinHistory ?? [];
  const totalCompleted = useMemo(() => checkinHistory.filter((c: CheckinEntry) => c.done && !c.deleted).length, [checkinHistory]);
  const streak = store.streak;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // 本月打卡天数
  const monthDone = useMemo(() => {
    return checkinHistory.filter((c: CheckinEntry) => {
      if (!c.done || c.deleted) return false;
      const [cy, cm, cd] = c.date.split('-').map(Number);
      const d = new Date(cy, cm - 1, cd);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).length;
  }, [checkinHistory, currentYear, currentMonth]);

  // 本月已过天数
  const monthPassed = today.getDate();

  // 本月完成率
  const monthRate = useMemo(() => {
    if (monthPassed === 0) return 0;
    return Math.round((monthDone / monthPassed) * 100);
  }, [monthDone, monthPassed]);

  // 最长连续记录
  const longestStreak = useMemo(() => {
    return computeLongestStreak(checkinHistory.filter((c: CheckinEntry) => c.done && !c.deleted).map(c => c.date));
  }, [checkinHistory]);

  // 平均每周打卡
  const avgPerWeek = useMemo(() => {
    if (checkinHistory.length === 0) return 0;
    const dates = checkinHistory.filter((c: CheckinEntry) => c.done && !c.deleted).map(c => c.date).sort();
    if (dates.length === 0) return 0;
    const [fy, fm, fd] = dates[0].split('-').map(Number);
    const firstDate = new Date(fy, fm - 1, fd);
    const [ly, lm, ld] = dates[dates.length - 1].split('-').map(Number);
    const lastDate = new Date(ly, lm - 1, ld);
    const weeks = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / MS_PER_WEEK));
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

  // 本月未完成原因分布
  const reasonDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    checkinHistory
      .filter((c: CheckinEntry) => {
        if (c.done || c.deleted) return false;
        const [cy, cm, cd] = c.date.split('-').map(Number);
        const d = new Date(cy, cm - 1, cd);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .forEach((c: CheckinEntry) => {
        const parsed = parseCheckinNote(c.note ?? '');
        if (parsed.incompleteReason) {
          counts[parsed.incompleteReason] = (counts[parsed.incompleteReason] ?? 0) + 1;
        }
      });
    return INCOMPLETE_REASONS
      .map(r => ({ ...r, count: counts[r.code] ?? 0 }))
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [checkinHistory, currentYear, currentMonth]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: `${TH.bg}E6` }}>
        <View style={{ flex: 1, backgroundColor: TH.bg }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: TH.border }}>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>{T('checkinStats')}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
              <X size={24} color={TH.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom }}>
            {/* Calendar */}
            <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: TH.border }}>
              <CalendarGrid
                history={checkinHistory.filter((c: CheckinEntry) => !c.deleted).map((c: CheckinEntry) => ({ date: c.date, done: c.done, grace: c.grace }))}
                primaryColor={P}
                textColor={TH.text}
                subColor={TH.sub}
                borderColor={TH.border}
              />
            </View>

            {/* Stats Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: reasonDistribution.length > 0 ? 16 : 0 }}>
              {stats.map((stat, i) => (
                <View key={i} style={{ backgroundColor: TH.card, borderRadius: 14, padding: 12, width: '48%', borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                  <Text style={{ fontSize: 26, fontWeight: '700', color: P }}>{stat.value}</Text>
                  <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center' }}>{stat.label}</Text>
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2, textAlign: 'center' }}>{stat.sub}</Text>
                </View>
              ))}
            </View>

            {/* Incomplete Reason Distribution */}
            {reasonDistribution.length > 0 && (
              <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: TH.border }}>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text, marginBottom: 12 }}>{T('incompleteReasonStats')}</Text>
                {reasonDistribution.map((r) => {
                  const labelKey = `incompleteReason${r.code.charAt(0).toUpperCase() + r.code.slice(1)}` as string;
                  return (
                    <View key={r.code} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
                      <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{r.icon} {T(labelKey as any)}</Text>
                      <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: P }}>{r.count} {T('days')}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
