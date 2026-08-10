import {FONT_BODY, FONT_SMALL, FONT_HERO} from '@egoless-do/core';
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

import {useTheme, useT} from './UI';

interface Props {
  icon?: string;
  title?: string;
  message: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export default function EmptyState({
  icon = '📭',
  title,
  message,
  action,
  compact = false,
}: Props) {
  const TH = useTheme();

  return (
    <View style={[
      styles.container,
      compact && styles.compact,
      { backgroundColor: TH.card, borderColor: TH.border }
    ]}>
      <Text style={styles.icon}>{icon}</Text>
      {title && (
        <Text style={[styles.title, { color: TH.text }]}>{title}</Text>
      )}
      <Text style={[styles.message, { color: TH.sub }]}>{message}</Text>
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginVertical: 12,
  },
  compact: {
    padding: 20,
    marginVertical: 8,
  },
  icon: {
    fontSize: FONT_HERO(),
    marginBottom: 12,
  },
  title: {
    fontSize: FONT_BODY(),
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: FONT_SMALL(),
    textAlign: 'center',
    lineHeight: 20,
  },
  action: {
    marginTop: 16,
  },
});
