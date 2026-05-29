// Lucide 图标名称映射 — 两端共享，core 包不依赖 lucide，只存名称字符串
// 各端在渲染时自行从 lucide-react / lucide-react-native 映射为组件

/** 导航栏 Tab 图标 */
export const TAB_ICONS = {
  home: 'Home',
  plan: 'ClipboardList',
  fasting: 'Timer',
  meditation: 'Brain',
  exercise: 'Dumbbell',
  settings: 'Settings',
  reflections: 'Sparkles',
  habits: 'Target',
  stats: 'BarChart3',
} as const;

/** 通用操作图标 */
export const ACTION_ICONS = {
  close: 'X',
  confirm: 'Check',
  done: 'CheckCircle2',
  undone: 'Circle',
  back: 'ChevronLeft',
  expand: 'ChevronDown',
  collapse: 'ChevronRight',
  navRight: 'ChevronRight',
  edit: 'Pencil',
  delete: 'Trash2',
  warning: 'AlertTriangle',
  plus: 'Plus',
  play: 'Play',
  pause: 'Pause',
  stop: 'Square',
  externalLink: 'ExternalLink',
  link: 'Link',
  pin: 'Pin',
} as const;

/** 功能/场景图标 */
export const FEATURE_ICONS = {
  flame: 'Flame',
  trophy: 'Trophy',
  calendar: 'CalendarCheck',
  calendarDays: 'CalendarDays',
  weight: 'Scale',
  water: 'Droplets',
  food: 'Utensils',
  steps: 'Footprints',
  music: 'Music',
  globe: 'Globe',
  refresh: 'RefreshCw',
  share: 'Share2',
  logout: 'LogOut',
  zap: 'Zap',
  trendingUp: 'TrendingUp',
  hourglass: 'Hourglass',
  clock: 'Clock',
  shield: 'Shield',
  heartCrack: 'HeartCrack',
  heart: 'Heart',
  book: 'BookOpen',
  pen: 'PenLine',
  star: 'Star',
  smile: 'Smile',
  leaf: 'Leaf',
  target: 'Target',
  history: 'History',
  user: 'User',
  bell: 'Bell',
  info: 'CircleDot',
  celebration: 'PartyPopper',
  grid: 'Grid3X3',
  activity: 'Activity',
  barChart: 'BarChart3',
  tag: 'Tag',
  settings: 'Settings',
  personStanding: 'PersonStanding',
  hand: 'Hand',
  ban: 'Ban',
  bike: 'Bike',
  waves: 'Waves',
  mountain: 'Mountain',
  apple: 'Apple',
  wheat: 'Wheat',
  beef: 'Beef',
  cupSoda: 'CupSoda',
  cookie: 'Cookie',
  salad: 'Salad',
} as const;

/** FOOD_PRESETS 图标名称映射（用于 constants.ts） */
export const FOOD_ICON_NAMES = {
  staple: 'Wheat',
  meat: 'Beef',
  veg: 'Leaf',
  fruit: 'Apple',
  drink: 'CupSoda',
  snack: 'Cookie',
  other: 'Utensils',
} as const;

export type TabIconKey = keyof typeof TAB_ICONS;
export type ActionIconKey = keyof typeof ACTION_ICONS;
export type FeatureIconKey = keyof typeof FEATURE_ICONS;
