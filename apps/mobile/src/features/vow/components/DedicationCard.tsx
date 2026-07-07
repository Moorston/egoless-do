import { FONT_BODY, FONT_SUB, FONT_BADGE } from '@egoless-do/core';
import type { Dedication, Theme } from '@egoless-do/core';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  TH: Theme;
  T: (key: string) => string;
  dedication: Dedication;
  expanded: boolean;
  onToggle: () => void;
}

function DedicationCard({ TH, T, dedication, expanded, onToggle }: Props) {
  const habitDone = dedication.habitStats.filter(h => h.completed > 0).length;
  const habitTotal = dedication.habitStats.length;

  return (
    <View style={{
      backgroundColor: TH.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: TH.border,
    }}>
      {/* Header */}
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text }}>
              {dedication.periodLabel}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <Text style={{ fontSize: FONT_BADGE, color: '#8B5CF6' }}>
                {T('vowDedDays')}: {dedication.practiceDays}/{dedication.totalDays}
              </Text>
              {habitTotal > 0 && (
                <Text style={{ fontSize: FONT_BADGE, color: '#10B981' }}>
                  {T('vowProgressHabitDone')}: {habitDone}/{habitTotal}
                </Text>
              )}
            </View>
          </View>
          {expanded ? (
            <ChevronUp size={18} color={TH.sub} />
          ) : (
            <ChevronDown size={18} color={TH.sub} />
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded detail */}
      {expanded && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: `${TH.border}40` }}>
          {/* Habit stats */}
          {dedication.habitStats.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: TH.text, marginBottom: 6 }}>
                {T('vowProgressHabitDone')}
              </Text>
              {dedication.habitStats.map(h => (
                <View key={h.habitId} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{h.name}</Text>
                  <Text style={{ fontSize: FONT_BODY, color: '#8B5CF6', fontWeight: '600' }}>
                    {h.completed}/{h.total}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Plan progress */}
          {dedication.planProgress && dedication.planProgress.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: TH.text, marginBottom: 6 }}>
                {T('vowProgressPlanDone')}
              </Text>
              {dedication.planProgress.map(p => (
                <View key={p.planId} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{p.name}</Text>
                  <Text style={{ fontSize: FONT_BODY, color: '#10B981', fontWeight: '600' }}>
                    +{p.progressDelta}%
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Vision progress */}
          {dedication.visionProgress && dedication.visionProgress.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: TH.text, marginBottom: 6 }}>
                {T('vowProgress')}
              </Text>
              {dedication.visionProgress.map(v => (
                <View key={v.visionId} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{v.visionId}</Text>
                  <Text style={{ fontSize: FONT_BODY, color: '#F59E0B', fontWeight: '600' }}>
                    {v.before}% → {v.after}%
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Insight */}
          {dedication.insight ? (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: TH.text, marginBottom: 4 }}>
                {T('vowDedInsight')}
              </Text>
              <Text style={{ fontSize: FONT_BODY, color: TH.text, lineHeight: 20 }}>
                {dedication.insight}
              </Text>
            </View>
          ) : null}

          {/* Adjustment */}
          {dedication.adjustment ? (
            <View>
              <Text style={{ fontSize: FONT_BADGE, fontWeight: '600', color: TH.text, marginBottom: 4 }}>
                {T('vowDedAdjustment')}
              </Text>
              <Text style={{ fontSize: FONT_BODY, color: TH.text, lineHeight: 20 }}>
                {dedication.adjustment}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

export default React.memo(DedicationCard);
