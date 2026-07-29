/**
 * 隐私控制组件
 * 提供全球地图隐私设置
 */

import { FONT_BACK, FONT_LABEL, FONT_SUB } from '@egoless-do/core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';

import { useTheme, useT } from '../../../components/UI';
import { optOut, optIn, deleteGlobalData } from '../services/globalPulseApi';
import { getUserHash } from '../services/userHash';

const PREFERENCES_KEY = 'global_pulse_preferences';

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
  const theme = useTheme();
  const t = useT();
  const userHashRef = useRef<string>('');

  const [showOnMap, setShowOnMap] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    void getUserHash().then(hash => {
      userHashRef.current = hash;
    });
    void AsyncStorage.getItem(PREFERENCES_KEY).then(stored => {
      if (stored) {
        const parsed = JSON.parse(stored) as { show_on_global_map?: boolean };
        if (parsed.show_on_global_map !== undefined) {
          setShowOnMap(parsed.show_on_global_map);
        }
      }
      setIsInitialized(true);
    });
  }, []);

  const savePref = async (show: boolean) => {
    try {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify({ show_on_global_map: show }));
    } catch (e) { console.warn(e, 'PrivacyControl savePref'); }
  };

  // 处理开关切换
  const handleToggle = async (value: boolean) => {
    if (!isInitialized) return;
    const hash = userHashRef.current;
    if (!hash) return;

    setIsLoading(true);

    try {
      const response = value ? await optIn(hash) : await optOut(hash);
      if (response.success) {
        setShowOnMap(value);
        await savePref(value);
        value ? onOptIn?.() : onOptOut?.();
      } else {
        Alert.alert(t('error'), response.error?.message || (value ? t('globalPulse.optInFailed') : t('globalPulse.optOutFailed')));
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
              const hash = userHashRef.current;
              if (!hash) return;
              const response = await deleteGlobalData(hash);
              if (response.success) {
                setShowOnMap(false);
                await savePref(false);
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
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      {/* 标题 */}
      <Text style={[styles.title, { color: theme.text }]}>
        {t('globalPulse.privacySettings')}
      </Text>

      {/* 显示在全球地图开关 */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>
            {t('globalPulse.showOnMap')}
          </Text>
          <Text style={[styles.settingDescription, { color: theme.sub }]}>
            {t('globalPulse.showOnMapDescription')}
          </Text>
        </View>
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <Switch
            value={showOnMap}
            onValueChange={handleToggle}
            trackColor={{ false: '#767577', true: theme.primary }}
            thumbColor={showOnMap ? '#fff' : '#f4f3f4'}
          />
        )}
      </View>

      {/* 隐私说明 */}
      <View style={styles.privacyInfo}>
        <Text style={styles.privacyIcon}>🔒</Text>
        <Text style={[styles.privacyText, { color: theme.sub }]}>
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
    fontSize: FONT_BACK(),
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
    fontSize: FONT_LABEL(),
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: FONT_SUB(),
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
    fontSize: FONT_BACK(),
  },
  privacyText: {
    flex: 1,
    fontSize: FONT_SUB(),
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
    fontSize: FONT_LABEL(),
    fontWeight: '600',
  },
});

export default PrivacyControl;
