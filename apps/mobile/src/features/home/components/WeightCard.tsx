import { FONT_BODY, FONT_STAT_CARD, FONT_SUB } from '@egoless-do/core';
import { Footprints, Scale } from 'lucide-react-native';
import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useT, useTheme } from '../../../components/UI';
import { styles } from '../styles';

export interface WeightCardProps {
  weight: string;
  setWeight: (v: string) => void;
  handleSaveWeight: () => void;
  toggleWeightUnit: () => void;
  weightUnit: 'kg' | 'lb';
  isReadOnly: boolean;
  isToday: boolean;
  healthSyncEnabled: boolean;
  todaySteps: number | null;
}

export function WeightCard({
  weight,
  setWeight,
  handleSaveWeight,
  toggleWeightUnit,
  weightUnit,
  isReadOnly,
  isToday,
  healthSyncEnabled,
  todaySteps,
}: WeightCardProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  return (
    <>
      {/* ── Weight card ── */}
      <View style={[styles.cardWithBorder, { backgroundColor: TH.card, borderColor: TH.border }]}>
        <View style={styles.flexRowBetween}>
          <View style={styles.flexRowGap6}>
            <Scale size={16} color={P} />
            <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY() }}>{T('todayWeight')}</Text>
          </View>
          <View style={styles.flexRowGap6}>
            {isReadOnly ? (
              <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '700', color: P }}>
                {weight || '—'}
              </Text>
            ) : (
              <TextInput
                value={weight}
                onChangeText={setWeight}
                onBlur={handleSaveWeight}
                placeholder="—"
                placeholderTextColor={TH.sub}
                keyboardType="numeric"
                style={{
                  width: 70, textAlign: 'center', borderWidth: 1, borderColor: TH.border,
                  borderRadius: 8, paddingVertical: 6, color: TH.text, fontWeight: '700',
                  fontSize: FONT_BODY(), backgroundColor: TH.card,
                }}
              />
            )}
            <TouchableOpacity
              onPress={toggleWeightUnit}
              accessibilityLabel={weightUnit === 'kg' ? '切换为磅' : '切换为千克'}
              style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: `${P}20` }}
            >
              <Text style={{ color: P, fontWeight: '600', fontSize: FONT_SUB() }}>{weightUnit === 'kg' ? 'kg' : 'lb'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Steps */}
        {isToday && healthSyncEnabled && todaySteps != null ? (
          <View style={[styles.flexRowBetween, styles.marginTop10]}>
            <View style={styles.flexRowGap6}>
              <Footprints size={16} color={P} />
              <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY() }}>{T('todaySteps')}</Text>
            </View>
            <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '700', color: P }}>
              {todaySteps.toLocaleString()}
            </Text>
          </View>
        ) : !isToday ? (
          <View style={[styles.flexRowBetween, styles.marginTop10]}>
            <View style={styles.flexRowGap6}>
              <Footprints size={16} color={P} />
              <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY() }}>{T('todaySteps')}</Text>
            </View>
            <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '700', color: TH.sub }}>--</Text>
          </View>
        ) : null}
      </View>
    </>
  );
}
