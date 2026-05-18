import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useAppStore, THEMES, t, SPORT_GROUPS, SPORT_BG_COLORS } from '@egoless/core';
import type { SportItem } from '@egoless/core';

export default function ExerciseScreen() {
  const themeName = useAppStore((s) => s.themeName);
  const TH = THEMES[themeName];
  const P = TH.primary;
  const lang = useAppStore((s) => s.lang);
  const T = (k: string) => t(k, lang);

  const [showOtherList, setShowOtherList] = useState(false);
  const [selectedSport, setSelectedSport] = useState<SportItem | null>(null);
  const [showPrep, setShowPrep] = useState(false);
  const [showActive, setShowActive] = useState(false);
  const [runSec, setRunSec] = useState(0);
  const [runActive, setRunActive] = useState(false);
  const runRef = useRef<ReturnType<typeof setInterval>>();
  const [activeSec, setActiveSec] = useState(0);
  const [activePaused, setActivePaused] = useState(false);
  const activeRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (runActive) {
      runRef.current = setInterval(() => setRunSec((s) => s + 1), 1000);
    } else {
      clearInterval(runRef.current);
    }
    return () => clearInterval(runRef.current);
  }, [runActive]);

  useEffect(() => {
    if (showActive && !activePaused) {
      activeRef.current = setInterval(() => setActiveSec((s) => s + 1), 1000);
    } else {
      clearInterval(activeRef.current);
    }
    return () => clearInterval(activeRef.current);
  }, [showActive, activePaused]);

  const cs = { backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border, position: 'relative' as const, zIndex: 1 };

  if (showActive && selectedSport) {
    const bg = SPORT_BG_COLORS[selectedSport.key] || '#4CAF50';
    const fmtMS = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s2 = sec % 60;
      return `${String(m).padStart(2, '0')}:${String(s2).padStart(2, '0')}`;
    };
    return (
      <View style={{ flex: 1, backgroundColor: '#2a2835' }}>
        <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.08)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 18 }}>{selectedSport.icon}</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#bbb' }}>{selectedSport.key}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Text style={{ color: '#aaa', fontSize: 16 }}>❤️</Text>
            <Text style={{ color: '#10B981', fontSize: 16 }}>↗</Text>
            <Text style={{ color: '#10B981', fontSize: 16 }}>✏️</Text>
          </View>
        </View>

        <View style={{ backgroundColor: 'rgba(255,255,255,.06)', margin: 16, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(255,255,255,.1)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 18 }}>🎵</Text>
          </View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>选择运动音乐</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>让音乐陪伴你的每一次运动</Text>
          </View>
        </View>

        <View style={{ flex: 1, padding: 28 }}>
          <Text style={{ fontSize: 88, fontWeight: '900', color: '#fff' }}>{Math.floor(activeSec / 60) || 0}</Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,.45)', marginTop: 6, marginBottom: 48 }}>总消耗</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 40 }}>
            <View style={{ width: '40%' }}>
              <Text style={{ fontSize: 38, fontWeight: '800', color: '#fff' }}>{fmtMS(activeSec)}</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>总时长</Text>
            </View>
            <View style={{ width: '40%' }}>
              <Text style={{ fontSize: 38, fontWeight: '800', color: '#fff' }}>0.{String(Math.floor(activeSec / 15)).padStart(2, '0')}</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>爬升高度</Text>
            </View>
          </View>
        </View>

        <View style={{ padding: 24, paddingBottom: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,.1)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, color: '#fff' }}>🔓</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActivePaused((v) => !v)}
            style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 28, color: '#333' }}>{activePaused ? '▶' : '⏸'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setShowActive(false); setShowPrep(false); setActiveSec(0); }}
            style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,.1)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, color: '#fff' }}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showPrep && selectedSport) {
    const bg = SPORT_BG_COLORS[selectedSport.key] || '#4CAF50';
    return (
      <View style={[s.bg, { backgroundColor: TH.bg }]}>
        <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16 }}>{selectedSport.icon}</Text>
            <Text style={{ fontWeight: '600', fontSize: 15, color: TH.text }}>{selectedSport.key}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Text style={{ fontSize: 20 }}>❤️ 🎵 ⚙️</Text>
          </View>
        </View>

        <View style={{ margin: 16, borderRadius: 18, height: 260, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <Text style={{ fontSize: 72 }}>{selectedSport.icon}</Text>
          <View style={{ position: 'absolute', bottom: 12, left: 12, right: 12, backgroundColor: 'rgba(255,255,255,.85)', borderRadius: 12, padding: 10, flexDirection: 'row', gap: 8 }}>
            <Text style={{ fontSize: 16 }}>💡</Text>
            <Text style={{ fontSize: 12, color: '#333', flex: 1 }}>{selectedSport.key}运动数据将自动记录。请确保健康权限已开启，以获取更准确的数据。</Text>
          </View>
        </View>

        <View style={{ padding: 16 }}>
          <TouchableOpacity onPress={() => { setActiveSec(0); setActivePaused(false); setShowActive(true); }}
            style={{ height: 64, borderRadius: 32, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 28, letterSpacing: 2 }}>GO</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => { setShowPrep(false); setShowOtherList(true); }}
          style={{ alignSelf: 'center', padding: 8 }}>
          <Text style={{ color: TH.sub, fontSize: 13 }}>← 返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.bg, { backgroundColor: TH.bg }]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text style={{ fontWeight: '600', fontSize: 15, color: TH.sub, marginBottom: 12 }}>{T('selectExercise')}</Text>

        {[
          { icon: '🚶', label: '行走/徒步', sport: '行走' },
          { icon: '🏃', label: '跑步', sport: '跑步' },
          { icon: '🚴', label: '骑行', sport: '骑行' },
        ].map(({ icon, label, sport }) => (
          <TouchableOpacity key={label} onPress={() => {
            setSelectedSport({ key: sport, icon, color: TH.primary });
            setRunSec(0);
            setRunActive(false);
            setShowPrep(true);
          }} style={[cs, { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }]}>
            <Text style={{ fontSize: 32 }}>{icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', fontSize: 15, color: TH.text }}>{label}</Text>
              <Text style={{ fontSize: 11, color: TH.sub, marginTop: 2 }}>GPS 实时轨迹记录</Text>
            </View>
            <Text style={{ color: TH.sub, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity onPress={() => setShowOtherList(true)}
          style={[cs, { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }]}>
          <Text style={{ fontSize: 32 }}>🏋</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600', fontSize: 15, color: TH.text }}>其他运动</Text>
            <Text style={{ fontSize: 11, color: TH.sub, marginTop: 2 }}>跳绳、游泳、球类、瑜伽等</Text>
          </View>
          <Text style={{ color: TH.sub, fontSize: 18 }}>›</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Other Sports Modal */}
      <Modal visible={showOtherList} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: TH.cardSolid }]}>
            <View style={[s.flexRow, { marginBottom: 16 }]}>
              <Text style={[s.modalTitle, { color: TH.text }]}>选择运动类别</Text>
              <TouchableOpacity onPress={() => setShowOtherList(false)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: TH.card, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: TH.text, fontSize: 16 }}>×</Text>
              </TouchableOpacity>
            </View>

            {SPORT_GROUPS.map((g) => (
              <View key={g.group}>
                <Text style={{ fontSize: 12, color: TH.sub, fontWeight: '600', paddingVertical: 8 }}>{g.group}</Text>
                {g.items.map((s, i) => (
                  <TouchableOpacity key={s.key} onPress={() => {
                    setSelectedSport(s);
                    setShowOtherList(false);
                    setShowPrep(true);
                  }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: TH.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 24, width: 36, textAlign: 'center' }}>{s.icon}</Text>
                      <Text style={{ fontSize: 16, color: TH.text }}>{s.key}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  flexRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontWeight: '700', fontSize: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.7)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '88%' },
});
