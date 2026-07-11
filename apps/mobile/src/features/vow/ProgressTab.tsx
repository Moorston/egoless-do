import { FONT_BODY, FONT_SUB, type Theme , scaleFontSize } from '@egoless-do/core';
import { Check } from 'lucide-react-native';
import React from 'react';
import { View, Text } from 'react-native';

import DailyDetail from './components/DailyDetail';
import ProgressOverview from './components/ProgressOverview';
import type { VowProgressData } from './useVowProgress';

interface Props {
  TH: Theme;
  T: (key: string) => string;
  progress: VowProgressData;
}

export default function ProgressTab({ TH, T, progress }: Props) {
  const { thisWeekPracticeDays, thisMonthPracticeDays, longestStreak, todayCompleted, dailyData } = progress;

  return (
    <View>
      {/* Overview card */}
      <ProgressOverview
        TH={TH}
        T={T}
        thisWeekPracticeDays={thisWeekPracticeDays}
        thisMonthPracticeDays={thisMonthPracticeDays}
        longestStreak={longestStreak}
      />

      {/* Today's completed */}
      {todayCompleted.length > 0 && (
        <View style={{
          backgroundColor: TH.card,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: TH.border,
        }}>
          <Text style={{ fontSize: FONT_SUB(), fontWeight: '700', color: TH.text, marginBottom: 10 }}>
            {T('vowProgressToday')}
          </Text>
          {todayCompleted.map((item, i) => (
            <View
              key={`${item.type}-${item.id}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 6,
                borderBottomWidth: i < todayCompleted.length - 1 ? 1 : 0,
                borderBottomColor: `${TH.border}40`,
              }}
            >
              <View style={{
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: item.type === 'habit' ? '#10B981' : '#F59E0B',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={12} color="#fff" strokeWidth={3} />
              </View>
              <Text style={{ fontSize: FONT_BODY(), color: TH.text, flex: 1 }}>{item.name}</Text>
              <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>
                {item.type === 'habit' ? T('vowProgressHabitDone') : T('vowProgressPlanDone')}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* No today items */}
      {todayCompleted.length === 0 && (
        <View style={{
          backgroundColor: TH.card,
          borderRadius: 16,
          padding: 20,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: TH.border,
          alignItems: 'center',
        }}>
          <Text style={{ fontSize: scaleFontSize(32)(), marginBottom: 8 }}>🧘</Text>
          <Text style={{ fontSize: FONT_BODY(), color: TH.sub, textAlign: 'center' }}>
            {T('vowProgressToday')} - {T('noHistory')}
          </Text>
        </View>
      )}

      {/* Daily detail */}
      <DailyDetail TH={TH} T={T} dailyData={dailyData} />
    </View>
  );
}
