import { t, FONT_SUB, FONT_STAT_SECTION, FONT_LABEL, FONT_BODY } from '@egoless-do/core';
import { Image } from 'expo-image';
import {
  Home, ClipboardList, Timer, Binary, Sparkles, Dumbbell,
  Target, BarChart3, Settings, Flame,
} from 'lucide-react-native';
import React, { useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore, useShallowStore } from '../store/useAppStore';


import { useTheme } from './UI';


const TAB_ICONS_MAP: Record<string, React.ComponentType<any>> = {
  home: Home, plan: ClipboardList, fasting: Timer, meditation: Binary,
  reflections: Sparkles, exercise: Dumbbell, habits: Target,
  stats: BarChart3, settings: Settings,
};

const TABS = [
  { key: 'home',        labelKey: 'home' },
  { key: 'plan',        labelKey: 'plan' },
  { key: 'fasting',     labelKey: 'fasting' },
  { key: 'meditation',  labelKey: 'meditation' },
  { key: 'reflections', labelKey: 'reflections' },
  { key: 'exercise',    labelKey: 'exercise' },
  { key: 'habits',      labelKey: 'habits' },
];

interface AppHeaderProps {
  activeTab?: string;
  onTabChange?: (key: string) => void;
}

export default function AppHeader({ activeTab, onTabChange }: AppHeaderProps) {
  const theme = useShallowStore(s => s.theme);
  const streak = useShallowStore(s => s.streak);
  const language = useShallowStore(s => s.language);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const tabLayoutsRef = useRef<Record<string, { x: number; width: number }>>({});

  const TH = useTheme();
  const P = TH.primary;
  const T = (k: string) => t(k as import("@egoless-do/core").I18nKey, language);

  const today = formatDate(new Date(), language, {
    month: 'long', day: 'numeric', weekday: 'short',
  });

  const handleTabLayout = (key: string, x: number, width: number) => {
    tabLayoutsRef.current[key] = { x, width };
  };

  return (
    <View style={[styles.container, { backgroundColor: TH.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Image
          source={require('../../assets/header-logo.png')}
          style={{ width: 108, height: 54 }}
          contentFit="contain"
        />
        <View style={styles.streakBox}>
          <Text style={[styles.streakLabel, { color: TH.sub }]}>{T('streak')}</Text>
          <Text style={styles.streakValue}>
            {`${String(streak)} ${T('days')} `}<Flame size={20} color="#EA6060" />
          </Text>
        </View>
      </View>

      {/* Header Tabs */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        keyboardShouldPersistTaps="handled"
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onTabChange?.(tab.key)}
            onLayout={(e) => handleTabLayout(tab.key, e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            style={[
              styles.tab,
              { backgroundColor: activeTab === tab.key ? P : TH.card },
            ]}
            accessibilityRole="button"
            accessibilityLabel={T(tab.labelKey)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {(() => {
                const Icon = TAB_ICONS_MAP[tab.key];
                const isActive = activeTab === tab.key;
                return Icon ? <Icon size={14} color={isActive ? '#fff' : TH.sub} strokeWidth={isActive ? 2.2 : 1.5} /> : null;
              })()}
              <Text style={[
                styles.tabText,
                { color: activeTab === tab.key ? '#fff' : TH.sub },
                activeTab === tab.key && styles.tabTextActive,
              ]}>
                {T(tab.labelKey)}
              </Text>
            </View>
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
    fontSize: FONT_BODY(),
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  appName: {
    fontWeight: '700',
    fontSize: FONT_STAT_SECTION(),
    marginTop: 2,
  },
  streakBox: {
    alignItems: 'flex-end',
  },
  streakLabel: {
    fontSize: FONT_SUB(),
  },
  streakValue: {
    fontWeight: '800',
    fontSize: FONT_STAT_SECTION(),
    lineHeight: 42,
    color: '#EA6060',
  },
  streakUnit: {
    fontSize: FONT_LABEL(),
  },
  tabsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    minHeight: 36,
    justifyContent: 'center',
  },
  tabText: {
    fontSize: FONT_BODY(),
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
    fontSize: FONT_SUB(),
  },
});
