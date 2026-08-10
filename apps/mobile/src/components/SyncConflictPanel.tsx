import { FONT_BODY, FONT_SMALL, FONT_SUB } from '@egoless-do/core';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

import { useSyncStore } from '../store/syncStore';

import { useTheme } from './UI';

export function SyncConflictPanel() {
  const TH = useTheme();
  const { conflicts, removeConflict, clearConflicts } = useSyncStore();

  if (conflicts.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: TH.warning || '#f59e0b' }]}>
          同步冲突 ({String(conflicts.length)})
        </Text>
        <TouchableOpacity onPress={clearConflicts}>
          <Text style={[styles.clearBtn, { color: TH.sub }]}>全部清除</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.list} nestedScrollEnabled>
        {conflicts.map(c => (
          <View key={c.id} style={[styles.item, { borderBottomColor: TH.border }]}>
            <View style={styles.itemInfo}>
              <Text style={[styles.entity, { color: TH.text }]}>{c.entity}</Text>
              <Text style={[styles.entityId, { color: TH.sub }]} numberOfLines={1}>{c.entityId}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: TH.accent + '20' }]}
                onPress={() => removeConflict(c.id)}
              >
                <Text style={[styles.actionText, { color: TH.accent }]}>接受服务端</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
  },
  clearBtn: {
    fontSize: FONT_SUB(),
  },
  list: {
    maxHeight: 200,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  entity: {
    fontSize: FONT_SUB(),
    fontWeight: '500',
  },
  entityId: {
    fontSize: FONT_SMALL(),
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionText: {
    fontSize: FONT_SMALL(),
    fontWeight: '500',
  },
});
