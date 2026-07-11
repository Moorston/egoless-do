// ─── SessionComplete 禅修结束卡片 ────────────────────────────────
// 显示时长/日期 + 笔记 + 八触记录 + 禅定阶段 + 回向 + 完成/放弃
import {EIGHT_TACTILE_KEYS, EIGHT_TACTILE_LABEL_KEYS, EMPTY_EIGHT_TACTILE,
  SAM_STAGE_LABEL_KEYS, FONT_SUB, FONT_CARD_TITLE, FONT_STAT_CARD, FONT_BODY, FONT_SMALL, FONT_LABEL} from '@egoless-do/core';
import type { EightTactile, EightTactileKey, SamStage } from '@egoless-do/core';
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet } from 'react-native';

import { useT } from '../../components/UI';

interface ClosingData {
  closingNotes?: string;
  eightTactile?: EightTactile;
  selfReportedStage?: SamStage;
  selfReportedStageText?: string;
  dedicationId?: string;
}

interface Props {
  durationSec: number;
  startTime: number;
  sankalpa?: string;
  onSave: (data: ClosingData) => void;
  onAbandon: () => void;
}

export default function SessionComplete({ durationSec, startTime, sankalpa, onSave, onAbandon }: Props) {
  const T = useT();
  const [note, setNote] = useState('');
  const [eightTactile, setEightTactile] = useState<EightTactile>({ ...EMPTY_EIGHT_TACTILE });
  const [selfReportedStage, setSelfReportedStage] = useState<SamStage>('not_specified');
  const [selfReportedStageText, setSelfReportedStageText] = useState('');

  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  const dateStr = new Date(startTime).toLocaleDateString(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  const toggleTactile = (key: EightTactileKey) => {
    setEightTactile(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    onSave({
      closingNotes: note || undefined,
      eightTactile,
      selfReportedStage,
      selfReportedStageText: selfReportedStage === 'other' ? (selfReportedStageText || undefined) : undefined,
    });
  };

  const SAM_STAGES: SamStage[] = [
    'not_specified', 'scattered', 'desire_realm', 'preparation',
    'first_jhana', 'second_jhana', 'third_jhana', 'fourth_jhana', 'other',
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{T('zhiguanSessionComplete')}</Text>
      </View>

      <View style={styles.durationCard}>
        <Text style={styles.durationValue}>{minutes}</Text>
        <Text style={styles.durationUnit}>{T('zhiguanMinutes')}</Text>
        {seconds > 0 && (
          <Text style={styles.durationSeconds}>+{seconds}s</Text>
        )}
      </View>

      <Text style={styles.dateText}>{dateStr}</Text>

      {/* Eight Tactile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{T('zhiguanEightTactileTitle')}</Text>
        <Text style={styles.sectionHint}>{T('zhiguanEightTactileHint')}</Text>
        <View style={styles.chipGroup}>
          {EIGHT_TACTILE_KEYS.map((key, idx) => (
            <Pressable
              key={key}
              style={[styles.chip, eightTactile[key] && styles.chipActive]}
              onPress={() => toggleTactile(key)}
            >
              <Text style={[styles.chipText, eightTactile[key] && styles.chipTextActive]}>
                {T(EIGHT_TACTILE_LABEL_KEYS[key])}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Self-reported Stage */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{T('zhiguanSelfReportedTitle')}</Text>
        <Text style={styles.sectionHint}>{T('zhiguanSelfReportedHint')}</Text>
        <View style={styles.chipGroup}>
          {SAM_STAGES.map(stage => (
            <Pressable
              key={stage}
              style={[styles.chip, selfReportedStage === stage && styles.chipActive]}
              onPress={() => setSelfReportedStage(stage)}
            >
              <Text style={[styles.chipText, selfReportedStage === stage && styles.chipTextActive]}>
                {T(SAM_STAGE_LABEL_KEYS[stage])}
              </Text>
            </Pressable>
          ))}
        </View>
        {selfReportedStage === 'other' && (
          <TextInput
            style={[styles.textInput, { marginTop: 8, minHeight: 40 }]}
            value={selfReportedStageText}
            onChangeText={setSelfReportedStageText}
            placeholder={T('zhiguanSelfReportedOtherPlaceholder')}
            placeholderTextColor="#8B7355"
            maxLength={200}
          />
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{T('zhiguanClosingNotes')}</Text>
        <TextInput
          style={styles.textInput}
          value={note}
          onChangeText={setNote}
          placeholder={T('zhiguanClosingNotesPlaceholder')}
          placeholderTextColor="#8B7355"
          multiline
          maxLength={800}
        />
      </View>

      {sankalpa ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{T('zhiguanDedication')}</Text>
          <View style={styles.dedicationCard}>
            <Text style={styles.dedicationText}>{sankalpa}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>{T('zhiguanFinish')}</Text>
        </Pressable>
        <Pressable style={styles.abandonButton} onPress={onAbandon}>
          <Text style={styles.abandonButtonText}>{T('zhiguanAbandon')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F2' },
  content: { padding: 20 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: FONT_STAT_CARD(), fontWeight: '700', color: '#4A3F35' },
  durationCard: { alignItems: 'center', backgroundColor: '#F5EFE6', borderRadius: 16, padding: 24, marginBottom: 16 },
  durationValue: { fontSize: scaleFontSize(64), fontWeight: '300', color: '#C9A96E' },
  durationUnit: { fontSize: FONT_LABEL(), color: '#8B7355', marginTop: 4 },
  durationSeconds: { fontSize: FONT_SUB(), color: '#8B7355', marginTop: 2 },
  dateText: { fontSize: FONT_SUB(), color: '#8B7355', textAlign: 'center', marginBottom: 24 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: FONT_BODY(), fontWeight: '600', color: '#4A3F35', marginBottom: 6 },
  sectionHint: { fontSize: FONT_SMALL(), color: '#8B7355', marginBottom: 10 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#F5EFE6', borderWidth: 1, borderColor: '#E5DDD0' },
  chipActive: { backgroundColor: '#C9A96E', borderColor: '#C9A96E' },
  chipText: { fontSize: FONT_SUB(), color: '#4A3F35' },
  chipTextActive: { color: '#1A1A1F', fontWeight: '600' },
  textInput: { backgroundColor: '#F5EFE6', borderRadius: 10, padding: 14, fontSize: FONT_BODY(), color: '#4A3F35', minHeight: 80, textAlignVertical: 'top' },
  dedicationCard: { backgroundColor: '#F5EFE6', borderRadius: 10, padding: 14 },
  dedicationText: { fontSize: FONT_SUB(), color: '#4A3F35', lineHeight: 22 },
  actions: { gap: 12, marginTop: 20 },
  saveButton: { backgroundColor: '#C9A96E', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { fontSize: FONT_CARD_TITLE(), fontWeight: '600', color: '#1A1A1F' },
  abandonButton: { paddingVertical: 14, alignItems: 'center' },
  abandonButtonText: { fontSize: FONT_BODY(), color: '#8B7355' },
});
