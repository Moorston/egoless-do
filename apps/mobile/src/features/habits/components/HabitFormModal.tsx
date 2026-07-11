// ─── HabitFormModal: add/edit habit form ─────────────────────────
import {
  FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_LABEL,
  HABIT_LINK_COLORS,
} from '@egoless-do/core';
import type { HabitLink } from '@egoless-do/core';
import { X, Bell } from 'lucide-react-native';
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';

import TimePickerModal from '../../../components/TimePickerModal';
import { useTheme, useT ,
  PrimaryButton, Toggle, RowItem, ThemedInput,
} from '../../../components/UI';
import type { HabitFormState } from '../hooks/useHabitForm';

interface Props {
  visible: boolean;
  editingId: string | null;
  form: HabitFormState;
  setForm: React.Dispatch<React.SetStateAction<HabitFormState>>;
  showAlarmPicker: boolean;
  setShowAlarmPicker: (v: boolean) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function HabitFormModal({
  visible, editingId, form, setForm,
  showAlarmPicker, setShowAlarmPicker,
  onSave, onClose,
}: Props) {
  const TH = useTheme();
  const P = TH.primary;
  const T = useT();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.7)' }}
      >
        <View style={{
          backgroundColor: TH.cardSolid,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingHorizontal: 24, paddingBottom: 40, maxHeight: '92%',
        }}>
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between',
            alignItems: 'center', paddingTop: 20, marginBottom: 20,
          }}>
            <Text style={{ color: TH.text, fontWeight: '700', fontSize: FONT_TITLE() }}>
              {editingId ? T('habitEditTitle') : T('habitAddTitle')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={26} color={TH.sub} />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {/* Text inputs */}
            {[
              { label: T('habitName'), key: 'name' as const, ph: T('habitExample1') },
              { label: T('habitGoal'), key: 'goal' as const, ph: T('habitExample2') },
              { label: T('habitInsight'), key: 'insight' as const, ph: T('habitExample3') },
            ].map(({ label, key, ph }) => (
              <View key={key} style={{ marginBottom: 14 }}>
                <Text style={{ color: TH.sub, fontSize: FONT_LABEL(), marginBottom: 6 }}>{label}</Text>
                <ThemedInput
                  value={form[key]}
                  onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
                  placeholder={ph}
                />
              </View>
            ))}
            {/* Target days */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: TH.sub, fontSize: FONT_LABEL(), marginBottom: 6 }}>{T('habitTargetDays')}</Text>
              <ThemedInput
                value={String(form.targetDays)}
                onChangeText={v => setForm(f => ({ ...f, targetDays: v === '' ? 0 : +v }))}
                keyboardType="numeric"
              />
            </View>
            {/* Auto tag toggle */}
            <RowItem label={T('habitAutoTag')} sub={T('habitAutoTagDesc')}
              right={<Toggle on={form.createTag} onChange={() => setForm(f => ({ ...f, createTag: !f.createTag }))} />}
            />
            {/* Alarm reminder */}
            <RowItem
              label={T('habitAlarm')}
              sub={form.alarmEnabled
                ? `${String(form.alarmHour).padStart(2, '0')}:${String(form.alarmMinute).padStart(2, '0')}`
                : T('habitAlarmOff')
              }
              last
              right={<Toggle on={form.alarmEnabled} onChange={() => setForm(f => ({ ...f, alarmEnabled: !f.alarmEnabled }))} />}
            />
            {form.alarmEnabled && (
              <TouchableOpacity
                onPress={() => setShowAlarmPicker(true)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingVertical: 10, paddingHorizontal: 14,
                  borderRadius: 10, backgroundColor: `${P}10`, marginBottom: 14,
                }}
              >
                <Bell size={16} color={P} />
                <Text style={{ color: P, fontSize: FONT_BODY(), fontWeight: '600' }}>
                  {String(form.alarmHour).padStart(2, '0')}:{String(form.alarmMinute).padStart(2, '0')}
                </Text>
                <Text style={{ color: TH.sub, fontSize: FONT_SUB() }}>· {T('habitTapToModify')}</Text>
              </TouchableOpacity>
            )}
            {/* Linked module */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: TH.sub, fontSize: FONT_LABEL(), marginBottom: 8 }}>{T('habitLink')}</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {(['none', 'fasting', 'meditation', 'exercise', 'sleep'] as HabitLink[]).map(v => {
                  const isActive = (form.link ?? 'none') === v;
                  const color = HABIT_LINK_COLORS[v];
                  return (
                    <TouchableOpacity key={v} onPress={() => setForm(f => ({ ...f, link: v }))}
                      style={{
                        paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
                        alignItems: 'center',
                        backgroundColor: isActive ? `${color}20` : TH.card,
                        borderWidth: 1, borderColor: isActive ? color : TH.border,
                      }}>
                      <Text style={{
                        color: isActive ? color : TH.text,
                        fontSize: FONT_SMALL(),
                        fontWeight: isActive ? '700' : '400',
                      }}>
                        {T(`habitLink${v.charAt(0).toUpperCase() + v.slice(1)}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            {/* Link config: fasting */}
            {form.link === 'fasting' && (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ color: TH.sub, fontSize: FONT_LABEL(), marginBottom: 6 }}>
                  {T('planLinkFasting')} {T('planItemTarget')}（h）
                </Text>
                <ThemedInput
                  value={String(form.linkConfig?.targetHours ?? 16)}
                  onChangeText={v => setForm(f => ({ ...f, linkConfig: { ...f.linkConfig, targetHours: v === '' ? 0 : +v } }))}
                  keyboardType="numeric"
                />
              </View>
            )}
            {/* Link config: exercise */}
            {form.link === 'exercise' && (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ color: TH.sub, fontSize: FONT_LABEL(), marginBottom: 6 }}>
                  {T('planLinkExercise')} {T('planItemTarget')}（min）
                </Text>
                <ThemedInput
                  value={String(form.linkConfig?.targetMinutes ?? 30)}
                  onChangeText={v => setForm(f => ({ ...f, linkConfig: { ...f.linkConfig, targetMinutes: v === '' ? 0 : +v } }))}
                  keyboardType="numeric"
                />
              </View>
            )}
            <View style={{ height: 20 }} />
            <PrimaryButton label={editingId ? T('save') : T('createHabit')} onPress={onSave} />
          </ScrollView>
        </View>
        <TimePickerModal
          visible={showAlarmPicker}
          value={`${String(form.alarmHour).padStart(2, '0')}:${String(form.alarmMinute).padStart(2, '0')}`}
          onConfirm={(time) => {
            const [h, m] = time.split(':').map(Number);
            setForm(f => ({ ...f, alarmHour: h, alarmMinute: m }));
            setShowAlarmPicker(false);
          }}
          onClose={() => setShowAlarmPicker(false)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}
