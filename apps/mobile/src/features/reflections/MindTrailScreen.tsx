import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Plus, Brain, Sparkles } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_BUTTON, FONT_TINY } from '@egoless-do/core';
import { getTrailStats, getMoodIcon } from '@egoless-do/core';
import type { ThoughtTrail, MindReflection } from '@egoless-do/core';
import CreateThoughtTrailModal from './CreateThoughtTrailModal';

interface AutoTrailSuggestion {
  tag: string;
  reflections: MindReflection[];
  moodChanges: string[];
}

export default function MindTrailScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();
  const nav = useNavigation();

  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateTrail = useCallback((trailId: string) => {
    (nav as any).navigate('ThoughtTrailDetail', { trailId });
  }, [nav]);

  const thoughtTrails = useMemo(() => 
    (store.thoughtTrails ?? []).filter(t => !t.deleted),
    [store.thoughtTrails]
  );

  const manualTrails = useMemo(() => 
    thoughtTrails.filter(t => t.source === 'manual' || !t.source),
    [thoughtTrails]
  );

  const autoTrails = useMemo(() => 
    thoughtTrails.filter(t => t.source === 'auto' || t.source === 'recommended'),
    [thoughtTrails]
  );

  const reflections = useMemo(() => 
    (store.reflections ?? []).filter(r => !r.deleted),
    [store.reflections]
  );

  const autoSuggestions = useMemo((): AutoTrailSuggestion[] => {
    const tagMap = new Map<string, MindReflection[]>();
    for (const r of reflections) {
      for (const tag of r.tags) {
        const existing = tagMap.get(tag) ?? [];
        existing.push(r);
        tagMap.set(tag, existing);
      }
    }

    const suggestions: AutoTrailSuggestion[] = [];
    for (const [tag, tagReflections] of tagMap.entries()) {
      if (tagReflections.length >= 2) {
        const sorted = [...tagReflections].sort((a, b) => a.timestamp - b.timestamp);
        const moodChanges: string[] = [];
        let lastMood = '';
        for (const r of sorted) {
          if (r.mood && r.mood !== lastMood) {
            moodChanges.push(r.mood);
            lastMood = r.mood;
          }
        }
        
        const existingTrail = thoughtTrails.find(t => 
          t.name.includes(tag) && t.reflectionIds.length === tagReflections.length
        );
        
        if (!existingTrail) {
          suggestions.push({ tag, reflections: sorted, moodChanges });
        }
      }
    }

    return suggestions.sort((a, b) => b.reflections.length - a.reflections.length).slice(0, 3);
  }, [reflections, thoughtTrails]);

  const handleCreateAutoTrail = useCallback((suggestion: AutoTrailSuggestion) => {
    const trailId = store.createThoughtTrail(
      `${suggestion.tag}的思维脉络`,
      undefined,
      suggestion.reflections.map(r => r.id),
      'auto'
    );
    (nav as any).navigate('ThoughtTrailDetail', { trailId });
  }, [store, nav]);

  const renderThoughtTrailTab = () => {
    return (
      <View style={styles.tabContent}>
        {/* Auto Suggestions */}
        {autoSuggestions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Sparkles size={16} color={P} />
                <Text style={[styles.sectionTitle, { color: TH.text }]}>
                  自动发现的脉络
                </Text>
              </View>
            </View>
            
            {autoSuggestions.map((suggestion, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleCreateAutoTrail(suggestion)}
                style={[styles.suggestionCard, { backgroundColor: TH.card, borderColor: TH.border }]}
              >
                <View style={styles.suggestionHeader}>
                  <Text style={[styles.suggestionTag, { color: P }]}>{suggestion.tag}</Text>
                  <Text style={[styles.suggestionCount, { color: TH.sub }]}>
                    {suggestion.reflections.length} 条感念
                  </Text>
                </View>
                {suggestion.moodChanges.length > 0 && (
                  <Text style={[styles.suggestionMood, { color: TH.sub }]}>
                    {suggestion.moodChanges.map(m => getMoodIcon(m)).join(' → ')}
                  </Text>
                )}
                <Text style={[styles.suggestionAction, { color: P }]}>创建脉络 →</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Existing Auto Trails */}
        {autoTrails.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: TH.text }]}>
                自动脉络 ({autoTrails.length})
              </Text>
            </View>
            {autoTrails.map(trail => {
              const stats = getTrailStats(trail, reflections);
              return (
                <TouchableOpacity
                  key={trail.id}
                  onPress={() => (nav as any).navigate('ThoughtTrailDetail', { trailId: trail.id })}
                  style={[styles.trailCard, { backgroundColor: TH.card, borderColor: TH.border }]}
                >
                  <View style={styles.trailHeader}>
                    <Brain size={16} color={P} />
                    <Text style={[styles.trailName, { color: TH.text }]}>{trail.name}</Text>
                  </View>
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
            })}
          </View>
        )}

        {/* Manual Trails */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: TH.text }]}>
              {T('thoughtTrail')} ({manualTrails.length})
            </Text>
            <TouchableOpacity
              onPress={() => setShowCreateModal(true)}
              style={[styles.addButton, { backgroundColor: P }]}
            >
              <Plus size={16} color="#fff" />
              <Text style={styles.addButtonText}>{T('createThoughtTrail')}</Text>
            </TouchableOpacity>
          </View>

          {manualTrails.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: TH.sub }]}>暂无手动创建的脉络</Text>
            </View>
          ) : (
            manualTrails.map(trail => {
              const stats = getTrailStats(trail, reflections);
              return (
                <TouchableOpacity
                  key={trail.id}
                  onPress={() => (nav as any).navigate('ThoughtTrailDetail', { trailId: trail.id })}
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
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: TH.text }]}>{T('mindTrail')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {renderThoughtTrailTab()}
      </ScrollView>

      {/* Create Modal */}
      <CreateThoughtTrailModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateTrail}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  tabContent: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: FONT_BODY,
  },
  suggestionCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  suggestionTag: {
    fontSize: FONT_BODY,
    fontWeight: '600',
  },
  suggestionCount: {
    fontSize: FONT_SMALL,
  },
  suggestionMood: {
    fontSize: FONT_SMALL,
    marginBottom: 6,
  },
  suggestionAction: {
    fontSize: FONT_SMALL,
    fontWeight: '500',
  },
  trailCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  trailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  trailName: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    flex: 1,
  },
  trailInfo: {
    fontSize: FONT_SMALL,
    marginBottom: 4,
  },
  moodChanges: {
    fontSize: FONT_SMALL,
  },
});
