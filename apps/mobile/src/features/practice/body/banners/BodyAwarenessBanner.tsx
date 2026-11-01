import { FONT_BODY, FONT_SMALL, FONT_SUB, FONT_TITLE } from '@egoless-do/core';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { styles } from '../BodyDashboardStyles';

interface LatestCheckin {
  energy: number;
  pain: number;
  comfort: number;
  sleep: number;
  date: string;
  tags?: string[];
  note?: string;
}

export interface BodyAwarenessBannerProps {
  T: (key: string) => string;
  onNavigateHistory: () => void;
  latestCheckin: LatestCheckin | undefined;
  onShowCheckin: () => void;
}

/**
 * Banner 3: 身体觉知
 *
 * Extracted from BodyDashboard via move-only JSX extraction (L621-693).
 * Internal conditional rendering (checkin data vs no-data branch, tags/note)
 * counts toward THIS component's complexity, not the parent's.
 */
export function BodyAwarenessBanner({ T, onNavigateHistory, latestCheckin, onShowCheckin }: BodyAwarenessBannerProps) {
  return (
    <View style={[styles.bannerCard, { backgroundColor: '#10b981' }]}>
      <View style={styles.bannerHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 20 }}>🧘</Text>
          <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: '#fff' }}>{T('bodyAwareness')}</Text>
        </View>
        <TouchableOpacity
          onPress={onNavigateHistory}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}
        >
          <Text style={{ fontSize: FONT_SMALL(), color: '#fff' }}>{T('bodyAwarenessRecords')}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.bannerContent}>
        <View style={{ flex: 1 }}>
          {latestCheckin ? (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, gap: 4 }}>
                {[
                  { label: T('bodyEnergy'), value: latestCheckin.energy, color: '#fbbf24' },
                  { label: T('bodyPain'), value: latestCheckin.pain, color: '#f87171' },
                  { label: T('bodyComfort'), value: latestCheckin.comfort, color: '#34d399' },
                  { label: T('bodySleepQuality'), value: latestCheckin.sleep, color: '#60a5fa' },
                ].map((item, i) => (
                  <View key={i} style={{ flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: item.color }}>{String(item.value)}</Text>
                    <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.7)', marginTop: 2, textAlign: 'center' }}>{item.label}</Text>
                  </View>
                ))}
              </View>
              {/* Tags */}
              {latestCheckin.tags && latestCheckin.tags.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                  {latestCheckin.tags.map((tag: string) => (
                    <View key={tag} style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: FONT_BODY(), color: '#fff' }}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
              {/* Note */}
              {latestCheckin.note && (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.9)', lineHeight: 20 }} numberOfLines={2}>
                    {latestCheckin.note}
                  </Text>
                </View>
              )}
              <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>
                {latestCheckin.date}
              </Text>
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ fontSize: 24, marginBottom: 6 }}>🧘</Text>
              <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
                {T('bodyAwarenessNoData')}
              </Text>
              <Text style={{ fontSize: FONT_SUB(), color: 'rgba(255,255,255,0.5)', marginTop: 4, textAlign: 'center' }}>
                {T('bodyFlowAwarenessHint')}
              </Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        onPress={onShowCheckin}
        activeOpacity={0.85}
        style={[styles.bannerButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
      >
        <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#10b981' }}>{T('bodyFlowAwareness')}</Text>
      </TouchableOpacity>
    </View>
  );
}
