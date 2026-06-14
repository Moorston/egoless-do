import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
} from 'react-native';
import { useTheme } from '../../components/UI';
import { FONT_SMALL, FONT_BODY } from '@egoless-do/core';
import type { PlanItemPriority, UnifiedPlanItemForm, CheckinFrequency } from '@egoless-do/core';
import { FREQUENCY_OPTIONS, createDefaultFrequency } from '@egoless-do/core';

export function validatePlanItemForm(
  form: UnifiedPlanItemForm,
  opts?: { requireTargetMetric?: boolean },
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = '请输入任务名称';
  if (opts?.requireTargetMetric && !form.targetMetric?.trim()) errors.targetMetric = '请输入任务目标';
  if (form.endDate < form.startDate) errors.date = '结束日期不能早于开始日期';
  return errors;
}

export type { UnifiedPlanItemForm as PlanItemFormValue };

interface PlanItemFormProps {
  initialValues?: Partial<UnifiedPlanItemForm>;
  showTargetMetric?: boolean;
  showFrequency?: boolean;
  onChange: (form: UnifiedPlanItemForm) => void;
  onDatePress?: (field: 'start' | 'end') => void;
  errors?: Record<string, string>;
}

const PRIORITY_OPTIONS: { value: PlanItemPriority; label: string; color: string }[] = [
  { value: 'high', label: '高', color: '#EF4444' },
  { value: 'medium', label: '中', color: '#F59E0B' },
  { value: 'low', label: '低', color: '#10B981' },
];

const FREQ_MODE_LABELS: Record<string, string> = {
  daily: '每天',
  interval: '间隔',
  weekly: '每周',
  weekly_fixed: '每周固定',
  monthly: '每月',
  monthly_fixed: '每月固定',
};

const today = new Date().toISOString().slice(0, 10);
const defaultEnd = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
})();

