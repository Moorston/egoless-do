import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { Card, useTheme, ScreenHeader, useT } from '../../components/UI';
import { COLORS } from '@egoless-do/core';

export default function StatsScreen() {
  const TH    = useTheme();
  const T     = useT();
  const store = useAppStore();
  const P     = TH.primary;

  const activeHabits = (store.habits ?? []).filter(h => h.status==='inProgress').length;
  const totalCal     = (store.foodLog ?? []).reduce((a,f) => a+(f.calories ?? 0), 0);

  const statCards = [
    { label:T('streak'), value:`${store.streak}`, unit:T('days'),  icon:'🔥', bg:COLORS.ORANGE },
    { label:T('statsReflections'), value:`${(store.reflections ?? []).length}`, unit:T('fastTimes'), icon:'✦', bg:P },
    { label:T('statsMeditation'), value:`${store.totalMedMinutes}`, unit:T('medMinutes'),  icon:'☯', bg:COLORS.GREEN },
    { label:T('statsActiveHabits'), value:`${activeHabits}`, unit:T('habitDays'),  icon:'◇', bg:COLORS.BLUE },
    { label:T('foodTodayKcal'), value:`${totalCal}`, unit:'kcal', icon:'🍽', bg:'#F59E0B' },
    { label:T('checkinWater'), value:`${Math.round(store.waterMl/store.waterGoal*100)}`, unit:'%', icon:'💧', bg:COLORS.BLUE },
  ];

  const today = new Date();
  const weekData: number[] = [];
  const weekDays: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const record = (store.checkinHistory ?? []).find(c => c.date === dateStr);
    weekData.push(record?.done ? 1 : 0);
    weekDays.push(d.toLocaleDateString('zh-CN', { weekday: 'narrow' }));
  }

  return (
    <SafeAreaView edges={[]} style={{ flex:1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:40 }}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader title={T('statsTitle')} subtitle={T('statsOverview')} compact />

        {/* Stat grid */}
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:4 }}>
          {statCards.map(s => (
            <View key={s.label} style={{
              width:'47%', backgroundColor:s.bg, borderRadius:14,
              padding:16, gap:4,
            }}>
              <Text style={{ fontSize:22 }}>{s.icon}</Text>
              <Text style={{ fontSize:22, fontWeight:'800', color:'#fff' }}>
                {s.value}<Text style={{ fontSize:16, fontWeight:'400' }}> {s.unit}</Text>
              </Text>
              <Text style={{ fontSize:16, color:'rgba(255,255,255,.8)' }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Weekly bar chart */}
        <Card style={{ marginTop:12 }}>
          <Text style={{ color:TH.sub, fontSize:16, marginBottom:16 }}>{T('statsWeekChart')}</Text>
          <View style={{ flexDirection:'row', alignItems:'flex-end', gap:6, height:80 }}>
            {weekData.map((v,i) => (
              <View key={i} style={{ flex:1, alignItems:'center', gap:4 }}>
                <View style={{
                  width:'100%', borderRadius:4,
                  backgroundColor: v===1 ? P : `${P}40`,
                  height: v*60,
                }} />
                <Text style={{ fontSize:16, color:TH.sub }}>{weekDays[i]}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Habit summary */}
        {store.habits.filter(h => h.status==='inProgress').map(h => (
          <Card key={h.id}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:8 }}>
              <Text style={{ color:TH.text, fontWeight:'600', fontSize:16 }}>{h.name}</Text>
              <Text style={{ color:COLORS.ORANGE, fontWeight:'700' }}>{h.streak}{T('days')}🔥</Text>
            </View>
            <View style={{
              height:6, backgroundColor:TH.border, borderRadius:3, overflow:'hidden',
            }}>
              <View style={{
                height:6, backgroundColor:P, borderRadius:3,
                width:`${Math.min(h.doneDays/h.targetDays*100,100)}%`,
              }} />
            </View>
            <Text style={{ color:TH.sub, fontSize:16, marginTop:6 }}>
              {h.doneDays}/{h.targetDays} {T('days')} · {Math.round(h.doneDays/h.targetDays*100)}%
            </Text>
          </Card>
        ))}

        {/* Premium banner */}
        <View style={{
          borderRadius:16, padding:16,
          backgroundColor: undefined,
          // gradient: use solid for now
          flexDirection:'row', justifyContent:'space-between', alignItems:'center',
          marginTop:4, backgroundColor:'#4C1D95',
        }}>
          <View style={{ flex:1, marginRight:12 }}>
            <Text style={{ color:'#fff', fontWeight:'600', fontSize:16 }}>{T('statsUpgrade')}</Text>
            <Text style={{ color:'rgba(255,255,255,.6)', fontSize:16, marginTop:4 }}>
              {T('statsUpgradeDesc')}
            </Text>
          </View>
          <View style={{
            borderWidth:1, borderColor:'rgba(255,255,255,.35)',
            borderRadius:10, paddingHorizontal:14, paddingVertical:8,
            backgroundColor:'rgba(255,255,255,.15)',
          }}>
            <Text style={{ color:'#fff', fontSize:16 }}>{T('statsLearnMore')}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
