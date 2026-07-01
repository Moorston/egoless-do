import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Edit3 } from 'lucide-react-native';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_STAT_SECTION, calcBMI, calcBMR } from '@egoless-do/core';

interface Props {
  TH: any;
  T: (key: string) => string;
  profile: any;
  onEditAssessment: () => void;
  onRecordWeight?: () => void;
}

export default function BodyProfileCard({ TH, T, profile, onEditAssessment, onRecordWeight }: Props) {
  const bmi = calcBMI(profile.weight ?? 0, profile.height ?? 0);
  const bmr = calcBMR(profile.weight ?? 0, profile.height ?? 0, profile.age ?? 30, profile.gender ?? 'male');
  const bmiLabel = bmi < 18.5 ? T('bodyBmiThin') : bmi < 24 ? T('bodyBmiNormal') : bmi < 28 ? T('bodyBmiOverweight') : T('bodyBmiObese');
  const bmiColor = bmi < 18.5 ? '#3b82f6' : bmi < 24 ? '#10b981' : bmi < 28 ? '#f59e0b' : '#ef4444';

  return (
    <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
      <LinearGradient colors={['#10b981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
        <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: '#fff', marginBottom: 16 }}>{'🏋️ ' + T('bodyProfile')}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {[
            { label: T('bodyHeight'), value: profile.height ? `${profile.height}cm` : '-' },
            { label: T('bodyWeight'), value: profile.weight ? `${profile.weight}kg` : '-', tappable: !!onRecordWeight },
            { label: T('bodyBmi'), value: bmi > 0 ? `${bmi}` : '-', sub: bmi > 0 ? bmiLabel : '' },
            { label: T('bodyBodyFat'), value: profile.bodyFat ? `${profile.bodyFat}%` : T('bodyNotSet'), tappable: !!onRecordWeight },
          ].map((s, i) => (
            <TouchableOpacity key={i} style={{ alignItems: 'center', flex: 1 }} onPress={s.tappable ? onRecordWeight : undefined} activeOpacity={s.tappable ? 0.7 : 1}>
              <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: s.sub ? bmiColor : '#fff' }}>{s.value}</Text>
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{s.label}</Text>
              {s.sub ? <Text style={{ fontSize: FONT_BADGE, color: bmiColor, marginTop: 2 }}>{s.sub}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.15)' }}>
          <View style={{ flex: 1 }}><Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#fff' }}>{profile.age ?? '-'}</Text><Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>{T('bodyAge')}</Text></View>
          <View style={{ flex: 1 }}><Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#fff' }}>{profile.gender === 'female' ? T('bodyFemale') : T('bodyMale')}</Text><Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>{T('bodyGender')}</Text></View>
          <View style={{ flex: 1 }}><Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#fff' }}>{bmr > 0 ? `${bmr}` : '-'}</Text><Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>{T('bodyBmr')}</Text></View>
        </View>

        {/* Self-assessment */}
        <TouchableOpacity onPress={onEditAssessment} style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.15)' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: '#fff' }}>{'🗣️ ' + T('bodySelfAssessment')}</Text>
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
    </View>
  );
}
