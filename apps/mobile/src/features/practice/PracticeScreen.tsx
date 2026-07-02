import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_STAT_CARD, dateStr } from '@egoless-do/core';
import { isPreceptHabit } from '@egoless-do/core';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import { useRootNavigation, useTabNavigation } from '../../navigation/hooks';
import SimpleHeader from '../../navigation/SimpleHeader';
import {
  Wind, Dumbbell, Moon, Salad,
  Flag, Binary, Brain,
  Shield, BellRing, ScrollText, HandHeart,
  Music, BookOpen, Timer, Flame,
  Waves,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

interface PracticeItem {
  key: string;
  icon: LucideIcon;
  labelKey: string;
  descKey: string;
  color: string;
  route?: string;
}

interface PracticeGroup {
  groupKey: string;
  color: string;
  items: PracticeItem[];
}

export default function PracticeScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useTabNavigation();
  const { visions, exerciseLog, fastingHistory, checkinHistory, habits, giveHistory, totalMedMinutes } = useAppStore(useShallow(s => ({
    visions: s.visions,
    exerciseLog: s.exerciseLog,
    fastingHistory: s.fastingHistory,
    checkinHistory: s.checkinHistory,
    habits: s.habits,
    giveHistory: s.giveHistory,
    totalMedMinutes: s.totalMedMinutes,
  })));

  const groups: PracticeGroup[] = useMemo(() => [
    {
      groupKey: 'practiceGroupTune',
      color: '#10B981',
      items: [
        { key: 'breath', icon: Wind, labelKey: 'practiceTuneBreath', descKey: 'practiceTuneBreathDesc', color: '#10B981', route: 'Breathing' },
        { key: 'body', icon: Dumbbell, labelKey: 'practiceTuneBody', descKey: 'practiceTuneBodyDesc', color: '#34D399', route: 'Body' },
        { key: 'sleep', icon: Moon, labelKey: 'practiceTuneSleep', descKey: 'practiceTuneSleepDesc', color: '#6EE7B7', route: 'Sleep' },
        { key: 'food', icon: Salad, labelKey: 'practiceTuneFood', descKey: 'practiceTuneFoodDesc', color: '#A7F3D0', route: 'Diet' },
      ],
    },
    {
      groupKey: 'practiceGroupMind',
      color: '#8B5CF6',
      items: [
        { key: 'vow', icon: Flag, labelKey: 'practiceMindVow', descKey: 'practiceMindVowDesc', color: '#8B5CF6', route: 'Vow' },
        { key: 'mind', icon: Brain, labelKey: 'practiceMindMind', descKey: 'practiceMindMindDesc', color: '#DDD6FE', route: 'Mind' },
        { key: 'meditate', icon: Binary, labelKey: 'practiceMindMeditate', descKey: 'practiceMindMeditateDesc', color: '#A78BFA', route: 'Meditation' },
        { key: 'zhiguan', icon: Waves, labelKey: 'practiceMindZhiguan', descKey: 'practiceMindZhiguanDesc', color: '#7C3AED', route: 'Zhiguan' },
      ],
    },
    {
      groupKey: 'practiceGroupAction',
      color: '#F59E0B',
      items: [
        { key: 'precept', icon: Shield, labelKey: 'practiceActionPrecept', descKey: 'practiceActionPreceptDesc', color: '#F59E0B', route: 'Precept' },
        { key: 'mantra', icon: BellRing, labelKey: 'practiceActionMantra', descKey: 'practiceActionMantraDesc', color: '#FBBF24', route: 'Mantra' },
        { key: 'sutra', icon: ScrollText, labelKey: 'practiceActionSutra', descKey: 'practiceActionSutraDesc', color: '#FCD34D', route: 'Sutra' },
        { key: 'give', icon: HandHeart, labelKey: 'practiceActionGive', descKey: 'practiceActionGiveDesc', color: '#FDE68A', route: 'Give' },
      ],
    },
    {
      groupKey: 'practiceGroupOther',
      color: '#6B7280',
      items: [
        { key: 'sound', icon: Music, labelKey: 'practiceOtherSound', descKey: 'practiceOtherSoundDesc', color: '#6B7280' },
        { key: 'read', icon: BookOpen, labelKey: 'practiceOtherRead', descKey: 'practiceOtherReadDesc', color: '#9CA3AF' },
      ],
    },
  ], []);

  const lifetimeVision = useMemo(() =>
    (visions ?? []).find(v => v.type === 'lifetime' && v.status === 'active' && !v.deleted),
    [visions],
  );
  const visionText = lifetimeVision?.text ?? '做一个禅悦的修行人';

  const weeklyStats = useMemo(() => {
    const now = Date.now();
    const weekStart = now - 7 * 24 * 3600 * 1000;
    const exerciseLogWeek = (exerciseLog ?? []).filter(e => !e.deleted && e.timestamp >= weekStart);
    const exerciseMin = Math.round(exerciseLogWeek.reduce((s, e) => s + e.durationSec, 0) / 60);
    const fastingCount = (fastingHistory ?? []).filter(f => !f.deleted && f.endedAt && f.startedAt >= weekStart).length;
    const checkinDays = (checkinHistory ?? []).filter(c => !c.deleted && c.done && new Date(c.date + 'T00:00:00').getTime() >= weekStart).length;
    // Precept days this week
    const preceptHabits = (habits ?? []).filter(h => !h.deleted && isPreceptHabit(h.name));
    const preceptWeekDays = new Set<string>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now - i * 24 * 3600 * 3600 * 1000);
      const ds = dateStr(d);
      if (preceptHabits.length > 0 && preceptHabits.some(h => (h.checkedDates ?? []).includes(ds))) {
        preceptWeekDays.add(ds);
      }
    }
    const giveCount = (giveHistory ?? []).filter(g => !g.deleted && g.timestamp >= weekStart).length;
    return { exerciseMin, fastingCount, checkinDays, preceptDays: preceptWeekDays.size, giveCount };
  }, [exerciseLog, fastingHistory, checkinHistory, habits, giveHistory]);

  const handlePress = (item: PracticeItem) => {
    if (item.route) {
      nav.navigate(item.route as never);
    }
    // TODO: navigate to other sub-pages when implemented
  };

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Practice" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Motto Banner */}
        <View style={styles.mottoBanner}>
          <LinearGradient
            colors={['#7117EA', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mottoGradient}
          >
            <Text style={styles.mottoText}>终极愿景：{visionText}</Text>
            <Text style={styles.visionText}>「知者行之始，行者知之成」</Text>
          </LinearGradient>
        </View>

        {/* Weekly Summary */}
        <View style={[styles.summaryCard, { backgroundColor: `${TH.primary}10`, borderColor: `${TH.primary}30` }]}>
          <Text style={[styles.summaryTitle, { color: TH.text }]}>{T('practiceWeekly')}</Text>
          <View style={styles.summaryRow}>
            {[
              { Icon: Binary, color: '#8B5CF6', value: totalMedMinutes, unit: T('medMinutes') },
              { Icon: Dumbbell, color: '#10B981', value: weeklyStats.exerciseMin, unit: T('medMinutes') },
              { Icon: Timer, color: '#F59E0B', value: weeklyStats.fastingCount, unit: T('fastTimes') },
              { Icon: Shield, color: '#F59E0B', value: weeklyStats.preceptDays, unit: T('preceptDays') || '天' },
              { Icon: HandHeart, color: '#FDE68A', value: weeklyStats.giveCount, unit: T('giveTotal') || '次' },
              { Icon: Flame, color: '#EF4444', value: weeklyStats.checkinDays, unit: T('calendarDays') },
            ].map((s, i) => (
              <View key={i} style={styles.summaryItem}>
                <s.Icon size={18} color={s.color} />
                <Text style={[styles.summaryValue, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.summaryUnit, { color: TH.sub }]}>{s.unit}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Groups */}
        {groups.map((group) => (
          <View key={group.groupKey} style={styles.groupSection}>
            <Text style={[styles.groupTitle, { color: group.color }]}>{T(group.groupKey)}</Text>
            <View style={styles.cardGrid}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.card, { borderColor: `${group.color}30` }]}
                    onPress={() => handlePress(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: `${group.color}15` }]}>
                      <Icon size={22} color={group.color} />
                    </View>
                    <Text style={[styles.cardLabel, { color: TH.text }]}>{T(item.labelKey)}</Text>
                    <Text style={[styles.cardDesc, { color: TH.sub }]} numberOfLines={1}>{T(item.descKey)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mottoBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mottoGradient: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mottoText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
  },
  visionText: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: FONT_SUB,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    gap: 2,
  },
  summaryValue: {
    fontSize: FONT_STAT_CARD,
    fontWeight: '800',
  },
  summaryUnit: {
    fontSize: 11,
  },
  groupSection: {
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: FONT_SUB,
    fontWeight: '700',
    marginBottom: 10,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '22%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: FONT_SUB,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardDesc: {
    fontSize: 10,
    textAlign: 'center',
  },
});
