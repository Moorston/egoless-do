import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet, Animated } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTheme, useT } from '../../components/UI';
import { FONT_SMALL } from '@egoless-do/core';

interface AddReflectionFABProps {
  onWriteReflection: () => void;
  onSelectExisting: () => void;
  onWriteNote: () => void;
}

export function AddReflectionFAB({
  onWriteReflection,
  onSelectExisting,
  onWriteNote,
}: AddReflectionFABProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  const handleAction = useCallback((action: () => void) => {
    setExpanded(false);
    action();
  }, []);

  return (
    <>
      {/* Backdrop */}
      {expanded && (
        <TouchableWithoutFeedback onPress={() => setExpanded(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
      )}

      {/* Menu items */}
      {expanded && (
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: TH.cardSolid, borderColor: TH.border }]}
            onPress={() => handleAction(onWriteReflection)}
          >
            <Text style={styles.menuIcon}>📝</Text>
            <Text style={[styles.menuText, { color: TH.text }]}>
              {T('thoughtTrailAddReflection')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: TH.cardSolid, borderColor: TH.border }]}
            onPress={() => handleAction(onSelectExisting)}
          >
            <Text style={styles.menuIcon}>📋</Text>
            <Text style={[styles.menuText, { color: TH.text }]}>
              {T('thoughtTrailSelectReflection')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: TH.cardSolid, borderColor: TH.border }]}
            onPress={() => handleAction(onWriteNote)}
          >
            <Text style={styles.menuIcon}>🤔</Text>
            <Text style={[styles.menuText, { color: P, fontWeight: '600' }]}>
              {T('trailNoteWrite')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: P }]}
        onPress={handleToggle}
        activeOpacity={0.8}
      >
        <Plus size={28} color="#fff" style={{
          transform: [{ rotate: expanded ? '45deg' : '0deg' }],
        }} />
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 99,
  },
  menuContainer: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    zIndex: 100,
    gap: 10,
    alignItems: 'flex-end',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuText: {
    fontSize: FONT_SMALL,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 101,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
