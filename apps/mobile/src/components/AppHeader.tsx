import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { THEMES, t, COLORS, FONT_SUB, FONT_STAT_SECTION, FONT_LABEL, FONT_BODY } from '@egoless-do/core';
import {
  Home, ClipboardList, Timer, Binary, Sparkles, Dumbbell,
  Target, BarChart3, Settings, Flame,
} from 'lucide-react-native';

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
  const theme = useAppStore(s => s.theme);
  const streak = useAppStore(s => s.streak);
  const language = useAppStore(s => s.language);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const tabPositions = useRef<Record<string, number>>({});

  const TH = THEMES[theme];
  const P = TH.primary;
  const T = (k: string) => t(k, language);

  const today = useMemo(() => new Date().toLocaleDateString('zh-CN', {
    month: 'long', day: 'numeric', weekday: 'short',
  }), []);

  // Scroll to active tab when it changes
  useEffect(() => {
    if (activeTab && tabPositions.current[activeTab] !== undefined) {
      const x = tabPositions.current[activeTab];
      scrollRef.current?.scrollTo({ x: Math.max(0, x - 50), animated: true });
    }
  }, [activeTab]);

  const handleTabLayout = (key: string, x: number) => {
    tabPositions.current[key] = x;
  };

  return (
    <View style={[styles.container, { backgroundColor: TH.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Image
          source={require('../../assets/header-logo.png')}
          style={{ width: 108, height: 54 }}
          resizeMode="contain"
        />
        <View style={styles.streakBox}>
          <Text style={[styles.streakLabel, { color: TH.sub }]}>{T('streak')}</Text>
          <Text style={[styles.streakValue, { color: COLORS.ORANGE }]}>
            {streak} <Text style={styles.streakUnit}>{T('days')} </Text><Flame size={20} color={COLORS.ORANGE} />
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
            onLayout={(e) => handleTabLayout(tab.key, e.nativeEvent.layout.x)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            style={[
              styles.tab,
              { backgroundColor: activeTab === tab.key ? P : TH.card },
            ]}
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
    fontSize: FONT_BODY,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  appName: {
    fontWeight: '700',
    fontSize: FONT_STAT_SECTION,
    marginTop: 2,
  },
  streakBox: {
    alignItems: 'flex-end',
  },
  streakLabel: {
    fontSize: FONT_SUB,
  },
  streakValue: {
    fontWeight: '800',
    fontSize: FONT_STAT_SECTION,
    lineHeight: 42,
  },
  streakUnit: {
    fontSize: FONT_LABEL,
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
    fontSize: FONT_BODY,
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
    fontSize: FONT_SUB,
  },
});
