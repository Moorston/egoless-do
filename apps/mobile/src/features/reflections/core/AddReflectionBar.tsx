import { FONT_SMALL, FONT_BODY } from '@egoless-do/core';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { useTheme, useT } from '../../../components/UI';

interface AddReflectionBarProps {
  onWriteReflection: () => void;
  onSelectExisting: () => void;
  onWriteNote: () => void;
}

export function AddReflectionBar({
  onWriteReflection,
  onSelectExisting,
  onWriteNote,
}: AddReflectionBarProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  return (
    <View style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}>
      <TouchableOpacity
        style={[styles.button, { borderColor: TH.border }]}
        onPress={onWriteReflection}
      >
        <Text style={[styles.buttonIcon]}>📝</Text>
        <Text style={[styles.buttonText, { color: TH.text }]}>
          {T('thoughtTrailAddReflection')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { borderColor: TH.border }]}
        onPress={onSelectExisting}
      >
        <Text style={[styles.buttonIcon]}>📋</Text>
        <Text style={[styles.buttonText, { color: TH.text }]}>
          {T('thoughtTrailSelectReflection')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { borderColor: P, backgroundColor: `${P}15` }]}
        onPress={onWriteNote}
      >
        <Text style={[styles.buttonIcon]}>🤔</Text>
        <Text style={[styles.buttonText, { color: P, fontWeight: '600' }]}>
          {T('trailNoteWrite')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  buttonIcon: {
    fontSize: 18,
  },
  buttonText: {
    fontSize: FONT_SMALL(),
    textAlign: 'center',
  },
});
