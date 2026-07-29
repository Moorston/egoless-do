// ─── Shared UI primitives ─────────────────────────────────────────
import { THEMES, COLORS, t, FONT_BUTTON, FONT_BACK, FONT_LABEL, FONT_SUB, FONT_STAT_CARD, FONT_BODY, FONT_HERO , FONT_SMALL } from '@egoless-do/core';
import type { I18nKey } from '@egoless-do/core';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Check } from 'lucide-react-native';
import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, ViewStyle, TextStyle,
} from 'react-native';

import { useAppStore, type MobileStore } from '../store/useAppStore';


// ── useTheme ──────────────────────────────────────────────────────
export function useTheme() {
  const theme = useAppStore((s: MobileStore) => s.theme);
  return THEMES[theme];
}

// ── useT ──────────────────────────────────────────────────────────
export function useT() {
  const language = useAppStore((s: MobileStore) => s.language);
  return (key: I18nKey, params?: Record<string, string | number>) => t(key, language, params);
}

// ── Card ──────────────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const TH = useTheme();
  return (
    <View style={[{
      backgroundColor: TH.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: TH.border,
    }, style]}>
      {children}
    </View>
  );
}

// ── PrimaryButton ─────────────────────────────────────────────────
export function PrimaryButton({
  label, onPress, color, style, icon,
}: { label: string; onPress: () => void; color?: string; style?: ViewStyle; icon?: React.ReactNode }) {
  const TH = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[{
        backgroundColor: color ?? TH.primary,
        borderRadius: 12, padding: 15,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
      }, style]}
    >
      {icon}
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON() }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── OutlineButton ─────────────────────────────────────────────────
export function OutlineButton({
  label, onPress, color, style,
}: { label: string; onPress: () => void; color?: string; style?: ViewStyle }) {
  const TH = useTheme();
  const c = color ?? TH.primary;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[{
        borderWidth: 1.5, borderColor: c,
        borderRadius: 12, padding: 14,
        alignItems: 'center',
      }, style]}
    >
      <Text style={{ color: c, fontWeight: '600', fontSize: FONT_BUTTON() }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Toggle ────────────────────────────────────────────────────────
export function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  const TH = useTheme();
  return (
    <TouchableOpacity onPress={onChange} activeOpacity={0.8}
      style={{
        width: 48, height: 28, borderRadius: 14,
        backgroundColor: on ? TH.primary : 'rgba(128,128,128,.3)',
        justifyContent: 'center',
        paddingHorizontal: 2,
      }}
    >
      <View style={{
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: '#fff',
        alignSelf: on ? 'flex-end' : 'flex-start',
      }} />
    </TouchableOpacity>
  );
}

