import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { Card, useTheme, PrimaryButton, OutlineButton, ScreenHeader, useT } from '../../components/UI';
import { fmt, estimateFastKcal, FASTING_DURATIONS, COLORS } from '@egoless-do/core';

export default function FastingScreen() {
  const TH    = useTheme();
  const P     = TH.primary;
  const store = useAppStore();
  const nav   = useNavigation();
  const T     = useT();

  const [elapsed, setElapsed]   = useState(0);
  const [showDur, setShowDur]   = useState(false);
  const [tmpDur, setTmpDur]     = useState(8);
  const [agreed, setAgreed]     = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (store.activeFasting) {
      const el = Math.floor((Date.now() - store.activeFasting.startedAt) / 1000);
      setElapsed(el);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [!!store.activeFasting]);

  const pct  = useMemo(() => store.activeFasting ? Math.min(elapsed / (store.activeFasting.targetHours * 3600), 1) : 0, [store.activeFasting, elapsed]);
  const kcal = useMemo(() => estimateFastKcal(elapsed), [elapsed]);

  const totalFastHours = useMemo(() => {
    const totalSec = (store.fastingHistory ?? []).reduce((sum, f) => {
      const s = f.startedAt ?? 0;
      const e = f.endedAt ?? 0;
      return sum + (e > 0 ? (e - s) / 1000 : 0);
    }, 0);
    return Math.round(totalSec / 3600);
  }, [store.fastingHistory]);

  const longestStreak = useMemo(() => {
    const history = store.fastingHistory ?? [];
    if (!history.length) return 0;
    const dates = [...new Set(history.map(f => {
      const d = new Date(f.startedAt ?? 0);
      return d.toISOString().slice(0, 10);
    }))].sort();
    let maxStreak = 1;
    let currentStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diffDays === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
    }
    return maxStreak;
  }, [store.fastingHistory]);

  const statsData = useMemo(() => [
    { icon:'⏳', label:T('fastTotal'),    value:`${(store.fastingHistory ?? []).length} ${T('fastTimes')}`, bg:'#EF9A9A' },
    { icon:'⏰', label:T('fastTotalHours'),    value:`${totalFastHours} ${T('fastHours')}`,         bg:COLORS.GREEN },
    { icon:'🔥', label:T('fastStreak'),  value:`${store.streak} ${T('days')}`,             bg:'#FF8A65' },
    { icon:'🏆', label:T('fastLongest'),  value:`${longestStreak} ${T('days')}`,            bg:'#9C27B0' },
  ], [(store.fastingHistory ?? []).length, store.streak, totalFastHours, longestStreak]);

  const isActive = !!store.activeFasting;

  return (
    <SafeAreaView edges={[]} style={{ flex:1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:40 }}>

        {/* Main card */}
        <Card style={{ alignItems:'center', paddingVertical:32 }}>
          {isActive ? (
            <>
              {/* SVG Ring Progress */}
              <View style={{ width:160, height:160, marginBottom:16, position:'relative', alignItems:'center', justifyContent:'center' }}>
                <View style={{
                  width:160, height:160, borderRadius:80, borderWidth:10,
                  borderColor: TH.border, position:'absolute',
                }} />
                <View style={{
                  width:160, height:160, borderRadius:80, borderWidth:10,
                  borderColor: P, position:'absolute',
                  borderTopColor: pct >= 0.25 ? P : TH.border,
                  borderRightColor: pct >= 0.5 ? P : TH.border,
                  borderBottomColor: pct >= 0.75 ? P : TH.border,
                  borderLeftColor: pct >= 1 ? P : TH.border,
                  transform: [{ rotate: '-90deg' }],
                }} />
                <View style={{ alignItems:'center' }}>
                <Text style={{ fontSize:24, fontWeight:'800', color:P }}>{fmt(elapsed)}</Text>
                <Text style={{ fontSize:16, color:TH.sub }}>{T('fastTarget')} {store.activeFasting!.targetHours}h</Text>
                </View>
              </View>
              <Text style={{ color:TH.sub, fontSize:16, marginBottom:16 }}>{T('fastActive')} 🔥 {Math.round(pct * 100)}%</Text>
              <PrimaryButton label={T('stopFasting')} onPress={() => store.stopFasting()} color={COLORS.RED} style={{ width:'100%' }} />
            </>
          ) : (
            <>
              <Text style={{ color:TH.sub, fontSize:16, marginBottom:6 }}>{T('fastTarget')}</Text>
              <TouchableOpacity onPress={() => { setTmpDur(8); setAgreed(false); setShowDur(true); }}>
                <Text style={{ color:COLORS.ORANGE, fontWeight:'800', fontSize:38 }}>{tmpDur}h <Text style={{ fontSize:18, color:TH.sub }}>▼</Text></Text>
              </TouchableOpacity>
              <View style={{ height:20 }} />
              <View style={{ flexDirection:'row', gap:10, width:'100%' }}>
                <PrimaryButton label={T('startFasting')} onPress={() => { setTmpDur(8); setAgreed(false); setShowDur(true); }} color={COLORS.GREEN} style={{ flex:1 }} />
                <OutlineButton label={T('quickStart')} onPress={() => store.startFasting(8)} color={COLORS.ORANGE} style={{ flex:1 }} />
              </View>
            </>
          )}
        </Card>

        {/* Global fasting */}
        <TouchableOpacity onPress={() => (nav as any).navigate('GlobalMap')}
          style={{ backgroundColor:TH.card, borderRadius:16, marginBottom:12, borderWidth:1, borderColor:TH.border, flexDirection:'row', alignItems:'center', gap:10, padding:12 }}>
          <Text style={{ fontSize:18 }}>🌍</Text>
          <Text style={{ fontSize:16, color:TH.text }}>{T('globalFasting')}</Text>
          <Text style={{ marginLeft:'auto', color:TH.sub }}>›</Text>
        </TouchableOpacity>

        {/* History entry */}
        <TouchableOpacity onPress={() => (nav as any).navigate('FastHistory')}
          style={{ backgroundColor:TH.card, borderRadius:16, marginBottom:12, borderWidth:1, borderColor:TH.border, flexDirection:'row', alignItems:'center', gap:10, padding:12 }}>
          <Text style={{ fontSize:18 }}>⏱</Text>
          <Text style={{ fontSize:16, color:TH.text }}>{T('fastingHistory')}</Text>
          <Text style={{ marginLeft:'auto', color:TH.sub }}>›</Text>
        </TouchableOpacity>

        {/* Stats */}
        <Text style={{ fontWeight:'600', fontSize:16, marginBottom:10, color:TH.text }}>{T('fastYourStats')}</Text>
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:12 }}>
          {statsData.map(s => (
            <View key={s.label} style={{ width:'48%', backgroundColor:s.bg, borderRadius:14, padding:16, alignItems:'center', gap:6 }}>
              <Text style={{ fontSize:26 }}>{s.icon}</Text>
              <Text style={{ fontSize:16, color:'rgba(255,255,255,.85)', textAlign:'center' }}>{s.label}</Text>
              <Text style={{ fontWeight:'700', color:'#fff', fontSize:18 }}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* Realtime kcal */}
        <View style={{ flexDirection:'row', gap:8, marginBottom:12 }}>
          <View style={{ flex:1, backgroundColor:COLORS.ORANGE, borderRadius:14, padding:16, alignItems:'center', gap:6 }}>
            <Text style={{ fontSize:26 }}>🔥</Text>
            <Text style={{ fontSize:16, color:'rgba(255,255,255,.85)' }}>{T('fastKcalSaved')}</Text>
            <Text style={{ fontWeight:'700', color:'#fff', fontSize:18 }}>{kcal} <Text style={{ fontSize:16, fontWeight:'400' }}>kcal</Text></Text>
          </View>
          <View style={{ flex:1, backgroundColor:COLORS.GREEN, borderRadius:14, padding:16, alignItems:'center', gap:6 }}>
            <Text style={{ fontSize:26 }}>⚖️</Text>
            <Text style={{ fontSize:16, color:'rgba(255,255,255,.85)' }}>{T('fastWeightLoss')}</Text>
            <Text style={{ fontWeight:'700', color:'#fff', fontSize:18 }}>{(kcal / 7700).toFixed(2)} <Text style={{ fontSize:16, fontWeight:'400' }}>{T('fastKg')}</Text></Text>
          </View>
        </View>

        {/* Health tips */}
        <Card>
          <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 }}>
            <Text style={{ fontSize:18 }}>⚠️</Text>
            <Text style={{ fontWeight:'700', fontSize:16, color:COLORS.YELLOW }}>{T('healthWarning')}</Text>
          </View>
          {[T('fastTips'), T('fastTip2'), T('fastTip3'), T('fastTip4')].map((tip, i) => (
            <View key={i} style={{ flexDirection:'row', gap:8, marginBottom:6 }}>
              <Text style={{ color:TH.sub, fontSize:16 }}>•</Text>
              <Text style={{ fontSize:16, color:TH.sub, lineHeight:22 }}>{tip}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>

      {/* Duration picker modal */}
      <Modal visible={showDur} transparent animationType="fade">
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.75)', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:TH.cardSolid, borderRadius:20, padding:24 }}>
            <Text style={{ fontWeight:'700', fontSize:18, textAlign:'center', marginBottom:20, color:TH.text }}>{T('fastSelectDuration')}</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10, justifyContent:'center', marginBottom:20 }}>
              {[1,2,4,6,8,10,12].map(d => (
                <TouchableOpacity key={d} onPress={() => setTmpDur(d)}
                  style={{
                    width:72, paddingVertical:12, borderRadius:12, alignItems:'center',
                    backgroundColor: tmpDur===d ? P : TH.card,
                  }}>
                  <Text style={{ fontWeight:'700', fontSize:16, color: tmpDur===d ? '#fff' : TH.text }}>{d}h</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ backgroundColor:'rgba(255,248,200,.08)', borderRadius:12, padding:12, marginBottom:16, flexDirection:'row', gap:8 }}>
              <Text>⚠️</Text>
              <View>
                <Text style={{ fontWeight:'600', fontSize:16, color:'#FCD34D', marginBottom:4 }}>{T('fastWarmTitle')}</Text>
                <Text style={{ fontSize:16, color:TH.sub }}>{T('fastWarmText')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setAgreed(v => !v)}
              style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:16 }}>
              <View style={{
                width:18, height:18, borderRadius:4, borderWidth:2,
                borderColor: agreed ? P : TH.border,
                backgroundColor: agreed ? P : 'transparent',
                alignItems:'center', justifyContent:'center',
              }}>
                {agreed && <Text style={{ color:'#fff', fontSize:16 }}>✓</Text>}
              </View>
              <Text style={{ fontSize:16, color:TH.text }}>{T('fastAgree')}</Text>
            </TouchableOpacity>
            <View style={{ flexDirection:'row', gap:10 }}>
              <OutlineButton label={T('cancel')} onPress={() => setShowDur(false)} style={{ flex:1 }} />
              <PrimaryButton label={T('start')} onPress={() => { store.startFasting(tmpDur); setShowDur(false); }}
                color={agreed ? P : 'rgba(128,128,128,.2)'} style={{ flex:1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
