import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_BUTTON, BODY_STRATEGIES, type BodyStrategy, type Theme } from '@egoless-do/core';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView } from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: { strategy?: BodyStrategy; targetWeight?: number; targetBodyFat?: number; goalNote?: string }) => void;
  initialStrategy?: BodyStrategy;
  initialTargetWeight?: number;
  initialTargetBodyFat?: number;
  initialGoalNote?: string;
  TH: Theme;
  T: (key: string) => string;
}

export default function GoalEditLightModal({ visible, onClose, onConfirm, initialStrategy, initialTargetWeight, initialTargetBodyFat, initialGoalNote, TH, T }: Props) {
  const [strategy, setStrategy] = useState<BodyStrategy | ''>(initialStrategy ?? '');
  const [targetWeight, setTargetWeight] = useState(initialTargetWeight ? String(initialTargetWeight) : '');
  const [targetBodyFat, setTargetBodyFat] = useState(initialTargetBodyFat ? String(initialTargetBodyFat) : '');
  const [goalNote, setGoalNote] = useState(initialGoalNote ?? '');

  const handleConfirm = () => {
    onConfirm({
      strategy: strategy || undefined,
      targetWeight: targetWeight ? parseFloat(targetWeight) : undefined,
      targetBodyFat: targetBodyFat ? parseFloat(targetBodyFat) : undefined,
      goalNote: goalNote || undefined,
    });
    onClose();
  };

  const getStrategyLabel = (key: string) => {
    const camelCase = key.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
    return T(`bodyStrategy${camelCase}`) || key;
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: TH.border }}>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{T('bodyEditGoal') || '编辑目标'}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={TH.sub} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }}>
            {/* Strategy */}
            <Text style={{ fontSize: FONT_SUB(), fontWeight: '600', color: TH.sub, marginBottom: 8 }}>{T('bodyGoalStrategy') || '策略'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {BODY_STRATEGIES.map(s => (
                <TouchableOpacity
                  key={s.key}
                  onPress={() => setStrategy(strategy === s.key ? '' : s.key as BodyStrategy)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: strategy === s.key ? '#f59e0b' : TH.border + '60' }}
                >
                  <Text style={{ fontSize: FONT_SMALL(), color: strategy === s.key ? '#fff' : TH.text, fontWeight: strategy === s.key ? '700' : '400' }}>
                    {getStrategyLabel(s.key)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Target weight */}
            <Text style={{ fontSize: FONT_SUB(), fontWeight: '600', color: TH.sub, marginBottom: 8 }}>{T('bodyTargetWeight') || '目标体重(kg)'}</Text>
            <TextInput
              value={targetWeight}
              onChangeText={setTargetWeight}
              placeholder={T('bodyGoalWeightPlaceholder')}
              placeholderTextColor={TH.sub}
              keyboardType="numeric"
              style={{ backgroundColor: TH.border + '40', borderRadius: 10, padding: 12, color: TH.text, fontSize: FONT_BODY(), marginBottom: 16 }}
            />

            {/* Target body fat */}
            <Text style={{ fontSize: FONT_SUB(), fontWeight: '600', color: TH.sub, marginBottom: 8 }}>{T('bodyTargetBodyFat') || '目标体脂(%)'}</Text>
            <TextInput
              value={targetBodyFat}
              onChangeText={setTargetBodyFat}
              placeholder={T('bodyGoalFatPlaceholder')}
              placeholderTextColor={TH.sub}
              keyboardType="numeric"
              style={{ backgroundColor: TH.border + '40', borderRadius: 10, padding: 12, color: TH.text, fontSize: FONT_BODY(), marginBottom: 16 }}
            />

            {/* Goal note */}
            <Text style={{ fontSize: FONT_SUB(), fontWeight: '600', color: TH.sub, marginBottom: 8 }}>{T('bodyGoalNote') || '备注'}</Text>
            <TextInput
              value={goalNote}
              onChangeText={setGoalNote}
              placeholder={T('bodyGoalNotePlaceholder') || '可选备注...'}
              placeholderTextColor={TH.sub}
              multiline
              style={{ backgroundColor: TH.border + '40', borderRadius: 10, padding: 12, color: TH.text, fontSize: FONT_BODY(), marginBottom: 20, minHeight: 60, textAlignVertical: 'top' }}
            />
          </ScrollView>

          {/* Confirm button */}
          <View style={{ padding: 20, paddingTop: 0 }}>
            <TouchableOpacity onPress={handleConfirm} style={{ backgroundColor: '#f59e0b', borderRadius: 14, padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_BUTTON(), fontWeight: '700', color: '#fff' }}>{T('bodySaveGoal') || '保存目标'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
