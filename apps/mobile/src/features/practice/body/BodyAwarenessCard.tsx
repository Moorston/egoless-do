import { FONT_BODY, FONT_SUB, FONT_BADGE, FONT_SMALL, type BodyCheckin, type Theme , FONT_TINY } from '@egoless-do/core';
import { Activity } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const DIMENSIONS: { key: keyof Pick<BodyCheckin, 'energy' | 'pain' | 'comfort' | 'sleep'>; color: string; labelKey: string }[] = [
  { key: 'energy', color: '#f59e0b', labelKey: 'bodyEnergy' },
  { key: 'pain', color: '#ef4444', labelKey: 'bodyPain' },
  { key: 'comfort', color: '#10b981', labelKey: 'bodyComfort' },
  { key: 'sleep', color: '#6366f1', labelKey: 'bodySleepQuality' },
];

interface Props {
  TH: Theme;
  T: (key: string) => string;
  checkins: BodyCheckin[];
  onRecordPress: () => void;
}

export default function BodyAwarenessCard({ TH, T, checkins, onRecordPress }: Props) {
  // Filter non-deleted, sort by date desc
  const validCheckins = checkins.filter(c => !c.deleted).sort((a, b) => b.date.localeCompare(a.date));
  const latest = validCheckins[0];

  // Last 7 days for trend
  const last7 = validCheckins.slice(0, 7).reverse();

  return (
    <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Activity size={18} color="#f59e0b" />
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{T('bodyAwareness')}</Text>
        </View>
        <TouchableOpacity onPress={onRecordPress} style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, backgroundColor: '#f59e0b15' }}>
          <Text style={{ fontSize: FONT_BADGE(), color: '#f59e0b' }}>{T('bodyFlowAwareness')}</Text>
        </TouchableOpacity>
      </View>

      {!latest ? (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: FONT_BODY(), color: TH.sub, textAlign: 'center' }}>{T('bodyAwarenessNoData')}</Text>
        </View>
      ) : (
        <>
          {/* Latest checkin summary */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            {DIMENSIONS.map(dim => {
              const value = latest[dim.key];
              return (
                <View key={dim.key} style={{ alignItems: 'center', flex: 1 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: dim.color + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: dim.color }}>{value}</Text>
                  </View>
                  <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T(dim.labelKey)}</Text>
                </View>
              );
            })}
          </View>

          {/* Tags if any */}
          {latest.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {latest.tags.map(tag => (
                <View key={tag} style={{ backgroundColor: '#f59e0b15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ fontSize: FONT_SMALL(), color: '#f59e0b' }}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 7-day mini trend - simple bar chart */}
          {last7.length > 1 && (
            <View>
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginBottom: 8 }}>{T('bodyAwareness')} 7d</Text>
              <View style={{ flexDirection: 'row', height: 60, alignItems: 'flex-end', gap: 2 }}>
                {last7.map((c, idx) => (
                  <View key={c.id} style={{ flex: 1, alignItems: 'center' }}>
                    <View style={{ width: '100%', gap: 1 }}>
                      {DIMENSIONS.map(dim => (
                        <View key={dim.key} style={{
                          height: Math.max(2, (c[dim.key] / 5) * 48),
                          backgroundColor: dim.color + '80',
                          borderRadius: 2,
                        }} />
                      ))}
                    </View>
                    <Text style={{ fontSize: FONT_TINY(), color: TH.sub, marginTop: 2 }}>
                      {c.date.slice(5)}
                    </Text>
                  </View>
                ))}
              </View>
              {/* Legend */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 8 }}>
                {DIMENSIONS.map(dim => (
                  <View key={dim.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dim.color }} />
                    <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T(dim.labelKey)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}
