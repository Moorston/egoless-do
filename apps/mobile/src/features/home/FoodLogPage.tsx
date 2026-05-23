import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { Card, useTheme, useT, ScreenHeader, ThemedInput, PrimaryButton, OutlineButton } from '../../components/UI';
import { COLORS, QUICK_FOODS } from '@egoless-do/core';

export default function FoodLogPage() {
  const nav   = useNavigation();
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const store = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [fn, setFn]     = useState('');
  const [fc, setFc]     = useState('');
  const [fnote, setFnote] = useState('');

  const totalCal = useMemo(() => (store.foodLog ?? []).reduce((a, f) => a + (f.calories ?? 0), 0), [store.foodLog]);

  const addFoodItem = () => {
    if (!fn.trim()) return;
    store.addFoodEntry(fn, +fc || 0, fnote);
    setFn(''); setFc(''); setFnote(''); setShowAdd(false);
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:40 }}>
        <ScreenHeader title={T('foodTitle')} onBack={() => nav.goBack()} />

        <Card style={{ alignItems:'center', paddingVertical:20 }}>
          <Text style={{ color:TH.sub, fontSize:16, marginBottom:8 }}>{T('foodTodayKcal')}</Text>
          <View style={{ flexDirection:'row', alignItems:'baseline', gap:8 }}>
            <Text style={{ fontSize:42, fontWeight:'800', color:COLORS.ORANGE }}>{totalCal}</Text>
            <Text style={{ fontSize:20, color:TH.sub }}>/ {store.calGoal}</Text>
          </View>
          <Text style={{ color:COLORS.GREEN, fontSize:16, marginTop:6 }}>{T('foodRemaining')}: {Math.max(0, store.calGoal - totalCal)} kcal</Text>
        </Card>

        <Card>
          {(store.foodLog ?? []).length === 0 ? (
            <Text style={{ color:TH.sub, fontSize:16, textAlign:'center', padding:24 }}>{T('foodEmpty')}</Text>
          ) : (
            (store.foodLog ?? []).map((f, i) => (
              <View key={f.id} style={{
                flexDirection:'row', justifyContent:'space-between', paddingVertical:8,
                borderBottomWidth: i < (store.foodLog ?? []).length - 1 ? 1 : 0, borderBottomColor: TH.border,
              }}>
                <View style={{ flex:1 }}>
                  <Text style={{ fontWeight:'600', fontSize:16, color:TH.text }}>{f.name}</Text>
                  {f.note ? <Text style={{ fontSize:16, color:TH.sub }}>{f.note}</Text> : null}
                </View>
                  <Text style={{ fontWeight:'700', color:P }}>{f.calories ?? 0} kcal</Text>
              </View>
            ))
          )}
        </Card>

        <TouchableOpacity onPress={() => { setFn(''); setFc(''); setFnote(''); setShowAdd(true); }}
          style={{ backgroundColor:COLORS.ORANGE, borderRadius:12, padding:14, alignItems:'center', marginTop:12 }}>
          <Text style={{ color:'#fff', fontWeight:'700', fontSize:16 }}>+ {T('foodAdd')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="fade" onRequestClose={() => setShowAdd(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.65)', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:TH.cardSolid, borderRadius:20, padding:24 }}>
            <Text style={{ fontWeight:'700', fontSize:18, marginBottom:16, color:TH.text }}>{T('foodAddTitle')}</Text>
            <ThemedInput value={fn} onChangeText={setFn} placeholder={T('foodName')} style={{ marginBottom:10, borderColor:P, borderWidth:2 }} />
            <ThemedInput value={fc} onChangeText={setFc} placeholder={T('foodCal')} keyboardType="numeric" style={{ marginBottom:10 }} />
            <ThemedInput value={fnote} onChangeText={setFnote} placeholder={T('foodInsight')} multiline numberOfLines={2} style={{ marginBottom:12 }} />
            <Text style={{ fontSize:16, color:TH.sub, marginBottom:8 }}>{T('foodQuickAdd')}</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:16 }}>
              {QUICK_FOODS.map(f => (
                <TouchableOpacity key={f.name} onPress={() => { setFn(f.name); setFc(String(f.cal)); }}
                  style={{ paddingHorizontal:12, paddingVertical:8, borderRadius:8, borderWidth:1, borderColor:TH.border }}>
                  <Text style={{ fontSize:16, color:TH.text }}>{f.name}</Text>
                  <Text style={{ fontSize:16, color:P, marginTop:2 }}>{f.calories ?? 0}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection:'row', gap:10 }}>
              <OutlineButton label={T('commonCancel')} onPress={() => setShowAdd(false)} style={{ flex:1 }} />
              <PrimaryButton label={T('foodConfirm')} onPress={addFoodItem} color={COLORS.ORANGE} style={{ flex:1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
