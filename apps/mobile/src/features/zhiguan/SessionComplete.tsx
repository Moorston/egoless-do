// ─── SessionComplete 禅修结束卡片 ────────────────────────────────
// 显示时长/轮数/日期 + 可选笔记 + 回向 + 完成/放弃按钮
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useT } from '../../components/UI';

interface Props {
  durationSec: number;
  startTime: number;
  sankalpa?: string;
  onSave: (note?: string) => void;
  onAbandon: () => void;
}

export default function SessionComplete({ durationSec, startTime, sankalpa, onSave, onAbandon }: Props) {
  const T = useT();
  const [note, setNote] = useState('');

  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  const dateStr = new Date(startTime).toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  const handleSave = () => {
    onSave(note || undefined);
  };

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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{T('zhiguanSessionNote')}</Text>
        <TextInput
          style={styles.textInput}
          value={note}
          onChangeText={setNote}
          placeholder={T('zhiguanSessionNotePlaceholder')}
          placeholderTextColor="#8B7355"
          multiline
          maxLength={500}
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
  title: { fontSize: 24, fontWeight: '700', color: '#4A3F35' },
  durationCard: { alignItems: 'center', backgroundColor: '#F5EFE6', borderRadius: 16, padding: 24, marginBottom: 16 },
  durationValue: { fontSize: 64, fontWeight: '300', color: '#C9A96E' },
  durationUnit: { fontSize: 16, color: '#8B7355', marginTop: 4 },
  durationSeconds: { fontSize: 14, color: '#8B7355', marginTop: 2 },
  dateText: { fontSize: 13, color: '#8B7355', textAlign: 'center', marginBottom: 24 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#4A3F35', marginBottom: 10 },
  textInput: { backgroundColor: '#F5EFE6', borderRadius: 10, padding: 14, fontSize: 15, color: '#4A3F35', minHeight: 80, textAlignVertical: 'top' },
  dedicationCard: { backgroundColor: '#F5EFE6', borderRadius: 10, padding: 14 },
  dedicationText: { fontSize: 14, color: '#4A3F35', lineHeight: 22 },
  actions: { gap: 12, marginTop: 20 },
  saveButton: { backgroundColor: '#C9A96E', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { fontSize: 17, fontWeight: '600', color: '#1A1A1F' },
  abandonButton: { paddingVertical: 14, alignItems: 'center' },
  abandonButtonText: { fontSize: 15, color: '#8B7355' },
});
