import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { THEMES, COLORS, dateStr, getTodayFoodLog, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_LABEL, FONT_STAT_CARD, FONT_HERO } from '@egoless-do/core';
import type { CheckinEntry } from '@egoless-do/core';
import { Card, useTheme, useT, ProgressBar } from '../../components/UI';
import AddFoodModal from '../../components/AddFoodModal';
import CheckinModal from './CheckinModal';
import {
  CalendarCheck, Trophy, Zap, Utensils, Scale, Footprints,
  Droplets, Pencil, Check, ClipboardList, Shield, Flame,
} from 'lucide-react-native';

function computeLongestStreak(history: CheckinEntry[]): number {
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
  const today      = dateStr();

  const [showCI, setShowCI]       = useState(false);
  const [showFood, setShowFood]   = useState(false);
  const [showWG, setShowWG]       = useState(false);
  const [wgi, setWgi]             = useState(String(store.waterGoal));
  const [showCG, setShowCG]       = useState(false);
  const [cgi, setCgi]             = useState(String(store.calGoal));

  const totalCal = useMemo(
    () => getTodayFoodLog(store.foodLog ?? []).reduce((a, f) => a + f.calories, 0),
    [store.foodLog],
  );

  const todayWeight = useMemo(() => {
    const today = dateStr();
    const todayCheckin = (store.checkinHistory ?? []).find((c: CheckinEntry) => c.date === today);
    return todayCheckin?.weight;
  }, [store.checkinHistory]);

  const weightUnit = useAppStore(s => s.weightUnit);

  const savedKcal = useMemo(() => (store.fastingHistory ?? []).reduce((sum, f) => sum + (f.estimatedKcal ?? 0), 0), [store.fastingHistory]);

  const totalCompleted = useMemo(() => (store.checkinHistory ?? []).filter((c: CheckinEntry) => c.done).length, [store.checkinHistory]);
  const longestStreak = useMemo(() => computeLongestStreak(store.checkinHistory ?? []), [store.checkinHistory]);
  const savedMeals = useMemo(() => (store.fastingHistory ?? []).length, [store.fastingHistory]);

  const statsData = useMemo(() => [
    { icon:CalendarCheck, label:T('totalCompleted'), value:`${totalCompleted}`, unit:T('days'),  bg:COLORS.ORANGE },
    { icon:Trophy, label:T('longestStreak'), value:`${longestStreak}`, unit:T('days'),  bg:COLORS.YELLOW },
    { icon:Zap, label:T('savedCalories'), value:`${savedKcal}`, unit:T('kcalUnit'), bg:'#FF8A65' },
    { icon:Utensils, label:T('savedMeals'),  value:`${savedMeals}`, unit:T('mealUnit'),  bg:COLORS.BLUE },
  ], [totalCompleted, longestStreak, savedKcal, savedMeals, T]);

  // Auto-sync health data on mount when enabled
  useEffect(() => {
    if (!store.healthSyncEnabled) return;
    import('../health/HealthService').then(({ performHealthSync }) => {
      performHealthSync(store);
    }).catch(() => {});
  }, [store.healthSyncEnabled]);


  const todayRecord = (store.checkinHistory ?? []).find((c: CheckinEntry) => c.date === today);
  const bannerState: 'notChecked' | 'notDone' | 'done' = !todayRecord ? 'notChecked' : todayRecord.done ? 'done' : 'notDone';
  const bannerColors: Record<string, string> = { notChecked: '#16A34A', notDone: '#F59E0B', done: '#3B82F6' };
  const bannerSubText: Record<string, string> = { notChecked: T('checkinDoneToday'), notDone: T('checkinModifyNotDone'), done: T('checkinDoneBanner') };
  const bannerBtnText: Record<string, string> = { notChecked: T('openCheckin'), notDone: T('checkinModify'), done: T('checkinDoneBanner') };
  const bannerBtnIcon: Record<string, React.ComponentType<any>> = { notChecked: ClipboardList, notDone: Pencil, done: Check };

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
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_TITLE, textAlign: 'center' }}>
            {T('todayCheckin')}
          </Text>
           <Text style={{ color: 'rgba(255,255,255,.75)', fontSize: FONT_BODY, textAlign: 'center', marginTop: 3 }}>
            {bannerSubText[bannerState]}
           </Text>
          <View style={{
            marginTop: 14, borderRadius: 10,
            borderWidth: 1.5, borderColor: 'rgba(255,255,255,.55)',
            padding: 11, backgroundColor: 'rgba(255,255,255,.18)',
            alignItems: 'center',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {React.createElement(bannerBtnIcon[bannerState], { size: 18, color: '#fff' })}
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON }}>
                {bannerBtnText[bannerState]}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Streak card */}
        <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Shield size={40} color={COLORS.ORANGE} />
          <Text style={{ color: TH.sub, fontSize: FONT_BODY, marginTop: 6 }}>{T('streak')}</Text>
          <Text style={{ color: COLORS.ORANGE, fontWeight: '800', fontSize: FONT_HERO, lineHeight: 64 }}>
            {store.streak}
          </Text>
          <Text style={{ color: TH.sub, fontSize: FONT_BODY }}>{T('days')}</Text>
          <Text style={{ color: TH.sub, fontSize: FONT_BODY, marginTop: 8, textAlign: 'center' }}>
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
              <s.icon size={22} color="#fff" />
              <Text style={{ fontSize: FONT_BODY, color:'rgba(255,255,255,.78)', textAlign:'center' }}>{s.label}</Text>
                <Text style={{ fontWeight:'700', color:'#fff', fontSize:FONT_STAT_CARD }}>
                {s.value}<Text style={{ fontSize:FONT_SUB, fontWeight:'400' }}> {s.unit}</Text>
              </Text>
            </View>
          ))}
        </View>

        {/* Weight card */}
        <Card>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Scale size={18} color={P} />
              <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY }}>{T('todayWeight')}</Text>
            </View>
            <View style={{ flexDirection:'row', alignItems:'baseline', gap:4 }}>
              <Text style={{ fontSize:FONT_STAT_CARD, fontWeight:'700', color:P }}>
                {todayWeight != null ? `${todayWeight}` : '—'}
              </Text>
              <Text style={{ color:TH.sub, fontSize:FONT_SUB }}>{weightUnit === 'kg' ? T('checkinKg') : T('checkinLb')}</Text>
            </View>
          </View>
        </Card>

        {/* Steps card (health sync) */}
        {store.healthSyncEnabled && store.todaySteps != null && (
          <Card>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Footprints size={18} color={TH.text} />
                <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY }}>{T('todaySteps')}</Text>
              </View>
              <Text style={{ fontSize:FONT_STAT_CARD, fontWeight:'700', color:P }}>
                {store.todaySteps.toLocaleString()}
              </Text>
            </View>
          </Card>
        )}

        {/* Water card */}
        <Card>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Droplets size={18} color={COLORS.BLUE} />
              <Text style={{ color: TH.text, fontWeight: '600', fontSize: FONT_BODY }}>{T('water')}</Text>
            </View>
            <TouchableOpacity onPress={() => { setWgi(String(store.waterGoal)); setShowWG(true); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: TH.sub, fontSize: FONT_BODY }}>
                <Text style={{ fontWeight:'600', color:P }}>{store.waterMl}</Text> ml / {store.waterGoal}ml
              </Text>
              <Pencil size={14} color={TH.sub} />
            </TouchableOpacity>
          </View>
          <View style={{ marginBottom: 12 }}>
            <ProgressBar pct={store.waterMl / store.waterGoal * 100} color={COLORS.BLUE} />
          </View>
          <TouchableOpacity onPress={() => store.addWater(250)}
            style={{ backgroundColor:COLORS.BLUE, borderRadius:10, padding:12, alignItems:'center' }}>
            <Text style={{ color:'#fff', fontWeight:'600', fontSize:FONT_BUTTON }}>+ 250ml</Text>
          </TouchableOpacity>
        </Card>

        {/* Calorie summary card */}
        <Card>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
            <Text style={{ color:COLORS.ORANGE, fontWeight:'600', fontSize:FONT_BODY }}>{T('addFood')}</Text>
            <TouchableOpacity onPress={() => { setCgi(String(store.calGoal)); setShowCG(true); }}>
              <Pencil size={16} color={TH.sub} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection:'row', alignItems:'baseline', gap:8 }}>
            <Text style={{ fontSize:FONT_STAT_CARD, fontWeight:'700', color:COLORS.ORANGE }}>{totalCal}</Text>
            <Text style={{ color:TH.sub, fontSize:FONT_SUB }}>/ {store.calGoal} kcal</Text>
          </View>
          <View style={{ marginTop:8 }}>
            <ProgressBar pct={Math.min(totalCal / store.calGoal * 100, 100)} color={COLORS.ORANGE} />
          </View>
        </Card>

        {/* Add food button */}
        <TouchableOpacity
          onPress={() => setShowFood(true)}
          style={{
            backgroundColor: COLORS.ORANGE, borderRadius: 12, padding: 14,
            alignItems: 'center', marginBottom: 12,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BUTTON }}>+ {T('addFood')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {showCI && <CheckinModal onClose={() => setShowCI(false)} />}

      <AddFoodModal visible={showFood} onClose={() => setShowFood(false)} />

      {/* Water Goal Modal */}
      <Modal visible={showWG} transparent animationType="fade" onRequestClose={() => setShowWG(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.65)', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:TH.cardSolid, borderRadius:20, padding:24, alignItems:'center' }}>
            <Text style={{ fontWeight:'700', fontSize:FONT_TITLE, marginBottom:6, color:TH.text }}>{T('waterGoalSetting')}</Text>
            <Text style={{ fontSize:FONT_BODY, color:TH.sub, marginBottom:16 }}>{T('waterGoalHint')}</Text>
            <TextInput
              value={wgi} onChangeText={setWgi} keyboardType="numeric"
              style={{
                width:'100%', fontSize:FONT_STAT_CARD, fontWeight:'700', textAlign:'center',
                backgroundColor:TH.card, borderWidth:2, borderColor:COLORS.BLUE,
                borderRadius:12, padding:14, color:TH.text, marginBottom:20,
              }}
            />
            <View style={{ flexDirection:'row', gap:10, width:'100%' }}>
              <TouchableOpacity onPress={() => setShowWG(false)}
                style={{ flex:1, padding:12, borderRadius:12, borderWidth:1, borderColor:TH.border, alignItems:'center' }}>
                <Text style={{ color:TH.sub, fontSize:FONT_BODY }}>{T('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { store.setWaterGoal(Math.max(500, Math.min(3000, +wgi||2000))); setShowWG(false); }}
                style={{ flex:1, padding:12, borderRadius:12, backgroundColor:COLORS.BLUE, alignItems:'center' }}>
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:FONT_BUTTON }}>{T('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calorie Goal Modal */}
      <Modal visible={showCG} transparent animationType="fade" onRequestClose={() => setShowCG(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.65)', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:TH.cardSolid, borderRadius:20, padding:24, alignItems:'center' }}>
            <Text style={{ fontWeight:'700', fontSize:FONT_TITLE, marginBottom:6, color:TH.text }}>{T('calGoalSetting')}</Text>
            <Text style={{ fontSize:FONT_BODY, color:TH.sub, marginBottom:16 }}>{T('calGoalHint')}</Text>
            <TextInput
              value={cgi} onChangeText={setCgi} keyboardType="numeric"
              style={{
                width:'100%', fontSize:FONT_STAT_CARD, fontWeight:'700', textAlign:'center',
                backgroundColor:TH.card, borderWidth:2, borderColor:COLORS.GREEN,
                borderRadius:12, padding:14, color:TH.text, marginBottom:20,
              }}
            />
            <View style={{ flexDirection:'row', gap:10, width:'100%' }}>
              <TouchableOpacity onPress={() => setShowCG(false)}
                style={{ flex:1, padding:12, borderRadius:12, borderWidth:1, borderColor:TH.border, alignItems:'center' }}>
                <Text style={{ color:TH.sub, fontSize:FONT_BODY }}>{T('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { store.setCalGoal(Math.max(500, Math.min(10000, +cgi||2000))); setShowCG(false); }}
                style={{ flex:1, padding:12, borderRadius:12, backgroundColor:COLORS.GREEN, alignItems:'center' }}>
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:FONT_BUTTON }}>{T('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
