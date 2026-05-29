import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../components/UI';
import { COLORS, FONT_TITLE, FONT_BODY, FONT_SUB } from '@egoless-do/core';
import { ChevronLeft, Circle } from 'lucide-react-native';

const GLOBAL_USERS: { id:number; name:string; lat:number; lng:number; days:number; sport:string; duration:string }[] = [];

export default function GlobalMapScreen() {
  const nav = useNavigation();
  const TH  = useTheme();

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between',
        paddingHorizontal:16, paddingTop:8, paddingBottom:12 }}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <ChevronLeft size={24} color={TH.text} />
          </TouchableOpacity>
          <Text style={{ color:TH.text, fontWeight:'700', fontSize:FONT_TITLE }}>全球脉动</Text>
        </View>
        <View style={{
          paddingHorizontal:12, paddingVertical:5, borderRadius:20,
          backgroundColor:`${TH.primary}22`,
        }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
            <Circle size={10} color={TH.primary} fill={TH.primary} />
            <Text style={{ color:TH.primary, fontSize:FONT_BODY, fontWeight:'600' }}>实时</Text>
          </View>
        </View>
      </View>

      {/* Map */}
      <MapView
        provider={PROVIDER_DEFAULT}
        style={{ height: 280, marginHorizontal:16, borderRadius:16 }}
        initialRegion={{ latitude:35, longitude:110, latitudeDelta:40, longitudeDelta:60 }}
        mapType="standard"
      >
        {GLOBAL_USERS.map(u => (
          <Marker key={u.id} coordinate={{ latitude:u.lat, longitude:u.lng }}
            title={u.name} description={`${u.sport} · ${u.days}天`}
          >
            <View style={{
              backgroundColor: TH.primary, borderRadius:14,
              paddingHorizontal:8, paddingVertical:4,
            }}>
              <Text style={{ color:'#fff', fontSize:FONT_BODY, fontWeight:'700' }}>{u.days}天</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Leaderboard */}
      <ScrollView style={{ flex:1, paddingHorizontal:16, marginTop:16 }}
        showsVerticalScrollIndicator={false}>
        <Text style={{ color:TH.sub, fontSize:FONT_BODY, fontWeight:'600', marginBottom:10 }}>
          打卡排行榜
        </Text>
        {GLOBAL_USERS.sort((a,b) => b.days-a.days).map((u, i) => (
          <View key={u.id} style={{
            flexDirection:'row', alignItems:'center', gap:12,
            paddingVertical:12, borderBottomWidth: i<GLOBAL_USERS.length-1 ? 1 : 0,
            borderBottomColor: TH.border,
          }}>
            <View style={{
              width:32, height:32, borderRadius:16,
              backgroundColor: i<3
                ? ['#FFD700','#C0C0C0','#CD7F32'][i]
                : `${TH.primary}30`,
              alignItems:'center', justifyContent:'center',
            }}>
              <Text style={{
                fontWeight:'800', fontSize:FONT_BODY,
                color: i<3 ? '#000' : '#fff',
              }}>{i+1}</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ color:TH.text, fontWeight:'600', fontSize:FONT_BODY }}>{u.name}</Text>
              <Text style={{ color:TH.sub, fontSize:FONT_SUB, marginTop:2 }}>{u.sport} · {u.duration}</Text>
            </View>
            <Text style={{ color:TH.primary, fontWeight:'700', fontSize:FONT_BODY }}>{u.days}天</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
