import { FONT_BODY, FONT_SMALL, FONT_BUTTON } from '@egoless-do/core';
import { X, AlertTriangle, Check } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

import { useTheme, useT } from './UI';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  icon?: 'warning' | 'confirm' | 'none';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationDialog({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  destructive = false,
  icon = 'warning',
  onConfirm,
  onCancel,
}: Props) {
  const TH = useTheme();
  const T = useT();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onCancel}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: TH.card }]}>
          {/* Icon */}
          {icon !== 'none' && (
            <View style={styles.iconContainer}>
              {icon === 'warning' ? (
                <AlertTriangle size={48} color={destructive ? '#EF4444' : '#F59E0B'} />
              ) : (
                <Check size={48} color={TH.primary} />
              )}
            </View>
          )}

          {/* Title */}
          <Text style={[styles.title, { color: TH.text }]}>{title}</Text>

          {/* Message */}
          <Text style={[styles.message, { color: TH.sub }]}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              onPress={onCancel}
              style={[styles.button, { backgroundColor: TH.border }]}
            >
              <Text style={[styles.buttonText, { color: TH.text }]}>
                {cancelText || T('commonCancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={[styles.button, { backgroundColor: destructive ? '#EF4444' : TH.primary }]}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>
                {confirmText || T('commonConfirm')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: FONT_BODY,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: FONT_SMALL,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: FONT_BUTTON,
    fontWeight: '600',
  },
});
