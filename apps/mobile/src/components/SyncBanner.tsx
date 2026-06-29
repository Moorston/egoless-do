// ─── Sync Banner ──────────────────────────────────────────────────
// Lightweight banner shown during Phase 2/3 background sync.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from './UI';
import { getAllSyncProgress } from '../db/syncQueue';
import { getState, openDatabase } from '../db/schema';
import { isDeviceSyncedBefore } from '../features/sync/SyncService';

interface SyncBannerProps {
  onDismiss?: () => void;
}

export function SyncBanner({ onDismiss }: SyncBannerProps) {
  const TH = useTheme();
  const [visible, setVisible] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  useEffect(() => {
    const check = async () => {
      try {
        const synced = await isDeviceSyncedBefore();
        if (synced) { setVisible(false); return; }
        const db = await openDatabase();
        const initialDone = await getState(db, 'initialSyncDone');
        if (initialDone === 'true') {
          setVisible(false);
          return;
        }
        const rows = await getAllSyncProgress();
        const done = rows.filter(r => r.status === 'done').length;
        const total = rows.length;
        setDoneCount(done);
        setVisible(total > 0 && done < total);
      } catch {
        setVisible(false);
      }
    };

    check();
    const timer = setInterval(check, 3000);
    return () => clearInterval(timer);
  }, []);

  if (!visible) return null;

  return (
    <View style={[styles.banner, { backgroundColor: TH.card, borderBottomColor: TH.border }]}>
      <ActivityIndicator size="small" color={TH.accent} style={{ marginRight: 8 }} />
      <Text style={[styles.text, { color: TH.sub }]}>同步中... {doneCount}/19 项已完成</Text>
      {onDismiss && (
        <TouchableOpacity onPress={() => { setVisible(false); onDismiss(); }} style={{ marginLeft: 8 }}>
          <Text style={{ color: TH.sub, fontSize: 12 }}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  text: {
    fontSize: 13,
  },
});
