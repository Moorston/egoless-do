import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Zap, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import { FONT_SMALL, FONT_TINY } from '@egoless-do/core';
import { computeCandidatePool, computeRecommendations, buildIgnoredPattern } from '@egoless-do/core';

const TRAIL_IGNORED_KEY = 'trailIgnoredPatterns';

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

    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    const candidates = reflections.filter(r =>
      r.timestamp >= thirtyDaysAgo &&
      (!r.thoughtTrailIds || r.thoughtTrailIds.length === 0)
    );
    if (candidates.length < 3) return null;

    const recs = computeRecommendations(candidates, allTrails);
    return recs.length > 0 ? recs[0] : null;
  }, [store.reflections, store.thoughtTrails]);

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
    }).catch(console.error);
    return () => { mounted = false; };
  }, [topRec]);

  if (dismissed || !topRec) return null;

  const handleDismiss = () => {
    const pattern = buildIgnoredPattern(topRec);
    AsyncStorage.getItem(TRAIL_IGNORED_KEY).then(raw => {
      let ignored: string[] = [];
      try { if (raw) ignored = JSON.parse(raw); } catch {}
      const next = [...new Set([...ignored, pattern])];
      AsyncStorage.setItem(TRAIL_IGNORED_KEY, JSON.stringify(next)).catch(console.error);
    }).catch(console.error);
    setDismissed(true);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        handleDismiss();
        (nav as any).navigate('MindTrail');
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
