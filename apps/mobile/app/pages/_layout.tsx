import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import {
  HomeIcon, ClockIcon, SparklesIcon, HeartIcon,
  BoltIcon, CheckCircleIcon, ChartBarIcon, Cog6ToothIcon,
} from '../components/HeroIcons';

const ICON_MAP: Record<string, typeof HomeIcon> = {
  index: HomeIcon,
  fasting: ClockIcon,
  meditate: SparklesIcon,
  reflections: HeartIcon,
  exercise: BoltIcon,
  habits: CheckCircleIcon,
  stats: ChartBarIcon,
  settings: Cog6ToothIcon,
};

const TABS = [
  { name: 'index',        label: '主页' },
  { name: 'fasting',      label: '禁食' },
  { name: 'meditate',     label: '冥想' },
  { name: 'reflections',  label: '感念' },
  { name: 'exercise',     label: '锻炼' },
  { name: 'habits',       label: '习惯' },
  { name: 'stats',        label: '统计' },
  { name: 'settings',     label: '设置' },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(15,10,30,.97)',
          borderTopColor: 'rgba(255,255,255,.08)',
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          height: Platform.OS === 'ios' ? 80 : 64,
        },
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: 'rgba(255,255,255,.4)',
        tabBarLabelStyle: { fontSize: 9, marginTop: -2 },
        tabBarItemStyle: { paddingVertical: 4 },
        tabBarIconStyle: { marginBottom: 0 },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.label,
            tabBarIcon: ({ color }) => {
              const Icon = ICON_MAP[t.name];
              return Icon ? <Icon size={22} color={color} /> : null;
            },
          }}
        />
      ))}
    </Tabs>
  );
}
