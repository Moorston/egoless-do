// ─── ZhiguanHistoryScreen 止观履历页 ────────────────────────────
// 履历卡 + 月度热力图 + 历史列表 + 详情卡片 + JSON 导出
import type {ZhiguanSession} from '@egoless-do/core';
import {
  computeZhiguanStats,
  FIVE_HINDRANCE_KEYS, FIVE_HINDRANCE_LABEL_KEYS,
  EIGHT_TACTILE_KEYS, EIGHT_TACTILE_LABEL_KEYS,
  SAM_STAGE_LABEL_KEYS,
  ZHIGUAN_METHOD_DEFS,
  dateStr as toLocalDateStr, FONT_SUB, FONT_TITLE, FONT_BACK, FONT_HERO, FONT_LABEL, FONT_SMALL, FONT_STAT_CARD, FONT_STAT_SECTION } from '@egoless-do/core';
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, Share, Modal } from 'react-native';

import { useT } from '../../components/UI';
import {useShallowStore} from '../../store/useAppStore';

const COLORS = ['rgba(139, 115, 85, 0.15)', 'rgba(139, 115, 85, 0.35)', 'rgba(201, 169, 110, 0.55)', 'rgba(201, 169, 110, 0.75)', 'rgba(201, 169, 110, 1)'];

