import { FONT_BODY, FONT_SUB, FONT_SMALL, FONT_STAT_CARD, FONT_TINY, type CheckinEntry, type Theme } from '@egoless-do/core';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react-native';
import React from 'react';
import { View, Text, ScrollView } from 'react-native';

interface Props {
  TH: Theme;
  T: (key: string) => string;
  checkins: CheckinEntry[];
}

export default function WeightTrendChart({ TH, T, checkins }: Props) {
  // Filter non-deleted checkins that have a weight value, sort by date
  const validRecords = checkins
    .filter(r => !r.deleted && r.weight != null && r.weight > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const last30 = validRecords.slice(-30);

  if (last30.length === 0) {
    return (
      <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text, marginBottom: 12 }}>{T('bodyWeightTrend')}</Text>
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: FONT_BODY(), color: TH.sub, textAlign: 'center' }}>{T('bodyWeightNoData')}</Text>
        </View>
      </View>
    );
  }

  // Compute min/max for scaling
  const weights = last30.map(r => r.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;
  const barMaxHeight = 72;

  // Trend direction
  const first = last30[0].weight;
  const last = last30[last30.length - 1].weight;
  const diff = last - first;
  const TrendIcon = diff > 0.1 ? TrendingUp : diff < -0.1 ? TrendingDown : Minus;
  const trendColor = diff > 0.1 ? '#ef4444' : diff < -0.1 ? '#10b981' : TH.sub;

  // Recent 7 for the label row (only show labels for last 7 to keep it readable)
  const recent7 = last30.slice(-7);
  const recentDates = new Set(recent7.map(r => r.date));

  return (
    <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{T('bodyWeightTrend')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TrendIcon size={14} color={trendColor} />
          <Text style={{ fontSize: FONT_SMALL(), color: trendColor }}>
            {diff > 0 ? '+' : ''}{diff.toFixed(1)}kg
          </Text>
        </View>
      </View>

      {/* Latest weight prominent */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
        <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '900', color: TH.text }}>{last}</Text>
        <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>kg</Text>
      </View>

      {/* Bar chart with date + weight labels */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, paddingBottom: 20 }}>
        {last30.map((r) => {
          const normalizedHeight = Math.max(4, ((r.weight - minW) / range) * (barMaxHeight - 4) + 4);
          const isRecent = recentDates.has(r.date);
          return (
            <View key={r.date} style={{ alignItems: 'center', justifyContent: 'flex-end', width: 28 }}>
              {/* Weight value label (only for recent 7) */}
              {isRecent && (
                <Text style={{ fontSize: FONT_TINY(), color: TH.text, fontWeight: '600', marginBottom: 2 }}>
                  {r.weight}
                </Text>
              )}
              {/* Bar */}
              <View style={{
                width: '70%',
                height: normalizedHeight,
                backgroundColor: isRecent ? '#10b981' : '#10b98140',
                borderRadius: 2,
              }} />
              {/* Date label (only for recent 7) */}
              {isRecent && (
                <Text style={{ fontSize: FONT_TINY(), color: TH.sub, marginTop: 4 }} numberOfLines={1}>
                  {r.date.slice(5).replace('-', '/')}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}