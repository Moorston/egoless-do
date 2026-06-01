import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { Card, useTheme, useT, ScreenHeader, PrimaryButton } from '../../components/UI';
import { COLORS, yesterday, FONT_BODY, FONT_TITLE, FONT_SUB } from '@egoless-do/core';
import { Shield, ShieldCheck, CheckCircle2, Clock, ChevronRight } from 'lucide-react-native';

export default function GracePage() {
  const nav   = useNavigation();
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const store = useAppStore();
  const [done, setDone] = useState(false);

  // Animation
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const yStr = yesterday();

  // Fix: properly check if yesterday has a completed checkin record
  const yesterdayRecord = store.checkinHistory?.find(h => h.date === yStr);
  const yesterdayDone = yesterdayRecord?.done === true;
  const missed = !yesterdayDone;

  useEffect(() => {
    if (done) {
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [done]);

  const restore = () => {
    store.submitCheckin(true, T('graceSuccess'), yStr);
    store.addGraceRecord(yStr);
    setDone(true);
  };

  // Grace history stats
  const graceCount = (store.graceHistory ?? []).length;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: TH.bg }}>
      <View style={{ padding:16 }}>
        <ScreenHeader title={T('graceTitle')} onBack={() => nav.goBack()} />

        {/* Status Card */}
        <Card style={{ padding:20, marginBottom:12 }}>
          <View style={{ alignItems:'center', marginBottom:16 }}>
            {done ? (
              <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems:'center' }}>
                <ShieldCheck size={48} color={COLORS.GREEN} />
                <Text style={{ fontSize:FONT_TITLE, fontWeight:'700', color:COLORS.GREEN, marginTop:12 }}>
                  {T('graceSuccess')}
                </Text>
              </Animated.View>
            ) : missed ? (
              <View style={{ alignItems:'center' }}>
                <Shield size={48} color={P} />
                <Text style={{ fontSize:FONT_TITLE, fontWeight:'700', color:TH.text, marginTop:12 }}>
                  {T('graceNeedRestore')}
                </Text>
              </View>
            ) : (
              <View style={{ alignItems:'center' }}>
                <CheckCircle2 size={48} color={COLORS.GREEN} />
                <Text style={{ fontSize:FONT_TITLE, fontWeight:'700', color:COLORS.GREEN, marginTop:12 }}>
                  {T('graceNoNeed')}
                </Text>
              </View>
            )}
          </View>

          {/* Yesterday status */}
          <View style={{
            flexDirection:'row', alignItems:'center', justifyContent:'space-between',
            padding:14, backgroundColor:TH.card, borderRadius:12, marginBottom:16,
          }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
              <Clock size={18} color={TH.sub} />
              <View>
                <Text style={{ fontSize:FONT_BODY, fontWeight:'600', color:TH.text }}>{yStr}</Text>
                <Text style={{ fontSize:FONT_SUB, color:TH.sub }}>{T('graceYesterday')}</Text>
              </View>
            </View>
            <View style={{
              paddingHorizontal:10, paddingVertical:4, borderRadius:8,
              backgroundColor: missed ? `${COLORS.ORANGE}20` : `${COLORS.GREEN}20`,
            }}>
              <Text style={{
                fontSize:FONT_SUB, fontWeight:'600',
                color: missed ? COLORS.ORANGE : COLORS.GREEN,
              }}>
                {missed ? T('graceNotDone') : T('graceDone')}
              </Text>
            </View>
          </View>

          {/* Restore button */}
          {!done && missed && (
            <PrimaryButton
              label={T('graceButton')}
              onPress={restore}
              color={P}
              style={{ width:'100%' }}
              icon={<Shield size={18} color="#fff" />}
            />
          )}

          {!done && !missed && (
            <View style={{ padding:12, alignItems:'center' }}>
              <Text style={{ fontSize:FONT_BODY, color:TH.sub }}>{T('graceAlreadyDone')}</Text>
            </View>
          )}
        </Card>

        {/* Stats Card */}
        {graceCount > 0 && (
          <Card style={{ padding:16 }}>
            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                <Clock size={18} color={P} />
                <Text style={{ fontSize:FONT_BODY, fontWeight:'600', color:TH.text }}>{T('graceStatsTitle')}</Text>
              </View>
              <Text style={{ fontSize:FONT_BODY, fontWeight:'700', color:P }}>
                {graceCount} {T('graceUsedTimes')}
              </Text>
            </View>
          </Card>
        )}

        {/* Info Card */}
        <Card style={{ padding:16, marginTop:12 }}>
          <Text style={{ fontSize:FONT_BODY, color:TH.sub, lineHeight:22 }}>
            {T('graceDesc')}
          </Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}
