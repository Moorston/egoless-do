// ─── Button Component ────────────────────────────────────────────
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: { backgroundColor: '#4F46E5' },
    text: { color: '#FFFFFF' },
  },
  secondary: {
    container: { backgroundColor: '#E5E7EB' },
    text: { color: '#1F2937' },
  },
  outline: {
    container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#D1D5DB' },
    text: { color: '#4F46E5' },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: '#4F46E5' },
  },
  danger: {
    container: { backgroundColor: '#EF4444' },
    text: { color: '#FFFFFF' },
  },
};

const sizeStyles: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
  sm: { container: { paddingVertical: 6, paddingHorizontal: 12 }, text: { fontSize: 14 } },
  md: { container: { paddingVertical: 10, paddingHorizontal: 16 }, text: { fontSize: 16 } },
  lg: { container: { paddingVertical: 14, paddingHorizontal: 20 }, text: { fontSize: 18 } },
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  accessibilityLabel,
}: ButtonProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.container,
        variantStyle.container,
        sizeStyle.container,
        disabled && styles.disabled,
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.text.color} size="small" />
      ) : (
        <Text style={[styles.text, variantStyle.text, sizeStyle.text, textStyle]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
