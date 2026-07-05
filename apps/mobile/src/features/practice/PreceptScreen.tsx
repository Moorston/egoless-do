import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, TextInput, Modal, StyleSheet } from 'react-native';
import { useTheme, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_STAT_CARD, dateStr } from '@egoless-do/core';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import { useRootNavigation } from '../../navigation/hooks';
import SimpleHeader from '../../navigation/SimpleHeader';
import { Shield, Check, X, Plus, BarChart3, AlertTriangle } from 'lucide-react-native';
import {
  PRECEPT_AVOID_PRESETS, PRACTICE_PRESETS, VIOLATION_TRIGGERS,
  PRECEPT_PREFIX_AVOID, PRECEPT_PREFIX_PRACTICE,
  isPreceptHabit, getPreceptDisplayName, getPreceptType,
  type PreceptPreset,
} from '@egoless-do/core';

export default function PreceptScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const { habits, reflections, checkinHabit, addReflection, addHabit } = useAppStore(useShallow(s => ({
    habits: s.habits,
    reflections: s.reflections,
    checkinHabit: s.checkinHabit,
    addReflection: s.addReflection,
    addHabit: s.addHabit,
  })));

  const [showViolateModal, setShowViolateModal] = useState(false);
  const [violateHabitId, setViolateHabitId] = useState('');
  const [violateHabitName, setViolateHabitName] = useState('');
  const [violateTrigger, setViolateTrigger] = useState('');
  const [violateReflection, setViolateReflection] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customGoal, setCustomGoal] = useState('');
  const [customDays, setCustomDays] = useState('21');
  const [customType, setCustomType] = useState<'avoid' | 'practice'>('avoid');

  const today = dateStr();

  // Filter precept habits
  const preceptHabits = useMemo(() => {
    return (habits ?? []).filter(h => !h.deleted && isPreceptHabit(h.name));
  }, [habits]);

  const avoidHabits = useMemo(() => preceptHabits.filter(h => getPreceptType(h.name) === 'avoid'), [preceptHabits]);
  const practiceHabits = useMemo(() => preceptHabits.filter(h => getPreceptType(h.name) === 'practice'), [preceptHabits]);

  // Stats
  const stats = useMemo(() => {
    const allChecked = preceptHabits.filter(h => (h.checkedDates ?? []).includes(today));
    const allDates = new Set<string>();
    preceptHabits.forEach(h => (h.checkedDates ?? []).forEach(d => allDates.add(d)));
    // Total days with any checkin
    const totalDays = allDates.size;
    // Streak: consecutive days where ALL precepts were checked
    const sortedDates = [...allDates].sort().reverse();
    let streak = 0;
    const checkDate = new Date();
    if (!allDates.has(today)) checkDate.setDate(checkDate.getDate() - 1);
    for (let i = 0; i < 365; i++) {
      const ds = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      const allDone = preceptHabits.length > 0 && preceptHabits.every(h => (h.checkedDates ?? []).includes(ds));
      if (allDone) { streak++; checkDate.setDate(checkDate.getDate() - 1); } else break;
    }
    // Month rate
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    let monthDone = 0;
    let monthTotal = 0;
    for (let d = new Date(monthStart); d <= now; d.setDate(d.getDate() + 1)) {
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      monthTotal++;
      if (preceptHabits.length > 0 && preceptHabits.every(h => (h.checkedDates ?? []).includes(ds))) monthDone++;
    }
    const monthRate = monthTotal > 0 ? Math.round((monthDone / monthTotal) * 100) : 0;
    return { todayDone: allChecked.length, total: preceptHabits.length, totalDays, streak, monthRate };
  }, [preceptHabits, today]);

  // Recent violation insights (reflections with #持戒 tag)
  const recentInsights = useMemo(() => {
    return (reflections ?? [])
      .filter(r => !r.deleted && (r.tags ?? []).includes('持戒'))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3);
  }, [reflections]);

  const handleCheckDone = useCallback((habitId: string) => {
    checkinHabit(habitId, today);
  }, [checkinHabit, today]);

  const handleViolate = useCallback((habitId: string, habitName: string) => {
    setViolateHabitId(habitId);
    setViolateHabitName(getPreceptDisplayName(habitName));
    setViolateTrigger('');
    setViolateReflection('');
    setShowViolateModal(true);
  }, []);

  const handleSaveViolation = useCallback(() => {
    // Save as reflection with #持戒 tag
    const tags = ['持戒'];
    if (violateTrigger) tags.push(violateTrigger);
    const content = violateHabitName + (violateReflection ? `：${violateReflection}` : '');
    addReflection({ content, tags, mood: '' });
    setShowViolateModal(false);
  }, [violateHabitName, violateTrigger, violateReflection, addReflection]);

  const handleAddPrecept = useCallback((preset: PreceptPreset) => {
    const prefix = preset.type === 'avoid' ? PRECEPT_PREFIX_AVOID : PRECEPT_PREFIX_PRACTICE;
    addHabit({ name: `${prefix}${preset.name}`, goal: preset.goal, targetDays: 21, createTag: true, link: 'none' });
  }, [addHabit]);

  const handleAddCustom = useCallback(() => {
    if (!customName.trim()) return;
    const prefix = customType === 'avoid' ? PRECEPT_PREFIX_AVOID : PRECEPT_PREFIX_PRACTICE;
    addHabit({ name: `${prefix}${customName.trim()}`, goal: customGoal.trim(), targetDays: parseInt(customDays) || 21, createTag: true, link: 'none' });
    setCustomName(''); setCustomGoal(''); setCustomDays('21');
    setShowAddModal(false);
  }, [customName, customGoal, customDays, customType, addHabit]);

  // ── Batch check/uncheck all ──
  const someUnchecked = preceptHabits.some(h => !(h.checkedDates ?? []).includes(today));
  const someChecked = preceptHabits.some(h => (h.checkedDates ?? []).includes(today));

  const handleCheckAll = useCallback(() => {
    preceptHabits.forEach(h => {
      if (!(h.checkedDates ?? []).includes(today)) checkinHabit(h.id, today);
    });
  }, [preceptHabits, today, checkinHabit]);

  const handleUncheckAll = useCallback(() => {
    preceptHabits.forEach(h => {
      if ((h.checkedDates ?? []).includes(today)) checkinHabit(h.id, today);
    });
  }, [preceptHabits, today, checkinHabit]);

  const renderPreceptItem = useCallback(({ item: habit }: { item: typeof preceptHabits[0] }) => {
    const displayName = getPreceptDisplayName(habit.name);
    const type = getPreceptType(habit.name);
    const isChecked = (habit.checkedDates ?? []).includes(today);
    const isAvoid = type === 'avoid';
    const icon = isAvoid ? '🚫' : '✨';
    const color = isAvoid ? '#EF4444' : '#10B981';

    return (
      <View style={[styles.preceptCard, { borderColor: `${color}30`, marginHorizontal: 16 }]}>
        <View style={styles.preceptHeader}>
          <Text style={styles.preceptIcon}>{icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.preceptName, { color: TH.text }]}>{displayName}</Text>
            {habit.goal ? <Text style={[styles.preceptGoal, { color: TH.sub }]}>{habit.goal}</Text> : null}
          </View>
          <View style={styles.streakBadge}>
            <Text style={[styles.streakText, { color: '#F59E0B' }]}>🔥 {habit.streak}</Text>
          </View>
        </View>
        <View style={styles.preceptActions}>
          {isChecked ? (
            <View style={[styles.doneTag, { backgroundColor: '#10B98120' }]}>
              <Check size={14} color="#10B981" />
              <Text style={{ color: '#10B981', fontSize: FONT_BODY, fontWeight: '600' }}> 今日已持戒</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                onPress={() => handleCheckDone(habit.id)}
              >
                <Check size={16} color="#fff" />
                <Text style={styles.actionBtnText}>{T('preceptDone') || '做到了'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
                onPress={() => handleViolate(habit.id, habit.name)}
              >
                <AlertTriangle size={16} color="#fff" />
                <Text style={styles.actionBtnText}>{T('preceptNotDone') || '未做到'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }, [T, TH.text, TH.sub, today, handleCheckDone, handleViolate]);

  // ── FlatList header: stats + avoid section title ──
  const ListHeader = useCallback(() => (
    <>
      {/* Stats Card */}
      <View style={[styles.statsCard, { borderColor: '#F59E0B30' }]}>
        <View style={styles.statsHeader}>
          <Shield size={20} color="#F59E0B" />
          <Text style={[styles.statsTitle, { color: TH.text }]}>{T('preceptTitle') || '持戒清净'}</Text>
        </View>
        <Text style={[styles.quoteText, { color: TH.sub }]}>{T('preceptQuote') || '持戒清净，禅定现前'}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.streak}</Text>
            <Text style={[styles.statLabel, { color: TH.sub }]}>🔥 {T('preceptStreak') || '连续'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: TH.text }]}>{stats.totalDays}</Text>
            <Text style={[styles.statLabel, { color: TH.sub }]}>{T('preceptTotalDays') || '累计'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.monthRate}%</Text>
            <Text style={[styles.statLabel, { color: TH.sub }]}>{T('preceptMonthRate') || '本月'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: TH.text }]}>{stats.todayDone}/{stats.total}</Text>
            <Text style={[styles.statLabel, { color: TH.sub }]}>{T('preceptToday')}</Text>
          </View>
        </View>

        {/* Batch action buttons */}
        {preceptHabits.length > 0 && (someUnchecked || someChecked) && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: `${TH.border}30` }}>
            {someUnchecked && (
              <TouchableOpacity
                onPress={handleCheckAll}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#10B98115', borderWidth: 1, borderColor: '#10B98130' }}
              >
                <Check size={16} color="#10B981" />
                <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#10B981' }}>{T('preceptBatchDone')}</Text>
              </TouchableOpacity>
            )}
            {someChecked && (
              <TouchableOpacity
                onPress={handleUncheckAll}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#EF444415', borderWidth: 1, borderColor: '#EF444430' }}
              >
                <X size={16} color="#EF4444" />
                <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: '#EF4444' }}>{T('preceptBatchUndo')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Empty state (shown in header when no precepts exist) */}
      {preceptHabits.length === 0 && (
        <View style={[styles.emptyCard, { borderColor: `${TH.border}40` }]}>
          <Shield size={40} color={TH.sub} />
          <Text style={[styles.emptyText, { color: TH.sub }]}>{T('preceptEmptyHint')}</Text>
        </View>
      )}

      {/* Avoid section title */}
      {avoidHabits.length > 0 && (
        <Text style={[styles.sectionTitle, { color: '#EF4444', paddingHorizontal: 16, marginTop: 16 }]}>{T('preceptAvoid') || '止持（守护不做的）'}</Text>
      )}
    </>
  ), [TH, T, stats, preceptHabits.length, someUnchecked, someChecked, avoidHabits.length, handleCheckAll, handleUncheckAll]);

  // ── FlatList footer: practice section, action buttons, insights ──
  const ListFooter = useCallback(() => (
    <>
      {/* Practice section */}
      {practiceHabits.length > 0 && (
        <View style={[styles.section, { paddingHorizontal: 16 }]}>
          <Text style={[styles.sectionTitle, { color: '#10B981' }]}>{T('preceptPractice') || '作持（守护要做的）'}</Text>
          {practiceHabits.map(h => {
            const displayName = getPreceptDisplayName(h.name);
            const isChecked = (h.checkedDates ?? []).includes(today);
            return (
              <View key={h.id} style={[styles.preceptCard, { borderColor: '#10B98130' }]}>
                <View style={styles.preceptHeader}>
                  <Text style={styles.preceptIcon}>✨</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.preceptName, { color: TH.text }]}>{displayName}</Text>
                    {h.goal ? <Text style={[styles.preceptGoal, { color: TH.sub }]}>{h.goal}</Text> : null}
                  </View>
                  <View style={styles.streakBadge}>
                    <Text style={[styles.streakText, { color: '#F59E0B' }]}>🔥 {h.streak}</Text>
                  </View>
                </View>
                <View style={styles.preceptActions}>
                  {isChecked ? (
                    <View style={[styles.doneTag, { backgroundColor: '#10B98120' }]}>
                      <Check size={14} color="#10B981" />
                      <Text style={{ color: '#10B981', fontSize: FONT_BODY, fontWeight: '600' }}> 今日已持戒</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                        onPress={() => handleCheckDone(h.id)}
                      >
                        <Check size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>{T('preceptDone') || '做到了'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
                        onPress={() => handleViolate(h.id, h.name)}
                      >
                        <AlertTriangle size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>{T('preceptNotDone') || '未做到'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Action buttons */}
      <View style={[styles.actionRow, { paddingHorizontal: 16 }]}>
        <TouchableOpacity
          style={[styles.bottomBtn, { backgroundColor: `${TH.primary}15`, borderColor: `${TH.primary}30` }]}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={18} color={TH.primary} />
          <Text style={[styles.bottomBtnText, { color: TH.primary }]}>{T('preceptAddNew') || '+ 添加新戒条'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bottomBtn, { backgroundColor: `${TH.primary}15`, borderColor: `${TH.primary}30` }]}
          onPress={() => nav.navigate('PreceptHistory' as never)}
        >
          <BarChart3 size={18} color={TH.primary} />
          <Text style={[styles.bottomBtnText, { color: TH.primary }]}>{T('preceptHistory') || '持戒历史'}</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Insights */}
      {recentInsights.length > 0 && (
        <View style={[styles.section, { paddingHorizontal: 16 }]}>
          <Text style={[styles.sectionTitle, { color: TH.text }]}>{T('preceptRecentInsight') || '最近觉察'}</Text>
          {recentInsights.map(r => (
            <View key={r.id} style={[styles.insightRow, { borderLeftColor: '#F59E0B' }]}>
              <Text style={[styles.insightDate, { color: TH.sub }]}>
                {new Date(r.timestamp).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
              </Text>
              <Text style={[styles.insightContent, { color: TH.text }]} numberOfLines={2}>{r.content}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  ), [TH, T, practiceHabits, recentInsights, today, handleCheckDone, handleViolate, nav]);

  return (
    <View style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Precept" />
      <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: TH.text, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>{T('preceptSubtitle')}</Text>
      <FlatList
        data={avoidHabits}
        renderItem={renderPreceptItem}
        keyExtractor={(item) => item.id}
        removeClippedSubviews
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      {/* Violation Modal */}
      <Modal visible={showViolateModal} animationType="fade">
        <View style={[styles.modalContainer, { backgroundColor: TH.bg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: TH.text }]}>🚫 {violateHabitName} — {T('preceptViolated') || '未做到'}</Text>
            <TouchableOpacity onPress={() => setShowViolateModal(false)}>
              <X size={22} color={TH.sub} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <Text style={[styles.modalLabel, { color: TH.text }]}>{T('preceptTriggerTitle') || '什么触发了？'}</Text>
            <View style={styles.triggerRow}>
              {VIOLATION_TRIGGERS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.triggerChip, {
                    backgroundColor: violateTrigger === t ? '#F59E0B' : `${TH.primary}15`,
                    borderColor: violateTrigger === t ? '#F59E0B' : `${TH.primary}30`,
                  }]}
                  onPress={() => setViolateTrigger(violateTrigger === t ? '' : t)}
                >
                  <Text style={{ color: violateTrigger === t ? '#fff' : TH.primary, fontSize: FONT_BODY, fontWeight: '600' }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: TH.text, marginTop: 16 }]}>{T('preceptReflectionTitle') || '觉察反思'}</Text>
            <TextInput
              value={violateReflection}
              onChangeText={setViolateReflection}
              placeholder={T('preceptReflectionPlaceholder') || '记录此刻的觉察...'}
              placeholderTextColor={TH.sub}
              multiline
              style={[styles.modalInput, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
            />

            <Text style={[styles.quoteModal, { color: TH.sub }]}>{T('preceptQuoteText') || '若犯戒者，当自呵责，改往修来 — 小止观'}</Text>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: '#F59E0B', flex: 1 }]}
                onPress={handleSaveViolation}
              >
                <Text style={styles.saveBtnText}>{T('preceptSave') || '记录觉察'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: `${TH.sub}20`, flex: 1 }]}
                onPress={() => setShowViolateModal(false)}
              >
                <Text style={[styles.saveBtnText, { color: TH.sub }]}>{T('preceptSkip') || '跳过'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Add Precept Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: TH.bg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: TH.text }]}>{T('preceptAddNew') || '添加新戒条'}</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <X size={22} color={TH.sub} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {/* Preset templates */}
            <Text style={[styles.modalLabel, { color: '#EF4444' }]}>{'🚫 ' + T('preceptTypeAvoid')}</Text>
            <View style={styles.triggerRow}>
              {PRECEPT_AVOID_PRESETS.map(p => {
                const prefix = PRECEPT_PREFIX_AVOID;
                const exists = preceptHabits.some(h => h.name === `${prefix}${p.name}`);
                return (
                  <TouchableOpacity
                    key={p.name}
                    style={[styles.triggerChip, {
                      backgroundColor: exists ? `${TH.sub}10` : '#EF444415',
                      borderColor: exists ? `${TH.sub}20` : '#EF444430',
                      opacity: exists ? 0.5 : 1,
                    }]}
                    onPress={() => !exists && handleAddPrecept(p)}
                    disabled={exists}
                  >
                    <Text style={{ color: exists ? TH.sub : '#EF4444', fontSize: FONT_BODY }}>{p.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.modalLabel, { color: '#10B981', marginTop: 12 }]}>{'✨ ' + T('preceptTypePractice')}</Text>
            <View style={styles.triggerRow}>
              {PRACTICE_PRESETS.map(p => {
                const prefix = PRECEPT_PREFIX_PRACTICE;
                const exists = preceptHabits.some(h => h.name === `${prefix}${p.name}`);
                return (
                  <TouchableOpacity
                    key={p.name}
                    style={[styles.triggerChip, {
                      backgroundColor: exists ? `${TH.sub}10` : '#10B98115',
                      borderColor: exists ? `${TH.sub}20` : '#10B98130',
                      opacity: exists ? 0.5 : 1,
                    }]}
                    onPress={() => !exists && handleAddPrecept(p)}
                    disabled={exists}
                  >
                    <Text style={{ color: exists ? TH.sub : '#10B981', fontSize: FONT_BODY }}>{p.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom */}
            <Text style={[styles.modalLabel, { color: TH.text, marginTop: 20 }]}>{T('preceptAddCustom') || '或自定义'}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              {(['avoid', 'practice'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, {
                    backgroundColor: customType === t ? (t === 'avoid' ? '#EF4444' : '#10B981') : `${TH.primary}15`,
                    borderColor: customType === t ? (t === 'avoid' ? '#EF4444' : '#10B981') : `${TH.primary}30`,
                  }]}
                  onPress={() => setCustomType(t)}
                >
                  <Text style={{ color: customType === t ? '#fff' : TH.primary, fontSize: FONT_BODY, fontWeight: '600' }}>
                    {t === 'avoid' ? T('preceptTypeAvoid') : T('preceptTypePractice')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder={T('preceptTemplateName') || '戒条名称'}
              placeholderTextColor={TH.sub}
              style={[styles.modalInput, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
            />
            <TextInput
              value={customGoal}
              onChangeText={setCustomGoal}
              placeholder={T('preceptTemplateGuide') || '修行指引'}
              placeholderTextColor={TH.sub}
              style={[styles.modalInput, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
            />
            <TextInput
              value={customDays}
              onChangeText={setCustomDays}
              placeholder={T('preceptTargetDays') || '目标天数'}
              placeholderTextColor={TH.sub}
              keyboardType="number-pad"
              style={[styles.modalInput, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card, width: 120 }]}
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: TH.primary, marginTop: 12 }]}
              onPress={handleAddCustom}
            >
              <Check size={18} color="#fff" />
              <Text style={styles.saveBtnText}>{T('preceptAddCustom')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16,
  },
  statsHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4,
  },
  statsTitle: {
    fontSize: FONT_TITLE, fontWeight: '700',
  },
  quoteText: {
    fontSize: FONT_SUB, marginBottom: 12, fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: FONT_STAT_CARD, fontWeight: '800' },
  statLabel: { fontSize: 11 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: FONT_SUB, fontWeight: '700', marginBottom: 10 },
  preceptCard: {
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  preceptHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10,
  },
  preceptIcon: { fontSize: 20 },
  preceptName: { fontSize: FONT_BODY, fontWeight: '700' },
  preceptGoal: { fontSize: 12, marginTop: 2 },
  streakBadge: { alignItems: 'center' },
  streakText: { fontSize: FONT_BODY, fontWeight: '600' },
  preceptActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  doneTag: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
  },
  actionBtnText: { color: '#fff', fontSize: FONT_BODY, fontWeight: '600' },
  emptyCard: {
    borderRadius: 16, borderWidth: 1, padding: 40, alignItems: 'center', gap: 12, marginBottom: 16,
  },
  emptyText: { fontSize: FONT_BODY },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  bottomBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  bottomBtnText: { fontSize: FONT_BODY, fontWeight: '600' },
  insightRow: {
    borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 8, marginBottom: 8,
  },
  insightDate: { fontSize: 12, marginBottom: 2 },
  insightContent: { fontSize: FONT_BODY },
  // Modal styles
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 0,
  },
  modalTitle: { fontSize: FONT_TITLE, fontWeight: '700' },
  modalLabel: { fontSize: FONT_BODY, fontWeight: '600', marginBottom: 10 },
  modalInput: {
    borderRadius: 12, borderWidth: 1, padding: 14, fontSize: FONT_BODY, minHeight: 80, textAlignVertical: 'top', marginBottom: 12,
  },
  triggerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  triggerChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  typeChip: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1,
  },
  quoteModal: { fontSize: FONT_SUB, fontStyle: 'italic', textAlign: 'center', marginTop: 8 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 14,
  },
  saveBtnText: { color: '#fff', fontSize: FONT_BODY, fontWeight: '700' },
});
