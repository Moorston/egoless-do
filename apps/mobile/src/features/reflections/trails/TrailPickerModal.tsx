import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_BUTTON, getTrailsByReflection, getTrailStats } from '@egoless-do/core';
import { X, Check, Plus, Link } from 'lucide-react-native';
import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

import { useTheme, useT } from '../../../components/UI';
import { useAppStore, useShallowStore } from '../../../store/useAppStore';


import CreateThoughtTrailModal from './CreateThoughtTrailModal';

interface Props {
  visible: boolean;
  reflectionId: string;
  onClose: () => void;
  /** Override toggle behavior (e.g. for new reflections not yet saved). If provided, linked state comes from parent. */
  onToggle?: (trailId: string, linked: boolean) => void;
  /** External linked trail IDs (used with onToggle for new reflections) */
  linkedTrailIds?: Set<string>;
}

export default function TrailPickerModal({ visible, reflectionId, onClose, onToggle, linkedTrailIds: externalLinkedIds }: Props) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const { thoughtTrails: rawThoughtTrails, reflections: rawReflections, removeReflectionFromTrail, addReflectionToTrail } = useShallowStore(s => ({
    thoughtTrails: s.thoughtTrails,
    reflections: s.reflections,
    removeReflectionFromTrail: s.removeReflectionFromTrail,
    addReflectionToTrail: s.addReflectionToTrail,
  }));
  const [showCreate, setShowCreate] = useState(false);

  const trails = useMemo(() =>
    (rawThoughtTrails ?? []).filter(t => !t.deleted),
    [rawThoughtTrails]
  );

  const reflections = useMemo(() =>
    (rawReflections ?? []).filter(r => !r.deleted),
    [rawReflections]
  );

  const linkedTrailIds = useMemo(() => {
    if (externalLinkedIds) return externalLinkedIds;
    const linked = getTrailsByReflection(reflectionId, trails);
    return new Set(linked.map(t => t.id));
  }, [reflectionId, trails, externalLinkedIds]);

  const handleToggle = useCallback((trailId: string) => {
    const isLinked = linkedTrailIds.has(trailId);
    if (onToggle) {
      onToggle(trailId, !isLinked);
    } else {
      if (isLinked) {
        removeReflectionFromTrail(trailId, reflectionId);
      } else {
        addReflectionToTrail(trailId, reflectionId);
      }
    }
  }, [removeReflectionFromTrail, addReflectionToTrail, reflectionId, linkedTrailIds, onToggle]);

  const handleCreateSuccess = useCallback((trailId: string) => {
    if (onToggle) {
      onToggle(trailId, true);
    } else {
      addReflectionToTrail(trailId, reflectionId);
    }
    setShowCreate(false);
  }, [addReflectionToTrail, reflectionId, onToggle]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: TH.cardSolid }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: TH.text }]}>选择思维脉络</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={TH.sub} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list}>
            {trails.map(trail => {
              const isLinked = linkedTrailIds.has(trail.id);
              const stats = getTrailStats(trail, reflections);
              return (
                <TouchableOpacity
                  key={trail.id}
                  onPress={() => handleToggle(trail.id)}
                  style={[
                    styles.trailItem,
                    {
                      backgroundColor: isLinked ? `${P}15` : TH.card,
                      borderColor: isLinked ? P : TH.border,
                    },
                  ]}
                >
                  <View style={styles.trailInfo}>
                    <Text style={[styles.trailName, { color: TH.text }]}>{trail.name}</Text>
                    <Text style={[styles.trailCount, { color: TH.sub }]}>
                      {String(stats.count)} {T('thoughtTrailReflections')}
                    </Text>
                  </View>
                  {isLinked && <Check size={18} color={P} />}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={() => setShowCreate(true)}
              style={[styles.createButton, { borderColor: P }]}
            >
              <Plus size={16} color={P} />
              <Text style={[styles.createText, { color: P }]}>新建脉络</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      <CreateThoughtTrailModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        initialReflectionIds={reflectionId ? [reflectionId] : []}
        onSuccess={handleCreateSuccess}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: FONT_TITLE(),
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 20,
  },
  trailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  trailInfo: {
    flex: 1,
  },
  trailName: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
    marginBottom: 2,
  },
  trailCount: {
    fontSize: FONT_SMALL(),
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
    marginBottom: 8,
  },
  createText: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
  },
});
