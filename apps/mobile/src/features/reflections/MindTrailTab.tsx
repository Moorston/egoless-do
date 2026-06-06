import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import { FONT_BODY, FONT_SUB, FONT_SMALL, FONT_BUTTON, getTrailStats, getMoodIcon } from '@egoless-do/core';
import CreateThoughtTrailModal from './CreateThoughtTrailModal';

type TabKey = 'thought' | 'tag';

export default function MindTrailTab() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();
  const nav = useNavigation();

  const [activeTab, setActiveTab] = useState<TabKey>('thought');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const thoughtTrails = useMemo(() => 
    (store.thoughtTrails ?? []).filter(t => !t.deleted),
    [store.thoughtTrails]
  );

  const reflections = useMemo(() => 
    (store.reflections ?? []).filter(r => !r.deleted),
    [store.reflections]
  );

  const tagMap = useMemo(() => {
    const map = new Map<string, typeof reflections>();
    for (const r of reflections) {
      for (const tag of r.tags) {
        const existing = map.get(tag) ?? [];
        existing.push(r);
        map.set(tag, existing);
      }
    }
    return new Map([...map.entries()].sort((a, b) => b[1].length - a[1].length));
  }, [reflections]);

  const handleCreateTrail = useCallback((trailId: string) => {
    // Navigate to the new trail
    nav.navigate('ThoughtTrailDetail', { trailId });
  }, [nav]);

  const handleCreateFromTag = useCallback((tag: string) => {
    const tagReflections = tagMap.get(tag) ?? [];
    if (tagReflections.length === 0) return;

    const trailId = store.createThoughtTrail(
      `${tag}${T('thoughtTrailAutoName')}`,
      undefined,
      tagReflections.map(r => r.id)
    );
    nav.navigate('ThoughtTrailDetail', { trailId });
  }, [store, tagMap, nav]);

  const renderThoughtTrailTab = () => {
    return (
      <View style={styles.tabContent}>
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
      </View>
    );
  };

  const renderTagTrailTab = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={[styles.sectionTitle, { color: TH.text }]}>
          所有标签 ({tagMap.size})
        </Text>

        {[...tagMap.entries()].map(([tag, tagReflections]) => (
          <View
            key={tag}
            style={[styles.tagCard, { backgroundColor: TH.card, borderColor: TH.border }]}
          >
            <View style={styles.tagHeader}>
              <Text style={[styles.tagName, { color: TH.text }]}>{tag}</Text>
              <Text style={[styles.tagCount, { color: P }]}>{tagReflections.length}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleCreateFromTag(tag)}
              style={[styles.createTrailButton, { borderColor: P }]}
            >
              <Text style={[styles.createTrailButtonText, { color: P }]}>
                {T('thoughtTrailCreateFromTag')}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Tab Switcher */}
      <View style={styles.tabSwitcher}>
        {([
          { key: 'thought' as TabKey, label: T('thoughtTrail') },
          { key: 'tag' as TabKey, label: T('tagTrail') },
        ]).map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[
              styles.tab,
              {
                backgroundColor: activeTab === tab.key ? `${P}20` : 'transparent',
                borderColor: activeTab === tab.key ? P : 'transparent',
              },
            ]}
          >
            <Text style={{
              color: activeTab === tab.key ? P : TH.sub,
              fontWeight: activeTab === tab.key ? '600' : '400',
              fontSize: FONT_SMALL,
            }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'thought' ? renderThoughtTrailTab() : renderTagTrailTab()}

      {/* Create Modal */}
      <CreateThoughtTrailModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateTrail}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabSwitcher: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  tabContent: {
    flex: 1,
  },
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
  tagCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  tagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagName: {
    fontSize: FONT_BODY,
    fontWeight: '600',
  },
  tagCount: {
    fontSize: FONT_BODY,
    fontWeight: '700',
  },
  createTrailButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  createTrailButtonText: {
    fontSize: FONT_SMALL,
    fontWeight: '600',
  },
});
