import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { THEMES, COLORS, QUICK_FOODS, dateStr, getTodayFoodLog } from '@egoless-do/core';
import type { CheckinRecord } from '@egoless-do/core';
import { Card, useTheme, useT, ProgressBar, ThemedInput } from '../../components/UI';
import CheckinModal from './CheckinModal';

function computeLongestStreak(history: CheckinRecord[]): number {
  const doneDates = history.filter(c => c.done).map(c => c.date).sort();
  if (doneDates.length === 0) return 0;
  let max = 1, current = 1;
  for (let i = 1; i < doneDates.length; i++) {
    const prev = new Date(doneDates[i - 1]);
    const curr = new Date(doneDates[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) { current++; max = Math.max(max, current); }
    else if (diff > 1) current = 1;
  }
  return max;
}

export default function HomeScreen() {
  const TH         = useTheme();
  const T          = useT();
  const P          = TH.primary;
  const store      = useAppStore();
  const [showCI, setShowCI]       = useState(false);
  const [showFood, setShowFood]   = useState(false);
  const [fn, setFn]               = useState('');
  const [fc, setFc]               = useState('');
  const [fnote, setFnote]         = useState('');
  const [showWG, setShowWG]       = useState(false);
  const [wgi, setWgi]             = useState(String(store.waterGoal));
  const [showCG, setShowCG]       = useState(false);
  const [cgi, setCgi]             = useState(String(store.calGoal));

  const totalCal = useMemo(
    () => getTodayFoodLog(store.foodLog ?? []).reduce((a, f) => a + (f.calories ?? f.cal ?? 0), 0),
    [store.foodLog],
  );

  const todayWeight = useMemo(() => {
    const today = dateStr();
    const todayCheckin = (store.checkinHistory ?? []).find((c: CheckinRecord) => c.date === today);
    return todayCheckin?.weight;
  }, [store.checkinHistory]);

  const savedKcal = useMemo(() => (store.fastingHistory ?? []).reduce((sum, f) => sum + (f.estimatedKcal ?? 0), 0), [store.fastingHistory]);

  const totalCompleted = useMemo(() => (store.checkinHistory ?? []).filter((c: CheckinRecord) => c.done).length, [store.checkinHistory]);
  const longestStreak = useMemo(() => computeLongestStreak(store.checkinHistory ?? []), [store.checkinHistory]);
  const savedMeals = useMemo(() => (store.fastingHistory ?? []).length, [store.fastingHistory]);

  const statsData = useMemo(() => [
    { icon:'📅', label:T('totalCompleted'), value:`${totalCompleted}`, unit:T('days'),  bg:COLORS.ORANGE },
    { icon:'🏆', label:T('longestStreak'), value:`${longestStreak}`, unit:T('days'),  bg:COLORS.YELLOW },
    { icon:'💪', label:T('savedCalories'), value:`${savedKcal}`, unit:T('kcalUnit'), bg:'#FF8A65' },
    { icon:'🍽', label:T('savedMeals'),  value:`${savedMeals}`, unit:T('mealUnit'),  bg:COLORS.BLUE },
  ], [totalCompleted, longestStreak, savedKcal, savedMeals, T]);

  const resetFoodForm = () => { setFn(''); setFc(''); setFnote(''); };

  const todayStr = dateStr();
  const todayRecord = (store.checkinHistory ?? []).find((c: CheckinRecord) => c.date === todayStr);
  const bannerState: 'notChecked' | 'notDone' | 'done' = !todayRecord ? 'notChecked' : todayRecord.done ? 'done' : 'notDone';
  const bannerColors: Record<string, string> = { notChecked: '#16A34A', notDone: '#F59E0B', done: '#3B82F6' };
  const bannerSubText: Record<string, string> = { notChecked: T('checkinDoneToday'), notDone: T('checkinModifyNotDone'), done: T('checkinDoneBanner') };
  const bannerBtnText: Record<string, string> = { notChecked: `📋 ${T('openCheckin')}`, notDone: `✏️ ${T('checkinModify')}`, done: `✓ ${T('checkinDoneBanner')}` };

  return (
    <SafeAreaView edges={[]} style={{ flex:1, backgroundColor: TH.bg }}>
      <StatusBar barStyle={TH === THEMES.light ? 'dark-content' : 'light-content'} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Check-in banner */}
        <TouchableOpacity
          onPress={() => { if (bannerState !== 'done') setShowCI(true); }}
          activeOpacity={bannerState === 'done' ? 1 : 0.8}
          style={{
            borderRadius: 16, padding: 18, marginBottom: 12,
            backgroundColor: bannerColors[bannerState],
            opacity: bannerState === 'done' ? 0.8 : 1,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17, textAlign: 'center' }}>
            {T('todayCheckin')}
          </Text>
           <Text style={{ color: 'rgba(255,255,255,.75)', fontSize: 14, textAlign: 'center', marginTop: 3 }}>
            {bannerSubText[bannerState]}
           </Text>
          <View style={{
            marginTop: 14, borderRadius: 10,
            borderWidth: 1.5, borderColor: 'rgba(255,255,255,.55)',
            padding: 11, backgroundColor: 'rgba(255,255,255,.18)',
            alignItems: 'center',
          }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
              {bannerBtnText[bannerState]}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Streak card */}
        <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Text style={{ fontSize: 40 }}>🔷</Text>
          <Text style={{ color: TH.sub, fontSize: 14, marginTop: 6 }}>{T('streak')}</Text>
          <Text style={{ color: COLORS.ORANGE, fontWeight: '800', fontSize: 56, lineHeight: 64 }}>
            {store.streak}
          </Text>
          <Text style={{ color: TH.sub, fontSize: 14 }}>{T('days')}</Text>
          <Text style={{ color: TH.sub, fontSize: 13, marginTop: 8, textAlign: 'center' }}>
            {T('gracePeriodHint')}
          </Text>
        </Card>

        {/* Stats grid — 4 cards */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {statsData.map(s => (
            <View key={s.label} style={{
              width: '48%', backgroundColor: s.bg, borderRadius: 14, padding: 14,
              alignItems: 'center', gap: 4,
            }}>
              <Text style={{ fontSize: 22 }}>{s.icon}</Text>
              <Text style={{ fontSize: 13, color:'rgba(255,255,255,.8)', textAlign:'center' }}>{s.label}</Text>
                <Text style={{ fontWeight:'700', color:'#fff', fontSize:18 }}>
                {s.value}<Text style={{ fontSize:16, fontWeight:'400' }}> {s.unit}</Text>
              </Text>
            </View>
          ))}
        </View>

        {/* Weight card */}
        <Card>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <Text style={{ color: TH.text, fontWeight: '600', fontSize: 15 }}>⚖️ {T('todayWeight')}</Text>
            <Text style={{ fontSize:22, fontWeight:'700', color:P }}>
              {todayWeight != null ? `${todayWeight}` : '—'}
            </Text>
            <Text style={{ color:TH.sub, fontSize:16 }}>{T('checkinKg')}</Text>
          </View>
        </Card>

        {/* Water card */}
        <Card>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <Text style={{ color: TH.text, fontWeight: '600', fontSize: 15 }}>💧 {T('water')}</Text>
            <TouchableOpacity onPress={() => { setWgi(String(store.waterGoal)); setShowWG(true); }}>
              <Text style={{ color: TH.sub, fontSize: 14 }}>
                <Text style={{ fontWeight:'600', color:P }}>{store.waterMl}</Text> ml / {store.waterGoal}ml ✏️
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginBottom: 12 }}>
            <ProgressBar pct={store.waterMl / store.waterGoal * 100} color={COLORS.BLUE} />
          </View>
          <TouchableOpacity onPress={() => store.addWater(250)}
            style={{ backgroundColor:COLORS.BLUE, borderRadius:10, padding:12, alignItems:'center' }}>
            <Text style={{ color:'#fff', fontWeight:'600', fontSize:16 }}>+ 250ml</Text>
          </TouchableOpacity>
        </Card>

        {/* Add food button */}
        <TouchableOpacity
          onPress={() => { resetFoodForm(); setShowFood(true); }}
          style={{
            backgroundColor: COLORS.ORANGE, borderRadius: 12, padding: 14,
            alignItems: 'center', marginBottom: 12,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>+ {T('addFood')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {showCI && <CheckinModal onClose={() => setShowCI(false)} />}

      {/* Add Food Modal */}
      <Modal visible={showFood} transparent animationType="fade" onRequestClose={() => setShowFood(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.65)', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:TH.cardSolid, borderRadius:20, padding:24 }}>
            <Text style={{ fontWeight:'700', fontSize:18, marginBottom:16, color:TH.text }}>{T('addFood')}</Text>
            <ThemedInput value={fn} onChangeText={setFn} placeholder={T('foodName')} style={{ marginBottom:10, borderColor:P, borderWidth:2 }} />
            <ThemedInput value={fc} onChangeText={setFc} placeholder={T('calories2')} keyboardType="numeric" style={{ marginBottom:10 }} />
            <ThemedInput value={fnote} onChangeText={setFnote} placeholder={T('notePlaceholder')} multiline numberOfLines={2} style={{ marginBottom:12 }} />
            <Text style={{ fontSize:16, color:TH.sub, marginBottom:8 }}>{T('quickAdd')}</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:16 }}>
              {QUICK_FOODS.map(f => (
                <TouchableOpacity key={f.name} onPress={() => { setFn(f.name); setFc(String(f.cal)); }}
                  style={{
                    paddingHorizontal:12, paddingVertical:8, borderRadius:8,
                    borderWidth:1, borderColor:TH.border,
                  }}
                >
                  <Text style={{ fontSize:16, color:TH.text }}>{f.name}</Text>
                  <Text style={{ fontSize:16, color:P, marginTop:2 }}>{f.calories ?? 0}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection:'row', gap:10 }}>
              <TouchableOpacity onPress={() => { setShowFood(false); resetFoodForm(); }}
                style={{ flex:1, padding:12, borderRadius:12, borderWidth:1, borderColor:TH.border, alignItems:'center' }}>
                <Text style={{ color:TH.sub, fontSize:16 }}>{T('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (fn.trim()) { store.addFoodEntry(fn, +fc||0, fnote); setShowFood(false); }
                }}
                style={{ flex:1, padding:12, borderRadius:12, backgroundColor:COLORS.ORANGE, alignItems:'center' }}>
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:16 }}>{T('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Water Goal Modal */}
      <Modal visible={showWG} transparent animationType="fade" onRequestClose={() => setShowWG(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.65)', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:TH.cardSolid, borderRadius:20, padding:24, alignItems:'center' }}>
            <Text style={{ fontWeight:'700', fontSize:18, marginBottom:6, color:TH.text }}>{T('waterGoalSetting')}</Text>
            <Text style={{ fontSize:16, color:TH.sub, marginBottom:16 }}>{T('waterGoalHint')}</Text>
            <TextInput
              value={wgi} onChangeText={setWgi} keyboardType="numeric"
              style={{
                width:'100%', fontSize:22, fontWeight:'700', textAlign:'center',
                backgroundColor:TH.card, borderWidth:2, borderColor:COLORS.BLUE,
                borderRadius:12, padding:14, color:TH.text, marginBottom:20,
              }}
            />
            <View style={{ flexDirection:'row', gap:10, width:'100%' }}>
              <TouchableOpacity onPress={() => setShowWG(false)}
                style={{ flex:1, padding:12, borderRadius:12, borderWidth:1, borderColor:TH.border, alignItems:'center' }}>
                <Text style={{ color:TH.sub, fontSize:16 }}>{T('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { store.setWaterGoal(Math.max(500, Math.min(3000, +wgi||2000))); setShowWG(false); }}
                style={{ flex:1, padding:12, borderRadius:12, backgroundColor:COLORS.BLUE, alignItems:'center' }}>
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:16 }}>{T('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calorie Goal Modal */}
      <Modal visible={showCG} transparent animationType="fade" onRequestClose={() => setShowCG(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.65)', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:TH.cardSolid, borderRadius:20, padding:24, alignItems:'center' }}>
            <Text style={{ fontWeight:'700', fontSize:18, marginBottom:6, color:TH.text }}>{T('calGoalSetting')}</Text>
            <Text style={{ fontSize:16, color:TH.sub, marginBottom:16 }}>{T('calGoalHint')}</Text>
            <TextInput
              value={cgi} onChangeText={setCgi} keyboardType="numeric"
              style={{
                width:'100%', fontSize:22, fontWeight:'700', textAlign:'center',
                backgroundColor:TH.card, borderWidth:2, borderColor:COLORS.GREEN,
                borderRadius:12, padding:14, color:TH.text, marginBottom:20,
              }}
            />
            <View style={{ flexDirection:'row', gap:10, width:'100%' }}>
              <TouchableOpacity onPress={() => setShowCG(false)}
                style={{ flex:1, padding:12, borderRadius:12, borderWidth:1, borderColor:TH.border, alignItems:'center' }}>
                <Text style={{ color:TH.sub, fontSize:16 }}>{T('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { store.setCalGoal(Math.max(500, Math.min(10000, +cgi||2000))); setShowCG(false); }}
                style={{ flex:1, padding:12, borderRadius:12, backgroundColor:COLORS.GREEN, alignItems:'center' }}>
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:16 }}>{T('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
