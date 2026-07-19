import type { Theme } from '@egoless-do/core';
import { Undo2 } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';

interface Props {
  TH: Theme;
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

export default function SnackbarHost({ TH, visible, message, onUndo, onDismiss, durationMs = 5000 }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      timerRef.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onDismiss());
      }, durationMs);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, durationMs, onDismiss, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={[styles.snackbar, { backgroundColor: TH.text }]}>
        <Text style={[styles.message, { color: TH.bg }]}>{message}</Text>
        <TouchableOpacity onPress={onUndo} style={styles.undoBtn} accessibilityLabel="撤回">
          <Undo2 size={16} color={TH.bg} />
          <Text style={[styles.undoText, { color: TH.bg }]}>撤回</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  snackbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 12,
  },
  undoText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
