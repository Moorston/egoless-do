// ─── Input Component ─────────────────────────────────────────────
import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type TextInputProps,
} from 'react-native';
import { useTheme } from '../ThemeProvider';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  required?: boolean;
}

export function Input({
  label,
  error,
  containerStyle,
  inputStyle,
  labelStyle,
  required = false,
  value,
  onChangeText,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { theme } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.text }, labelStyle]}>
          {label}
          {required && <Text style={{ color: theme.colors.error }}> *</Text>}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[
          styles.input,
          { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text },
          isFocused && { borderColor: theme.colors.primary, backgroundColor: theme.colors.surface },
          error && { borderColor: theme.colors.error },
          inputStyle,
        ]}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholderTextColor={theme.colors.textSecondary}
        accessibilityLabel={label || props.placeholder || 'Input field'}
        {...props}
      />
      {error && <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});
