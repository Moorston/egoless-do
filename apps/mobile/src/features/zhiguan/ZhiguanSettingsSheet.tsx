// ─── ZhiguanSettingsSheet 止观设置弹窗 ──────────────────────────
// 底部弹出 Sheet：呼吸节奏 / 目标时长 / 背景音 / 修行法 / 发愿
import {ZHIGUAN_METHOD_DEFS, FIVE_HINDRANCE_KEYS, FIVE_HINDRANCE_LABEL_KEYS, SANKALPA_TEMPLATES , FONT_SUB, FONT_BODY, FONT_LABEL, FONT_SMALL} from '@egoless-do/core';
import type { ZhiguanMethod, FiveHindranceRadar } from '@egoless-do/core';
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, Modal } from 'react-native';

import { useT } from '../../components/UI';

interface ZhiguanSettings {
  breathPattern: 'standard' | 'calming' | 'closing';
  targetMinutes: number | null;
  backgroundSound: 'none' | 'bell' | 'rain' | 'bowl';
  sankalpa: string;
  chosenMethod: ZhiguanMethod;
  fiveHindrances: FiveHindranceRadar;
  samathaRatio: number;
  vipassanaRatio: number;
}

interface Props {
  settings: ZhiguanSettings;
  onSave: (settings: ZhiguanSettings) => void;
  onClose: () => void;
}

const BREATH_OPTIONS = [
  { key: 'standard' as const, labelKey: 'zhiguanBreathStandard', value: '4-2-6' },
  { key: 'calming' as const, labelKey: 'zhiguanBreathCalming', value: '4-4-4' },
  { key: 'closing' as const, labelKey: 'zhiguanBreathClosing', value: '4-7-8' },
];

const TARGET_OPTIONS = [10, 15, 20, 30];

const SOUND_OPTIONS = [
  { key: 'none' as const, labelKey: 'zhiguanSoundNone' },
  { key: 'bell' as const, labelKey: 'zhiguanSoundBell' },
  { key: 'rain' as const, labelKey: 'zhiguanSoundRain' },
  { key: 'bowl' as const, labelKey: 'zhiguanSoundBowl' },
];

