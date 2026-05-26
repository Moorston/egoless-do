import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/stack';
import { useTheme, useT } from '../../components/UI';
import { SPORT_GROUPS } from '@egoless-do/core';
import type { SportItem } from '@egoless-do/core';
import type { RootStackParamList } from '../../navigation';
import { useAppStore } from '../../store/useAppStore';

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
  const [showOther, setShowOther]       = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>('我的运动');
  const [showRecent, setShowRecent]     = useState(false);

  const startSport = (s: SportItem) => {
    (nav as any).navigate('Sport', { key: s.key, icon: s.icon, color: s.color ?? P, gps: s.gps ?? false });
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

  const recentEntries = exerciseLog.slice(0, 3);

  const quickSports = [
    { icon: '🚶', label: T('exerciseWalk'), key: '行走', color: '#10B981', gps: true },
    { icon: '🏃', label: T('exerciseRun'), key: '跑步', color: '#3B82F6', gps: true },
    { icon: '🚴', label: T('exerciseCycle'), key: '骑行', color: '#F97316', gps: true },
    { icon: '🏋', label: T('exerciseOther'), key: '', color: '#8B5CF6', gps: false, more: true },
  ];

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Hero Banner ── */}
        <View style={{ marginHorizontal: 16, marginTop: 12, borderRadius: 20, padding: 20, backgroundColor: P }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12 }}>{T('exercise')}</Text>
          {weeklyStats.weekCount > 0 ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff' }}>{weeklyStats.weekKm.toFixed(1)}</Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>km</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('exerciseWeeklyKm')}</Text>
              </View>
              <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,.2)', marginVertical: 4 }} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff' }}>{weeklyStats.weekCount}</Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{T('fastTimes')}</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('exerciseWorkouts')}</Text>
              </View>
              <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,.2)', marginVertical: 4 }} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff' }}>
                  {weeklyStats.bestPace > 0 ? formatPace(weeklyStats.bestPace) : '--:--'}
                </Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>/km</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{T('exerciseBestPace')}</Text>
              </View>
            </View>
          ) : (
            <Text style={{ fontSize: 15, color: 'rgba(255,255,255,.8)', lineHeight: 22 }}>{T('exerciseNoActivity')}</Text>
          )}
        </View>

        {/* ── Quick Start Grid ── */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: TH.text, marginBottom: 12 }}>{T('exerciseQuickStart')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {quickSports.map(s => (
              <TouchableOpacity key={s.label}
                onPress={() => s.more ? setShowOther(true) : startSport({ key: s.key, icon: s.icon, color: s.color, gps: s.gps })}
                style={{ width: '47%', backgroundColor: s.color, borderRadius: 16, padding: 16, minHeight: 100, justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 36 }}>{s.icon}</Text>
                  {s.gps && (
                    <View style={{ backgroundColor: 'rgba(255,255,255,.25)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 11, color: '#fff', fontWeight: '600' }}>{T('exerciseGpsTag')}</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 8 }}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Sport Categories (collapsible) ── */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          {SPORT_GROUPS.map(g => {
            const isOpen = expandedGroup === g.group;
            return (
              <View key={g.group} style={{ marginBottom: 8 }}>
                <TouchableOpacity
                  onPress={() => setExpandedGroup(isOpen ? null : g.group)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: TH.text }}>
                    {g.group} ({g.items.length})
                  </Text>
                  <Text style={{ fontSize: 14, color: TH.sub, transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}>›</Text>
                </TouchableOpacity>
                {isOpen && (
                  <View style={{ backgroundColor: TH.card, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: TH.border }}>
                    {g.items.map((s, i) => (
                      <TouchableOpacity key={s.key}
                        onPress={() => startSport(s)}
                        style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: i < g.items.length - 1 ? 1 : 0, borderBottomColor: TH.border }}>
                        <Text style={{ fontSize: 24, width: 36, textAlign: 'center' }}>{s.icon}</Text>
                        <Text style={{ fontSize: 15, color: TH.text, flex: 1 }}>{s.key}</Text>
                        {s.gps && (
                          <View style={{ backgroundColor: `${P}20`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 11, color: P, fontWeight: '600' }}>{T('exerciseGpsTag')}</Text>
                          </View>
                        )}
                        <Text style={{ fontSize: 14, color: TH.sub }}>›</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ── Recent Activity ── */}
        {recentEntries.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
            <TouchableOpacity onPress={() => setShowRecent(v => !v)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: showRecent ? 10 : 0 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: TH.text }}>{T('exerciseRecentActivity')} {showRecent ? '▾' : '▸'}</Text>
              <TouchableOpacity onPress={() => (nav as any).navigate('ExerciseHistory')}>
                <Text style={{ fontSize: 14, color: P }}>{T('exerciseViewAll')} ›</Text>
              </TouchableOpacity>
            </TouchableOpacity>
            {showRecent && recentEntries.map(e => (
              <View key={e.id} style={{ backgroundColor: TH.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: TH.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 28 }}>{e.sportIcon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: TH.text }}>{e.sportKey}</Text>
                  <Text style={{ fontSize: 13, color: TH.sub, marginTop: 2 }}>
                    {new Date(e.timestamp).toLocaleDateString('zh-CN')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: P }}>
                    {Math.floor(e.durationSec / 60)}:{String(e.durationSec % 60).padStart(2, '0')}
                  </Text>
                  {e.distanceKm ? <Text style={{ fontSize: 13, color: TH.sub }}>{e.distanceKm.toFixed(2)} km</Text> : null}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Global Map ── */}
        <TouchableOpacity onPress={() => (nav as any).navigate('GlobalMap', { icon: '🌍', title: `${T('linkWorld')} — ${T('exerciseGlobal')}` })}
          style={{ backgroundColor:TH.card, borderRadius:16, marginBottom:12, borderWidth:1, borderColor:TH.border, flexDirection:'row', alignItems:'center', gap:10, padding:12, marginTop:12 }}>
          <Text style={{ fontSize:18 }}>🌍</Text>
          <Text style={{ fontSize:16, color:TH.text }}>{T('linkWorld')} — {T('exerciseGlobal')}</Text>
          <Text style={{ marginLeft:'auto', color:TH.sub }}>›</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Other sports drawer ── */}
      <Modal visible={showOther} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.7)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '88%' }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: TH.border, alignSelf: 'center', marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontWeight: '700', fontSize: 20, color: TH.text }}>{T('exerciseCategory')}</Text>
              <TouchableOpacity onPress={() => setShowOther(false)}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: TH.card, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: TH.text, fontSize: 16 }}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {SPORT_GROUPS.map(g => (
                <View key={g.group}>
                  <Text style={{ color: TH.sub, fontSize: 16, fontWeight: '600', paddingVertical: 8 }}>{g.group}</Text>
                  {g.items.map(s => (
                    <TouchableOpacity key={s.key}
                      onPress={() => { startSport(s); setShowOther(false); }}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: TH.border }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={{ fontSize: 24, width: 36, textAlign: 'center' }}>{s.icon}</Text>
                        <Text style={{ fontSize: 16, color: TH.text }}>{s.key}</Text>
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
