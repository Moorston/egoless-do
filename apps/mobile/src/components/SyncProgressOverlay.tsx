// ─── Sync Progress Overlay ─────────────────────────────────────────
// Shown during Phase 1 initial sync with per-entity progress.
import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, ActivityIndicator } from 'react-native';

import { useTheme } from '../components/UI';
import { getAllSyncProgress, type SyncProgressRow } from '../db/syncQueue';

interface SyncProgressOverlayProps {
  visible: boolean;
  phase: number;
}

const ENTITY_LABELS: Record<string, string> = {
  profile: '身份信息', checkin: '打卡记录', habit: '习惯', grace: '宽限记录',
  reflection: '心得回忆', fasting: '禁食记录', food: '饮食记录', exercise: '运动记录', meditation: '冥想记录',
  plan: '计划', planItem: '计划项目', planItemCheckin: '计划打卡', dailyCustomTodo: '每日待办', dailyTodoHistory: '待办历史',
  thoughtTrail: '思维路径', trailNote: '路径笔记', reflectionLink: '心得关联', aiConfig: 'AI 配置', checkinReview: '打卡回顾',
};

const STATUS_ICONS: Record<string, string> = {
  pending: '○', downloading: '◌', done: '✓', failed: '✗',
};

export function SyncProgressOverlay({ visible, phase }: SyncProgressOverlayProps) {
  const TH = useTheme();
  const [progress, setProgress] = useState<SyncProgressRow[]>([]);

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(async () => {
      const rows = await getAllSyncProgress();
      setProgress(rows);
    }, 500);
    return () => clearInterval(timer);
  }, [visible]);

  const doneCount = progress.filter(p => p.status === 'done').length;
  const totalCount = progress.length || 19;
  const pct = Math.round((doneCount / totalCount) * 100);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <Text style={[styles.title, { color: TH.text }]}>正在同步你的数据...</Text>

          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: TH.border }]}>
            <View style={[styles.progressFill, { backgroundColor: TH.accent, width: `${pct}%` }]} />
          </View>
          <Text style={[styles.pct, { color: TH.sub }]}>{pct}%</Text>

          {/* Entity list */}
          <View style={styles.entityList}>
            {progress.filter(p => p.phase === phase).map(p => (
              <View key={p.entity} style={styles.entityRow}>
                <Text style={[styles.entityIcon, { color: p.status === 'done' ? '#22C55E' : p.status === 'failed' ? '#EF4444' : p.status === 'downloading' ? TH.accent : TH.sub }]}>
                  {p.status === 'downloading' ? '◌' : STATUS_ICONS[p.status] ?? '○'}
                </Text>
                <Text style={[styles.entityName, { color: TH.text }]}>
                  {ENTITY_LABELS[p.entity] ?? p.entity}
                  {p.total_count > 0 ? ` (${p.pulled_count}/${p.total_count})` : ''}
                </Text>
                {p.status === 'downloading' && <ActivityIndicator size="small" color={TH.accent} style={{ marginLeft: 8 }} />}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  container: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  pct: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 16,
  },
  entityList: {
    gap: 8,
  },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entityIcon: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  entityName: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
});
