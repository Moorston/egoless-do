import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme, PrimaryButton, OutlineButton } from '../../components/UI';
import { FONT_TITLE, FONT_SUB, FONT_BODY, FONT_SMALL, dateStr } from '@egoless-do/core';
import type { MindReflection } from '@egoless-do/core';
import { PlanItemForm, validatePlanItemForm } from '../plans/PlanItemForm';
import type { UnifiedPlanItemForm } from '@egoless-do/core';
import { useAppStore } from '../../store/useAppStore';
import DatePickerModal from '../../components/DatePickerModal';

interface CreatePlanFromReflectionModalProps {
  visible: boolean;
  reflection: MindReflection | null;
  onClose: () => void;
  onCreate: (reflectionId: string, form: UnifiedPlanItemForm) => void;
}

export function CreatePlanFromReflectionModal({
  visible,
  reflection,
  onClose,
  onCreate,
}: CreatePlanFromReflectionModalProps) {
  const TH = useTheme();
  const getActivePlan = useAppStore(s => s.getActivePlan);
  const activePlan = useMemo(() => getActivePlan(), [getActivePlan]);

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

  const [form, setForm] = useState<UnifiedPlanItemForm>(() => {
    const defaultName = reflection
      ? (reflection.content.split('\n').filter(l => l.trim())[0] || reflection.content).slice(0, 10)
      : '';
    return {
      name: defaultName,
      description: reflection?.content ?? '',
      targetMetric: '',
      startDate: defaultStart,
      endDate: defaultEnd,
      priority: 'medium',
    };
  });

  // Reset form when reflection changes
  React.useEffect(() => {
    if (reflection) {
      const firstLine = (reflection.content.split('\n').filter(l => l.trim())[0] || reflection.content).slice(0, 10);
      setForm({
        name: firstLine,
        description: reflection.content,
        targetMetric: '',
        startDate: defaultStart,
        endDate: defaultEnd,
        priority: 'medium',
      });
      setFormErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reflection?.id]);

  const handleSubmit = useCallback(() => {
    const errors = validatePlanItemForm(form, { requireTargetMetric: true });
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (reflection) {
      onCreate(reflection.id, { ...form, tags: reflection.tags });
    }
  }, [form, reflection, onCreate]);

  const handleClose = useCallback(() => {
    setFormErrors({});
    onClose();
  }, [onClose]);

  if (!reflection) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.7)' }}>
        <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, maxHeight: '90%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontWeight: '700', fontSize: FONT_TITLE, color: TH.text }}>创建计划任务</Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color={TH.sub} />
            </TouchableOpacity>
          </View>
          {activePlan && (
            <Text style={{ fontSize: FONT_SMALL, fontWeight: '600', color: TH.sub, marginBottom: 16 }}>
              关联计划: {activePlan.name}（{activePlan.startDate} ~ {activePlan.endDate}）
            </Text>
          )}
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <PlanItemForm
              initialValues={form}
              showTargetMetric
              showFrequency
              onChange={setForm}
              onDatePress={(field) => field === 'start' ? setShowStartPicker(true) : setShowEndPicker(true)}
              errors={formErrors}
            />

            {/* 任务链接（只读，显示感念标签） */}
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 6, fontWeight: '600' }}>任务链接</Text>
            <TextInput
              value={reflection.tags.join(', ')}
              editable={false}
              style={{
                borderWidth: 1, borderColor: TH.border, borderRadius: 8, padding: 10, marginBottom: 12,
                color: TH.sub, backgroundColor: TH.card, fontSize: FONT_BODY,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <OutlineButton label="取消" onPress={handleClose} style={{ flex: 1 }} />
              <PrimaryButton label="创建" onPress={handleSubmit} style={{ flex: 1 }} />
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
