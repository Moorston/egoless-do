import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_SMALL, recommendStrategy, BODY_STRATEGIES, type BodyStrategy, type BodyGoal, type Theme } from '@egoless-do/core';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';

import { PrimaryButton, OutlineButton } from '../../../../components/UI';

interface Props {
  visible: boolean;
  TH: Theme;
  T: (key: string) => string;
  goal?: BodyGoal;
  profile: Record<string, unknown>;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
}

export default function GoalEditModal({ visible, TH, T, goal, profile, onClose, onSave }: Props) {
  const [targetWeight, setTargetWeight] = useState(goal?.targetWeight?.toString() ?? '');
  const [targetBodyFat, setTargetBodyFat] = useState(goal?.targetBodyFat?.toString() ?? '');
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '');
  const [strategy, setStrategy] = useState<BodyStrategy | undefined>(goal?.strategy);
  const recommended = recommendStrategy((profile.bodyTags as string[] ?? []) as string[]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{T('bodyGoalTitle')}</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={TH.sub} /></TouchableOpacity>
          </View>
          <ScrollView>
            <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 6 }}>{T('bodyTargetWeight')}</Text>
            <TextInput style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY(), marginBottom: 12 }} keyboardType="numeric" value={targetWeight} onChangeText={setTargetWeight} placeholder={`${T('bodyCurrentWeight')} ${profile.weight ?? '-'} kg`} placeholderTextColor={TH.sub} />
            <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 6 }}>{T('bodyTargetBodyFat')}</Text>
            <TextInput style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY(), marginBottom: 12 }} keyboardType="numeric" value={targetBodyFat} onChangeText={setTargetBodyFat} placeholder={`${T('bodyCurrentBodyFat')} ${profile.bodyFat ?? '-'} %`} placeholderTextColor={TH.sub} />
            <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 6 }}>{T('bodyTargetDate')}</Text>
            <TextInput style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY(), marginBottom: 16 }} value={targetDate} onChangeText={setTargetDate} placeholder="2026-09-30" placeholderTextColor={TH.sub} />
            <Text style={{ fontSize: FONT_SUB(), fontWeight: '600', color: TH.text, marginBottom: 8 }}>{T('bodyStrategyLabel')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {BODY_STRATEGIES.map(s => (
                <TouchableOpacity key={s.key} onPress={() => setStrategy(s.key)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: strategy === s.key ? '#8b5cf6' : TH.border, backgroundColor: strategy === s.key ? '#8b5cf615' : 'transparent' }}>
                  <Text style={{ fontSize: FONT_BADGE(), color: strategy === s.key ? '#8b5cf6' : TH.text, fontWeight: strategy === s.key ? '600' : '400' }}>{T(s.nameKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {recommended && !strategy && (
              <View style={{ backgroundColor: '#8b5cf610', borderRadius: 8, padding: 10, marginBottom: 16 }}>
                <Text style={{ fontSize: FONT_SMALL(), color: '#8b5cf6' }}>{'💡 ' + T('bodyRecommendLabel') + ' ' + recommended}</Text>
              </View>
            )}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <OutlineButton label={T('bodyCancel')} onPress={onClose} style={{ flex: 1 }} />
            <PrimaryButton label={T('bodySave')} onPress={() => { onSave({ targetWeight: parseFloat(targetWeight) || undefined, targetBodyFat: parseFloat(targetBodyFat) || undefined, targetDate, strategy }); onClose(); }} color="#8b5cf6" style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
