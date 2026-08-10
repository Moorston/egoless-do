import {FONT_TITLE, FONT_SMALL, dateStr} from '@egoless-do/core';
import type { TrailInsightCache, UnifiedPlanItemForm } from '@egoless-do/core';
import { X } from 'lucide-react-native';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import DatePickerModal from '../../../components/DatePickerModal';
import { useTheme, useT, PrimaryButton, OutlineButton } from '../../../components/UI';
import { useAppStore, type MobileStore } from '../../../store/useAppStore';
import { PlanItemForm, validatePlanItemForm } from '../../plan/components/PlanItemForm';

interface CreatePlanFromTrailModalProps {
  visible: boolean;
  insightCache?: TrailInsightCache;
  onCreate: (form: UnifiedPlanItemForm) => void;
  onClose: () => void;
}

export function CreatePlanFromTrailModal({
  visible,
  insightCache,
  onCreate,
  onClose,
}: CreatePlanFromTrailModalProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;
  const getActivePlan = useAppStore(useShallow((s: MobileStore) => s.getActivePlan));
  const activePlan = useMemo(() => getActivePlan(), [getActivePlan]);

  const [selectedSuggestions, setSelectedSuggestions] = useState<number[]>([]);
  const autoFilled = useRef(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const today = dateStr();
  const planStart = activePlan?.startDate ?? today;
  const planEnd = activePlan?.endDate;

  const defaultStart = today >= planStart ? today : planStart;
  const defaultEnd = planEnd ?? (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return dateStr(d);
  })();

  const [form, setForm] = useState<UnifiedPlanItemForm>({
    name: '',
    description: '',
    targetMetric: '',
    startDate: defaultStart,
    endDate: defaultEnd,
    priority: 'medium',
  });

  useEffect(() => {
    if (visible) {
      setForm(f => ({ ...f, startDate: defaultStart, endDate: defaultEnd }));
    }
    if (!visible) {
      autoFilled.current = false;
      setFormErrors({});
      setSelectedSuggestions([]);
    }
  }, [visible, defaultStart, defaultEnd]);

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
      setForm(f => ({ ...f, name: selected[0] }));
    } else if (selected.length > 1) {
      setForm(f => ({ ...f, name: selected[0], description: selected.slice(1).join('\n') }));
    }
  }, [suggestions, selectedSuggestions]);

  const handleSubmit = useCallback(() => {
    const errors = validatePlanItemForm(form, { requireTargetMetric: false });
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onCreate(form);
  }, [form, onCreate]);

  const handleClose = useCallback(() => {
    setFormErrors({});
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.7)' }}>
        <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, maxHeight: '90%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontWeight: '700', fontSize: FONT_TITLE(), color: TH.text }}>{T('trailPlanTitle')}</Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color={TH.sub} />
            </TouchableOpacity>
          </View>

          {activePlan && (
            <Text style={{ fontSize: FONT_SMALL(), fontWeight: '600', color: TH.sub, marginBottom: 16 }}>
              {T('planGoal')}: {activePlan.name}（{activePlan.startDate} ~ {activePlan.endDate}）
            </Text>
          )}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* AI 建议 */}
            {suggestions.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: FONT_SMALL(), fontWeight: '600', color: TH.sub, marginBottom: 8 }}>
                  💡 {T('trailPlanAISuggestions')}
                </Text>
                {suggestions.map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    style={{
                      padding: 10, borderWidth: 1, borderRadius: 8, marginBottom: 6,
                      borderColor: selectedSuggestions.includes(i) ? P : TH.border,
                      backgroundColor: selectedSuggestions.includes(i) ? `${P}15` : 'transparent',
                    }}
                    onPress={() => handleToggleSuggestion(i)}
                  >
                    <Text style={{ fontSize: FONT_SMALL(), lineHeight: 18, color: TH.text }}>
                      {selectedSuggestions.includes(i) ? '✓ ' : '○ '}{s}
                    </Text>
                  </TouchableOpacity>
                ))}
                {selectedSuggestions.length > 0 && (
                  <TouchableOpacity
                    style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', marginTop: 8, backgroundColor: P }}
                    onPress={handleApplySelected}
                  >
                    <Text style={{ color: '#fff', fontSize: FONT_SMALL(), fontWeight: '600' }}>{T('trailPlanApplySelected')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* 表单 */}
            <PlanItemForm
              initialValues={form}
              showTargetMetric
              showFrequency
              onChange={setForm}
              onDatePress={(field) => field === 'start' ? setShowStartPicker(true) : setShowEndPicker(true)}
              errors={formErrors}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <OutlineButton label={T('commonCancel')} onPress={handleClose} style={{ flex: 1 }} />
              <PrimaryButton label={T('commonConfirm')} onPress={handleSubmit} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={showStartPicker}
        value={form.startDate}
        onConfirm={(date) => { setForm(f => ({ ...f, startDate: date })); setShowStartPicker(false); }}
        onClose={() => setShowStartPicker(false)}
        minDate={defaultStart}
        maxDate={form.endDate}
      />
      <DatePickerModal
        visible={showEndPicker}
        value={form.endDate}
        onConfirm={(date) => { setForm(f => ({ ...f, endDate: date })); setShowEndPicker(false); }}
        onClose={() => setShowEndPicker(false)}
        minDate={form.startDate}
        maxDate={planEnd}
      />
    </Modal>
  );
}
