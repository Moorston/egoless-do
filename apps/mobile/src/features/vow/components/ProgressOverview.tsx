import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_STAT_CARD, type Theme } from '@egoless-do/core';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, TrendingUp, Flame } from 'lucide-react-native';
import React from 'react';
import { View, Text } from 'react-native';

import { ProgressBar } from '../../../components/UI';

interface Props {
  TH: Theme;
  T: (key: string) => string;
  thisWeekPracticeDays: number;
  thisMonthPracticeDays: number;
  longestStreak: number;
}

export default function ProgressOverview({ TH, T, thisWeekPracticeDays, thisMonthPracticeDays, longestStreak }: Props) {
  const weekPct = Math.round((thisWeekPracticeDays / 7) * 100);

  return (
    <View style={{
      borderRadius: 16, overflow: 'hidden', marginBottom: 16,
    }}>
      <LinearGradient
        colors={['#7C3AED', '#8B5CF6', '#A78BFA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 20 }}
      >
        <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: '#fff', marginBottom: 16 }}>
          {T('vowProgressWeekly')}
        </Text>

        {/* Week progress bar */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: FONT_SUB(), color: 'rgba(255,255,255,0.8)' }}>
              {T('vowProgressDays')}
            </Text>
            <Text style={{ fontSize: FONT_SUB(), color: '#fff', fontWeight: '700' }}>
              {thisWeekPracticeDays}/7
            </Text>
          </View>
          <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' }}>
            <View style={{
              height: 8, borderRadius: 4, backgroundColor: '#fff',
              width: `${weekPct}%`,
            }} />
          </View>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ alignItems: 'center' }}>
            <Calendar size={18} color="rgba(255,255,255,0.8)" />
            <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: '#fff', marginTop: 4 }}>
              {thisWeekPracticeDays}
            </Text>
            <Text style={{ fontSize: FONT_SUB(), color: 'rgba(255,255,255,0.7)' }}>
              {T('vowProgressWeekly')}
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <TrendingUp size={18} color="rgba(255,255,255,0.8)" />
            <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: '#fff', marginTop: 4 }}>
              {thisMonthPracticeDays}
            </Text>
            <Text style={{ fontSize: FONT_SUB(), color: 'rgba(255,255,255,0.7)' }}>
              {T('vowProgressMonth')}
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Flame size={18} color="rgba(255,255,255,0.8)" />
            <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: '#fff', marginTop: 4 }}>
              {longestStreak}
            </Text>
            <Text style={{ fontSize: FONT_SUB(), color: 'rgba(255,255,255,0.7)' }}>
              {T('vowProgressStreak')}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}
