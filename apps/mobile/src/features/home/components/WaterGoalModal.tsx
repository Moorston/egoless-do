import { COLORS, FONT_BODY, FONT_BUTTON, FONT_STAT_CARD, FONT_TITLE } from '@egoless-do/core';
import React from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useT, useTheme } from '../../../components/UI';
import { styles } from '../styles';

export interface WaterGoalModalProps {
  visible: boolean;
  wgi: string;
  setWgi: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function WaterGoalModal({ visible, wgi, setWgi, onClose, onSave }: WaterGoalModalProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.65)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24, alignItems: 'center' }}>
          <Text style={{ fontWeight: '700', fontSize: FONT_TITLE(), marginBottom: 6, color: TH.text }}>{T('waterGoalSetting')}</Text>
          <Text style={{ fontSize: FONT_BODY(), color: TH.sub, marginBottom: 16 }}>{T('waterGoalHint')}</Text>
          <TextInput
            value={wgi} onChangeText={setWgi} keyboardType="numeric"
            style={{
              width: '100%', fontSize: FONT_STAT_CARD(), fontWeight: '700', textAlign: 'center',
              backgroundColor: TH.card, borderWidth: 2, borderColor: COLORS.BLUE,
              borderRadius: 12, padding: 14, color: TH.text, marginBottom: 20,
            }}
          />
          <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
            <TouchableOpacity onPress={onClose}
              accessibilityLabel={T('cancel')}
              style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
              <Text style={{ color: TH.sub, fontSize: FONT_BODY() }}>{T('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSave}
              accessibilityLabel={T('save')}
              style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: P, alignItems: 'center' }}>
              <Text style={[styles.whiteTextBold, { fontSize: FONT_BUTTON() }]}>{T('save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
