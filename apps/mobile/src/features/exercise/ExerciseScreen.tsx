import { SPORT_GROUPS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_STAT_SECTION, FONT_BADGE, FONT_BACK, FONT_CLOSE, formatPace, EXERCISE_CATEGORIES, COMBO_WORKOUT_SPORT_KEY } from '@egoless-do/core';
import type { SportItem } from '@egoless-do/core';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Footprints, Activity, Bike, Dumbbell, ChevronRight,
  Globe, X, Search,
} from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../components/UI';
import SimpleHeader from '../../navigation/SimpleHeader';
import { useRootNavigation } from '../../navigation/hooks';
import {useShallowStore} from '../../store/useAppStore';


export default function ExerciseScreen() {
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const nav   = useRootNavigation();
  const { exerciseLog } = useShallowStore(s => ({
    exerciseLog: s.exerciseLog,
  }));
  const [showOther, setShowOther] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const SPORT_EMOJI: Record<string, string> = { '行走': '🚶', '跑步': '🏃', '骑行': '🚴' };
  const startSport = (s: SportItem | { key: string; color: string; gps: boolean }) => {
    const icon = 'icon' in s && typeof s.icon === 'string' ? s.icon : (SPORT_EMOJI[s.key] ?? '🏃');
    nav.navigate('Sport', { key: s.key, icon, color: s.color ?? P, gps: s.gps ?? false });
  };

  // ── Weekly stats ──
  const weeklyStats = useMemo(() => {
    const filtered = (exerciseLog ?? []).filter(e => !e.deleted);
    const now = Date.now();
    const weekStart = now - 7 * 24 * 3600 * 1000;
    const weekEntries = filtered.filter(e => e.timestamp >= weekStart);
    const weekKm = weekEntries.reduce((s, e) => s + (e.distanceKm ?? 0), 0);
    const weekCount = weekEntries.length;
    const weekDuration = weekEntries.reduce((s, e) => s + (e.durationSec ?? 0), 0);
    const allPaces = filtered.filter(e => e.avgPace && e.avgPace > 0).map(e => e.avgPace!);
    const bestPace = allPaces.length > 0 ? Math.min(...allPaces) : 0;
    return { weekKm, weekCount, bestPace, weekDuration };
  }, [exerciseLog]);

  // Recent sports (unique by sportKey)
  const recentSports = useMemo(() => {
    const filtered = (exerciseLog ?? []).filter(e => !e.deleted && e.sportKey);
    const seen = new Set<string>();
    const result: { key: string; icon: string; color: string; gps: boolean }[] = [];
    for (const e of filtered) {
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
  }, [exerciseLog, P]);

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
    { Icon: Footprints, icon: '🦶', label: T('exerciseWalk'), key: '行走', colors: ['#9A4EFF', '#20ECFF'] as const, gps: true },
    { Icon: Activity, icon: '🏃', label: T('exerciseRun'), key: '跑步', colors: ['#17EAD9', '#6078EA'] as const, gps: true },
    { Icon: Bike, icon: '🚴', label: T('exerciseCycle'), key: '骑行', colors: ['#8446FF', '#18CEFF'] as const, gps: true },
    { Icon: Dumbbell, icon: '💪', label: T('exerciseOther'), key: '__more__', colors: ['#BB73E0', '#FF8DDB'] as const, gps: false, more: true },
  ];

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Exercise" />
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── Hero Banner ── */}
        <View style={styles.heroBannerOuter}>
          <LinearGradient
            colors={['#7117EA', '#EA6060']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBannerInner}
          >
            <View style={styles.heroTitleRow}>
              <Text style={styles.heroTitle}>{T('exercise')}</Text>
              <TouchableOpacity onPress={() => nav.navigate('ExerciseHistory')} style={styles.heroHistoryBtn} accessibilityLabel={T('exerciseHistory')}>
                <Text style={styles.heroHistoryText}>{T('exerciseHistory')}</Text>
                <ChevronRight size={16} color="rgba(255,255,255,.8)" />
              </TouchableOpacity>
            </View>
            {weeklyStats.weekCount > 0 ? (
              <View style={styles.statsRow}>
                <View style={styles.statColumn}>
                  <Text style={styles.statValue}>{weeklyStats.weekKm.toFixed(1)}</Text>
                  <Text style={styles.statSub}>km</Text>
                  <Text style={styles.statLabel}>{T('exerciseWeeklyKm')}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statColumn}>
                  <Text style={styles.statValue}>{weeklyStats.weekCount}</Text>
                  <Text style={styles.statSub}>{T('fastTimes')}</Text>
                  <Text style={styles.statLabel}>{T('exerciseWorkouts')}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statColumn}>
                  <Text style={styles.statValue}>{Math.round(weeklyStats.weekDuration / 60)}</Text>
                  <Text style={styles.statSub}>{T('exerciseMin')}</Text>
                  <Text style={styles.statLabel}>{T('exerciseWeekTime')}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statColumn}>
                  <Text style={styles.statValue}>
                    {weeklyStats.bestPace > 0 ? formatPace(weeklyStats.bestPace) : '--:--'}
                  </Text>
                  <Text style={styles.statSub}>/km</Text>
                  <Text style={styles.statLabel}>{T('exerciseBestPace')}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.noActivityText}>{T('exerciseNoActivity')}</Text>
            )}
            <TouchableOpacity onPress={() => nav.navigate('GlobalMap', { icon: '🌍', title: `${T('linkWorld')} — ${T('exerciseGlobal')}`, type: 'exercise' })}
              style={styles.globalMapButton} accessibilityLabel={`${T('linkWorld')} — ${T('exerciseGlobal')}`}>
              <Globe size={18} color="rgba(255,255,255,.8)" />
              <Text style={styles.globalMapText}>{T('linkWorld')} — {T('exerciseGlobal')}</Text>
              <ChevronRight size={16} color="rgba(255,255,255,.8)" />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* ── Quick Start Grid ── */}
        <View style={styles.quickStartSection}>
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text, marginBottom: 12 }}>{T('exerciseQuickStart')}</Text>
          <View style={styles.quickStartGrid}>
            {quickSports.map(s => (
              <TouchableOpacity key={s.key}
                onPress={() => s.more ? setShowOther(true) : startSport({ key: s.key, icon: s.icon, color: s.colors[0], gps: s.gps })}
                style={styles.quickSportCard} accessibilityLabel={s.label}>
                <LinearGradient
                  colors={s.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickSportGradient}
                >
                  <View style={styles.quickSportTopRow}>
                    <s.Icon size={36} color="#fff" />
                    {s.gps && (
                      <View style={styles.gpsPill}>
                        <Text style={styles.gpsPillText}>{T('exerciseGpsTag')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.quickSportLabel}>{s.label}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Recent Sports ── */}
        {recentSports.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text, marginBottom: 12 }}>{T('exerciseRecentActivity')}</Text>
            <View style={{ backgroundColor: TH.card, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: TH.border }}>
              {recentSports.map((s, i) => {
                const cat = EXERCISE_CATEGORIES.find(c => c.key === s.key);
                const label = s.key === COMBO_WORKOUT_SPORT_KEY ? T('bodyComboTraining') : (cat ? T(cat.i18nKey) : s.key);
                return (
                <TouchableOpacity key={s.key}
                  onPress={() => startSport(s)}
                  accessibilityLabel={label}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: i < recentSports.length - 1 ? 1 : 0, borderBottomColor: TH.border }}>
                  <Text style={styles.sportIcon}>{s.icon}</Text>
                  <Text style={{ fontSize: FONT_BODY(), color: TH.text, flex: 1 }}>{label}</Text>
                  {s.gps && (
                    <View style={{ backgroundColor: `${P}20`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: FONT_BADGE(), color: P, fontWeight: '600' }}>{T('exerciseGpsTag')}</Text>
                    </View>
                  )}
                  <ChevronRight size={16} color={TH.sub} />
                </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── My Sports ── */}
        <View style={styles.sectionContainerMarginTop}>
          <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text, marginBottom: 12 }}>{T('exerciseMySports')}</Text>
          <View style={{ backgroundColor: TH.card, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: TH.border }}>
            {mySports.map((s, i) => (
              <TouchableOpacity key={s.key}
                onPress={() => startSport(s)}
                accessibilityLabel={s.key}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: i < mySports.length - 1 ? 1 : 0, borderBottomColor: TH.border }}>
                <Text style={styles.sportIcon}>{s.icon}</Text>
                <Text style={{ fontSize: FONT_BODY(), color: TH.text, flex: 1 }}>{s.key}</Text>
                {s.gps && (
                  <View style={{ backgroundColor: `${P}20`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: FONT_BADGE(), color: P, fontWeight: '600' }}>{T('exerciseGpsTag')}</Text>
                  </View>
                )}
                <ChevronRight size={16} color={TH.sub} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Other Sports Modal ── */}
      <Modal visible={showOther} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, height: '88%' }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: TH.border, alignSelf: 'center', marginBottom: 16 }} />
            <View style={styles.modalHeaderRow}>
              <Text style={{ fontWeight: '700', fontSize: FONT_BACK(), color: TH.text }}>{T('exerciseCategory')}</Text>
              <TouchableOpacity onPress={() => setShowOther(false)}
                accessibilityLabel={T('bodyClose') || '关闭'}
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
                placeholder={T('exerciseSearchPlaceholder')}
                placeholderTextColor={TH.sub}
                style={styles.searchInput}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityLabel={T('bodyClear') || '清除搜索'}>
                  <X size={16} color={TH.sub} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredOtherSports.length > 0 ? (
                filteredOtherSports.map(g => (
                  <View key={g.group}>
                    <Text style={{ color: TH.sub, fontSize: FONT_BODY(), fontWeight: '600', paddingVertical: 8 }}>{g.group}</Text>
                    {g.items.map(s => (
                      <TouchableOpacity key={s.key}
                        onPress={() => { startSport(s); setShowOther(false); }}
                        accessibilityLabel={s.key}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: TH.border }}>
                        <View style={styles.modalSportRowLeft}>
                          <Text style={styles.sportIcon}>{s.icon}</Text>
                          <Text style={{ fontSize: FONT_BODY(), color: TH.text }}>{s.key}</Text>
                        </View>
                        {s.gps && (
                          <View style={{ backgroundColor: `${P}20`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: FONT_BADGE(), color: P, fontWeight: '600' }}>{T('exerciseGpsTag')}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))
              ) : (
                <View style={styles.emptySearchState}>
                  <Text style={{ color: TH.sub, fontSize: FONT_BODY() }}>{T('exerciseNoResults')}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  heroBannerOuter: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroBannerInner: {
    padding: 20,
  },
  heroTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: FONT_TITLE(),
    fontWeight: '700',
    color: '#fff',
  },
  heroHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroHistoryText: {
    fontSize: FONT_BODY(),
    color: 'rgba(255,255,255,.8)',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statColumn: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: FONT_STAT_SECTION(),
    fontWeight: '900',
    color: '#fff',
  },
  statSub: {
    fontSize: FONT_SUB(),
    color: 'rgba(255,255,255,.7)',
    marginTop: 2,
  },
  statLabel: {
    fontSize: FONT_SUB(),
    color: 'rgba(255,255,255,.5)',
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,.2)',
    marginVertical: 4,
  },
  noActivityText: {
    fontSize: FONT_BODY(),
    color: 'rgba(255,255,255,.8)',
    lineHeight: 22,
  },
  globalMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,.2)',
  },
  globalMapText: {
    fontSize: FONT_BODY(),
    color: 'rgba(255,255,255,.8)',
    fontWeight: '600',
    flex: 1,
  },
  quickStartSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  quickStartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickSportCard: {
    width: '47%',
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 100,
  },
  quickSportGradient: {
    padding: 16,
    minHeight: 100,
    justifyContent: 'space-between',
  },
  quickSportTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  gpsPill: {
    backgroundColor: 'rgba(255,255,255,.25)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  gpsPillText: {
    fontSize: FONT_BADGE(),
    color: '#fff',
    fontWeight: '600',
  },
  quickSportLabel: {
    fontSize: FONT_BUTTON(),
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionContainerMarginTop: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sportIcon: {
    fontSize: FONT_CLOSE(),
    width: 36,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.7)',
    justifyContent: 'flex-end',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  modalSportRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptySearchState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
});
