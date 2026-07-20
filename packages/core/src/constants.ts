import type { Theme, ThemeName, SportGroup, GlobalUser, FoodCategory, PlanItemLink, ExerciseDef, ExerciseCategoryKey, PlanTemplate } from './types';
import { EXERCISE_CATEGORIES } from './types';

export const THEMES: Record<ThemeName, Theme> = {
  cosmos: { name:'星空 ✨', nameEn:'Cosmos ✨', bg:'#050510', card:'rgba(255,255,255,.06)', cardSolid:'rgba(10,10,25,0.95)', text:'#fff', sub:'rgba(180,170,255,.5)',   border:'rgba(150,120,255,.12)', primary:'#8B5CF6', accent:'#18CEFF', navBg:'rgba(5,5,16,.97)',    starfield:true  },
  dark:   { name:'深色',    nameEn:'Dark',      bg:'#0F0A1E', card:'rgba(255,255,255,.07)', cardSolid:'#1A1030', text:'#fff', sub:'rgba(255,255,255,.45)', border:'rgba(255,255,255,.09)', primary:'#7C3AED', accent:'#22D3EE', navBg:'rgba(15,10,30,.97)',   starfield:false },
  light:  { name:'浅色',    nameEn:'Light',     bg:'#F0EFF8', card:'rgba(255,255,255,.92)', cardSolid:'#fff',    text:'#111', sub:'#6B6B6B',               border:'#e0e0e0',                primary:'#7C3AED', accent:'#0EA5E9', navBg:'rgba(240,239,248,.97)',starfield:false },
  ocean:  { name:'深海',    nameEn:'Ocean',     bg:'#071520', card:'rgba(255,255,255,.07)', cardSolid:'#0d2035', text:'#fff', sub:'rgba(255,255,255,.4)',   border:'rgba(255,255,255,.08)', primary:'#0EA5E9', accent:'#22D3EE', navBg:'rgba(7,21,32,.97)',    starfield:false },
  rose:   { name:'玫瑰',    nameEn:'Rose',      bg:'#160810', card:'rgba(255,255,255,.07)', cardSolid:'#250f1e', text:'#fff', sub:'rgba(255,255,255,.4)',   border:'rgba(255,255,255,.08)', primary:'#EC4899', accent:'#F472B6', navBg:'rgba(22,8,16,.97)',    starfield:false },
};

export const COLORS = {
  ORANGE: '#FF6B35',
  GREEN:  '#10B981',
  RED:    '#EF4444',
  BLUE:   '#0EA5E9',
  YELLOW: '#FFC107',
  GRAY:   '#6B7280',
  VIOLET: '#7C3AED',
  INDIGO: '#4F46E5',
};

export const LINK_COLORS: Record<PlanItemLink, string> = {
  manual: COLORS.GRAY, checkin: '#6366F1', fasting: '#F59E0B',
  meditation: '#8B5CF6', exercise: '#10B981', habit: '#EC4899',
  reflection: '#F97316',
  trail: '#8B5CF6',
};

export const HABIT_LINK_COLORS: Record<import('./types').HabitLink, string> = {
  none: COLORS.GRAY, fasting: '#F59E0B', meditation: '#8B5CF6', exercise: '#10B981', sleep: '#6366F1',
};

/** Level 1: 主题主渐变 — 从 theme.primary 派生，色相不变，只变明度 */
export const THEME_GRADIENTS: Record<ThemeName, [string, string]> = {
  cosmos: ['#8B5CF6', '#6D28D9'],
  dark:   ['#7C3AED', '#5B21B6'],
  light:  ['#7C3AED', '#A78BFA'],
  ocean:  ['#0EA5E9', '#0369A1'],
  rose:   ['#EC4899', '#BE185D'],
};

/** Level 2: 状态色渐变 — 同色系深浅过渡，色相不变 */
export const STATUS_GRADIENTS = {
  SUCCESS: ['#10B981', '#059669'] as [string, string],
  WARNING: ['#F59E0B', '#D97706'] as [string, string],
  ERROR:   ['#EF4444', '#DC2626'] as [string, string],
} as const;

