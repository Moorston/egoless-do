import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useAppStore, THEMES, t, ORANGE, GREEN, RED, YELLOW } from '@egoless/core';
import { fmt } from '@egoless/core';

export default function FastingScreen() {
  const themeName = useAppStore((s) => s.themeName);
  const TH = THEMES[themeName];
  const lang = useAppStore((s) => s.lang);
  const T = (k: string) => t(k, lang);
  const prim = TH.primary;

  const fastingSession = useAppStore((s) => s.fastingSession);
  const fastHistory = useAppStore((s) => s.fastHistory);
  const startFasting = useAppStore((s) => s.startFasting);
  const stopFasting = useAppStore((s) => s.stopFasting);

  const [elapsed, setElapsed] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [showDurModal, setShowDurModal] = useState(false);
  const [tmpDur, setTmpDur] = useState(8);
  const [agreed, setAgreed] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (fastingSession) {
      ref.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - fastingSession.startedAt) / 1000));
      }, 1000);
    } else {
      clearInterval(ref.current);
      setElapsed(0);
    }
    return () => clearInterval(ref.current);
  }, [fastingSession]);

  const pct = fastingSession ? Math.min(elapsed / (fastingSession.targetHours * 3600), 1) : 0;
  const kcal = Math.round(elapsed / 3600 * 32);
  const kg = (kcal / 7700).toFixed(2);

  const cs = { backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border };

  return (
    <ScrollView style={[s.bg, { backgroundColor: TH.bg }]} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <Text style={[s.pageTitle, { color: TH.text }]}>{T('fasting')}</Text>

      <View style={cs}>
        {fastingSession ? (
          <>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 160, height: 160, position: 'relative', marginBottom: 8 }}>
                <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: prim }}>{fmt(elapsed)}</Text>
                  <Text style={{ fontSize: 11, color: TH.sub }}>目标 {fastingSession.targetHours}h</Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: TH.sub }}>禁食进行中 🔥 {Math.round(pct * 100)}%</Text>
            </View>
            <TouchableOpacity onPress={stopFasting} style={[s.redBtn, { backgroundColor: RED }]}>
              <Text style={s.btnTxt}>{T('stopFasting')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => { setTmpDur(8); setAgreed(false); setShowDurModal(true); }} style={[s.primaryBtn, { backgroundColor: prim }]}>
              <Text style={s.btnTxt}>{T('startFasting')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => startFasting(8)} style={[s.primaryBtn, { backgroundColor: GREEN, marginTop: 10 }]}>
              <Text style={s.btnTxt}>{T('quickStart')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <View style={[s.statCard, { backgroundColor: ORANGE }]}>
          <Text style={{ fontSize: 26 }}>🔥</Text>
          <Text style={s.statLabel}>节省卡路里</Text>
          <Text style={s.statValue}>{kcal} <Text style={{ fontSize: 12 }}>kcal</Text></Text>
        </View>
        <View style={[s.statCard, { backgroundColor: GREEN }]}>
          <Text style={{ fontSize: 26 }}>⚖️</Text>
          <Text style={s.statLabel}>预计减重</Text>
          <Text style={s.statValue}>{kg} <Text style={{ fontSize: 12 }}>公斤</Text></Text>
        </View>
      </View>

      {/* Health tips */}
      <View style={cs}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Text style={{ fontSize: 18 }}>⚠️</Text>
          <Text style={{ fontWeight: '700', fontSize: 15, color: YELLOW }}>健康提示</Text>
        </View>
        {['禁食期间多喝水','感到不适请立即停止','建议从短时间开始','禁食前后避免暴饮暴食'].map((tip, i, arr) => (
          <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: i < arr.length - 1 ? 8 : 0 }}>
            <Text style={{ color: TH.sub, fontSize: 13, marginTop: 1 }}>•</Text>
            <Text style={{ fontSize: 13, color: TH.sub, lineHeight: 22 }}>{tip}</Text>
          </View>
        ))}
      </View>

      {/* History */}
      <TouchableOpacity onPress={() => setShowHistory((v) => !v)}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontWeight: '600', fontSize: 15, color: TH.text }}>{T('fastingHistory')}</Text>
        <Text style={{ color: prim, fontSize: 12 }}>{showHistory ? '收起' : '展开'} ›</Text>
      </TouchableOpacity>
      {showHistory ? (
        <View style={cs}>
          {fastHistory.map((h, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: i < fastHistory.length - 1 ? 1 : 0, borderBottomColor: TH.border }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: TH.text }}>{h.date}</Text>
                <Text style={{ fontSize: 12, color: TH.sub, marginTop: 2 }}>约 {h.kcal} kcal</Text>
              </View>
              <Text style={{ fontWeight: '700', color: prim, fontSize: 15 }}>{h.dur}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Duration Modal */}
      {showDurModal ? (
        <View style={s.modalOverlay}>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, alignSelf: 'center' }}>
            <Text style={{ fontWeight: '700', fontSize: 18, textAlign: 'center', marginBottom: 20, color: TH.text }}>选择时长</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
              {[1, 2, 4, 6, 8, 10, 12].map((d) => (
                <TouchableOpacity key={d} onPress={() => setTmpDur(d)}
                  style={{ width: 72, padding: 12, borderRadius: 12, borderWidth: 0, backgroundColor: tmpDur === d ? prim : TH.card, alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700', fontSize: 16, color: tmpDur === d ? '#fff' : TH.text }}>{d}h</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ backgroundColor: 'rgba(255,248,200,.08)', borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', gap: 8 }}>
              <Text>⚠️</Text>
              <View>
                <Text style={{ fontWeight: '600', fontSize: 13, color: '#FCD34D', marginBottom: 4 }}>温馨提示</Text>
                <Text style={{ fontSize: 12, color: TH.sub }}>请听从身体的声音，感到不适请立即停止。</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setAgreed((v) => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: agreed ? prim : TH.border, backgroundColor: agreed ? prim : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {agreed ? <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text> : null}
              </View>
              <Text style={{ fontSize: 13, color: TH.text }}>我已了解</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowDurModal(false)}
                style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                <Text style={{ color: TH.sub, fontSize: 14 }}>{T('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={!agreed} onPress={() => { startFasting(tmpDur); setShowDurModal(false); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 0, backgroundColor: agreed ? prim : 'rgba(128,128,128,.2)', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>⏰ 开始</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  pageTitle: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  primaryBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  redBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6 },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,.85)', textAlign: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#fff' },
  modalOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'center', padding: 24, zIndex: 200 },
});
