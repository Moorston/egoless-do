import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Brain, TrendingUp, Calendar, Lightbulb } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_TINY } from '@egoless-do/core';
import { getMoodIcon } from '@egoless-do/core';

const MOOD_EMOJI: Record<string, string> = {
  '开心': '😊',
  '平静': '🌿',
  '焦虑': '😰',
  '难过': '😢',
  '兴奋': '🎉',
  '感恩': '🙏',
};

export default function InsightScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();
  const nav = useNavigation();

  const reflections = useMemo(() => 
    (store.reflections ?? []).filter(r => !r.deleted),
    [store.reflections]
  );

  const thoughtTrails = useMemo(() => 
    (store.thoughtTrails ?? []).filter(t => !t.deleted),
    [store.thoughtTrails]
  );

  const moodStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of reflections) {
      if (r.mood) {
        counts[r.mood] = (counts[r.mood] ?? 0) + 1;
      }
    }
    const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
    return Object.entries(counts)
      .map(([mood, count]) => ({ mood, count, percent: total > 0 ? Math.round(count / total * 100) : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [reflections]);

  const tagStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of reflections) {
      for (const tag of (r.tags ?? [])) {
        counts[tag] = (counts[tag] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [reflections]);

  const recentTrails = useMemo(() => 
    [...thoughtTrails]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 3),
    [thoughtTrails]
  );

  const stats = useMemo(() => ({
    totalReflections: reflections.length,
    totalTrails: thoughtTrails.length,
    thisWeekReflections: reflections.filter(r => {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return r.timestamp > weekAgo;
    }).length,
  }), [reflections, thoughtTrails]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: TH.text }]}>洞察</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Stats */}
        <View style={[styles.statsContainer, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: P }]}>{stats.totalReflections}</Text>
              <Text style={[styles.statLabel, { color: TH.sub }]}>总感念</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: P }]}>{stats.totalTrails}</Text>
              <Text style={[styles.statLabel, { color: TH.sub }]}>脉络</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: P }]}>{stats.thisWeekReflections}</Text>
              <Text style={[styles.statLabel, { color: TH.sub }]}>本周</Text>
            </View>
          </View>
        </View>

        {/* Mood Distribution */}
        {moodStats.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Calendar size={18} color={P} />
              <Text style={[styles.sectionTitle, { color: TH.text }]}>情绪分布</Text>
            </View>
            <View style={[styles.moodContainer, { backgroundColor: TH.card, borderColor: TH.border }]}>
              {moodStats.map(({ mood, count, percent }) => (
                <View key={mood} style={styles.moodItem}>
                  <Text style={styles.moodEmoji}>{MOOD_EMOJI[mood] || '💭'}</Text>
                  <View style={styles.moodInfo}>
                    <Text style={[styles.moodName, { color: TH.text }]}>{mood}</Text>
                    <View style={styles.moodBarBg}>
                      <View style={[styles.moodBar, { width: `${percent}%`, backgroundColor: P }]} />
                    </View>
                  </View>
                  <Text style={[styles.moodPercent, { color: TH.sub }]}>{percent}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top Tags */}
        {tagStats.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={18} color={P} />
              <Text style={[styles.sectionTitle, { color: TH.text }]}>热门标签</Text>
            </View>
            <View style={[styles.tagsContainer, { backgroundColor: TH.card, borderColor: TH.border }]}>
              {tagStats.map(({ tag, count }) => (
                <View key={tag} style={[styles.tagBadge, { borderColor: TH.border }]}>
                  <Text style={[styles.tagName, { color: TH.text }]}>{tag}</Text>
                  <Text style={[styles.tagCount, { color: P }]}>{count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Trails */}
        {recentTrails.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Brain size={18} color={P} />
              <Text style={[styles.sectionTitle, { color: TH.text }]}>最近脉络</Text>
            </View>
            {recentTrails.map(trail => (
              <TouchableOpacity
                key={trail.id}
                onPress={() => (nav as any).navigate('ThoughtTrailDetail', { trailId: trail.id })}
                style={[styles.trailCard, { backgroundColor: TH.card, borderColor: TH.border }]}
              >
                <Text style={[styles.trailName, { color: TH.text }]}>{trail.name}</Text>
                <Text style={[styles.trailInfo, { color: TH.sub }]}>
                  {(trail.reflectionIds ?? []).length} 条感念 · {new Date(trail.updatedAt).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State */}
        {reflections.length === 0 && (
          <View style={styles.emptyContainer}>
            <Lightbulb size={48} color={TH.sub} />
            <Text style={[styles.emptyTitle, { color: TH.text }]}>开始记录</Text>
            <Text style={[styles.emptyText, { color: TH.sub }]}>
              记录更多感念后，这里会显示你的思维模式分析
            </Text>
          </View>
        )}
      </ScrollView>
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
  statsContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FONT_SMALL,
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: FONT_BODY,
    fontWeight: '600',
  },
  moodContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  moodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  moodEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  moodInfo: {
    flex: 1,
  },
  moodName: {
    fontSize: FONT_SMALL,
    marginBottom: 4,
  },
  moodBarBg: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
  },
  moodBar: {
    height: 6,
    borderRadius: 3,
  },
  moodPercent: {
    fontSize: FONT_SMALL,
    marginLeft: 10,
    minWidth: 40,
    textAlign: 'right',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  tagName: {
    fontSize: FONT_SMALL,
  },
  tagCount: {
    fontSize: FONT_TINY,
    fontWeight: '600',
  },
  trailCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  trailName: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginBottom: 4,
  },
  trailInfo: {
    fontSize: FONT_SMALL,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: FONT_SMALL,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
