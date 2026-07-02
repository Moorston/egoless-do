// ─── ZhiguanSettingsSheet 止观设置弹窗 ──────────────────────────
// 底部弹出 Sheet：呼吸节奏 / 目标时长 / 背景音 / 发愿
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, Modal } from 'react-native';
import { useT } from '../../components/UI';

interface ZhiguanSettings {
  breathPattern: 'standard' | 'calming' | 'closing';
  targetMinutes: number | null;
  backgroundSound: 'none' | 'bell' | 'rain' | 'bowl';
  sankalpa: string;
}

interface Props {
  settings: ZhiguanSettings;
  onSave: (settings: ZhiguanSettings) => void;
  onClose: () => void;
}

const BREATH_OPTIONS = [
  { key: 'standard', labelKey: 'zhiguanBreathStandard', value: '4-2-6' },
  { key: 'calming', labelKey: 'zhiguanBreathCalming', value: '4-4-4' },
  { key: 'closing', labelKey: 'zhiguanBreathClosing', value: '4-7-8' },
];

const TARGET_OPTIONS = [10, 15, 20, 30];

const SOUND_OPTIONS = [
  { key: 'none', labelKey: 'zhiguanSoundNone' },
  { key: 'bell', labelKey: 'zhiguanSoundBell' },
  { key: 'rain', labelKey: 'zhiguanSoundRain' },
  { key: 'bowl', labelKey: 'zhiguanSoundBowl' },
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
            <Text style={styles.sectionTitle}>{T('zhiguanBreathRhythm')}</Text>
            <View style={styles.optionGroup}>
              {BREATH_OPTIONS.map(opt => (
                <Pressable
                  key={opt.key}
                  style={[styles.option, localSettings.breathPattern === opt.key && styles.optionActive]}
                  onPress={() => setLocalSettings(s => ({ ...s, breathPattern: opt.key as any }))}
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
                  onPress={() => setLocalSettings(s => ({ ...s, backgroundSound: opt.key as any }))}
                >
                  <Text style={[styles.optionText, localSettings.backgroundSound === opt.key && styles.optionTextActive]}>
                    {T(opt.labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>{T('zhiguanSankalpa')}</Text>
            <TextInput
              style={styles.textInput}
              value={localSettings.sankalpa}
              onChangeText={text => setLocalSettings(s => ({ ...s, sankalpa: text }))}
              placeholder={T('zhiguanSankalpaPlaceholder')}
              placeholderTextColor="#8B7355"
              multiline
              maxLength={200}
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
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#4A3F35', marginTop: 20, marginBottom: 12 },
  optionGroup: { gap: 8 },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#F5EFE6', borderRadius: 10 },
  optionActive: { backgroundColor: '#C9A96E' },
  optionText: { fontSize: 15, color: '#4A3F35' },
  optionTextActive: { color: '#1A1A1F', fontWeight: '600' },
  optionValue: { fontSize: 13, color: '#8B7355' },
  textInput: { backgroundColor: '#F5EFE6', borderRadius: 10, padding: 14, fontSize: 15, color: '#4A3F35', minHeight: 80, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#E5DDD0' },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 20 },
  cancelButtonText: { fontSize: 15, color: '#8B7355' },
  saveButton: { backgroundColor: '#C9A96E', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  saveButtonText: { fontSize: 15, fontWeight: '600', color: '#1A1A1F' },
});
