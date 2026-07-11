import { FONT_BODY, FONT_SUB, FONT_STAT_CARD, FONT_SMALL } from '@egoless-do/core';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Pencil, Target, BarChart3, Shield } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { useTheme, useT } from '../../../components/UI';


interface Props {
  status: 'draft' | 'done' | 'editing';
  bannerGrad: string[];
  bannerStatusText: string;
  bannerTimeText: string | null;
  isToday: boolean;
  totalCompleted: number;
  viewDateStats: { totalDays: number; streak: number };
  streak: number;
  showGrace: boolean;
  graceAvailable: boolean;
  onStatsPress: () => void;
}

export default function Banner({
  status, bannerGrad, bannerStatusText, bannerTimeText,
  isToday, totalCompleted, viewDateStats, streak,
  showGrace, graceAvailable, onStatsPress,
}: Props) {
  const TH = useTheme();
  const T = useT();

  return (
    <LinearGradient
      colors={bannerGrad}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 16, padding: 18, marginBottom: 12 }}
    >
      {/* Status — prominent */}
      <View style={{ alignItems: 'center', marginBottom: 14 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: 'rgba(255,255,255,.2)', borderRadius: 20,
          paddingHorizontal: 16, paddingVertical: 6,
        }}>
          {status === 'done'
            ? <Check size={18} color="#fff" />
            : status === 'editing'
            ? <Pencil size={18} color="#fff" />
            : <Target size={18} color="#fff" />
          }
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>
            {bannerStatusText}
          </Text>
        </View>
        {bannerTimeText ? (
          <Text style={{ color: 'rgba(255,255,255,.6)', fontSize: FONT_SUB, marginTop: 6 }}>{bannerTimeText}</Text>
        ) : null}
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={onStatsPress} activeOpacity={0.7}>
          <Text style={{ color: 'rgba(255,255,255,.6)', fontSize: FONT_SUB }}>{T('totalCompleted')}</Text>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: FONT_STAT_CARD }}>{isToday ? totalCompleted : viewDateStats.totalDays}</Text>
          <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: FONT_SMALL }}>{T('days')}</Text>
          <BarChart3 size={12} color="rgba(255,255,255,.7)" style={{ marginTop: 4 }} />
        </TouchableOpacity>
        <View style={{ width: 1, height: 40, backgroundColor: 'rgba(255,255,255,.2)' }} />
        <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={onStatsPress} activeOpacity={0.7}>
          <Text style={{ color: 'rgba(255,255,255,.6)', fontSize: FONT_SUB }}>{T('streak')}</Text>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: FONT_STAT_CARD }}>{isToday ? streak : viewDateStats.streak}</Text>
          <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: FONT_SMALL }}>{T('days')}</Text>
          {isToday && showGrace && graceAvailable ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
              <Shield size={10} color="rgba(255,255,255,.7)" />
              <Text style={{ color: 'rgba(255,255,255,.7)', fontSize: FONT_SMALL }}>{T('graceStreakPending')}</Text>
            </View>
          ) : (
            <BarChart3 size={12} color="rgba(255,255,255,.7)" style={{ marginTop: 4 }} />
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}