export function PlanItemForm({
  initialValues,
  showTargetMetric,
  showFrequency,
  onChange,
  onDatePress,
  errors = {},
}: PlanItemFormProps) {
  const TH = useTheme();

  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [targetMetric, setTargetMetric] = useState(initialValues?.targetMetric ?? '');
  const [startDate, setStartDate] = useState(initialValues?.startDate ?? today);
  const [endDate, setEndDate] = useState(initialValues?.endDate ?? defaultEnd);
  const [priority, setPriority] = useState<PlanItemPriority>(initialValues?.priority ?? 'medium');
  const [frequency, setFrequency] = useState<CheckinFrequency>(initialValues?.frequency ?? { mode: 'daily' });
  const [draftInputs, setDraftInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraftInputs({});
  }, [frequency.mode]);

  useEffect(() => {
    if (initialValues) {
      if (initialValues.name !== undefined) setName(initialValues.name);
      if (initialValues.description !== undefined) setDescription(initialValues.description);
      if (initialValues.targetMetric !== undefined) setTargetMetric(initialValues.targetMetric);
      if (initialValues.startDate !== undefined) setStartDate(initialValues.startDate);
      if (initialValues.endDate !== undefined) setEndDate(initialValues.endDate);
      if (initialValues.priority !== undefined) setPriority(initialValues.priority);
      if (initialValues.frequency !== undefined) setFrequency(initialValues.frequency);
    }
  }, [initialValues]);

  const emitChange = useCallback((patch: Partial<UnifiedPlanItemForm>) => {
    const next = { name, description, targetMetric, startDate, endDate, priority, frequency, ...patch };
    onChange(next);
  }, [name, description, targetMetric, startDate, endDate, priority, frequency, onChange]);

  const handleNameChange = useCallback((v: string) => {
    setName(v);
    emitChange({ name: v });
  }, [emitChange]);

  const handleDescChange = useCallback((v: string) => {
    setDescription(v);
    emitChange({ description: v });
  }, [emitChange]);

  const handleMetricChange = useCallback((v: string) => {
    setTargetMetric(v);
    emitChange({ targetMetric: v });
  }, [emitChange]);

  const handlePriorityChange = useCallback((p: PlanItemPriority) => {
    setPriority(p);
    emitChange({ priority: p });
  }, [emitChange]);

  const P = TH.primary;

  return (
    <>
      {/* 任务名称 */}
      <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginBottom: 6, fontWeight: '600' }}>
        任务名称 *
      </Text>
      <TextInput
        value={name}
        onChangeText={handleNameChange}
        placeholder="输入任务名称"
        placeholderTextColor={TH.sub}
        maxLength={10}
        style={{
          borderWidth: 1, borderColor: errors.name ? '#EF4444' : TH.border,
          borderRadius: 8, padding: 10, marginBottom: 12,
          color: TH.text, backgroundColor: TH.card, fontSize: FONT_BODY,
        }}
      />
      {errors.name && (
        <Text style={{ color: '#EF4444', fontSize: FONT_SMALL, marginTop: -8, marginBottom: 12 }}>
          {errors.name}
        </Text>
      )}

      {/* 任务目标 */}
      {showTargetMetric && (
        <>
          <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginBottom: 6, fontWeight: '600' }}>
            任务目标 *
          </Text>
          <TextInput
            value={targetMetric}
            onChangeText={handleMetricChange}
            placeholder="例如：每周复盘3次"
            placeholderTextColor={TH.sub}
            style={{
              borderWidth: 1, borderColor: errors.targetMetric ? '#EF4444' : TH.border,
              borderRadius: 8, padding: 10, marginBottom: 12,
              color: TH.text, backgroundColor: TH.card, fontSize: FONT_BODY,
            }}
          />
          {errors.targetMetric && (
            <Text style={{ color: '#EF4444', fontSize: FONT_SMALL, marginTop: -8, marginBottom: 12 }}>
              {errors.targetMetric}
            </Text>
          )}
        </>
      )}

      {/* 任务描述 */}
      <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginBottom: 6, fontWeight: '600' }}>任务描述</Text>
      <TextInput
        value={description}
        onChangeText={handleDescChange}
        placeholder="添加任务描述..."
        placeholderTextColor={TH.sub}
        multiline
        numberOfLines={2}
        style={{
          borderWidth: 1, borderColor: TH.border, borderRadius: 8, padding: 10,
          marginBottom: 12, color: TH.text, backgroundColor: TH.card,
          fontSize: FONT_BODY, minHeight: 60, textAlignVertical: 'top',
        }}
      />

      {/* 日期 */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginBottom: 6, fontWeight: '600' }}>开始日期</Text>
          <TouchableOpacity
            onPress={() => onDatePress?.('start')}
            style={{
              borderWidth: 1, borderColor: TH.border, borderRadius: 8, padding: 10, marginBottom: 12,
              backgroundColor: TH.card,
            }}
          >
            <Text style={{ color: TH.text, fontSize: FONT_BODY }}>{startDate}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginBottom: 6, fontWeight: '600' }}>结束日期</Text>
          <TouchableOpacity
            onPress={() => onDatePress?.('end')}
            style={{
              borderWidth: 1, borderColor: TH.border, borderRadius: 8, padding: 10, marginBottom: 12,
              backgroundColor: TH.card,
            }}
          >
            <Text style={{ color: TH.text, fontSize: FONT_BODY }}>{endDate}</Text>
          </TouchableOpacity>
        </View>
      </View>
      {errors.date && (
        <Text style={{ color: '#EF4444', fontSize: FONT_SMALL, marginTop: -8, marginBottom: 12 }}>
          {errors.date}
        </Text>
      )}

      {/* 打卡频率 */}
      {showFrequency && (
        <>
          <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginBottom: 6, fontWeight: '600' }}>打卡频率</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 6 }}>
            {FREQUENCY_OPTIONS.map(opt => {
              const active = (frequency.mode ?? 'daily') === opt.mode;
              return (
                <TouchableOpacity
                  key={opt.mode}
                  onPress={() => {
                    const f = opt.mode === 'daily' ? { mode: 'daily' as const } : createDefaultFrequency(opt.mode);
                    setFrequency(f);
                    emitChange({ frequency: f });
                  }}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                    backgroundColor: active ? P : TH.card,
                    borderWidth: 1, borderColor: active ? P : TH.border,
                  }}
                >
                  <Text style={{ color: active ? '#fff' : TH.sub, fontSize: FONT_SMALL, fontWeight: active ? '600' : '400' }}>
                    {FREQ_MODE_LABELS[opt.mode] ?? opt.mode}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 每N天 */}
          {frequency.mode === 'interval' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>每</Text>
              <TextInput
                value={draftInputs.interval ?? String(frequency.every ?? '')}
                onChangeText={v => {
                  setDraftInputs(prev => ({ ...prev, interval: v }));
                  const n = parseInt(v);
                  if (!isNaN(n) && n > 0) {
                    const f: CheckinFrequency = { mode: 'interval', every: n };
                    setFrequency(f);
                    emitChange({ frequency: f });
                  }
                }}
                keyboardType="number-pad"
                style={{
                  width: 60, textAlign: 'center', borderWidth: 1, borderColor: TH.border,
                  borderRadius: 8, padding: 6, color: TH.text, backgroundColor: TH.card, fontSize: FONT_BODY,
                }}
              />
              <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>天</Text>
            </View>
          )}

          {/* 每周N次 */}
          {frequency.mode === 'weekly' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>每周</Text>
              <TextInput
                value={draftInputs.weekly ?? String(frequency.target ?? '')}
                onChangeText={v => {
                  setDraftInputs(prev => ({ ...prev, weekly: v }));
                  const n = parseInt(v);
                  if (!isNaN(n) && n >= 1 && n <= 7) {
                    const f: CheckinFrequency = { mode: 'weekly', target: n };
                    setFrequency(f);
                    emitChange({ frequency: f });
                  }
                }}
                keyboardType="number-pad"
                style={{
                  width: 60, textAlign: 'center', borderWidth: 1, borderColor: TH.border,
                  borderRadius: 8, padding: 6, color: TH.text, backgroundColor: TH.card, fontSize: FONT_BODY,
                }}
              />
              <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>次</Text>
            </View>
          )}

          {/* 固定星期 */}
          {frequency.mode === 'weekly_fixed' && (
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {[0, 1, 2, 3, 4, 5, 6].map(d => {
                const active = frequency.days.includes(d);
                const label = ['日', '一', '二', '三', '四', '五', '六'][d];
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => {
                      const days = active ? frequency.days.filter(x => x !== d) : [...frequency.days, d].sort();
                      const f: CheckinFrequency = { mode: 'weekly_fixed', days };
                      setFrequency(f);
                      emitChange({ frequency: f });
                    }}
                    style={{
                      width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: active ? P : TH.card,
                      borderWidth: 1, borderColor: active ? P : TH.border,
                    }}
                  >
                    <Text style={{ color: active ? '#fff' : TH.sub, fontSize: FONT_SMALL, fontWeight: active ? '700' : '400' }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* 每月N次 */}
          {frequency.mode === 'monthly' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>每月</Text>
              <TextInput
                value={draftInputs.monthly ?? String(frequency.target ?? '')}
                onChangeText={v => {
                  setDraftInputs(prev => ({ ...prev, monthly: v }));
                  const n = parseInt(v);
                  if (!isNaN(n) && n >= 1 && n <= 31) {
                    const f: CheckinFrequency = { mode: 'monthly', target: n };
                    setFrequency(f);
                    emitChange({ frequency: f });
                  }
                }}
                keyboardType="number-pad"
                style={{
                  width: 60, textAlign: 'center', borderWidth: 1, borderColor: TH.border,
                  borderRadius: 8, padding: 6, color: TH.text, backgroundColor: TH.card, fontSize: FONT_BODY,
                }}
              />
              <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>次</Text>
            </View>
          )}

          {/* 固定日期 */}
          {frequency.mode === 'monthly_fixed' && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => {
                const active = frequency.dates.includes(d);
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => {
                      const dates = active ? frequency.dates.filter(x => x !== d) : [...frequency.dates, d].sort((a, b) => a - b);
                      const f: CheckinFrequency = { mode: 'monthly_fixed', dates };
                      setFrequency(f);
                      emitChange({ frequency: f });
                    }}
                    style={{
                      width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: active ? P : TH.card,
                      borderWidth: 1, borderColor: active ? P : TH.border,
                    }}
                  >
                    <Text style={{ color: active ? '#fff' : TH.sub, fontSize: FONT_SMALL, fontWeight: active ? '700' : '400' }}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* 优先级 */}
      <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginBottom: 6, fontWeight: '600' }}>优先级</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
        {PRIORITY_OPTIONS.map(p => (
          <TouchableOpacity
            key={p.value}
            onPress={() => handlePriorityChange(p.value)}
            style={{
              flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
              borderColor: priority === p.value ? p.color : TH.border,
              backgroundColor: priority === p.value ? `${p.color}20` : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text style={{
              color: priority === p.value ? p.color : TH.text,
              fontWeight: priority === p.value ? '600' : '400',
              fontSize: FONT_SMALL,
            }}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}
