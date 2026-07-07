import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE } from '@egoless-do/core';
import type { DedicationType, DedicationSettings, Theme } from '@egoless-do/core';
import { X } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Switch } from 'react-native';

interface Props {
  visible: boolean;
  TH: Theme;
  T: (key: string) => string;
  settings: DedicationSettings;
  onClose: () => void;
  onSave: (settings: Partial<DedicationSettings>) => void;
}

const FREQUENCY_OPTIONS: { key: DedicationType; labelKey: string }[] = [
  { key: 'weekly', labelKey: 'vowDedWeekly' },
  { key: 'biweekly', labelKey: 'vowDedBiweekly' },
  { key: 'monthly', labelKey: 'vowDedMonthly' },
  { key: 'custom', labelKey: 'vowDedCustom' },
];

const DAY_OPTIONS = [
  { value: 0, label: '周日' },
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
];

export default function DedicationSettingsModal({ visible, TH, T, settings, onClose, onSave }: Props) {
  const [frequency, setFrequency] = useState<DedicationType>(settings.frequency);
  const [dayOfWeek, setDayOfWeek] = useState(settings.dayOfWeek ?? 0);
  const [dayOfMonth, setDayOfMonth] = useState(settings.dayOfMonth ?? 1);
  const [customDays, setCustomDays] = useState(settings.customDays ?? 14);
  const [remindEnabled, setRemindEnabled] = useState(settings.remindEnabled);

  useEffect(() => {
    if (visible) {
      setFrequency(settings.frequency);
      setDayOfWeek(settings.dayOfWeek ?? 0);
      setDayOfMonth(settings.dayOfMonth ?? 1);
      setCustomDays(settings.customDays ?? 14);
      setRemindEnabled(settings.remindEnabled);
    }
  }, [visible, settings]);

  const handleSave = () => {
    onSave({
      frequency,
      dayOfWeek,
      dayOfMonth,
      customDays,
      remindEnabled,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
      }}>
        <View style={{
          backgroundColor: TH.cardSolid,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: 24, maxHeight: '75%',
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>
              {T('vowDedSettings')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color={TH.sub} />
            </TouchableOpacity>
          </View>

          {/* Frequency */}
          <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text, marginBottom: 8 }}>
            {T('vowDedFrequency')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {FREQUENCY_OPTIONS.map(opt => {
              const active = frequency === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setFrequency(opt.key)}
                  style={{
                    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10,
                    backgroundColor: active ? '#8B5CF620' : TH.card,
                    borderWidth: 1, borderColor: active ? '#8B5CF6' : TH.border,
                  }}
                >
                  <Text style={{
                    fontSize: FONT_BADGE, fontWeight: active ? '600' : '400',
                    color: active ? '#8B5CF6' : TH.sub,
                  }}>
                    {T(opt.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Day of week (for weekly/biweekly) */}
          {(frequency === 'weekly' || frequency === 'biweekly') && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text, marginBottom: 8 }}>
                {T('vowDedDay')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {DAY_OPTIONS.map(day => {
                  const active = dayOfWeek === day.value;
                  return (
                    <TouchableOpacity
                      key={day.value}
                      onPress={() => setDayOfWeek(day.value)}
                      style={{
                        paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
                        backgroundColor: active ? '#8B5CF620' : TH.card,
                        borderWidth: 1, borderColor: active ? '#8B5CF6' : TH.border,
                      }}
                    >
                      <Text style={{
                        fontSize: FONT_BADGE,
                        color: active ? '#8B5CF6' : TH.sub,
                        fontWeight: active ? '600' : '400',
                      }}>
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Day of month (for monthly) */}
          {frequency === 'monthly' && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text, marginBottom: 8 }}>
                {T('vowDedDay')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[1, 7, 14, 21, 28].map(d => {
                  const active = dayOfMonth === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setDayOfMonth(d)}
                      style={{
                        paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8,
                        backgroundColor: active ? '#8B5CF620' : TH.card,
                        borderWidth: 1, borderColor: active ? '#8B5CF6' : TH.border,
                      }}
                    >
                      <Text style={{
                        fontSize: FONT_BADGE,
                        color: active ? '#8B5CF6' : TH.sub,
                        fontWeight: active ? '600' : '400',
                      }}>
                        {d}日
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Custom days (for custom) */}
          {frequency === 'custom' && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text, marginBottom: 8 }}>
                天数
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[7, 14, 21, 30].map(d => {
                  const active = customDays === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setCustomDays(d)}
                      style={{
                        paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8,
                        backgroundColor: active ? '#8B5CF620' : TH.card,
                        borderWidth: 1, borderColor: active ? '#8B5CF6' : TH.border,
                      }}
                    >
                      <Text style={{
                        fontSize: FONT_BADGE,
                        color: active ? '#8B5CF6' : TH.sub,
                        fontWeight: active ? '600' : '400',
                      }}>
                        {d}天
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Remind toggle */}
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingVertical: 12, borderTopWidth: 1, borderTopColor: `${TH.border}40`,
          }}>
            <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{T('vowDedRemind')}</Text>
            <Switch
              value={remindEnabled}
              onValueChange={setRemindEnabled}
              trackColor={{ false: TH.border, true: '#8B5CF650' }}
              thumbColor={remindEnabled ? '#8B5CF6' : TH.sub}
            />
          </View>

          {/* Buttons */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1, padding: 14, borderRadius: 12,
                borderWidth: 1, borderColor: TH.border, alignItems: 'center',
              }}
            >
              <Text style={{ color: TH.sub, fontSize: FONT_BODY, fontWeight: '600' }}>{T('vowCancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={{
                flex: 1, padding: 14, borderRadius: 12,
                backgroundColor: '#8B5CF6', alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: FONT_BODY, fontWeight: '700' }}>{T('vowSave')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
