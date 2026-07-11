import {COLORS , FONT_SMALL, FONT_SUB, FONT_BACK} from '@egoless-do/core';
import type { Plan, PlanStatus } from '@egoless-do/core';
import { LinearGradient } from 'expo-linear-gradient';
import { Target, Play, Pause, XCircle, Circle, CircleCheck, Plus, ListChecks, Route } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { useTheme } from '../../components/UI';

interface Props {
  plan: Plan;
  P: string;
  progressPct: number;
  showStatusPicker: boolean;
  onToggleStatusPicker: () => void;
  onStatusChange: (status: string) => void;
  onAddItem: () => void;
  onViewTimeline: () => void;
  onViewRelation: () => void;
  T: (key: string) => string;
}

/**
 * Maps plan status to a color for visual representation.
 * @param s - Plan status string
 * @returns Color string based on status
 */
const getStatusColor = (s: PlanStatus | undefined, P: string): string => {
  switch (s) {
    case 'in_progress': return P;
    case 'completed': return COLORS.GREEN;
    case 'paused': return COLORS.ORANGE;
    case 'cancelled': return COLORS.GRAY;
    case 'not_started': return COLORS.GRAY;
    default: return P;
  }
};

/** Maps plan status to a Lucide icon component. */
const getStatusIcon = (s: PlanStatus | undefined, P: string) => {
  switch (s) {
    case 'in_progress': return <Play size={14} color={P} />;
    case 'completed': return <CircleCheck size={14} color={COLORS.GREEN} />;
    case 'paused': return <Pause size={14} color={COLORS.ORANGE} />;
    case 'cancelled': return <XCircle size={14} color={COLORS.GRAY} />;
    case 'not_started': return <Circle size={14} color={COLORS.GRAY} />;
    default: return null;
  }
};

function PlanHeroCard({
  plan, P, progressPct,
  showStatusPicker, onToggleStatusPicker, onStatusChange,
  onAddItem, onViewTimeline, onViewRelation, T,
}: Props) {
  const TH = useTheme();

  return (
    <LinearGradient
      colors={TH.mode === 'dark' ? ['#1a1a2e', '#0d0d15'] : [`${P}33`, `${P}11`]}
      style={{ paddingTop: 16, paddingBottom: 24, paddingHorizontal: 20 }}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: P, alignItems: 'center', justifyContent: 'center' }}>
          <Target size={24} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FONT_BACK(), fontWeight: '700', color: TH.text }}>{plan.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              {getStatusIcon(plan.status as PlanStatus, P)}
              <Text style={{ fontSize: FONT_SUB(), color: getStatusColor(plan.status as PlanStatus, P) }}>{T(`planStatus${plan.status?.charAt(0).toUpperCase()}${plan.status?.slice(1)}`)}</Text>
            </View>
            {plan.goal ? (
              <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }} numberOfLines={1}> · {plan.goal}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Progress bar */}
      <View style={{ marginTop: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{T('planTodayProgress')}</Text>
          <Text style={{ fontSize: FONT_SUB(), color: P, fontWeight: '600' }}>{progressPct}%</Text>
        </View>
        <View style={{ height: 8, backgroundColor: `${P}20`, borderRadius: 4, overflow: 'hidden' }}>
          <View style={{ width: `${progressPct}%`, height: '100%', backgroundColor: P, borderRadius: 4 }} />
        </View>
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <TouchableOpacity
          onPress={onToggleStatusPicker}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: `${P}20` }}
        >
          {getStatusIcon(plan.status as PlanStatus, P)}
          <Text style={{ fontSize: FONT_SMALL(), color: P }}>{T('planChangeStatus')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onAddItem}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: `${P}20` }}
        >
          <Plus size={14} color={P} />
          <Text style={{ fontSize: FONT_SMALL(), color: P }}>{T('planAddItem')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onViewTimeline}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: `${P}20` }}
        >
          <ListChecks size={14} color={P} />
          <Text style={{ fontSize: FONT_SMALL(), color: P }}>{T('planViewTimeline')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onViewRelation}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: `${P}20` }}
        >
          <Route size={14} color={P} />
          <Text style={{ fontSize: FONT_SMALL(), color: P }}>{T('planViewRelation')}</Text>
        </TouchableOpacity>
      </View>

      {/* Status picker dropdown */}
      {showStatusPicker && (
        <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {(['not_started', 'in_progress', 'paused', 'completed', 'cancelled'] as PlanStatus[]).map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => { onStatusChange(s); onToggleStatusPicker(); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: plan.status === s ? P : `${P}10` }}
            >
              {getStatusIcon(s, P)}
              <Text style={{ fontSize: FONT_SMALL(), color: plan.status === s ? '#fff' : P }}>{T(`planStatus${s.charAt(0).toUpperCase()}${s.slice(1)}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </LinearGradient>
  );
}

export default React.memo(PlanHeroCard);