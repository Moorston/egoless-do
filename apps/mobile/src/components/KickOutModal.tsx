// ─── Kick Out Modal ──────────────────────────────────────────────────
// Shown when the current device is kicked out by a new login on another device.
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from './UI';

interface KickOutModalProps {
  visible: boolean;
  hasPendingData: boolean;
  onSyncAndLogout: () => void;
  onLogoutDirectly: () => void;
}

export function KickOutModal({ visible, hasPendingData, onSyncAndLogout, onLogoutDirectly }: KickOutModalProps) {
  const TH = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <Text style={[styles.title, { color: TH.text }]}>账号已在其他设备登录</Text>
          <Text style={[styles.message, { color: TH.sub }]}>
            您的账号已在另一台设备上登录，当前设备已退出。
            {hasPendingData ? '\n\n检测到有未同步的数据，请选择是否同步。' : ''}
          </Text>

          {hasPendingData ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { backgroundColor: TH.accent }]}
                onPress={onSyncAndLogout}
              >
                <Text style={styles.primaryButtonText}>同步后退出</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { borderColor: TH.border }]}
                onPress={onLogoutDirectly}
              >
                <Text style={[styles.secondaryButtonText, { color: TH.sub }]}>直接退出</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { backgroundColor: TH.accent }]}
              onPress={onLogoutDirectly}
            >
              <Text style={styles.primaryButtonText}>确定</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  container: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {},
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
