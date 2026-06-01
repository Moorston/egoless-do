import type { Theme, ThemeName, SportGroup, GlobalUser, FoodCategory } from './types';

export const THEMES: Record<ThemeName, Theme> = {
  dark:   { name:'深色',    nameEn:'Dark',      bg:'#0F0A1E', card:'rgba(255,255,255,.07)', cardSolid:'#1A1030', text:'#fff', sub:'rgba(255,255,255,.45)', border:'rgba(255,255,255,.09)', primary:'#7C3AED', navBg:'rgba(15,10,30,.97)',   starfield:false },
  light:  { name:'浅色',    nameEn:'Light',     bg:'#F0EFF8', card:'rgba(255,255,255,.92)', cardSolid:'#fff',    text:'#111', sub:'#6B6B6B',               border:'#e0e0e0',                primary:'#7C3AED', navBg:'rgba(240,239,248,.97)',starfield:false },
  ocean:  { name:'深海',    nameEn:'Ocean',     bg:'#071520', card:'rgba(255,255,255,.07)', cardSolid:'#0d2035', text:'#fff', sub:'rgba(255,255,255,.4)',   border:'rgba(255,255,255,.08)', primary:'#0EA5E9', navBg:'rgba(7,21,32,.97)',    starfield:false },
  rose:   { name:'玫瑰',    nameEn:'Rose',      bg:'#160810', card:'rgba(255,255,255,.07)', cardSolid:'#250f1e', text:'#fff', sub:'rgba(255,255,255,.4)',   border:'rgba(255,255,255,.08)', primary:'#EC4899', navBg:'rgba(22,8,16,.97)',    starfield:false },
  cosmos: { name:'星空 ✨', nameEn:'Cosmos ✨', bg:'#050510', card:'rgba(255,255,255,.06)', cardSolid:'rgba(10,10,25,0.95)', text:'#fff', sub:'rgba(180,170,255,.5)',   border:'rgba(150,120,255,.12)', primary:'#8B5CF6', navBg:'rgba(5,5,16,.97)',    starfield:true  },
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

export const BANNER_COLORS = {
  CHECKED:  '#7C3AED',
  NOT_DONE: '#F59E0B',
  DONE:     '#4F46E5',
} as const;

export const STATS_GRADIENT = [
  ['#7117EA', '#EA6060'],
  ['#17EAD9', '#6078EA'],
  ['#9A4EFF', '#20ECFF'],
  ['#8446FF', '#18CEFF'],
] as const;

export const WARM_CORAL = '#FF8A65';

export const MIND_COLORS = [
  ['#2D1B69','#7C3AED'],
  ['#0C4A6E','#0EA5E9'],
  ['#064E3B','#10B981'],
  ['#7C2D12','#F97316'],
  ['#4C0519','#EC4899'],
  ['#1C1917','#78716C'],
] as const;

export const TAGS_PRESET = ['#觉察','#灵感','#内心独白'];
export const TAGS_PRESET_EN = ['#Awareness','#Inspiration','#Inner Voice'];
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

export const QUICK_FOODS: { name: string; nameEn: string; cal: number }[] = [
  { name:'米饭（一碗）', nameEn:'Rice (1 bowl)', cal:200 },
  { name:'面条（一碗）', nameEn:'Noodles (1 bowl)', cal:250 },
  { name:'馒头（一个）', nameEn:'Steamed bun', cal:180 },
  { name:'面包（一片）', nameEn:'Bread (1 slice)', cal:80  },
];

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
    { key:'爬楼梯',   keyEn:'Stair Climbing',  icon:'🧗', color:'#9C27B0', gps:false },
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
  ]},
  { group:'球类运动', groupEn:'Ball Sports', items:[
    { key:'羽毛球',   keyEn:'Badminton',         icon:'🏸', color:'#4CAF50', gps:false },
    { key:'足球',     keyEn:'Football',           icon:'⚽', color:'#2196F3', gps:false },
    { key:'篮球',     keyEn:'Basketball',         icon:'🏀', color:'#FF5722', gps:false },
    { key:'乒乓球',   keyEn:'Table Tennis',       icon:'🏓', color:'#009688', gps:false },
    { key:'网球',     keyEn:'Tennis',             icon:'🎾', color:'#8BC34A', gps:false },
  ]},
];

export const ALL_SPORTS = SPORT_GROUPS.flatMap(g => g.items);

// Sport type classification
export type SportType = 'gps' | 'timed' | 'repetition';

// GPS sports: track distance with GPS
const GPS_SPORTS = ['行走', '跑步', '骑行', '户外骑行', '室内跑步', '滑板'];

// Repetition sports: count reps (push-ups, pull-ups, squats, etc.)
const REP_SPORTS = ['俯卧撑', '引体向上', '深蹲', '波比跳', '跳绳'];

// Timed sports: only track time (yoga, tai chi, plank, etc.)
const TIMED_SPORTS = ['太极', '八卦', '形意', '铁牛', '太阳摸经', '平板支撑', '瑜伽', '放松运动', '热身运动', '游泳', '爬楼梯'];

export function getSportType(sportKey: string, isGps: boolean): SportType {
  if (isGps || GPS_SPORTS.includes(sportKey)) return 'gps';
  if (REP_SPORTS.includes(sportKey)) return 'repetition';
  return 'timed';
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
  '行走': 3.5, '跑步': 7, '骑行': 6, '户外骑行': 6, '室内跑步': 7,
  '太极': 3, '八卦': 4, '形意': 5, '铁牛': 6, '太阳摸经': 3.5,
  '俯卧撑': 8, '引体向上': 8, '深蹲': 6, '平板支撑': 4, '波比跳': 10,
  '跳绳': 12, '瑜伽': 3, '放松运动': 2.5, '热身运动': 3.5, '滑板': 5,
  '游泳': 8, '爬楼梯': 9, '羽毛球': 7, '足球': 10, '篮球': 8,
  '乒乓球': 4, '网球': 7,
};

export function estimateCalories(sportKey: string, durationSec: number, weight = 70): number {
  const met = MET_MAP[sportKey] ?? 4;
  return Math.round(met * weight * (durationSec / 3600));
}

export const SPORT_BG_COLORS: Record<string, string> = {
  爬楼梯: '#4CAF50', 跳绳: '#FF9800', 游泳: '#00BCD4',
  瑜伽: '#9C27B0', 篮球: '#FF5722', 足球: '#4CAF50', 羽毛球: '#2196F3',
  太极: '#4CAF50', 八卦: '#66BB6A', 形意: '#388E3C', 铁牛: '#795548', 太阳摸经: '#FFA726',
  俯卧撑: '#FF5722', 引体向上: '#E64A19', 深蹲: '#F57C00', 平板支撑: '#FF9800', 波比跳: '#FF7043',
  放松运动: '#81C784', 热身运动: '#FFB74D', 滑板: '#7E57C2',
  户外骑行: '#4CAF50', 室内跑步: '#2196F3', 乒乓球: '#009688', 网球: '#8BC34A',
};

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
