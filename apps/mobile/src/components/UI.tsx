// ─── Shared UI primitives ─────────────────────────────────────────
import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, ViewStyle, TextStyle,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { THEMES, COLORS, t, FONT_BUTTON, FONT_BACK, FONT_LABEL, FONT_SUB, FONT_STAT_CARD, FONT_BODY, FONT_HERO } from '@egoless-do/core';
import { ChevronLeft } from 'lucide-react-native';

// ── useTheme ──────────────────────────────────────────────────────
export function useTheme() {
  const theme = useAppStore(s => s.theme);
  return THEMES[theme];
}

// ── useT ──────────────────────────────────────────────────────────
export function useT() {
  const language = useAppStore(s => s.language);
  return (key: string) => t(key, language);
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
  label, onPress, color, style,
}: { label: string; onPress: () => void; color?: string; style?: ViewStyle }) {
  const TH = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[{
        backgroundColor: color ?? TH.primary,
        borderRadius: 12, padding: 15,
        alignItems: 'center',
      }, style]}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON }}>{label}</Text>
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
      <Text style={{ color: c, fontWeight: '600', fontSize: FONT_BUTTON }}>{label}</Text>
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

// ── RowItem ───────────────────────────────────────────────────────
export function RowItem({
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
        {icon && (typeof icon === 'string' ? <Text style={{ fontSize: FONT_BACK }}>{icon}</Text> : icon)}
        <View>
          <Text style={{ color: TH.text, fontSize: FONT_LABEL }}>{label}</Text>
          {sub && <Text style={{ color: TH.sub, fontSize: FONT_SUB, marginTop: 2 }}>{sub}</Text>}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {right}
      </View>
    </Wrap>
  );
}

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
          <Text style={{ color: TH.text, fontWeight: '800', fontSize: FONT_STAT_CARD }}>{title}</Text>
          {subtitle && <Text style={{ color: TH.sub, fontSize: FONT_SUB, marginTop: 2 }}>{subtitle}</Text>}
        </View>
      </View>
      {right}
    </View>
  );
}

// ── ThemedInput ──────────────────────────────────────────────────
export function ThemedInput({
  value, onChangeText, placeholder, multiline, numberOfLines, keyboardType, secureTextEntry, maxLength, onBlur, style,
}: {
  value: string; onChangeText: (t: string) => void;
  placeholder?: string; multiline?: boolean; numberOfLines?: number;
  keyboardType?: 'default' | 'numeric' | 'number-pad'; secureTextEntry?: boolean;
  maxLength?: number; onBlur?: () => void; style?: TextStyle;
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
      style={[{
        backgroundColor: TH.card,
        borderWidth: 1, borderColor: TH.border,
        borderRadius: 10, padding: 12,
        color: TH.text, fontSize: FONT_LABEL,
        textAlignVertical: multiline ? 'top' : 'center',
      }, style]}
    />
  );
}

// ── TagPill ───────────────────────────────────────────────────────
export function TagPill({
  label, active, onPress, color, style, textStyle,
}: { label: string; active: boolean; onPress: () => void; color?: string; style?: ViewStyle; textStyle?: TextStyle }) {
  const TH = useTheme();
  const c = color ?? TH.primary;
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
      <Text style={{ color: active ? '#fff' : TH.sub, fontSize: FONT_BODY, ...textStyle }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── ProgressBar ──────────────────────────────────────────────────
export function ProgressBar({ pct, color, height = 6 }: {
  pct: number; color: string; height?: number;
}) {
  const TH = useTheme();
  return (
    <View style={{ height, backgroundColor: TH.border, borderRadius: height/2, overflow:'hidden' }}>
      <View style={{
        height, borderRadius: height/2,
        backgroundColor: color,
        width: `${Math.min(Math.max(pct,0),100)}%`,
      }} />
    </View>
  );
}

// ── BigTimer ──────────────────────────────────────────────────────
export function BigTimer({ text, color }: { text: string; color: string }) {
  return (
    <Text style={{
      fontSize: FONT_HERO, fontWeight: '800', color,
      fontVariant: ['tabular-nums'], textAlign: 'center',
      letterSpacing: -1,
    }}>
      {text}
    </Text>
  );
}
