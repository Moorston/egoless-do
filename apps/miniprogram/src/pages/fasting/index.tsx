import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { useAppStore, THEMES, t } from '@egoless/core';
import { Card, Btn, Modal } from '../../components/helpers';

export default function Fasting() {
  const themeName = useAppStore((s) => s.themeName);
  const TH = THEMES[themeName];
  const lang = useAppStore((s) => s.lang);
  const T = (k: string) => t(k, lang);

  const session = useAppStore((s) => s.fastingSession);
  const startFasting = useAppStore((s) => s.startFasting);
  const stopFasting = useAppStore((s) => s.stopFasting);
  const fastHistory = useAppStore((s) => s.fastHistory);

  const [showPicker, setShowPicker] = useState(false);
  const [disclaimer, setDisclaimer] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (session) {
      const tick = () => setElapsed(Math.floor((Date.now() - session.startedAt) / 1000));
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      setElapsed(0);
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [session]);

  const durations = [1, 2, 4, 6, 8, 10, 12, 16];

  function handleStart(hours: number) {
    if (!disclaimer) return;
    startFasting(hours);
    setShowPicker(false);
  }

  function handleStop() {
    stopFasting();
  }

  const activeKcal = Math.round(elapsed / 3600 * 32);
  const activeWeight = (activeKcal / 7700).toFixed(3);
  const progress = session ? Math.min(100, (elapsed / (session.targetHours * 3600)) * 100) : 0;

  return (
    <ScrollView style={{ minHeight: '100vh', padding: '14px 16px', background: TH.bg }}>
      {session ? (
        <>
          <Card style={{ textAlign: 'center', padding: 24 }}>
            <Text style={{ fontSize: 48, fontWeight: '800', color: '#fff', display: 'block' }}>
              {String(Math.floor(elapsed / 3600)).padStart(2, '0')}:
              {String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')}:
              {String(elapsed % 60).padStart(2, '0')}
            </Text>
            <Text style={{ fontSize: 13, color: TH.sub, marginTop: 6, display: 'block' }}>已禁食时长</Text>
            <View style={{ height: 6, background: 'rgba(255,255,255,.1)', borderRadius: 3, marginTop: 14, overflow: 'hidden' }}>
              <View style={{ width: `${progress}%`, height: '100%', background: TH.primary, borderRadius: 3 }} />
            </View>
            <Text style={{ fontSize: 11, color: TH.sub, marginTop: 6, display: 'block' }}>
              目标 {session.targetHours} 小时 • {progress.toFixed(0)}%
            </Text>
          </Card>
          <View style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <Card style={{ textAlign: 'center', padding: 12 }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: TH.primary, display: 'block' }}>{activeKcal}</Text>
              <Text style={{ fontSize: 11, color: TH.sub, marginTop: 2, display: 'block' }}>消耗热量 (kcal)</Text>
            </Card>
            <Card style={{ textAlign: 'center', padding: 12 }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: TH.primary, display: 'block' }}>{activeWeight}</Text>
              <Text style={{ fontSize: 11, color: TH.sub, marginTop: 2, display: 'block' }}>预估减重 (kg)</Text>
            </Card>
          </View>
          <Btn onClick={handleStop} style={{ background: '#ef4444' }}>停止禁食</Btn>
        </>
      ) : (
        <>
          <Card style={{ textAlign: 'center', padding: 24 }}>
            <Text style={{ fontSize: 40 }}>⏳</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: TH.text, marginTop: 8, display: 'block' }}>当前没有进行中的禁食</Text>
            <Text style={{ fontSize: 12, color: TH.sub, marginTop: 4, display: 'block' }}>点击下方开始禁食</Text>
          </Card>
          <Btn onClick={() => { setShowPicker(true); setDisclaimer(false); }}>开始禁食</Btn>
          <Btn onClick={() => { startFasting(8); }} style={{ background: 'rgba(255,255,255,.08)', color: TH.text, fontSize: 13 }}>
            快速开始（8小时）
          </Btn>

          <Card>
            <Text style={{ fontSize: 14, fontWeight: '600', color: TH.text, marginBottom: 8, display: 'block' }}>
              📊 统计
            </Text>
            <View style={{ display: 'flex', justifyContent: 'space-around' }}>
              <View style={{ textAlign: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: TH.primary, display: 'block' }}>
                  {fastHistory.reduce((a: any, f: any) => a + f.kcal, 0)}
                </Text>
                <Text style={{ fontSize: 11, color: TH.sub, display: 'block' }}>累计消耗</Text>
              </View>
              <View style={{ textAlign: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: TH.primary, display: 'block' }}>
                  {(fastHistory.reduce((a: any, f: any) => a + f.kcal, 0) / 7700).toFixed(2)}
                </Text>
                <Text style={{ fontSize: 11, color: TH.sub, display: 'block' }}>预估减重 (kg)</Text>
              </View>
            </View>
          </Card>

          <Card>
            <Text style={{ fontSize: 12, color: TH.sub, lineHeight: 1.6 }}>
              💡 禁食小贴士：建议从8小时开始，逐步延长到12-16小时。保持充足饮水，如感不适请立即停止。
            </Text>
          </Card>

          {fastHistory.length > 0 && (
            <Card>
              <Text style={{ fontSize: 14, fontWeight: '600', color: TH.text, marginBottom: 8, display: 'block' }}>
                📜 禁食历史
              </Text>
              {fastHistory.slice(0, 10).map((f: any, i: number) => (
                <View key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.05)',
                }}>
                  <Text style={{ fontSize: 12, color: TH.sub }}>{f.date}</Text>
                  <Text style={{ fontSize: 12, color: TH.text }}>{f.dur}</Text>
                  <Text style={{ fontSize: 12, color: TH.primary }}>{f.kcal}kcal</Text>
                </View>
              ))}
            </Card>
          )}
        </>
      )}

      {/* Duration Picker Modal */}
      <Modal show={showPicker} onClose={() => setShowPicker(false)} title="⏳ 选择禁食时长">
        <View style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {durations.map((h) => (
            <View key={h} onClick={() => disclaimer && handleStart(h)}
              style={{
                padding: '10px 0', borderRadius: 10, textAlign: 'center',
                background: 'rgba(255,255,255,.08)', fontSize: 14, color: '#E0E0E0',
              }}>
              <Text>{h} 小时</Text>
            </View>
          ))}
        </View>
        <View onClick={() => setDisclaimer(!disclaimer)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <View style={{
            width: 18, height: 18, borderRadius: 3, border: '2px solid',
            borderColor: disclaimer ? TH.primary : 'rgba(255,255,255,.2)',
            background: disclaimer ? TH.primary : 'transparent',
          }} />
          <Text style={{ fontSize: 12, color: TH.sub }}>我已了解禁食注意事项，自愿开始</Text>
        </View>
        <Btn onClick={() => disclaimer && handleStart(8)}
          style={{ marginTop: 12, opacity: disclaimer ? 1 : 0.5 }}>
          开始
        </Btn>
      </Modal>
    </ScrollView>
  );
}
