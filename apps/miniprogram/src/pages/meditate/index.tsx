import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { useAppStore, THEMES, t } from '@egoless/core';
import { Card, Btn, Modal } from '../../components/helpers';

const sounds = [
  { key: 'ocean', label: '🌊 海浪声' },
  { key: 'rain', label: '🌧️ 雨声' },
  { key: 'birds', label: '🐦 鸟叫声' },
  { key: 'bowl', label: '🔔 钵声' },
  { key: 'flowing-stream', label: '💧 流水声' },
  { key: 'wind-chimes', label: '🎐 风铃声' },
  { key: 'none', label: '🔇 无' },
];

const durations = [1, 5, 10, 15, 30, 60, 120, 180, 300];

export default function Meditate() {
  const themeName = useAppStore((s) => s.themeName);
  const TH = THEMES[themeName];
  const lang = useAppStore((s) => s.lang);
  const T = (k: string) => t(k, lang);
  const totalMedMin = useAppStore((s) => s.totalMedMin);
  const addMedSession = useAppStore((s) => s.addMedSession);
  const medHistory = useAppStore((s) => s.medHistory);

  const [showStart, setShowStart] = useState(false);
  const [selectedSound, setSelectedSound] = useState('ocean');
  const [duration, setDuration] = useState(10);
  const [remaining, setRemaining] = useState(0);
  const [active, setActive] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (active && remaining > 0) {
      timerRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(timerRef.current);
            setActive(false);
            addMedSession(duration);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [active, remaining]);

  function handleStart() {
    setRemaining(duration * 60);
    setActive(true);
    setShowStart(false);
  }

  function handleStop() {
    const elapsed = duration * 60 - remaining;
    clearInterval(timerRef.current);
    setActive(false);
    if (elapsed > 10) addMedSession(Math.round(elapsed / 60));
    setRemaining(0);
  }

  return (
    <ScrollView style={{ minHeight: '100vh', padding: '14px 16px', background: TH.bg }}>
      {/* Stats Card */}
      <Card style={{ textAlign: 'center', padding: 24 }}>
        <Text style={{ fontSize: 48, fontWeight: '800', color: TH.primary, display: 'block' }}>{totalMedMin}</Text>
        <Text style={{ fontSize: 13, color: TH.sub, marginTop: 4, display: 'block' }}>累计冥想 (分钟)</Text>
      </Card>

      {active ? (
        <>
          <Card style={{ textAlign: 'center', padding: 32 }}>
            <Text style={{ fontSize: 56, fontWeight: '800', color: '#fff', display: 'block' }}>
              {String(Math.floor(remaining / 60)).padStart(2, '0')}:
              {String(remaining % 60).padStart(2, '0')}
            </Text>
            <Text style={{ fontSize: 13, color: TH.sub, marginTop: 6, display: 'block' }}>冥想中 🧘</Text>
            <Text style={{ fontSize: 12, color: TH.sub, marginTop: 4, display: 'block' }}>
              背景音: {sounds.find((s) => s.key === selectedSound)?.label}
            </Text>
          </Card>
          <Btn onClick={handleStop} style={{ background: '#ef4444' }}>结束冥想</Btn>
        </>
      ) : (
        <>
          <Btn onClick={() => setShowStart(true)}>开始冥想</Btn>
          <Card
            onClick={() => setShowHistory(true)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          >
            <Text style={{ fontSize: 14, color: TH.text, fontWeight: '500' }}>📜 冥想历史</Text>
            <Text style={{ fontSize: 12, color: TH.sub }}>{'>'}</Text>
          </Card>
        </>
      )}

      {/* Start Modal */}
      <Modal show={showStart} onClose={() => setShowStart(false)} title="🧘 冥想设置">
        <Text style={{ fontSize: 13, color: TH.sub, marginBottom: 8, display: 'block' }}>背景音乐</Text>
        <View style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {sounds.filter((s) => s.key !== 'none').map((s) => (
            <View key={s.key} onClick={() => setSelectedSound(s.key)}
              style={{
                padding: '6px 12px', borderRadius: 16,
                background: selectedSound === s.key ? TH.primary : 'rgba(255,255,255,.08)',
                color: selectedSound === s.key ? '#fff' : TH.sub, fontSize: 12,
              }}>
              <Text>{s.label}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 13, color: TH.sub, marginBottom: 8, display: 'block' }}>时长（分钟）</Text>
        <View style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {durations.map((d) => (
            <View key={d} onClick={() => setDuration(d)}
              style={{
                padding: '6px 14px', borderRadius: 16,
                background: duration === d ? TH.primary : 'rgba(255,255,255,.08)',
                color: duration === d ? '#fff' : TH.sub, fontSize: 12,
              }}>
              <Text>{d}分</Text>
            </View>
          ))}
        </View>
        <Btn onClick={handleStart}>开始冥想（{duration}分钟）</Btn>
      </Modal>

      {/* History Modal */}
      <Modal show={showHistory} onClose={() => setShowHistory(false)} title="📜 冥想历史">
        {medHistory.length === 0 ? (
          <Text style={{ textAlign: 'center', fontSize: 13, color: TH.sub, padding: 20, display: 'block' }}>暂无记录</Text>
        ) : (
          medHistory.slice(0, 20).map((m: any, i: number) => (
            <View key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.05)',
            }}>
              <Text style={{ fontSize: 12, color: TH.sub }}>{m.date}</Text>
              <Text style={{ fontSize: 12, color: TH.text }}>{m.dur}</Text>
              <Text style={{ fontSize: 12, color: TH.primary }}>{m.mood}</Text>
            </View>
          ))
        )}
      </Modal>
    </ScrollView>
  );
}
