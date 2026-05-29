import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { Card, useTheme, useT, ScreenHeader, PrimaryButton } from '../../components/UI';
import { COLORS, yesterday, FONT_BODY } from '@egoless-do/core';
import { CheckCircle2 } from 'lucide-react-native';

export default function GracePage() {
  const nav   = useNavigation();
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const store = useAppStore();
  const [done, setDone] = useState(false);

  const yStr   = yesterday();
  const missed = !store.checkinHistory?.some(h => h.date === yStr);

  const restore = () => {
    store.submitCheckin(true, T('graceSuccess'), yStr);
    setDone(true);
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: TH.bg }}>
      <View style={{ padding:16 }}>
        <ScreenHeader title={T('graceTitle')} onBack={() => nav.goBack()} />

        <Card style={{ padding:16 }}>
          <Text style={{ color:TH.sub, fontSize:FONT_BODY, lineHeight:24, marginBottom:16 }}>
            {T('graceDesc')}
          </Text>

          <View style={{ paddingVertical:12, borderBottomWidth:1, borderBottomColor:TH.border, marginBottom:12 }}>
            <Text style={{ fontSize:FONT_BODY, fontWeight:'600', color:TH.text, marginBottom:4 }}>{yStr}（{T('graceYesterday')}）</Text>
            <Text style={{ fontSize:FONT_BODY, color:TH.sub }}>{T('checkinSelectStatus')}：{missed ? T('graceNotDone') : T('graceDone')}</Text>
          </View>

          {done ? (
            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', padding:12, gap:6 }}>
              <CheckCircle2 size={18} color={COLORS.GREEN} />
              <Text style={{ fontSize:FONT_BODY, color:COLORS.GREEN, fontWeight:'600' }}>{T('graceSuccess')}</Text>
            </View>
          ) : (
            <PrimaryButton
              label={T('graceButton')}
              onPress={restore}
              color={missed ? P : TH.border}
              style={{ opacity: missed ? 1 : 0.5 }}
            />
          )}
        </Card>
      </View>
    </SafeAreaView>
  );
}
