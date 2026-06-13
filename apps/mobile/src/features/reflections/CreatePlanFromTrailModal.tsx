import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme, useT } from '../../components/UI';
import { FONT_SMALL, FONT_BODY, FONT_TITLE } from '@egoless-do/core';
import type { PlanItemPriority } from '@egoless-do/core';
import type { TrailInsightCache } from '@egoless-do/core';

interface CreatePlanFromTrailModalProps {
  visible: boolean;
  insightCache?: TrailInsightCache;
  onCreate: (form: { name: string; description: string; priority: PlanItemPriority; startDate: string; endDate: string }) => void;
  onClose: () => void;
}

const PRIORITY_OPTIONS: { value: PlanItemPriority; label: string; color: string }[] = [
  { value: 'high', label: '高', color: '#EF4444' },
  { value: 'medium', label: '中', color: '#F59E0B' },
  { value: 'low', label: '低', color: '#10B981' },
];

export function CreatePlanFromTrailModal({
  visible,
  insightCache,
  onCreate,
  onClose,
}: CreatePlanFromTrailModalProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PlanItemPriority>('medium');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [selectedSuggestions, setSelectedSuggestions] = useState<number[]>([]);
  const autoFilled = useRef(false);

  useEffect(() => {
    if (visible && insightCache?.summary && !autoFilled.current) {
      setName(insightCache.summary);
      autoFilled.current = true;
    }
    if (!visible) {
      autoFilled.current = false;
    }
  }, [visible, insightCache]);

  const suggestions = useMemo(() => {
    return insightCache?.suggestions ?? [];
  }, [insightCache]);

  const handleToggleSuggestion = useCallback((idx: number) => {
    setSelectedSuggestions(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  }, []);

  const handleApplySelected = useCallback(() => {
    if (suggestions.length === 0) return;
    const selected = selectedSuggestions.map(i => suggestions[i]).filter(Boolean);
    if (selected.length === 1) {
      setName(selected[0]);
    } else if (selected.length > 1) {
      setName(selected[0]);
      setDescription(selected.slice(1).join('\n'));
    }
  }, [suggestions, selectedSuggestions]);

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), description: description.trim(), priority, startDate, endDate });
    setName('');
    setDescription('');
    setPriority('medium');
    onClose();
  }, [name, description, priority, startDate, endDate, onCreate, onClose]);

  const handleClose = useCallback(() => {
    setName('');
    setDescription('');
    setPriority('medium');
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: TH.cardSolid }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: TH.text }]}>{T('trailPlanTitle')}</Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color={TH.sub} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* AI 建议 */}
            {suggestions.length > 0 && (
              <View style={styles.suggestionSection}>
                <Text style={[styles.sectionLabel, { color: TH.sub }]}>
                  💡 {T('trailPlanAISuggestions')}
                </Text>
                {suggestions.map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.suggestionItem,
                      { borderColor: TH.border },
                      selectedSuggestions.includes(i) && { backgroundColor: `${P}15`, borderColor: P },
                    ]}
                    onPress={() => handleToggleSuggestion(i)}
                  >
                    <Text style={[styles.suggestionText, { color: TH.text }]}>
                      {selectedSuggestions.includes(i) ? '✓ ' : '○ '}{s}
                    </Text>
                  </TouchableOpacity>
                ))}
                {selectedSuggestions.length > 0 && (
                  <TouchableOpacity
                    style={[styles.applyButton, { backgroundColor: P }]}
                    onPress={handleApplySelected}
                  >
                    <Text style={styles.applyText}>{T('trailPlanApplySelected')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* 表单 */}
            <Text style={[styles.inputLabel, { color: TH.sub }]}>任务名称</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="任务名称"
              placeholderTextColor={TH.sub}
              style={[styles.input, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
            />

            <Text style={[styles.inputLabel, { color: TH.sub }]}>描述</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="描述（可选）"
              placeholderTextColor={TH.sub}
              multiline
              style={[styles.input, styles.textArea, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
            />

            {/* 优先级 */}
            <Text style={[styles.inputLabel, { color: TH.sub }]}>优先级</Text>
            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.priorityButton,
                    { borderColor: TH.border },
                    priority === opt.value && { backgroundColor: `${opt.color}20`, borderColor: opt.color },
                  ]}
                  onPress={() => setPriority(opt.value)}
                >
                  <Text style={[styles.priorityText, { color: priority === opt.value ? opt.color : TH.text }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 日期 */}
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={[styles.inputLabel, { color: TH.sub }]}>开始日期</Text>
                <TextInput
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={TH.sub}
                  style={[styles.input, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
                />
              </View>
              <View style={styles.dateField}>
                <Text style={[styles.inputLabel, { color: TH.sub }]}>结束日期</Text>
                <TextInput
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={TH.sub}
                  style={[styles.input, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
                />
              </View>
            </View>
          </ScrollView>

          {/* 操作按钮 */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.actionButton, { borderColor: TH.border }]}
            >
              <Text style={{ color: TH.sub }}>{T('commonCancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreate}
              style={[styles.actionButton, { backgroundColor: P }]}
              disabled={!name.trim()}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>{T('commonConfirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: FONT_TITLE,
    fontWeight: '700',
  },
  scrollContent: {
    maxHeight: 400,
  },
  suggestionSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: FONT_SMALL,
    fontWeight: '600',
    marginBottom: 8,
  },
  suggestionItem: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 6,
  },
  suggestionText: {
    fontSize: FONT_SMALL,
    lineHeight: 18,
  },
  applyButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  applyText: {
    color: '#fff',
    fontSize: FONT_SMALL,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: FONT_SMALL,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: FONT_BODY,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  priorityText: {
    fontSize: FONT_SMALL,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
