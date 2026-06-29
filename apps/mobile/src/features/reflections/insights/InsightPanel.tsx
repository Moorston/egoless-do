import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme, useT } from '../../../components/UI';
import {
  FONT_BODY, FONT_SMALL, FONT_TINY, FONT_BUTTON, MS_PER_DAY, activeOnly,
  computeLocalInsights, formatDateShort,
} from '@egoless-do/core';
import type { HotTag, MindReflection } from '@egoless-do/core';

interface Props {
  visible: boolean;
  reflections: MindReflection[];
  onTagPress: (tag: string) => void;
  onMoodPress: (mood: string) => void;
  onGoRecord: () => void;
}

export default function InsightPanel({
  visible,
  reflections,
  onTagPress,
  onMoodPress,
  onGoRecord,
}: Props) {
  const TH = useTheme();
  const T = useT();

  const { filtered, spanDays } = useMemo(() => {
    const active = activeOnly(reflections);
    if (active.length === 0) return { filtered: [], spanDays: 15 };
    const sorted = [...active].sort((a, b) => b.timestamp - a.timestamp);
    const latest = sorted[0].timestamp;
    const cutoff = latest - 15 * MS_PER_DAY;
    return { filtered: sorted.filter(r => r.timestamp >= cutoff), spanDays: 15 };
  }, [reflections]);

  const localInsights = useMemo(() => {
    if (filtered.length < 3) return null;
    return computeLocalInsights(filtered, 'month');
  }, [filtered]);

  if (!visible) return null;

  if (filtered.length < 3) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 32 }}>
        <Text style={{ fontSize: 32, marginBottom: 8 }}>📝</Text>
        <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center' }}>
          {T('insightProfileEmpty')}
        </Text>
        <TouchableOpacity
          onPress={onGoRecord}
          style={{ backgroundColor: TH.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, marginTop: 12 }}
        >
          <Text style={{ color: '#fff', fontSize: FONT_BUTTON, fontWeight: '600' }}>{T('insightProfileGoRecord')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!localInsights) return null;

  const trendIcon = (t: HotTag['trend']) => t === 'rising' ? '↑' : t === 'declining' ? '↓' : '→';
  const trendColor = (t: HotTag['trend']) => t === 'rising' ? '#4CAF50' : t === 'declining' ? '#F44336' : TH.sub;
  const maxItems = 4;

  const sorted = [...filtered].sort((a, b) => a.timestamp - b.timestamp);
  const rangeStart = formatDateShort(sorted[0].timestamp);
  const rangeEnd = formatDateShort(sorted[sorted.length - 1].timestamp);

  return (
    <View>
      {/* Stats */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
          {T('insightProfileStats').replace('{days}', String(spanDays)).replace('{count}', String(localInsights.totalCount))}
        </Text>
        <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginTop: 2 }}>
          {rangeStart} ─ {rangeEnd}
        </Text>
        {localInsights.streakDays > 0 && (
          <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginTop: 2 }}>
            {T('insightProfileStreak').replace('{days}', String(localInsights.streakDays))}
          </Text>
        )}
      </View>

      {/* Hot Tags */}
      {localInsights.hotTags.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: FONT_SMALL, fontWeight: '600', color: TH.sub, marginBottom: 8 }}>
            {T('insightProfileHotTags')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {localInsights.hotTags.slice(0, maxItems).map(tag => (
              <TouchableOpacity
                key={tag.tag}
                onPress={() => onTagPress(tag.tag)}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: `${TH.primary}12`,
                  borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
                  marginRight: 8, marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: FONT_SMALL, fontWeight: '600', color: TH.text }}>{tag.tag}</Text>
                <Text style={{ fontSize: FONT_TINY, color: trendColor(tag.trend), marginLeft: 4 }}>{trendIcon(tag.trend)}</Text>
                <Text style={{ fontSize: FONT_TINY, color: TH.sub, marginLeft: 4 }}>{tag.count}次</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Mood Distribution */}
      {localInsights.moodDistribution.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: FONT_SMALL, fontWeight: '600', color: TH.sub, marginBottom: 8 }}>
            {T('insightProfileMoodDist')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {localInsights.moodDistribution.slice(0, maxItems).map(entry => (
              <TouchableOpacity
                key={entry.mood}
                onPress={() => onMoodPress(entry.mood)}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: `${TH.primary}12`,
                  borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
                  marginRight: 8, marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: FONT_SMALL }}>{entry.icon}</Text>
                <Text style={{ fontSize: FONT_SMALL, fontWeight: '600', color: TH.text, marginLeft: 4 }}>{entry.mood}</Text>
                <Text style={{ fontSize: FONT_TINY, color: TH.sub, marginLeft: 4 }}>{entry.percentage}%</Text>
                <Text style={{ fontSize: FONT_TINY, color: TH.sub, marginLeft: 4 }}>{entry.count}次</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
