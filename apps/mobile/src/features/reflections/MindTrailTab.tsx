import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import { FONT_BODY, FONT_SMALL, getTrailStats, getMoodIcon } from '@egoless-do/core';
import CreateThoughtTrailModal from './CreateThoughtTrailModal';

export default function MindTrailTab() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();
  const nav = useNavigation();

  const [showCreateModal, setShowCreateModal] = useState(false);

  const thoughtTrails = useMemo(() =>
    (store.thoughtTrails ?? []).filter(t => !t.deleted),
    [store.thoughtTrails]
  );

  const reflections = useMemo(() =>
    (store.reflections ?? []).filter(r => !r.deleted),
    [store.reflections]
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: TH.text }]}>
          {T('thoughtTrail')} ({thoughtTrails.length})
        </Text>
        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          style={[styles.addButton, { backgroundColor: P }]}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.addButtonText}>{T('createThoughtTrail')}</Text>
        </TouchableOpacity>
      </View>

      {thoughtTrails.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: TH.sub }]}>{T('thoughtTrailEmpty')}</Text>
        </View>
      ) : (
        thoughtTrails.map(trail => {
          const stats = getTrailStats(trail, reflections);
          return (
            <TouchableOpacity
              key={trail.id}
              onPress={() => nav.navigate('ThoughtTrailDetail', { trailId: trail.id })}
              style={[styles.trailCard, { backgroundColor: TH.card, borderColor: TH.border }]}
            >
              <Text style={[styles.trailName, { color: TH.text }]}>{trail.name}</Text>
              <Text style={[styles.trailInfo, { color: TH.sub }]}>
                {stats.count} {T('thoughtTrailReflections')}
                {stats.dateRange ? ` · ${stats.dateRange.start} ~ ${stats.dateRange.end}` : ''}
              </Text>
              {stats.moodChanges.length > 0 && (
                <Text style={[styles.moodChanges, { color: TH.sub }]}>
                  心情变化: {stats.moodChanges.map(m => getMoodIcon(m)).join(' → ')}
                </Text>
              )}
            </TouchableOpacity>
          );
        })
      )}

      <CreateThoughtTrailModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(trailId) => nav.navigate('ThoughtTrailDetail', { trailId })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: FONT_SMALL,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: FONT_BODY,
  },
  trailCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  trailName: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginBottom: 4,
  },
  trailInfo: {
    fontSize: FONT_SMALL,
    marginBottom: 4,
  },
  moodChanges: {
    fontSize: FONT_SMALL,
  },
});
