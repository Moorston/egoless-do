import { FONT_BODY, FONT_SUB, FONT_TITLE } from '@egoless-do/core';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { styles } from '../BodyDashboardStyles';

export interface BodyProfileBannerProps {
  T: (key: string) => string;
  profile: Record<string, unknown>;
  onShowAssessment: () => void;
}

/**
 * Banner 2: 身体档案
 *
 * Extracted from BodyDashboard via move-only JSX extraction (L565-618).
 * Internal conditional rendering (BMI calc, self-assessment/tags display)
 * counts toward THIS component's complexity, not the parent's.
 */
export function BodyProfileBanner({ T, profile, onShowAssessment }: BodyProfileBannerProps) {
  return (
    <View style={[styles.bannerCard, { backgroundColor: '#8b5cf6' }]}>
      <View style={styles.bannerHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 20 }}>📋</Text>
          <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: '#fff' }}>{T('bodyProfile')}</Text>
        </View>
      </View>
      <View style={styles.bannerContent}>
        <View style={{ flex: 1 }}>
          {/* Body metrics - card style */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, gap: 4 }}>
            {[
              { value: profile.weight ? `${profile.weight}` : '-', unit: 'kg', label: T('bodyWeight') },
              { value: profile.height ? `${profile.height}` : '-', unit: 'cm', label: T('bodyHeight') },
              { value: profile.weight && profile.height ? `${((profile.weight as number) / (((profile.height as number) / 100) ** 2)).toFixed(1)}` : '-', unit: '', label: 'BMI' },
              { value: profile.bodyFat ? `${profile.bodyFat}` : '-', unit: '%', label: T('bodyBodyFat') },
            ].map((item, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: '#fff' }}>{String(item.value)}<Text style={{ fontSize: FONT_SUB(), color: 'rgba(255,255,255,0.7)' }}>{item.unit}</Text></Text>
                <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.7)', marginTop: 2, textAlign: 'center' }}>{item.label}</Text>
              </View>
            ))}
          </View>
          {/* Self assessment */}
          {profile.selfAssessment ? (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10 }}>
              <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.9)', lineHeight: 20 }}>
                {String(profile.selfAssessment ?? '')}
              </Text>
              {(profile.bodyTags as string[] ?? []).length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {(profile.bodyTags as string[]).map((tag: string) => (
                    <View key={tag} style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: FONT_BODY(), color: '#fff' }}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
              {T('bodySelfAssessmentPlaceholder')}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        onPress={onShowAssessment}
        activeOpacity={0.85}
        style={[styles.bannerButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
      >
        <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#8b5cf6' }}>{T('bodySelfAssessment')}</Text>
      </TouchableOpacity>
    </View>
  );
}