// ── Checkbox ──────────────────────────────────────────────────────
export function Checkbox({ on, onChange, ...rest }: { on: boolean; onChange: () => void; accessibilityLabel?: string }) {
  const TH = useTheme();
  return (
    <TouchableOpacity onPress={onChange} activeOpacity={0.7}
      accessibilityLabel={rest.accessibilityLabel}
      style={{
        width: 22, height: 22, borderRadius: 6,
        borderWidth: 2,
        borderColor: on ? TH.primary : TH.border,
        backgroundColor: on ? TH.primary : 'transparent',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {on && <Check size={14} color="#fff" strokeWidth={3} />}
    </TouchableOpacity>
  );
}

// ── RowItem ───────────────────────────────────────────────────────
// Memoized: a stable settings/list row that re-renders frequently when
// parent screens (SettingsScreen) refresh, but whose props rarely change.
export const RowItem = React.memo(function RowItem({
  label, sub, icon, right, last, onPress,
}: {
  label: string; sub?: string; icon?: React.ReactNode;
  right?: React.ReactNode; last?: boolean;
  onPress?: () => void;
}) {
  const TH = useTheme();
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap onPress={onPress} activeOpacity={0.7}
      style={{
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: TH.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        {icon && (typeof icon === 'string' ? <Text style={{ fontSize: FONT_BACK() }}>{icon}</Text> : icon)}
        <View>
          <Text style={{ color: TH.text, fontSize: FONT_LABEL() }}>{label}</Text>
          {sub && <Text style={{ color: TH.sub, fontSize: FONT_SUB(), marginTop: 2 }}>{sub}</Text>}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {right}
      </View>
    </Wrap>
  );
});

// ── ScreenHeader ─────────────────────────────────────────────────
export function ScreenHeader({
  title, subtitle, right,
  onBack,
  compact,
}: {
  title: string; subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  compact?: boolean;
}) {
  const TH = useTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: compact ? 8 : 8,
      paddingBottom: 12,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {onBack && (
          <TouchableOpacity onPress={onBack}>
            <ChevronLeft size={20} color={TH.text} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={{ color: TH.text, fontWeight: '800', fontSize: FONT_STAT_CARD() }}>{title}</Text>
          {subtitle && <Text style={{ color: TH.sub, fontSize: FONT_SUB(), marginTop: 2 }}>{subtitle}</Text>}
        </View>
      </View>
      {right}
    </View>
  );
}

// ── ThemedInput ──────────────────────────────────────────────────
export function ThemedInput({
  value, onChangeText, placeholder, multiline, numberOfLines, keyboardType, secureTextEntry, maxLength, onBlur, style, autoCapitalize, accessibilityLabel,
}: {
  value: string; onChangeText: (t: string) => void;
  placeholder?: string; multiline?: boolean; numberOfLines?: number;
  keyboardType?: 'default' | 'numeric' | 'number-pad' | 'email-address'; secureTextEntry?: boolean;
  maxLength?: number; onBlur?: () => void; style?: TextStyle; autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  accessibilityLabel?: string;
}) {
  const TH = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={TH.sub}
      multiline={multiline}
      numberOfLines={numberOfLines}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      maxLength={maxLength}
      onBlur={onBlur}
      autoCapitalize={autoCapitalize}
      accessibilityLabel={accessibilityLabel ?? placeholder ?? 'Input'}
      style={[{
        backgroundColor: TH.card,
        borderWidth: 1, borderColor: TH.border,
        borderRadius: 10, padding: 12,
        color: TH.text, fontSize: FONT_LABEL(),
        textAlignVertical: multiline ? 'top' : 'center',
      }, style]}
    />
  );
}

// ── TagPill ───────────────────────────────────────────────────────
// ── PillSelector (generic tag/mood grid picker) ──────────────────
export function PillSelector<Item extends string>({
  options, selected, onChange, counts, color, textActiveColor, trailing,
}: {
  options: readonly Item[] | Item[];
  selected: readonly Item[];
  onChange: (item: Item) => void;
  counts?: Record<string, number>;
  color?: string;
  textActiveColor?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection:'row', flexWrap:'wrap', gap: 6, alignItems: 'center' }}>
      {options.map(item => {
        const freq = counts?.[item];
        return (
          <TagPill key={item}
            label={freq && freq > 0 ? `${item} ${freq}` : item as string}
            active={selected.includes(item)}
            onPress={() => onChange(item)}
            color={color}
            textActiveColor={textActiveColor}
          />
        );
      })}
      {trailing}
    </View>
  );
}

export const TagPill = React.memo(function TagPill({
  label, active, onPress, color, count, style, textStyle, textActiveColor,
}: { label: string; active: boolean; onPress: () => void; color?: string; count?: number; style?: ViewStyle; textStyle?: TextStyle; textActiveColor?: string }) {
  const TH = useTheme();
  const c = color ?? TH.primary;
  const activeText = textActiveColor ?? '#fff';
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={{
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1,
        borderColor: active ? c : TH.border,
        backgroundColor: active ? `${c}30` : 'transparent',
        marginRight: 6, marginBottom: 6,
        ...style,
      }}
    >
      <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
        <Text style={{ color: active ? activeText : TH.sub, fontSize: FONT_BODY(), ...textStyle }}>{label}</Text>
        {count !== undefined && count > 0 && (
          <View style={{ backgroundColor: active ? 'rgba(255,255,255,.3)' : `${c}20`, paddingHorizontal:5, paddingVertical:1, borderRadius:8 }}>
            <Text style={{ color: active ? activeText : c, fontSize: FONT_SMALL(), fontWeight:'600' }}>{count}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ── ProgressBar ──────────────────────────────────────────────────
export function ProgressBar({ pct, color, colors, height = 6 }: {
  pct: number; color?: string; colors?: readonly [string, string]; height?: number;
}) {
  const TH = useTheme();
  return (
    <View style={{ height, backgroundColor: TH.border, borderRadius: height/2, overflow:'hidden' }}>
      {colors ? (
        <View style={{ height, borderRadius: height/2, overflow:'hidden', width: `${Math.min(Math.max(pct,0),100)}%` }}>
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height, borderRadius: height/2 }}
          />
        </View>
      ) : (
        <View style={{
          height, borderRadius: height/2,
          backgroundColor: color ?? TH.primary,
          width: `${Math.min(Math.max(pct,0),100)}%`,
        }} />
      )}
    </View>
  );
}

// ── BigTimer ──────────────────────────────────────────────────────
export function BigTimer({ text, color }: { text: string; color: string }) {
  return (
    <Text style={{
      fontSize: FONT_HERO(), fontWeight: '800', color,
      fontVariant: ['tabular-nums'], textAlign: 'center',
      letterSpacing: -1,
    }}>
      {text}
    </Text>
  );
}
