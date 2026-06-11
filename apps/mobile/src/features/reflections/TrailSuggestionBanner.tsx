import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Zap, X } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import { FONT_BODY, FONT_SMALL, FONT_TINY, FONT_BUTTON } from '@egoless-do/core';
import { computeCandidatePool, computeRecommendations } from '@egoless-do/core';

export default function TrailSuggestionBanner() {
  const TH = useTheme();
  const T = useT();
  const nav = useNavigation();
  const store = useAppStore();
  const [dismissed, setDismissed] = useState(false);

  const topRec = useMemo(() => {
    const reflections = (store.reflections ?? []).filter(r => !r.deleted);
    const allTrails = (store.thoughtTrails ?? []).filter(t => !t.deleted);
    if (reflections.length < 5) return null;

    const candidates = computeCandidatePool(reflections, {
      timeRange: 'month',
      tags: [],
      moods: [],
    });

    const recs = computeRecommendations(candidates, allTrails);
    return recs.length > 0 ? recs[0] : null;
  }, [store.reflections, store.thoughtTrails]);

  if (dismissed || !topRec) return null;

  return (
    <View style={{
      backgroundColor: `${TH.primary}10`,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: `${TH.primary}30`,
      padding: 12,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    }}>
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: `${TH.primary}20`,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Zap size={18} color={TH.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: FONT_SMALL, fontWeight: '600', color: TH.text }}>
          {T('trailSuggestionTitle')}
        </Text>
        <Text style={{ fontSize: FONT_TINY, color: TH.sub, marginTop: 2 }}>
          💡 "{topRec.name}" · {topRec.reflectionIds.length}{T('quickTrailReflections')}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => (nav as any).navigate('QuickCreateTrail')}
        style={{
          backgroundColor: TH.primary,
          paddingHorizontal: 12, paddingVertical: 6,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: '#fff', fontSize: FONT_TINY, fontWeight: '600' }}>
          {T('trailSuggestionAction')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setDismissed(true)} style={{ padding: 4 }}>
        <X size={14} color={TH.sub} />
      </TouchableOpacity>
    </View>
  );
}
