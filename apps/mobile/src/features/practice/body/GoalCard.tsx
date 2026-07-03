import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Target } from 'lucide-react-native';
import { FONT_BODY, FONT_SUB, FONT_BADGE, FONT_STAT_SECTION, FONT_SMALL, calcGoalProgress, recommendStrategy, BODY_STRATEGIES, type BodyGoal, type Theme } from '@egoless-do/core';

interface Props {
  TH: Theme;
  T: (key: string) => string;
  goal: BodyGoal | undefined;
  profile: Record<string, unknown>;
  onEdit: () => void;
}

export default function GoalCard({ TH, T, goal, profile, onEdit }: Props) {
  const progress = goal?.initialWeight ? calcGoalProgress(profile.weight as number, goal.targetWeight, goal.initialWeight) : 0;
  const strategyLabel = goal?.strategy ? (BODY_STRATEGIES.find(s => s.key === goal.strategy)?.nameKey ?? goal.strategy) : null;
  const recommended = recommendStrategy((profile.bodyTags as string[] ?? []) as string[]);

  return (
    <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Target size={18} color="#8b5cf6" />
          <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>{T('bodyGoal')}</Text>
        </View>
        <TouchableOpacity onPress={onEdit} style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, backgroundColor: '#8b5cf615' }}>
          <Text style={{ fontSize: FONT_BADGE, color: '#8b5cf6' }}>{goal ? T('bodyGoalEdit') : T('bodyGoalSet')}</Text>
        </TouchableOpacity>
      </View>
      {!goal ? (
        <View>
          <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center', paddingVertical: 16 }}>{T('bodyGoalNotSet')}</Text>
          {recommended && (
            <View style={{ backgroundColor: '#8b5cf610', borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: FONT_SMALL, color: '#8b5cf6' }}>{'💡 ' + T('bodyRecommendHint')}</Text>
              <Text style={{ fontSize: FONT_SMALL, color: '#8b5cf6', fontWeight: '600' }}>{recommended}</Text>
            </View>
          )}
        </View>
      ) : (
        <View>
          {((profile.bodyTags as string[]) ?? []).length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {((profile.bodyTags as string[]) ?? []).slice(0, 4).map((tag: string) => (
                <Text key={tag} style={{ fontSize: FONT_SMALL, color: '#8b5cf6' }}>#{tag}</Text>
              ))}
            </View>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            {goal.targetWeight ? (
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: TH.text }}>{goal.targetWeight}kg</Text>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('bodyTargetWeight')} ({T('bodyCurrentWeight')}{(profile.weight as number) ?? '-'}kg)</Text>
              </View>
            ) : null}
            {goal.targetBodyFat ? (
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: TH.text }}>{goal.targetBodyFat}%</Text>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('bodyTargetBodyFat')} ({T('bodyCurrentBodyFat')}{(profile.bodyFat as number) ?? '-'}%)</Text>
              </View>
            ) : null}
          </View>
          {goal.targetDate ? <Text style={{ fontSize: FONT_SUB, color: TH.sub, textAlign: 'center', marginBottom: 8 }}>{T('bodyTargetDate')}: {goal.targetDate}</Text> : null}
          {strategyLabel && (
            <View style={{ backgroundColor: '#8b5cf615', borderRadius: 8, padding: 8, marginBottom: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_BADGE, color: '#8b5cf6', fontWeight: '600' }}>{T('bodyStrategyLabel')}: {strategyLabel}</Text>
            </View>
          )}
          <View style={{ height: 6, backgroundColor: `${TH.border}80`, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: 6, width: `${progress}%`, backgroundColor: '#8b5cf6', borderRadius: 3 }} />
          </View>
          <Text style={{ fontSize: FONT_SMALL, color: TH.sub, textAlign: 'center', marginTop: 4 }}>{T('bodyProgress')} {progress}%</Text>
        </View>
      )}
    </View>
  );
}
