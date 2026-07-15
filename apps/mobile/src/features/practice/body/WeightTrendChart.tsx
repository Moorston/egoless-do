import { FONT_BODY, FONT_SUB, FONT_SMALL, FONT_STAT_CARD, FONT_TINY, type CheckinEntry, type Theme } from '@egoless-do/core';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react-native';
import React from 'react';
import { View, Text } from 'react-native';

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
  const barMaxHeight = 80;

  // Trend direction
  const first = last30[0].weight;
  const last = last30[last30.length - 1].weight;
  const diff = last - first;
  const TrendIcon = diff > 0.1 ? TrendingUp : diff < -0.1 ? TrendingDown : Minus;
  const trendColor = diff > 0.1 ? '#ef4444' : diff < -0.1 ? '#10b981' : TH.sub;

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

      {/* Bar chart */}
      <View style={{ flexDirection: 'row', height: barMaxHeight, alignItems: 'flex-end', gap: 1 }}>
        {last30.map((r, idx) => {
          const normalizedHeight = Math.max(4, ((r.weight - minW) / range) * (barMaxHeight - 4) + 4);
          return (
            <View key={r.id} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <View style={{
                width: '80%',
                height: normalizedHeight,
                backgroundColor: '#10b981' + '60',
                borderRadius: 2,
              }} />
              {idx % 5 === 0 && (
                <Text style={{ fontSize: FONT_TINY(), color: TH.sub, marginTop: 2 }}>{r.date.slice(5)}</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Body fat if available */}
      {last30.some(r => r.bodyFat != null) && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: TH.border }}>
          <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginBottom: 4 }}>{T('bodyBodyFat')}</Text>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {last30.filter(r => r.bodyFat != null).slice(-14).map(r => {
              const bfMax = Math.max(...last30.filter(x => x.bodyFat != null).map(x => x.bodyFat!));
              const bfMin = Math.min(...last30.filter(x => x.bodyFat != null).map(x => x.bodyFat!));
              const bfRange = bfMax - bfMin || 1;
              const h = Math.max(4, ((r.bodyFat! - bfMin) / bfRange) * 30 + 4);
              return (
                <View key={r.id} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 34 }}>
                  <View style={{ width: '80%', height: h, backgroundColor: '#6366f1' + '60', borderRadius: 2 }} />
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
