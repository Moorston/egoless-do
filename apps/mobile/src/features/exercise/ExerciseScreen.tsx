import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/stack';
import { useTheme, useT } from '../../components/UI';
import { SPORT_GROUPS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_STAT_SECTION, FONT_BADGE, FONT_BACK, FONT_CLOSE } from '@egoless-do/core';
import type { SportItem } from '@egoless-do/core';
import type { RootStackParamList } from '../../navigation';
import { useAppStore } from '../../store/useAppStore';
import {
  Footprints, Activity, Bike, Dumbbell, ChevronRight,
  Globe, Clock, X, Search,
} from 'lucide-react-native';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function formatPace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return '--:--';
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ExerciseScreen() {
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const nav   = useNavigation<Nav>();
  const store = useAppStore();
  const [showOther, setShowOther] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const SPORT_EMOJI: Record<string, string> = { '行走': '🚶', '跑步': '🏃', '骑行': '🚴' };
  const startSport = (s: SportItem | { key: string; color: string; gps: boolean }) => {
    const icon = 'icon' in s && typeof s.icon === 'string' ? s.icon : (SPORT_EMOJI[s.key] ?? '🏃');
    (nav as any).navigate('Sport', { key: s.key, icon, color: s.color ?? P, gps: s.gps ?? false });
  };

  // ── Weekly stats ──
  const exerciseLog = store.exerciseLog ?? [];
  const weeklyStats = useMemo(() => {
    const now = Date.now();
    const weekStart = now - 7 * 24 * 3600 * 1000;
    const weekEntries = exerciseLog.filter(e => e.timestamp >= weekStart);
    const weekKm = weekEntries.reduce((s, e) => s + (e.distanceKm ?? 0), 0);
    const weekCount = weekEntries.length;
    const allPaces = exerciseLog.filter(e => e.avgPace && e.avgPace > 0).map(e => e.avgPace!);
    const bestPace = allPaces.length > 0 ? Math.min(...allPaces) : 0;
    return { weekKm, weekCount, bestPace };
  }, [exerciseLog]);

  // Recent sports (unique by sportKey)
  const recentSports = useMemo(() => {
    const seen = new Set<string>();
    const result: { key: string; icon: string; color?: string; gps?: boolean }[] = [];
    for (const e of exerciseLog) {
      if (!seen.has(e.sportKey) && result.length < 5) {
        seen.add(e.sportKey);
        const sportDef = SPORT_GROUPS.flatMap(g => g.items).find(s => s.key === e.sportKey);
        result.push({
          key: e.sportKey,
          icon: e.sportIcon,
          color: sportDef?.color ?? P,
          gps: sportDef?.gps ?? false,
        });
      }
    }
    return result;
  }, [exerciseLog]);

  // My sports (first group)
  const mySports = SPORT_GROUPS[0]?.items ?? [];

  // Other sports (all groups including "My Sports")
  const otherGroups = SPORT_GROUPS;

  // Filtered sports for search
  const filteredOtherSports = useMemo(() => {
    if (!searchQuery.trim()) return otherGroups;
    const query = searchQuery.toLowerCase();
    return otherGroups.map(g => ({
      ...g,
      items: g.items.filter(s =>
        s.key.toLowerCase().includes(query) ||
        (s.keyEn && s.keyEn.toLowerCase().includes(query))
      ),
    })).filter(g => g.items.length > 0);
  }, [otherGroups, searchQuery]);

  const quickSports = [
    { icon: Footprints, label: T('exerciseWalk'), key: '行走', colors: ['#17EAD9', '#6078EA'] as const, gps: true },
    { icon: Activity, label: T('exerciseRun'), key: '跑步', colors: ['#9A4EFF', '#20ECFF'] as const, gps: true },
    { icon: Bike, label: T('exerciseCycle'), key: '骑行', colors: ['#FAD961', '#F76B1C'] as const, gps: true },
    { icon: Dumbbell, label: T('exerciseOther'), key: '', colors: ['#8446FF', '#18CEFF'] as const, gps: false, more: true },
  ];

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Hero Banner ── */}
        <View style={{ marginHorizontal: 16, marginTop: 12, borderRadius: 20, overflow: 'hidden' }}>
          <LinearGradient
            colors={['#7117EA', '#EA6060']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 20 }}
          >
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: '#fff', marginBottom: 12 }}>{T('exercise')}</Text>
            {weeklyStats.weekCount > 0 ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: '#fff' }}>{weeklyStats.weekKm.toFixed(1)}</Text>
                  <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>km</Text>
                  <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('exerciseWeeklyKm')}</Text>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,.2)', marginVertical: 4 }} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: '#fff' }}>{weeklyStats.weekCount}</Text>
                  <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{T('fastTimes')}</Text>
                  <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('exerciseWorkouts')}</Text>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,.2)', marginVertical: 4 }} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: '#fff' }}>
                    {weeklyStats.bestPace > 0 ? formatPace(weeklyStats.bestPace) : '--:--'}
                  </Text>
                  <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>/km</Text>
                  <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('exerciseBestPace')}</Text>
                </View>
              </View>
            ) : (
              <Text style={{ fontSize: FONT_BODY, color: 'rgba(255,255,255,.8)', lineHeight: 22 }}>{T('exerciseNoActivity')}</Text>
            )}
          </LinearGradient>
        </View>

        {/* ── Quick Start Grid ── */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, marginBottom: 12 }}>{T('exerciseQuickStart')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {quickSports.map(s => (
              <TouchableOpacity key={s.label}
                onPress={() => s.more ? setShowOther(true) : startSport({ key: s.key, icon: s.icon, color: s.colors[0], gps: s.gps })}
                style={{ width: '47%', borderRadius: 16, overflow: 'hidden', minHeight: 100 }}>
                <LinearGradient
                  colors={s.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ padding: 16, minHeight: 100, justifyContent: 'space-between' }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <s.icon size={36} color="#fff" />
                    {s.gps && (
                      <View style={{ backgroundColor: 'rgba(255,255,255,.25)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: FONT_BADGE, color: '#fff', fontWeight: '600' }}>{T('exerciseGpsTag')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: FONT_BUTTON, fontWeight: '700', color: '#fff', marginTop: 8 }}>{s.label}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Recent Sports ── */}
        {recentSports.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, marginBottom: 12 }}>{T('exerciseRecentActivity')}</Text>
            <View style={{ backgroundColor: TH.card, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: TH.border }}>
              {recentSports.map((s, i) => (
                <TouchableOpacity key={s.key}
                  onPress={() => startSport(s)}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: i < recentSports.length - 1 ? 1 : 0, borderBottomColor: TH.border }}>
                  <Text style={{ fontSize: FONT_CLOSE, width: 36, textAlign: 'center' }}>{s.icon}</Text>
                  <Text style={{ fontSize: FONT_BODY, color: TH.text, flex: 1 }}>{s.key}</Text>
                  {s.gps && (
                    <View style={{ backgroundColor: `${P}20`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: FONT_BADGE, color: P, fontWeight: '600' }}>{T('exerciseGpsTag')}</Text>
                    </View>
                  )}
                  <ChevronRight size={16} color={TH.sub} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── My Sports ── */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, marginBottom: 12 }}>{SPORT_GROUPS[0]?.group ?? '我的运动'}</Text>
          <View style={{ backgroundColor: TH.card, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: TH.border }}>
            {mySports.map((s, i) => (
              <TouchableOpacity key={s.key}
                onPress={() => startSport(s)}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: i < mySports.length - 1 ? 1 : 0, borderBottomColor: TH.border }}>
                <Text style={{ fontSize: FONT_CLOSE, width: 36, textAlign: 'center' }}>{s.icon}</Text>
                <Text style={{ fontSize: FONT_BODY, color: TH.text, flex: 1 }}>{s.key}</Text>
                {s.gps && (
                  <View style={{ backgroundColor: `${P}20`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: FONT_BADGE, color: P, fontWeight: '600' }}>{T('exerciseGpsTag')}</Text>
                  </View>
                )}
                <ChevronRight size={16} color={TH.sub} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Global Map ── */}
        <TouchableOpacity onPress={() => (nav as any).navigate('GlobalMap', { icon: '🌍', title: `${T('linkWorld')} — ${T('exerciseGlobal')}` })}
          style={{ flexDirection:'row', alignItems:'center', padding:14, gap:12, backgroundColor:TH.card, borderRadius:16, marginTop:20, marginHorizontal:16, borderWidth:1, borderColor:TH.border }}>
          <Globe size={20} color={P} />
          <Text style={{ fontSize:FONT_BODY, fontWeight:'600', color:TH.text, flex:1 }}>{T('linkWorld')} — {T('exerciseGlobal')}</Text>
          <ChevronRight size={18} color={TH.sub} />
        </TouchableOpacity>

        {/* ── Exercise History Button ── */}
        <TouchableOpacity onPress={() => nav.navigate('ExerciseHistory')}
          style={{ flexDirection:'row', alignItems:'center', padding:14, gap:12, backgroundColor:TH.card, borderRadius:16, marginTop:20, marginHorizontal:16, marginBottom:20, borderWidth:1, borderColor:TH.border }}>
          <Clock size={20} color={P} />
          <Text style={{ fontSize:FONT_BODY, fontWeight:'600', color:TH.text, flex:1 }}>{T('exerciseHistory')}</Text>
          <ChevronRight size={18} color={TH.sub} />
        </TouchableOpacity>
      </ScrollView>

      {/* ── Other Sports Modal ── */}
      <Modal visible={showOther} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.7)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, height: '88%' }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: TH.border, alignSelf: 'center', marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontWeight: '700', fontSize: FONT_BACK, color: TH.text }}>{T('exerciseCategory')}</Text>
              <TouchableOpacity onPress={() => setShowOther(false)}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: TH.card, alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} color={TH.text} />
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: TH.card, borderRadius: 12,
              borderWidth: 1, borderColor: TH.border,
              paddingHorizontal: 12, marginBottom: 16,
            }}>
              <Search size={18} color={TH.sub} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={T('exerciseSearchPlaceholder') ?? '搜索运动...'}
                placeholderTextColor={TH.sub}
                style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, color: TH.text, fontSize: FONT_BODY }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={TH.sub} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredOtherSports.length > 0 ? (
                filteredOtherSports.map(g => (
                  <View key={g.group}>
                    <Text style={{ color: TH.sub, fontSize: FONT_BODY, fontWeight: '600', paddingVertical: 8 }}>{g.group}</Text>
                    {g.items.map(s => (
                      <TouchableOpacity key={s.key}
                        onPress={() => { startSport(s); setShowOther(false); }}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: TH.border }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <Text style={{ fontSize: FONT_CLOSE, width: 36, textAlign: 'center' }}>{s.icon}</Text>
                          <Text style={{ fontSize: FONT_BODY, color: TH.text }}>{s.key}</Text>
                        </View>
                        {s.gps && (
                          <View style={{ backgroundColor: `${P}20`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: FONT_BADGE, color: P, fontWeight: '600' }}>{T('exerciseGpsTag')}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))
              ) : (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Text style={{ color: TH.sub, fontSize: FONT_BODY }}>{T('exerciseNoResults') ?? '未找到匹配的运动'}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
