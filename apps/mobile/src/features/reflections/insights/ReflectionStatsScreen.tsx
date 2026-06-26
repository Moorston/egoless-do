import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Share2, TrendingUp, Grid3x3, Heart, Tag, ListChecks } from 'lucide-react-native';
import { useAppStore } from '../../../store/useAppStore';
import { useTheme, useT } from '../../../components/UI';
import CalendarGrid from '../../../components/charts/CalendarGrid';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_STAT_CARD, FONT_BUTTON, COLORS, dateStr } from '@egoless-do/core';

type TabKey = 'tags' | 'mood' | 'linkedTask' | 'trend' | 'heatmap';

export default function ReflectionStatsScreen() {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const store = useAppStore();
  const nav = useNavigation();

  const [activeTab, setActiveTab] = useState<TabKey>('tags');

  // Stats calculations
  const stats = useMemo(() => {
    const reflections = (store.reflections ?? []).filter((r) => !r.deleted);
    const totalCount = reflections.length;

    // Streak days
    const dates = [
      ...new Set(
        reflections.map((r) =>
          dateStr(new Date(r.timestamp ?? 0))
        )
      ),
    ].sort().reverse();

    let streakDays = 0;
    let current = new Date(); // eslint-disable-line prefer-const
    for (const d of dates) {
      const expected = dateStr(current);
      if (d === expected) {
        streakDays++;
        current.setDate(current.getDate() - 1);
      } else {
        break;
      }
    }

    // This week
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const thisWeek = reflections.filter(
      (r) => new Date(r.timestamp ?? 0) >= weekStart
    ).length;

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = reflections.filter(
      (r) => new Date(r.timestamp ?? 0) >= monthStart
    ).length;

    return { totalCount, streakDays, thisWeek, thisMonth };
  }, [store.reflections]);

  // Trend data (last 30 days)
  const trendData = useMemo(() => {
    const reflections = (store.reflections ?? []).filter((r) => !r.deleted);
    const today = new Date();
    const data: { date: string; count: number }[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = dateStr(d);
      const count = reflections.filter(
        (r) =>
          dateStr(new Date(r.timestamp ?? 0)) === ds
      ).length;
      data.push({ date: ds, count });
    }

    return data;
  }, [store.reflections]);

  // Prepare history data for CalendarGrid
  const calendarHistory = useMemo(() => {
    const reflections = (store.reflections ?? []).filter((r) => !r.deleted);
    const dateMap = new Map<string, number>();
    reflections.forEach((r) => {
      const ds = dateStr(new Date(r.timestamp ?? 0));
      dateMap.set(ds, (dateMap.get(ds) ?? 0) + 1);
    });
    return Array.from(dateMap.entries()).map(([date, count]) => ({ date, done: count > 0 }));
  }, [store.reflections]);

  // Mood stats
  const moodStats = useMemo(() => {
    const reflections = (store.reflections ?? []).filter((r) => !r.deleted);
    const counts: Record<string, number> = {};
    reflections.forEach((r) => {
      if (r.mood) counts[r.mood] = (counts[r.mood] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [store.reflections]);

  // Tag frequency
  const tagFrequency = useMemo(() => {
    const reflections = (store.reflections ?? []).filter((r) => !r.deleted);
    const counts: Record<string, number> = {};
    reflections.forEach((r) =>
      (r.tags ?? []).forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      })
    );
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
  }, [store.reflections]);

  // Linked task stats
  const linkedTaskStats = useMemo(() => {
    const reflections = (store.reflections ?? []).filter((r) => !r.deleted);
    const planItems = (store.planItems ?? []).filter((i) => !i.deleted);
    const linked = reflections.filter((r) => r.linkedPlanItemId);
    const totalCount = reflections.length;
    const linkedCount = linked.length;
    const rate = totalCount > 0 ? Math.round((linkedCount / totalCount) * 100) : 0;

    // Group by plan item
    const groupMap = new Map<string, number>();
    linked.forEach((r) => {
      const id = r.linkedPlanItemId!;
      groupMap.set(id, (groupMap.get(id) ?? 0) + 1);
    });

    const groups = Array.from(groupMap.entries())
      .map(([itemId, count]) => {
        const item = planItems.find((i) => i.id === itemId);
        return { name: item?.name ?? '已删除任务', count };
      })
      .sort((a, b) => b.count - a.count);

    return { linkedCount, rate, groups };
  }, [store.reflections, store.planItems]);

  const tabs: { key: TabKey; label: string; Icon: any }[] = [
    { key: 'tags', label: '标签', Icon: Tag },
    { key: 'mood', label: '心情', Icon: Heart },
    { key: 'linkedTask', label: '关联任务', Icon: ListChecks },
    { key: 'trend', label: '趋势', Icon: TrendingUp },
    { key: 'heatmap', label: '热力图', Icon: Grid3x3 },
  ];

  const handleShare = async () => {
    try {
      await Share.share({
        message: `我的感念统计：共 ${stats.totalCount} 条感念，连续写作 ${stats.streakDays} 天！`,
      });
    } catch {}
  };

  const renderTrendTab = () => {
    const maxCount = Math.max(...trendData.map((d) => d.count), 1);

    return (
      <View style={styles.tabContent}>
        <Text style={[styles.sectionTitle, { color: TH.sub }]}>
          近 30 天写作频率
        </Text>
        <View style={styles.chartContainer}>
          {trendData.map((item, idx) => {
            const height = (item.count / maxCount) * 120 + 4;
            return (
              <View key={idx} style={styles.barWrapper}>
                {item.count > 0 && (
                  <Text style={[styles.barValue, { color: P }]}>
                    {item.count}
                  </Text>
                )}
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: item.count > 0 ? P : TH.border,
                      opacity: 0.5 + (item.count / maxCount) * 0.5,
                    },
                  ]}
                />
                <Text style={[styles.barLabel, { color: TH.sub }]}>
                  {idx % 5 === 0 ? item.date.slice(5) : ''}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderHeatmapTab = () => {
    return (
      <View style={styles.tabContent}>
        <View style={[styles.calendarContainer, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <CalendarGrid
            history={calendarHistory}
            primaryColor={P}
            textColor={TH.text}
            subColor={TH.sub}
            borderColor={TH.border}
          />
        </View>
      </View>
    );
  };

  const renderMoodTab = () => {
    const maxCount = moodStats[0]?.[1] ?? 1;

    return (
      <View style={styles.tabContent}>
        <Text style={[styles.sectionTitle, { color: TH.sub }]}>
          心情分布
        </Text>
        {moodStats.length === 0 ? (
          <Text style={[styles.emptyText, { color: TH.sub }]}>
            暂无心情数据
          </Text>
        ) : (
          <View style={styles.moodList}>
            {moodStats.map(([mood, count]) => {
              const pct = (count / maxCount) * 100;
              const moodIcon =
                mood === '开心'
                  ? '😊'
                  : mood === '平静'
                  ? '🌿'
                  : mood === '焦虑'
                  ? '😰'
                  : mood === '难过'
                  ? '😢'
                  : mood === '兴奋'
                  ? '🎉'
                  : mood === '感恩'
                  ? '🙏'
                  : '💭';

              return (
                <View key={mood} style={styles.moodItem}>
                  <Text style={styles.moodIcon}>{moodIcon}</Text>
                  <Text style={[styles.moodName, { color: TH.text }]}>
                    {mood}
                  </Text>
                  <View style={styles.moodBarContainer}>
                    <View
                      style={[
                        styles.moodBar,
                        { width: `${pct}%`, backgroundColor: P },
                      ]}
                    />
                  </View>
                  <Text style={[styles.moodCount, { color: TH.sub }]}>
                    {count}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderTagsTab = () => {
    const maxCount = tagFrequency[0]?.[1] ?? 1;

    return (
      <View style={styles.tabContent}>
        <Text style={[styles.sectionTitle, { color: TH.sub }]}>
          标签使用频率
        </Text>
        {tagFrequency.length === 0 ? (
          <Text style={[styles.emptyText, { color: TH.sub }]}>
            暂无标签数据
          </Text>
        ) : (
          <>
            {/* Tag cloud */}
            <View style={styles.tagCloud}>
              {tagFrequency.map(([tag, count]) => {
                const scale = count / maxCount;
                const fontSize = 12 + scale * 12;
                return (
                  <Text
                    key={tag}
                    style={{
                      color: P,
                      fontSize,
                      fontWeight: scale > 0.6 ? '700' : '400',
                      marginRight: 8,
                      marginBottom: 4,
                    }}
                  >
                    {tag}
                  </Text>
                );
              })}
            </View>

            {/* Ranking */}
            <Text
              style={[
                styles.sectionTitle,
                { color: TH.sub, marginTop: 20 },
              ]}
            >
              排行榜
            </Text>
            {tagFrequency.slice(0, 10).map(([tag, count], idx) => {
              const pct = (count / maxCount) * 100;
              return (
                <View key={tag} style={styles.rankingItem}>
                  <Text
                    style={[
                      styles.rankingIndex,
                      { color: idx < 3 ? P : TH.sub },
                    ]}
                  >
                    {idx + 1}
                  </Text>
                  <Text style={[styles.rankingTag, { color: TH.text }]}>
                    {tag}
                  </Text>
                  <View style={styles.rankingBarContainer}>
                    <View
                      style={[
                        styles.rankingBar,
                        { width: `${pct}%`, backgroundColor: P },
                      ]}
                    />
                  </View>
                  <Text style={[styles.rankingCount, { color: TH.sub }]}>
                    {count}
                  </Text>
                </View>
              );
            })}
          </>
        )}
      </View>
    );
  };

  const renderLinkedTaskTab = () => {
    const { linkedCount, rate, groups } = linkedTaskStats;
    const maxCount = groups[0]?.count ?? 1;

    return (
      <View style={styles.tabContent}>
        {/* Overview */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <View style={[styles.overviewCard, { flex: 1, backgroundColor: TH.card, borderColor: TH.border }]}>
            <Text style={[styles.overviewValue, { color: P }]}>{linkedCount}</Text>
            <Text style={[styles.overviewLabel, { color: TH.sub }]}>关联感念</Text>
          </View>
          <View style={[styles.overviewCard, { flex: 1, backgroundColor: TH.card, borderColor: TH.border }]}>
            <Text style={[styles.overviewValue, { color: P }]}>{rate}%</Text>
            <Text style={[styles.overviewLabel, { color: TH.sub }]}>关联率</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: TH.sub }]}>按任务分组</Text>
        {groups.length === 0 ? (
          <Text style={[styles.emptyText, { color: TH.sub }]}>暂无关联任务数据</Text>
        ) : (
          <View style={styles.moodList}>
            {groups.map((g, idx) => {
              const pct = (g.count / maxCount) * 100;
              return (
                <View key={idx} style={styles.moodItem}>
                  <Text style={[styles.rankingIndex, { color: idx < 3 ? P : TH.sub }]}>{idx + 1}</Text>
                  <Text style={[styles.rankingTag, { color: TH.text }]} numberOfLines={1}>{g.name}</Text>
                  <View style={styles.rankingBarContainer}>
                    <View style={[styles.rankingBar, { width: `${pct}%`, backgroundColor: P }]} />
                  </View>
                  <Text style={[styles.rankingCount, { color: TH.sub }]}>{g.count}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header with back button */}
      <View style={[styles.header, { paddingTop: 16 }]}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: TH.text }]}>感念统计</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Overview cards - 2 columns */}
        <View style={styles.overviewContainer}>
          <View style={[styles.overviewCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
            <Text style={[styles.overviewValue, { color: P }]}>{stats.totalCount}</Text>
            <Text style={[styles.overviewLabel, { color: TH.sub }]}>总感念</Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
            <Text style={[styles.overviewValue, { color: P }]}>{stats.streakDays}</Text>
            <Text style={[styles.overviewLabel, { color: TH.sub }]}>连续天数</Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
            <Text style={[styles.overviewValue, { color: P }]}>{stats.thisWeek}</Text>
            <Text style={[styles.overviewLabel, { color: TH.sub }]}>本周</Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
            <Text style={[styles.overviewValue, { color: P }]}>{stats.thisMonth}</Text>
            <Text style={[styles.overviewLabel, { color: TH.sub }]}>本月</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {tabs.map(({ key, label, Icon }) => {
            const isActive = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setActiveTab(key)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: isActive ? `${P}20` : 'transparent',
                    borderColor: isActive ? P : 'transparent',
                  },
                ]}
              >
                <Icon size={16} color={isActive ? P : TH.sub} />
                <Text
                  style={{
                    color: isActive ? P : TH.sub,
                    fontSize: FONT_SMALL,
                    fontWeight: isActive ? '600' : '400',
                  }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab content */}
        {activeTab === 'tags' && renderTagsTab()}
        {activeTab === 'mood' && renderMoodTab()}
        {activeTab === 'linkedTask' && renderLinkedTaskTab()}
        {activeTab === 'trend' && renderTrendTab()}
        {activeTab === 'heatmap' && renderHeatmapTab()}
      </ScrollView>

      {/* Share button */}
      <TouchableOpacity
        onPress={handleShare}
        style={[styles.shareButton, { backgroundColor: P }]}
      >
        <Share2 size={18} color="#fff" />
        <Text style={styles.shareButtonText}>分享统计</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  overviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 16,
  },
  overviewCard: {
    width: '47%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  overviewValue: {
    fontSize: FONT_STAT_CARD,
    fontWeight: '800',
  },
  overviewLabel: {
    fontSize: FONT_SMALL,
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabContent: {
    paddingHorizontal: 16,
  },
  calendarContainer: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: FONT_SUB,
    fontWeight: '600',
    marginBottom: 12,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
    paddingHorizontal: 4,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  bar: {
    width: 16,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 9,
    marginTop: 4,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  legendText: {
    fontSize: 10,
  },
  moodList: {
    gap: 12,
  },
  moodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  moodIcon: {
    fontSize: 20,
    width: 28,
  },
  moodName: {
    fontSize: FONT_BODY,
    width: 56,
  },
  moodBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  moodBar: {
    height: '100%',
    borderRadius: 4,
  },
  moodCount: {
    fontSize: FONT_SMALL,
    width: 30,
    textAlign: 'right',
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    padding: 32,
    fontSize: FONT_BODY,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  rankingIndex: {
    fontSize: FONT_BODY,
    fontWeight: '700',
    width: 24,
    textAlign: 'center',
  },
  rankingTag: {
    fontSize: FONT_BODY,
    width: 80,
  },
  rankingBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  rankingBar: {
    height: '100%',
    borderRadius: 4,
  },
  rankingCount: {
    fontSize: FONT_SMALL,
    width: 30,
    textAlign: 'right',
  },
  shareButton: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: FONT_BUTTON,
    fontWeight: '600',
  },
});
