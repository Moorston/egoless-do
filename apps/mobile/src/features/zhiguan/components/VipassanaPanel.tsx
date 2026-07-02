// ─── VipassanaPanel 四念处指引面板 ─────────────────────────────────
// 滑入式面板，显示当前念处（身/受/心/法）的观照指引
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { VIPASSANA_GUIDES } from '@egoless-do/core';

interface Props {
  visible: boolean;
  onClose: () => void;
  T: (key: string) => string;
}

const GUIDE_KEYS = ['kaya', 'vedana', 'citta', 'dharma'] as const;
const GUIDE_ICONS: Record<string, string> = { kaya: '🧘', vedana: '💗', citta: '🧠', dharma: '📜' };

export default function VipassanaPanel({ visible, onClose, T }: Props) {
  const [activeGuide, setActiveGuide] = useState<string>('kaya');

  const currentGuide = VIPASSANA_GUIDES.find(g => g.type === activeGuide);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.panel} onPress={e => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{T('zhiguanVipassanaTitle')}</Text>

          {/* Guide tabs */}
          <View style={styles.tabs}>
            {GUIDE_KEYS.map(key => {
              const guide = VIPASSANA_GUIDES.find(g => g.type === key);
              if (!guide) return null;
              return (
                <Pressable
                  key={key}
                  style={[styles.tab, activeGuide === key && styles.tabActive]}
                  onPress={() => setActiveGuide(key)}
                >
                  <Text style={styles.tabIcon}>{GUIDE_ICONS[key]}</Text>
                  <Text style={[styles.tabText, activeGuide === key && styles.tabTextActive]}>
                    {T(guide.titleKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Guide content */}
          <ScrollView style={styles.content}>
            {currentGuide?.lines.map((lineKey, idx) => (
              <View key={idx} style={styles.lineRow}>
                <Text style={styles.lineNum}>{idx + 1}.</Text>
                <Text style={styles.lineText}>{T(lineKey)}</Text>
              </View>
            ))}
          </ScrollView>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>{T('close')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  panel: { backgroundColor: '#1A1A1F', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', padding: 20 },
  handle: { width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#F5EFE6', marginBottom: 16, textAlign: 'center' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#2A2A30' },
  tabActive: { backgroundColor: '#C9A96E' },
  tabIcon: { fontSize: 18, marginBottom: 4 },
  tabText: { fontSize: 12, color: '#8B7355' },
  tabTextActive: { color: '#1A1A1F', fontWeight: '600' },
  content: { marginBottom: 16 },
  lineRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  lineNum: { fontSize: 14, color: '#C9A96E', fontWeight: '600', width: 20 },
  lineText: { fontSize: 14, color: '#D1C7B7', lineHeight: 22, flex: 1 },
  closeButton: { paddingVertical: 12, alignItems: 'center' },
  closeButtonText: { fontSize: 15, color: '#8B7355' },
});
