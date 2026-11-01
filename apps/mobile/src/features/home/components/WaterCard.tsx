import { FONT_BODY, FONT_SUB } from '@egoless-do/core';
import { Droplets, Pencil } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { ProgressBar, useT, useTheme } from '../../../components/UI';
import { styles } from '../styles';

export interface WaterCardProps {
  isToday: boolean;
  waterMl: number;
  waterGoal: number;
  parsedWaterMl: number;
  openWaterGoal: () => void;
  addWaterCb: (ml: number) => void;
}

export function WaterCard({
  isToday,
  waterMl,
  waterGoal,
  parsedWaterMl,
  openWaterGoal,
  addWaterCb,
}: WaterCardProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  return (
    <>
      {/* ── Water card ── */}
      <View style={[styles.cardWithBorder, { backgroundColor: TH.card, borderColor: TH.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <View style={styles.flexRowGap6}>
            <Droplets size={16} color={P} />
            <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY() }}>{T('water')}</Text>
          </View>
          <View style={styles.flexRowGap6}>
            {isToday ? (
              <>
                <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>
                  <Text style={{ fontWeight: '600', color: P }}>{String(waterMl)}</Text> / {String(waterGoal)} ml
                </Text>
                <TouchableOpacity onPress={openWaterGoal} accessibilityLabel="编辑饮水目标">
                  <Pencil size={14} color={TH.sub} />
                </TouchableOpacity>
              </>
            ) : (
              <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>
                <Text style={{ fontWeight: '600', color: P }}>{String(parsedWaterMl)}</Text> ml
              </Text>
            )}
          </View>
        </View>
        {isToday ? (
          <>
            <ProgressBar pct={waterGoal > 0 ? waterMl / waterGoal * 100 : 0} color={P} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {[200, 250, 350, 500].map(ml => (
                <TouchableOpacity key={ml} onPress={() => addWaterCb(ml)}
                  accessibilityLabel={`添加${ml}毫升水`}
                  style={{ flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border }}>
                  <Text style={{ color: P, fontWeight: '600', fontSize: FONT_SUB() }}>{ml}ml</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <ProgressBar pct={waterGoal > 0 ? parsedWaterMl / waterGoal * 100 : 0} color={P} />
        )}
      </View>
    </>
  );
}
