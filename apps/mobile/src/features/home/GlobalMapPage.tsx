import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useT } from '../../components/UI';
import { GLOBAL_USERS, FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_STAT_CARD, FONT_STAT_SECTION, FONT_BACK } from '@egoless-do/core';
import { Globe, X, Trophy, Flame, ChevronLeft } from 'lucide-react-native';

const USERS_WITH_STREAK = GLOBAL_USERS.map(u => ({
  ...u,
  streak: Math.round(u.days * (0.6 + Math.random() * 0.35)),
  online: Math.random() > 0.4,
}));

// ── Pulse Marker ──
function PulseMarker({ u, primaryColor, onPress }: { u: typeof USERS_WITH_STREAK[0]; primaryColor: string; onPress: () => void }) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const delay = Math.random() * 2000;
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const left = ((u.lng + 180) / 360) * 100;
  const top = ((90 - u.lat) / 180) * 100;
  const color = u.id === 1 ? primaryColor : 'rgba(255,107,53,.9)';
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });

  return (
    <TouchableOpacity onPress={onPress}
      style={{ position: 'absolute', left: `${left}%`, top: `${top}%`, zIndex: 2, alignItems: 'center', justifyContent: 'center' }}>
      {/* Pulse ring */}
      <Animated.View style={{
        position: 'absolute', width: 40, height: 40, borderRadius: 20,
        backgroundColor: color, opacity: pulseOpacity,
        transform: [{ scale: pulseScale }],
      }} />
      {/* Marker */}
      <Animated.View style={{
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: color, borderWidth: 2, borderColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
        transform: [{ scale: scaleAnim }],
        shadowColor: color, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 6,
        elevation: 4,
      }}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: FONT_SUB }}>{u.name[0]}</Text>
      </Animated.View>
      {/* Online dot */}
      {u.online && (
        <View style={{
          position: 'absolute', top: -2, right: -2,
          width: 10, height: 10, borderRadius: 5,
          backgroundColor: '#22C55E', borderWidth: 1.5, borderColor: '#fff',
        }} />
      )}
    </TouchableOpacity>
  );
}

