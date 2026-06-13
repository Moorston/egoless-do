import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight, ChevronDown, ThumbsDown } from 'lucide-react-native';
import { useTheme, useT } from '../../components/UI';
import { FONT_BODY, FONT_SMALL, FONT_TINY, FONT_BUTTON } from '@egoless-do/core';
import { getMoodIcon, formatDateShort, trendArrow, trendLabel, trendColor } from '@egoless-do/core';
import type { TrailRecommendation } from '@egoless-do/core';

interface Props {
  rec: TrailRecommendation;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onQuickGenerate: (rec: TrailRecommendation) => void;
  onNotInterested: (rec: TrailRecommendation) => void;
}

export default function RecommendCard({ rec, isExpanded, onToggleExpand, onQuickGenerate, onNotInterested }: Props) {
  const TH = useTheme();
  const T = useT();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onToggleExpand}
      style={{
        backgroundColor: TH.card, borderRadius: 12,
        borderWidth: 1, borderColor: isExpanded ? TH.primary : TH.border,
        marginBottom: 12, overflow: 'hidden',
      }}
    >
      {/* Left accent bar */}
      <View style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 3, backgroundColor: rec.source === 'ai' ? '#8B5CF6' : rec.source === 'hybrid' ? '#3B82F6' : '#10B981',
      }} />

      <View style={{ padding: 14, paddingLeft: 18 }}>
        {/* Title row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, flex: 1 }}>
            💡 "{rec.name}"
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {rec.source === 'ai' && (
              <View style={{
                backgroundColor: '#8B5CF620', borderRadius: 4,
                paddingHorizontal: 6, paddingVertical: 2,
              }}>
                <Text style={{ fontSize: FONT_TINY, color: '#8B5CF6' }}>AI</Text>
              </View>
            )}
            {isExpanded ? (
              <ChevronDown size={16} color={TH.sub} />
            ) : (
              <ChevronRight size={16} color={TH.sub} />
            )}
          </View>
        </View>

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

        {/* Expanded content */}
        {isExpanded && (
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: TH.border }}>
            {/* Recommendation reason */}
            {rec.reason && (
              <View style={{
                backgroundColor: `${TH.primary}08`, borderRadius: 8,
                padding: 10, marginBottom: 12,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: FONT_SMALL }}>🤖</Text>
                  <Text style={{ fontSize: FONT_SMALL, fontWeight: '600', color: TH.primary }}>
                    推荐理由
                  </Text>
                </View>
                <Text style={{ fontSize: FONT_SMALL, color: TH.text, lineHeight: 18 }}>
                  {rec.reason}
                </Text>
              </View>
            )}

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onQuickGenerate(rec);
                }}
                style={{
                  flex: 1,
                  backgroundColor: TH.primary,
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: FONT_BUTTON, fontWeight: '600' }}>
                  {T('quickTrailCreate')} →
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onNotInterested(rec);
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingHorizontal: 14, paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1, borderColor: TH.border,
                }}
              >
                <ThumbsDown size={14} color={TH.sub} />
                <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>
                  不感兴趣
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
