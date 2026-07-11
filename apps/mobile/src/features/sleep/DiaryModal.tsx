import {
  SleepEntry, SleepQuality, WorkState,
  BODY_STATE_PRESETS, MIND_STATE_PRESETS, formatSleepDuration,
  FONT_TITLE, FONT_BODY, FONT_SUB, FONT_LABEL } from '@egoless-do/core';
import { X, Star, Moon, Sun } from 'lucide-react-native';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';

import { useTheme, useT } from '../../components/UI';
import { useAppStore, useShallowStore } from '../../store/useAppStore';


interface Props {
  visible: boolean;
  onClose: () => void;
}

/** Parse a "HH:MM" string into today's timestamp (ms). */
function parseHHMM(str: string): number | undefined {
  const m = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return undefined;
  const hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  if (hours > 23 || minutes > 59) return undefined;
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

/** Format a timestamp back to "HH:MM". */
function formatHHMM(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const WORK_STATES: { key: WorkState; labelKey: string }[] = [
  { key: 'energetic', labelKey: 'sleepWorkEnergetic' },
  { key: 'normal',    labelKey: 'sleepWorkNormal' },
  { key: 'tired',     labelKey: 'sleepWorkTired' },
  { key: 'exhausted', labelKey: 'sleepWorkExhausted' },
];

export default function DiaryModal({ visible, onClose }: Props) {
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const { getTodaySleep, saveSleepDiary, autoSyncHabits } = useShallowStore(s => ({
    getTodaySleep: s.getTodaySleep,
    saveSleepDiary: s.saveSleepDiary,
    autoSyncHabits: s.autoSyncHabits,
  }));

  // ── Form state ──
  const [bedtimeStr, setBedtimeStr] = useState('');
  const [wakeStr, setWakeStr]       = useState('');
  const [quality, setQuality]       = useState<number>(0);
  const [workState, setWorkState]   = useState<WorkState | null>(null);
  const [bodyState, setBodyState]   = useState<string[]>([]);
  const [mindState, setMindState]   = useState<string[]>([]);
  const [customBodyTag, setCustomBodyTag] = useState('');
  const [customMindTag, setCustomMindTag] = useState('');
  const [note, setNote]             = useState('');

  // Pre-fill from today's existing data when modal opens
  useEffect(() => {
    if (!visible) return;
    const today = getTodaySleep();
    if (today) {
      setBedtimeStr(today.bedtimeAt ? formatHHMM(today.bedtimeAt) : '');
      setWakeStr(today.wakeAt ? formatHHMM(today.wakeAt) : '');
      setQuality(today.quality ?? 0);
      setWorkState(today.workState ?? null);
      setBodyState(today.bodyState ?? []);
      setMindState(today.mindState ?? []);
      setNote(today.note ?? '');
    } else {
      // Reset form
      setBedtimeStr('');
      setWakeStr('');
      setQuality(0);
      setWorkState(null);
      setBodyState([]);
      setMindState([]);
      setCustomBodyTag('');
      setCustomMindTag('');
      setNote('');
    }
  }, [visible]);

  // Auto-calculate duration
  const bedtimeAt = parseHHMM(bedtimeStr);
  const wakeAt    = parseHHMM(wakeStr);

  let durationMin: number | undefined;
  if (bedtimeAt != null && wakeAt != null) {
    let diff = wakeAt - bedtimeAt;
    if (diff < 0) diff += 24 * 60 * 60 * 1000; // cross midnight
    durationMin = Math.round(diff / 60000);
  }

  // ── Toggle helpers ──
  const toggleTag = useCallback((list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, tag: string) => {
    setList(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }, []);

  const addCustomTag = useCallback((
    tag: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    clear: () => void,
  ) => {
    const trimmed = tag.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList(prev => [...prev, trimmed]);
      clear();
    }
  }, []);

  // ── Save ──
  const handleSave = useCallback(() => {
    const entry: Partial<SleepEntry> = {};
    if (bedtimeAt != null) entry.bedtimeAt = bedtimeAt;
    if (wakeAt != null)    entry.wakeAt    = wakeAt;
    if (quality > 0)       entry.quality   = quality as SleepQuality;
    if (workState)         entry.workState = workState;
    if (bodyState.length)  entry.bodyState = bodyState;
    if (mindState.length)  entry.mindState = mindState;
    if (note.trim())       entry.note      = note.trim();

    saveSleepDiary(entry);
    autoSyncHabits?.();
    onClose();
  }, [bedtimeAt, wakeAt, quality, workState, bodyState, mindState, note, saveSleepDiary, autoSyncHabits, onClose]);

  // ── Render section label ──
  const SectionLabel = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
    <View style={s.sectionLabel}>
      {icon}
      <Text style={[s.sectionLabelText, { color: TH.text }]}>{text}</Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.overlay}
      >
        <View style={[s.sheet, { backgroundColor: TH.cardSolid }]}>
          {/* ── Header ── */}
          <View style={s.header}>
            <Text style={[s.headerTitle, { color: TH.text }]}>填写今日日记</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={24} color={TH.sub} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>

            {/* ── 1. Bedtime / Wake Time ── */}
            <View style={[s.card, { borderColor: `${P}30` }]}>
              <SectionLabel icon={<Moon size={16} color={P} />} text="入睡 / 起床时间" />
              <View style={s.timeRow}>
                <View style={s.timeCol}>
                  <Text style={[s.timeLabel, { color: TH.sub }]}>
                    <Moon size={12} color={TH.sub} /> 入睡
                  </Text>
                  <TextInput
                    value={bedtimeStr}
                    onChangeText={setBedtimeStr}
                    placeholder="HH:MM"
                    placeholderTextColor={TH.sub}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    style={[s.timeInput, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
                  />
                </View>
                <View style={s.timeCol}>
                  <Text style={[s.timeLabel, { color: TH.sub }]}>
                    <Sun size={12} color={TH.sub} /> 起床
                  </Text>
                  <TextInput
                    value={wakeStr}
                    onChangeText={setWakeStr}
                    placeholder="HH:MM"
                    placeholderTextColor={TH.sub}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    style={[s.timeInput, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
                  />
                </View>
              </View>
              {durationMin != null && (
                <View style={[s.durationBadge, { backgroundColor: `${P}15` }]}>
                  <Text style={[s.durationText, { color: P }]}>
                    {formatSleepDuration(durationMin)}
                  </Text>
                </View>
              )}
            </View>

            {/* ── 2. Quality Rating ── */}
            <View style={[s.card, { borderColor: `${P}30` }]}>
              <SectionLabel icon={<Star size={16} color={P} />} text="睡眠质量" />
              <View style={s.starRow}>
                {[1, 2, 3, 4, 5].map(i => (
                  <TouchableOpacity key={i} onPress={() => setQuality(i)}>
                    <Star
                      size={32}
                      color={i <= quality ? '#F59E0B' : `${TH.sub}40`}
                      fill={i <= quality ? '#F59E0B' : 'transparent'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── 3. Work State (single-select) ── */}
            <View style={[s.card, { borderColor: `${P}30` }]}>
              <SectionLabel icon={<Text style={{ fontSize: FONT_LABEL() }}>💼</Text>} text={T('sleepWorkState') || '工作状态'} />
              <View style={s.chipRow}>
                {WORK_STATES.map(({ key, labelKey }) => {
                  const selected = workState === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setWorkState(selected ? null : key)}
                      style={[
                        s.chip,
                        {
                          borderColor: selected ? P : TH.border,
                          backgroundColor: selected ? `${P}20` : 'transparent',
                        },
                      ]}
                    >
                      <Text style={[s.chipText, { color: selected ? P : TH.text }]}>
                        {T(labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── 4. Body State (multi-select) ── */}
            <View style={[s.card, { borderColor: `${P}30` }]}>
              <SectionLabel icon={<Text style={{ fontSize: FONT_LABEL() }}>🏃</Text>} text={T('sleepBodyState') || '身体状态'} />
              <View style={s.chipRow}>
                {BODY_STATE_PRESETS.map(tag => {
                  const selected = bodyState.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleTag(bodyState, setBodyState, tag)}
                      style={[
                        s.chip,
                        {
                          borderColor: selected ? P : TH.border,
                          backgroundColor: selected ? `${P}20` : 'transparent',
                        },
                      ]}
                    >
                      <Text style={[s.chipText, { color: selected ? P : TH.text }]}>{tag}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={s.customTagRow}>
                <TextInput
                  value={customBodyTag}
                  onChangeText={setCustomBodyTag}
                  placeholder={T('sleepCustomTag') || '自定义标签'}
                  placeholderTextColor={TH.sub}
                  style={[s.customTagInput, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
                  onSubmitEditing={() => addCustomTag(customBodyTag, bodyState, setBodyState, () => setCustomBodyTag(''))}
                />
                <TouchableOpacity
                  onPress={() => addCustomTag(customBodyTag, bodyState, setBodyState, () => setCustomBodyTag(''))}
                  style={[s.addTagBtn, { backgroundColor: P }]}
                >
                  <Text style={s.addTagBtnText}>{T('sleepAddTag') || '添加标签'}</Text>
                </TouchableOpacity>
              </View>
              {/* Show custom tags that are not in presets */}
              {bodyState.filter(t => !BODY_STATE_PRESETS.includes(t)).length > 0 && (
                <View style={[s.chipRow, { marginTop: 8 }]}>
                  {bodyState.filter(t => !BODY_STATE_PRESETS.includes(t)).map(tag => (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleTag(bodyState, setBodyState, tag)}
                      style={[s.chip, { borderColor: P, backgroundColor: `${P}20` }]}
                    >
                      <Text style={[s.chipText, { color: P }]}>{tag}</Text>
                      <X size={12} color={P} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* ── 5. Mind State (multi-select) ── */}
            <View style={[s.card, { borderColor: `${P}30` }]}>
              <SectionLabel icon={<Text style={{ fontSize: FONT_LABEL() }}>🧠</Text>} text={T('sleepMindState') || '心理状态'} />
              <View style={s.chipRow}>
                {MIND_STATE_PRESETS.map(tag => {
                  const selected = mindState.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleTag(mindState, setMindState, tag)}
                      style={[
                        s.chip,
                        {
                          borderColor: selected ? P : TH.border,
                          backgroundColor: selected ? `${P}20` : 'transparent',
                        },
                      ]}
                    >
                      <Text style={[s.chipText, { color: selected ? P : TH.text }]}>{tag}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={s.customTagRow}>
                <TextInput
                  value={customMindTag}
                  onChangeText={setCustomMindTag}
                  placeholder={T('sleepCustomTag') || '自定义标签'}
                  placeholderTextColor={TH.sub}
                  style={[s.customTagInput, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
                  onSubmitEditing={() => addCustomTag(customMindTag, mindState, setMindState, () => setCustomMindTag(''))}
                />
                <TouchableOpacity
                  onPress={() => addCustomTag(customMindTag, mindState, setMindState, () => setCustomMindTag(''))}
                  style={[s.addTagBtn, { backgroundColor: P }]}
                >
                  <Text style={s.addTagBtnText}>{T('sleepAddTag') || '添加标签'}</Text>
                </TouchableOpacity>
              </View>
              {mindState.filter(t => !MIND_STATE_PRESETS.includes(t)).length > 0 && (
                <View style={[s.chipRow, { marginTop: 8 }]}>
                  {mindState.filter(t => !MIND_STATE_PRESETS.includes(t)).map(tag => (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleTag(mindState, setMindState, tag)}
                      style={[s.chip, { borderColor: P, backgroundColor: `${P}20` }]}
                    >
                      <Text style={[s.chipText, { color: P }]}>{tag}</Text>
                      <X size={12} color={P} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* ── 6. Note ── */}
            <View style={[s.card, { borderColor: `${P}30` }]}>
              <SectionLabel icon={<Text style={{ fontSize: FONT_LABEL() }}>📝</Text>} text={T('sleepNote') || '今日感悟'} />
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={T('sleepNotePlaceholder') || '记录今日感悟...'}
                placeholderTextColor={TH.sub}
                multiline
                numberOfLines={3}
                style={[s.noteInput, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
              />
            </View>

            {/* ── 7. Save Button ── */}
            <TouchableOpacity
              onPress={handleSave}
              style={[s.saveBtn, { backgroundColor: quality > 0 ? P : `${P}50` }]}
              disabled={quality === 0}
            >
              <Text style={s.saveBtnText}>{T('commonSave') || '保存'}</Text>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity onPress={onClose} style={[s.cancelBtn, { borderColor: TH.border }]}>
              <Text style={[s.cancelBtnText, { color: TH.sub }]}>{T('commonCancel') || '取消'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 40,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: FONT_TITLE(),
    fontWeight: '700',
  },

  // Cards
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionLabelText: {
    fontSize: FONT_BODY(),
    fontWeight: '600',
  },

  // Time inputs
  timeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  timeCol: {
    flex: 1,
  },
  timeLabel: {
    fontSize: FONT_SUB(),
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: FONT_BODY(),
    fontWeight: '600',
    textAlign: 'center',
  },
  durationBadge: {
    marginTop: 12,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  durationText: {
    fontSize: FONT_BODY(),
    fontWeight: '700',
  },

  // Star rating
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FONT_BODY(),
    fontWeight: '500',
  },

  // Custom tag
  customTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  customTagInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: FONT_SUB(),
  },
  addTagBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addTagBtnText: {
    color: '#fff',
    fontSize: FONT_SUB(),
    fontWeight: '600',
  },

  // Note
  noteInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: FONT_BODY(),
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Buttons
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: FONT_BODY(),
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 4,
  },
  cancelBtnText: {
    fontSize: FONT_BODY(),
  },
});
