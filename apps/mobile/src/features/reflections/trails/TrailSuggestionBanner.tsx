import { FONT_SMALL, FONT_TINY, MS_PER_DAY, createLogger , computeCandidatePool, computeRecommendations, buildIgnoredPattern } from '@egoless-do/core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Zap, X } from 'lucide-react-native';
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { useTheme, useT } from '../../../components/UI';
import type { RootStackParamList } from '../../../navigation/types';
import { useAppStore, useShallowStore } from '../../../store/useAppStore';



const log = createLogger('Reflections');

const TRAIL_IGNORED_KEY = 'trailIgnoredPatterns';

export default function TrailSuggestionBanner() {
  const TH = useTheme();
  const T = useT();
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { reflections, thoughtTrails } = useShallowStore(s => ({
    reflections: s.reflections,
    thoughtTrails: s.thoughtTrails,
  }));
  const [dismissed, setDismissed] = useState(false);

  const topRec = useMemo(() => {
    const activeReflections = (reflections ?? []).filter((r: any) => !r.deleted);
    const allTrails = (thoughtTrails ?? []).filter((t: any) => !t.deleted);
    if (activeReflections.length < 5) return null;

    const thirtyDaysAgo = Date.now() - 30 * MS_PER_DAY;
    const candidates = activeReflections.filter((r: any) =>
      r.timestamp >= thirtyDaysAgo &&
      (!r.thoughtTrailIds || r.thoughtTrailIds.length === 0)
    );
    if (candidates.length < 3) return null;

    const recs = computeRecommendations(candidates, allTrails);
    return recs.length > 0 ? recs[0] : null;
  }, [reflections, thoughtTrails]);

  // Check if current topRec is ignored
  useEffect(() => {
    if (!topRec) { setDismissed(false); return; }
    let mounted = true;
    const pattern = buildIgnoredPattern(topRec);
    AsyncStorage.getItem(TRAIL_IGNORED_KEY).then(raw => {
      if (!mounted) return;
      if (raw) {
        try {
          const ignored: string[] = JSON.parse(raw);
          setDismissed(ignored.includes(pattern));
        } catch {
          setDismissed(false);
        }
      } else {
        setDismissed(false);
      }
    }).catch((e) => log.error(e));
    return () => { mounted = false; };
  }, [topRec]);

  if (dismissed || !topRec) return null;

  const handleDismiss = () => {
    const pattern = buildIgnoredPattern(topRec);
    AsyncStorage.getItem(TRAIL_IGNORED_KEY).then(raw => {
      let ignored: string[] = [];
      try { if (raw) ignored = JSON.parse(raw); } catch {}
      const next = [...new Set([...ignored, pattern])];
      AsyncStorage.setItem(TRAIL_IGNORED_KEY, JSON.stringify(next)).catch((e) => log.error(e));
    }).catch((e) => log.error(e));
    setDismissed(true);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        handleDismiss();
        nav.navigate('MindTrail');
      }}
      style={{
        backgroundColor: `${TH.primary}10`,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${TH.primary}30`,
        padding: 12,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
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

      <Text style={{ color: TH.primary, fontSize: FONT_TINY, fontWeight: '600' }}>
        {T('trailSuggestionAction')}
      </Text>

      <TouchableOpacity onPress={handleDismiss} style={{ padding: 4 }}>
        <X size={14} color={TH.sub} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
