import { FONT_BODY, FONT_SUB, FONT_BADGE, type Theme } from '@egoless-do/core';
import { Check } from 'lucide-react-native';
import React from 'react';
import { View, Text } from 'react-native';

import type { DayData } from '../useVowProgress';

interface Props {
  TH: Theme;
  T: (key: string) => string;
  dailyData: DayData[];
}

export default function DailyDetail({ TH, T, dailyData }: Props) {
  return (
    <View style={{
      backgroundColor: TH.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: TH.border,
    }}>
      <Text style={{ fontSize: FONT_SUB(), fontWeight: '700', color: TH.text, marginBottom: 12 }}>
        {T('vowProgressWeekly')}
      </Text>

      {dailyData.map((day, index) => {
        const totalItems = day.habits.length + day.plans.length;
        const hasItems = totalItems > 0;
        const isComplete = hasItems && day.habits.every((h: { name: string }) => !!h.name) && day.plans.every((p: { name: string }) => !!p.name);

        return (
          <View
            key={day.date}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
              borderBottomWidth: index < dailyData.length - 1 ? 1 : 0,
              borderBottomColor: `${TH.border}40`,
            }}
          >
            {/* Day label */}
            <View style={{
              width: 40, alignItems: 'center',
              backgroundColor: day.isToday ? `${TH.primary}20` : 'transparent',
              borderRadius: 6, paddingVertical: 2,
            }}>
              <Text style={{
                fontSize: FONT_BADGE(),
                fontWeight: day.isToday ? '700' : '400',
                color: day.isToday ? TH.primary : TH.sub,
              }}>
                {T(`bodyWeek${day.label}`) || day.label}
              </Text>
            </View>

            {/* Status indicator */}
            <View style={{ width: 28, alignItems: 'center' }}>
              {isComplete ? (
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  backgroundColor: '#8B5CF6',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={12} color="#fff" strokeWidth={3} />
                </View>
              ) : (
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  borderWidth: 1.5, borderColor: TH.border,
                }} />
              )}
            </View>

            {/* Items list */}
            <View style={{ flex: 1, marginLeft: 4 }}>
              {totalItems > 0 ? (
                <Text style={{ fontSize: FONT_BODY(), color: TH.text }} numberOfLines={1}>
                  {day.habits.map(h => h.name).concat(day.plans.map(p => p.name)).join(', ')}
                </Text>
              ) : (
                <Text style={{ fontSize: FONT_BODY(), color: TH.sub }}>-</Text>
              )}
            </View>

            {/* Count badge */}
            {totalItems > 0 && (
              <View style={{
                backgroundColor: '#8B5CF620',
                paddingHorizontal: 8, paddingVertical: 2,
                borderRadius: 8,
              }}>
                <Text style={{ fontSize: 11, color: '#8B5CF6', fontWeight: '600' }}>
                  {totalItems}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
