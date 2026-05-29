import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import { COLORS, calculateCheckinStreak, FONT_TITLE, FONT_SUB, FONT_BACK } from '@egoless-do/core';
import type { CheckinEntry } from '@egoless-do/core';
import type { RootStackParamList } from '../../navigation';
import { ChevronLeft, CheckCircle2, PenLine } from 'lucide-react-native';

function formatTime(ts?: number, date?: string): string {
  if (ts) {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return date ?? '';
}

type DetailRoute = RouteProp<RootStackParamList, 'CheckinDetail'>;

export default function CheckinDetailScreen() {
  const TH = useTheme();
  const T = useT();
  const store = useAppStore();
  const nav = useNavigation();
  const route = useRoute<DetailRoute>();
  const date = route.params?.date ?? '';
  const record = (store.checkinHistory ?? []).find((c: CheckinEntry) => c.date === date);

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

  const streak = record.done ? calculateCheckinStreak(store.checkinHistory ?? [], date) : 0;

  const detailRows: { label: string; value: string; color?: string }[] = [
    { label: T('checkinTime'), value: formatTime(record.timestamp, record.date) },
    { label: T('checkinStatus'), value: record.done ? T('checkinDone') : T('checkinNotDone'), color: record.done ? COLORS.GREEN : COLORS.RED },
    { label: T('checkinStreak'), value: `${streak} ${T('days')}` },
    ...(record.weight != null ? [{ label: T('todayWeight'), value: `${record.weight} ${T('checkinKg')}` }] : []),
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <ChevronLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE, marginLeft: 12 }}>{T('checkinDetailTitle')}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Status card */}
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
          <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>{formatTime(record.timestamp, record.date)}</Text>
        </View>

        {/* Detail rows */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: TH.border, marginBottom: 12 }}>
          {detailRows.map((r, i) => (
            <View key={r.label} style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              paddingVertical: 13, borderBottomWidth: i === detailRows.length - 1 ? 0 : 1, borderBottomColor: TH.border,
            }}>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{r.label}</Text>
              <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: r.color ?? TH.text }}>{r.value}</Text>
            </View>
          ))}
        </View>

        {/* Note */}
        {record.note ? (
          <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: TH.border }}>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>{T('checkinContent')}</Text>
            <Text style={{ fontSize: FONT_SUB, color: TH.text, lineHeight: 22 }}>{record.note}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
