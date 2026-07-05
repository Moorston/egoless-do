// ─── HabitStatusReasonModal: pause/abandon reason input ──────────
import React from 'react';
import { View, Text, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme, useT } from '../../../components/UI';
import { ThemedInput, OutlineButton, PrimaryButton } from '../../../components/UI';
import { FONT_BODY } from '@egoless-do/core';
import type { HabitStatus } from '@egoless-do/core';

interface Props {
  visible: boolean;
  status: HabitStatus | null;
  reason: string;
  onChangeReason: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export default function HabitStatusReasonModal({
  visible, status, reason, onChangeReason, onConfirm, onClose,
}: Props) {
  const TH = useTheme();
  const T = useT();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.7)' }}
      >
        <View style={{
          backgroundColor: TH.cardSolid,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20,
        }}>
          <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_BODY, marginBottom: 12 }}>
            {status === 'paused' ? T('habitPauseReason') : T('habitAbandonReason')}
          </Text>
          <ThemedInput
            value={reason}
            onChangeText={onChangeReason}
            placeholder={T('habitReasonPlaceholder')}
            multiline
            numberOfLines={3}
            style={{ marginBottom: 16 }}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <OutlineButton label={T('cancel')} onPress={onClose} style={{ flex: 1 }} />
            <PrimaryButton label={T('confirm')} onPress={onConfirm} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
