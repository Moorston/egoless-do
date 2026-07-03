import React, { useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useAppStore } from '../../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useTheme, useT } from '../../../components/UI';
import { COLORS, calculateCheckinStreak, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BACK, formatTime, parseCheckinNote, INCOMPLETE_REASONS } from '@egoless-do/core';
import type { CheckinEntry } from '@egoless-do/core';
import { useRootNavigation, type RootStackParamList } from '../../../navigation/hooks';
import { ChevronLeft, CheckCircle2, PenLine, Hand, Utensils, Droplets, Star, PersonStanding, Sparkles, Circle, Check, AlertTriangle, Moon, Sunrise, Brain } from 'lucide-react-native';

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  textItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  emptyFooter: {
    height: 12,
  },
});

type DetailRoute = RouteProp<RootStackParamList, 'CheckinDetail'>;

export default function CheckinDetailScreen() {
  const TH = useTheme();
  const T = useT();
  const { checkinHistory } = useAppStore(useShallow(s => ({
    checkinHistory: s.checkinHistory,
  })));
  const nav = useRootNavigation();
  const route = useRoute<DetailRoute>();
  const date = route.params?.date ?? '';
  const record = (checkinHistory ?? []).find((c: CheckinEntry) => !c.deleted && c.date === date);

  const renderHeader = useCallback(() => {
    if (!record) return null;

    const streak = record.done ? calculateCheckinStreak((checkinHistory ?? []).filter(c => !c.deleted), date) : 0;
    const parsed = parseCheckinNote(record.note ?? '');

    const detailRows: { label: string; value: string; color?: string }[] = [
      { label: T('checkinTime'), value: formatTime(record.timestamp, record.date) },
      { label: T('checkinStatus'), value: record.done ? T('checkinDone') : T('checkinNotDone'), color: record.done ? COLORS.GREEN : COLORS.RED },
      { label: T('checkinStreak'), value: `${streak} ${T('days')}` },
      ...(record.weight != null ? [{ label: T('todayWeight'), value: `${record.weight} ${T('checkinKg')}` }] : []),
    ];

    return (
      <View>
        <View style={{
          backgroundColor: record.done ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.08)',
          borderRadius: 16, padding: 20, marginBottom: 12, alignItems: 'center',
        }}>
          {record.done
            ? <CheckCircle2 size={36} color={COLORS.GREEN} style={{ marginBottom: 8 }} />
            : <PenLine size={36} color={COLORS.RED} style={{ marginBottom: 8 }} />
          }
          <Text style={{ fontWeight: '700', fontSize: FONT_TITLE, color: record.done ? COLORS.GREEN : COLORS.RED }}>
            {record.done ? T('checkinDone') : T('checkinNotDone')}
          </Text>
          <Text style={{ fontSize: FONT_BODY, color: TH.sub, marginTop: 4 }}>{formatTime(record.timestamp, record.date)}</Text>
        </View>

        <View style={{ backgroundColor: TH.card, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: TH.border, marginBottom: 12 }}>
          {detailRows.map((r, i) => (
            <View key={r.label} style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              paddingVertical: 13, borderBottomWidth: i === detailRows.length - 1 ? 0 : 1, borderBottomColor: TH.border,
            }}>
              <Text style={{ fontSize: FONT_BODY, color: TH.sub }}>{r.label}</Text>
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: r.color ?? TH.text }}>{r.value}</Text>
            </View>
          ))}
        </View>

        {(parsed.fasted || parsed.waterMl > 0 || parsed.food > 0) && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {parsed.fasted && (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: 'rgba(16,185,129,.12)', borderRadius: 10, minWidth: 100 }}>
                <Hand size={16} color={COLORS.GREEN} />
                <Text style={{ fontSize: FONT_BODY, color: COLORS.GREEN, fontWeight: '600' }}>{T('checkinAbstinence')}</Text>
              </View>
            )}
            {parsed.waterMl > 0 && (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: 'rgba(59,130,246,.12)', borderRadius: 10, minWidth: 100 }}>
                <Droplets size={16} color="#3B82F6" />
                <Text style={{ fontSize: FONT_BODY, color: '#3B82F6', fontWeight: '600' }}>{parsed.waterMl}ml</Text>
              </View>
            )}
            {parsed.food > 0 && (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: 'rgba(245,158,11,.12)', borderRadius: 10, minWidth: 100 }}>
                <Utensils size={16} color="#F59E0B" />
                <Text style={{ fontSize: FONT_BODY, color: '#F59E0B', fontWeight: '600' }}>{parsed.food} kcal</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }, [record, checkinHistory, date, TH, T]);

  const renderItem = useCallback(({ item }: { item: { kind: string; key: string; label?: string; value?: string; color?: string; practice?: string; custom?: string; habit?: string; planItem?: CheckinEntry['note']; isLast?: boolean } }) => {
    if (item.kind === 'section-header') {
      return (
        <View style={[styles.sectionHeader, { borderBottomColor: TH.border }]}>
          <Star size={18} color={TH.text} />
          <Text style={{ fontWeight: '600', color: TH.text, fontSize: FONT_BODY }}>{item.label}</Text>
        </View>
      );
    }

    if (item.kind === 'practice') {
      const practice = item.practice ?? '';
      const practiceLabels: Record<string, string> = { sit: T('checkinSit'), stand: T('checkinStand'), chant: T('checkinSutra') };
      const practiceIcons: Record<string, React.ReactNode> = { sit: <Moon size={16} color={TH.text} />, stand: <Sunrise size={16} color={TH.text} />, chant: <Brain size={16} color={TH.text} /> };
      return (
        <View style={[styles.listItem, item.isLast && { borderBottomWidth: 0 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {practiceIcons[practice] ?? practice}
            <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{practiceLabels[practice] ?? practice}</Text>
          </View>
          <Check size={16} color={COLORS.GREEN} />
        </View>
      );
    }

    if (item.kind === 'text') {
      return (
        <View style={[styles.textItem, item.isLast && { borderBottomWidth: 0 }]}>
          <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{item.label}</Text>
          <Check size={16} color={COLORS.GREEN} />
        </View>
      );
    }

    if (item.kind === 'detail') {
      return (
        <View style={[styles.listItem, item.isLast && { borderBottomWidth: 0 }]}>
          <Text style={{ fontSize: FONT_BODY, color: TH.sub }}>{item.label}</Text>
          <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: item.color ?? TH.text }}>{item.value}</Text>
        </View>
      );
    }

    return null;
  }, [TH, T]);

  const keyExtractor = useCallback((item: { key: string }) => item.key, []);

  const getListData = useCallback((): { kind: string; key: string; label?: string; value?: string; color?: string; practice?: string; custom?: string; habit?: string; planItem?: CheckinEntry['note']; isLast?: boolean }[] => {
    if (!record) return [];

    const parsed = parseCheckinNote(record.note ?? '');
    const data: { kind: string; key: string; label?: string; value?: string; color?: string; practice?: string; custom?: string; habit?: string; planItem?: CheckinEntry['note']; isLast?: boolean }[] = [];

    if (parsed.practices.length > 0) {
      data.push({ kind: 'section-header', key: 'practice-header', label: T('checkinPractice') });
      parsed.practices.forEach((practice, i) => {
        data.push({ kind: 'practice', key: `practice-${practice}-${i}`, practice, isLast: i === parsed.practices.length - 1 });
      });
    }

    if (parsed.customs.length > 0) {
      data.push({ kind: 'section-header', key: 'custom-header', label: T('checkinCustom') });
      parsed.customs.forEach((custom, i) => {
        data.push({ kind: 'text', key: `custom-${custom}-${i}`, label: custom, isLast: i === parsed.customs.length - 1 });
      });
    }

    if (parsed.habits.length > 0) {
      data.push({ kind: 'section-header', key: 'habit-header', label: T('checkinHabitCheck') });
      parsed.habits.forEach((habit, i) => {
        data.push({ kind: 'text', key: `habit-${habit}-${i}`, label: habit, isLast: i === parsed.habits.length - 1 });
      });
    }

    if (parsed.planItems.length > 0) {
      data.push({ kind: 'section-header', key: 'plan-header', label: T('planTodoList') });
      parsed.planItems.forEach((item, i) => {
        data.push({ kind: 'text', key: `plan-${typeof item === 'string' ? item : item.id}-${i}`, label: String(typeof item === 'string' ? item : item.name ?? item.id ?? ''), isLast: i === parsed.planItems.length - 1 });
      });
    }

    if (parsed.userNote) {
      data.push({ kind: 'section-header', key: 'note-header', label: T('checkinNote') });
      data.push({ kind: 'text', key: 'note-value', label: parsed.userNote });
    }

    if (parsed.incompleteReason) {
      const reason = INCOMPLETE_REASONS.find(r => r.code === parsed.incompleteReason);
      const labelKey = `incompleteReason${parsed.incompleteReason.charAt(0).toUpperCase() + parsed.incompleteReason.slice(1)}` as string;
      data.push({ kind: 'section-header', key: 'incomplete-header', label: `${reason?.icon ?? ''} ${T(labelKey)}` });
      if (parsed.incompleteNote) {
        data.push({ kind: 'text', key: 'incomplete-note', label: parsed.incompleteNote });
      }
    }

    return data;
  }, [record, T]);

  if (!record) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <ChevronLeft size={24} color={TH.text} />
          </TouchableOpacity>
        </View>
        <Text style={{ textAlign: 'center', color: TH.sub, padding: 40, fontSize: FONT_SUB }}>{T('checkinNoRecords')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <ChevronLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE, marginLeft: 12 }}>{T('checkinDetailTitle')}</Text>
      </View>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        data={getListData()}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={<View style={styles.emptyFooter} />}
        removeClippedSubviews={true}
      />
    </SafeAreaView>
  );
}
