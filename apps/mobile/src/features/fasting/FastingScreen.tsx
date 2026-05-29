import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAudioPlayer } from 'expo-audio';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAppStore } from '../../store/useAppStore';
import { Card, useTheme, PrimaryButton, OutlineButton, ScreenHeader, useT } from '../../components/UI';
import { estimateFastingKcal, FASTING_DURATIONS, COLORS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_STAT_CARD, FONT_CLOSE } from '@egoless-do/core';
import {
  Hourglass, Clock, Flame, Trophy, Globe, Scale,
  AlertTriangle, Check, ChevronRight,
} from 'lucide-react-native';

const BELL_FILE = require('../../../assets/sounds/temple_bell.mp3');

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
  const bellPlayedRef = useRef(false);
  const bellPlayer = useAudioPlayer(BELL_FILE);
  bellPlayer.volume = 0.5;

  useEffect(() => {
    if (store.activeFasting) {
      bellPlayedRef.current = false;
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
  const kcal = useMemo(() => estimateFastingKcal(elapsed / 3600, store.userProfile.weight ?? 70, store.userProfile.gender ?? 'male', store.userProfile.age ?? 30), [elapsed, store.userProfile]);

  useEffect(() => {
    if (pct >= 1 && !bellPlayedRef.current) {
      bellPlayedRef.current = true;
      try { bellPlayer.seekTo(0); bellPlayer.play(); } catch {}
    }
  }, [pct]);

  const totalFastHours = useMemo(() => {
    const totalSec = (store.fastingHistory ?? []).reduce((sum, f) => {
      const s = f.startedAt ?? 0;
      const e = f.endedAt ?? 0;
      return sum + (e > 0 ? (e - s) / 1000 : 0);
    }, 0);
    return Math.round(totalSec / 3600);
  }, [store.fastingHistory]);

  const fastingDates = useMemo(() => {
    const history = store.fastingHistory ?? [];
    if (!history.length) return [] as string[];
    return [...new Set(history.map(f => {
      const d = new Date(f.startedAt ?? 0);
      return d.toISOString().slice(0, 10);
    }))].sort();
  }, [store.fastingHistory]);

  const currentFastingStreak = useMemo(() => {
    if (!fastingDates.length) return 0;
    const reversed = [...fastingDates].reverse();
    let streak = 1;
    for (let i = 1; i < reversed.length; i++) {
      const prev = new Date(reversed[i - 1]);
      const curr = new Date(reversed[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (Math.abs(diff - 1) < 0.1) streak++;
      else break;
    }
    return streak;
  }, [fastingDates]);

  const longestStreak = useMemo(() => {
    if (fastingDates.length === 0) return 0;
    let max = 1, cur = 1;
    for (let i = 1; i < fastingDates.length; i++) {
      const prev = new Date(fastingDates[i - 1]);
      const curr = new Date(fastingDates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diffDays === 1) { cur++; max = Math.max(max, cur); }
      else if (diffDays > 1) cur = 1;
    }
    return max;
  }, [fastingDates]);

  const statsData = useMemo(() => [
    { icon:Hourglass, label:T('fastTotal'),    value:`${(store.fastingHistory ?? []).length} ${T('fastTimes')}`, bg:'#EF9A9A' },
    { icon:Clock, label:T('fastTotalHours'),    value:`${totalFastHours} ${T('fastHours')}`,         bg:COLORS.GREEN },
    { icon:Flame, label:T('fastStreak'),  value:`${currentFastingStreak} ${T('days')}`,             bg:'#FF8A65' },
    { icon:Trophy, label:T('fastLongest'),  value:`${longestStreak} ${T('days')}`,            bg:'#9C27B0' },
  ], [(store.fastingHistory ?? []).length, currentFastingStreak, totalFastHours, longestStreak]);

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
                <Text style={{ fontSize:FONT_CLOSE, fontWeight:'800', color:P }}>{Math.floor(elapsed / 3600)}:{String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</Text>
                <Text style={{ fontSize:FONT_SUB, color:TH.sub }}>{T('fastTarget')} {store.activeFasting!.targetHours}h</Text>
                </View>
              </View>
              <View style={{ flexDirection:'row', alignItems:'center', gap:4, marginBottom:16 }}>
                <Text style={{ color:TH.sub, fontSize:FONT_SUB }}>{T('fastActive')}</Text>
                <Flame size={16} color={COLORS.ORANGE} />
                <Text style={{ color:TH.sub, fontSize:FONT_SUB }}>{Math.round(pct * 100)}%</Text>
              </View>
              <PrimaryButton label={T('stopFasting')} onPress={() => store.stopFasting({ weight: store.userProfile.weight, gender: store.userProfile.gender, age: store.userProfile.age })} color={COLORS.RED} style={{ width:'100%' }} />
            </>
          ) : (
            <View style={{ gap:10, width:'100%' }}>
              <PrimaryButton label={T('startFasting')} onPress={() => { setTmpDur(8); setAgreed(false); setShowDur(true); }} color={P} />
              <PrimaryButton label={T('quickStart')} onPress={() => store.startFasting(8)} color={COLORS.GREEN} />
            </View>
          )}
        </Card>

        {/* Global fasting */}
        <TouchableOpacity onPress={() => (nav as any).navigate('GlobalMap', { icon: 'Globe', title: `${T('linkWorld')} — ${T('globalFasting')}` })}
          style={{ backgroundColor:TH.card, borderRadius:16, marginBottom:12, borderWidth:1, borderColor:TH.border, flexDirection:'row', alignItems:'center', gap:10, padding:12 }}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="12" r="10" />
            <Path d="M2 12h20" />
            <Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </Svg>
          <Text style={{ fontSize:FONT_BODY, color:TH.text }}>{T('linkWorld')} — {T('globalFasting')}</Text>
          <ChevronRight size={18} color={TH.sub} style={{ marginLeft:'auto' }} />
        </TouchableOpacity>

        {/* History entry */}
        <TouchableOpacity onPress={() => (nav as any).navigate('FastHistory')}
          style={{ backgroundColor:TH.card, borderRadius:16, marginBottom:12, borderWidth:1, borderColor:TH.border, flexDirection:'row', alignItems:'center', gap:10, padding:12 }}>
          <Clock size={18} color={P} />
          <Text style={{ fontSize:FONT_BODY, color:TH.text }}>{T('fastingHistory')}</Text>
          <ChevronRight size={18} color={TH.sub} style={{ marginLeft:'auto' }} />
        </TouchableOpacity>

        {/* Stats */}
        <Text style={{ fontWeight:'600', fontSize:FONT_BODY, marginBottom:10, color:TH.text }}>{T('fastYourStats')}</Text>
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:12 }}>
          {statsData.map(s => (
            <View key={s.label} style={{ width:'48%', backgroundColor:s.bg, borderRadius:14, padding:16, alignItems:'center', gap:6 }}>
              <s.icon size={26} color="#fff" />
              <Text style={{ fontSize:FONT_BODY, color:'rgba(255,255,255,.85)', textAlign:'center' }}>{s.label}</Text>
              <Text style={{ fontWeight:'700', color:'#fff', fontSize:FONT_STAT_CARD }}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* Realtime kcal */}
        <View style={{ flexDirection:'row', gap:8, marginBottom:12 }}>
          <View style={{ flex:1, backgroundColor:COLORS.ORANGE, borderRadius:14, padding:16, alignItems:'center', gap:6 }}>
            <Flame size={26} color="#fff" />
            <Text style={{ fontSize:FONT_BODY, color:'rgba(255,255,255,.85)' }}>{T('fastKcalSaved')}</Text>
            <Text style={{ fontWeight:'700', color:'#fff', fontSize:FONT_STAT_CARD }}>{kcal} <Text style={{ fontSize:FONT_SUB, fontWeight:'400' }}>kcal</Text></Text>
          </View>
          <View style={{ flex:1, backgroundColor:COLORS.GREEN, borderRadius:14, padding:16, alignItems:'center', gap:6 }}>
            <Scale size={26} color="#fff" />
            <Text style={{ fontSize:FONT_BODY, color:'rgba(255,255,255,.85)' }}>{T('fastWeightLoss')}</Text>
            <Text style={{ fontWeight:'700', color:'#fff', fontSize:FONT_STAT_CARD }}>{(kcal / 7700).toFixed(2)} <Text style={{ fontSize:FONT_SUB, fontWeight:'400' }}>{T('fastKg')}</Text></Text>
          </View>
        </View>

        {/* Health tips */}
        <Card>
          <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 }}>
            <AlertTriangle size={18} color={COLORS.YELLOW} />
            <Text style={{ fontWeight:'700', fontSize:FONT_BODY, color:COLORS.YELLOW }}>{T('healthWarning')}</Text>
          </View>
          {[T('fastTips'), T('fastTip2'), T('fastTip3'), T('fastTip4')].map((tip, i) => (
            <View key={i} style={{ flexDirection:'row', gap:8, marginBottom:6 }}>
              <Text style={{ color:TH.sub, fontSize:FONT_BODY }}>•</Text>
              <Text style={{ fontSize:FONT_BODY, color:TH.sub, lineHeight:22 }}>{tip}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>

      {/* Duration picker modal */}
      <Modal visible={showDur} transparent animationType="fade">
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.75)', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:TH.cardSolid, borderRadius:20, padding:24 }}>
            <Text style={{ fontWeight:'700', fontSize:FONT_TITLE, textAlign:'center', marginBottom:20, color:TH.text }}>{T('durationSelect')}</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10, justifyContent:'center', marginBottom:20 }}>
              {[1,2,4,6,8,10,12].map(d => (
                <TouchableOpacity key={d} onPress={() => setTmpDur(d)}
                  style={{
                    width:72, paddingVertical:12, borderRadius:12, alignItems:'center',
                    backgroundColor: tmpDur===d ? P : TH.card,
                  }}>
                  <Text style={{ fontWeight:'700', fontSize:FONT_BUTTON, color: tmpDur===d ? '#fff' : TH.text }}>{d}h</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ backgroundColor:'rgba(255,248,200,.08)', borderRadius:12, padding:12, marginBottom:16, flexDirection:'row', gap:8 }}>
              <AlertTriangle size={18} color={COLORS.YELLOW} />
              <View>
                <Text style={{ fontWeight:'600', fontSize:FONT_BODY, color:'#FCD34D', marginBottom:4 }}>{T('warmReminder')}</Text>
                <Text style={{ fontSize:FONT_BODY, color:TH.sub }}>{T('bodyWarning')}</Text>
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
                {agreed && <Check size={16} color="#fff" />}
              </View>
              <Text style={{ fontSize:FONT_BODY, color:TH.text }}>{T('understand')}</Text>
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
