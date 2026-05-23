import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { THEMES, t } from '@egoless-do/core';

const TABS = [
  { key: 'home',        icon: '🏠', labelKey: 'home' },
  { key: 'fasting',     icon: '⏱', labelKey: 'fasting' },
  { key: 'meditation',  icon: '☯', labelKey: 'meditation' },
  { key: 'reflections', icon: '✦', labelKey: 'reflections' },
  { key: 'exercise',    icon: '🏃', labelKey: 'exercise' },
  { key: 'habits',      icon: '◇', labelKey: 'habits' },
  { key: 'stats',       icon: '◈', labelKey: 'stats' },
  { key: 'settings',    icon: '⚙', labelKey: 'settings' },
];

interface AppHeaderProps {
  activeTab?: string;
  onTabChange?: (key: string) => void;
}

export default function AppHeader({ activeTab, onTabChange }: AppHeaderProps) {
  const theme = useAppStore(s => s.theme);
  const streak = useAppStore(s => s.streak);
  const language = useAppStore(s => s.language);
  const insets = useSafeAreaInsets();

  const TH = THEMES[theme];
  const P = TH.primary;
  const T = (k: string) => t(k, language);

  const today = useMemo(() => new Date().toLocaleDateString('zh-CN', {
    month: 'long', day: 'numeric', weekday: 'short',
  }), []);

  return (
    <View style={[styles.container, { backgroundColor: TH.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.brand, { color: TH.sub }]}>Egoless Do</Text>
          <Text style={[styles.appName, { color: TH.text }]}>{T('appName')}</Text>
        </View>
        <View style={styles.streakBox}>
          <Text style={[styles.streakLabel, { color: TH.sub }]}>{T('streak')}</Text>
          <Text style={[styles.streakValue, { color: P }]}>
            {streak} <Text style={styles.streakUnit}>{T('days')} 🔥</Text>
          </Text>
        </View>
      </View>

      {/* Header Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        keyboardShouldPersistTaps="handled"
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onTabChange?.(tab.key)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            style={[
              styles.tab,
              { backgroundColor: activeTab === tab.key ? P : TH.card },
            ]}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.key ? '#fff' : TH.sub },
              activeTab === tab.key && styles.tabTextActive,
            ]}>
              {tab.icon} {T(tab.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Date line + divider */}
      <View style={[styles.dateRow, { borderBottomColor: TH.border }]}>
        <Text style={[styles.dateText, { color: TH.sub }]}>
          {T('today')} · {today}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  brand: {
    fontSize: 13,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  appName: {
    fontWeight: '700',
    fontSize: 22,
    marginTop: 2,
  },
  streakBox: {
    alignItems: 'flex-end',
  },
  streakLabel: {
    fontSize: 13,
  },
  streakValue: {
    fontWeight: '800',
    fontSize: 24,
    lineHeight: 28,
  },
  streakUnit: {
    fontSize: 14,
  },
  tabsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    minHeight: 40,
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  tabTextActive: {
    fontWeight: '700',
  },
  dateRow: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateText: {
    fontSize: 14,
  },
});
