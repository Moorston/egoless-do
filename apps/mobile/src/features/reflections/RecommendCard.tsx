import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme, useT } from '../../components/UI';
import { FONT_BODY, FONT_SMALL, FONT_TINY, FONT_BUTTON } from '@egoless-do/core';
import { getMoodIcon, formatDateShort, trendArrow, trendLabel, trendColor } from '@egoless-do/core';
import type { TrailRecommendation } from '@egoless-do/core';

interface Props {
  rec: TrailRecommendation;
  onQuickGenerate: (rec: TrailRecommendation) => void;
}

export default function RecommendCard({ rec, onQuickGenerate }: Props) {
  const TH = useTheme();
  const T = useT();

  return (
    <View style={{
      backgroundColor: TH.card, borderRadius: 12,
      borderWidth: 1, borderColor: TH.border,
      marginBottom: 12, overflow: 'hidden',
    }}>
      {/* Left accent bar */}
      <View style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 3, backgroundColor: '#8B5CF6',
      }} />

      <View style={{ padding: 14, paddingLeft: 18 }}>
        {/* Title */}
        <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>
          💡 "{rec.name}"
        </Text>

        {/* Mood timeline */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}>
          {rec.moods.map((mood, i) => (
            <React.Fragment key={i}>
              <Text style={{ fontSize: FONT_SMALL }}>{getMoodIcon(mood)}</Text>
              {i < rec.moods.length - 1 && (
                <Text style={{ fontSize: FONT_TINY, color: TH.sub }}>→</Text>
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Date range */}
        <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginTop: 4 }}>
          {formatDateShort(rec.startDate)}─{formatDateShort(rec.endDate)}
        </Text>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
          <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>
            {rec.reflectionIds.length}{T('quickTrailReflections')}
          </Text>
          {rec.primaryTag ? (
            <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>
              #{rec.primaryTag}
            </Text>
          ) : null}
          <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>
            {rec.spanDays}{T('days') || '天'}
          </Text>
          <Text style={{ fontSize: FONT_SMALL, color: trendColor(rec.trend) }}>
            {trendArrow(rec.trend)} {trendLabel(rec.trend, T)}
          </Text>
        </View>

        {/* Narrative */}
        <Text style={{
          fontSize: FONT_SMALL, color: TH.sub, marginTop: 6,
          fontStyle: 'italic', lineHeight: 18,
        }}>
          "{rec.narrative}"
        </Text>

        {/* Assigned notice */}
        {rec.assignedCount > 0 && (
          <Text style={{ fontSize: FONT_TINY, color: TH.sub, marginTop: 4 }}>
            {T('quickTrailAssignedNotice').replace('{n}', String(rec.assignedCount))}
          </Text>
        )}

        {/* Quick generate button */}
        <TouchableOpacity
          onPress={() => onQuickGenerate(rec)}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
            marginTop: 10, gap: 4,
          }}
        >
          <Text style={{ fontSize: FONT_BUTTON, color: TH.primary, fontWeight: '600' }}>
            {T('quickTrailCreate')}
          </Text>
          <ChevronRight size={16} color={TH.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