export default function ZhiguanSettingsSheet({ settings, onSave, onClose }: Props) {
  const T = useT();
  const [localSettings, setLocalSettings] = useState<ZhiguanSettings>(settings);

  const handleSave = () => {
    onSave(localSettings);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.handle} />

          <ScrollView style={styles.content}>
            {/* TODO(perf): each option group is tiny (BREATH_OPTIONS is 3, TARGET_OPTIONS is 4,
                SOUND_OPTIONS is 4, methods at most 6) — far below the above-50-item threshold for
                FlashList. Rendered inside a ScrollView, so leave as .map(). */}
            <Text style={styles.sectionTitle}>{T('zhiguanBreathRhythm')}</Text>
            <View style={styles.optionGroup}>
              {BREATH_OPTIONS.map(opt => (
                <Pressable
                  key={opt.key}
                  style={[styles.option, localSettings.breathPattern === opt.key && styles.optionActive]}
                  onPress={() => setLocalSettings(s => ({ ...s, breathPattern: opt.key as 'standard' | 'calming' | 'closing' }))}
                >
                  <Text style={[styles.optionText, localSettings.breathPattern === opt.key && styles.optionTextActive]}>
                    {T(opt.labelKey)}
                  </Text>
                  <Text style={styles.optionValue}>{opt.value}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>{T('zhiguanTargetDuration')}</Text>
            <View style={styles.optionGroup}>
              {TARGET_OPTIONS.map(min => (
                <Pressable
                  key={min}
                  style={[styles.option, localSettings.targetMinutes === min && styles.optionActive]}
                  onPress={() => setLocalSettings(s => ({ ...s, targetMinutes: min }))}
                >
                  <Text style={[styles.optionText, localSettings.targetMinutes === min && styles.optionTextActive]}>
                    {min} min
                  </Text>
                </Pressable>
              ))}
              <Pressable
                style={[styles.option, localSettings.targetMinutes === null && styles.optionActive]}
                onPress={() => setLocalSettings(s => ({ ...s, targetMinutes: null }))}
              >
                <Text style={[styles.optionText, localSettings.targetMinutes === null && styles.optionTextActive]}>
                  {T('zhiguanFreeDuration')}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>{T('zhiguanBackgroundSound')}</Text>
            <View style={styles.optionGroup}>
              {SOUND_OPTIONS.map(opt => (
                <Pressable
                  key={opt.key}
                  style={[styles.option, localSettings.backgroundSound === opt.key && styles.optionActive]}
                  onPress={() => setLocalSettings(s => ({ ...s, backgroundSound: opt.key as 'none' | 'bell' | 'rain' | 'bowl' }))}
                >
                  <Text style={[styles.optionText, localSettings.backgroundSound === opt.key && styles.optionTextActive]}>
                    {T(opt.labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Method Picker */}
            <Text style={styles.sectionTitle}>{T('zhiguanMethodTitle')}</Text>
            <View style={styles.optionGroup}>
              {ZHIGUAN_METHOD_DEFS.map(def => (
                <Pressable
                  key={def.key}
                  style={[styles.option, localSettings.chosenMethod === def.key && styles.optionActive]}
                  onPress={() => setLocalSettings(s => ({ ...s, chosenMethod: def.key }))}
                >
                  <Text style={[styles.optionText, localSettings.chosenMethod === def.key && styles.optionTextActive]}>
                    {def.icon} {T(def.labelKey)}
                  </Text>
                  <Text style={styles.optionValue}>{T(def.descKey)}</Text>
                </Pressable>
              ))}
            </View>

            {/* Five Hindrance Sliders */}
            <Text style={styles.sectionTitle}>{T('zhiguanFiveHindrancesTitle')}</Text>
            <Text style={{ fontSize: FONT_SMALL(), color: '#8B7355', marginBottom: 8 }}>{T('zhiguanFiveHindrancesHint')}</Text>
            {FIVE_HINDRANCE_KEYS.map((key, _idx) => (
              <View key={key} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: FONT_SUB(), color: '#4A3F35' }}>{T(FIVE_HINDRANCE_LABEL_KEYS[key])}</Text>
                  <Text style={{ fontSize: FONT_SUB(), color: '#C9A96E', fontWeight: '600' }}>{localSettings.fiveHindrances[key]}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: FONT_SMALL(), color: '#8B7355' }}>{T('zhiguanHindranceNone')}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {Array.from({ length: 11 }, (_, i) => (
                        <Pressable
                          key={i}
                          style={{
                            flex: 1, height: 24, borderRadius: 4,
                            backgroundColor: i <= localSettings.fiveHindrances[key] ? '#C9A96E' : '#E5DDD0',
                          }}
                          onPress={() => setLocalSettings(s => ({
                            ...s,
                            fiveHindrances: { ...s.fiveHindrances, [key]: i },
                          }))}
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={{ fontSize: FONT_SMALL(), color: '#8B7355' }}>{T('zhiguanHindranceSevere')}</Text>
                </View>
              </View>
            ))}

            {/* Sankalpa Templates + Text */}
            <Text style={styles.sectionTitle}>{T('zhiguanSankalpa')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
              {SANKALPA_TEMPLATES.map(tmpl => (
                <Pressable
                  key={tmpl.id}
                  style={[styles.chip, localSettings.sankalpa === tmpl.text && styles.chipActive]}
                  onPress={() => setLocalSettings(s => ({ ...s, sankalpa: tmpl.text }))}
                >
                  <Text style={[styles.chipText, localSettings.sankalpa === tmpl.text && styles.chipTextActive]}>
                    {T(tmpl.titleKey)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <TextInput
              style={styles.textInput}
              value={localSettings.sankalpa}
              onChangeText={text => setLocalSettings(s => ({ ...s, sankalpa: text }))}
              placeholder={T('zhiguanSankalpaPlaceholder')}
              placeholderTextColor="#8B7355"
              multiline
              maxLength={800}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{T('cancel')}</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>{T('save')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FAF7F2', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  handle: { width: 40, height: 4, backgroundColor: '#D1C7B7', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  content: { padding: 20 },
  sectionTitle: { fontSize: FONT_LABEL(), fontWeight: '600', color: '#4A3F35', marginTop: 20, marginBottom: 12 },
  optionGroup: { gap: 8 },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#F5EFE6', borderRadius: 10 },
  optionActive: { backgroundColor: '#C9A96E' },
  optionText: { fontSize: FONT_BODY(), color: '#4A3F35' },
  optionTextActive: { color: '#1A1A1F', fontWeight: '600' },
  optionValue: { fontSize: FONT_SUB(), color: '#8B7355' },
  textInput: { backgroundColor: '#F5EFE6', borderRadius: 10, padding: 14, fontSize: FONT_BODY(), color: '#4A3F35', minHeight: 80, textAlignVertical: 'top' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#F5EFE6', borderWidth: 1, borderColor: '#E5DDD0' },
  chipActive: { backgroundColor: '#C9A96E', borderColor: '#C9A96E' },
  chipText: { fontSize: FONT_SUB(), color: '#4A3F35' },
  chipTextActive: { color: '#1A1A1F', fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#E5DDD0' },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 20 },
  cancelButtonText: { fontSize: FONT_BODY(), color: '#8B7355' },
  saveButton: { backgroundColor: '#C9A96E', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  saveButtonText: { fontSize: FONT_BODY(), fontWeight: '600', color: '#1A1A1F' },
});
