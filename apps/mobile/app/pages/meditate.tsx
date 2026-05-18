import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useAppStore, THEMES, t, RED } from '@egoless/core';
import { fmtMS } from '@egoless/core';

const DURATIONS = [1, 5, 10, 15, 30, 60, 120, 180, 300];
const SOUNDS = ['海潮', '雨声', '钵声', '森林', '无'];

export default function MeditateScreen() {
  const themeName = useAppStore((s) => s.themeName);
  const TH = THEMES[themeName];
  const P = TH.primary;
  const lang = useAppStore((s) => s.lang);
  const T = (k: string) => t(k, lang);

  const totalMedMin = useAppStore((s) => s.totalMedMin);
  const medHistory = useAppStore((s) => s.medHistory);
  const addMedSession = useAppStore((s) => s.addMedSession);

  const [durMin, setDurMin] = useState(5);
  const [sound, setSound] = useState('海潮');
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(5 * 60);
  const [showHistory, setShowHistory] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    setRemaining(durMin * 60);
  }, [durMin]);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(ref.current);
            setRunning(false);
            addMedSession(durMin);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } else {
      clearInterval(ref.current);
    }
    return () => clearInterval(ref.current);
  }, [running, durMin, addMedSession]);

  return (
    <ScrollView style={[s.bg, { backgroundColor: TH.bg }]} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <View style={[s.totalCard, { backgroundColor: TH.card, borderColor: TH.border }]}>
        <Text style={[s.totalNum, { color: P }]}>{totalMedMin}</Text>
        <Text style={{ color: TH.sub, fontSize: 13 }}>{T('accMed')}</Text>
      </View>

      <View style={[s.card, { backgroundColor: TH.card, borderColor: TH.border }]}>
        {running ? (
          <View style={{ alignItems: 'center', padding: 20 }}>
            <View style={{ backgroundColor: `${P}18`, borderRadius: 20, padding: 28, marginBottom: 20, alignItems: 'center', width: '100%' }}>
              <Text style={{ fontSize: 50, fontWeight: '800', color: P, letterSpacing: 2 }}>{fmtMS(remaining)}</Text>
              <Text style={{ color: TH.sub, fontSize: 13, marginTop: 6 }}>打坐中...</Text>
            </View>
            <TouchableOpacity onPress={() => setRunning(false)} style={{ paddingHorizontal: 48, paddingVertical: 12, borderRadius: 12, backgroundColor: RED }}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>{T('stopMed')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={{ fontSize: 13, color: TH.sub, marginBottom: 8 }}>{T('bgMusic')}</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {SOUNDS.map((s) => (
                <TouchableOpacity key={s} onPress={() => setSound(s)}
                  style={[s.chip, { borderColor: sound === s ? P : TH.border, backgroundColor: sound === s ? `${P}30` : 'transparent' }]}>
                  <Text style={{ color: sound === s ? '#fff' : TH.sub, fontSize: 12 }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {DURATIONS.map((d) => (
                <TouchableOpacity key={d} onPress={() => setDurMin(d)}
                  style={[s.durBtn, { borderColor: durMin === d ? P : TH.border, backgroundColor: durMin === d ? P : 'transparent' }]}>
                  <Text style={{ color: durMin === d ? '#fff' : TH.sub, fontWeight: durMin === d ? '700' : '400', fontSize: 13 }}>{d}分钟</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => { setRemaining(durMin * 60); setRunning(true); }} style={[s.primaryBtn, { backgroundColor: P }]}>
              <Text style={s.btnTxt}>{T('startMed')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={[s.card, { backgroundColor: TH.card, borderColor: TH.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: TH.text }}>今日打坐</Text>
          <Text style={{ color: P, fontWeight: '600' }}>{totalMedMin} 分钟</Text>
        </View>
      </View>

      <TouchableOpacity onPress={() => {}} style={[s.primaryBtn, { backgroundColor: P, marginBottom: 12 }]}>
        <Text style={s.btnTxt}>{T('shareMed')}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setShowHistory((v) => !v)}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontWeight: '600', fontSize: 15, color: TH.text }}>{T('meditationHistory')}</Text>
        <Text style={{ color: P, fontSize: 12 }}>{showHistory ? '收起' : '展开'} ›</Text>
      </TouchableOpacity>
      {showHistory ? (
        <View style={[s.card, { backgroundColor: TH.card, borderColor: TH.border }]}>
          {medHistory.map((m, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: i < medHistory.length - 1 ? 1 : 0, borderBottomColor: TH.border }}>
              <View>
                <Text style={{ fontWeight: '600', color: TH.text }}>{m.date}</Text>
                <Text style={{ color: TH.sub, fontSize: 12, marginTop: 2 }}>{m.mood}</Text>
              </View>
              <Text style={{ fontWeight: '700', color: P }}>{m.dur}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  totalCard: { borderRadius: 16, padding: 20, marginBottom: 12, alignItems: 'center', borderWidth: 1 },
  totalNum: { fontSize: 36, fontWeight: '800' },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  durBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1 },
  primaryBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
