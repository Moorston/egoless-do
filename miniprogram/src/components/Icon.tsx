import { View, Text } from '@tarojs/components';

// 使用 Unicode emoji 作为图标，兼容性最好
const ICONS: Record<string, string> = {
  // 导航
  home: '◎',
  fasting: '⏱',
  meditation: '☯',
  exercise: '🏃',
  settings: '⚙',
  reflections: '✦',
  habits: '◇',
  stats: '◈',
  
  // 操作
  add: '+',
  back: '←',
  close: '×',
  arrow: '›',
  check: '✓',
  
  // 功能
  fire: '🔥',
  water: '💧',
  food: '🍽',
  calendar: '📅',
  trophy: '🏆',
  heart: '❤️',
  star: '⭐',
  globe: '🌍',
  lock: '🔓',
  music: '🎵',
  clock: '⏰',
  timer: '⏳',
  target: '🎯',
  light: '💡',
  warning: '⚠️',
  edit: '✏',
  delete: '🗑',
  play: '▶',
  pause: '⏸',
  stop: '⏹',
  refresh: '🔄',
  share: '↗',
  pin: '📌',
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

export default function Icon({ name, size = 16, color, style }: IconProps) {
  const icon = ICONS[name] || name;
  return (
    <Text style={{ fontSize: size, color, lineHeight: 1, ...style }}>
      {icon}
    </Text>
  );
}

export { ICONS };

