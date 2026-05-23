import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useT } from '../../components/UI';
import { GLOBAL_USERS, THEMES } from '@egoless-do/core';
import type { GlobalUser } from '@egoless-do/core';

const { width: SCREEN_W } = Dimensions.get('window');

const USERS_WITH_STREAK = GLOBAL_USERS.map(u => ({
  ...u,
  streak: Math.round(u.days * (0.6 + Math.random() * 0.35)),
}));

export default function GlobalMapPage() {
  const nav = useNavigation();
  const TH  = useTheme();
  const T   = useT();
  const P   = TH.primary;
  const [sel, setSel]         = useState<GlobalUser | null>(null);
  const [showBoard, setShowBoard] = useState(false);

  if (showBoard) {
    return <LeaderboardPage users={USERS_WITH_STREAK} TH={TH} P={P} onClose={() => setShowBoard(false)} nav={nav} />;
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#000' }}>
      <View style={{ flex:1, position:'relative' }}>
        {/* Map placeholder with user markers */}
        <View style={{ flex:1, backgroundColor:'#0d1b2a', position:'relative' }}>
          {GLOBAL_USERS.map(u => {
            const left = ((u.lng + 180) / 360) * 100;
            const top  = ((90 - u.lat) / 180) * 100;
            return (
              <TouchableOpacity key={u.id} onPress={() => setSel(u)}
                style={{
                  position:'absolute', left:`${left}%`, top:`${top}%`,
                  width:26, height:26, borderRadius:13,
                  backgroundColor: u.id===1 ? P : 'rgba(255,107,53,.9)',
                  borderWidth:2, borderColor:'#fff',
                  alignItems:'center', justifyContent:'center', zIndex:2,
                }}>
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:16 }}>{u.name[0]}</Text>
              </TouchableOpacity>
            );
          })}

          {/* Selected user info */}
          {sel && (
            <View style={{
              position:'absolute', bottom:80, left:16, right:16,
              backgroundColor:'rgba(0,0,0,.85)', borderRadius:12, padding:12, zIndex:3,
            }}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' }}>
                <View>
                  <Text style={{ fontWeight:'700', fontSize:16, color:'#fff' }}>{sel.name}</Text>
                  <Text style={{ fontSize:16, color:'rgba(255,255,255,.6)', marginTop:3 }}>{T('checkinHistory')} {sel.days} {T('days')} · {sel.sport}</Text>
                  <Text style={{ fontSize:16, color:'rgba(255,255,255,.5)', marginTop:2 }}>{sel.since} {T('startDate')} · {sel.duration}</Text>
                </View>
                <TouchableOpacity onPress={() => setSel(null)}>
                  <Text style={{ color:'rgba(255,255,255,.5)', fontSize:18 }}>×</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Top overlay */}
        <View style={{
          position:'absolute', top:0, left:0, right:0,
          paddingHorizontal:16, paddingVertical:12, flexDirection:'row', alignItems:'center', gap:12,
          backgroundColor:'rgba(0,0,0,.6)', zIndex:10,
        }}>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <Text style={{ color:'#fff', fontSize:20 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontSize:20 }}>🌍</Text>
          <Text style={{ fontWeight:'700', fontSize:16, color:'#fff' }}>{T('globalPulse')}</Text>
        </View>

        {/* Bottom leaderboard button */}
        <View style={{ position:'absolute', bottom:24, left:0, right:0, alignItems:'center', zIndex:10 }}>
          <TouchableOpacity onPress={() => setShowBoard(true)}
            style={{
              paddingHorizontal:28, paddingVertical:12, borderRadius:24,
              backgroundColor:`${P}E0`,
              shadowColor:P, shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:10,
            }}>
            <Text style={{ color:'#fff', fontWeight:'700', fontSize:16 }}>🏆 {T('globalLeaderboard')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function LeaderboardPage({ users, TH, P, onClose, nav }: {
  users: (GlobalUser & { streak: number })[];
  TH: ReturnType<typeof useTheme>;
  P: string;
  onClose: () => void;
  nav: { goBack: () => void };
}) {
  const [tab, setTab] = useState(0);
  const T = useT();
  const sorted = tab === 0
    ? [...users].sort((a, b) => b.streak - a.streak)
    : [...users].sort((a, b) => b.days - a.days);

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: TH.bg }}>
      <View style={{ paddingHorizontal:16, paddingTop:16, paddingBottom:10, flexDirection:'row', alignItems:'center', gap:12 }}>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ color:TH.text, fontSize:20 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontWeight:'700', fontSize:18, color:TH.text }}>{T('globalLeaderboard')}</Text>
      </View>

      <View style={{ flexDirection:'row', paddingHorizontal:16, marginBottom:12 }}>
        {[T('globalCurrentStreak'), T('globalTotalDays')].map((l, i) => (
          <TouchableOpacity key={l} onPress={() => setTab(i)}
            style={{
              flex:1, paddingVertical:10, borderRadius:10,
              backgroundColor: tab===i ? P : 'transparent',
              alignItems:'center',
            }}>
            <Text style={{ color: tab===i ? '#fff' : TH.sub, fontWeight: tab===i ? '700' : '400', fontSize:16 }}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal:16, paddingBottom:20 }}>
        {sorted.map((u, i) => (
          <View key={u.id} style={{
            backgroundColor:TH.card, borderRadius:16, marginBottom:10,
            borderWidth:1, borderColor:TH.border,
            flexDirection:'row', alignItems:'center', gap:12, padding:12,
          }}>
            <View style={{
              width:30, height:30, borderRadius:15,
              backgroundColor: i===0 ? '#FFD700' : i===1 ? '#C0C0C0' : i===2 ? '#CD7F32' : P,
              alignItems:'center', justifyContent:'center',
            }}>
              <Text style={{ color:'#fff', fontWeight:'800', fontSize:16 }}>{i+1}</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontWeight:'600', fontSize:16, color:TH.text }}>{u.name}</Text>
              <Text style={{ fontSize:16, color:TH.sub, marginTop:2 }}>{u.sport} · {u.since}</Text>
            </View>
            <View style={{ alignItems:'flex-end' }}>
              <Text style={{ fontWeight:'800', fontSize:18, color:P }}>{tab===0 ? u.streak : u.days}</Text>
              <Text style={{ fontSize:16, color:TH.sub }}>{tab===0 ? T('globalDaysCurrent') : T('globalDaysTotal')}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