export default function GlobalMapPage({ route }: { route?: { params?: { icon?: string; title?: string } } }) {
  const nav = useNavigation();
  const TH  = useTheme();
  const T   = useT();
  const P   = TH.primary;
  const pageIconName = route?.params?.icon ?? 'Globe';
  const pageTitle = route?.params?.title ?? T('globalPulse');
  const [sel, setSel]         = useState<typeof USERS_WITH_STREAK[0] | null>(null);
  const [showBoard, setShowBoard] = useState(false);

  const onlineCount = USERS_WITH_STREAK.filter(u => u.online).length;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  if (showBoard) {
    return <LeaderboardPage users={USERS_WITH_STREAK} TH={TH} P={P} onClose={() => setShowBoard(false)} nav={nav} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ flex: 1, position: 'relative' }}>
        {/* Map background with gradient grid effect */}
        <View style={{ flex: 1, backgroundColor: '#0a0f1e', position: 'relative', overflow: 'hidden' }}>
          {/* Grid lines for atmosphere */}
          {[0.2, 0.4, 0.6, 0.8].map(pct => (
            <View key={`h${pct}`} style={{ position: 'absolute', top: `${pct * 100}%`, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,.04)' }} />
          ))}
          {[0.25, 0.5, 0.75].map(pct => (
            <View key={`v${pct}`} style={{ position: 'absolute', left: `${pct * 100}%`, top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,.04)' }} />
          ))}

          {/* User markers */}
          {USERS_WITH_STREAK.map(u => (
            <PulseMarker key={u.id} u={u} primaryColor={P} onPress={() => setSel(u)} />
          ))}

          {/* Selected user info */}
          {sel && (
            <View style={{
              position: 'absolute', bottom: 100, left: 16, right: 16,
              backgroundColor: 'rgba(10,15,30,.92)', borderRadius: 16, padding: 16, zIndex: 3,
              borderWidth: 1, borderColor: 'rgba(255,255,255,.1)',
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: sel.id === 1 ? P : 'rgba(255,107,53,.9)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: FONT_TITLE }}>{sel.name[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontWeight: '700', fontSize: FONT_TITLE, color: '#fff' }}>{sel.name}</Text>
                      {sel.online && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' }} />}
                    </View>
                    <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)', marginTop: 3 }}>
                      {sel.sport} · {sel.duration}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSel(null)} style={{ padding: 4 }}>
                  <X size={18} color="rgba(255,255,255,.5)" />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', marginTop: 14, gap: 8 }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,.06)', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: '#FF6B35' }}>{sel.streak}</Text>
                  <Text style={{ fontSize: FONT_BADGE, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{T('globalCurrentStreak')}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,.06)', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: P }}>{sel.days}</Text>
                  <Text style={{ fontSize: FONT_BADGE, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{T('globalDaysTotal')}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,.06)', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: 'rgba(255,255,255,.7)' }}>{sel.since}</Text>
                  <Text style={{ fontSize: FONT_BADGE, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{T('startDate')}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Top overlay */}
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: 'rgba(10,15,30,.8)', zIndex: 10,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => nav.goBack()} style={{ padding: 4 }}>
              <ChevronLeft size={20} color="#fff" />
            </TouchableOpacity>
            <Globe size={20} color={P} />
            <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: '#fff' }}>{pageTitle}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,197,94,.15)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#22C55E' }} />
            <Text style={{ fontSize: FONT_SUB, color: '#22C55E', fontWeight: '600' }}>{onlineCount} online</Text>
          </View>
        </View>

        {/* Bottom actions */}
        <View style={{ position: 'absolute', bottom: 28, left: 0, right: 0, alignItems: 'center', zIndex: 10, gap: 10 }}>
          <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
            <TouchableOpacity onPress={() => setShowBoard(true)}
              style={{
                paddingHorizontal: 28, paddingVertical: 14, borderRadius: 28,
                backgroundColor: `${P}E0`,
                shadowColor: P, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12,
                elevation: 6,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Trophy size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>{T('globalLeaderboard')}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Leaderboard ──
function LeaderboardPage({ users, TH, P, onClose, nav }: {
  users: typeof USERS_WITH_STREAK;
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

  const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <ChevronLeft size={20} color={TH.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Trophy size={20} color={TH.text} />
          <Text style={{ fontWeight: '700', fontSize: FONT_BACK, color: TH.text }}>{T('globalLeaderboard')}</Text>
        </View>
      </View>

      {/* Top 3 podium */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 16, gap: 8 }}>
        {[1, 0, 2].map(rank => {
          const u = sorted[rank];
          if (!u) return null;
          const isFirst = rank === 0;
          const heights = [140, 110, 90];
          const sizes = [56, 44, 40];
          return (
            <View key={u.id} style={{ alignItems: 'center', flex: isFirst ? 1.2 : 1 }}>
              <View style={{
                width: sizes[rank], height: sizes[rank], borderRadius: sizes[rank] / 2,
                backgroundColor: medalColors[rank],
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 3, borderColor: 'rgba(255,255,255,.3)',
                marginBottom: 8,
              }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: isFirst ? FONT_STAT_CARD : FONT_TITLE }}>{u.name[0]}</Text>
              </View>
              <Text style={{ fontWeight: '700', fontSize: isFirst ? FONT_BODY : FONT_SUB, color: TH.text, textAlign: 'center' }} numberOfLines={1}>{u.name}</Text>
              <View style={{ flexDirection:'row', alignItems:'center', gap:2, marginTop:2 }}>
                <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{tab === 0 ? u.streak : `${u.days} ${T('days')}`}</Text>
                {tab === 0 && <Flame size={12} color={TH.sub} />}
              </View>
              <View style={{
                width: '100%', height: heights[rank], borderRadius: 12,
                backgroundColor: medalColors[rank] + '30',
                marginTop: 8, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 10,
              }}>
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: medalColors[rank] }}>{rank + 1}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Tab switch */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 }}>
        {[T('globalCurrentStreak'), T('globalDaysTotal')].map((l, i) => (
          <TouchableOpacity key={l} onPress={() => setTab(i)}
            style={{
              flex: 1, paddingVertical: 10, borderRadius: 12,
              backgroundColor: tab === i ? P : TH.card,
              alignItems: 'center',
              borderWidth: tab === i ? 0 : 1, borderColor: TH.border,
            }}>
            <Text style={{ color: tab === i ? '#fff' : TH.sub, fontWeight: tab === i ? '700' : '500', fontSize: FONT_BODY }}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}>
        {sorted.map((u, i) => (
          <View key={u.id} style={{
            backgroundColor: TH.card, borderRadius: 14, marginBottom: 8,
            borderWidth: 1, borderColor: TH.border,
            flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
          }}>
            <View style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: i < 3 ? medalColors[i] : P,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: FONT_SUB }}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontWeight: '600', fontSize: FONT_BODY, color: TH.text }}>{u.name}</Text>
                {u.online && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' }} />}
              </View>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2 }}>{u.sport} · {u.since}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontWeight: '800', fontSize: FONT_TITLE, color: i < 3 ? medalColors[i] : P }}>
                {tab === 0 ? u.streak : u.days}
              </Text>
              <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{tab === 0 ? T('globalDaysCurrent') : T('globalDaysTotal')}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
