import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import { COLORS, calculateCheckinStreak, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BACK, formatTime, parseCheckinNote } from '@egoless-do/core';
import type { CheckinEntry } from '@egoless-do/core';
import type { RootStackParamList } from '../../navigation';
import { ChevronLeft, CheckCircle2, PenLine, Hand, Utensils, Droplets, Star, PersonStanding, Sparkles, Circle, Check } from 'lucide-react-native';

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
  const parsed = parseCheckinNote(record.note ?? '');

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
          <Text style={{ fontSize: FONT_BODY, color: TH.sub, marginTop: 4 }}>{formatTime(record.timestamp, record.date)}</Text>
        </View>

        {/* Detail rows */}
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

        {/* Fasted & Water & Food */}
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

        {/* Practices */}
        {parsed.practices.length > 0 && (
          <View style={{ backgroundColor: TH.card, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: TH.border, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: TH.border }}>
              <Star size={18} color={TH.text} />
              <Text style={{ fontWeight: '600', color: TH.text, fontSize: FONT_BODY }}>{T('checkinPractice')}</Text>
            </View>
            {parsed.practices.map((practice, i) => {
              const practiceLabels: Record<string, string> = { sit: T('checkinSit'), stand: T('checkinStand'), chant: T('checkinSutra') };
              const practiceIcons: Record<string, React.ReactNode> = { sit: <PersonStanding size={16} color={TH.text} />, stand: <PersonStanding size={16} color={TH.text} />, chant: <Sparkles size={16} color={TH.text} /> };
              return (
                <View key={practice} style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingVertical: 13, borderBottomWidth: i === parsed.practices.length - 1 ? 0 : 1, borderBottomColor: TH.border,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {practiceIcons[practice] ?? practice}
                    <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{practiceLabels[practice] ?? practice}</Text>
                  </View>
                  <Check size={16} color={COLORS.GREEN} />
                </View>
              );
            })}
          </View>
        )}

        {/* Custom items */}
        {parsed.customs.length > 0 && (
          <View style={{ backgroundColor: TH.card, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: TH.border, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: TH.border }}>
              <PenLine size={18} color={TH.text} />
              <Text style={{ fontWeight: '600', color: TH.text, fontSize: FONT_BODY }}>{T('checkinCustom')}</Text>
            </View>
            {parsed.customs.map((custom, i) => (
              <View key={custom} style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: 13, borderBottomWidth: i === parsed.customs.length - 1 ? 0 : 1, borderBottomColor: TH.border,
              }}>
                <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{custom}</Text>
                <Check size={16} color={COLORS.GREEN} />
              </View>
            ))}
          </View>
        )}

        {/* Habits */}
        {parsed.habits.length > 0 && (
          <View style={{ backgroundColor: TH.card, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: TH.border, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: TH.border }}>
              <Circle size={18} color={TH.text} />
              <Text style={{ fontWeight: '600', color: TH.text, fontSize: FONT_BODY }}>{T('checkinHabitCheck')}</Text>
            </View>
            {parsed.habits.map((habit, i) => (
              <View key={habit} style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: 13, borderBottomWidth: i === parsed.habits.length - 1 ? 0 : 1, borderBottomColor: TH.border,
              }}>
                <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{habit}</Text>
                <Check size={16} color={COLORS.GREEN} />
              </View>
            ))}
          </View>
        )}

        {/* Note */}
        {parsed.userNote ? (
          <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: TH.border }}>
            <Text style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 8 }}>{T('checkinNote')}</Text>
            <Text style={{ fontSize: FONT_BODY, color: TH.text, lineHeight: 22 }}>{parsed.userNote}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
