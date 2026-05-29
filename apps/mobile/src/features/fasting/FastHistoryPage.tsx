import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { Card, useTheme, ScreenHeader, useT } from '../../components/UI';
import { COLORS, FONT_BODY, FONT_SUB, FONT_EMPTY } from '@egoless-do/core';

export default function FastHistoryPage() {
  const nav   = useNavigation();
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const store = useAppStore();

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:40 }}>
        <ScreenHeader title={T('fastingHistory')} onBack={() => nav.goBack()} />
        {(store.fastingHistory ?? []).length === 0 && (
          <Text style={{ color:TH.sub, textAlign:'center', marginTop:60, fontSize:FONT_EMPTY }}>{T('noHistory')}</Text>
        )}
        {(store.fastingHistory ?? []).map((f, i) => {
          const started = f.startedAt ?? 0;
          const ended   = f.endedAt ?? Date.now();
          const durSec  = Math.floor((ended - started) / 1000);
          const h = Math.floor(durSec / 3600);
          const m = Math.floor((durSec % 3600) / 60);
          return (
            <Card key={f.id ?? i} style={{ paddingVertical:12 }}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                <View>
                  <Text style={{ color:TH.text, fontWeight:'600' }}>{new Date(started).toLocaleDateString('zh-CN')}</Text>
                  <Text style={{ color:TH.sub, fontSize:FONT_SUB, marginTop:2 }}>~{f.estimatedKcal ?? 0} kcal</Text>
                </View>
                <Text style={{ color:P, fontWeight:'700', fontSize:FONT_BODY }}>{h}h {m}m</Text>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
