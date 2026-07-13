import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_TINY, VISION_TIME_FRAMES, dateStr } from '@egoless-do/core';
import type { Vision, VisionType, VisionTimeFrame, Theme, Habit, Plan, VisionPractice } from '@egoless-do/core';
import { X, Link, Unlink, ChevronLeft, ChevronRight, Calendar, Star, Flag, Target } from 'lucide-react-native';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

import { useAppStore, useShallowStore } from '../../../store/useAppStore';

const TF_MONTHS: Record<VisionTimeFrame, number> = {
  '3months': 3, '6months': 6, '1year': 12,
  '2years': 24, '3years': 36, '5years': 60, '10years': 120,
};

const TYPE_CONFIG: Record<VisionType, { icon: React.ComponentType<{ size?: number; color?: string }>; labelKey: string; color: string }> = {
  lifetime: { icon: Star, labelKey: 'vowLifetime', color: '#F59E0B' },
  long: { icon: Flag, labelKey: 'vowLong', color: '#8B5CF6' },
  short: { icon: Target, labelKey: 'vowShort', color: '#10B981' },
};

// ── Mini month calendar picker ──────────────────────────────────
function MonthPicker({ value, onChange, TH, T }: { value: string; onChange: (d: string) => void; TH: Theme; T: (k: string) => string }) {
  const initDate = value ? new Date(value) : new Date();
  const [year, setYear] = useState(initDate.getFullYear());
  const [month, setMonth] = useState(initDate.getMonth()); // 0-based

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const today = dateStr();

  const weeks = useMemo(() => {
    const rows: (number | null)[][] = [];
    let row: (number | null)[] = new Array(firstDay === 0 ? 6 : firstDay - 1).fill(null); // Mon-based
    for (let d = 1; d <= daysInMonth; d++) {
      row.push(d);
      if (row.length === 7) { rows.push(row); row = []; }
    }
    if (row.length > 0) { while (row.length < 7) row.push(null); rows.push(row); }
    return rows;
  }, [year, month, daysInMonth, firstDay]);

  const monthLabel = `${year}-${String(month + 1).padStart(2, '0')}`;

  const selectDay = (d: number) => {
    onChange(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  };

  return (
    <View style={[styles.monthPicker, { backgroundColor: TH.card, borderColor: TH.border }]}>
      {/* Month nav */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <TouchableOpacity onPress={() => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); }}>
          <ChevronLeft size={18} color={TH.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: FONT_BODY(), fontWeight: '600', color: TH.text }}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); }}>
          <ChevronRight size={18} color={TH.text} />
        </TouchableOpacity>
      </View>
      {/* Weekday header */}
      <View style={styles.weekdayHeader}>
        {['一', '二', '三', '四', '五', '六', '日'].map(w => (
          <View key={w} style={styles.weekdayCell}>
            <Text style={{ fontSize: FONT_TINY(), color: TH.sub }}>{w}</Text>
          </View>
        ))}
      </View>
      {/* Day grid */}
      {weeks.map((wk, ri) => (
        <View key={ri} style={styles.dayRow}>
          {wk.map((d, ci) => {
            if (d === null) return <View key={ci} style={styles.emptyDay} />;
            const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const selected = ds === value;
            const isToday = ds === today;
            return (
              <TouchableOpacity
                key={ci}
                onPress={() => selectDay(d)}
                style={[styles.dayCell, {
                  backgroundColor: selected ? '#8B5CF6' : 'transparent',
                }]}
              >
                <Text style={{
                  fontSize: FONT_SUB(), fontWeight: selected ? '700' : isToday ? '600' : '400',
                  color: selected ? '#fff' : isToday ? '#8B5CF6' : TH.text,
                }}>
                  {d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

interface Props {
  visible: boolean;
  TH: Theme;
  T: (key: string) => string;
  vision?: Vision | null;
  type?: VisionType;
  onClose: () => void;
  onSave: (data: { text: string; type?: VisionType; timeFrame?: VisionTimeFrame; startDate?: string; deadline?: string; linkedHabitIds: string[]; linkedPlanIds: string[] }) => void;
}

export default function VisionEditModal({ visible, TH, T, vision, type: initialType, onClose, onSave }: Props) {
  const { habits, plans, visionPractices } = useShallowStore(s => ({ habits: s.habits, plans: s.plans, visionPractices: s.visionPractices }));
  const [text, setText] = useState('');
  const [selectedType, setSelectedType] = useState<VisionType>('short');
  const [timeFrame, setTimeFrame] = useState<VisionTimeFrame | ''>('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [linkedHabits, setLinkedHabits] = useState<string[]>([]);
  const [linkedPlans, setLinkedPlans] = useState<string[]>([]);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const filteredHabits = (habits ?? []).filter((h: Habit) => !h.deleted);
  const filteredPlans = (plans ?? []).filter((p: Plan) => !p.deleted);
  const effectiveType = vision ? vision.type : (initialType ?? selectedType);

  useEffect(() => {
    if (visible) {
      if (vision) {
        setText(vision.text);
        setTimeFrame(vision.timeFrame ?? '');
        setStartDate(vision.startDate ?? '');
        setDeadline(vision.deadline ?? '');
      } else {
        setText('');
        setTimeFrame('');
        setStartDate(dateStr());
        setDeadline('');
      }

      // Load existing linked practices (habits via VisionPractice, plans via Plan.visionId)
      if (vision) {
        const existing = (visionPractices ?? []).filter(
          (vp: VisionPractice) => vp.visionId === vision.id && !vp.deleted && vp.refType === 'habit'
        );
        setLinkedHabits(existing.map((vp: VisionPractice) => vp.refId));
        setLinkedPlans((plans ?? []).filter((p: Plan) => !p.deleted && p.visionId === vision.id).map((p: Plan) => p.id));
      } else {
        setLinkedHabits([]);
        setLinkedPlans([]);
      }
    }
  }, [visible, vision, visionPractices]);

  // When user selects a timeFrame pill, auto-compute deadline from startDate
  const handleTimeFrameSelect = useCallback((tf: VisionTimeFrame) => {
    if (timeFrame === tf) {
      setTimeFrame('');
      return;
    }
    setTimeFrame(tf);
    // Auto-set deadline from startDate + timeFrame months
    if (startDate) {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + TF_MONTHS[tf]);
      setDeadline(dateStr(d));
    }
  }, [timeFrame, startDate]);

  const toggleHabit = useCallback((id: string) => {
    setLinkedHabits(prev => prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]);
  }, []);

  const togglePlan = useCallback((id: string) => {
    setLinkedPlans(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }, []);

  const handleSave = () => {
    if (!text.trim()) return;
    onSave({
      text: text.trim(),
      type: vision ? undefined : (initialType ?? selectedType),
      timeFrame: (timeFrame || undefined) as VisionTimeFrame | undefined,
      startDate: startDate || undefined,
      deadline: deadline || undefined,
      linkedHabitIds: linkedHabits,
      linkedPlanIds: linkedPlans,
    });
    onClose();
  };

  const canSave = text.trim().length > 0;

  // Time frames relevant to type
  const availableTimeFrames = VISION_TIME_FRAMES.filter(tf => {
    if (effectiveType === 'long') return ['2years', '3years', '5years', '10years'].includes(tf.key);
    if (effectiveType === 'short') return ['3months', '6months', '1year'].includes(tf.key);
    return false;
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: TH.cardSolid }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>
              {vision ? T('vowEdit') : T('vowCreate')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color={TH.sub} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Type selection (create mode only) */}
            {!vision && !initialType && (
              <View style={styles.typeSection}>
                <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 8 }}>{T('vowType')}</Text>
                <View style={styles.typeRow}>
                  {(Object.keys(TYPE_CONFIG) as VisionType[]).map(t => {
                    const cfg = TYPE_CONFIG[t];
                    const active = selectedType === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setSelectedType(t)}
                        style={[styles.typePillBtn, {
                          backgroundColor: active ? cfg.color + '20' : TH.card,
                          borderColor: active ? cfg.color : TH.border,
                        }]}
                      >
                        {React.createElement(cfg.icon, { size: 16, color: active ? cfg.color : TH.sub })}
                        <Text style={{ fontSize: FONT_BADGE(), color: active ? cfg.color : TH.sub, marginTop: 2, fontWeight: active ? '600' : '400' }}>
                          {T(cfg.labelKey)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Text input */}
            <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 6 }}>{T('vowText')}</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={T('vowTextPlaceholder')}
              placeholderTextColor={TH.sub}
              multiline
              maxLength={500}
              style={{
                backgroundColor: TH.card, borderRadius: 12, padding: 12,
                color: TH.text, fontSize: FONT_BODY(),
                minHeight: 80, textAlignVertical: 'top',
                borderWidth: 1, borderColor: TH.border, marginBottom: 16,
              }}
            />

            {/* Date range (for long/short only) */}
            {effectiveType !== 'lifetime' && (
              <View style={styles.pillsSection}>
                <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 8 }}>{T('vowTimeRange')}</Text>

                {/* Quick time frame pills */}
                {availableTimeFrames.length > 0 && (
                  <View style={styles.pillsContainer}>
                    {availableTimeFrames.map(tf => {
                      const active = timeFrame === tf.key;
                      return (
                        <TouchableOpacity
                          key={tf.key}
                          onPress={() => handleTimeFrameSelect(tf.key)}
                          style={[styles.pillBtn, {
                            backgroundColor: active ? '#8B5CF620' : TH.card,
                            borderColor: active ? '#8B5CF6' : TH.border,
                          }]}
                        >
                          <Text style={{ fontSize: FONT_BADGE(), color: active ? '#8B5CF6' : TH.sub, fontWeight: active ? '600' : '400' }}>
                            {T(tf.labelKey)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Start date */}
                <TouchableOpacity
                  onPress={() => { setShowStartPicker(v => !v); setShowEndPicker(false); }}
                  style={[styles.dateRow, {
                    backgroundColor: TH.card,
                    borderColor: showStartPicker ? '#8B5CF6' : TH.border,
                  }]}
                >
                  <View style={styles.dateRowIcon}>
                    <Calendar size={14} color={TH.sub} />
                    <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{T('vowStartDate')}</Text>
                  </View>
                  <Text style={{ fontSize: FONT_BODY(), color: startDate ? TH.text : TH.sub, fontWeight: startDate ? '500' : '400' }}>
                    {startDate || 'YYYY-MM-DD'}
                  </Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <MonthPicker value={startDate} onChange={(d) => { setStartDate(d); setShowStartPicker(false); }} TH={TH} T={T} />
                )}

                {/* End date / Deadline */}
                <TouchableOpacity
                  onPress={() => { setShowEndPicker(v => !v); setShowStartPicker(false); }}
                  style={[styles.dateRow, {
                    backgroundColor: TH.card,
                    borderColor: showEndPicker ? '#8B5CF6' : TH.border,
                    marginTop: showStartPicker ? 8 : 0,
                  }]}
                >
                  <View style={styles.dateRowIcon}>
                    <Calendar size={14} color={TH.sub} />
                    <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>{T('vowEndDate')}</Text>
                  </View>
                  <Text style={{ fontSize: FONT_BODY(), color: deadline ? TH.text : TH.sub, fontWeight: deadline ? '500' : '400' }}>
                    {deadline || 'YYYY-MM-DD'}
                  </Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <View style={{ marginTop: 8 }}>
                    <MonthPicker value={deadline} onChange={(d) => { setDeadline(d); setShowEndPicker(false); }} TH={TH} T={T} />
                  </View>
                )}
              </View>
            )}

            {/* Link habits */}
            <View style={styles.pillsSection}>
              <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 8 }}>{T('vowLinkHabit')}</Text>
              {filteredHabits.length === 0 ? (
                <Text style={{ fontSize: FONT_BODY(), color: TH.sub }}>{T('vowNoLink')}</Text>
              ) : (
                <View style={styles.pillsLeft}>
                  {filteredHabits.map((h: Habit) => {
                    const active = linkedHabits.includes(h.id);
                    return (
                      <TouchableOpacity
                        key={h.id}
                        onPress={() => toggleHabit(h.id)}
                        style={[styles.pillIconBtn, {
                          backgroundColor: active ? '#10B98120' : TH.card,
                          borderColor: active ? '#10B981' : TH.border,
                        }]}
                      >
                        {active ? <Link size={12} color="#10B981" /> : <Unlink size={12} color={TH.sub} />}
                        <Text style={{ fontSize: FONT_BADGE(), color: active ? '#10B981' : TH.sub }}>
                          {h.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Link plans */}
            <View style={styles.plansSection}>
              <Text style={{ fontSize: FONT_SUB(), color: TH.sub, marginBottom: 8 }}>{T('vowLinkPlan')}</Text>
              {filteredPlans.length === 0 ? (
                <Text style={{ fontSize: FONT_BODY(), color: TH.sub }}>{T('vowNoLink')}</Text>
              ) : (
                <View style={styles.pillsLeft}>
                  {filteredPlans.map((p: Plan) => {
                    const active = linkedPlans.includes(p.id);
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => togglePlan(p.id)}
                        style={[styles.pillIconBtn, {
                          backgroundColor: active ? '#F59E0B20' : TH.card,
                          borderColor: active ? '#F59E0B' : TH.border,
                        }]}
                      >
                        {active ? <Link size={12} color="#F59E0B" /> : <Unlink size={12} color={TH.sub} />}
                        <Text style={{ fontSize: FONT_BADGE(), color: active ? '#F59E0B' : TH.sub }}>
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.cancelBtn}
            >
              <Text style={{ color: TH.sub, fontSize: FONT_BODY(), fontWeight: '600' }}>{T('vowCancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!canSave}
              style={{
                flex: 1, padding: 14, borderRadius: 12,
                backgroundColor: canSave ? '#8B5CF6' : TH.border,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: FONT_BODY(), fontWeight: '700' }}>
                {vision ? T('vowSave') : T('vowCreate')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // ── Type selection ────────────────────────────────
  typeSection: {
    marginBottom: 16,
  },
  typeRow: {
    flexDirection: 'row', gap: 8,
  },
  typePillBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    borderWidth: 1.5,
  },

  // ── MonthPicker ──────────────────────────────────────
  monthPicker: {
    borderRadius: 12, padding: 12, borderWidth: 1,
  },
  weekdayHeader: {
    flexDirection: 'row', marginBottom: 4,
  },
  weekdayCell: {
    flex: 1, alignItems: 'center',
  },
  dayRow: {
    flexDirection: 'row',
  },
  emptyDay: {
    flex: 1, height: 32,
  },
  dayCell: {
    flex: 1, height: 32, alignItems: 'center', justifyContent: 'center',
    borderRadius: 6,
  },

  // ── Modal layout ─────────────────────────────────────
  overlay: {
    flex: 1, justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },

  // ── Date picker rows ─────────────────────────────────
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 10, padding: 12, borderWidth: 1,
    marginBottom: 8,
  },
  dateRowIcon: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },

  // ── Pills ────────────────────────────────────────────
  pillsContainer: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12,
  },
  pillsSection: {
    marginBottom: 16,
  },
  plansSection: {
    marginBottom: 20,
  },
  pillsLeft: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
  pillBtn: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
    borderWidth: 1,
  },
  pillIconBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
    borderWidth: 1,
  },

  // ── Buttons ──────────────────────────────────────────
  buttonRow: {
    flexDirection: 'row', gap: 8, marginTop: 8,
  },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 12,
    borderWidth: 1, alignItems: 'center',
  },
});
