import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioPlayer } from 'expo-audio';
import { useAppStore } from '../../store/useAppStore';
import SimpleHeader from '../../navigation/SimpleHeader';
import { Card, useTheme, PrimaryButton, OutlineButton, useT } from '../../components/UI';
import { estimateFastingKcal, dateStr, COLORS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_STAT_SECTION, MS_PER_DAY, createLogger } from '@egoless-do/core';
const log = createLogger('FastingScreen');
import {
  Flame, Globe, Scale,
  AlertTriangle, Check, ChevronRight, StopCircle,
} from 'lucide-react-native';
import { useRootNavigation } from '../../navigation/hooks';

// 实时会话
import { createSession, deleteSession, updateSession } from '../global-pulse/services/activeSessionApi';
import { useGoalResolver } from '../global-pulse/hooks/useGoalResolver';
import { ActiveInsightBar } from '../global-pulse/components/ActiveInsightBar';

const BELL_FILE = require('../../../assets/sounds/temple_bell.mp3');

export default function FastingScreen() {
  const TH    = useTheme();
  const P     = TH.primary;
  const {
    activeFasting, fastingHistory, userProfile,
    startFasting, stopFasting,
  } = useShallowStore(s => ({
    activeFasting: s.activeFasting,
    fastingHistory: s.fastingHistory,
    userProfile: s.userProfile,
    startFasting: s.startFasting,
    stopFasting: s.stopFasting,
  }));
  const nav   = useRootNavigation();
  const T     = useT();

  const [elapsed, setElapsed]   = useState(0);
  const [showDur, setShowDur]   = useState(false);
  const [tmpDur, setTmpDur]     = useState(8);
  const [agreed, setAgreed]     = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bellPlayedRef = useRef(false);
  const bellPlayer = useAudioPlayer(BELL_FILE);

  useEffect(() => { bellPlayer.volume = 0.5; }, [bellPlayer]);

  useEffect(() => {
    if (activeFasting) {
      bellPlayedRef.current = false;
      const el = Math.floor((Date.now() - activeFasting.startedAt) / 1000);
      setElapsed(el);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeFasting?.id, activeFasting?.startedAt]);

  const pct  = useMemo(() => {
    if (!activeFasting) return 0;
    const divisor = (activeFasting.targetHours ?? 8) * 3600;
    return divisor > 0 ? Math.min(elapsed / divisor, 1) : 0;
  }, [activeFasting, elapsed]);
  const kcal = useMemo(() => estimateFastingKcal(elapsed / 3600, userProfile.weight ?? 70, userProfile.gender ?? 'male', userProfile.age ?? 30), [elapsed, userProfile]);

  useEffect(() => {
    if (pct >= 1 && !bellPlayedRef.current) {
      bellPlayedRef.current = true;
      try { bellPlayer.seekTo(0); bellPlayer.play(); } catch {}
    }
  }, [pct, bellPlayer]);

  const totalFastHours = useMemo(() => {
    const totalSec = (fastingHistory ?? []).filter(f => !f.deleted).reduce((sum, f) => {
      const s = f.startedAt ?? 0;
      const e = f.endedAt ?? 0;
      return sum + (e > 0 ? (e - s) / 1000 : 0);
    }, 0);
    return Math.round(totalSec / 3600);
  }, [fastingHistory]);

  const fastingDates = useMemo(() => {
    const history = (fastingHistory ?? []).filter(f => !f.deleted);
    if (!history.length) return [] as string[];
    return [...new Set(history.map(f => {
      if (!f.startedAt) return null;
      const d = new Date(f.startedAt);
      if (isNaN(d.getTime())) return null;
      return dateStr(d);
    }).filter(Boolean as unknown as <T>(x: T) => x is NonNullable<T>))].sort();
  }, [fastingHistory]);

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
      const diff = (prev.getTime() - curr.getTime()) / MS_PER_DAY;
      if (Math.abs(diff - 1) < 0.1) streak++;
      else break;
    }
    return streak;
  }, [fastingDates]);

  const isActive = !!activeFasting;

  // ── 实时会话管理 ──
  const sessionIdRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [insight, setInsight] = useState('');
  const insightRef = useRef(insight);
  insightRef.current = insight;
  const { resolveGoal } = useGoalResolver();

  // 禁食开始/结束时创建/删除会话
  useEffect(() => {
    if (isActive && !sessionIdRef.current) {
      const userHash = useAppStore.getState().auth.user?.id || '';
      if (!userHash) return;
      const goal = resolveGoal('fasting');
      createSession({
        user_hash: userHash,
        nickname: useAppStore.getState().userProfile?.nickname || '',
        type: 'fasting',
        goal: goal || undefined,
        insight: insight || undefined,
      }).then(result => {
        if (result.success && result.data) {
          sessionIdRef.current = result.data.session_id;
        }
      }).catch(e => {
        log.warn('Failed to create fasting session:', e);
      });
    } else if (!isActive && sessionIdRef.current) {
      // Flush final insight before deleting session
      const finalInsight = insightRef.current;
      if (finalInsight) {
        updateSession(sessionIdRef.current, { insight: finalInsight }).catch(() => {});
      }
      deleteSession(sessionIdRef.current);
      sessionIdRef.current = null;
    }
  }, [isActive]);

  // 更新感悟
  const handleInsightChange = (text: string) => {
    setInsight(text);
    if (sessionIdRef.current) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        updateSession(sessionIdRef.current!, { insight: text });
      }, 1000);
    }
  };

  // 组件卸载时清理
  useEffect(() => () => {
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
    if (sessionIdRef.current) {
      deleteSession(sessionIdRef.current);
      sessionIdRef.current = null;
    }
  }, []);

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
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: '#fff' }}>{(fastingHistory ?? []).filter(f => !f.deleted).length}</Text>
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
              {/* 在线人数 + 感悟输入 */}
              <ActiveInsightBar
                type="fasting"
                insight={insight}
                onInsightChange={handleInsightChange}
                goal={resolveGoal('fasting')}
              />
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
                <Text style={{ fontSize:16, color:TH.sub }}>{T('fastTarget')} <Text style={{ fontSize:22 }}>{activeFasting?.targetHours}h</Text></Text>
                </View>
              </View>
              <View style={{ flexDirection:'row', alignItems:'center', gap:4, marginBottom:16 }}>
                <Text style={{ color:TH.sub, fontSize:16 }}>{T('fastActive')}</Text>
                <Flame size={16} color={COLORS.ORANGE} />
                <Text style={{ color:TH.sub, fontSize:22 }}>{Math.round(pct * 100)}%</Text>
              </View>
              <PrimaryButton label={T('stopFasting')} onPress={() => { setNoteText(''); setInsight(''); setShowNoteModal(true); }} color={COLORS.RED} style={{ width:'100%' }} icon={<StopCircle size={20} color="#fff" />} />
            </>
          ) : (
            <View style={{ gap:10, width:'100%' }}>
              <PrimaryButton label={T('startFasting')} onPress={() => { setTmpDur(8); setAgreed(false); setShowDur(true); }} color={P} />
              <TouchableOpacity
                onPress={() => startFasting(8)}
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
            {/* 可选感悟输入 */}
            <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600', marginBottom: 6 }}>{T('globalPulse.insightLabel')}</Text>
            <TextInput
              style={{
                backgroundColor: TH.card, borderRadius: 12, padding: 10,
                marginBottom: 16, color: TH.text, fontSize: FONT_BODY,
                minHeight: 40, maxHeight: 80, textAlignVertical: 'top',
              }}
              placeholder={T('globalPulse.insightPlaceholder')}
              placeholderTextColor={TH.sub}
              value={insight}
              onChangeText={setInsight}
              multiline
              maxLength={200}
            />
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
                onPress={() => { startFasting(tmpDur); setShowDur(false); }}
                style={{ flex:1, borderRadius:12, padding:15, alignItems:'center', backgroundColor: P, opacity: agreed ? 1 : 0.5 }}
                disabled={!agreed}
              >
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:FONT_BUTTON }}>{T('start')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Note Input Modal */}
      <Modal visible={showNoteModal} transparent animationType="fade">
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.75)', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:TH.cardSolid, borderRadius:20, padding:24 }}>
            <Text style={{ fontSize:FONT_TITLE, fontWeight:'700', color:TH.text, textAlign:'center', marginBottom:4 }}>禁食完成 ✨</Text>
            <Text style={{ fontSize:FONT_BODY, color:TH.sub, textAlign:'center', marginBottom:20 }}>{Math.floor(elapsed / 3600)}h {Math.floor((elapsed % 3600) / 60)}m</Text>
            <Text style={{ fontSize:FONT_BODY, color:TH.text, fontWeight:'600', marginBottom:8 }}>想记录点什么吗？(可选)</Text>
            <TextInput
              style={{ backgroundColor:TH.card, borderRadius:12, padding:12, color:TH.text, fontSize:FONT_BODY, minHeight:80, maxHeight:120, textAlignVertical:'top', marginBottom:20 }}
              multiline maxLength={500} value={noteText} onChangeText={setNoteText}
              placeholder="写下此刻的感受..." placeholderTextColor={TH.sub}
            />
            <View style={{ flexDirection:'row', gap:10 }}>
              <TouchableOpacity
                onPress={() => { stopFasting({ weight: userProfile?.weight ?? 70, gender: userProfile?.gender ?? 'male', age: userProfile?.age ?? 30 }); setShowNoteModal(false); }}
                style={{ flex:1, padding:14, borderRadius:12, borderWidth:1, borderColor:TH.border, alignItems:'center' }}
              >
                <Text style={{ color:TH.sub, fontWeight:'600', fontSize:FONT_BODY }}>跳过</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { stopFasting({ weight: userProfile?.weight ?? 70, gender: userProfile?.gender ?? 'male', age: userProfile?.age ?? 30, note: noteText.trim() || undefined }); setShowNoteModal(false); }}
                style={{ flex:1, padding:14, borderRadius:12, backgroundColor:P, alignItems:'center' }}
              >
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:FONT_BODY }}>完成</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
