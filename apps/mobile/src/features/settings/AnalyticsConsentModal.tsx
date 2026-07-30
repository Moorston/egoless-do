// ─── 用户分析同意弹窗 ───────────────────────────────────────────
// 首次启动或设置页调用，获取用户对匿名追踪的同意。
// useTheme/useT 返回类型在跨目录导入时，eslint 语言服务将 THEMES[theme] 索引访问解析为 error 类型（tsc 解析正常）。
// 此处禁用 no-unsafe-* 规则，避免误报；类型安全由 tsc 保证（UI.tsx 已显式标注 useTheme(): Theme）。
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { optIn, optOut } from '../../analytics/posthog';
import { setAnalyticsConsent, type AnalyticsConsent } from '../../analytics/privacy';
import { useT, useTheme } from '../components/UI';

interface AnalyticsConsentModalProps {
  visible: boolean;
  onDecision: () => void;
}

export function AnalyticsConsentModal({ visible, onDecision }: AnalyticsConsentModalProps) {
  const T = useT();
  const TH = useTheme();
  const [loading, setLoading] = useState(false);

  const handleDecision = async (consent: AnalyticsConsent) => {
    if (loading) return;
    setLoading(true);
    try {
      await setAnalyticsConsent(consent);
      if (consent === 'anonymous') {
        await optIn();
      } else {
        await optOut();
      }
    } catch {
      // 静默失败，不影响用户体验
    } finally {
      setLoading(false);
      onDecision();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <Text style={[styles.title, { color: TH.text }]}>
            {T('analyticsConsentTitle', { default: '帮助我们改进产品？' })}
          </Text>

          <Text style={[styles.description, { color: TH.textSecondary }]}>
            {T('analyticsConsentDesc', {
              default: '我们可以发送匿名使用数据来改进应用体验。绝不会上传您的冥想笔记、心情记录等敏感内容。'
            })}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.primaryBtn, { backgroundColor: TH.primary }]}
              onPress={() => handleDecision('anonymous')}
              disabled={loading}
            >
              <Text style={[styles.btnText, { color: TH.buttonText }]}>
                {T('analyticsAllowAnonymous', { default: '允许匿名数据' })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.secondaryBtn, { borderColor: TH.border }]}
              onPress={() => handleDecision('necessary')}
              disabled={loading}
            >
              <Text style={[styles.btnText, { color: TH.text }]}>
                {T('analyticsNecessaryOnly', { default: '仅必要功能' })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.textBtn]}
              onPress={() => handleDecision('denied')}
              disabled={loading}
            >
              <Text style={[styles.btnText, { color: TH.textSecondary }]}>
                {T('analyticsDecline', { default: '拒绝' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  actions: {
    gap: 12,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryBtn: {},
  secondaryBtn: {
    borderWidth: 1,
  },
  textBtn: {},
  btnText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
