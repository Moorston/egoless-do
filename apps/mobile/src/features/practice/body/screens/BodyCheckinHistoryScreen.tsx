import { FONT_TITLE, FONT_BODY, FONT_SMALL, FONT_STAT_CARD, FONT_BADGE } from '@egoless-do/core';
import { ChevronLeft } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../../../components/UI';
import { useRootNavigation } from '../../../../navigation/hooks';
import { useShallowStore } from '../../../../store/useAppStore';

const DIMENSIONS = [
  { key: 'energy' as const, color: '#f59e0b', labelKey: 'bodyEnergy' },
  { key: 'pain' as const, color: '#ef4444', labelKey: 'bodyPain' },
  { key: 'comfort' as const, color: '#10b981', labelKey: 'bodyComfort' },
  { key: 'sleep' as const, color: '#3b82f6', labelKey: 'bodySleepQuality' },
];

export default function BodyCheckinHistoryScreen() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const { bodyCheckins } = useShallowStore(s => ({
    bodyCheckins: s.bodyCheckins,
  }));

  const sortedCheckins = useMemo(() => {
    return (bodyCheckins ?? [])
      .filter(c => !c.deleted)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [bodyCheckins]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{T('bodyAwarenessRecords')}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {sortedCheckins.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🧘</Text>
            <Text style={{ fontSize: FONT_BODY(), color: TH.sub, textAlign: 'center' }}>{T('bodyAwarenessNoData')}</Text>
          </View>
        ) : (
          sortedCheckins.map(checkin => (
            <View key={checkin.id} style={[styles.card, { backgroundColor: TH.card }]}>
              {/* Date */}
              <View style={styles.dateRow}>
                <Text style={{ fontSize: FONT_BADGE(), color: TH.sub }}>{checkin.date}</Text>
              </View>

              {/* Dimension scores */}
              <View style={styles.dimensionRow}>
                {DIMENSIONS.map(dim => (
                  <View key={dim.key} style={styles.dimensionItem}>
                    <View style={[styles.dimensionCircle, { backgroundColor: dim.color + '20' }]}>
                      <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '800', color: dim.color }}>{checkin[dim.key]}</Text>
                    </View>
                    <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{T(dim.labelKey)}</Text>
                  </View>
                ))}
              </View>

              {/* Tags */}
              {checkin.tags && checkin.tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {checkin.tags.map(tag => (
                    <View key={tag} style={[styles.tag, { backgroundColor: TH.primary + '15' }]}>
                      <Text style={{ fontSize: FONT_SMALL(), color: TH.primary }}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Note */}
              {checkin.note && (
                <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginTop: 8, lineHeight: 18 }}>
                  📝 {checkin.note}
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backBtn: {
    marginRight: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  dateRow: {
    marginBottom: 12,
  },
  dimensionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  dimensionItem: {
    alignItems: 'center',
  },
  dimensionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
});
