import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioPlayer } from 'expo-audio';
import { useAppStore } from '../../store/useAppStore';
import SimpleHeader from '../../navigation/SimpleHeader';
import { Card, useTheme, PrimaryButton, OutlineButton, useT } from '../../components/UI';
import { estimateFastingKcal, dateStr, COLORS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_STAT_SECTION } from '@egoless-do/core';
import {
  Clock, Flame, Globe, Scale,
  AlertTriangle, Check, ChevronRight, StopCircle,
} from 'lucide-react-native';
import { useRootNavigation } from '../../navigation/hooks';

const BELL_FILE = require('../../../assets/sounds/temple_bell.mp3');

export default function FastingScreen() {
  const TH    = useTheme();
  const P     = TH.primary;
  const store = useAppStore();
  const nav   = useRootNavigation();
  const T     = useT();

  const [elapsed, setElapsed]   = useState(0);
  const [showDur, setShowDur]   = useState(false);
  const [tmpDur, setTmpDur]     = useState(8);
  const [agreed, setAgreed]     = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bellPlayedRef = useRef(false);
  const bellPlayer = useAudioPlayer(BELL_FILE);

  useEffect(() => { bellPlayer.volume = 0.5; }, [bellPlayer]);

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
  }, [store.activeFasting?.id]);

  const pct  = useMemo(() => {
    if (!store.activeFasting) return 0;
    const divisor = (store.activeFasting.targetHours ?? 8) * 3600;
    return divisor > 0 ? Math.min(elapsed / divisor, 1) : 0;
  }, [store.activeFasting, elapsed]);
  const kcal = useMemo(() => estimateFastingKcal(elapsed / 3600, store.userProfile.weight ?? 70, store.userProfile.gender ?? 'male', store.userProfile.age ?? 30), [elapsed, store.userProfile]);

  useEffect(() => {
    if (pct >= 1 && !bellPlayedRef.current) {
      bellPlayedRef.current = true;
      try { bellPlayer.seekTo(0); bellPlayer.play(); } catch {}
    }
  }, [pct, bellPlayer]);

  const totalFastHours = useMemo(() => {
    const totalSec = (store.fastingHistory ?? []).filter(f => !f.deleted).reduce((sum, f) => {
      const s = f.startedAt ?? 0;
      const e = f.endedAt ?? 0;
      return sum + (e > 0 ? (e - s) / 1000 : 0);
    }, 0);
    return Math.round(totalSec / 3600);
  }, [store.fastingHistory]);

  const fastingDates = useMemo(() => {
    const history = (store.fastingHistory ?? []).filter(f => !f.deleted);
    if (!history.length) return [] as string[];
    return [...new Set(history.map(f => {
      if (!f.startedAt) return null;
      const d = new Date(f.startedAt);
      if (isNaN(d.getTime())) return null;
      return dateStr(d);
    }).filter(Boolean as unknown as <T>(x: T) => x is NonNullable<T>))].sort();
  }, [store.fastingHistory]);

  const currentFastingStreak = useMemo(() => {
    if (!fastingDates.length) return 0;
    const reversed = [...fastingDates].reverse();
    const todayStr = dateStr();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = dateStr(yesterday);
    if (reversed[0] !== todayStr && reversed[0] !== yesterdayStr) return 0;
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

  const isActive = !!store.activeFasting;

  return (
    <SafeAreaView edges={[]} style={{ flex:1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Fasting" />
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:40 }}>

        {/* Hero Banner */}
        <View style={{ marginBottom: 12, borderRadius: 20, overflow: 'hidden' }}>
          <LinearGradient
            colors={['#8446FF', '#18CEFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 20 }}
          >
            {/* Title row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: '#fff' }}>{T('fasting')}</Text>
              <TouchableOpacity onPress={() => nav.navigate('FastHistory')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: FONT_BODY, color: 'rgba(255,255,255,.8)', fontWeight: '600' }}>{T('fastingHistory')}</Text>
                <ChevronRight size={16} color="rgba(255,255,255,.8)" />
              </TouchableOpacity>
            </View>
            {/* Stats 3 columns */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: '#fff' }}>{(store.fastingHistory ?? []).filter(f => !f.deleted).length}</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{T('fastTimes')}</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('fastTotal')}</Text>
              </View>
              <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,.2)', marginVertical: 4 }} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: '#fff' }}>{totalFastHours}</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{T('fastHours')}</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('fastTotalHours')}</Text>
              </View>
              <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,.2)', marginVertical: 4 }} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: '#fff' }}>{currentFastingStreak}</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{T('days')}</Text>
                <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('fastStreak')}</Text>
              </View>
            </View>
            {/* kcal row */}
            <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.15)' }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Flame size={16} color="rgba(255,255,255,.8)" />
                <View>
                  <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#fff' }}>{kcal} kcal</Text>
                  <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>{T('fastKcalSaved')}</Text>
                </View>
              </View>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Scale size={16} color="rgba(255,255,255,.8)" />
                <View>
                  <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#fff' }}>{(kcal / 7700).toFixed(2)} {T('fastKg')}</Text>
                  <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>{T('fastWeightLoss')}</Text>
                </View>
              </View>
            </View>
            {/* Global fasting entry */}
            <TouchableOpacity onPress={() => nav.navigate('GlobalMap', { icon: '🌍', title: `${T('linkWorld')} — ${T('globalFasting')}`, type: 'fasting' })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.2)' }}>
              <Globe size={18} color="rgba(255,255,255,.8)" />
              <Text style={{ fontSize: FONT_BODY, color: 'rgba(255,255,255,.8)', fontWeight: '600', flex: 1 }}>{T('linkWorld')} — {T('globalFasting')}</Text>
              <ChevronRight size={16} color="rgba(255,255,255,.8)" />
            </TouchableOpacity>
          </LinearGradient>
        </View>

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
                <Text style={{ fontSize:26, fontWeight:'800', color:P }}>{Math.floor(elapsed / 3600)}:{String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</Text>
                <Text style={{ fontSize:16, color:TH.sub }}>{T('fastTarget')} <Text style={{ fontSize:22 }}>{store.activeFasting?.targetHours}h</Text></Text>
                </View>
              </View>
              <View style={{ flexDirection:'row', alignItems:'center', gap:4, marginBottom:16 }}>
                <Text style={{ color:TH.sub, fontSize:16 }}>{T('fastActive')}</Text>
                <Flame size={16} color={COLORS.ORANGE} />
                <Text style={{ color:TH.sub, fontSize:22 }}>{Math.round(pct * 100)}%</Text>
              </View>
              <PrimaryButton label={T('stopFasting')} onPress={() => store.stopFasting({ weight: store.userProfile?.weight, gender: store.userProfile?.gender, age: store.userProfile?.age })} color={COLORS.RED} style={{ width:'100%' }} icon={<StopCircle size={20} color="#fff" />} />
            </>
          ) : (
            <View style={{ gap:10, width:'100%' }}>
              <PrimaryButton label={T('startFasting')} onPress={() => { setTmpDur(8); setAgreed(false); setShowDur(true); }} color={P} />
              <TouchableOpacity
                onPress={() => store.startFasting(8)}
                style={{ backgroundColor:TH.card, borderRadius:12, padding:15, alignItems:'center', borderWidth:1, borderColor:P }}
              >
                <Text style={{ color:P, fontWeight:'700', fontSize:FONT_BUTTON }}>{T('quickStart')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>

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
              {[8,10,12,14,16,18,20,24,36,48,60,72].map(d => (
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
              <TouchableOpacity
                onPress={() => { store.startFasting(tmpDur); setShowDur(false); }}
                style={{ flex:1, borderRadius:12, padding:15, alignItems:'center', backgroundColor: P, opacity: agreed ? 1 : 0.5 }}
                disabled={!agreed}
              >
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:FONT_BUTTON }}>{T('start')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
