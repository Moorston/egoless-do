import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { Card, useTheme, useT, ScreenHeader } from '../../components/UI';
import { COLORS, getTodayFoodLog, dateStr, FONT_TITLE, FONT_BODY, FONT_BUTTON, FONT_SUB, FONT_STAT_CARD, FONT_STAT_SECTION, FONT_BACK, FONT_EMPTY } from '@egoless-do/core';
import AddFoodModal from '../../components/AddFoodModal';
import { ChevronDown, ChevronRight, X } from 'lucide-react-native';

export default function FoodLogPage() {
  const nav   = useNavigation();
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const store = useAppStore();
  const [showAdd, setShowAdd]     = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const foodLog = store.foodLog ?? [];
  const totalCal = useMemo(() => getTodayFoodLog(foodLog).reduce((a, f) => a + (f.calories ?? 0), 0), [foodLog]);

  const historyGroups = useMemo(() => {
    const today = dateStr();
    const past = foodLog.filter(f => dateStr(new Date(f.timestamp)) !== today);
    const groups: Record<string, typeof past> = {};
    for (const f of past) {
      const d = dateStr(new Date(f.timestamp));
      (groups[d] ??= []).push(f);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [foodLog]);

  const totalHistoryCal = useMemo(() => historyGroups.reduce((sum, [, entries]) => sum + entries.reduce((a, f) => a + (f.calories ?? 0), 0), 0), [historyGroups]);
  const totalRecords = useMemo(() => historyGroups.reduce((sum, [, entries]) => sum + entries.length, 0), [historyGroups]);


  const confirmDelete = (id: string) => {
    Alert.alert('', T('foodDeleteConfirm'), [
      { text: T('commonCancel'), style: 'cancel' },
      { text: T('commonConfirm'), style: 'destructive', onPress: () => store.deleteFood(id) },
    ]);
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:40 }}>
        <ScreenHeader title={T('foodTitle')} onBack={() => nav.goBack()} />

        <Card style={{ alignItems:'center', paddingVertical:20 }}>
          <Text style={{ color:TH.sub, fontSize:FONT_BODY, marginBottom:8 }}>{T('foodTodayKcal')}</Text>
          <View style={{ flexDirection:'row', alignItems:'baseline', gap:8 }}>
            <Text style={{ fontSize:FONT_STAT_SECTION, fontWeight:'800', color:COLORS.ORANGE }}>{totalCal}</Text>
            <Text style={{ fontSize:FONT_BACK, color:TH.sub }}>/ {store.calGoal}</Text>
          </View>
          <Text style={{ color:COLORS.GREEN, fontSize:FONT_BODY, marginTop:6 }}>{T('foodRemaining')}: {Math.max(0, store.calGoal - totalCal)} kcal</Text>
        </Card>

        <Card>
          {getTodayFoodLog(foodLog).length === 0 ? (
            <Text style={{ color:TH.sub, fontSize:FONT_EMPTY, textAlign:'center', padding:24 }}>{T('foodEmpty')}</Text>
          ) : (
            getTodayFoodLog(foodLog).map((f, i, arr) => (
              <View key={f.id} style={{
                flexDirection:'row', justifyContent:'space-between', paddingVertical:8, paddingHorizontal:12,
                borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: TH.border,
              }}>
                <View style={{ flex:1 }}>
                  <Text style={{ fontWeight:'600', fontSize:FONT_BODY, color:TH.text }}>{f.name}</Text>
                  {f.note ? <Text style={{ fontSize:FONT_SUB, color:TH.sub }}>{f.note}</Text> : null}
                </View>
                <Text style={{ fontWeight:'700', color:P }}>{f.calories ?? 0} kcal</Text>
              </View>
            ))
          )}
        </Card>

        <TouchableOpacity onPress={() => setShowAdd(true)}
          style={{ backgroundColor:COLORS.ORANGE, borderRadius:12, padding:14, alignItems:'center', marginTop:12 }}>
          <Text style={{ color:'#fff', fontWeight:'700', fontSize:FONT_BUTTON }}>{T('foodAdd')}</Text>
        </TouchableOpacity>

        {/* ── History ── */}
        <View style={{ marginTop:24 }}>
          <TouchableOpacity onPress={() => setShowHistory(v => !v)}
            style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: showHistory ? 12 : 0 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
              <Text style={{ fontWeight:'700', fontSize:FONT_TITLE, color:TH.text }}>{T('foodHistory')}</Text>
              {showHistory ? <ChevronDown size={18} color={TH.text} /> : <ChevronRight size={18} color={TH.text} />}
            </View>
          </TouchableOpacity>
          {showHistory && (
            <>
              {/* Summary stats */}
              {historyGroups.length > 0 && (
                <View style={{ flexDirection:'row', backgroundColor:TH.card, borderWidth:1, borderColor:TH.border, borderRadius:14, paddingVertical:14, marginBottom:16 }}>
                  {[
                    { value: String(historyGroups.length), label: '天' },
                    { value: String(totalRecords), label: '条记录' },
                    { value: String(totalHistoryCal), label: 'kcal' },
                  ].map(s => (
                    <View key={s.label} style={{ flex:1, alignItems:'center' }}>
                      <Text style={{ fontSize:FONT_STAT_CARD, fontWeight:'800', color:P }}>{s.value}</Text>
                      <Text style={{ fontSize:FONT_SUB, color:TH.sub, marginTop:2 }}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              )}
              {historyGroups.length === 0 ? (
                <Text style={{ color:TH.sub, fontSize:FONT_EMPTY, textAlign:'center', padding:24 }}>{T('foodNoHistory')}</Text>
              ) : (
                <View style={{ position:'relative', paddingLeft:20 }}>
                  {/* Timeline vertical line */}
                  <View style={{ position:'absolute', left:6, top:6, bottom:6, width:2, backgroundColor:TH.border, borderRadius:1 }} />
                  {historyGroups.map(([date, entries]) => {
                    const dayCal = entries.reduce((a, f) => a + (f.calories ?? 0), 0);
                    return (
                      <View key={date} style={{ position:'relative', marginBottom:16 }}>
                        {/* Timeline dot */}
                        <View style={{ position:'absolute', left:-17, top:14, width:10, height:10, borderRadius:5, backgroundColor:P, borderWidth:2, borderColor:TH.bg }} />
                        {/* Card */}
                        <View style={{ backgroundColor:TH.card, borderWidth:1, borderColor:TH.border, borderRadius:12, overflow:'hidden' }}>
                          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:10, paddingHorizontal:14, borderBottomWidth:1, borderBottomColor:TH.border, backgroundColor:`${P}08` }}>
                            <Text style={{ fontSize:FONT_BODY, fontWeight:'600', color:TH.text }}>{date}</Text>
                            <Text style={{ fontSize:FONT_BODY, color:P, fontWeight:'700' }}>{dayCal} kcal</Text>
                          </View>
                          {entries.map((f, i) => (
                            <View key={f.id} style={{
                              flexDirection:'row', justifyContent:'space-between', alignItems:'center',
                              paddingVertical:8, paddingHorizontal:14,
                              borderTopWidth: i > 0 ? 1 : 0, borderTopColor:TH.border,
                            }}>
                              <View style={{ flex:1 }}>
                                <Text style={{ fontWeight:'600', fontSize:FONT_BODY, color:TH.text }}>{f.name}</Text>
                                {f.note ? <Text style={{ fontSize:FONT_SUB, color:TH.sub, marginLeft:8 }}>{f.note}</Text> : null}
                              </View>
                              <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                                <Text style={{ fontWeight:'700', color:P, fontSize:FONT_BODY }}>{f.calories ?? 0} kcal</Text>
                                <TouchableOpacity onPress={() => confirmDelete(f.id)} style={{ paddingLeft:8 }}>
                                  <X size={18} color="rgba(255,255,255,.3)" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <AddFoodModal visible={showAdd} onClose={() => setShowAdd(false)} />
    </SafeAreaView>
  );
}