export default function ZhiguanHistoryScreen() {
  const T = useT();
  const sessions = useShallowStore(s => s.sessions);
  const deleteSession = useShallowStore(s => s.deleteSession);
  const [selRecord, setSelRecord] = useState<ZhiguanSession | null>(null);

  const stats = computeZhiguanStats(sessions);
  const today = new Date();

  const handleDelete = useCallback((id: string) => {
    Alert.alert(T('zhiguanDeleteRecord'), T('zhiguanDeleteConfirm'), [
      { text: T('cancel') },
      { text: T('zhiguanDeleteRecord'), style: 'destructive', onPress: () => deleteSession(id) },
    ]);
  }, [T, deleteSession]);

  const handleExport = useCallback(() => {
    const data = sessions.filter(s => !s.deleted);
    const json = JSON.stringify(data, null, 2);
    Share.share({ message: json, title: 'zhiguan-export.json' }).catch(() => {});
  }, [sessions]);

  const getMethodLabel = (method?: string) => {
    const def = ZHIGUAN_METHOD_DEFS.find(d => d.key === method);
    return def ? T(def.labelKey) : (method ?? 'anapanasati');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{T('zhiguanHistoryTitle')}</Text>
        <Pressable onPress={handleExport} style={styles.exportBtn}>
          <Text style={styles.exportText}>{T('zhiguanExportJson')}</Text>
        </Pressable>
      </View>

      {/* 履历卡 */}
      <View style={styles.statsCard}>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>{T('zhiguanStatSessions').replace('{n}', '')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalMinutes}</Text>
            <Text style={styles.statLabel}>{T('zhiguanStatTotalMin').replace('{n}', '')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.longestMinutes}</Text>
            <Text style={styles.statLabel}>{T('zhiguanStatLongestMin').replace('{n}', '')}</Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.currentStreakDays}</Text>
            <Text style={styles.statLabel}>{T('zhiguanStatStreak').replace('{n}', '')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.longestStreakDays}</Text>
            <Text style={styles.statLabel}>{T('zhiguanStatLongestStreak').replace('{n}', '')}</Text>
          </View>
        </View>
      </View>

      {/* 热力图 (本月) */}
      <HeatmapBlock sessions={sessions} year={today.getFullYear()} month={today.getMonth() + 1} />

      {/* 历史列表 */}
      {/* TODO(perf): history list is capped at 50 (.slice(0, 50)) and is a direct child of the
          page ScrollView together with the stats card and heatmap, so it does not meet the
          above-50-item fixed-height threshold for a standalone FlashList. Keep as .map(). */}
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
                  {getMethodLabel(s.chosenMethod)} · {s.status} · {String(Math.round(((s.endTs ?? s.startTs) - s.startTs) / 60000))}min
                </Text>
              </View>
              <Pressable onPress={() => handleDelete(s.id)} style={styles.delBtn}>
                <Text style={styles.delText}>✕</Text>
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}

      {/* Detail Modal */}
      <Modal visible={!!selRecord} transparent animationType="slide" onRequestClose={() => setSelRecord(null)}>
        <Pressable style={styles.detailOverlay} onPress={() => setSelRecord(null)}>
          <Pressable style={styles.detailCard} onPress={e => e.stopPropagation()}>
            <View style={styles.handle} />
            {selRecord && (
              <ScrollView>
                <Text style={styles.detailTitle}>{T('zhiguanDetailTitle')}</Text>

                <DetailRow label={T('zhiguanDetailMethod')} value={getMethodLabel(selRecord.chosenMethod)} />
                <DetailRow label={T('zhiguanDetailDuration')} value={`${Math.round(((selRecord.endTs ?? selRecord.startTs) - selRecord.startTs) / 60000)} min`} />
                <DetailRow label={T('zhiguanDetailStatus')} value={selRecord.status} />
                <DetailRow label={T('zhiguanDetailDate')} value={new Date(selRecord.startTs).toLocaleString()} />

                {selRecord.sankalpa && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionLabel}>{T('zhiguanSankalpa')}</Text>
                    <Text style={styles.detailSectionText}>{selRecord.sankalpa}</Text>
                  </View>
                )}

                {selRecord.fiveHindrances && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionLabel}>{T('zhiguanFiveHindrancesTitle')}</Text>
                    {FIVE_HINDRANCE_KEYS.map((key, _idx) => (
                      <Text key={key} style={styles.detailSectionText}>
                        {T(FIVE_HINDRANCE_LABEL_KEYS[key])}: {selRecord.fiveHindrances[key]}
                      </Text>
                    ))}
                  </View>
                )}

                {selRecord.eightTactile && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionLabel}>{T('zhiguanEightTactileTitle')}</Text>
                    <Text style={styles.detailSectionText}>
                      {EIGHT_TACTILE_KEYS.filter(k => selRecord.eightTactile[k]).map(k => T(EIGHT_TACTILE_LABEL_KEYS[k])).join(', ') || '-'}
                    </Text>
                  </View>
                )}

                {selRecord.selfReportedStage && selRecord.selfReportedStage !== 'not_specified' && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionLabel}>{T('zhiguanSelfReportedStage')}</Text>
                    <Text style={styles.detailSectionText}>{T(SAM_STAGE_LABEL_KEYS[selRecord.selfReportedStage])}</Text>
                  </View>
                )}

                {selRecord.closingNotes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionLabel}>{T('zhiguanClosingNotes')}</Text>
                    <Text style={styles.detailSectionText}>{selRecord.closingNotes}</Text>
                  </View>
                )}

                <View style={styles.detailActions}>
                  <Pressable style={styles.detailDeleteBtn} onPress={() => { handleDelete(selRecord.id); setSelRecord(null); }}>
                    <Text style={styles.detailDeleteText}>{T('zhiguanDeleteRecord')}</Text>
                  </Pressable>
                  <Pressable style={styles.detailCloseBtn} onPress={() => setSelRecord(null)}>
                    <Text style={styles.detailCloseText}>{T('commonClose')}</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#E5DDD0' }}>
      <Text style={{ fontSize: FONT_SUB(), color: '#8B7355' }}>{label}</Text>
      <Text style={{ fontSize: FONT_SUB(), color: '#4A3F35', fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

function HeatmapBlock({ sessions, year, month }: { sessions: ZhiguanSession[]; year: number; month: number }) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: Array<{ date: string; minutes: number }> = [];
  for (let d = 1; d <= daysInMonth; d += 1) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const ms = sessions
      .filter(s => !s.deleted && toLocalDateStr(new Date(s.startTs)) === dateStr)
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
  title: { fontSize: FONT_STAT_CARD(), fontWeight: '700', color: '#4A3F35' },
  statsCard: {
    backgroundColor: 'rgba(139, 115, 85, 0.1)',
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: FONT_STAT_SECTION(), fontWeight: '700', color: '#C9A96E' },
  statLabel: { fontSize: FONT_SMALL(), color: '#8B7355', marginTop: 4 },
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
  dateLabel: { fontSize: FONT_SUB(), fontWeight: '600', color: '#4A3F35' },
  subLabel: { fontSize: FONT_SMALL(), color: '#8B7355', marginTop: 2 },
  delBtn: { padding: 6 },
  delText: { fontSize: FONT_LABEL(), color: '#8B7355' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: FONT_HERO() },
  emptyTitle: { fontSize: FONT_TITLE(), fontWeight: '600', color: '#4A3F35' },
  emptyDesc: { fontSize: FONT_SUB(), color: '#8B7355', textAlign: 'center', paddingHorizontal: 32 },
  exportBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(139, 115, 85, 0.15)' },
  exportText: { fontSize: FONT_SUB(), color: '#C9A96E', fontWeight: '600' },
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailCard: { backgroundColor: '#FAF7F2', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', padding: 20 },
  handle: { width: 40, height: 4, backgroundColor: '#D1C7B7', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  detailTitle: { fontSize: FONT_BACK(), fontWeight: '700', color: '#4A3F35', marginBottom: 16 },
  detailSection: { marginTop: 12 },
  detailSectionLabel: { fontSize: FONT_SUB(), fontWeight: '600', color: '#8B7355', marginBottom: 4 },
  detailSectionText: { fontSize: FONT_SUB(), color: '#4A3F35', lineHeight: 20 },
  detailActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 12 },
  detailDeleteBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#FEE2E2' },
  detailDeleteText: { fontSize: FONT_SUB(), color: '#EF4444', fontWeight: '600' },
  detailCloseBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  detailCloseText: { fontSize: FONT_SUB(), color: '#8B7355' },
});
