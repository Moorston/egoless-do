/**
 * 隐私提示弹窗组件
 * 首次进入全球地图时显示
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity
} from 'react-native';

import { useTheme, useT } from '../../../components/UI';

interface PrivacyIntroModalProps {
  isVisible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const PrivacyIntroModal: React.FC<PrivacyIntroModalProps> = ({
  isVisible,
  onAccept,
  onDecline
}) => {
  const theme = useTheme();
  const t = useT();

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.card }]}>
          {/* 图标 */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🌍</Text>
          </View>

          {/* 标题 */}
          <Text style={[styles.title, { color: theme.text }]}>
            {t('globalPulse.introTitle')}
          </Text>

          {/* 说明 */}
          <View style={styles.content}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📍</Text>
              <Text style={[styles.featureText, { color: theme.text }]}>
                {t('globalPulse.introFeature1')}
              </Text>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🔒</Text>
              <Text style={[styles.featureText, { color: theme.text }]}>
                {t('globalPulse.introFeature2')}
              </Text>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🎭</Text>
              <Text style={[styles.featureText, { color: theme.text }]}>
                {t('globalPulse.introFeature3')}
              </Text>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🚪</Text>
              <Text style={[styles.featureText, { color: theme.text }]}>
                {t('globalPulse.introFeature4')}
              </Text>
            </View>
          </View>

          {/* 隐私承诺 */}
          <View style={[styles.privacyCommitment, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
            <Text style={styles.privacyIcon}>🛡️</Text>
            <Text style={[styles.privacyText, { color: theme.sub }]}>
              {t('globalPulse.privacyCommitment')}
            </Text>
          </View>

          {/* 按钮 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={onAccept}
            >
              <Text style={styles.acceptButtonText}>
                {t('globalPulse.joinGlobalMap')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.declineButton, { borderColor: theme.border }]}
              onPress={onDecline}
            >
              <Text style={[styles.declineButtonText, { color: theme.sub }]}>
                {t('globalPulse.notNow')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  content: {
    width: '100%',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  privacyCommitment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  privacyIcon: {
    fontSize: 20,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#8B5CF6',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  declineButton: {
    borderWidth: 1,
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PrivacyIntroModal;
