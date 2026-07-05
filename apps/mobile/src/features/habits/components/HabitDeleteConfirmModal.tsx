// ─── HabitDeleteConfirmModal: delete confirmation dialog ─────────
import React from 'react';
import { View, Text, Modal } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useTheme, useT } from '../../../components/UI';
import { OutlineButton, PrimaryButton } from '../../../components/UI';
import { FONT_BODY, COLORS } from '@egoless-do/core';

interface Props {
  visible: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function HabitDeleteConfirmModal({ visible, onConfirm, onClose }: Props) {
  const TH = useTheme();
  const T = useT();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.7)', justifyContent: 'center', padding: 24 }}>
        <View style={{
          backgroundColor: TH.cardSolid, borderRadius: 20,
          padding: 24, alignItems: 'center',
        }}>
          <Trash2 size={40} color={COLORS.RED} style={{ marginBottom: 12 }} />
          <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 8 }}>
            {T('habitConfirmDelete')}
          </Text>
          <Text style={{ color: TH.sub, fontSize: FONT_BODY, textAlign: 'center', marginBottom: 20 }}>
            {T('habitConfirmDeleteDesc')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
            <OutlineButton label={T('habitCancel')} onPress={onClose} style={{ flex: 1 }} />
            <PrimaryButton label={T('habitConfirm')} onPress={onConfirm} color={COLORS.RED} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
