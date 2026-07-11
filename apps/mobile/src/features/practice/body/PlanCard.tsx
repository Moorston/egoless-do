import { FONT_BODY, FONT_SUB, FONT_BADGE, FONT_SMALL, type BodyPlan, EXERCISE_CATEGORIES, PART_STRING_TO_KEY, type Theme } from '@egoless-do/core';
import { Dumbbell, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const WEEKDAY_KEYS = ['bodyWeekMon', 'bodyWeekTue', 'bodyWeekWed', 'bodyWeekThu', 'bodyWeekFri', 'bodyWeekSat', 'bodyWeekSun'];
const REST_VALUES = ['休息', 'Rest', 'rest']; // backward-compatible rest check

// Build a lookup from key to i18nKey for display
const KEY_TO_I18N = new Map(EXERCISE_CATEGORIES.map(c => [c.key, c.i18nKey]));
const KEY_TO_ICON = new Map(EXERCISE_CATEGORIES.map(c => [c.key, c.icon]));

interface Props {
  TH: Theme;
  T: (key: string) => string;
  plans: BodyPlan[];
  onEdit: () => void;
  onPressSport: (sportKey: string) => void;
}

/** Resolve a plan's part string to a display label (handles old Chinese strings, new keys, and translated labels) */
function resolvePartLabel(part: string, T: (key: string) => string): { label: string; icon: string; isRest: boolean } {
  // Already a new key
  if (KEY_TO_I18N.has(part)) {
    return { label: T(KEY_TO_I18N.get(part)!), icon: KEY_TO_ICON.get(part) ?? '', isRest: part === 'rest' };
  }
  // Old Chinese string -> new key
  const mappedKey = PART_STRING_TO_KEY[part];
  if (mappedKey && KEY_TO_I18N.has(mappedKey)) {
    return { label: T(KEY_TO_I18N.get(mappedKey)!), icon: KEY_TO_ICON.get(mappedKey) ?? '', isRest: mappedKey === 'rest' };
  }
  // Fallback: display raw string
  return { label: part, icon: '', isRest: REST_VALUES.includes(part) };
}

export default function PlanCard({ TH, T, plans, onEdit, onPressSport }: Props) {
  const activePlans = plans.filter(p => !p.deleted);
  return (
    <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Dumbbell size={18} color="#f59e0b" />
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{T('bodyPlan')}</Text>
        </View>
        <TouchableOpacity onPress={onEdit} style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, backgroundColor: '#f59e0b15' }}>
          <Text style={{ fontSize: FONT_BADGE(), color: '#f59e0b' }}>{activePlans.length > 0 ? T('bodyPlanEdit') : T('bodyGoalSet')}</Text>
        </TouchableOpacity>
      </View>
      {activePlans.length === 0 ? (
        <Text style={{ fontSize: FONT_BODY(), color: TH.sub, textAlign: 'center', paddingVertical: 16 }}>{T('bodyPlanNotSet')}</Text>
      ) : (
        <View>
          {WEEKDAY_KEYS.map((dayKey, idx) => {
            const dayPlan = activePlans.find(p => p.weekday === idx + 1);
            if (!dayPlan) return null;
            const dayName = T(dayKey);
            const resolved = resolvePartLabel(dayPlan.part, T);
            return (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: idx < 6 ? 1 : 0, borderBottomColor: TH.border }}>
                <Text style={{ fontSize: FONT_SUB(), fontWeight: '600', color: TH.text, width: 40 }}>{dayName}</Text>
                <Text style={{ fontSize: FONT_BODY(), color: resolved.isRest ? TH.sub : TH.text, flex: 1 }}>
                  {resolved.icon ? `${resolved.icon} ` : ''}{resolved.label}
                </Text>
                {dayPlan.sportKey && !resolved.isRest ? (
                  <TouchableOpacity onPress={() => onPressSport(dayPlan.sportKey!)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: FONT_BADGE(), color: '#f59e0b' }}>{dayPlan.sportKey}</Text>
                    <ChevronRight size={14} color="#f59e0b" />
                  </TouchableOpacity>
                ) : null}
                {dayPlan.note ? <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginLeft: 8 }} numberOfLines={1}>{dayPlan.note}</Text> : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
