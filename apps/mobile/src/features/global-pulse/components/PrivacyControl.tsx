/**
 * 隐私控制组件
 * 提供全球地图隐私设置
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { optOut, optIn, deleteGlobalData } from '../services/globalPulseApi';

interface PrivacyControlProps {
  isVisible: boolean;
  onOptOut?: () => void;
  onOptIn?: () => void;
  onDelete?: () => void;
}

export const PrivacyControl: React.FC<PrivacyControlProps> = ({
  isVisible,
  onOptOut,
  onOptIn,
  onDelete
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [showOnMap, setShowOnMap] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // 处理开关切换
  const handleToggle = async (value: boolean) => {
    setIsLoading(true);

    try {
      if (value) {
        const response = await optIn();
        if (response.success) {
          setShowOnMap(true);
          onOptIn?.();
        } else {
          Alert.alert(t('error'), response.error?.message || t('globalPulse.optInFailed'));
        }
      } else {
        const response = await optOut();
        if (response.success) {
          setShowOnMap(false);
          onOptOut?.();
        } else {
          Alert.alert(t('error'), response.error?.message || t('globalPulse.optOutFailed'));
        }
      }
    } catch (error) {
      Alert.alert(t('error'), t('globalPulse.networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  // 处理删除数据
  const handleDelete = () => {
    Alert.alert(
      t('globalPulse.deleteConfirmTitle'),
      t('globalPulse.deleteConfirmMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);

            try {
              const response = await deleteGlobalData();
              if (response.success) {
                onDelete?.();
                Alert.alert(t('success'), t('globalPulse.deleteSuccess'));
              } else {
                Alert.alert(t('error'), response.error?.message || t('globalPulse.deleteFailed'));
              }
            } catch (error) {
              Alert.alert(t('error'), t('globalPulse.networkError'));
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  if (!isVisible) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      {/* 标题 */}
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {t('globalPulse.privacySettings')}
      </Text>

      {/* 显示在全球地图开关 */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
            {t('globalPulse.showOnMap')}
          </Text>
          <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
            {t('globalPulse.showOnMapDescription')}
          </Text>
        </View>
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Switch
            value={showOnMap}
            onValueChange={handleToggle}
            trackColor={{ false: '#767577', true: theme.colors.primary }}
            thumbColor={showOnMap ? '#fff' : '#f4f3f4'}
          />
        )}
      </View>

      {/* 隐私说明 */}
      <View style={styles.privacyInfo}>
        <Text style={styles.privacyIcon}>🔒</Text>
        <Text style={[styles.privacyText, { color: theme.colors.textSecondary }]}>
          {t('globalPulse.privacyDescription')}
        </Text>
      </View>

      {/* 删除数据按钮 */}
      <TouchableOpacity
        style={[styles.deleteButton, { borderColor: '#EF4444' }]}
        onPress={handleDelete}
        disabled={isLoading}
      >
        <Text style={styles.deleteButtonText}>
          {t('globalPulse.deleteMyData')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    margin: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  privacyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
  },
  privacyIcon: {
    fontSize: 20,
  },
  privacyText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  deleteButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PrivacyControl;
