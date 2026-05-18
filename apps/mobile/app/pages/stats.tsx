import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppStore, THEMES, t, ORANGE, YELLOW, GREEN, BLUE, RED } from '@egoless/core';

export default function StatsScreen() {
  const themeName = useAppStore((s) => s.themeName);
  const TH = THEMES[themeName];
  const P = TH.primary;
  const lang = useAppStore((s) => s.lang);
  const T = (k: string) => t(k, lang);

  const streak = useAppStore((s) => s.streak);
  const reflections = useAppStore((s) => s.reflections);
  const totalMedMin = useAppStore((s) => s.totalMedMin);
  const habits = useAppStore((s) => s.habits);
  const fastHistory = useAppStore((s) => s.fastHistory);

  const totalFastH = fastHistory.length;
  const activeHabits = habits.filter((h) => h.status === 'inProgress').length;

  const stats = [
    { label: T('streak'), value: `${streak} ${T('days')}`, icon: '🔥' },
    { label: '感念总数', value: `${reflections.length} 条`, icon: '✦' },
    { label: T('totalFasting'), value: `${totalFastH} 次`, icon: '⏱' },
    { label: T('totalExercise'), value: '5 次', icon: '🏃' },
    { label: '冥想时长', value: `${totalMedMin} 分`, icon: '☯' },
    { label: '活跃习惯', value: `${activeHabits} 个`, icon: '◇' },
  ];

  return (
    <View style={[s.bg, { backgroundColor: TH.bg }]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text style={[s.pageTitle, { color: TH.text, marginBottom: 12 }]}>{T('statsData')}</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          {stats.map((s, i) => (
            <View key={i} style={[s.card, { backgroundColor: TH.card, borderColor: TH.border, width: '48%', padding: 14 }]}>
              <Text style={{ fontSize: 20 }}>{s.icon}</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: TH.text, marginTop: 4 }}>{s.value}</Text>
              <Text style={{ fontSize: 11, color: TH.sub, marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* weekly chart */}
        <View style={[s.card, { backgroundColor: TH.card, borderColor: TH.border, padding: 16 }]}>
          <Text style={{ fontSize: 13, color: TH.sub, marginBottom: 12 }}>本周完成情况</Text>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-end', height: 60 }}>
            {[0.8, 1, 0.6, 1, 0.9, 0.4, 0.7].map((v, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <View style={{ width: '100%', height: v * 50, borderRadius: 4, backgroundColor: v === 1 ? P : `${P}40` }} />
                <Text style={{ fontSize: 9, color: TH.sub }}>{'一二三四五六日'[i]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* premium */}
        <TouchableOpacity style={[s.premiumCard, { backgroundColor: P }]}>
          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>{T('premiumTitle')}</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>{T('premiumSub')}</Text>
          </View>
          <View style={s.premiumBtn}>
            <Text style={{ color: '#fff', fontSize: 12 }}>{T('learnMore')}</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  pageTitle: { fontSize: 22, fontWeight: '700' },
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  premiumCard: { borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  premiumBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,.3)', backgroundColor: 'rgba(255,255,255,.15)' },
});
