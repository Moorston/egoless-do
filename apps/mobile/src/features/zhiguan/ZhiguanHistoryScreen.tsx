// ─── ZhiguanHistoryScreen 止观履历页 ────────────────────────────
// 履历卡（连续/最长/总时/次数）+ 月度热力图 + 历史列表
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { useT } from '../../components/UI';
import { useAppStore } from '../../store/useAppStore';
import type { ZhiguanSession } from '@egoless-do/core';
import { computeZhiguanStats } from '@egoless-do/core';

const COLORS = ['rgba(139, 115, 85, 0.15)', 'rgba(139, 115, 85, 0.35)', 'rgba(201, 169, 110, 0.55)', 'rgba(201, 169, 110, 0.75)', 'rgba(201, 169, 110, 1)'];

export default function ZhiguanHistoryScreen() {
  const T = useT();
  const sessions = useAppStore(s => s.sessions);
  const deleteSession = useAppStore(s => s.deleteSession);
  const [selRecord, setSelRecord] = useState<ZhiguanSession | null>(null);

  const stats = computeZhiguanStats(sessions);
  const today = new Date();
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = `${monthKey}-${String(today.getDate()).padStart(2, '0')}`;

  const handleDelete = useCallback((id: string) => {
    Alert.alert(T('zhiguanDeleteRecord'), T('zhiguanDeleteConfirm'), [
      { text: T('cancel') },
      { text: T('zhiguanDeleteRecord'), style: 'destructive', onPress: () => deleteSession(id) },
    ]);
  }, [T, deleteSession]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{T('zhiguanHistoryTitle')}</Text>
      </View>

      {/* 履历卡 */}
      <View style={styles.statsCard}>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>{T('days')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalMinutes}</Text>
            <Text style={styles.statLabel}>{T('zhiguanStatTotalMin').split(' ')[1] ?? 'min'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.longestMinutes}</Text>
            <Text style={styles.statLabel}>{T('zhiguanStatLongestMin').split(' ')[1] ?? 'min'}</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.currentStreakDays}</Text>
            <Text style={styles.statLabel}>{T('zhiguanStatStreak').split(' ')[1] ?? 'd'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.longestStreakDays}</Text>
            <Text style={styles.statLabel}>{T('zhiguanStatLongestStreak').split(' ')[1] ?? 'd'}</Text>
          </View>
        </View>
      </View>

      {/* 热力图 (本月) */}
      <HeatmapBlock sessions={sessions} year={today.getFullYear()} month={today.getMonth() + 1} T={T} />

      {/* 历史列表 */}
      {sessions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🪷</Text>
          <Text style={styles.emptyTitle}>{T('zhiguanEmptyHistoryTitle')}</Text>
          <Text style={styles.emptyDesc}>{T('zhiguanEmptyHistoryDesc')}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {sessions.filter(s => !s.deleted).slice(0, 50).map(s => (
            <Pressable key={s.id} style={styles.listItem} onPress={() => setSelRecord(s)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dateLabel}>{new Date(s.startTs).toLocaleDateString()}</Text>
                <Text style={styles.subLabel}>
                  {s.chosenMethod} · {s.status}
                </Text>
              </View>
              <Pressable onPress={() => handleDelete(s.id)} style={styles.delBtn}>
                <Text style={styles.delText}>✕</Text>
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function HeatmapBlock({ sessions, year, month, T }: { sessions: ZhiguanSession[]; year: number; month: number; T: Function }) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: Array<{ date: string; minutes: number }> = [];
  for (let d = 1; d <= daysInMonth; d += 1) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const ms = sessions
      .filter(s => !s.deleted && new Date(s.startTs).toISOString().slice(0, 10) === dateStr)
      .reduce((sum, s) => sum + Math.max(0, (s.endTs ?? Date.now()) - s.startTs), 0);
    cells.push({ date: dateStr, minutes: Math.floor(ms / 60000) });
  }

  return (
    <View style={styles.heatmap}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>{cells.map((c, i) => {
        const level = c.minutes === 0 ? 0 : c.minutes < 10 ? 1 : c.minutes < 30 ? 2 : c.minutes < 60 ? 3 : 4;
        return <View key={i} style={[styles.heatCell, { backgroundColor: COLORS[level] }]} />;
      })}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F2', padding: 16, gap: 12 },
  header: { paddingVertical: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#4A3F35' },
  statsCard: {
    backgroundColor: 'rgba(139, 115, 85, 0.1)',
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 28, fontWeight: '700', color: '#C9A96E' },
  statLabel: { fontSize: 11, color: '#8B7355', marginTop: 4 },
  heatmap: { backgroundColor: 'rgba(139, 115, 85, 0.1)', borderRadius: 16, padding: 14 },
  heatCell: { width: 8, height: 8, borderRadius: 2 },
  list: { gap: 8 },
  listItem: {
    backgroundColor: 'rgba(139, 115, 85, 0.1)',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: { fontSize: 14, fontWeight: '600', color: '#4A3F35' },
  subLabel: { fontSize: 12, color: '#8B7355', marginTop: 2 },
  delBtn: { padding: 6 },
  delText: { fontSize: 16, color: '#8B7355' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#4A3F35' },
  emptyDesc: { fontSize: 13, color: '#8B7355', textAlign: 'center', paddingHorizontal: 32 },
});
