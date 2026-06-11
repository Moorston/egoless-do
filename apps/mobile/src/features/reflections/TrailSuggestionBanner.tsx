import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Zap, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import { FONT_SMALL, FONT_TINY } from '@egoless-do/core';
import { computeCandidatePool, computeRecommendations } from '@egoless-do/core';

const DISMISSED_KEY = 'trailSuggestionDismissed';

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

  // Check dismissed state: re-show on re-login or new recommendation
  const isSignedIn = useAppStore(s => s.auth.isSignedIn);
  const prevSignedIn = React.useRef(isSignedIn);

  useEffect(() => {
    // Re-login: clear dismissed
    if (prevSignedIn.current !== isSignedIn) {
      prevSignedIn.current = isSignedIn;
      AsyncStorage.removeItem(DISMISSED_KEY);
      setDismissed(false);
      return;
    }
    // On mount or topRec change: compare stored name with current
    if (!topRec) { setDismissed(false); return; }
    AsyncStorage.getItem(DISMISSED_KEY).then(stored => {
      if (stored && stored === topRec.name) {
        setDismissed(true);
      } else {
        // No stored value or new recommendation — show banner
        setDismissed(false);
      }
    });
  }, [isSignedIn, topRec]);

  if (dismissed || !topRec) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        if (topRec) AsyncStorage.setItem(DISMISSED_KEY, topRec.name);
        setDismissed(true);
        (nav as any).navigate('QuickCreateTrail');
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

      <TouchableOpacity onPress={() => { if (topRec) AsyncStorage.setItem(DISMISSED_KEY, topRec.name); setDismissed(true); }} style={{ padding: 4 }}>
        <X size={14} color={TH.sub} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
