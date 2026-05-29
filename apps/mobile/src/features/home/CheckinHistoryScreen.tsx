import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import { COLORS, FONT_TITLE, FONT_SUB, FONT_BADGE, FONT_BACK } from '@egoless-do/core';
import type { RootStackParamList } from '../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function formatTime(ts?: number, date?: string): string {
  if (ts) {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return date ?? '';
}

export default function CheckinHistoryScreen() {
  const TH = useTheme();
  const T = useT();
  const store = useAppStore();
  const nav = useNavigation<Nav>();
  const history = store.checkinHistory ?? [];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Text style={{ color: TH.text, fontSize: FONT_BACK }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE, marginLeft: 12 }}>{T('checkinHistory')}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {history.length === 0 && (
          <Text style={{ textAlign: 'center', color: TH.sub, padding: 40, fontSize: FONT_SUB }}>{T('checkinNoRecords')}</Text>
        )}
        {history.map((h, i) => (
          <TouchableOpacity key={i} onPress={() => nav.navigate('CheckinDetail', { date: h.date })}
            style={{
              backgroundColor: TH.card, borderRadius: 16, padding: 14, marginBottom: 10,
              borderWidth: 1, borderColor: TH.border,
            }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ fontWeight: '600', fontSize: FONT_SUB, color: TH.text }}>{formatTime(h.timestamp, h.date)}</Text>
                {h.note ? <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2 }} numberOfLines={1}>{h.note.slice(0, 30)}{h.note.length > 30 ? '...' : ''}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View style={{
                  paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
                  backgroundColor: h.done ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.1)',
                }}>
                  <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: h.done ? COLORS.GREEN : COLORS.RED }}>
                    {h.done ? T('checkinDone') : T('checkinNotDone')}
                  </Text>
                </View>
                <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{h.streak} {T('checkinStreak')}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
