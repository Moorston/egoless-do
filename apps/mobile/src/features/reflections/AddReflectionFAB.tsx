import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const menuAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  const animate = useCallback((toExpanded: boolean) => {
    Animated.parallel([
      Animated.spring(rotateAnim, {
        toValue: toExpanded ? 1 : 0,
        useNativeDriver: true,
        friction: 8,
        tension: 80,
      }),
      ...menuAnims.map((anim, i) =>
        Animated.spring(anim, {
          toValue: toExpanded ? 1 : 0,
          useNativeDriver: true,
          friction: 8,
          tension: 80,
          delay: toExpanded ? i * 40 : 0,
        })
      ),
    ]).start();
  }, [rotateAnim, menuAnims]);

  const handleToggle = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    animate(next);
  }, [expanded, animate]);

  const handleAction = useCallback((action: () => void) => {
    setExpanded(false);
    animate(false);
    action();
  }, [animate]);

  useEffect(() => {
    if (!expanded) animate(false);
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

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
          {[
            { icon: '📝', label: T('thoughtTrailAddReflection'), action: onWriteReflection },
            { icon: '📋', label: T('thoughtTrailSelectReflection'), action: onSelectExisting },
            { icon: '🤔', label: T('trailNoteWrite'), action: onWriteNote, highlight: true },
          ].map((item, i) => (
            <Animated.View
              key={i}
              style={{
                opacity: menuAnims[i],
                transform: [{
                  translateY: menuAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                }],
              }}
            >
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: TH.cardSolid, borderColor: TH.border }]}
                onPress={() => handleAction(item.action)}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={[styles.menuText, item.highlight ? { color: P, fontWeight: '600' } : { color: TH.text }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: P }]}
        onPress={handleToggle}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Plus size={28} color="#fff" />
        </Animated.View>
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
