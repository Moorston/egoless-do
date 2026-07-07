import {
  FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE,
  calcBMI, calcBMR,
  type UserProfile, type AgeBracket, type Theme,
  AGE_BRACKETS, bracketMidpoint, ageToBracket, estimateBodyFat,
} from '@egoless-do/core';
import { LinearGradient } from 'expo-linear-gradient';
import { Edit3, Check, ChevronDown } from 'lucide-react-native';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';

interface Props {
  TH: Theme;
  T: (key: string) => string;
  profile: UserProfile;
  onEditAssessment: () => void;
  onRecordWeight?: () => void;
  onPickAgeBracket?: (bracket: AgeBracket) => void;
}

// Amber gradient tones matching the body-regulation page palette
const PROFILE_CARD_GRADIENT: [string, string] = ['#f59e0b', '#d97706'];

const AGE_BRACKET_I18N_KEYS: Record<AgeBracket, string> = {
  '18-29': 'bodyAge1829',
  '30-39': 'bodyAge3039',
  '40-49': 'bodyAge4049',
  '50-59': 'bodyAge5059',
  '60-69': 'bodyAge6069',
  '70+': 'bodyAge70p',
};

function bracketLabel(bracket: AgeBracket, T: (k: string) => string): string {
  return T(AGE_BRACKET_I18N_KEYS[bracket]);
}

export default function BodyProfileCard({
  TH, T, profile, onEditAssessment, onRecordWeight, onPickAgeBracket,
}: Props) {
  const [showAgePicker, setShowAgePicker] = useState(false);

  // Migrate legacy numeric age → bracket on-the-fly for display persistence
  const ageBracket: AgeBracket | undefined = profile.ageBracket ?? ageToBracket(profile.age);
  const bmi = calcBMI(profile.weight ?? 0, profile.height ?? 0);
  const bmr = calcBMR(
    profile.weight ?? 0,
    profile.height ?? 0,
    ageBracket ? bracketMidpoint(ageBracket) : 30,
    profile.gender === 'female' ? 'female' : 'male',
  );
  const bmiLabel = bmi < 18.5 ? T('bodyBmiThin') : bmi < 24 ? T('bodyBmiNormal') : bmi < 28 ? T('bodyBmiOverweight') : T('bodyBmiObese');
  const bmiColor = bmi < 18.5 ? '#3b82f6' : bmi < 24 ? '#10b981' : bmi < 28 ? '#f59e0b' : '#ef4444';

  const bodyFat = profile.bodyFat;
  const estimatedFat = estimateBodyFat({
    gender: profile.gender,
    ageBracket,
    height: profile.height,
    weight: profile.weight,
  });

  return (
    <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
      <LinearGradient colors={PROFILE_CARD_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
        <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: '#fff', marginBottom: 16 }}>{"📋 " + T('bodyProfile')}</Text>

        {/* Top row — key metrics */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {[
            { label: T('bodyHeight'), value: profile.height ? `${profile.height}cm` : '-' },
            { label: T('bodyWeight'), value: profile.weight ? `${profile.weight}kg` : '-', tappable: !!onRecordWeight },
            { label: T('bodyBmi'), value: bmi > 0 ? `${bmi}` : '-', sub: bmi > 0 ? bmiLabel : '' },
            {
              label: T('bodyBodyFat'),
              value: bodyFat != null ? `${bodyFat}%` : (estimatedFat != null ? `~${estimatedFat}%` : T('bodyNotSet')),
              sub: bodyFat == null && estimatedFat != null ? T('bodyBodyFatEstimated') : '',
              isEstimate: bodyFat == null && estimatedFat != null,
            },
          ].map((s, i) => (
            <TouchableOpacity key={i} style={{ alignItems: 'center', flex: 1 }} onPress={s.tappable ? onRecordWeight : undefined} activeOpacity={s.tappable ? 0.7 : 1}>
              <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: s.isEstimate ? 'rgba(255,255,255,.75)' : s.sub ? bmiColor : '#fff' }}>{s.value}</Text>
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{s.label}</Text>
              {s.sub ? <Text style={{ fontSize: FONT_BADGE, color: s.isEstimate ? 'rgba(255,255,255,.6)' : bmiColor, marginTop: 2 }}>{s.sub}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom row — age / gender / BMR */}
        <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.15)' }}>
          <View style={{ flex: 1 }}>
            {onPickAgeBracket ? (
              <TouchableOpacity onPress={() => setShowAgePicker(true)} activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#fff' }}>{ageBracket ? bracketLabel(ageBracket, T) : '-'}</Text>
                <ChevronDown size={12} color="rgba(255,255,255,.6)" />
              </TouchableOpacity>
            ) : (
              <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#fff' }}>{ageBracket ? bracketLabel(ageBracket, T) : '-'}</Text>
            )}
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('bodyAgeGroup')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#fff' }}>{profile.gender === 'female' ? T('bodyFemale') : T('bodyMale')}</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('bodyGender')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#fff' }}>{bmr > 0 ? `${bmr}` : '-'}</Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('bodyBmr')}</Text>
          </View>
        </View>

        {/* Self-assessment */}
        <TouchableOpacity onPress={onEditAssessment} style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.15)' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: '#fff' }}>{"🗣️ " + T('bodySelfAssessment')}</Text>
            <Edit3 size={14} color="rgba(255,255,255,.6)" />
          </View>
          <Text style={{ fontSize: FONT_BODY, color: profile.selfAssessment ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.5)', lineHeight: 20 }}>
            {profile.selfAssessment || T('bodySelfAssessmentPlaceholder')}
          </Text>
          {(profile.bodyTags ?? []).length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {(profile.bodyTags ?? []).map((tag: string) => (
                <View key={tag} style={{ backgroundColor: 'rgba(255,255,255,.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ fontSize: FONT_BADGE, color: '#fff' }}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>
      </LinearGradient>

      {/* Age bracket picker modal */}
      <Modal visible={showAgePicker} transparent animationType="fade"
        onRequestClose={() => setShowAgePicker(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowAgePicker(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 16, padding: 8, width: 260 }}>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text, padding: 12 }}>{T('bodyAgeGroup')}</Text>
            {AGE_BRACKETS.map(b => {
              const active = b === ageBracket;
              return (
                <TouchableOpacity key={b} onPress={() => { onPickAgeBracket?.(b); setShowAgePicker(false); }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, backgroundColor: active ? '#f59e0b15' : 'transparent' }}>
                  <Text style={{ fontSize: FONT_BODY, color: active ? '#f59e0b' : TH.text, fontWeight: active ? '600' : '400' }}>{bracketLabel(b, T)}</Text>
                  {active && <Check size={16} color="#f59e0b" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
