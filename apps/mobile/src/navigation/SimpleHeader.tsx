import { t, FONT_BODY, FONT_SUB, FONT_STAT_SECTION, FONT_LABEL } from '@egoless-do/core';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import {
  Home, ClipboardList, Target, Sparkles, Flame,
} from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../components/UI';
import { useAppStore, useShallowStore } from '../store/useAppStore';


const HEADER_TAB_KEYS = ['home', 'plan', 'habits', 'reflections'];
const HEADER_TAB_ROUTES: Record<string, string> = {
  home: 'Home', plan: 'Plan', habits: 'Habits', reflections: 'Reflections',
};
const HEADER_TAB_ICONS: Record<string, React.ComponentType<any>> = {
  home: Home, plan: ClipboardList, habits: Target, reflections: Sparkles,
};

export default function SimpleHeader({ routeName }: { routeName?: string }) {
  const theme = useShallowStore(s => s.theme);
  const streak = useShallowStore(s => s.streak);
  const language = useShallowStore(s => s.language);
  const TH = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
  const showTabs = Object.values(HEADER_TAB_ROUTES).includes(routeName ?? '');
  const activeKey = Object.entries(HEADER_TAB_ROUTES).find(([, r]) => r === routeName)?.[0] ?? 'home';

  return (
    <View style={{ backgroundColor: TH.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <Image
          source={require('../../assets/header-logo.png')}
          style={{ width: 108, height: 54 }}
          contentFit="contain"
        />
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{t('streak', language)}</Text>
          <Text style={{ fontWeight: '800', fontSize: FONT_STAT_SECTION, lineHeight: 42, color: '#EA6060' }}>
            {streak} <Text style={{ fontSize: FONT_LABEL }}>{t('days', language)} </Text><Flame size={20} color="#EA6060" />
          </Text>
        </View>
      </View>
      {showTabs && (
        <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 6 }}>
          {HEADER_TAB_KEYS.map((key) => (
            <TouchableOpacity
              key={key}
              onPress={() => { const route = HEADER_TAB_ROUTES[key]; if (route && route !== routeName) navigation.navigate(route as never); }}
              activeOpacity={0.7}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 12, minHeight: 36, justifyContent: 'center', alignItems: 'center', backgroundColor: key === activeKey ? TH.primary : TH.card }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {(() => {
                  const Icon = HEADER_TAB_ICONS[key];
                  return Icon ? <Icon size={14} color={key === activeKey ? '#fff' : TH.sub} strokeWidth={key === activeKey ? 2.2 : 1.5} /> : null;
                })()}
                <Text style={{ fontSize: FONT_BODY, fontWeight: key === activeKey ? '700' : '500', color: key === activeKey ? '#fff' : TH.sub }}>
                  {t(key, language)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: TH.border }}>
        <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>
          {t('today', language)} · {today}
        </Text>
      </View>
    </View>
  );
}