/** 统一卡片背景色: 将 color 以 opacity 混合到 bg 上 */
export function cardAccent(color: string, bg: string, opacity: number): string {
  const hexToRgb = (hex: string) => {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  };
  const c = hexToRgb(color);
  const b = hexToRgb(bg);
  const r = Math.round(c[0] * opacity + b[0] * (1 - opacity));
  const g = Math.round(c[1] * opacity + b[1] * (1 - opacity));
  const bl = Math.round(c[2] * opacity + b[2] * (1 - opacity));
  return '#' + [r, g, bl].map(v => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0')).join('');
}

/** 统一卡片文字色: 背景亮度 < 10% 用白字，否则用深色字 */
export function cardTextColor(bg: string): string {
  const hex = bg.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 0.1 ? '#fff' : '#1a1a2e';
}

export const WARM_CORAL = '#FF8A65';

export const MIND_COLORS = [
  ['#2D1B69','#7C3AED'],
  ['#0C4A6E','#0EA5E9'],
  ['#064E3B','#10B981'],
  ['#7C2D12','#F97316'],
  ['#4C0519','#EC4899'],
  ['#1C1917','#78716C'],
] as const;

export const MIND_COLORS_EXTENDED = [
  // 紫/紫红系
  ['#7117EA', '#EA6060'],
  ['#8446FF', '#18CEFF'],
  ['#2D1B69', '#7C3AED'],
  // 蓝/青系
  ['#6078EA', '#17EAD9'],
  // 绿系
  ['#064E3B', '#10B981'],
  // 暖色系
  ['#7C2D12', '#F97316'],
  ['#4C0519', '#EC4899'],
] as const;

export const TAGS_PRESET = ['#觉察','#灵感','#内心独白'];

export const REFLECTION_CATEGORIES = [
  { key: 'daily', label: '日常感悟', icon: '📝', color: '#8B5CF6' },
  { key: 'learning', label: '学习笔记', icon: '📚', color: '#3B82F6' },
  { key: 'goal', label: '目标复盘', icon: '🎯', color: '#10B981' },
  { key: 'emotion', label: '情绪记录', icon: '💭', color: '#EC4899' },
  { key: 'gratitude', label: '感恩日记', icon: '🙏', color: '#F59E0B' },
  { key: 'idea', label: '灵感闪现', icon: '💡', color: '#F97316' },
] as const;
export const MOOD_DISPLAY: Record<string, string> = {
  '平静': '🌿 平静',
  '开心': '😊 开心',
};
export const MOODS_PRESET: string[] = ['平静','开心'];
export const MOODS = MOODS_PRESET;
export const MOODS_EN = ['Calm','Happy'] as const;

export const FASTING_DURATIONS = [8,12,14,16,18,20,24] as const;
export const MEDITATION_DURATIONS_MIN = [1,5,10,15,20,30,45,60,120,180,300] as const;
export const MED_SOUNDS = ['海潮','雨声','钵声','鸟叫','流水','风铃','无'];

export const FOOD_PRESETS: FoodCategory[] = [
  { key:'staple', label:'主食', labelEn:'Staples', icon:'Wheat', items:[
    { name:'米饭', nameEn:'Rice', cal:200, unit:'碗', unitEn:'bowl' },
    { name:'面条', nameEn:'Noodles', cal:250, unit:'碗', unitEn:'bowl' },
    { name:'馒头', nameEn:'Steamed bun', cal:180, unit:'个', unitEn:'piece' },
    { name:'面包', nameEn:'Bread', cal:80, unit:'片', unitEn:'slice' },
    { name:'粥', nameEn:'Congee', cal:100, unit:'碗', unitEn:'bowl' },
    { name:'饺子', nameEn:'Dumplings', cal:30, unit:'个', unitEn:'piece' },
    { name:'包子', nameEn:'Baozi', cal:150, unit:'个', unitEn:'piece' },
    { name:'红薯', nameEn:'Sweet potato', cal:120, unit:'个', unitEn:'piece' },
  ]},
  { key:'meat', label:'肉蛋', labelEn:'Meat & Eggs', icon:'Beef', items:[
    { name:'鸡胸肉', nameEn:'Chicken breast', cal:165, unit:'份', unitEn:'serving' },
    { name:'牛肉', nameEn:'Beef', cal:250, unit:'份', unitEn:'serving' },
    { name:'猪肉', nameEn:'Pork', cal:240, unit:'份', unitEn:'serving' },
    { name:'鸡蛋', nameEn:'Egg', cal:70, unit:'个', unitEn:'piece' },
    { name:'鱼肉', nameEn:'Fish', cal:130, unit:'份', unitEn:'serving' },
    { name:'虾', nameEn:'Shrimp', cal:100, unit:'份', unitEn:'serving' },
    { name:'豆腐', nameEn:'Tofu', cal:80, unit:'块', unitEn:'block' },
  ]},
  { key:'veg', label:'蔬菜', labelEn:'Vegetables', icon:'Leaf', items:[
    { name:'西兰花', nameEn:'Broccoli', cal:55, unit:'份', unitEn:'serving' },
    { name:'番茄', nameEn:'Tomato', cal:25, unit:'个', unitEn:'piece' },
    { name:'黄瓜', nameEn:'Cucumber', cal:15, unit:'根', unitEn:'piece' },
    { name:'生菜', nameEn:'Lettuce', cal:10, unit:'份', unitEn:'serving' },
    { name:'胡萝卜', nameEn:'Carrot', cal:30, unit:'根', unitEn:'piece' },
    { name:'土豆', nameEn:'Potato', cal:130, unit:'个', unitEn:'piece' },
    { name:'玉米', nameEn:'Corn', cal:110, unit:'根', unitEn:'piece' },
  ]},
  { key:'fruit', label:'水果', labelEn:'Fruits', icon:'Apple', items:[
    { name:'苹果', nameEn:'Apple', cal:95, unit:'个', unitEn:'piece' },
    { name:'香蕉', nameEn:'Banana', cal:105, unit:'根', unitEn:'piece' },
    { name:'橙子', nameEn:'Orange', cal:60, unit:'个', unitEn:'piece' },
    { name:'葡萄', nameEn:'Grapes', cal:100, unit:'串', unitEn:'bunch' },
    { name:'西瓜', nameEn:'Watermelon', cal:90, unit:'块', unitEn:'slice' },
    { name:'草莓', nameEn:'Strawberry', cal:50, unit:'份', unitEn:'serving' },
    { name:'猕猴桃', nameEn:'Kiwi', cal:45, unit:'个', unitEn:'piece' },
  ]},
  { key:'drink', label:'饮品', labelEn:'Drinks', icon:'CupSoda', items:[
    { name:'牛奶', nameEn:'Milk', cal:150, unit:'杯', unitEn:'cup' },
    { name:'豆浆', nameEn:'Soy milk', cal:80, unit:'杯', unitEn:'cup' },
    { name:'咖啡（黑）', nameEn:'Black coffee', cal:5, unit:'杯', unitEn:'cup' },
    { name:'拿铁', nameEn:'Latte', cal:190, unit:'杯', unitEn:'cup' },
    { name:'果汁', nameEn:'Juice', cal:120, unit:'杯', unitEn:'cup' },
    { name:'奶茶', nameEn:'Milk tea', cal:350, unit:'杯', unitEn:'cup' },
    { name:'可乐', nameEn:'Cola', cal:140, unit:'罐', unitEn:'can' },
    { name:'酸奶', nameEn:'Yogurt', cal:100, unit:'杯', unitEn:'cup' },
  ]},
  { key:'snack', label:'零食', labelEn:'Snacks', icon:'Cookie', items:[
    { name:'坚果', nameEn:'Nuts', cal:170, unit:'份', unitEn:'serving' },
    { name:'饼干', nameEn:'Cookies', cal:150, unit:'包', unitEn:'pack' },
    { name:'巧克力', nameEn:'Chocolate', cal:230, unit:'块', unitEn:'bar' },
    { name:'蛋糕', nameEn:'Cake', cal:300, unit:'块', unitEn:'slice' },
    { name:'冰淇淋', nameEn:'Ice cream', cal:200, unit:'份', unitEn:'serving' },
    { name:'薯片', nameEn:'Chips', cal:160, unit:'包', unitEn:'pack' },
  ]},
  { key:'other', label:'其他', labelEn:'Other', icon:'Utensils', items:[
    { name:'沙拉', nameEn:'Salad', cal:150, unit:'份', unitEn:'serving' },
    { name:'三明治', nameEn:'Sandwich', cal:350, unit:'个', unitEn:'piece' },
    { name:'汉堡', nameEn:'Burger', cal:500, unit:'个', unitEn:'piece' },
    { name:'披萨', nameEn:'Pizza', cal:280, unit:'片', unitEn:'slice' },
    { name:'方便面', nameEn:'Instant noodles', cal:400, unit:'碗', unitEn:'bowl' },
    { name:'火锅', nameEn:'Hot pot', cal:600, unit:'份', unitEn:'serving' },
  ]},
];

export const SPORT_GROUPS: SportGroup[] = [
  { group:'我的运动', groupEn:'My Sports', items:[
    { key:'户外骑行', keyEn:'Outdoor Cycling', icon:'🚴', color:'#4CAF50', gps:true },
    { key:'室内跑步', keyEn:'Indoor Running',  icon:'🏃', color:'#2196F3', gps:false },
    { key:'户外跑步', keyEn:'Outdoor Running', icon:'🏃‍♂️', color:'#1565C0', gps:true },
    { key:'爬楼梯',   keyEn:'Stair Climbing',  icon:'🧗', color:'#9C27B0', gps:false },
    { key:'行走',     keyEn:'Walking',         icon:'🚶', color:'#66BB6A', gps:true },
  ]},
  { group:'传统功法', groupEn:'Traditional', items:[
    { key:'太极',     keyEn:'Tai Chi',          icon:'☯', color:'#4CAF50', gps:false },
    { key:'八卦',     keyEn:'Bagua',            icon:'☰', color:'#66BB6A', gps:false },
    { key:'形意',     keyEn:'Xingyi',           icon:'🐉', color:'#388E3C', gps:false },
    { key:'铁牛',     keyEn:'Iron Bull',        icon:'🐂', color:'#795548', gps:false },
    { key:'太阳摸经', keyEn:'Sun Salutation',   icon:'☀️', color:'#FFA726', gps:false },
  ]},
  { group:'自重训练', groupEn:'Bodyweight', items:[
    { key:'俯卧撑',   keyEn:'Push-ups',         icon:'💪', color:'#FF5722', gps:false },
    { key:'引体向上', keyEn:'Pull-ups',          icon:'🏋', color:'#E64A19', gps:false },
    { key:'深蹲',     keyEn:'Squats',            icon:'🦵', color:'#F57C00', gps:false },
    { key:'平板支撑', keyEn:'Plank',             icon:'🧱', color:'#FF9800', gps:false },
    { key:'波比跳',   keyEn:'Burpees',           icon:'🔥', color:'#FF7043', gps:false },
  ]},
  { group:'有氧运动', groupEn:'Cardio', items:[
    { key:'跳绳',     keyEn:'Jump Rope',         icon:'⚡', color:'#FF9800', gps:false },
    { key:'瑜伽',     keyEn:'Yoga',              icon:'🧘', color:'#9C27B0', gps:false },
    { key:'放松运动', keyEn:'Relaxation',         icon:'🌿', color:'#81C784', gps:false },
    { key:'热身运动', keyEn:'Warm-up',            icon:'🔥', color:'#FFB74D', gps:false },
    { key:'游泳',     keyEn:'Swimming',           icon:'🏊', color:'#00BCD4', gps:false },
    { key:'滑板',     keyEn:'Skateboarding',      icon:'🛹', color:'#7E57C2', gps:true },
    { key:'划船机',   keyEn:'Rowing Machine',     icon:'🚣', color:'#0288D1', gps:false },
    { key:'舞蹈',     keyEn:'Dance',              icon:'💃', color:'#E91E63', gps:false },
  ]},
  { group:'球类运动', groupEn:'Ball Sports', items:[
    { key:'羽毛球',   keyEn:'Badminton',         icon:'🏸', color:'#4CAF50', gps:false },
    { key:'足球',     keyEn:'Football',           icon:'⚽', color:'#2196F3', gps:false },
    { key:'篮球',     keyEn:'Basketball',         icon:'🏀', color:'#FF5722', gps:false },
    { key:'乒乓球',   keyEn:'Table Tennis',       icon:'🏓', color:'#009688', gps:false },
    { key:'网球',     keyEn:'Tennis',             icon:'🎾', color:'#8BC34A', gps:false },
    { key:'排球',     keyEn:'Volleyball',         icon:'🏐', color:'#00BCD4', gps:false },
  ]},
  { group:'格斗/HIIT', groupEn:'Martial/HIIT', items:[
    { key:'拳击',     keyEn:'Boxing',             icon:'🥊', color:'#D32F2F', gps:false },
    { key:'高抬腿',   keyEn:'High Knees',         icon:'🦵', color:'#FF5722', gps:false },
    { key:'深蹲跳',   keyEn:'Jump Squat',         icon:'⬆️', color:'#F57C00', gps:false },
  ]},
  { group:'柔韧/平衡', groupEn:'Flexibility', items:[
    { key:'下犬式',   keyEn:'Downward Dog',       icon:'🐕', color:'#7B1FA2', gps:false },
    { key:'鸽子式',   keyEn:'Pigeon Pose',        icon:'🐦', color:'#9C27B0', gps:false },
    { key:'眼镜蛇式', keyEn:'Cobra Pose',         icon:'🐍', color:'#AB47BC', gps:false },
  ]},
  { group:'户外/GPS', groupEn:'Outdoor/GPS', items:[
    { key:'徒步',     keyEn:'Hiking',             icon:'🥾', color:'#388E3C', gps:true },
  ]},
];

export const ALL_SPORTS = SPORT_GROUPS.flatMap(g => g.items);

// Sport type classification
export type SportType = 'gps' | 'timed' | 'repetition';

// GPS sports: track distance with GPS
const GPS_SPORTS = ['行走', '跑步', '骑行', '户外骑行', '室内跑步', '户外跑步', '滑板', '徒步'];

// Repetition sports: count reps (push-ups, pull-ups, squats, etc.)
const REP_SPORTS = ['俯卧撑', '引体向上', '深蹲', '波比跳', '跳绳'];

// Timed sports: only track time (yoga, tai chi, plank, etc.)
const TIMED_SPORTS = ['太极', '八卦', '形意', '铁牛', '太阳摸经', '平板支撑', '瑜伽', '放松运动', '热身运动', '游泳', '爬楼梯', '划船机', '舞蹈', '拳击', '下犬式', '鸽子式', '眼镜蛇式', '排球'];

export function getSportType(sportKey: string, isGps: boolean): SportType {
  if (isGps || GPS_SPORTS.includes(sportKey)) return 'gps';
  if (REP_SPORTS.includes(sportKey)) return 'repetition';
  return 'timed';
}

// 最短运动时长阈值（秒），低于此值提示运动时间过短
const MIN_DURATION_60S = [
  ...GPS_SPORTS,                                            // GPS 运动
  '太极', '八卦', '形意', '铁牛', '太阳摸经', '瑜伽',     // 冥想类
  '羽毛球', '足球', '篮球', '乒乓球', '网球', '排球', // 球类
  '划船机', '舞蹈', '拳击',                               // 有氧/格斗
];
const DEFAULT_MIN_DURATION = 30;

export function getMinDuration(sportKey: string): number {
  return MIN_DURATION_60S.includes(sportKey) ? 60 : DEFAULT_MIN_DURATION;
}

// Target presets for different sport types
export const TARGET_PRESETS: Record<SportType, { distance?: Array<{ label: string; labelEn: string; value: number }>; time: Array<{ label: string; labelEn: string; value: number }>; calories: Array<{ label: string; labelEn: string; value: number }>; reps?: Array<{ label: string; labelEn: string; value: number }> }> = {
  gps: {
    distance: [
      { label: '3 公里', labelEn: '3 km', value: 3 },
      { label: '5 公里', labelEn: '5 km', value: 5 },
      { label: '10 公里', labelEn: '10 km', value: 10 },
      { label: '半马', labelEn: 'Half Marathon', value: 21.1 },
    ],
    time: [
      { label: '30 分钟', labelEn: '30 min', value: 30 * 60 },
      { label: '60 分钟', labelEn: '60 min', value: 60 * 60 },
      { label: '90 分钟', labelEn: '90 min', value: 90 * 60 },
    ],
    calories: [
      { label: '200 千卡', labelEn: '200 kcal', value: 200 },
      { label: '300 千卡', labelEn: '300 kcal', value: 300 },
      { label: '500 千卡', labelEn: '500 kcal', value: 500 },
    ],
  },
  timed: {
    time: [
      { label: '10 分钟', labelEn: '10 min', value: 10 * 60 },
      { label: '20 分钟', labelEn: '20 min', value: 20 * 60 },
      { label: '30 分钟', labelEn: '30 min', value: 30 * 60 },
      { label: '60 分钟', labelEn: '60 min', value: 60 * 60 },
    ],
    calories: [
      { label: '100 千卡', labelEn: '100 kcal', value: 100 },
      { label: '200 千卡', labelEn: '200 kcal', value: 200 },
      { label: '300 千卡', labelEn: '300 kcal', value: 300 },
    ],
  },
  repetition: {
    reps: [
      { label: '20 次', labelEn: '20 reps', value: 20 },
      { label: '50 次', labelEn: '50 reps', value: 50 },
      { label: '100 次', labelEn: '100 reps', value: 100 },
    ],
    time: [
      { label: '5 分钟', labelEn: '5 min', value: 5 * 60 },
      { label: '10 分钟', labelEn: '10 min', value: 10 * 60 },
      { label: '15 分钟', labelEn: '15 min', value: 15 * 60 },
    ],
    calories: [
      { label: '100 千卡', labelEn: '100 kcal', value: 100 },
      { label: '200 千卡', labelEn: '200 kcal', value: 200 },
      { label: '300 千卡', labelEn: '300 kcal', value: 300 },
    ],
  },
};

export const MET_MAP: Record<string, number> = {
  '行走': 3.5, '跑步': 7, '骑行': 6, '户外骑行': 6, '室内跑步': 7, '户外跑步': 8,
  '太极': 3, '八卦': 4, '形意': 5, '铁牛': 6, '太阳摸经': 3.5,
  '俯卧撑': 8, '引体向上': 8, '深蹲': 6, '平板支撑': 4, '波比跳': 10,
  '跳绳': 12, '瑜伽': 3, '放松运动': 2.5, '热身运动': 3.5, '滑板': 5,
  '游泳': 8, '爬楼梯': 9, '羽毛球': 7, '足球': 10, '篮球': 8,
  '乒乓球': 4, '网球': 7, '划船机': 7, '舞蹈': 5, '拳击': 9,
  '高抬腿': 8, '深蹲跳': 10, '下犬式': 2.5, '鸽子式': 2.5, '眼镜蛇式': 2.5,
  '排球': 6, '徒步': 6.5,
};

export function estimateCalories(sportKey: string, durationSec: number, weight = 70): number {
  const met = MET_MAP[sportKey] ?? 4;
  return Math.round(met * weight * (durationSec / 3600));
}

// ─── Sport experience classification ─────────────────────────
export type SportExperienceType = 'meditative' | 'endurance' | 'strength' | 'interval';

const MEDITATIVE_SPORTS = ['太极', '八卦', '形意', '铁牛', '太阳摸经', '瑜伽'];
const ENDURANCE_SPORTS = ['游泳', '爬楼梯', '平板支撑'];
const INTERVAL_SPORTS = ['波比跳', '开合跳', '高抬腿'];

export function getSportExperienceType(sportKey: string, sportType: SportType): SportExperienceType {
  if (MEDITATIVE_SPORTS.includes(sportKey)) return 'meditative';
  if (INTERVAL_SPORTS.includes(sportKey)) return 'interval';
  if (ENDURANCE_SPORTS.includes(sportKey)) return 'endurance';
  return 'strength';
}

// ─── Soft targets (recommended values for free mode) ─────────
export interface SoftTarget { beginner: number; intermediate: number; advanced: number; unit: 'min' | 'reps' | 'sets'; }

export const SOFT_TARGETS: Record<string, SoftTarget> = {
  '瑜伽':    { beginner: 15, intermediate: 30, advanced: 60, unit: 'min' },
  '太极':    { beginner: 10, intermediate: 20, advanced: 40, unit: 'min' },
  '八卦':    { beginner: 10, intermediate: 20, advanced: 40, unit: 'min' },
  '形意':    { beginner: 10, intermediate: 20, advanced: 30, unit: 'min' },
  '铁牛':    { beginner: 10, intermediate: 15, advanced: 30, unit: 'min' },
  '太阳摸经': { beginner: 10, intermediate: 15, advanced: 30, unit: 'min' },
  '平板支撑': { beginner: 30, intermediate: 60, advanced: 120, unit: 'min' },
  '游泳':    { beginner: 15, intermediate: 30, advanced: 45, unit: 'min' },
  '爬楼梯':  { beginner: 10, intermediate: 20, advanced: 30, unit: 'min' },
  '放松运动': { beginner: 5, intermediate: 10, advanced: 15, unit: 'min' },
  '热身运动': { beginner: 5, intermediate: 10, advanced: 15, unit: 'min' },
  '俯卧撑':  { beginner: 30, intermediate: 60, advanced: 100, unit: 'reps' },
  '引体向上': { beginner: 10, intermediate: 20, advanced: 40, unit: 'reps' },
  '深蹲':    { beginner: 30, intermediate: 60, advanced: 100, unit: 'reps' },
  '波比跳':  { beginner: 20, intermediate: 40, advanced: 60, unit: 'reps' },
  '跳绳':    { beginner: 100, intermediate: 300, advanced: 500, unit: 'reps' },
  '高抬腿':  { beginner: 30, intermediate: 60, advanced: 100, unit: 'reps' },
  '深蹲跳':  { beginner: 15, intermediate: 30, advanced: 50, unit: 'reps' },
  '户外跑步': { beginner: 15, intermediate: 30, advanced: 60, unit: 'min' },
  '划船机':  { beginner: 10, intermediate: 20, advanced: 30, unit: 'min' },
  '舞蹈':    { beginner: 15, intermediate: 30, advanced: 45, unit: 'min' },
  '拳击':    { beginner: 10, intermediate: 20, advanced: 30, unit: 'min' },
  '下犬式':  { beginner: 1, intermediate: 2, advanced: 3, unit: 'min' },
  '鸽子式':  { beginner: 1, intermediate: 2, advanced: 3, unit: 'min' },
  '眼镜蛇式': { beginner: 1, intermediate: 2, advanced: 3, unit: 'min' },
  '排球':    { beginner: 15, intermediate: 30, advanced: 60, unit: 'min' },
  '徒步':    { beginner: 30, intermediate: 60, advanced: 120, unit: 'min' },
};

export function getSoftTarget(sportKey: string): SoftTarget | undefined {
  return SOFT_TARGETS[sportKey];
}

// ─── Exercise sounds ────────────────────────────────────────
export const EXERCISE_SOUNDS = [
  { key: '无', file: null },
  { key: '海潮', file: 'ocean.mp3' },
  { key: '雨声', file: 'rain.mp3' },
  { key: '钵声', file: 'bowl.mp3' },
  { key: '鸟叫', file: 'birds.mp3' },
  { key: '流水', file: 'flowing-stream.mp3' },
  { key: '风铃', file: 'wind-chimes.mp3' },
];

// ─── Milestone definitions ──────────────────────────────────
export interface Milestone { value: number; label: string; labelEn: string; }

export const REP_MILESTONES: Milestone[] = [
  { value: 10,  label: '双位数！继续 💪', labelEn: 'Double digits! 💪' },
  { value: 50,  label: '半百达成！🔥', labelEn: 'Half century! 🔥' },
  { value: 100, label: '百次俱乐部！🏆', labelEn: 'Century club! 🏆' },
  { value: 200, label: '两百次！逆天 🌟', labelEn: '200 reps! 🌟' },
];

export const TIME_MILESTONES: Milestone[] = [
  { value: 10 * 60, label: '已坚持 10 分钟 ⏱', labelEn: '10 minutes! ⏱' },
  { value: 20 * 60, label: '20 分钟！了不起 🌟', labelEn: '20 minutes! 🌟' },
  { value: 30 * 60, label: '半小时达成！🏆', labelEn: '30 minutes! 🏆' },
  { value: 60 * 60, label: '一小时！太强了 🔥', labelEn: '1 hour! 🔥' },
];

export const SPORT_BG_COLORS: Record<string, string> = {
  爬楼梯: '#4CAF50', 跳绳: '#FF9800', 游泳: '#00BCD4',
  瑜伽: '#9C27B0', 篮球: '#FF5722', 足球: '#4CAF50', 羽毛球: '#2196F3',
  太极: '#4CAF50', 八卦: '#66BB6A', 形意: '#388E3C', 铁牛: '#795548', 太阳摸经: '#FFA726',
  俯卧撑: '#FF5722', 引体向上: '#E64A19', 深蹲: '#F57C00', 平板支撑: '#FF9800', 波比跳: '#FF7043',
  放松运动: '#81C784', 热身运动: '#FFB74D', 滑板: '#7E57C2',
  户外骑行: '#4CAF50', 室内跑步: '#2196F3', 乒乓球: '#009688', 网球: '#8BC34A',
  户外跑步: '#1565C0', 行走: '#66BB6A', 划船机: '#0288D1', 舞蹈: '#E91E63',
  拳击: '#D32F2F', 高抬腿: '#FF5722', 深蹲跳: '#F57C00',
  下犬式: '#7B1FA2', 鸽子式: '#9C27B0', 眼镜蛇式: '#AB47BC',
  排球: '#00BCD4', 徒步: '#388E3C',
};

export * from './constants/music';
export * from './constants/wuxingMap';
export * from './constants/sutraTexts';
export { PRESET_SUTRAS } from './types/mantra';

export const GLOBAL_USERS: GlobalUser[] = [
  { id: 1, name: '林夕',   lat: 39.9, lng: 116.4, days: 365, sport: '跑步',   since: '2025-05', duration: '1年' },
  { id: 2, name: 'Sakura', lat: 35.7, lng: 139.7, days: 280, sport: '瑜伽',   since: '2025-08', duration: '9个月' },
  { id: 3, name: 'John',   lat: 40.7, lng: -74.0, days: 420, sport: '游泳',   since: '2025-03', duration: '1年2个月' },
  { id: 4, name: 'Marie',  lat: 48.9, lng: 2.35,  days: 200, sport: '骑行',   since: '2026-01', duration: '4个月' },
  { id: 5, name: 'Carlos', lat: -23.6,lng: -46.6, days: 150, sport: '足球',   since: '2026-02', duration: '3个月' },
  { id: 6, name: 'Aisha',  lat: 25.2, lng: 55.3,  days: 310, sport: '跑步',   since: '2025-07', duration: '10个月' },
  { id: 7, name: 'Alex',   lat: 55.8, lng: 37.6,  days: 90,  sport: '举重',   since: '2026-03', duration: '2个月' },
  { id: 8, name: 'Wei',    lat: 31.2, lng: 121.5, days: 500, sport: '太极',   since: '2025-01', duration: '1年4个月' },
  { id: 9, name: 'Priya',  lat: 28.6, lng: 77.2,  days: 180, sport: '冥想',   since: '2026-01', duration: '4个月' },
  { id: 10,name: 'Kwame',  lat: 5.6,  lng: -0.2,  days: 120, sport: '跑步',   since: '2026-02', duration: '3个月' },
];

// Only include languages with actual translations in i18n.ts.
// To add a new language: add its dictionary to i18n.ts, then add an entry here.
export const LANG_LIST: { code: string; flag: string; name: string }[] = [
  { code:'zh',      flag:'🇨🇳', name:'简体中文' },
  { code:'zh-Hant', flag:'🇹🇼', name:'繁體中文' },
  { code:'en',      flag:'🇺🇸', name:'English'  },
];

// ─── ExerciseLibrary — 统一动作库 ──────────────────────────────
// 合并 SPORT_GROUPS 的具体运动 + EXERCISE_CATEGORIES 的训练类别

const SPORT_TO_CATEGORY: Record<string, ExerciseCategoryKey> = {
  '俯卧撑': 'chest_triceps', '引体向上': 'back_biceps', '深蹲': 'legs_core',
  '平板支撑': 'legs_core', '波比跳': 'hiit', '跳绳': 'cardio',
  '瑜伽': 'yoga', '太极': 'taiji', '游泳': 'cardio', '爬楼梯': 'cardio',
  '户外骑行': 'cardio', '室内跑步': 'cardio', '户外跑步': 'cardio', '滑板': 'full_body',
  '羽毛球': 'full_body', '足球': 'full_body', '篮球': 'full_body',
  '乒乓球': 'full_body', '网球': 'full_body', '排球': 'full_body',
  '行走': 'cardio', '划船机': 'cardio', '舞蹈': 'full_body',
  '拳击': 'hiit', '高抬腿': 'hiit', '深蹲跳': 'hiit',
  '下犬式': 'yoga', '鸽子式': 'yoga', '眼镜蛇式': 'yoga',
  '徒步': 'cardio',
};

// 中文名 → ExerciseCategoryKey 映射（用于去重判断 SPORTS 是否与 CATEGORIES 重叠）
const ZH_NAME_TO_CATEGORY_KEY: Record<string, ExerciseCategoryKey> = {
  '太极': 'taiji', '瑜伽': 'yoga', '跑步': 'cardio', '骑行': 'cardio',
  '游泳': 'cardio', '跳绳': 'cardio',
};

export function buildExerciseLibrary(): ExerciseDef[] {
  const seen = new Set<string>();
  const library: ExerciseDef[] = [];

  // 0. 预标记 EXERCISE_CATEGORIES 中纯类别（非具体运动）的中文名，避免重复导入
  // 注意：不包含 yoga/taiji，因为它们也是 ALL_SPORTS 中的具体运动
  for (const cat of EXERCISE_CATEGORIES) {
    const zhName = getCategoryZhName(cat);
    if (zhName) seen.add(zhName);
  }

  // 1. 从 SPORT_GROUPS 导入
  for (const sport of ALL_SPORTS) {
    if (seen.has(sport.key)) continue;
    seen.add(sport.key);
    const category = SPORT_TO_CATEGORY[sport.key] ?? 'full_body';
    library.push({
      id: `sport_${sport.key}`,
      nameZh: sport.key,
      nameI18nKey: '',
      icon: sport.icon,
      category,
      type: category === 'cardio' ? 'cardio' : 'strength',
      muscleGroups: getSportMuscleGroups(sport.key),
      equipment: getSportEquipment(sport.key),
      difficulty: getSportDifficulty(sport.key),
      met: MET_MAP[sport.key],
    });
  }

  // 2. 添加传统养生项目（未在 SPORTS 中的）
  const traditionalItems: ExerciseDef[] = [
    { id: 'ex_baduanjin', nameZh: '八段锦', nameI18nKey: 'bodyPartBaduanjin', icon: '🧘', category: 'baduanjin', type: 'traditional', muscleGroups: ['全身', '上肢', '下肢', '核心'], equipment: '无', difficulty: 'beginner', defaultDurationSec: 1800, met: 3, description: '国家体育总局推广的健身气功。八个动作分别调理不同脏腑，动作柔和缓慢，配合呼吸。适合各年龄段，每日练习可强身健体。' },
    { id: 'ex_wuqinxi', nameZh: '五禽戏', nameI18nKey: 'bodyPartWuqinxi', icon: '🦌', category: 'wuqinxi', type: 'traditional', muscleGroups: ['全身', '上肢', '下肢', '核心'], equipment: '无', difficulty: 'beginner', defaultDurationSec: 1800, met: 3.5, description: '模仿虎、鹿、熊、猿、鸟五种动物的动作。虎戏强筋骨，鹿戏通经络，熊戏健脾胃，猿戏灵活关节，鸟戏调呼吸。' },
    { id: 'ex_zhanzhuang', nameZh: '站桩', nameI18nKey: 'bodyPartZhanzhuang', icon: '🧍', category: 'zhanzhuang', type: 'traditional', muscleGroups: ['下肢', '核心', '背部'], equipment: '无', difficulty: 'beginner', defaultDurationSec: 1200, met: 2.5, description: '混元桩：两脚与肩同宽，膝盖微屈，双手环抱于胸前。静中求动，培养内劲。初学5分钟，逐渐增加到20分钟。' },
    { id: 'ex_jingluo', nameZh: '经络拍打', nameI18nKey: 'bodyPartJingluo', icon: '👋', category: 'jingluo', type: 'flexibility', muscleGroups: ['全身', '肩', '背'], equipment: '无', difficulty: 'beginner', defaultDurationSec: 600, met: 2, description: '沿经络走向拍打穴位，疏通气血。从上至下：头部→肩颈→手臂→胸腹→腿部。力度适中，以微红发热为度。' },
    { id: 'ex_walking', nameZh: '散步行禅', nameI18nKey: 'bodyPartWalking', icon: '🚶', category: 'walking', type: 'cardio', muscleGroups: ['下肢', '心肺'], equipment: '无', difficulty: 'beginner', defaultDurationSec: 1800, met: 3.5, description: '行禅步行：专注于每一步的感受，脚掌落地、重心转移、抬脚。保持自然呼吸，速度比日常稍慢。适合饭后修行。' },
  ];
  for (const item of traditionalItems) {
    if (!seen.has(item.nameZh)) { seen.add(item.nameZh); library.push(item); }
  }

  // 3. 增强力量训练动作（扩展）
  const strengthExtensions: ExerciseDef[] = [
    { id: 'ex_bench_press', nameZh: '杠铃卧推', nameI18nKey: '', icon: '🏋️', category: 'chest_triceps', type: 'strength', muscleGroups: ['胸大肌', '三角肌前束', '肱三头肌'], equipment: '杠铃、卧推凳', difficulty: 'intermediate', defaultSets: 4, defaultReps: 10, defaultWeight: 40, defaultRestSec: 90, met: 8, description: '仰卧于卧推凳，握距略宽于肩。杠铃下放至胸部中段，肘关节约90度。发力推起至手臂伸直。核心收紧，臀部不离凳。', videoUrl: 'https://www.youtube.com/watch?v=SCVCLChPQbI' },
    { id: 'ex_dumbbell_fly', nameZh: '哑铃飞鸟', nameI18nKey: '', icon: '🏋️', category: 'chest_triceps', type: 'strength', muscleGroups: ['胸大肌'], equipment: '哑铃、卧推凳', difficulty: 'intermediate', defaultSets: 3, defaultReps: 12, defaultWeight: 12, defaultRestSec: 60, met: 6, description: '仰卧，双手持哑铃伸直于胸部上方。微屈肘，双臂向两侧打开至与肩平齐。感受胸肌拉伸，然后夹胸收回。控制速度，避免肩关节过度外展。' },
    { id: 'ex_cable_pushdown', nameZh: '绳索下压', nameI18nKey: '', icon: '🏋️', category: 'chest_triceps', type: 'strength', muscleGroups: ['肱三头肌'], equipment: '龙门架', difficulty: 'beginner', defaultSets: 3, defaultReps: 15, defaultWeight: 20, defaultRestSec: 60, met: 5, description: '站立面对龙门架，双手握住绳索把手。大臂固定贴近身体，只用小臂向下压至伸直。顶峰收缩1秒，缓慢回放。避免身体前倾借力。' },
    { id: 'ex_barbell_row', nameZh: '杠铃划船', nameI18nKey: '', icon: '🏋️', category: 'back_biceps', type: 'strength', muscleGroups: ['背阔肌', '斜方肌', '肱二头肌'], equipment: '杠铃', difficulty: 'intermediate', defaultSets: 4, defaultReps: 10, defaultWeight: 40, defaultRestSec: 90, met: 7, description: '俯身约45度，双手正握杠铃。收紧核心，将杠铃拉向下腹部。感受背部肌肉收缩，顶峰挤压肩胛骨。缓慢下放，保持背部挺直。', videoUrl: 'https://www.youtube.com/watch?v=FWJR5Ve8bnQ' },
    { id: 'ex_pullup', nameZh: '引体向上', nameI18nKey: '', icon: '🤸', category: 'back_biceps', type: 'strength', muscleGroups: ['背阔肌', '肱二头肌', '核心'], equipment: '单杠', difficulty: 'advanced', defaultSets: 4, defaultReps: 8, defaultRestSec: 90, met: 8, description: '双手正握单杠，握距略宽于肩。收紧核心，发力拉起至下巴过杠。顶峰挤压背部，缓慢下放至手臂伸直。避免摆动身体借力。', videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g' },
    { id: 'ex_dumbbell_curl', nameZh: '哑铃弯举', nameI18nKey: '', icon: '💪', category: 'back_biceps', type: 'strength', muscleGroups: ['肱二头肌'], equipment: '哑铃', difficulty: 'beginner', defaultSets: 3, defaultReps: 12, defaultWeight: 10, defaultRestSec: 60, met: 4, description: '站立双手持哑铃，大臂固定贴紧身体。发力弯举至肩部，顶峰收缩。缓慢下放至手臂伸直。避免身体摆动借力。' },
    { id: 'ex_squat', nameZh: '杠铃深蹲', nameI18nKey: '', icon: '🦵', category: 'legs_core', type: 'strength', muscleGroups: ['股四头肌', '臀大肌', '核心', '腘绳肌'], equipment: '杠铃、深蹲架', difficulty: 'intermediate', defaultSets: 4, defaultReps: 10, defaultWeight: 50, defaultRestSec: 120, met: 8, description: '杠铃置于上背部，双脚略宽于肩。屈髋屈膝下蹲至大腿平行地面。膝盖方向与脚尖一致。发力站起，核心全程收紧。', videoUrl: 'https://www.youtube.com/watch?v=bEv6CCg2BC8' },
    { id: 'ex_deadlift', nameZh: '硬拉', nameI18nKey: '', icon: '🏋️', category: 'legs_core', type: 'strength', muscleGroups: ['背部', '臀大肌', '腘绳肌', '核心'], equipment: '杠铃', difficulty: 'advanced', defaultSets: 3, defaultReps: 8, defaultWeight: 60, defaultRestSec: 120, met: 9, description: '双脚与肩同宽站立，屈髋屈膝握住杠铃。背部挺直，发力站起至身体伸直。核心收紧，杠铃贴身。缓慢下放，保持脊柱中立。', videoUrl: 'https://www.youtube.com/watch?v=op9kVnSso6Q' },
    { id: 'ex_leg_press', nameZh: '腿举', nameI18nKey: '', icon: '🦵', category: 'legs_core', type: 'strength', muscleGroups: ['股四头肌', '臀大肌', '腘绳肌'], equipment: '腿举机', difficulty: 'beginner', defaultSets: 3, defaultReps: 12, defaultWeight: 60, defaultRestSec: 90, met: 6, description: '坐于腿举机，双脚踏板与肩同宽。屈膝放低至90度，发力推起至膝盖微屈。全程保持下背紧贴靠垫。' },
    { id: 'ex_lunge', nameZh: '弓步蹲', nameI18nKey: '', icon: '🦵', category: 'legs_core', type: 'strength', muscleGroups: ['股四头肌', '臀大肌', '核心'], equipment: '哑铃(可选)', difficulty: 'beginner', defaultSets: 3, defaultReps: 12, defaultRestSec: 60, met: 5, description: '一脚向前迈出一大步，下蹲至前后膝均约90度。前膝不超过脚尖，后膝接近地面。发力收回，换腿重复。' },
    { id: 'ex_overhead_press', nameZh: '哑铃推举', nameI18nKey: '', icon: '🏋️', category: 'shoulders_arms', type: 'strength', muscleGroups: ['三角肌', '肱三头肌'], equipment: '哑铃', difficulty: 'intermediate', defaultSets: 3, defaultReps: 12, defaultWeight: 15, defaultRestSec: 60, met: 6, description: '站立双手持哑铃于肩部。发力向上推举至手臂伸直，顶峰收缩。缓慢下放至肩部。核心收紧，避免腰部过度后仰。' },
    { id: 'ex_lateral_raise', nameZh: '侧平举', nameI18nKey: '', icon: '🏋️', category: 'shoulders_arms', type: 'strength', muscleGroups: ['三角肌中束'], equipment: '哑铃', difficulty: 'beginner', defaultSets: 3, defaultReps: 15, defaultWeight: 8, defaultRestSec: 45, met: 4, description: '站立双手持哑铃于体侧。微屈肘，双臂向两侧抬起至与肩平齐。顶峰收缩，缓慢下放。避免耸肩借力。' },
    { id: 'ex_front_raise', nameZh: '前平举', nameI18nKey: '', icon: '🏋️', category: 'shoulders_arms', type: 'strength', muscleGroups: ['三角肌前束'], equipment: '哑铃', difficulty: 'beginner', defaultSets: 3, defaultReps: 15, defaultWeight: 8, defaultRestSec: 45, met: 4, description: '站立双手持哑铃于大腿前。微屈肘，双臂向前抬起至与肩平齐。顶峰收缩，缓慢下放。避免身体摆动借力。' },
    { id: 'ex_plank', nameZh: '平板支撑', nameI18nKey: '', icon: '🧱', category: 'legs_core', type: 'strength', muscleGroups: ['核心', '腹直肌', '下背'], equipment: '无', difficulty: 'beginner', defaultSets: 3, defaultDurationSec: 60, defaultRestSec: 30, met: 4, description: '俯卧撑姿势，前臂着地。身体从头到脚成一条直线。收紧核心，臀部不塌不翘。保持呼吸，坚持目标时间。' },
    { id: 'ex_crunch', nameZh: '卷腹', nameI18nKey: '', icon: '🤰', category: 'legs_core', type: 'strength', muscleGroups: ['腹直肌'], equipment: '无', difficulty: 'beginner', defaultSets: 3, defaultReps: 20, defaultRestSec: 30, met: 4, description: '仰卧屈膝，双手轻放耳侧。发力卷起上背部离地，感受腹肌收缩。下背不离地，缓慢下放。避免拉扯颈部。' },
    { id: 'ex_leg_raise', nameZh: '举腿', nameI18nKey: '', icon: '🦵', category: 'legs_core', type: 'strength', muscleGroups: ['腹直肌', '髋屈肌'], equipment: '无', difficulty: 'intermediate', defaultSets: 3, defaultReps: 15, defaultRestSec: 30, met: 4, description: '仰卧，双手放于体侧或臀下。双腿伸直并拢，发力抬起至与地面垂直。缓慢下放至接近地面但不触地。保持下背贴地。' },
    { id: 'ex_burpee', nameZh: '波比跳', nameI18nKey: '', icon: '🔥', category: 'hiit', type: 'cardio', muscleGroups: ['全身', '心肺'], equipment: '无', difficulty: 'intermediate', defaultSets: 5, defaultReps: 15, defaultRestSec: 30, met: 10, description: '站立→下蹲→双手撑地→跳脚向后成俯卧撑→做一个俯卧撑→跳脚收回→起身跳起。动作连贯，保持节奏。' },
    { id: 'ex_jumping_jack', nameZh: '开合跳', nameI18nKey: '', icon: '🤸', category: 'hiit', type: 'cardio', muscleGroups: ['全身', '心肺'], equipment: '无', difficulty: 'beginner', defaultSets: 5, defaultReps: 30, defaultRestSec: 20, met: 8, description: '双脚并拢站立，双手放于体侧。跳起时双脚分开略宽于肩，同时双手上举过头。跳回收回原位。保持节奏，全脚掌着地。' },
    { id: 'ex_mountain_climber', nameZh: '登山者', nameI18nKey: '', icon: '🤸', category: 'hiit', type: 'cardio', muscleGroups: ['全身', '核心', '肩'], equipment: '无', difficulty: 'intermediate', defaultSets: 4, defaultReps: 20, defaultRestSec: 20, met: 8, description: '俯卧撑姿势，交替将膝盖拉向胸部。核心收紧，臀部保持与肩同高。速度由慢到快，保持呼吸节奏。' },
  ];
  for (const item of strengthExtensions) {
    if (!seen.has(item.nameZh)) { seen.add(item.nameZh); library.push(item); }
  }

  return library;
}

/** 获取 EXERCISE_CATEGORY 的中文名（用于去重） */
function getCategoryZhName(cat: typeof EXERCISE_CATEGORIES[number]): string | undefined {
  // 注意：不包含 taiji/yoga，因为它们也是 ALL_SPORTS 中的具体运动，不应被去重跳过
  const map: Record<string, string> = {};
  return map[cat.key];
}

/** 根据运动名推断目标肌群 */
function getSportMuscleGroups(key: string): string[] {
  const map: Record<string, string[]> = {
    '俯卧撑': ['胸大肌', '肱三头肌', '核心'], '引体向上': ['背阔肌', '肱二头肌'],
    '深蹲': ['股四头肌', '臀大肌', '核心'], '平板支撑': ['核心', '腹直肌'],
    '波比跳': ['全身', '心肺'], '跳绳': ['小腿', '心肺'],
    '瑜伽': ['全身', '柔韧性'], '太极': ['全身', '下肢', '平衡'],
    '游泳': ['全身', '心肺'], '爬楼梯': ['下肢', '心肺'],
    '户外骑行': ['下肢', '心肺'], '室内跑步': ['下肢', '心肺'], '户外跑步': ['下肢', '心肺'],
    '滑板': ['下肢', '核心'], '羽毛球': ['全身', '肩', '心肺'],
    '足球': ['下肢', '心肺'], '篮球': ['全身', '心肺'],
    '乒乓球': ['上肢', '核心'], '网球': ['全身', '肩'],
    '放松运动': ['全身'], '热身运动': ['全身'],
    '行走': ['下肢', '心肺'], '划船机': ['背阔肌', '肱二头肌', '核心', '心肺'],
    '舞蹈': ['全身', '核心', '心肺'], '拳击': ['上肢', '核心', '心肺'],
    '高抬腿': ['下肢', '核心', '心肺'], '深蹲跳': ['股四头肌', '臀大肌', '小腿'],
    '下犬式': ['全身', '柔韧性', '肩'], '鸽子式': ['髋部', '臀大肌', '柔韧性'],
    '眼镜蛇式': ['脊柱', '腹部', '柔韧性'], '排球': ['上肢', '肩', '核心'],
    '徒步': ['下肢', '核心', '心肺'],
  };
  return map[key] ?? [];
}

/** 根据运动名推断所需器材 */
function getSportEquipment(key: string): string | undefined {
  const map: Record<string, string> = {
    '引体向上': '单杠', '游泳': '泳池', '滑板': '滑板', '羽毛球': '球拍、球',
    '足球': '足球', '篮球': '篮球', '乒乓球': '球拍、球', '网球': '球拍、球',
    '户外骑行': '自行车', '跳绳': '跳绳', '划船机': '划船机',
    '拳击': '拳击手套', '排球': '排球', '徒步': '登山鞋',
  };
  return map[key];
}

/** 根据运动名推断难度 */
function getSportDifficulty(key: string): 'beginner' | 'intermediate' | 'advanced' {
  const advanced = new Set(['引体向上', '滑板', '划船机', '拳击']);
  const intermediate = new Set(['俯卧撑', '波比跳', '游泳', '羽毛球', '网球', '篮球', '足球', '深蹲跳', '舞蹈', '排球']);
  if (advanced.has(key)) return 'advanced';
  if (intermediate.has(key)) return 'intermediate';
  return 'beginner';
}

// ─── PLAN_TEMPLATES — 预置健身模板 ─────────────────────────────
// 依据: ACSM Guidelines for Exercise Testing and Prescription (11th ed.)
//       NSCA Essentials of Strength Training and Conditioning (4th ed.)
//       国家体育总局《健身气功推广功法》标准

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'template_traditional_28d',
    name: '',
    nameI18nKey: 'planTemplateTraditional',
    description: '',
    descriptionI18nKey: 'planTemplateTraditionalDesc',
    category: 'traditional',
    durationDays: 28,
    strategy: 'maintain',
    intensity: 'beginner',
    icon: '🧘',
    weekSchedule: [
      { weekday: 1, sportKey: 'baduanjin', exercises: [{ name: '八段锦全套', targetDurationSec: 1800 }, { name: '散步行禅', targetDurationSec: 1800 }] },
      { weekday: 2, sportKey: 'wuqinxi', exercises: [{ name: '五禽戏全套', targetDurationSec: 1800 }] },
      { weekday: 3, sportKey: 'zhanzhuang', exercises: [{ name: '混元桩', targetDurationSec: 1200 }, { name: '经络拍打', targetDurationSec: 600 }] },
      { weekday: 4, sportKey: 'taiji', exercises: [{ name: '24式简化太极拳', targetDurationSec: 1800 }] },
      { weekday: 5, sportKey: 'jingluo', exercises: [{ name: '穴位按摩拍打', targetDurationSec: 900 }, { name: '全身拉伸', targetDurationSec: 900 }] },
      { weekday: 6, sportKey: 'walking', exercises: [{ name: '快步走', targetDurationSec: 3600 }] },
      { weekday: 7, sportKey: 'rest' },
    ],
  },
  {
    id: 'template_ppl_6day',
    name: '',
    nameI18nKey: 'planTemplatePPL',
    description: '',
    descriptionI18nKey: 'planTemplatePPLDesc',
    category: 'modern',
    durationDays: 28,
    strategy: 'gain_muscle',
    intensity: 'intermediate',
    icon: '💪',
    weekSchedule: [
      { weekday: 1, sportKey: 'chest_triceps', exercises: [{ name: '杠铃卧推', targetSets: 4, targetReps: 10, targetWeight: 40, restSec: 90 }, { name: '哑铃飞鸟', targetSets: 3, targetReps: 12, targetWeight: 12, restSec: 60 }, { name: '绳索下压', targetSets: 3, targetReps: 15, targetWeight: 20, restSec: 60 }] },
      { weekday: 2, sportKey: 'back_biceps', exercises: [{ name: '引体向上', targetSets: 4, targetReps: 8, restSec: 90 }, { name: '杠铃划船', targetSets: 4, targetReps: 10, targetWeight: 40, restSec: 90 }, { name: '哑铃弯举', targetSets: 3, targetReps: 12, targetWeight: 10, restSec: 60 }] },
      { weekday: 3, sportKey: 'legs_core', exercises: [{ name: '杠铃深蹲', targetSets: 4, targetReps: 10, targetWeight: 50, restSec: 120 }, { name: '硬拉', targetSets: 3, targetReps: 8, targetWeight: 60, restSec: 120 }, { name: '卷腹', targetSets: 3, targetReps: 20, restSec: 30 }] },
      { weekday: 4, sportKey: 'chest_triceps', exercises: [{ name: '哑铃推举', targetSets: 3, targetReps: 12, targetWeight: 15, restSec: 60 }, { name: '侧平举', targetSets: 3, targetReps: 15, targetWeight: 8, restSec: 45 }, { name: '俯卧撑', targetSets: 4, targetReps: 15, restSec: 60 }] },
      { weekday: 5, sportKey: 'back_biceps', exercises: [{ name: '深蹲', targetSets: 4, targetReps: 12, restSec: 90 }, { name: '弓步蹲', targetSets: 3, targetReps: 12, restSec: 60 }, { name: '平板支撑', targetSets: 3, targetDurationSec: 60, restSec: 30 }] },
      { weekday: 6, sportKey: 'legs_core', exercises: [{ name: '腿举', targetSets: 3, targetReps: 12, targetWeight: 60, restSec: 90 }, { name: '哑铃弯举', targetSets: 3, targetReps: 12, targetWeight: 10, restSec: 60 }, { name: '开合跳', targetSets: 5, targetReps: 30, restSec: 20 }] },
      { weekday: 7, sportKey: 'rest' },
    ],
  },
  {
    id: 'template_fat_loss_4week',
    name: '',
    nameI18nKey: 'planTemplateFatLoss',
    description: '',
    descriptionI18nKey: 'planTemplateFatLossDesc',
    category: 'modern',
    durationDays: 28,
    strategy: 'lose_fat',
    intensity: 'intermediate',
    icon: '🔥',
    weekSchedule: [
      { weekday: 1, sportKey: 'hiit', exercises: [{ name: '波比跳', targetSets: 5, targetReps: 15, restSec: 30 }, { name: '开合跳', targetSets: 5, targetReps: 30, restSec: 20 }, { name: '登山者', targetSets: 4, targetReps: 20, restSec: 20 }] },
      { weekday: 2, sportKey: 'cardio', exercises: [{ name: '跳绳', targetSets: 5, targetReps: 100, restSec: 30 }, { name: '室内跑步', targetDurationSec: 1800 }] },
      { weekday: 3, sportKey: 'full_body', exercises: [{ name: '俯卧撑', targetSets: 4, targetReps: 15, restSec: 45 }, { name: '深蹲', targetSets: 4, targetReps: 20, restSec: 45 }, { name: '平板支撑', targetSets: 4, targetDurationSec: 60, restSec: 30 }] },
      { weekday: 4, sportKey: 'hiit', exercises: [{ name: '跳绳', targetSets: 10, targetReps: 50, restSec: 30 }, { name: '波比跳', targetSets: 5, targetReps: 15, restSec: 30 }] },
      { weekday: 5, sportKey: 'cardio', exercises: [{ name: '户外骑行', targetDurationSec: 3600 }, { name: '散步行禅', targetDurationSec: 1800 }] },
      { weekday: 6, sportKey: 'full_body', exercises: [{ name: '引体向上', targetSets: 3, targetReps: 8, restSec: 90 }, { name: '杠铃深蹲', targetSets: 4, targetReps: 10, targetWeight: 40, restSec: 120 }, { name: '卷腹', targetSets: 3, targetReps: 20, restSec: 30 }] },
      { weekday: 7, sportKey: 'rest' },
    ],
  },
  {
    id: 'template_bodyweight_3day',
    name: '',
    nameI18nKey: 'planTemplateBodyweight',
    description: '',
    descriptionI18nKey: 'planTemplateBodyweightDesc',
    category: 'modern',
    durationDays: 28,
    strategy: 'tone',
    intensity: 'beginner',
    icon: '🏠',
    weekSchedule: [
      { weekday: 1, sportKey: 'full_body', exercises: [{ name: '俯卧撑', targetSets: 3, targetReps: 12, restSec: 60 }, { name: '深蹲', targetSets: 3, targetReps: 15, restSec: 60 }, { name: '平板支撑', targetSets: 3, targetDurationSec: 45, restSec: 30 }] },
      { weekday: 2, sportKey: 'rest' },
      { weekday: 3, sportKey: 'full_body', exercises: [{ name: '波比跳', targetSets: 3, targetReps: 10, restSec: 45 }, { name: '弓步蹲', targetSets: 3, targetReps: 12, restSec: 60 }, { name: '开合跳', targetSets: 3, targetReps: 30, restSec: 20 }] },
      { weekday: 4, sportKey: 'rest' },
      { weekday: 5, sportKey: 'full_body', exercises: [{ name: '引体向上(或替代)', targetSets: 3, targetReps: 5, restSec: 90 }, { name: '卷腹', targetSets: 3, targetReps: 15, restSec: 30 }, { name: '平板支撑', targetSets: 3, targetDurationSec: 60, restSec: 30 }] },
      { weekday: 6, sportKey: 'rest' },
      { weekday: 7, sportKey: 'cardio', exercises: [{ name: '散步行禅', targetDurationSec: 3600 }] },
    ],
  },
];
