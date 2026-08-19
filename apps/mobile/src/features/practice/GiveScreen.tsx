import {FONT_TITLE, FONT_BODY, FONT_SUB, FONT_STAT_CARD , FONT_SMALL, FONT_BACK} from '@egoless-do/core';
import type { GiveType } from '@egoless-do/core';
import { HandHeart, Plus, BarChart3, Check, X } from 'lucide-react-native';
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, TextInput, Modal, StyleSheet } from 'react-native';

import { useTheme, useT } from '../../components/UI';
import SimpleHeader from '../../navigation/SimpleHeader';
import { useRootNavigation } from '../../navigation/hooks';
import {useShallowStore} from '../../store/useAppStore';


const GIVE_TYPES: { type: GiveType; icon: string; color: string }[] = [
  { type: 'fearless', icon: '🛡', color: '#10B981' },
  { type: 'material', icon: '💰', color: '#F59E0B' },
  { type: 'dharma', icon: '📖', color: '#3B82F6' },
];

export default function GiveScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const { giveHistory: giveHistoryRaw, addGive } = useShallowStore(s => ({
    giveHistory: s.giveHistory,
    addGive: s.addGive,
  }));

  const [showModal, setShowModal] = useState(false);
  const [giveType, setGiveType] = useState<GiveType>('fearless');
  const [content, setContent] = useState('');
  const [motivation, setMotivation] = useState('');
  const [amount, setAmount] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  const giveHistory = useMemo(() => {
    return (giveHistoryRaw ?? []).filter(g => !g.deleted).sort((a, b) => b.timestamp - a.timestamp);
  }, [giveHistoryRaw]);

  const stats = useMemo(() => {
    const now = Date.now();
    const weekStart = now - 7 * 24 * 3600000;
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const total = giveHistory.length;
    const week = giveHistory.filter(g => g.timestamp >= weekStart).length;
    const month = giveHistory.filter(g => g.timestamp >= monthStart.getTime()).length;
    const byType = { material: 0, dharma: 0, fearless: 0 };
    giveHistory.forEach(g => { byType[g.type] = (byType[g.type] || 0) + 1; });
    return { total, week, month, byType };
  }, [giveHistory]);

  const recentRecords = giveHistory.slice(0, 5);

  const handleSave = useCallback(() => {
    if (!content.trim()) return;
    addGive({
      timestamp: Date.now(),
      type: giveType,
      content: content.trim(),
      motivation: motivation.trim() || undefined,
      anonymous,
      amount: giveType === 'material' && amount ? parseFloat(amount) : undefined,
    });
    setContent(''); setMotivation(''); setAmount(''); setAnonymous(false);
    setShowModal(false);
  }, [content, motivation, amount, anonymous, giveType, addGive]);

  const renderGiveItem = useCallback(({ item }: { item: typeof giveHistory[number] }) => {
    const config = GIVE_TYPES.find(t => t.type === item.type);
    const d = new Date(item.timestamp);
    return (
      <View style={[styles.recentRow, { borderLeftColor: config?.color || '#F59E0B' }]}>
        <View style={styles.recentHeader}>
          <Text style={[styles.recentDate, { color: TH.sub }]}>
            {String(d.getMonth() + 1)}/{String(d.getDate())}
          </Text>
          <Text style={styles.recentIcon}>{config?.icon || '💰'}</Text>
          {item.anonymous && <Text style={styles.anonTag}>🤐</Text>}
        </View>
        <Text style={[styles.recentContent, { color: TH.text }]} numberOfLines={2}>{item.content}</Text>
        {item.motivation && (
          <Text style={[styles.recentMotivation, { color: TH.sub }]} numberOfLines={1}>
            心念：{item.motivation}
          </Text>
        )}
      </View>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- warning-reduction: behavior preserved, proper exhaustive-deps fix deferred
  }, [TH, T]);

  const listHeader = useMemo(() => (
    <>
      {/* Stats Card */}
      <View style={[styles.statsCard, { borderColor: `${TH.primary}30` }]}>
        <View style={styles.statsHeader}>
          <HandHeart size={20} color="#F59E0B" />
          <Text style={[styles.statsTitle, { color: TH.text }]}>{T('giveTitle')}</Text>
        </View>
        <Text style={[styles.quoteText, { color: TH.sub }]}>{T('giveQuote')}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{String(stats.total)}</Text>
            <Text style={[styles.statLabel, { color: TH.sub }]}>{T('giveTotal')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: TH.text }]}>{String(stats.month)}</Text>
            <Text style={[styles.statLabel, { color: TH.sub }]}>{T('giveMonth')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{String(stats.week)}</Text>
            <Text style={[styles.statLabel, { color: TH.sub }]}>{T('giveWeek')}</Text>
          </View>
        </View>
        {/* Type breakdown */}
        <View style={styles.typeRow}>
          {GIVE_TYPES.map(gt => (
            <View key={gt.type} style={styles.typeItem}>
              <Text style={styles.typeIcon}>{gt.icon}</Text>
              <Text style={[styles.typeCount, { color: gt.color }]}>{String(stats.byType[gt.type] || 0)}</Text>
              <Text style={[styles.typeLabel, { color: TH.sub }]}>{T(`give${gt.type.charAt(0).toUpperCase() + gt.type.slice(1)}`) || gt.type}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Record button */}
      <TouchableOpacity
        style={[styles.recordBtn, { backgroundColor: '#F59E0B' }]}
        onPress={() => setShowModal(true)}
      >
        <Plus size={20} color="#fff" />
        <Text style={styles.recordBtnText}>{T('giveRecord')}</Text>
      </TouchableOpacity>

      {recentRecords.length > 0 && (
        <Text style={[styles.sectionTitle, { color: TH.text }]}>{T('giveRecent')}</Text>
      )}
    </>
  ), [TH, T, stats, recentRecords.length]);

  const listFooter = useMemo(() => (
    recentRecords.length > 0 ? (
      <TouchableOpacity
        style={[styles.historyBtn, { borderColor: `${TH.primary}30` }]}
        onPress={() => nav.navigate('GiveHistory')}
      >
        <BarChart3 size={18} color={TH.primary} />
        <Text style={[styles.historyBtnText, { color: TH.primary }]}>{T('giveHistory')}</Text>
      </TouchableOpacity>
    ) : (
      <TouchableOpacity
        style={[styles.historyBtn, { borderColor: `${TH.primary}30` }]}
        onPress={() => nav.navigate('GiveHistory')}
      >
        <BarChart3 size={18} color={TH.primary} />
        <Text style={[styles.historyBtnText, { color: TH.primary }]}>{T('giveHistory')}</Text>
      </TouchableOpacity>
    )
  ), [TH, T, nav, recentRecords.length]);

  return (
    <View style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Give" />
      <FlatList
        data={recentRecords}
        keyExtractor={item => item.id}
        renderItem={renderGiveItem}
        removeClippedSubviews={true}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
      />

      {/* Record Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: TH.bg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: TH.text }]}>{T('giveRecord')}</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <X size={22} color={TH.sub} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {/* Type selection */}
            <Text style={[styles.modalLabel, { color: TH.text }]}>{T('giveType')}</Text>
            <View style={styles.typeSelectRow}>
              {GIVE_TYPES.map(gt => (
                <TouchableOpacity
                  key={gt.type}
                  style={[styles.typeChip, {
                    backgroundColor: giveType === gt.type ? gt.color : `${gt.color}15`,
                    borderColor: giveType === gt.type ? gt.color : `${gt.color}30`,
                  }]}
                  onPress={() => setGiveType(gt.type)}
                >
                  <Text style={styles.typeChipIcon}>{gt.icon}</Text>
                  <Text style={{ color: giveType === gt.type ? '#fff' : gt.color, fontSize: FONT_BODY(), fontWeight: '600' }}>
                    {T(`give${gt.type.charAt(0).toUpperCase() + gt.type.slice(1)}`) || gt.type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Content */}
            <Text style={[styles.modalLabel, { color: TH.text }]}>{T('giveContent')}</Text>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder={T('giveContentPlaceholder')}
              placeholderTextColor={TH.sub}
              multiline
              style={[styles.modalInput, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
            />

            {/* Motivation (collapsible) */}
            <Text style={[styles.modalLabel, { color: TH.text }]}>{T('giveMotivation')}</Text>
            <TextInput
              value={motivation}
              onChangeText={setMotivation}
              placeholder={T('giveMotivationPlaceholder')}
              placeholderTextColor={TH.sub}
              multiline
              style={[styles.modalInput, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
            />

            {/* Amount (material only) */}
            {giveType === 'material' && (
              <>
                <Text style={[styles.modalLabel, { color: TH.text }]}>{T('giveAmount')}</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={TH.sub}
                  keyboardType="number-pad"
                  style={[styles.modalInput, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card, width: 120 }]}
                />
              </>
            )}

            {/* Anonymous */}
            <TouchableOpacity
              style={styles.anonRow}
              onPress={() => setAnonymous(!anonymous)}
            >
              <View style={[styles.checkbox, { borderColor: TH.primary, backgroundColor: anonymous ? TH.primary : 'transparent' }]}>
                {anonymous && <Check size={14} color="#fff" />}
              </View>
              <Text style={[styles.anonLabel, { color: TH.text }]}>{T('giveAnonymous')}</Text>
            </TouchableOpacity>
            <Text style={[styles.anonHint, { color: TH.sub }]}>{T('giveAnonymousHint')}</Text>

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: content.trim() ? '#F59E0B' : `${TH.sub}30` }]}
              onPress={handleSave}
              disabled={!content.trim()}
            >
              <Text style={styles.saveBtnText}>{T('giveSave')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  statsCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  statsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statsTitle: { fontSize: FONT_TITLE(), fontWeight: '700' },
  quoteText: { fontSize: FONT_SUB(), marginBottom: 12, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: FONT_STAT_CARD(), fontWeight: '800' },
  statLabel: { fontSize: FONT_SMALL() },
  typeRow: { flexDirection: 'row', justifyContent: 'space-around' },
  typeItem: { alignItems: 'center', gap: 4 },
  typeIcon: { fontSize: FONT_BACK() },
  typeCount: { fontSize: FONT_BODY(), fontWeight: '700' },
  typeLabel: { fontSize: FONT_SMALL() },
  recordBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 16, borderRadius: 14, marginBottom: 16,
  },
  recordBtnText: { color: '#fff', fontSize: FONT_BODY(), fontWeight: '700' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: FONT_SUB(), fontWeight: '700', marginBottom: 10 },
  recentRow: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 8, marginBottom: 8 },
  recentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  recentDate: { fontSize: FONT_SMALL() },
  recentIcon: { fontSize: FONT_SUB() },
  anonTag: { fontSize: FONT_SUB() },
  recentContent: { fontSize: FONT_BODY(), marginBottom: 2 },
  recentMotivation: { fontSize: FONT_SMALL(), fontStyle: 'italic' },
  historyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  historyBtnText: { fontSize: FONT_BODY(), fontWeight: '600' },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 0,
  },
  modalTitle: { fontSize: FONT_TITLE(), fontWeight: '700' },
  modalLabel: { fontSize: FONT_BODY(), fontWeight: '600', marginBottom: 8, marginTop: 12 },
  modalInput: {
    borderRadius: 12, borderWidth: 1, padding: 14, fontSize: FONT_BODY(),
    minHeight: 60, textAlignVertical: 'top',
  },
  typeSelectRow: { flexDirection: 'row', gap: 10 },
  typeChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 14, borderWidth: 1,
  },
  typeChipIcon: { fontSize: FONT_TITLE() },
  anonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  anonLabel: { fontSize: FONT_BODY(), fontWeight: '600' },
  anonHint: { fontSize: FONT_SMALL(), marginTop: 4, marginLeft: 32, fontStyle: 'italic' },
  saveBtn: {
    alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 14, marginTop: 24,
  },
  saveBtnText: { color: '#fff', fontSize: FONT_BODY(), fontWeight: '700' },
});
