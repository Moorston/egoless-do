import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme, useT, ScreenHeader } from '../../components/UI';
import { SPORT_GROUPS, THEMES } from '@egoless-do/core';
import type { SportItem, RootStackParamList } from '@egoless-do/core';
import { useAppStore } from '../../store/useAppStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ExerciseScreen() {
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const nav   = useNavigation<Nav>();
  const store = useAppStore();
  const [showOther, setShowOther] = useState(false);

  const startSport = (s: SportItem) => {
    (nav as any).navigate('Sport', { key: s.key, icon: s.icon, color: s.color ?? P });
  };

  return (
    <SafeAreaView edges={[]} style={{ flex:1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:40 }}>

        <Text style={{ fontWeight:'600', fontSize:16, marginBottom:12, color:TH.sub }}>{T('exerciseSelect')}</Text>

        {/* Quick sports */}
        {[
          { icon:'🚶', label:T('exerciseWalk'), key:'行走' },
          { icon:'🏃', label:T('exerciseRun'), key:'跑步' },
          { icon:'🚴', label:T('exerciseCycle'), key:'骑行' },
          { icon:'🏋', label:T('exerciseOther'), more:true },
        ].map(({ icon, label, key: sk, more }) => (
          <TouchableOpacity key={label}
            onPress={() => more ? setShowOther(true) : startSport({ key: sk, icon, color: P })}
            style={{
              backgroundColor:TH.card, borderWidth:1, borderColor:TH.border, borderRadius:16,
              flexDirection:'row', alignItems:'center', gap:14, padding:16, marginBottom:8,
            }}>
            <Text style={{ fontSize:32 }}>{icon}</Text>
            <View style={{ flex:1 }}>
              <Text style={{ fontWeight:'600', fontSize:16, color:TH.text }}>{label}</Text>
            </View>
            <Text style={{ color:TH.sub, fontSize:18 }}>›</Text>
          </TouchableOpacity>
        ))}

        {/* Global exercise */}
        <TouchableOpacity onPress={() => (nav as any).navigate('GlobalMap')}
          style={{
            backgroundColor:P, borderRadius:12, padding:14,
            alignItems:'center', marginTop:12, marginBottom:12,
          }}>
          <Text style={{ color:'#fff', fontWeight:'700', fontSize:16 }}>🌍 {T('exerciseGlobal')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Other sports drawer */}
      <Modal visible={showOther} transparent animationType="slide">
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.7)', justifyContent:'flex-end' }}>
          <View style={{
            backgroundColor:TH.cardSolid, borderTopLeftRadius:24, borderTopRightRadius:24,
            padding:24, maxHeight:'88%',
          }}>
            <View style={{ width:40, height:4, borderRadius:2, backgroundColor:TH.border, alignSelf:'center', marginBottom:16 }} />
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <Text style={{ fontWeight:'700', fontSize:20, color:TH.text }}>{T('exerciseCategory')}</Text>
              <TouchableOpacity onPress={() => setShowOther(false)}
                style={{ width:34, height:34, borderRadius:17, backgroundColor:TH.card, alignItems:'center', justifyContent:'center' }}>
                <Text style={{ color:TH.text, fontSize:16 }}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {SPORT_GROUPS.map(g => (
                <View key={g.group}>
                  <Text style={{ color:TH.sub, fontSize:16, fontWeight:'600', paddingVertical:8 }}>{g.group}</Text>
                  {g.items.map(s => (
                    <TouchableOpacity key={s.key}
                      onPress={() => { startSport(s); setShowOther(false); }}
                      style={{
                        flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                        paddingVertical:13, borderBottomWidth:1, borderBottomColor:TH.border,
                      }}>
                      <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
                        <Text style={{ fontSize:24, width:36, textAlign:'center' }}>{s.icon}</Text>
                        <Text style={{ fontSize:16, color:TH.text }}>{s.key}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
