import { FONT_BODY, FONT_SMALL, FONT_TINY, FONT_BUTTON , getMoodIcon, formatDateShort, trendArrow, trendLabel, trendColor } from '@egoless-do/core';
import type { TrailRecommendation } from '@egoless-do/core';
import { ChevronRight, ThumbsDown, Zap } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { useTheme, useT } from '../../../components/UI';


interface Props {
  rec: TrailRecommendation;
  onOneClickCreate: (rec: TrailRecommendation) => void;
  onCustomCreate: (rec: TrailRecommendation) => void;
  onNotInterested: (rec: TrailRecommendation) => void;
}

function RecommendCard({ rec, onOneClickCreate, onCustomCreate, onNotInterested }: Props) {
  const TH = useTheme();
  const T = useT();

  return (
    <View
      style={{
        backgroundColor: TH.card, borderRadius: 12,
        borderWidth: 1, borderColor: TH.border,
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
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text, flex: 1 }}>
            💡 "{rec.name}"
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {rec.source === 'ai' && (
              <View style={{
                backgroundColor: '#8B5CF620', borderRadius: 4,
                paddingHorizontal: 6, paddingVertical: 2,
              }}>
                <Text style={{ fontSize: FONT_TINY(), color: '#8B5CF6' }}>AI</Text>
              </View>
            )}
          </View>
        </View>

        {/* Mood timeline */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}>
          {rec.moods.map((mood, i) => (
            <React.Fragment key={i}>
              <Text style={{ fontSize: FONT_SMALL() }}>{getMoodIcon(mood)}</Text>
              {i < rec.moods.length - 1 && (
                <Text style={{ fontSize: FONT_TINY(), color: TH.sub }}>→</Text>
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Date range */}
        <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginTop: 4 }}>
          {formatDateShort(rec.startDate)}─{formatDateShort(rec.endDate)}
        </Text>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
          <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>
            {rec.reflectionIds.length}{T('quickTrailReflections')}
          </Text>
          {rec.primaryTag ? (
            <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>
              #{rec.primaryTag}
            </Text>
          ) : null}
          <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>
            {rec.spanDays}{T('days') || '天'}
          </Text>
          <Text style={{ fontSize: FONT_SMALL(), color: trendColor(rec.trend) }}>
            {trendArrow(rec.trend)} {trendLabel(rec.trend, T)}
          </Text>
        </View>

        {/* Narrative */}
        <Text style={{
          fontSize: FONT_SMALL(), color: TH.sub, marginTop: 6,
          fontStyle: 'italic', lineHeight: 18,
        }}>
          "{rec.narrative}"
        </Text>

        {/* Assigned notice */}
        {rec.assignedCount > 0 && (
          <Text style={{ fontSize: FONT_TINY(), color: TH.sub, marginTop: 4 }}>
            {T('quickTrailAssignedNotice').replace('{n}', String(rec.assignedCount))}
          </Text>
        )}

        {/* Recommendation reason */}
        {rec.reason && (
          <View style={{
            backgroundColor: `${TH.primary}08`, borderRadius: 8,
            padding: 10, marginTop: 12,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Text style={{ fontSize: FONT_SMALL() }}>🤖</Text>
              <Text style={{ fontSize: FONT_SMALL(), fontWeight: '600', color: TH.primary }}>
                推荐理由
              </Text>
            </View>
            <Text style={{ fontSize: FONT_SMALL(), color: TH.text, lineHeight: 18 }}>
              {rec.reason}
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <TouchableOpacity
            onPress={() => onOneClickCreate(rec)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              flex: 1,
              backgroundColor: TH.primary,
              borderRadius: 10,
              paddingVertical: 10,
              justifyContent: 'center',
            }}
          >
            <Zap size={14} color="#fff" />
            <Text style={{ color: '#fff', fontSize: FONT_BUTTON(), fontWeight: '700' }}>
              一键创建
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onCustomCreate(rec)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingHorizontal: 14, paddingVertical: 10,
              borderRadius: 10,
              borderWidth: 1, borderColor: TH.primary,
            }}
          >
            <Text style={{ fontSize: FONT_SMALL(), color: TH.primary, fontWeight: '500' }}>
              自定义
            </Text>
            <ChevronRight size={14} color={TH.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onNotInterested(rec)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingHorizontal: 14, paddingVertical: 10,
              borderRadius: 10,
              borderWidth: 1, borderColor: TH.border,
            }}
          >
            <ThumbsDown size={14} color={TH.sub} />
            <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>
              不感兴趣
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default React.memo(RecommendCard);
