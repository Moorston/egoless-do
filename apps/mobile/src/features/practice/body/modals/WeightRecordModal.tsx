import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, dateStr, type Theme } from '@egoless-do/core';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput } from 'react-native';

import { PrimaryButton, OutlineButton } from '../../../../components/UI';

interface Props {
  visible: boolean;
  TH: Theme;
  T: (key: string) => string;
  currentWeight?: number;
  currentBodyFat?: number;
  onClose: () => void;
  onSave: (data: { date: string; weight: number; bodyFat?: number }) => void;
}

export default function WeightRecordModal({ visible, TH, T, currentWeight, currentBodyFat, onClose, onSave }: Props) {
  const [weightStr, setWeightStr] = useState('');
  const [bodyFatStr, setBodyFatStr] = useState('');

  const weight = parseFloat(weightStr);
  const bodyFat = bodyFatStr ? parseFloat(bodyFatStr) : undefined;

  const handleSave = () => {
    if (!weight || weight <= 0 || weight > 500) return;
    onSave({ date: dateStr(), weight, bodyFat: bodyFat && bodyFat > 0 && bodyFat < 100 ? bodyFat : undefined });
    setWeightStr('');
    setBodyFatStr('');
    onClose();
  };

  const handleClose = () => {
    setWeightStr('');
    setBodyFatStr('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{T('bodyRecordWeight')}</Text>
            <TouchableOpacity onPress={handleClose}><X size={24} color={TH.sub} /></TouchableOpacity>
          </View>

          {/* Weight input */}
          <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 6 }}>{T('bodyWeight')} ({T('bodyUnitKg')}){currentWeight ? ` - ${T('bodyCurrentWeight')}: ${currentWeight}${T('bodyUnitKg')}` : ''}</Text>
          <TextInput
            style={{ backgroundColor: TH.card, borderRadius: 12, padding: 14, color: TH.text, fontSize: FONT_BODY(), marginBottom: 16 }}
            keyboardType="decimal-pad"
            value={weightStr}
            onChangeText={setWeightStr}
            placeholder={currentWeight ? `${currentWeight}` : '0.0'}
            placeholderTextColor={TH.sub}
          />

          {/* Body fat input */}
          <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 6 }}>{T('bodyBodyFat')} ({T('bodyUnitPercent')}){currentBodyFat ? ` - ${T('bodyCurrentBodyFat')}: ${currentBodyFat}${T('bodyUnitPercent')}` : ''}</Text>
          <TextInput
            style={{ backgroundColor: TH.card, borderRadius: 12, padding: 14, color: TH.text, fontSize: FONT_BODY(), marginBottom: 8 }}
            keyboardType="decimal-pad"
            value={bodyFatStr}
            onChangeText={setBodyFatStr}
            placeholder={currentBodyFat ? `${currentBodyFat}` : T('bodyNotSet')}
            placeholderTextColor={TH.sub}
          />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <OutlineButton label={T('bodyCancel')} onPress={handleClose} style={{ flex: 1 }} />
            <PrimaryButton label={T('bodySave')} onPress={handleSave} color="#10b981" style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
