import { View, Text, ScrollView } from '@tarojs/components';
import { useAppStore, THEMES, t, ORANGE, GREEN, BLUE, YELLOW, RED } from '@egoless/core';
import { Card, Btn } from '../../components/helpers';

export default function Stats() {
  const themeName = useAppStore((s) => s.themeName);
  const TH = THEMES[themeName];
  const lang = useAppStore((s) => s.lang);
  const T = (k: string) => t(k, lang);

  const streak = useAppStore((s) => s.streak);
  const reflections = useAppStore((s) => s.reflections);
  const fastHistory = useAppStore((s) => s.fastHistory);
  const medHistory = useAppStore((s) => s.medHistory);
  const habits = useAppStore((s) => s.habits);
  const totalMedMin = useAppStore((s) => s.totalMedMin);

  const stats = [
    { label: '当前连续', value: `${streak}天`, color: ORANGE },
    { label: '感念记录', value: reflections.length.toString(), color: GREEN },
    { label: '禁食次数', value: fastHistory.length.toString(), color: BLUE },
    { label: '锻炼次数', value: '0', color: YELLOW },
    { label: '冥想时长', value: `${totalMedMin}分`, color: '#7C3AED' },
    { label: '进行中习惯', value: habits.filter((h: any) => h.status === 'inProgress').length.toString(), color: GREEN },
  ];

  const weekData = [
    { label: '周一', value: 1 },
    { label: '周二', value: 1 },
    { label: '周三', value: 0 },
    { label: '周四', value: 1 },
    { label: '周五', value: 0 },
    { label: '周六', value: 1 },
    { label: '周日', value: 0 },
  ];

  return (
    <ScrollView style={{ minHeight: '100vh', padding: '14px 16px', background: TH.bg } as any}>
      {/* Stats Grid */}
      <View style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {stats.map((s, i) => (
          <Card key={i} style={{ textAlign: 'center', padding: 16 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: s.color, display: 'block' }}>{s.value}</Text>
            <Text style={{ fontSize: 11, color: TH.sub, marginTop: 4, display: 'block' }}>{s.label}</Text>
          </Card>
        ))}
      </View>

      {/* Weekly Chart */}
      <Card style={{ marginTop: 14 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: TH.text, marginBottom: 12, display: 'block' }}>
          📊 本周打卡
        </Text>
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 120 }}>
          {weekData.map((d, i) => (
            <View key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
              <View style={{
                width: 20, height: `${d.value * 100}px`, borderRadius: 4,
                background: d.value > 0 ? TH.primary : 'rgba(255,255,255,.08)',
                transition: 'height 0.3s',
              }} />
              <Text style={{ fontSize: 9, color: TH.sub }}>{d.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Premium */}
      <Card style={{ marginTop: 14, background: 'linear-gradient(135deg, #7C3AED, #EC4899)', padding: 20, textAlign: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', display: 'block' }}>🌟 高级版</Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 6, display: 'block' }}>
          解锁高级统计数据、导出功能和个性化建议
        </Text>
        <Btn onClick={() => {}} style={{ marginTop: 12, background: '#fff', color: '#7C3AED' }}>
          了解详情
        </Btn>
      </Card>
    </ScrollView>
  );
}
