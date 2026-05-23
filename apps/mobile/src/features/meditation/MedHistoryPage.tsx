import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { Card, useTheme, ScreenHeader, useT } from '../../components/UI';

export default function MedHistoryPage() {
  const nav   = useNavigation();
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const store = useAppStore();
  const history = store.medHistory ?? [];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:40 }}>
        <ScreenHeader title={T('meditationHistory')} onBack={() => nav.goBack()} />
        {history.length === 0 && (
          <Text style={{ color:TH.sub, textAlign:'center', marginTop:60, fontSize:16 }}>{T('noHistory')}</Text>
        )}
        {history.map((m, i) => (
          <Card key={i} style={{ paddingVertical:12 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
              <View>
                <Text style={{ color:TH.text, fontWeight:'600' }}>{m.date}</Text>
                <Text style={{ color:TH.sub, fontSize:16, marginTop:2 }}>{m.mood}</Text>
              </View>
              <Text style={{ color:P, fontWeight:'700', fontSize:16 }}>{m.dur}</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
