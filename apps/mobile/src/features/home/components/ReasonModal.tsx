import { FONT_BODY, FONT_BUTTON, FONT_SUB, FONT_TITLE, getIncompleteItems, INCOMPLETE_REASONS } from '@egoless-do/core';
import { X } from 'lucide-react-native';
import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useT, useTheme } from '../../../components/UI';
import { styles } from '../styles';

export interface ReasonModalProps {
  visible: boolean;
  incompleteItems: ReturnType<typeof getIncompleteItems>;
  selectedReason: string;
  setSelectedReason: (v: string) => void;
  reasonNote: string;
  setReasonNote: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function ReasonModal({
  visible,
  incompleteItems,
  selectedReason,
  setSelectedReason,
  reasonNote,
  setReasonNote,
  onClose,
  onConfirm,
}: ReasonModalProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.65)' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex1}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
            <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24 }}>
              <Text style={{ fontWeight: '700', fontSize: FONT_TITLE(), color: TH.text, marginBottom: 12 }}>{T('incompleteReasonTitle')}</Text>

              {/* Incomplete items list */}
              <View style={{ marginBottom: 16 }}>
                {incompleteItems.map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <X size={16} color="#C53364" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: FONT_TITLE(), color: TH.sub }}>{item.name}</Text>
                  </View>
                ))}
              </View>

              {/* Reason options */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {INCOMPLETE_REASONS.map(r => {
                  const labelKey = `incompleteReason${r.code.charAt(0).toUpperCase() + r.code.slice(1)}` as string;
                  const selected = selectedReason === r.code;
                  return (
                    <TouchableOpacity key={r.code} onPress={() => setSelectedReason(r.code)}
                      accessibilityLabel={`${r.icon} ${T(labelKey)}`}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
                        borderWidth: 1.5, borderColor: selected ? P : TH.border,
                        backgroundColor: selected ? `${P}15` : 'transparent',
                      }}>
                      <Text style={{ fontSize: FONT_BODY(), color: selected ? P : TH.text }}>
                        {r.icon} {T(labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Additional note */}
              <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 8 }}><Text style={{ color: '#EF4444' }}>*</Text> {T('incompleteReasonNote')}</Text>
              <TextInput
                value={reasonNote} onChangeText={setReasonNote}
                placeholder={T('incompleteReasonNotePlaceholder')}
                placeholderTextColor={TH.sub}
                multiline
                style={{
                  width: '100%', minHeight: 60, backgroundColor: TH.card, borderWidth: 1, borderColor: TH.border,
                  borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY(), marginBottom: 20,
                  textAlignVertical: 'top',
                }}
              />

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={onClose}
                  accessibilityLabel={T('incompleteReasonBack')}
                  style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                  <Text style={{ color: TH.sub, fontSize: FONT_BUTTON() }}>{T('incompleteReasonBack')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onConfirm} disabled={!selectedReason || !reasonNote.trim()}
                  accessibilityLabel={T('incompleteReasonConfirm')}
                  style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: selectedReason && reasonNote.trim() ? P : TH.border, alignItems: 'center' }}>
                  <Text style={[styles.whiteTextBold, { fontSize: FONT_BUTTON() }]}>{T('incompleteReasonConfirm')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
